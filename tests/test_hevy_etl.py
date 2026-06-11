import unittest

import pandas as pd

from src.analysis.training_analysis import (
    build_exercise_summary,
    build_prs,
    build_weekly_volume,
    generate_summary,
)
from src.etl.sync_hevy import clean_workouts, transform_workouts


def sample_raw_workouts():
    return pd.DataFrame([
        {
            "Title": "Upper",
            "Start Time": "01 Jun 2026, 10:00",
            "Exercise Title": "Bench Press",
            "Set Index": 0,
            "Reps": 10,
            "Weight Kg": 60,
        },
        {
            "Title": "Upper",
            "Start Time": "01 Jun 2026, 10:00",
            "Exercise Title": "Bench Press",
            "Set Index": 1,
            "Reps": 8,
            "Weight Kg": 70,
        },
        {
            "Title": "Lower",
            "Start Time": "08 Jun 2026, 10:00",
            "Exercise Title": "Squat",
            "Set Index": 0,
            "Reps": 5,
            "Weight Kg": 100,
        },
        {
            "Title": "Cardio",
            "Start Time": "08 Jun 2026, 10:00",
            "Exercise Title": "Cycling",
            "Set Index": 0,
            "Reps": None,
            "Weight Kg": None,
        },
    ])


class HevyEtlTests(unittest.TestCase):
    def test_clean_workouts_normalizes_columns(self):
        df = clean_workouts(sample_raw_workouts())

        self.assertIn("start_time", df.columns)
        self.assertIn("exercise_title", df.columns)
        self.assertIn("weight_kg", df.columns)

    def test_transform_workouts_keeps_weighted_sets_and_volume(self):
        df = transform_workouts(clean_workouts(sample_raw_workouts()))

        self.assertEqual(len(df), 3)
        self.assertEqual(
            list(df.columns),
            ["workout", "date", "exercise", "set_index", "reps", "weight", "volume"],
        )
        self.assertEqual(df.iloc[0]["volume"], 600)
        self.assertEqual(df.iloc[1]["volume"], 560)

    def test_transform_workouts_reports_missing_columns(self):
        df = clean_workouts(sample_raw_workouts()).drop(columns=["weight_kg"])

        with self.assertRaisesRegex(ValueError, "weight_kg"):
            transform_workouts(df)

    def test_training_metrics_are_built_from_transformed_workouts(self):
        df = transform_workouts(clean_workouts(sample_raw_workouts()))

        exercise_summary = build_exercise_summary(df)
        weekly = build_weekly_volume(df)
        prs = build_prs(df)
        summary_text = generate_summary(df, weekly, prs)

        bench = exercise_summary[exercise_summary["exercise"] == "Bench Press"].iloc[0]
        self.assertEqual(bench["total_sets"], 2)
        self.assertEqual(bench["max_weight"], 70)
        self.assertEqual(bench["total_volume"], 1160)

        self.assertEqual(len(weekly), 2)
        self.assertEqual(len(prs), 2)
        self.assertIn("Daily Training Report", summary_text)
        self.assertIn("Top exercise: Bench Press", summary_text)


if __name__ == "__main__":
    unittest.main()
