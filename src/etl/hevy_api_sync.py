"""
ETL: Hevy API → pandas DataFrames → Google Sheets.
Replaces the CSV-based sync_hevy pipeline with live API data.
"""
import os
import logging
import pandas as pd
from datetime import datetime, timezone

from src.api.hevy_client import fetch_all_workouts
from src.analysis.training_analysis import (
    build_exercise_summary,
    build_prs,
    build_weekly_volume,
    generate_summary,
)
from src.etl.sync_hevy import (
    upload_to_sheets,
    upload_summary,
    upload_prs,
    upload_weekly,
    upload_daily_summary,
    generate_ai_summary,
)

logger = logging.getLogger(__name__)

# Must match the format expected by training_analysis.py parsers
DATE_FMT = "%d %b %Y, %H:%M"


def _iso_to_str(iso: str) -> str:
    """ISO 8601 string ('2026-06-12T14:11:26+00:00') → '12 Jun 2026, 14:11'"""
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
        return dt.strftime(DATE_FMT)
    except Exception:
        return datetime.now(tz=timezone.utc).strftime(DATE_FMT)


def workouts_to_df(workouts: list[dict]) -> pd.DataFrame:
    """
    Convert Hevy API workout list to a DataFrame with columns:
    workout, date, exercise, set_index, reps, weight, volume
    """
    rows = []
    for w in workouts:
        name = w.get("title") or "Sin titulo"
        start_ts = w.get("start_time") or ""
        date_str = _iso_to_str(str(start_ts))

        for exercise in w.get("exercises", []):
            ex_name = exercise.get("title") or "Unknown"
            for s in exercise.get("sets", []):
                reps = s.get("reps")
                weight = s.get("weight_kg")
                idx = s.get("index", 0)
                set_type = s.get("type", "normal")  # API uses "type", not "set_type"

                # Skip warmups and sets without reps/weight data
                if set_type == "warmup":
                    continue
                if reps is None or weight is None:
                    continue

                reps = float(reps)
                weight = float(weight)
                if reps == 0 and weight == 0:
                    continue

                rows.append({
                    "workout":   name,
                    "date":      date_str,
                    "exercise":  ex_name,
                    "set_index": int(idx),
                    "reps":      reps,
                    "weight":    weight,
                    "volume":    reps * weight,
                })

    if not rows:
        return pd.DataFrame(
            columns=["workout", "date", "exercise", "set_index", "reps", "weight", "volume"]
        )

    return pd.DataFrame(rows)


def _upload_analytics(df: pd.DataFrame, user_id: str) -> dict:
    """Recompute and upload exercise_summary, prs, weekly_volume, daily_summary."""
    counts: dict[str, int] = {}

    summary_df = build_exercise_summary(df)
    counts["exercise_summary"] = upload_summary(summary_df, user_id)

    weekly_df = build_weekly_volume(df)
    counts["weekly_volume"] = upload_weekly(weekly_df, user_id)

    prs_df = build_prs(df)
    counts["prs"] = upload_prs(prs_df, user_id)

    if len(weekly_df) >= 1 and not prs_df.empty:
        try:
            text = generate_summary(df, weekly_df, prs_df)
            ai_text = generate_ai_summary(text)
            counts["daily_summary"] = upload_daily_summary(ai_text, user_id)
        except Exception as exc:
            logger.warning("[hevy] Summary generation failed: %s", exc)
            counts["daily_summary"] = 0
    else:
        counts["daily_summary"] = 0

    return counts


def sync_all_hevy(user_id: str, api_key: str | None = None) -> dict:
    """
    Pull all workouts from the Hevy API and upsert into Google Sheets.
    Deduplication is handled by append_new_dataframe (keyed on user_id+workout+date+exercise+set_index).
    Returns a dict with new-row counts per sheet.
    """
    key = api_key or os.getenv("HEVY_API_KEY", "")
    if not key:
        raise ValueError("No Hevy API key available (set HEVY_API_KEY in .env or user record)")

    logger.info("[hevy] Fetching all workouts for user '%s'...", user_id)
    workouts = fetch_all_workouts(api_key=key)
    logger.info("[hevy] Retrieved %d workouts", len(workouts))

    if not workouts:
        return {"workouts": 0, "exercise_summary": 0, "prs": 0, "weekly_volume": 0, "daily_summary": 0}

    df = workouts_to_df(workouts)
    if df.empty:
        logger.warning("[hevy] No usable sets found in %d workouts", len(workouts))
        return {"workouts": 0, "exercise_summary": 0, "prs": 0, "weekly_volume": 0, "daily_summary": 0}

    logger.info("[hevy] Transformed to %d set rows across %d unique workouts",
                len(df), df["workout"].nunique())

    workout_rows = upload_to_sheets(df, user_id)
    analytics = _upload_analytics(df, user_id)

    result = {"workouts": workout_rows, **analytics}
    logger.info("[hevy] Sync complete: %s", result)
    return result
