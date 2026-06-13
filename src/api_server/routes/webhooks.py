"""Webhook endpoints for third-party integrations."""
import logging
import os
from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
logger = logging.getLogger(__name__)


class HevyWebhookPayload(BaseModel):
    workoutId: str


def _resolve_user_from_token(token: str | None) -> str | None:
    """
    Map the Bearer token Hevy sends to a username.
    Format: 'Bearer <username>:<secret>' or just the HEVY_WEBHOOK_SECRET for single-user.
    """
    if not token:
        return None
    raw = token.removeprefix("Bearer ").strip()
    # Format: "username:secret" → multi-user
    if ":" in raw:
        username, secret = raw.split(":", 1)
        expected = os.getenv("HEVY_WEBHOOK_SECRET", "")
        if expected and secret != expected:
            return None
        return username.strip() or None
    # Single-user: token must match HEVY_WEBHOOK_SECRET
    expected = os.getenv("HEVY_WEBHOOK_SECRET", "")
    if expected and raw == expected:
        return os.getenv("HEVY_DEFAULT_USER", "brandon")
    return None


@router.post("/hevy", status_code=200)
async def hevy_webhook(
    payload: HevyWebhookPayload,
    background_tasks: BackgroundTasks,
    authorization: str | None = Header(default=None),
):
    """
    Hevy webhook — fires when a workout is completed.

    Configure in Hevy app (Developer settings):
      URL:  https://<your-public-url>/webhooks/hevy
      Auth: Bearer brandon:<HEVY_WEBHOOK_SECRET>

    Or single-user:
      Auth: Bearer <HEVY_WEBHOOK_SECRET>
      (also set HEVY_DEFAULT_USER=brandon in .env)

    Responds 200 immediately; sync runs in the background.
    """
    from src.etl.hevy_api_sync import sync_all_hevy
    from src.storage.user_auth import get_user_hevy_api_key

    username = _resolve_user_from_token(authorization)
    if not username:
        # If no secret configured, allow all (dev mode)
        if not os.getenv("HEVY_WEBHOOK_SECRET"):
            username = os.getenv("HEVY_DEFAULT_USER", "brandon")
            logger.warning("[webhook/hevy] No secret set — dev mode, using user='%s'", username)
        else:
            raise HTTPException(status_code=401, detail="Invalid or missing Authorization header")

    api_key = get_user_hevy_api_key(username) or os.getenv("HEVY_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=400, detail=f"No Hevy API key for user '{username}'")

    logger.info("[webhook/hevy] workout=%s user=%s → queuing sync", payload.workoutId, username)
    background_tasks.add_task(sync_all_hevy, user_id=username, api_key=api_key)

    return {"status": "ok", "workoutId": payload.workoutId, "user": username}
