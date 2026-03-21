from datetime import datetime
from src.storage.sheets_client import get_gspread_client


def add_weight(weight):

    date = datetime.now().strftime("%Y-%m-%d")

    new_row = [date, weight]

    client = get_gspread_client()

    sheet = client.open("fitness_data").worksheet("body_weight")

    sheet.append_row(new_row)

    print(f"Added weight: {weight} kg on {date}")


if __name__ == "__main__":
    add_weight(116)
