"""
End-to-end integration test for the Hevy API pipeline.

Tests:
  1. API client — fetch_all_workouts / fetch_workout
  2. ETL — workouts_to_df (shape, columns, date format)
  3. Full sync — sync_all_hevy (writes to Sheets)
  4. Webhook endpoint — POST /webhooks/hevy?username=<user>

Run from project root (venv active):
    python -m scripts.test_hevy_integration
"""

import os
import sys
import json
import time
import requests
from dotenv import load_dotenv

load_dotenv()

# -- helpers ------------------------------------------------------------------

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

PASS_COUNT = 0
FAIL_COUNT = 0


def ok(msg: str):
    global PASS_COUNT
    PASS_COUNT += 1
    print(f"  {GREEN}OK{RESET} {msg}")


def fail(msg: str, exc: Exception | None = None):
    global FAIL_COUNT
    FAIL_COUNT += 1
    print(f"  {RED}FAIL{RESET} {msg}")
    if exc:
        print(f"    {RED}{type(exc).__name__}: {exc}{RESET}")


def section(title: str):
    print(f"\n{BOLD}{title}{RESET}")
    print("-" * 50)


# -- 1. API client -------------------------------------------------------------

def test_api_client():
    section("1. Hevy API Client")
    from src.api.hevy_client import fetch_all_workouts, fetch_workout

    api_key = os.getenv("HEVY_API_KEY", "")
    if not api_key:
        fail("HEVY_API_KEY not set in .env — skipping API tests")
        return None, None

    # fetch all
    try:
        workouts = fetch_all_workouts(api_key=api_key)
        ok(f"fetch_all_workouts → {len(workouts)} workouts")
    except Exception as e:
        fail("fetch_all_workouts raised exception", e)
        return None, None

    if not workouts:
        print(f"  {YELLOW}WARN No workouts returned — account may be empty{RESET}")
        return [], None

    w0 = workouts[0]
    # Check structure
    for field in ("id", "title", "start_time", "exercises"):
        if field in w0:
            ok(f"  workout has field '{field}'")
        else:
            fail(f"  workout missing field '{field}'")

    # fetch single
    wid = w0.get("id")
    try:
        single = fetch_workout(workout_id=wid, api_key=api_key)
        ok(f"fetch_workout('{wid[:8]}…') → title='{single.get('title')}'")
    except Exception as e:
        fail(f"fetch_workout failed for id={wid}", e)
        single = None

    return workouts, single


# -- 2. ETL transform ----------------------------------------------------------

def test_etl(workouts: list[dict]):
    section("2. ETL — workouts_to_df")
    from src.etl.hevy_api_sync import workouts_to_df

    if not workouts:
        print(f"  {YELLOW}WARN No workouts to transform — skipping{RESET}")
        return None

    try:
        df = workouts_to_df(workouts)
        ok(f"workouts_to_df → {len(df)} rows, {df['workout'].nunique()} workouts")
    except Exception as e:
        fail("workouts_to_df raised exception", e)
        return None

    expected_cols = {"workout", "date", "exercise", "set_index", "reps", "weight", "volume"}
    missing = expected_cols - set(df.columns)
    if missing:
        fail(f"DataFrame missing columns: {missing}")
    else:
        ok(f"All expected columns present: {sorted(expected_cols)}")

    # Date format check (training_analysis expects "%d %b %Y, %H:%M")
    import pandas as pd
    sample_date = df["date"].iloc[0]
    try:
        parsed = pd.to_datetime(sample_date, format="%d %b %Y, %H:%M")
        ok(f"Date format correct: '{sample_date}' → {parsed.date()}")
    except Exception as e:
        fail(f"Date format wrong: '{sample_date}'", e)

    # Volume sanity
    bad_volume = df[df["volume"] != df["reps"] * df["weight"]]
    if bad_volume.empty:
        ok("Volume = reps × weight for all rows")
    else:
        fail(f"{len(bad_volume)} rows have incorrect volume")

    # No warmup sets (they should be filtered)
    if "set_type" in df.columns:
        warmups = df[df["set_type"] == "warmup"]
        if warmups.empty:
            ok("Warmup sets filtered out")
        else:
            fail(f"{len(warmups)} warmup sets leaked through")
    else:
        ok("set_type column not in output (warmups already dropped)")

    print(f"\n  Sample rows:")
    print(df.head(3).to_string(index=False))

    return df


