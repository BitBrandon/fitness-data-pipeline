from fastapi import APIRouter, Depends
from src.api_server.deps import get_current_user
from src.storage.repositories import SPREADSHEET_NAME
from src.storage.sheets_client import get_or_create_prepared_worksheet, get_all_records_retried

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("")
def get_activity(days: int = 30, username: str = Depends(get_current_user)):
    sheet = get_or_create_prepared_worksheet(SPREADSHEET_NAME, "daily_activity")
    records = get_all_records_retried(sheet)
    return [r for r in records if str(r.get("user_id")) == str(username)]
