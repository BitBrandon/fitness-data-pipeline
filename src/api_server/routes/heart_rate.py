from fastapi import APIRouter, Depends
from src.api_server.deps import get_current_user
from src.storage.repositories import SPREADSHEET_NAME
from src.storage.sheets_client import get_or_create_prepared_worksheet, get_all_records_retried

router = APIRouter(prefix="/heart-rate", tags=["heart_rate"])


@router.get("")
def get_heart_rate(username: str = Depends(get_current_user)):
    sheet = get_or_create_prepared_worksheet(SPREADSHEET_NAME, "heart_rate_daily")
    records = get_all_records_retried(sheet)
    return [r for r in records if str(r.get("user_id")) == str(username)]
