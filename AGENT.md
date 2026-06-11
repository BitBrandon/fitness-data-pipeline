# Fitness Data Pipeline - Agent Context

## Project Overview

This project is evolving from a Hevy CSV pipeline into a personal AI-powered wellness platform.

The long-term goal is to collect fitness, activity, sleep, recovery and body metrics into a central store, then generate useful insights through an AI assistant.

The intended product may eventually become a mobile app or Android APK.

## Current MVP

Implemented:

- Ingest Hevy workout data from CSV.
- Process workouts with Python and pandas.
- Store results in Google Sheets.
- Track:
  - workouts
  - weekly volume
  - exercise summaries
  - PRs
  - body weight
  - daily summaries
- Support multiple users through `user_id`.

Not yet implemented:

- Hevy API integration.
- Fitbit API integration.
- Health Connect Android integration.
- Real AI wellness agent module.
- Mobile app.
- Duplicate prevention for all data uploads.

## Product Direction

The system should become a personal wellness assistant for Brandon and potentially his partner.

It should eventually centralize:

- Hevy strength workouts.
- Fitbit Charge 6 / Google Health / Health Connect data.
- Body weight.
- Sleep and recovery metrics.
- Nutrition data in the future.

The AI assistant should explain trends and recommendations in plain language, using metrics calculated by the code.

Important principle:

- Python computes facts.
- AI explains facts and suggests next steps.
- AI must not invent missing numbers.

## Architecture

- `src/api` - external API clients such as Hevy, Fitbit and Health Connect bridges.
- `src/etl` - data loading, cleaning, normalization and sync scripts.
- `src/storage` - Google Sheets clients and future repository helpers.
- `src/analysis` - metric calculations and trend detection.
- `src/ai` - prompts and AI wellness assistant logic.
- `src/pipeline` - orchestration entrypoints.
- `docs` - local project context, roadmap and design notes.

## Key Files

- `docs/PROJECT_CONTEXT.md` - main local context and roadmap.
- `src/pipeline/run_pipeline.py` - current interactive pipeline.
- `src/etl/sync_hevy.py` - current Hevy CSV ETL.
- `src/etl/add_weight.py` - manual body weight input.
- `src/storage/sheets_client.py` - Google Sheets connection and headers.
- `src/storage/user_auth.py` - current user management through Sheets.
- `src/ai/wellness_agent.py` - future AI agent home.

## Rules

- Do not break existing CSV pipeline functionality.
- Keep every user-specific record tied to `user_id`.
- Prefer simple and readable Python.
- Keep functions modular.
- Avoid overengineering.
- Explain meaningful changes before applying them.
- Use Google Sheets as the MVP database, but keep boundaries clean enough to migrate later.

## Near-Term Priorities

1. Stabilize the current MVP.
2. Prevent duplicate uploads.
3. Move analysis out of ETL scripts.
4. Add structured AI insight generation.
5. Add Fitbit or Health Connect ingestion.
6. Prepare for a mobile app.

## Style

- Use snake_case.
- Keep functions small.
- Avoid unnecessary abstractions.
- Prefer clear data contracts over clever code.
