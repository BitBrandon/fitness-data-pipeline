"""Training metric calculations for workout data."""

import pandas as pd


def build_exercise_summary(df):
    summary = df.groupby("exercise").agg(
        total_sets=("exercise", "count"),
        max_weight=("weight", "max"),
        total_volume=("volume", "sum")
    ).reset_index()

    return summary


def build_weekly_volume(df):
    df = df.copy()
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
            "date": str(pr_row["date"])
        })

    return pd.DataFrame(prs)


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

    top_ex = df.groupby("exercise")["volume"].sum().idxmax()
    summary.append(f"- Top exercise: {top_ex}")

    last_pr = prs.iloc[-1]
    summary.append(f"- Latest PR: {last_pr['exercise']} - {last_pr['pr_weight']} kg")

    return "\n".join(summary)
