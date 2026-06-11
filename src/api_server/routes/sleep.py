from fastapi import APIRouter, Depends
from src.api_server.deps import get_current_user
from src.storage.repositories import SPREADSHEET_NAME
from src.storage.sheets_client import get_or_create_prepared_worksheet, get_all_records_retried

router = APIRouter(prefix="/sleep", tags=["sleep"])


def _normalize_sleep(r: dict) -> dict:
    """Legacy rows stored duration_hours in minutes — fix transparently."""
    hours = r.get("duration_hours", 0)
    try:
        hours = float(hours)
    except (ValueError, TypeError):
        hours = 0.0
    if hours > 24:
        r["duration_hours"] = round(hours / 60, 2)
    return r


@router.get("")
def get_sleep(username: str = Depends(get_current_user)):
    sheet = get_or_create_prepared_worksheet(SPREADSHEET_NAME, "sleep")
    records = get_all_records_retried(sheet)
    user_rows = [r for r in records if str(r.get("user_id")) == str(username)]
    return [_normalize_sleep(r) for r in user_rows]
