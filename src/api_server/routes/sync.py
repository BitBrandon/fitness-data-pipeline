from fastapi import APIRouter, BackgroundTasks, Depends
from src.api_server.deps import get_current_user
from src.etl.sync_google_fit import sync_all_google_fit
from src.storage.user_auth import get_user_csv_path

router = APIRouter(prefix="/sync", tags=["sync"])


def _run_sync(username: str, days: int):
    csv_path = get_user_csv_path(username)
    if csv_path:
        from src.etl.sync_hevy import main as sync_hevy
        sync_hevy(username, csv_path)
    sync_all_google_fit(user_id=username, days=days)


@router.post("")
def trigger_sync(
    days: int = 30,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    username: str = Depends(get_current_user),
):
    background_tasks.add_task(_run_sync, username, days)
    return {"message": "Sync iniciado en segundo plano"}
