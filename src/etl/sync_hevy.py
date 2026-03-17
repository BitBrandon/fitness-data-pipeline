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

def main():

    df = load_workouts()
    df = clean_workouts(df)
    df = transform_workouts(df)

    summary = build_exercise_summary(df)

    print("Uploading workouts...")
    upload_to_sheets(df)

    print("Uploading summary...")
    upload_summary(summary)

    print("Pipeline complete")
    
if __name__ == "__main__":
    main()