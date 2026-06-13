import time
import logging
from fastapi import APIRouter, BackgroundTasks, Depends
from src.api_server.deps import get_current_user

router = APIRouter(prefix="/sync", tags=["sync"])
logger = logging.getLogger(__name__)

# In-memory per-user sync state
_status: dict[str, dict] = {}


def _set(username: str, **kwargs):
    _status.setdefault(username, {}).update(kwargs)


def _run_sync(username: str, days: int):
    _set(username, state="running", pct=0, step="Iniciando...", error=None,
         started_at=time.time(), details={})

    try:
        from src.api.google_fit_client import fetch_daily_activity, fetch_heart_rate, fetch_sleep
        from src.storage.repositories import append_new_dataframe
        import pandas as pd

        details: dict[str, dict] = {}

        # ── Activity ──────────────────────────────────────────────────────────
        _set(username, pct=10, step="Descargando actividad de Google Health...")
        try:
            rows = fetch_daily_activity(days=days)
            new_count = 0
            if rows:
                new_count = append_new_dataframe(
                    "daily_activity", pd.DataFrame(rows), username, ["user_id", "date"]
                )
            details["activity"] = {"fetched": len(rows), "new": new_count}
            _set(username, pct=20,
                 step=f"Actividad: {len(rows)} días de Google Health, {new_count} nuevos")
        except Exception as e:
            logger.error("[sync:%s] activity error: %s", username, e)
            details["activity"] = {"fetched": 0, "new": 0, "error": str(e)}
            _set(username, pct=20, step=f"Actividad: error — {e}")

        # ── Heart rate ────────────────────────────────────────────────────────
        _set(username, pct=30, step="Descargando frecuencia cardíaca...")
        try:
            rows = fetch_heart_rate(days=days)
            new_count = 0
            if rows:
                new_count = append_new_dataframe(
                    "heart_rate_daily", pd.DataFrame(rows), username, ["user_id", "date"]
                )
            details["heart_rate"] = {"fetched": len(rows), "new": new_count}
            _set(username, pct=40,
                 step=f"Pulso: {len(rows)} días de Google Health, {new_count} nuevos")
        except Exception as e:
            logger.error("[sync:%s] heart_rate error: %s", username, e)
            details["heart_rate"] = {"fetched": 0, "new": 0, "error": str(e)}
            _set(username, pct=40, step=f"Pulso: error — {e}")

        # ── Sleep ─────────────────────────────────────────────────────────────
        _set(username, pct=50, step="Descargando sueño...")
        try:
            rows = fetch_sleep(days=days)
            new_count = 0
            if rows:
                new_count = append_new_dataframe(
                    "sleep", pd.DataFrame(rows), username, ["user_id", "date"]
                )
            details["sleep"] = {"fetched": len(rows), "new": new_count}
            _set(username, pct=60,
                 step=f"Sueño: {len(rows)} noches de Google Health, {new_count} nuevas")
        except Exception as e:
            logger.error("[sync:%s] sleep error: %s", username, e)
            details["sleep"] = {"fetched": 0, "new": 0, "error": str(e)}
            _set(username, pct=60, step=f"Sueño: error — {e}")

        # ── Workouts (Hevy) ───────────────────────────────────────────────────
        # Brief pause to let Sheets quota recover after 3 writes above
        time.sleep(5)
        _set(username, pct=70, step="Sincronizando entrenos (Hevy API)...")
        try:
            from src.etl.hevy_api_sync import sync_all_hevy
            from src.storage.user_auth import get_user_hevy_api_key
            import os as _os
            api_key = get_user_hevy_api_key(username) or _os.getenv("HEVY_API_KEY", "")
            if api_key:
                counts = sync_all_hevy(user_id=username, api_key=api_key)
                new_sets = counts.get("workouts", 0)
                details["workouts"] = {"new": new_sets}
                _set(username, pct=85, step=f"Entrenos: {new_sets} sets nuevos")
            else:
                details["workouts"] = {"skipped": "no api key"}
                _set(username, pct=85, step="Hevy: sin API key configurada, omitido")
        except Exception as e:
            logger.error("[sync:%s] workouts error: %s", username, e)
            details["workouts"] = {"fetched": 0, "new": 0, "error": str(e)}
            _set(username, pct=85, step=f"Entrenos: error — {e}")

        _set(username, pct=100, step="¡Sincronización completada!", state="done",
             details=details)
        logger.info("[sync:%s] done — %s", username, details)

    except Exception as e:
        logger.error("[sync:%s] fatal: %s", username, e)
        _set(username, state="error", error=str(e), step=f"Error crítico: {e}")


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
    return _status.get(username, {"state": "idle", "pct": 0, "step": "", "error": None, "details": {}})
