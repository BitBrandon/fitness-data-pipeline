import time
from fastapi import APIRouter, BackgroundTasks, Depends
from src.api_server.deps import get_current_user
from src.storage.user_auth import get_user_csv_path

router = APIRouter(prefix="/sync", tags=["sync"])

# In-memory per-user sync state
_status: dict[str, dict] = {}

STEPS = [
    {"key": "activity",  "label": "Actividad (pasos + calorías)",  "pct": 20},
    {"key": "heartrate", "label": "Frecuencia cardíaca",           "pct": 40},
    {"key": "sleep",     "label": "Sueño",                         "pct": 60},
    {"key": "workouts",  "label": "Entrenos (Hevy)",               "pct": 80},
]


def _set(username: str, **kwargs):
    _status.setdefault(username, {}).update(kwargs)


def _run_sync(username: str, days: int):
    _set(username, state="running", pct=0, step="Iniciando...", error=None, started_at=time.time())

    try:
        from src.api.google_fit_client import fetch_daily_activity, fetch_heart_rate, fetch_sleep
        from src.storage.repositories import append_new_dataframe
        import pandas as pd

        # Activity
        _set(username, pct=10, step="Descargando actividad de Google Health...")
        rows = fetch_daily_activity(days=days)
        if rows:
            append_new_dataframe("daily_activity", pd.DataFrame(rows), username, ["user_id", "date"])
        _set(username, pct=20, step=f"Actividad: {len(rows)} días procesados")

        # Heart rate
        _set(username, pct=30, step="Descargando frecuencia cardíaca...")
        rows = fetch_heart_rate(days=days)
        if rows:
            append_new_dataframe("heart_rate_daily", pd.DataFrame(rows), username, ["user_id", "date"])
        _set(username, pct=40, step=f"Pulso: {len(rows)} días procesados")

        # Sleep
        _set(username, pct=50, step="Descargando sueño...")
        rows = fetch_sleep(days=days)
        if rows:
            append_new_dataframe("sleep", pd.DataFrame(rows), username, ["user_id", "date"])
        _set(username, pct=60, step=f"Sueño: {len(rows)} noches procesadas")

        # Hevy workouts
        csv_path = get_user_csv_path(username)
        if csv_path:
            _set(username, pct=70, step="Sincronizando entrenos (Hevy)...")
            from src.etl.sync_hevy import main as sync_hevy
            sync_hevy(username, csv_path)
            _set(username, pct=85, step="Entrenos actualizados")
        else:
            _set(username, pct=85, step="Hevy: sin CSV configurado, omitido")

        _set(username, pct=100, step="¡Sincronización completada!", state="done")

    except Exception as e:
        _set(username, state="error", error=str(e), step=f"Error: {e}")


@router.post("")
def trigger_sync(
    days: int = 30,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    username: str = Depends(get_current_user),
):
    if _status.get(username, {}).get("state") == "running":
        return {"message": "Ya hay una sincronización en curso"}
    background_tasks.add_task(_run_sync, username, days)
    return {"message": "Sync iniciado"}


@router.get("/status")
def sync_status(username: str = Depends(get_current_user)):
    return _status.get(username, {"state": "idle", "pct": 0, "step": "", "error": None})
