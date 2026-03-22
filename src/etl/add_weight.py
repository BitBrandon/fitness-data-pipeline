from datetime import datetime
from src.storage.sheets_client import get_prepared_worksheet


def add_weight(weight, user_id):

    date = datetime.now().strftime("%Y-%m-%d")

    new_row = [user_id, date, weight]
    sheet = get_prepared_worksheet("fitness_data", "body_weight")

    sheet.append_row(new_row)

    print(f"Added weight: {weight} kg on {date} for {user_id}")


if __name__ == "__main__":
    add_weight(116, "default")
