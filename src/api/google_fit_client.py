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


def _daily_rollup(creds, data_type, days):
    now   = datetime.now(timezone.utc)
    start = now - timedelta(days=days)
    # end must be tomorrow so today's partial day is included in the rollup
    end   = now + timedelta(days=1)

    body = {"range": {"start": _civil_dt(start), "end": _civil_dt(end)}}

    resp = requests.post(
        f"{HEALTH_API}/users/me/dataTypes/{data_type}/dataPoints:dailyRollUp",
        headers={"Authorization": f"Bearer {creds.token}"},
        json=body,
        timeout=30,
    )
    resp.raise_for_status()
    points = resp.json().get("rollupDataPoints", [])
    logger.debug("[%s] %d rollup points. First: %s", data_type, len(points),
                 list(points[0].keys()) if points else "empty")
    return points


def _point_date(point):
    d = point["civilStartTime"]["date"]
    return f"{d['year']:04d}-{d['month']:02d}-{d['day']:02d}"


def _extract_numeric(point, *candidate_paths):
    """
    Try each (field, subfield) pair in order and return the first non-zero float found.
    candidate_paths: list of (field_name, subfield_name) tuples.
    Logs a warning if all candidates miss.
    """
    for field, subfield in candidate_paths:
        container = point.get(field, {})
        val = container.get(subfield, 0) if isinstance(container, dict) else 0
        if val:
            return float(val)

    logger.warning("_extract_numeric: all candidates missed. Point keys=%s, tried=%s",
                   list(point.keys()), candidate_paths)
    return 0.0


_CALORIES_SLUGS = (
    "total-calories",       # total (active + BMR) — matches Fitbit app display
    "active-energy-burned", # active only — fallback
)


def _fetch_calories(creds, days):
    """Try known calorie slugs in order; return {date: point} for the first that works."""
    for slug in _CALORIES_SLUGS:
        try:
            pts = _daily_rollup(creds, slug, days)
            if pts:
                logger.info("calories fetched via slug '%s'", slug)
                return slug, {_point_date(p): p for p in pts}
        except requests.HTTPError as e:
            logger.debug("calories slug '%s' failed: %s", slug, e)
    logger.warning("No calories data type found for this device/account.")
    return None, {}


def _sum_active_minutes(point):
    """
    activeMinutes.activeMinutesRollupByActivityLevel is a list of
    {activityLevel, activeMinutesSum}. Sum MODERATE + VIGOROUS only.
    """
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
    _, cal_points = _fetch_calories(creds, days)

    active_points: dict = {}
    try:
        pts = _daily_rollup(creds, "active-minutes", days)
        active_points = {_point_date(p): p for p in pts}
    except requests.HTTPError as e:
        logger.debug("active-minutes not available: %s", e)

    all_dates = sorted(set(steps_points) | set(cal_points))
    rows = []

    for date in all_dates:
        # steps.countSum is returned as a string by the API
        steps = int(steps_points[date].get("steps", {}).get("countSum", 0)) if date in steps_points else 0

        # calories — field name depends on the slug that worked
        calories = 0.0
        if date in cal_points:
            p = cal_points[date]
            calories = round(_extract_numeric(p,
                ("totalCalories",    "kcalSum"),   # total-calories slug
                ("activeEnergyBurned", "kcalSum"), # active-energy-burned slug
            ), 1)

        # active minutes: sum MODERATE + VIGOROUS levels
        active_minutes = _sum_active_minutes(active_points[date]) if date in active_points else 0

        if steps == 0 and calories == 0.0:
            continue

        rows.append({
            "date":           date,
            "steps":          steps,
            "calories":       calories,
            "active_minutes": active_minutes,
        })

    return rows


def fetch_heart_rate(days=30):
    """Return list of dicts with date, hr_avg, hr_max, hr_min."""
    creds = get_credentials()
    now = datetime.now(timezone.utc)
    chunk_size = 14
    all_points = []

    for offset in range(0, days, chunk_size):
        chunk_end   = now + timedelta(days=1) if offset == 0 else now - timedelta(days=offset)
        chunk_start = now - timedelta(days=min(offset + chunk_size, days))
        body = {"range": {"start": _civil_dt(chunk_start), "end": _civil_dt(chunk_end)}}
        resp = requests.post(
            f"{HEALTH_API}/users/me/dataTypes/heart-rate/dataPoints:dailyRollUp",
            headers={"Authorization": f"Bearer {creds.token}"},
            json=body,
            timeout=30,
        )
        resp.raise_for_status()
        all_points.extend(resp.json().get("rollupDataPoints", []))

    rows = []
    for point in all_points:
        hr = point.get("heartRate", {})
        avg = hr.get("beatsPerMinuteAvg", 0)
        if not avg:
            continue
        rows.append({
            "date":   _point_date(point),
            "hr_avg": round(float(avg), 1),
            "hr_max": round(float(hr.get("beatsPerMinuteMax", 0)), 1),
            "hr_min": round(float(hr.get("beatsPerMinuteMin", 0)), 1),
        })

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

    now    = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)
    rows   = []

    for point in resp.json().get("dataPoints", []):
        sleep    = point.get("sleep", {})
        interval = sleep.get("interval", {})
        start_str = interval.get("startTime", "")

        if not start_str:
            continue

        start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
        if start_dt < cutoff:
            continue

        # Prefer pre-computed summary (already validated by the API)
        summary_stages = {
            s["type"]: int(s.get("minutes", 0))
            for s in sleep.get("summary", {}).get("stagesSummary", [])
        }

        if summary_stages:
            total_min = int(sleep.get("summary", {}).get("minutesInSleepPeriod", 0))
            deep_min  = summary_stages.get("DEEP", 0)
            light_min = summary_stages.get("LIGHT", 0)
            rem_min   = summary_stages.get("REM", 0)
            awake_min = summary_stages.get("AWAKE", 0)
        else:
            # Fallback: compute from raw stages
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

        if total_min < 30:
            continue

        rows.append({
            "date":           start_dt.strftime("%Y-%m-%d"),
            "duration_hours": round(total_min / 60, 2),
            "deep_min":       deep_min,
            "light_min":      light_min,
            "rem_min":        rem_min,
            "awake_min":      awake_min,
        })

    return rows
