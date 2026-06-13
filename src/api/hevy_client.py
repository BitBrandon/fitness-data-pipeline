"""HTTP client for the Hevy API v1."""
import os
import logging
import requests

HEVY_BASE = "https://api.hevyapp.com/v1"
logger = logging.getLogger(__name__)


def _headers(api_key: str) -> dict:
    return {"api-key": api_key, "accept": "application/json"}


def fetch_workout(workout_id: str, api_key: str | None = None) -> dict:
    """Fetch a single workout by ID. Returns the workout dict."""
    key = api_key or os.environ.get("HEVY_API_KEY", "")
    if not key:
        raise ValueError("HEVY_API_KEY not configured")
    r = requests.get(
        f"{HEVY_BASE}/workouts/{workout_id}",
        headers=_headers(key),
        timeout=15,
    )
    r.raise_for_status()
    # Single-workout endpoint returns the workout object directly (no wrapper key)
    data = r.json()
    return data.get("workout", data)


def fetch_all_workouts(api_key: str | None = None, page_size: int = 10) -> list[dict]:
    """Fetch all workouts via pagination. Returns list of workout dicts."""
    key = api_key or os.environ.get("HEVY_API_KEY", "")
    if not key:
        raise ValueError("HEVY_API_KEY not configured")

    workouts: list[dict] = []
    page = 1
    while True:
        r = requests.get(
            f"{HEVY_BASE}/workouts",
            params={"page": page, "pageSize": page_size},
            headers=_headers(key),
            timeout=15,
        )
        r.raise_for_status()
        data = r.json()
        batch = data.get("workouts", [])
        workouts.extend(batch)
        page_count = data.get("page_count", 1)
        logger.debug("[hevy] Fetched page %d/%d (%d workouts)", page, page_count, len(batch))
        if page >= page_count:
            break
        page += 1

    return workouts
