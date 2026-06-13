"""Debug endpoints — diagnostics and data repair for the current user."""
import os
import time
import logging
from fastapi import APIRouter, Depends
from src.api_server.deps import get_current_user
from src.storage.repositories import SPREADSHEET_NAME
from src.storage.sheets_client import (
    get_or_create_prepared_worksheet, get_all_records_retried,
    get_gspread_client, SHEET_HEADERS
)

router = APIRouter(prefix="/debug", tags=["debug"])
logger = logging.getLogger(__name__)

TABLES = {
    "daily_activity":   ["steps", "calories", "active_minutes"],
    "heart_rate_daily": ["hr_avg", "hr_max", "hr_min"],
    "sleep":            ["duration_hours", "deep_min", "rem_min"],
    "body_weight":      ["weight"],
    "workouts":         ["exercise", "weight", "volume"],
}

# Sanity bounds for detecting corrupt data in sheets
_BOUNDS = {
    "daily_activity":   {"calories": (0, 8_000)},
    "heart_rate_daily": {"hr_avg": (20, 250), "hr_max": (20, 300), "hr_min": (10, 250)},
    "sleep":            {"duration_hours": (0, 20)},
}


def _is_corrupt(table: str, row: dict) -> list[str]:
    """Return list of field names that are outside sane bounds."""
    issues = []
    bounds = _BOUNDS.get(table, {})
    for field, (lo, hi) in bounds.items():
        val = row.get(field)
        if val is None or val == "":
            continue
        try:
            v = float(val)
            if v < lo or v > hi:
                issues.append(f"{field}={v} (expected {lo}–{hi})")
        except (ValueError, TypeError):
            pass
    return issues


def _quick_read(sheet) -> list[dict]:
    """Read sheet with max 2 retries and short delays — for debug only, fails fast on 429."""
    import gspread
    for attempt in range(3):
        try:
            return sheet.get_all_records()
        except gspread.exceptions.APIError as e:
            code = e.response.status_code if hasattr(e, "response") else 0
            if code == 429 and attempt < 2:
                time.sleep(4 * (attempt + 1))  # 4s, 8s — then give up
                continue
            raise
    return []


@router.get("/counts")
def data_counts(username: str = Depends(get_current_user)):
    """Row counts + last entry + corruption check. Fails fast on quota errors."""
    import gspread
    result = {}

    try:
        client = get_gspread_client()
        spreadsheet = client.open(SPREADSHEET_NAME)
    except Exception as e:
        return {"username": username, "tables": {}, "error": f"No se pudo abrir el spreadsheet: {e}"}

    for i, (table, sample_fields) in enumerate(TABLES.items()):
        if i > 0:
            time.sleep(0.5)
        try:
            try:
                sheet = spreadsheet.worksheet(table)
            except gspread.WorksheetNotFound:
                result[table] = {"count": 0, "last": None, "corrupt_rows": 0, "corrupt_examples": []}
                continue

            records = _quick_read(sheet)
            user_rows = [r for r in records if str(r.get("user_id")) == str(username)]

            last = None
            corrupt_count = 0
            corrupt_examples = []

            if user_rows:
                date_key = "week" if "week" in (user_rows[0] or {}) else "date"
                sorted_rows = sorted(user_rows, key=lambda r: str(r.get(date_key, "")), reverse=True)
                last_row = sorted_rows[0]
                last = {k: last_row.get(k) for k in ["date", "week"] + sample_fields if k in last_row}

                for row in user_rows:
                    issues = _is_corrupt(table, row)
                    if issues:
                        corrupt_count += 1
                        if len(corrupt_examples) < 3:
                            corrupt_examples.append({"date": row.get("date"), "issues": issues})

            result[table] = {
                "count": len(user_rows),
                "last": last,
                "corrupt_rows": corrupt_count,
                "corrupt_examples": corrupt_examples,
            }
        except Exception as e:
            result[table] = {"count": -1, "error": str(e)}
    return {"username": username, "tables": result}


