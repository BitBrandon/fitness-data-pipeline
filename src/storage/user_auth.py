from src.storage.sheets_client import get_or_create_prepared_worksheet


SPREADSHEET_NAME = "fitness_data"
USERS_WORKSHEET = "users"


def normalize_username(username):
    return str(username).strip().lower()


def get_users_worksheet():
    return get_or_create_prepared_worksheet(SPREADSHEET_NAME, USERS_WORKSHEET)


def get_users():
    sheet = get_users_worksheet()
    return sheet.get_all_records()


def get_user_record(username):
    normalized_username = normalize_username(username)

    for record in get_users():
        if normalize_username(record.get("username")) == normalized_username:
            return record

    return None


def get_user_row(username):
    normalized_username = normalize_username(username)
    records = get_users()

    for index, record in enumerate(records, start=2):
        if normalize_username(record.get("username")) == normalized_username:
            return index

    return None


def user_exists(username):
    return get_user_record(username) is not None


def create_user(username, password):
    normalized_username = normalize_username(username)
    password = str(password)

    if not normalized_username:
        raise ValueError("Username cannot be empty")

    if user_exists(normalized_username):
        return False

    sheet = get_users_worksheet()
    sheet.append_row([normalized_username, password, ""])
    return True


def validate_user_password(username, password):
    record = get_user_record(username)
    password = str(password)

    if not record:
        return False

    return str(record.get("password")) == password


def get_user_csv_path(username):
    record = get_user_record(username)

    if not record:
        return None

    csv_path = str(record.get("csv_path") or "").strip()
    return csv_path or None


def set_user_csv_path(username, csv_path):
    row_number = get_user_row(username)

    if row_number is None:
        return False

    sheet = get_users_worksheet()
    normalized_path = str(csv_path).strip()
    sheet.update_cell(row_number, 3, normalized_path)
    return True


def get_or_prompt_csv_path(username):
    csv_path = get_user_csv_path(username)

    if csv_path:
        return csv_path

    while True:
        csv_path = str(input("Path to your CSV file: ")).strip()

        if not csv_path:
            print("CSV path cannot be empty.")
            continue

        set_user_csv_path(username, csv_path)
        return csv_path


def authenticate_user():
    while True:
        username = normalize_username(input("Username: "))

        if not username:
            print("Username cannot be empty.")
            continue

        if user_exists(username):
            while True:
                password = input("Password: ")

                if validate_user_password(username, password):
                    return username

                print("Incorrect password. Try again.")

        create_choice = input("User does not exist. Create it? (y/n): ").strip().lower()

        if create_choice == "y":
            password = input("Choose a password: ")
            create_user(username, password)
            return username

        if create_choice == "n":
            retry_choice = input("Try again? (y/n): ").strip().lower()

            if retry_choice == "n":
                return None
