"""
Prints the raw API response structure for each Google Health data type.
Run from the project root:  python -m scripts.debug_google_fit
"""

import json
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, ".")
from src.api.google_fit_client import get_credentials, _civil_dt, HEALTH_API
import requests


def rollup(creds, data_type, days=3):
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)
    body = {"range": {"start": _civil_dt(start), "end": _civil_dt(now)}}
    resp = requests.post(
        f"{HEALTH_API}/users/me/dataTypes/{data_type}/dataPoints:dailyRollUp",
        headers={"Authorization": f"Bearer {creds.token}"},
        json=body,
        timeout=30,
    )
    print(f"\n=== {data_type} (status {resp.status_code}) ===")
    try:
        data = resp.json()
        points = data.get("rollupDataPoints", [])
        if points:
            print(f"First point keys: {list(points[0].keys())}")
            print(json.dumps(points[0], indent=2))
        else:
            print("No rollupDataPoints in response")
            print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error parsing response: {e}")
        print(resp.text[:500])


def sleep_raw(creds):
    resp = requests.get(
        f"{HEALTH_API}/users/me/dataTypes/sleep/dataPoints",
        headers={"Authorization": f"Bearer {creds.token}"},
        timeout=30,
    )
    print(f"\n=== sleep (status {resp.status_code}) ===")
    try:
        data = resp.json()
        points = data.get("dataPoints", [])
        if points:
            print(f"First point keys: {list(points[0].keys())}")
            print(json.dumps(points[0], indent=2))
        else:
            print("No dataPoints in response")
            print(json.dumps(data, indent=2))
    except Exception as e:
        print(f"Error: {e}")
        print(resp.text[:500])


if __name__ == "__main__":
    print("Authenticating...")
    creds = get_credentials()
    print("OK")

    for dt in ["steps", "total-energy-burned", "calories-burned", "active-energy-burned",
               "total-calories", "basal-metabolic-rate", "active-minutes", "heart-rate"]:
        rollup(creds, dt)

    sleep_raw(creds)
