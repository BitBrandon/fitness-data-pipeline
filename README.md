# Fitness Data Pipeline

Personal wellness data platform for collecting training, activity, body metrics and recovery data in one place, then generating useful AI-assisted insights.

The project is starting as a Python data pipeline backed by Google Sheets, and is intended to evolve into a small personal app, potentially an Android APK, for daily health and fitness feedback.

## Current MVP

The current implementation can:

- Read workout data from a Hevy CSV export.
- Transform workout sets with pandas.
- Store workouts, weekly volume, exercise summaries, PRs and body weight in Google Sheets.
- Generate a basic training summary.
- Optionally generate an AI summary when OpenAI credentials are available.

## Product Vision

The long-term goal is a personal wellness assistant that centralizes data from:

- Hevy workouts.
- Fitbit Charge 6 / Google Health / Health Connect.
- Body weight.
- Sleep and recovery metrics.
- Nutrition data in a later phase.

The assistant should explain trends in plain language, for example:

- Weekly training progression.
- Weight changes.
- Sleep and recovery impact.
- Activity consistency.
- Suggested areas to improve.

The system should support multiple users from the beginning, such as Brandon and his partner, by keeping every stored record linked to a `user_id`.

## Architecture

```text
Data Sources
  Hevy CSV / Hevy API
  Fitbit API / Health Connect
  Manual weight input
  Future nutrition sources

Python ETL
  Load
  Clean
  Transform
  Validate

Storage
  Google Sheets as MVP database

Analysis
  Weekly metrics
  Trends
  Recovery signals

AI Assistant
  Daily summaries
  Weekly feedback
  Personalized recommendations

Future App
  Mobile interface / Android APK
```

## Repository Layout

```text
src/
  api/          External API clients.
  etl/          Data ingestion and transformation scripts.
  storage/      Google Sheets access and persistence helpers.
  analysis/     Metrics and trend analysis.
  ai/           AI prompts and wellness agent logic.
  pipeline/     Pipeline orchestration entrypoints.

data/           Local sample data.
docs/           Project context, roadmap and design notes.
```

## Main Entry Point

Run the current interactive pipeline with:

```bash
python -m src.pipeline.run_pipeline
```

## Documentation

Start with:

- [Project Context](docs/PROJECT_CONTEXT.md)
- [Setup And Validation](docs/SETUP.md)

## Notes

This project is a personal tool and portfolio project. The current Google Sheets backend is intentionally simple for the MVP, but the code should stay modular enough to migrate later to a real database if needed.
