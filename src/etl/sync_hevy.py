import pandas as pd
import gspread
from oauth2client.service_account import ServiceAccountCredentials

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

    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive"
    ]

    creds = ServiceAccountCredentials.from_json_keyfile_name(
        "credentials.json",
        scope
    )

    client = gspread.authorize(creds)

    sheet = client.open("fitness_data").worksheet("workouts")

    sheet.clear()

    df["date"] = df["date"].astype(str)

    data = [df.columns.values.tolist()] + df.values.tolist()

    sheet.update(data)

def upload_summary(df):

    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive"
    ]

    creds = ServiceAccountCredentials.from_json_keyfile_name(
        "credentials.json",
        scope
    )

    client = gspread.authorize(creds)

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

    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive"
    ]

    creds = ServiceAccountCredentials.from_json_keyfile_name(
        "credentials.json",
        scope
    )

    client = gspread.authorize(creds)

    sheet = client.open("fitness_data").worksheet("prs")

    sheet.clear()

    data = [df.columns.values.tolist()] + df.values.tolist()

    sheet.update(data)
def upload_weekly(df):

    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive"
    ]

    creds = ServiceAccountCredentials.from_json_keyfile_name(
        "credentials.json",
        scope
    )

    client = gspread.authorize(creds)

    sheet = client.open("fitness_data").worksheet("weekly_volume")

    sheet.clear()

    data = [df.columns.values.tolist()] + df.values.tolist()

    sheet.update(data)

def main():

    df = load_workouts()
    df = clean_workouts(df)
    df = transform_workouts(df)

    summary = build_exercise_summary(df)
    weekly = build_weekly_volume(df)
    prs = build_prs(df)

    print("Uploading workouts...")
    upload_to_sheets(df)

    print("Uploading summary...")
    upload_summary(summary)

    print("Uploading weekly volume...")
    upload_weekly(weekly)

    print("Uploading PRs...")
    upload_prs(prs)

    print("Pipeline complete")
    
if __name__ == "__main__":
    main()