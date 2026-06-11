import pandas as pd
import os
from dotenv import load_dotenv
from src.analysis.training_analysis import (
    build_exercise_summary,
    build_prs,
    build_weekly_volume,
    generate_summary,
)
from src.storage.repositories import append_new_dataframe
from src.storage.sheets_client import get_prepared_worksheet

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

load_dotenv()

openai_api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=openai_api_key) if OpenAI and openai_api_key else None


def load_workouts(csv_path):
    df = pd.read_csv(csv_path)
    return df


def clean_workouts(df):

    df = df.dropna(how="all")

    df.columns = [col.lower().replace(" ", "_") for col in df.columns]

    return df


def transform_workouts(df):

    required_columns = ["title", "start_time", "exercise_title", "set_index", "reps", "weight_kg"]
    missing_columns = [column for column in required_columns if column not in df.columns]

    if missing_columns:
        raise ValueError(f"Missing required workout columns: {', '.join(missing_columns)}")

    df = df[required_columns].copy()

    df = df.dropna(subset=["reps", "weight_kg"]).copy()

    df["volume"] = df["reps"] * df["weight_kg"]

    df = df.rename(columns={
        "title": "workout",
        "start_time": "date",
        "exercise_title": "exercise",
        "weight_kg": "weight"
    })

    return df

def upload_to_sheets(df, user_id):
    df = df.copy()
    df["date"] = df["date"].astype(str)
    return append_new_dataframe(
        "workouts",
        df,
        user_id,
        key_columns=["user_id", "workout", "date", "exercise", "set_index", "reps", "weight"],
        legacy_key_columns=["user_id", "workout", "date", "exercise", "reps", "weight"],
    )

def upload_summary(df, user_id):
    return append_new_dataframe(
        "exercise_summary",
        df,
        user_id,
        key_columns=["user_id", "exercise"],
    )

def upload_prs(df, user_id):
    return append_new_dataframe(
        "prs",
        df,
        user_id,
        key_columns=["user_id", "exercise"],
    )

def upload_weekly(df, user_id):
    return append_new_dataframe(
        "weekly_volume",
        df,
        user_id,
        key_columns=["user_id", "week"],
    )

def upload_daily_summary(summary_text, user_id):
    sheet = get_prepared_worksheet("fitness_data", "daily_summary")

    date = pd.Timestamp.now().strftime("%Y-%m-%d")

    records = sheet.get_all_records()

    for record in records:
        if (
            str(record.get("user_id")) == user_id
            and str(record.get("date")) == date
        ):
            return 0

    sheet.append_row([user_id, date, summary_text])
    return 1

def generate_ai_summary(summary_text):

    if client is None:
        print("\nAI not configured, using fallback...\n")
        return generate_fallback_summary(summary_text)

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "user", "content": summary_text}
            ]
        )

        return response.choices[0].message.content

    except Exception:

        print("\nAI not available, using fallback...\n")

        return generate_fallback_summary(summary_text)

def generate_fallback_summary(summary_text):

    lines = summary_text.split("\n")

    analysis = []

    for line in lines:

        if "decreased" in line:
            analysis.append("Training volume has decreased, consider increasing intensity.")

        if "increased" in line:
            analysis.append("Good progression, volume is increasing.")

    analysis.append("Keep consistency and monitor fatigue.")

    return "\n".join(analysis)

def main(user_id, csv_path):

    df = load_workouts(csv_path)
    df = clean_workouts(df)
    df = transform_workouts(df)

    summary = build_exercise_summary(df)
    weekly = build_weekly_volume(df)
    prs = build_prs(df)
    summary_text = generate_summary(df, weekly, prs)
    daily_summary_rows = upload_daily_summary(summary_text, user_id)

    print("Uploading workouts...")
    workout_rows = upload_to_sheets(df, user_id)
    print(f"Added {workout_rows} workout rows")

    print("Uploading summary...")
    summary_rows = upload_summary(summary, user_id)
    print(f"Added {summary_rows} exercise summary rows")

    print("Uploading weekly volume...")
    weekly_rows = upload_weekly(weekly, user_id)
    print(f"Added {weekly_rows} weekly volume rows")

    print("Uploading PRs...")
    pr_rows = upload_prs(prs, user_id)
    print(f"Added {pr_rows} PR rows")

    print("Pipeline complete")
    print(f"Added {daily_summary_rows} daily summary rows")
    summary_text = generate_summary(df, weekly, prs)

    print("\n===== BASIC SUMMARY =====\n")
    print(summary_text)

    ai_summary = generate_ai_summary(summary_text)

    print("\n===== AI SUMMARY =====\n")
    print(ai_summary)

if __name__ == "__main__":
    main("default", "data/workouts.csv")

