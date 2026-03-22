# Fitness Data Pipeline - Agent Context

## Project Overview
This is a personal fitness data pipeline that:

- Ingests workout data from Hevy (CSV)
- Processes it using Python (ETL)
- Stores results in Google Sheets
- Tracks:
  - workouts
  - weekly volume
  - exercise summary
  - PRs (personal records)
  - body weight
- Generates summaries of training performance

## Architecture

- src/etl → data processing scripts
- src/pipeline → orchestration (run_pipeline.py)
- Google Sheets → acts as the database

## Key Files

- sync_hevy.py → main ETL
- add_weight.py → manual weight input
- run_pipeline.py → orchestrates full pipeline

## Rules

- Do NOT break existing pipeline functionality
- Prefer simple and readable Python
- Keep functions modular
- Avoid overengineering
- Always explain changes before applying them

## Future Goals

- Improve analytics
- Add AI-generated summaries
- Automate execution
- Improve dashboard

## Style

- Use snake_case
- Keep functions small
- Avoid unnecessary abstractions