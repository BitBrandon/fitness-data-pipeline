"""Google Health API v4 client with OAuth2 (installed app flow)."""

import logging
import os
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

load_dotenv()

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly",
    "https://www.googleapis.com/auth/googlehealth.sleep.readonly",
    "https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly",
]

TOKEN_FILE = "token_google_fit.json"
HEALTH_API = "https://health.googleapis.com/v4"

# Sanity bounds — values outside these are data errors
_MAX_HR_BPM    = 250    # no human heart beats above this
_MIN_HR_BPM    = 20     # below this is a sensor error
_MAX_KCAL_DAY  = 8_000  # no normal day exceeds this
_MIN_KCAL_DAY  = 100    # below this the API probably returned 0 or a fragment
_MAX_SLEEP_H   = 20     # sleeping more than this is an error
_MIN_SLEEP_MIN = 30     # ignore fragments under 30 min


def _client_config():
    return {
        "installed": {
            "client_id": os.environ["GOOGLE_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
            "redirect_uris": ["http://localhost"],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }


def get_credentials():
    creds = None

    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_config(_client_config(), SCOPES)
            creds = flow.run_local_server(port=8080)

        with open(TOKEN_FILE, "w") as f:
            f.write(creds.to_json())

    return creds


def _civil_dt(dt):
    return {
        "date": {"year": dt.year, "month": dt.month, "day": dt.day},
        "time": {"hours": 0, "minutes": 0, "seconds": 0},
    }


_MAX_DAYS_PER_REQUEST = 60  # Google Health API returns 400 for ranges > ~60 days


def _daily_rollup_single(creds, data_type, start_dt, end_dt) -> list:
    """Single ranged POST to dailyRollUp."""
    body = {"range": {"start": _civil_dt(start_dt), "end": _civil_dt(end_dt)}}
    resp = requests.post(
        f"{HEALTH_API}/users/me/dataTypes/{data_type}/dataPoints:dailyRollUp",
        headers={"Authorization": f"Bearer {creds.token}"},
        json=body,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json().get("rollupDataPoints", [])


def _daily_rollup(creds, data_type, days) -> list:
    """Fetch daily rollup, chunking into ≤60-day windows to stay within API limits."""
    now    = datetime.now(timezone.utc)
    end_dt = now + timedelta(days=1)
    all_points: list = []

    # Walk backwards in 60-day chunks
    remaining = days
    chunk_end = end_dt
    while remaining > 0:
        chunk_days  = min(remaining, _MAX_DAYS_PER_REQUEST)
        chunk_start = chunk_end - timedelta(days=chunk_days)
        pts = _daily_rollup_single(creds, data_type, chunk_start, chunk_end)
        logger.info("[google-health] %s chunk %d days → %d points", data_type, chunk_days, len(pts))
        all_points.extend(pts)
        chunk_end  = chunk_start
        remaining -= chunk_days

    # Deduplicate by date (keep last occurrence)
    by_date: dict[str, dict] = {_point_date(p): p for p in all_points}
    result = [by_date[d] for d in sorted(by_date)]
    logger.info("[google-health] %s total → %d unique days", data_type, len(result))
    return result


def _point_date(point):
    d = point["civilStartTime"]["date"]
    return f"{d['year']:04d}-{d['month']:02d}-{d['day']:02d}"


def _extract_numeric(point, *candidate_paths):
    """
    Try each (field, subfield) pair in order and return the first non-zero float found.
    Logs the full point when all candidates miss so we can diagnose field-name changes.
    """
    for field, subfield in candidate_paths:
        container = point.get(field, {})
        val = container.get(subfield, 0) if isinstance(container, dict) else 0
        if val:
            return float(val)

    logger.warning("_extract_numeric: all candidates missed. Full point=%s | tried=%s",
                   point, candidate_paths)
    return 0.0


# Active-energy-burned is more reliable than total-calories for per-day rollup
_CALORIES_SLUGS = (
    "active-energy-burned",  # active calories only — reliable per-day rollup
    "total-calories",        # BMR + active — often returns period totals, not per-day
)


def _fetch_calories(creds, days):
    """Try known calorie slugs in order; return {date: point} for the first that works."""
    for slug in _CALORIES_SLUGS:
        try:
            pts = _daily_rollup(creds, slug, days)
            if pts:
                logger.info("calories fetched via slug '%s' (%d points)", slug, len(pts))
                return slug, {_point_date(p): p for p in pts}
        except requests.HTTPError as e:
            logger.debug("calories slug '%s' failed: %s", slug, e)
    logger.warning("No calories data type found for this device/account.")
    return None, {}


def _sum_active_minutes(point):
    """Sum MODERATE + VIGOROUS active minutes from rollup."""
    levels = (
        point.get("activeMinutes", {})
             .get("activeMinutesRollupByActivityLevel", [])
    )
    total = 0
    for lvl in levels:
        if lvl.get("activityLevel") in ("MODERATE", "VIGOROUS"):
            total += int(lvl.get("activeMinutesSum", 0))
    return total


def fetch_daily_activity(days=30):
    """Return list of dicts with date, steps, calories, active_minutes."""
    creds = get_credentials()

    steps_points  = {_point_date(p): p for p in _daily_rollup(creds, "steps", days)}
    slug, cal_points = _fetch_calories(creds, days)

    active_points: dict = {}
    try:
        pts = _daily_rollup(creds, "active-minutes", days)
        active_points = {_point_date(p): p for p in pts}
    except requests.HTTPError as e:
        logger.debug("active-minutes not available: %s", e)

    all_dates = sorted(set(steps_points) | set(cal_points))
    rows = []

    for date in all_dates:
        steps = int(steps_points[date].get("steps", {}).get("countSum", 0)) if date in steps_points else 0

        calories = 0.0
        if date in cal_points:
            p = cal_points[date]
            raw_cal = _extract_numeric(p,
                ("activeEnergyBurned", "kcalSum"),  # active-energy-burned slug
                ("totalCalories",      "kcalSum"),  # total-calories slug
            )
            # Sanity check: per-day calories outside normal range → skip
            if raw_cal > _MAX_KCAL_DAY:
                logger.warning("[activity] date=%s calories=%.0f exceeds max %d — "
                               "possible period total in kcalSum, raw point=%s",
                               date, raw_cal, _MAX_KCAL_DAY, p)
                raw_cal = 0.0
            elif raw_cal < _MIN_KCAL_DAY and raw_cal > 0:
                logger.debug("[activity] date=%s calories=%.0f below min %d — keeping",
                             date, raw_cal, _MIN_KCAL_DAY)
            calories = round(raw_cal, 1)

        active_minutes = _sum_active_minutes(active_points[date]) if date in active_points else 0

        if steps == 0 and calories == 0.0:
            continue

        rows.append({
            "date":           date,
            "steps":          steps,
            "calories":       calories,
            "active_minutes": active_minutes,
        })

    logger.info("[activity] returning %d rows for %d days", len(rows), days)
    return rows


# Known Google Health API slugs for heart rate — try in order
_HR_SLUGS = ("heart-rate", "heart_rate", "heartRate")


def _fetch_hr_points(creds, days) -> list:
    """Try known heart-rate slugs; return points or [] if none work. Never raises."""
    for slug in _HR_SLUGS:
        try:
            pts = _daily_rollup(creds, slug, days)
            logger.info("[heart-rate] slug '%s' → %d points", slug, len(pts))
            return pts
        except Exception as e:
            logger.warning("[heart-rate] slug '%s' failed: %s", slug, e)
            continue
    logger.warning("[heart-rate] all slugs failed — skipping HR sync (no wearable data or unsupported type)")
    return []


def fetch_heart_rate(days=30):
    """Return list of dicts with date, hr_avg, hr_max, hr_min."""
    creds = get_credentials()
    all_points = _fetch_hr_points(creds, days)
    if not all_points:
        return []

    # Deduplicate by date — keep the most recent occurrence (last in list)
    by_date: dict[str, dict] = {}
    for point in all_points:
        by_date[_point_date(point)] = point

    rows = []
    for date, point in sorted(by_date.items()):
        hr = point.get("heartRate", {})
        avg = hr.get("beatsPerMinuteAvg", 0)
        if not avg:
            logger.debug("[heart-rate] date=%s no beatsPerMinuteAvg in heartRate=%s", date, hr)
            # Log full point so we can see what fields ARE present
            logger.info("[heart-rate] full point for %s: %s", date, point)
            continue

        avg_f = float(avg)
        if avg_f > _MAX_HR_BPM or avg_f < _MIN_HR_BPM:
            logger.warning("[heart-rate] date=%s hr_avg=%.1f outside bounds [%d,%d] — "
                           "skipping. Full point=%s",
                           date, avg_f, _MIN_HR_BPM, _MAX_HR_BPM, point)
            continue

        rows.append({
            "date":   date,
            "hr_avg": round(avg_f, 1),
            "hr_max": round(float(hr.get("beatsPerMinuteMax", avg_f)), 1),
            "hr_min": round(float(hr.get("beatsPerMinuteMin", avg_f)), 1),
        })

    logger.info("[heart-rate] returning %d valid rows (skipped out-of-bounds)", len(rows))
    return rows


def fetch_sleep(days=30):
    """Return list of dicts with date, duration_hours, deep_min, light_min, rem_min, awake_min."""
    creds = get_credentials()

    resp = requests.get(
        f"{HEALTH_API}/users/me/dataTypes/sleep/dataPoints",
        headers={"Authorization": f"Bearer {creds.token}"},
        timeout=30,
    )
    resp.raise_for_status()
    raw = resp.json()
    data_points = raw.get("dataPoints", [])
    logger.info("[sleep] raw response has %d dataPoints", len(data_points))
    if data_points:
        logger.info("[sleep] first dataPoint keys=%s | value=%s", list(data_points[0].keys()), data_points[0])

    now    = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)
    rows_by_date: dict[str, dict] = {}

    for point in data_points:
        sleep    = point.get("sleep", {})
        interval = sleep.get("interval", {})
        start_str = interval.get("startTime", "")

        if not start_str:
            continue

        start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
        if start_dt < cutoff:
            continue

        summary_stages = {
            s["type"]: int(s.get("minutes", 0))
            for s in sleep.get("summary", {}).get("stagesSummary", [])
        }

        if summary_stages:
            raw_period = int(sleep.get("summary", {}).get("minutesInSleepPeriod", 0))
            # Fitbit via Google Health returns this field in SECONDS despite the name
            if raw_period > 24 * 60:  # > 1440 can't be valid minutes → must be seconds
                total_min = raw_period // 60
                logger.debug("[sleep] minutesInSleepPeriod=%d detected as seconds → %d min", raw_period, total_min)
            else:
                total_min = raw_period

            def _stage_min(v: int) -> int:
                return v // 60 if v > 1440 else v

            deep_min  = _stage_min(summary_stages.get("DEEP", 0))
            light_min = _stage_min(summary_stages.get("LIGHT", 0))
            rem_min   = _stage_min(summary_stages.get("REM", 0))
            awake_min = _stage_min(summary_stages.get("AWAKE", 0))
        else:
            end_str = interval.get("endTime", "")
            if not end_str:
                continue
            end_dt    = datetime.fromisoformat(end_str.replace("Z", "+00:00"))
            total_min = int((end_dt - start_dt).total_seconds() / 60)
            stage_totals = {"AWAKE": 0.0, "LIGHT": 0.0, "DEEP": 0.0, "REM": 0.0}
            for stage in sleep.get("stages", []):
                s = datetime.fromisoformat(stage["startTime"].replace("Z", "+00:00"))
                e = datetime.fromisoformat(stage["endTime"].replace("Z", "+00:00"))
                t = stage.get("type", "LIGHT").upper()
                if t in stage_totals:
                    stage_totals[t] += (e - s).total_seconds() / 60
            deep_min  = round(stage_totals["DEEP"])
            light_min = round(stage_totals["LIGHT"])
            rem_min   = round(stage_totals["REM"])
            awake_min = round(stage_totals["AWAKE"])

        if total_min < _MIN_SLEEP_MIN:
            logger.debug("[sleep] skipping fragment total_min=%d < %d", total_min, _MIN_SLEEP_MIN)
            continue

        duration_h = round(total_min / 60, 2)
        if duration_h > _MAX_SLEEP_H:
            logger.warning("[sleep] date=%s duration=%.1fh exceeds max %d — skipping. point=%s",
                           start_dt.date(), duration_h, _MAX_SLEEP_H, point)
            continue

        date_str = start_dt.strftime("%Y-%m-%d")
        # Keep the longest sleep session per day
        existing = rows_by_date.get(date_str)
        if existing is None or total_min > existing["_total_min"]:
            rows_by_date[date_str] = {
                "date":           date_str,
                "duration_hours": duration_h,
                "deep_min":       deep_min,
                "light_min":      light_min,
                "rem_min":        rem_min,
                "awake_min":      awake_min,
                "_total_min":     total_min,
            }

    rows = []
    for row in sorted(rows_by_date.values(), key=lambda r: r["date"]):
        row.pop("_total_min", None)
        rows.append(row)

    logger.info("[sleep] returning %d valid sessions", len(rows))
    return rows