# -- 3. Full sync to Sheets ----------------------------------------------------

def test_sync():
    section("3. Full Sync → Google Sheets")

    # Use username from env or default to "brandon"
    username = os.getenv("TEST_USERNAME", "brandon")
    api_key  = os.getenv("HEVY_API_KEY", "")

    if not api_key:
        fail("HEVY_API_KEY not set — skipping sync test")
        return

    from src.etl.hevy_api_sync import sync_all_hevy

    print(f"  Syncing for user '{username}' (this writes to Google Sheets)...")
    t0 = time.time()
    try:
        counts = sync_all_hevy(user_id=username, api_key=api_key)
        elapsed = time.time() - t0
        ok(f"sync_all_hevy completed in {elapsed:.1f}s")
        for sheet, n in counts.items():
            print(f"    {sheet}: {n} new rows")
    except Exception as e:
        fail("sync_all_hevy raised exception", e)
        return

    # Verify workouts visible via the API
    try:
        from src.storage.sheets_client import get_or_create_prepared_worksheet
        from src.storage.repositories import SPREADSHEET_NAME
        sheet = get_or_create_prepared_worksheet(SPREADSHEET_NAME, "workouts")
        rows  = sheet.get_all_records()
        user_rows = [r for r in rows if str(r.get("user_id")) == username]
        ok(f"Sheets 'workouts' tab has {len(user_rows)} rows for user '{username}'")
    except Exception as e:
        fail("Could not verify Sheets content", e)


# -- 4. Webhook endpoint -------------------------------------------------------

def test_webhook(workout_id: str | None):
    section("4. Webhook Endpoint — POST /webhooks/hevy")

    base_url = os.getenv("API_BASE_URL", "http://localhost:8001")
    username = os.getenv("TEST_USERNAME", "brandon")

    if not workout_id:
        print(f"  {YELLOW}WARN No workout_id available — using placeholder{RESET}")
        workout_id = "f1085cdb-32b2-4003-967d-53a3af8eaecb"

    url = f"{base_url}/webhooks/hevy?username={username}"
    payload = {"workoutId": workout_id}

    print(f"  POST {url}")
    print(f"  Body: {json.dumps(payload)}")

    try:
        r = requests.post(url, json=payload, timeout=10)
        if r.status_code == 202:
            ok(f"Response 202 Accepted: {r.json()}")
        elif r.status_code == 400:
            print(f"  {YELLOW}WARN 400 Bad Request: {r.text} (API key may not be in Sheets yet){RESET}")
        else:
            fail(f"Unexpected status {r.status_code}: {r.text}")
    except requests.exceptions.ConnectionError:
        print(f"  {YELLOW}WARN Server not running at {base_url} — start with start.ps1 to test webhook{RESET}")
    except Exception as e:
        fail("Webhook request failed", e)


# -- main ----------------------------------------------------------------------

def main():
    print(f"\n{BOLD}{'='*52}{RESET}")
    print(f"{BOLD}  Hevy Integration Test Suite{RESET}")
    print(f"{BOLD}{'='*52}{RESET}")

    workouts, single = test_api_client()
    df = test_etl(workouts or [])
    test_sync()

    workout_id = (workouts[0].get("id") if workouts else None)
    test_webhook(workout_id)

    print(f"\n{'='*52}")
    total = PASS_COUNT + FAIL_COUNT
    color = GREEN if FAIL_COUNT == 0 else RED
    print(f"{color}{BOLD}Results: {PASS_COUNT}/{total} passed{RESET}")
    if FAIL_COUNT:
        print(f"{RED}  {FAIL_COUNT} test(s) failed{RESET}")
    print()

    sys.exit(1 if FAIL_COUNT > 0 else 0)


if __name__ == "__main__":
    main()
