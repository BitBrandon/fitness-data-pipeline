import pandas as pd
import os
from openai import OpenAI
from dotenv import load_dotenv
from src.storage.sheets_client import get_gspread_client

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

CSV_PATH = "data/workouts.csv"


def load_workouts():
    df = pd.read_csv(CSV_PATH)
    return df


def clean_workouts(df):

    df = df.dropna(how="all")

    df.columns = [col.lower().replace(" ", "_") for col in df.columns]

    return df


def transform_workouts(df):

    df = df[["title", "start_time", "exercise_title", "reps", "weight_kg"]]

    df = df.dropna(subset=["reps", "weight_kg"])

    df["volume"] = df["reps"] * df["weight_kg"]

    df = df.rename(columns={
        "title": "workout",
        "start_time": "date",
        "exercise_title": "exercise",
        "weight_kg": "weight"
    })

    return df

def build_exercise_summary(df):

    summary = df.groupby("exercise").agg(
        total_sets=("exercise", "count"),
        max_weight=("weight", "max"),
        total_volume=("volume", "sum")
    ).reset_index()

    return summary

def upload_to_sheets(df):

    client = get_gspread_client()

    sheet = client.open("fitness_data").worksheet("workouts")

    sheet.clear()

    df["date"] = df["date"].astype(str)

    data = [df.columns.values.tolist()] + df.values.tolist()

    sheet.update(data)

def upload_summary(df):

    client = get_gspread_client()

    sheet = client.open("fitness_data").worksheet("exercise_summary")

    sheet.clear()

    data = [df.columns.values.tolist()] + df.values.tolist()

    sheet.update(data)

def build_weekly_volume(df):

    df["date"] = pd.to_datetime(df["date"], format="%d %b %Y, %H:%M")

    df["week"] = df["date"].dt.to_period("W").astype(str)

    weekly = df.groupby("week").agg(
        total_volume=("volume", "sum"),
        total_sets=("exercise", "count")
    ).reset_index()

    return weekly

def build_prs(df):

    df_copy = df.copy()

    df_copy["date"] = pd.to_datetime(df_copy["date"], format="%d %b %Y, %H:%M")

    df_copy = df_copy.sort_values(by="date")

    prs = []

    for exercise in df_copy["exercise"].unique():

        ex_df = df_copy[df_copy["exercise"] == exercise]

        max_weight = ex_df["weight"].max()

        pr_row = ex_df[ex_df["weight"] == max_weight].iloc[0]

        prs.append({
            "exercise": exercise,
            "pr_weight": max_weight,
            "date": str(pr_row["date"])  # 👈 importante
        })

    return pd.DataFrame(prs)

def upload_prs(df):

    client = get_gspread_client()

    sheet = client.open("fitness_data").worksheet("prs")

    sheet.clear()

    data = [df.columns.values.tolist()] + df.values.tolist()

    sheet.update(data)
def upload_weekly(df):

    client = get_gspread_client()

    sheet = client.open("fitness_data").worksheet("weekly_volume")

    sheet.clear()

    data = [df.columns.values.tolist()] + df.values.tolist()

    sheet.update(data)

def upload_daily_summary(summary_text):

    client = get_gspread_client()

    sheet = client.open("fitness_data").worksheet("daily_summary")

    date = pd.Timestamp.now().strftime("%Y-%m-%d")

    records = sheet.get_all_records()

    for record in records:
        if str(record.get("date")) == date:
            return

    sheet.append_row([date, summary_text])

def upload_ai_summary(ai_summary):

    client = get_gspread_client()

    sheet = client.open("fitness_data").worksheet("ai_summary")

    date = pd.Timestamp.now().strftime("%Y-%m-%d")

    sheet.append_row([date, ai_summary])

def generate_summary(df, weekly, prs):

    latest_week = weekly.iloc[-1]
    prev_week = weekly.iloc[-2] if len(weekly) > 1 else None

    summary = []

    summary.append("Daily Training Report")
    summary.append(f"- Week: {latest_week['week']}")
    summary.append(f"- Total volume: {int(latest_week['total_volume'])} kg")

    if prev_week is not None:
        diff = latest_week["total_volume"] - prev_week["total_volume"]

        if diff > 0:
            summary.append(f"- Volume increased by {int(diff)} kg vs last week")
        else:
            summary.append(f"- Volume decreased by {int(abs(diff))} kg vs last week")

    # ejercicio más trabajado
    top_ex = df.groupby("exercise")["volume"].sum().idxmax()
    summary.append(f"- Top exercise: {top_ex}")

    # último PR
    last_pr = prs.iloc[-1]
    summary.append(f"- Latest PR: {last_pr['exercise']} - {last_pr['pr_weight']} kg")

    return "\n".join(summary)

def generate_ai_summary(summary_text):

    try:
        response = client.chat.completions.create(
            model="gpt-4.1-mini",
            messages=[
                {"role": "user", "content": summary_text}
            ]
        )

        return response.choices[0].message.content

    except Exception as e:

        print("\n⚠️ AI not available, using fallback...\n")

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

def main():

    df = load_workouts()
    df = clean_workouts(df)
    df = transform_workouts(df)

    summary = build_exercise_summary(df)
    weekly = build_weekly_volume(df)
    prs = build_prs(df)
    summary_text = generate_summary(df, weekly, prs)
    upload_daily_summary(summary_text)

    print("Uploading workouts...")
    upload_to_sheets(df)

    print("Uploading summary...")
    upload_summary(summary)

    print("Uploading weekly volume...")
    upload_weekly(weekly)

    print("Uploading PRs...")
    upload_prs(prs)

    print("Pipeline complete")
    summary_text = generate_summary(df, weekly, prs)

    print("\n===== BASIC SUMMARY =====\n")
    print(summary_text)

    ai_summary = generate_ai_summary(summary_text)

    print("\n===== AI SUMMARY =====\n")
    print(ai_summary)

if __name__ == "__main__":
    main()
