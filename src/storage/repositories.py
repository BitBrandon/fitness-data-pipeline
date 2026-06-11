"""Repository helpers for Google Sheets-backed tables."""

from src.storage.sheets_client import SHEET_HEADERS, get_or_create_prepared_worksheet


SPREADSHEET_NAME = "fitness_data"


def normalize_key_value(value):
    if value is None:
        return ""

    if isinstance(value, float) and value.is_integer():
        return str(int(value))

    return str(value).strip()


def build_record_key(record, key_columns):
    return tuple(normalize_key_value(record.get(column)) for column in key_columns)


def with_user_id(df, user_id):
    df = df.copy()

    if "user_id" in df.columns:
        df["user_id"] = user_id
    else:
        df.insert(0, "user_id", user_id)

    return df


def order_columns_for_sheet(worksheet_name, df):
    expected_headers = SHEET_HEADERS.get(worksheet_name)

    if not expected_headers:
        return df

    return df.reindex(columns=expected_headers)


def append_new_dataframe(worksheet_name, df, user_id, key_columns, legacy_key_columns=None):
    """Append only rows whose key is not already present in the worksheet."""
    if df.empty:
        return 0

    sheet = get_or_create_prepared_worksheet(SPREADSHEET_NAME, worksheet_name)
    df = with_user_id(df, user_id)
    df = order_columns_for_sheet(worksheet_name, df)
    df = df.fillna("")

    existing_records = sheet.get_all_records()
    existing_keys = {
        build_record_key(record, key_columns)
        for record in existing_records
    }
    existing_legacy_keys = set()

    if legacy_key_columns:
        existing_legacy_keys = {
            build_record_key(record, legacy_key_columns)
            for record in existing_records
        }

    new_rows = []
    seen_new_keys = set()

    for record in df.to_dict("records"):
        key = build_record_key(record, key_columns)
        legacy_key = (
            build_record_key(record, legacy_key_columns)
            if legacy_key_columns
            else None
        )

        if key in existing_keys or key in seen_new_keys:
            continue

        if legacy_key and legacy_key in existing_legacy_keys:
            continue

        new_rows.append([record.get(column, "") for column in df.columns])
        seen_new_keys.add(key)

    if new_rows:
        sheet.append_rows(new_rows)

    return len(new_rows)
