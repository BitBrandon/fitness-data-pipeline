"""ETL: fetch Google Fit data and upload to Google Sheets."""

import pandas as pd

from src.api.google_fit_client import fetch_daily_activity, fetch_heart_rate, fetch_sleep
from src.storage.repositories import append_new_dataframe


def sync_daily_activity(user_id, days=30):
    rows = fetch_daily_activity(days=days)

    if not rows:
        print("  No activity data found.")
        return 0

    df = pd.DataFrame(rows)
    added = append_new_dataframe(
        worksheet_name="daily_activity",
        df=df,
        user_id=user_id,
        key_columns=["user_id", "date"],
    )
    print(f"  Activity: {added} new rows uploaded.")
    return added


def sync_heart_rate(user_id, days=30):
    rows = fetch_heart_rate(days=days)

    if not rows:
        print("  No heart rate data found.")
        return 0

    df = pd.DataFrame(rows)
    added = append_new_dataframe(
        worksheet_name="heart_rate_daily",
        df=df,
        user_id=user_id,
        key_columns=["user_id", "date"],
    )
    print(f"  Heart rate: {added} new rows uploaded.")
    return added


def sync_sleep(user_id, days=30):
    rows = fetch_sleep(days=days)

    if not rows:
        print("  No sleep data found.")
        return 0

    df = pd.DataFrame(rows)
    added = append_new_dataframe(
        worksheet_name="sleep",
        df=df,
        user_id=user_id,
        key_columns=["user_id", "date"],
    )
    print(f"  Sleep: {added} new rows uploaded.")
    return added


def sync_all_google_fit(user_id, days=30):
    print(f"\nSyncing Google Fit data (last {days} days)...")
    sync_daily_activity(user_id, days)
    sync_heart_rate(user_id, days)
    sync_sleep(user_id, days)
    print("Google Fit sync complete.\n")
