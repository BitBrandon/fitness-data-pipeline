import gspread
from oauth2client.service_account import ServiceAccountCredentials
from datetime import datetime


def add_weight(weight):

    date = datetime.now().strftime("%Y-%m-%d")

    new_row = [date, weight]

    scope = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive"
    ]

    creds = ServiceAccountCredentials.from_json_keyfile_name(
        "credentials.json",
        scope
    )

    client = gspread.authorize(creds)

    sheet = client.open("fitness_data").worksheet("body_weight")

    sheet.append_row(new_row)

    print(f"Added weight: {weight} kg on {date}")


if __name__ == "__main__":
    add_weight(116)