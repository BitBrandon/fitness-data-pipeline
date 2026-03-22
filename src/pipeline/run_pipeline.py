from datetime import datetime

from src.etl.sync_hevy import main as sync_hevy_main
from src.etl.add_weight import add_weight
from src.storage.sheets_client import get_prepared_worksheet
from src.storage.user_auth import authenticate_user, get_or_prompt_csv_path


def weight_already_logged(user_id):
    sheet = get_prepared_worksheet("fitness_data", "body_weight")

    records = sheet.get_all_records()

    if not records:
        return False

    today = datetime.now().strftime("%Y-%m-%d")

    for last_entry in reversed(records):
        if str(last_entry.get("user_id")) != user_id:
            continue

        last_date = str(last_entry.get("date"))
        return last_date == today

    return False


def run():

    print("---- FITNESS PIPELINE ----")
    user_id = authenticate_user()

    if user_id is None:
        print("Authentication cancelled. Exiting pipeline.")
        return

    csv_path = get_or_prompt_csv_path(user_id)

    try:
        if not weight_already_logged(user_id):

            weight = input("Enter your weight (kg): ")

            try:
                weight = float(weight)
                add_weight(weight, user_id)
                print(f"Weight {weight} kg added")
            except:
                print("Invalid weight, skipping...")

        else:
            print("Weight already logged today")

    except Exception as e:
        print(f"Error checking weight: {e}")
        print("Continuing without weight...")

    print("\nRunning training sync...\n")

    sync_hevy_main(user_id, csv_path)

    print("\nPipeline finished")


if __name__ == "__main__":
    run()
