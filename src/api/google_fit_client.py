"""Google Health API v4 client with OAuth2 (installed app flow)."""

import os
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

load_dotenv()

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
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)

    body = {"range": {"start": _civil_dt(start), "end": _civil_dt(now)}}

    resp = requests.post(
        f"{HEALTH_API}/users/me/dataTypes/{data_type}/dataPoints:dailyRollUp",
        headers={"Authorization": f"Bearer {creds.token}"},
        json=body,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json().get("rollupDataPoints", [])


def _point_date(point):
    d = point["civilStartTime"]["date"]
    return f"{d['year']:04d}-{d['month']:02d}-{d['day']:02d}"


def fetch_daily_activity(days=30):
    """Return list of dicts with date, steps, calories, active_minutes."""
    creds = get_credentials()

    steps_points = {_point_date(p): p for p in _daily_rollup(creds, "steps", days)}
    # total-energy-burned includes BMR + active (matches Fitbit app "Total Calories")
    calories_points = {_point_date(p): p for p in _daily_rollup(creds, "total-energy-burned", days)}

    all_dates = sorted(set(steps_points) | set(calories_points))
    rows = []

    for date in all_dates:
        steps = int(steps_points[date].get("steps", {}).get("countSum", 0)) if date in steps_points else 0
        cal_point = calories_points[date] if date in calories_points else {}
        # field name mirrors the data-type slug in camelCase
        cal_val = cal_point.get("totalEnergyBurned", cal_point.get("activeEnergyBurned", {}))
        calories = round(float(cal_val.get("kcalSum", 0)), 1)

        if steps == 0 and calories == 0.0:
            continue

        rows.append({"date": date, "steps": steps, "calories": calories})

    return rows


def fetch_heart_rate(days=30):
    """Return list of dicts with date, hr_avg, hr_max, hr_min."""
    creds = get_credentials()
    now = datetime.now(timezone.utc)
    chunk_size = 14
    all_points = []

    for offset in range(0, days, chunk_size):
        chunk_end = now - timedelta(days=offset)
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
        if avg == 0:
            continue
        rows.append({
            "date": _point_date(point),
            "hr_avg": round(avg, 1),
            "hr_max": round(hr.get("beatsPerMinuteMax", 0), 1),
            "hr_min": round(hr.get("beatsPerMinuteMin", 0), 1),
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

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)
    rows = []

    for point in resp.json().get("dataPoints", []):
        sleep = point.get("sleep", {})
        interval = sleep.get("interval", {})
        start_str = interval.get("startTime", "")
        end_str = interval.get("endTime", "")

        if not start_str or not end_str:
            continue

        start_dt = datetime.fromisoformat(start_str.replace("Z", "+00:00"))
        if start_dt < cutoff:
            continue

        end_dt = datetime.fromisoformat(end_str.replace("Z", "+00:00"))
        total_min = (end_dt - start_dt).total_seconds() / 60

        if total_min < 30:
            continue

        stage_totals = {"AWAKE": 0, "LIGHT": 0, "DEEP": 0, "REM": 0}
        for stage in sleep.get("stages", []):
            s = datetime.fromisoformat(stage["startTime"].replace("Z", "+00:00"))
            e = datetime.fromisoformat(stage["endTime"].replace("Z", "+00:00"))
            duration_min = (e - s).total_seconds() / 60
            stage_type = stage.get("type", "LIGHT")
            if stage_type in stage_totals:
                stage_totals[stage_type] += duration_min

        date = start_dt.strftime("%Y-%m-%d")
        rows.append({
            "date": date,
            "duration_hours": round(total_min / 60, 2),
            "deep_min": round(stage_totals["DEEP"]),
            "light_min": round(stage_totals["LIGHT"]),
            "rem_min": round(stage_totals["REM"]),
            "awake_min": round(stage_totals["AWAKE"]),
        })

    return rows
