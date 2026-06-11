# Project Context

## One-Line Summary

Fitness Data Pipeline is evolving into a personal wellness assistant that centralizes fitness, activity, sleep, recovery and body metrics, then uses AI to explain trends and suggest improvements.

## Current State

The repository currently contains a working Python MVP focused on Hevy CSV exports and Google Sheets storage.

Implemented today:

- Interactive pipeline entrypoint in `src/pipeline/run_pipeline.py`.
- User authentication and CSV path storage through a Google Sheets `users` worksheet.
- Manual body weight logging.
- Hevy CSV loading and transformation.
- Uploads to Google Sheets worksheets:
  - `workouts`
  - `body_weight`
  - `daily_summary`
  - `prs`
  - `weekly_volume`
  - `exercise_summary`
  - `users`
- Basic training report generation.
- Optional OpenAI summary generation with fallback text.

Not implemented yet:

- Real Hevy API integration.
- Fitbit API integration.
- Android Health Connect integration.
- Proper AI wellness agent.
- Mobile app/APK.
- Duplicate prevention for most uploaded data.
- Automated tests.

## Product Vision

The desired product is a small personal AI-powered wellness app. It should eventually work from mobile, ideally as an Android APK, and help the user understand their own health and training data.

The app should answer questions like:

- How did my training go this week?
- Did my weight trend up or down?
- Am I recovering well?
- Did poor sleep affect my workouts?
- What should I pay attention to next week?
- Is my partner progressing consistently with her own data?

The tone of the assistant should be useful, direct and supportive. It should behave more like a personal coach reading the user's data than a rigid report script.

## Users And Scalability

The system should support multiple users from the beginning.

Important rule:

- Every stored metric should include `user_id`.

This allows the same Google Sheets database to store data for Brandon and potentially his partner without mixing records.

The current project already uses `user_id` in several sheets, which is a good starting point.

## Target Data Sources

### Hevy

Current state:

- Data comes from CSV export.

Future:

- Add `src/api/hevy_client.py` for API-based ingestion if the API access is practical.

Useful data:

- Workouts.
- Exercises.
- Sets.
- Reps.
- Weight.
- Volume.
- PRs.

### Fitbit Charge 6 / Google Health

Likely integration paths:

- Fitbit Web API for backend/script ingestion.
- Android Health Connect API for a future mobile APK.

Useful data:

- Steps.
- Calories.
- Active minutes.
- Heart rate.
- Heart rate zones.
- Sleep duration.
- Sleep stages.
- Resting heart rate.
- Recovery-related signals when available.

### Body Weight

Current state:

- Manual input during pipeline execution.

Future:

- Smart scale integration.
- Manual mobile input.
- Better weekly trend analysis.

### Nutrition

Future only.

Useful data:

- Calories.
- Protein.
- Carbohydrates.
- Fat.
- Meal timing.

## Storage Strategy

Google Sheets is the MVP database.

Benefits:

- Easy to inspect.
- Simple to edit manually.
- Fast to prototype.
- Good enough for one or two personal users.

Risks:

- Can become slow with high-frequency intraday data.
- Harder to enforce uniqueness and schemas.
- Not ideal for sensitive credentials or passwords.

Future migration option:

- Supabase or PostgreSQL if the app grows beyond the MVP.

## Proposed Google Sheets Tables

Current tables:

- `users`
- `workouts`
- `body_weight`
- `daily_summary`
- `prs`
- `weekly_volume`
- `exercise_summary`

Recommended future tables:

- `daily_activity`
- `sleep`
- `heart_rate_daily`
- `heart_rate_zones`
- `recovery_metrics`
- `ai_insights`
- `sync_log`

Recommended common columns:

- `user_id`
- `source`
- `date`
- `created_at`
- `updated_at`

For source-specific records, also consider:

- `external_id`
- `sync_batch_id`

These fields will help prevent duplicate uploads.

## AI Assistant Direction

The AI layer should not only rewrite scripted summaries. It should receive structured metrics and produce contextual insight.

Possible outputs:

- Daily wellness summary.
- Weekly training review.
- Weight trend explanation.
- Sleep and recovery warning.
- Consistency score.
- Suggestions for the next training block.

Important design rule:

- Calculate objective metrics with Python first.
- Give the AI clean facts, trends and context.
- Ask the AI to explain and recommend, not to invent numbers.

Example input to the AI:

```text
User: brandon
Week: 2026-W24
Training volume: 52400 kg
Previous week volume: 48800 kg
Weight trend: -0.4 kg
Average sleep: 6.2 h
Resting heart rate trend: +4 bpm
```

Example output:

```text
This was a productive week: volume increased while body weight moved slightly down. The only caution is recovery, because sleep averaged 6.2 hours and resting heart rate rose. Keep training, but avoid adding too much extra intensity next week.
```

## Suggested Code Architecture

```text
src/
  api/
    hevy_client.py
    fitbit_client.py
    health_connect_client.py

  etl/
    sync_hevy.py
    sync_fitbit.py
    add_weight.py

  storage/
    sheets_client.py
    repositories.py

  analysis/
    training_analysis.py
    wellness_metrics.py

  ai/
    wellness_agent.py
    prompts.py

  pipeline/
    run_pipeline.py
```

## Roadmap

### Phase 1 - Stabilize Current MVP

- Fix README and project documentation.
- Add missing `openai` dependency or make AI optional more cleanly.
- Prevent duplicate uploads.
- Improve error handling around CSV parsing.
- Keep Google Sheets schema consistent.
- Add basic tests for transformation functions.

### Phase 2 - Better Analysis

- Move metric calculations into `src/analysis`.
- Add weekly weight trend.
- Add training consistency metrics.
- Add PR detection improvements.
- Add structured summary objects before AI generation.

### Phase 3 - AI Wellness Agent

- Create `src/ai/wellness_agent.py`.
- Create reusable prompts.
- Store AI outputs in `ai_insights`.
- Add daily and weekly report modes.

### Phase 4 - Fitbit / Google Health Data

- Decide first integration path:
  - Fitbit Web API for Python-first ingestion.
  - Health Connect for Android-first ingestion.
- Add activity, sleep and heart rate tables.
- Add sync logs.

### Phase 5 - Mobile App

- Build a small mobile interface.
- Request health permissions.
- Sync Health Connect data.
- Show latest insights.
- Keep Google Sheets as backend initially or introduce an API layer.

## Current Technical Risks

- Passwords are stored in plain text in Google Sheets.
- Most uploads append rows without uniqueness checks.
- `hevy_client.py` is empty despite README mentioning API ingestion.
- `training_analysis.py` is empty.
- `openai` is imported but not listed in `requirements.txt`.
- Some text has encoding artifacts from earlier edits.
- Google Sheets may become limiting for high-frequency data such as intraday heart rate.

## Working Principles

- Keep changes small and understandable.
- Prefer modular Python over complex abstractions.
- Keep every user-specific record tied to `user_id`.
- Treat Google Sheets as the MVP database, not the permanent limit.
- Compute facts in code, let AI explain them.
- Avoid breaking the current CSV pipeline while adding new capabilities.
