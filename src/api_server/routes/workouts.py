from fastapi import APIRouter, Depends
from src.api_server.deps import get_current_user
from src.storage.repositories import SPREADSHEET_NAME
from src.storage.sheets_client import get_or_create_prepared_worksheet, get_all_records_retried

router = APIRouter(prefix="/workouts", tags=["workouts"])


@router.get("")
def get_workouts(username: str = Depends(get_current_user)):
    sheet = get_or_create_prepared_worksheet(SPREADSHEET_NAME, "workouts")
    records = get_all_records_retried(sheet)
    return [r for r in records if str(r.get("user_id")) == str(username)]


@router.get("/summary")
def get_exercise_summary(username: str = Depends(get_current_user)):
    sheet = get_or_create_prepared_worksheet(SPREADSHEET_NAME, "exercise_summary")
    records = get_all_records_retried(sheet)
    return [r for r in records if str(r.get("user_id")) == str(username)]


@router.get("/prs")
def get_prs(username: str = Depends(get_current_user)):
    sheet = get_or_create_prepared_worksheet(SPREADSHEET_NAME, "prs")
    records = get_all_records_retried(sheet)
    return [r for r in records if str(r.get("user_id")) == str(username)]


@router.get("/weekly-volume")
def get_weekly_volume(username: str = Depends(get_current_user)):
    sheet = get_or_create_prepared_worksheet(SPREADSHEET_NAME, "weekly_volume")
    records = get_all_records_retried(sheet)
    return [r for r in records if str(r.get("user_id")) == str(username)]
