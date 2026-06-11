from datetime import datetime

from src.etl.sync_hevy import main as sync_hevy_main
from src.etl.sync_google_fit import sync_all_google_fit
from src.etl.add_weight import add_weight
from src.storage.sheets_client import get_or_create_prepared_worksheet
from src.storage.user_auth import authenticate_user, get_or_prompt_csv_path


SPREADSHEET_NAME = "fitness_data"


def weight_already_logged(user_id):
    sheet = get_or_create_prepared_worksheet(SPREADSHEET_NAME, "body_weight")
    records = sheet.get_all_records()

    if not records:
        return False

    today = datetime.now().strftime("%Y-%m-%d")

    for entry in reversed(records):
        if str(entry.get("user_id")) != str(user_id):
            continue
        return str(entry.get("date")) == today

    return False


def run_weight_step(user_id):
    try:
        if weight_already_logged(user_id):
            print("  Peso ya registrado hoy.")
            return
        weight_input = input("  Ingresa tu peso de hoy (kg): ").strip()
        weight = float(weight_input)
        add_weight(weight, user_id)
        print(f"  Peso {weight} kg registrado.")
    except ValueError:
        print("  Peso inválido, omitiendo...")
    except Exception as e:
        print(f"  Error al registrar peso: {e}")


def run_hevy_step(user_id, csv_path):
    print("\n[2/3] Sincronizando entrenamientos (Hevy)...")
    try:
        sync_hevy_main(user_id, csv_path)
    except Exception as e:
        print(f"  Error en sync Hevy: {e}")


def run_google_fit_step(user_id, days=30):
    print("\n[3/3] Sincronizando datos del reloj (Google Health)...")
    try:
        sync_all_google_fit(user_id=user_id, days=days)
    except FileNotFoundError:
        print("  Token de Google no encontrado. Ejecuta primero:")
        print("  python -c \"from src.api.google_fit_client import get_credentials; get_credentials()\"")
    except Exception as e:
        print(f"  Error en sync Google Health: {e}")


def run():
    print("=" * 40)
    print("      FITNESS DATA PIPELINE")
    print("=" * 40)

    user_id = authenticate_user()

    if user_id is None:
        print("Autenticación cancelada.")
        return

    print("\n[1/3] Registrando peso corporal...")
    run_weight_step(user_id)

    csv_path = get_or_prompt_csv_path(user_id)
    run_hevy_step(user_id, csv_path)

    run_google_fit_step(user_id, days=30)

    print("\n" + "=" * 40)
    print("  Pipeline completado.")
    print("=" * 40)


if __name__ == "__main__":
    run()
