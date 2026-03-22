import gspread
from oauth2client.service_account import ServiceAccountCredentials


SHEET_HEADERS = {
    "workouts": ["user_id", "workout", "date", "exercise", "reps", "weight", "volume"],
    "body_weight": ["user_id", "date", "weight"],
    "daily_summary": ["user_id", "date", "summary_text"],
    "prs": ["user_id", "exercise", "pr_weight", "date"],
    "weekly_volume": ["user_id", "week", "total_volume", "total_sets"],
    "exercise_summary": ["user_id", "exercise", "total_sets", "max_weight", "total_volume"],
    "users": ["username", "password", "csv_path"],
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
    header_row = sheet.row_values(1)

    if not header_row:
        sheet.update("A1", [expected_headers])
        return

    if header_row[0] != "user_id":
        sheet.insert_cols([["user_id"]], col=1)
        header_row = sheet.row_values(1)

    if len(header_row) < len(expected_headers):
        padded_headers = header_row + expected_headers[len(header_row):]
        sheet.update("A1", [padded_headers])


def get_prepared_worksheet(spreadsheet_name, worksheet_name):
    client = get_gspread_client()
    sheet = client.open(spreadsheet_name).worksheet(worksheet_name)
    expected_headers = SHEET_HEADERS.get(worksheet_name)

    if expected_headers:
        ensure_sheet_headers(sheet, expected_headers)

    return sheet


def get_or_create_prepared_worksheet(spreadsheet_name, worksheet_name, rows=1000, cols=26):
    client = get_gspread_client()
    spreadsheet = client.open(spreadsheet_name)

    try:
        sheet = spreadsheet.worksheet(worksheet_name)
    except gspread.WorksheetNotFound:
        sheet = spreadsheet.add_worksheet(title=worksheet_name, rows=rows, cols=cols)

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
                sheet.update("A1", [padded_headers])
        else:
            ensure_sheet_headers(sheet, expected_headers)

    return sheet