@router.get("/sample/{table}")
def sample_rows(table: str, n: int = 5, username: str = Depends(get_current_user)):
    """Return the N most recent rows from a table for the current user."""
    if table not in TABLES:
        return {"error": f"unknown table '{table}'. Valid: {list(TABLES.keys())}"}
    try:
        sheet = get_or_create_prepared_worksheet(SPREADSHEET_NAME, table)
        records = get_all_records_retried(sheet)
        user_rows = [r for r in records if str(r.get("user_id")) == str(username)]
        date_key = "week" if user_rows and "week" in user_rows[0] else "date"
        sorted_rows = sorted(user_rows, key=lambda r: str(r.get(date_key, "")), reverse=True)
        return {"table": table, "rows": sorted_rows[:n]}
    except Exception as e:
        return {"error": str(e)}


@router.delete("/purge/{table}")
def purge_corrupt_rows(table: str, username: str = Depends(get_current_user)):
    """Delete rows with out-of-bounds values for the current user from a table."""
    if table not in _BOUNDS:
        return {"error": f"no bounds defined for '{table}' — cannot auto-purge"}
    try:
        sheet = get_or_create_prepared_worksheet(SPREADSHEET_NAME, table)
        records = sheet.get_all_records()

        deleted = 0
        # Iterate in reverse so row indices stay valid as we delete
        for i in range(len(records) - 1, -1, -1):
            row = records[i]
            if str(row.get("user_id")) != str(username):
                continue
            issues = _is_corrupt(table, row)
            if issues:
                sheet.delete_rows(i + 2)  # +1 for header, +1 for 1-based index
                deleted += 1
                logger.info("[purge] deleted row %d from %s: %s", i + 2, table, issues)

        return {"table": table, "deleted": deleted, "message": f"Eliminadas {deleted} filas con datos corruptos"}
    except Exception as e:
        logger.error("[purge] error: %s", e)
        return {"error": str(e)}


_LOG_FILE = os.path.join(os.getcwd(), "logs", "app.log")


@router.get("/logs")
def get_log_entries(n: int = 200, username: str = Depends(get_current_user)):
    """Return the last N lines from the rotating log file."""
    path = os.path.abspath(_LOG_FILE)
    if not os.path.exists(path):
        return {"logs": [], "note": f"Log file not found at {path}"}
    with open(path, encoding="utf-8", errors="replace") as f:
        lines = f.readlines()
    recent = [l.rstrip() for l in lines[-n:] if l.strip()]
    return {"logs": recent}


@router.delete("/pr")
def delete_pr(exercise: str, username: str = Depends(get_current_user)):
    """Delete all PR rows for a given exercise for the current user."""
    try:
        sheet = get_or_create_prepared_worksheet(SPREADSHEET_NAME, "prs")
        records = sheet.get_all_records()
        deleted = 0
        for i in range(len(records) - 1, -1, -1):
            row = records[i]
            if str(row.get("user_id")) == str(username) and exercise.lower() in str(row.get("exercise", "")).lower():
                sheet.delete_rows(i + 2)
                deleted += 1
                logger.info("[debug] deleted PR row %d for exercise '%s'", i + 2, row.get("exercise"))
        return {"deleted": deleted, "message": f"Eliminados {deleted} PR(s) de '{exercise}'"}
    except Exception as e:
        logger.error("[debug] delete_pr error: %s", e)
        return {"error": str(e)}


@router.get("/token-status")
def token_status(username: str = Depends(get_current_user)):
    """Check whether the Google Fit token file exists and if it looks valid."""
    token_file = "token_google_fit.json"
    exists = os.path.exists(token_file)
    info: dict = {"file_exists": exists}
    if exists:
        try:
            import json
            with open(token_file) as f:
                data = json.load(f)
            info["has_token"] = bool(data.get("token"))
            info["has_refresh"] = bool(data.get("refresh_token"))
            info["expiry"] = data.get("expiry", "unknown")
            info["scopes"] = data.get("scopes", [])
        except Exception as e:
            info["parse_error"] = str(e)
    return info
