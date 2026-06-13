import time
import logging
import functools
import gspread
from oauth2client.service_account import ServiceAccountCredentials

logger = logging.getLogger(__name__)

_RETRY_STATUSES = {429, 500, 502, 503, 504}
_MAX_RETRIES = 7
_BASE_DELAY  = 3.0  # seconds


def _with_retry(fn, *args, **kwargs):
    """Call fn(*args, **kwargs), retrying on transient Google API errors."""
    for attempt in range(_MAX_RETRIES):
        try:
            return fn(*args, **kwargs)
        except gspread.exceptions.APIError as e:
            code = e.response.status_code if hasattr(e, "response") else 0
            if code not in _RETRY_STATUSES or attempt == _MAX_RETRIES - 1:
                raise
            delay = min(_BASE_DELAY * (2 ** attempt), 60.0)  # cap at 60s
            logger.warning("Google Sheets API %s — reintentando en %.0fs (intento %d/%d)",
                           code, delay, attempt + 1, _MAX_RETRIES)
            time.sleep(delay)


def retried(fn):
    """Decorator: wrap every call to fn with _with_retry."""
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        return _with_retry(fn, *args, **kwargs)
    return wrapper


def get_all_records_retried(sheet) -> list[dict]:
    """get_all_records() with automatic retry on transient errors."""
    return _with_retry(lambda: sheet.get_all_records())


SHEET_HEADERS = {
    "workouts": ["user_id", "workout", "date", "exercise", "set_index", "reps", "weight", "volume"],
    "body_weight": ["user_id", "date", "weight"],
    "daily_summary": ["user_id", "date", "summary_text"],
    "prs": ["user_id", "exercise", "pr_weight", "date"],
    "weekly_volume": ["user_id", "week", "total_volume", "total_sets"],
    "exercise_summary": ["user_id", "exercise", "total_sets", "max_weight", "total_volume"],
    "users": ["username", "password", "csv_path", "hevy_api_key"],
    # Google Fit
    "daily_activity": ["user_id", "date", "steps", "calories", "active_minutes"],
    "heart_rate_daily": ["user_id", "date", "hr_avg", "hr_max", "hr_min"],
    "sleep": ["user_id", "date", "duration_hours", "deep_min", "light_min", "rem_min", "awake_min"],
}


def get_gspread_client():

    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive"
    ]

    creds = ServiceAccountCredentials.from_json_keyfile_name(
        "credentials.json",
        scope
    )

    client = gspread.authorize(creds)

    return client
def ensure_sheet_headers(sheet, expected_headers):
    header_row = _with_retry(lambda: sheet.row_values(1))

    if not header_row:
        sheet.update("A1", [expected_headers])
        return

    if header_row[0] != "user_id":
        sheet.insert_cols([["user_id"]], col=1)
        header_row = sheet.row_values(1)

    for index, expected_header in enumerate(expected_headers):
        if index >= len(header_row):
            sheet.insert_cols([[expected_header]], col=index + 1)
            header_row = sheet.row_values(1)
            continue

        if header_row[index] == expected_header:
            continue

        if expected_header not in header_row:
            sheet.insert_cols([[expected_header]], col=index + 1)
            header_row = sheet.row_values(1)


def get_prepared_worksheet(spreadsheet_name, worksheet_name):
    client = get_gspread_client()
    sheet = _with_retry(lambda: client.open(spreadsheet_name).worksheet(worksheet_name))
    expected_headers = SHEET_HEADERS.get(worksheet_name)

    if expected_headers:
        ensure_sheet_headers(sheet, expected_headers)

    return sheet


def get_or_create_prepared_worksheet(spreadsheet_name, worksheet_name, rows=1000, cols=26):
    client = get_gspread_client()
    spreadsheet = _with_retry(lambda: client.open(spreadsheet_name))

    try:
        sheet = _with_retry(lambda: spreadsheet.worksheet(worksheet_name))
    except gspread.WorksheetNotFound:
        sheet = _with_retry(lambda: spreadsheet.add_worksheet(title=worksheet_name, rows=rows, cols=cols))

    expected_headers = SHEET_HEADERS.get(worksheet_name)

    if expected_headers:
        if worksheet_name == "users":
            header_row = sheet.row_values(1)

            if not header_row:
                sheet.update("A1", [expected_headers])
            elif header_row != expected_headers:
                padded_headers = header_row[:]

                while len(padded_headers) < len(expected_headers):
                    padded_headers.append(expected_headers[len(padded_headers)])

                padded_headers[0] = "username"
                padded_headers[1] = "password"
                padded_headers[2] = "csv_path"
                if len(padded_headers) > 3:
                    padded_headers[3] = "hevy_api_key"
                sheet.update("A1", [padded_headers])
        else:
            ensure_sheet_headers(sheet, expected_headers)

    return sheet
