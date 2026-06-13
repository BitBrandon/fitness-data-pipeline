"""Webhook endpoints for third-party integrations."""
import logging
import os
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
logger = logging.getLogger(__name__)


class HevyWebhookPayload(BaseModel):
    workoutId: str


@router.post("/hevy", status_code=202)
async def hevy_webhook(
    payload: HevyWebhookPayload,
    background_tasks: BackgroundTasks,
    username: str = Query(..., description="Username to sync for"),
):
    """
    Hevy webhook — fires when a workout is completed.
    Configure the webhook URL in the Hevy app as:
        POST http://<your-server>:8001/webhooks/hevy?username=<your_username>

    Returns 202 immediately; the sync runs in the background.
    """
    from src.etl.hevy_api_sync import sync_all_hevy
    from src.storage.user_auth import get_user_hevy_api_key

    api_key = get_user_hevy_api_key(username) or os.getenv("HEVY_API_KEY", "")
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail=f"No Hevy API key configured for user '{username}'. "
                   "Set HEVY_API_KEY in .env or add hevy_api_key to the user record.",
        )

    logger.info("[webhook/hevy] workout=%s user=%s → queuing sync", payload.workoutId, username)
    background_tasks.add_task(sync_all_hevy, user_id=username, api_key=api_key)

    return {"status": "accepted", "workoutId": payload.workoutId, "user": username}
