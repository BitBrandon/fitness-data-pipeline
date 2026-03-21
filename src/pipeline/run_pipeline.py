from datetime import datetime

from src.etl.sync_hevy import main as sync_hevy_main
from src.etl.add_weight import add_weight
from src.storage.sheets_client import get_gspread_client


def weight_already_logged():

    client = get_gspread_client()

    sheet = client.open("fitness_data").worksheet("body_weight")

    records = sheet.get_all_records()

    if not records:
        return False

    last_entry = records[-1]

    last_date = str(last_entry.get("date"))

    today = datetime.now().strftime("%Y-%m-%d")

    return last_date == today


def run():

    print("---- FITNESS PIPELINE ----")

    try:
        if not weight_already_logged():

            weight = input("Enter your weight (kg): ")

            try:
                weight = float(weight)
                add_weight(weight)
                print(f"Weight {weight} kg added")
            except:
                print("Invalid weight, skipping...")

        else:
            print("Weight already logged today")

    except Exception as e:
        print(f"Error checking weight: {e}")
        print("Continuing without weight...")

    print("\nRunning training sync...\n")

    sync_hevy_main()

    print("\nPipeline finished")


if __name__ == "__main__":
    run()
