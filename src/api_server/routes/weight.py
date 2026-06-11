from fastapi import APIRouter, Depends
from pydantic import BaseModel
from src.api_server.deps import get_current_user
from src.etl.add_weight import add_weight
from src.storage.repositories import SPREADSHEET_NAME
from src.storage.sheets_client import get_or_create_prepared_worksheet, get_all_records_retried

router = APIRouter(prefix="/weight", tags=["weight"])


class WeightInput(BaseModel):
    weight: float


@router.get("")
def get_weight(username: str = Depends(get_current_user)):
    sheet = get_or_create_prepared_worksheet(SPREADSHEET_NAME, "body_weight")
    records = get_all_records_retried(sheet)
    return [r for r in records if str(r.get("user_id")) == str(username)]


@router.post("")
def log_weight(body: WeightInput, username: str = Depends(get_current_user)):
    add_weight(body.weight, username)
    return {"message": f"Peso {body.weight} kg registrado"}
