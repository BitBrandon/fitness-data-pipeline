"""AI wellness agent — builds context from real user data and calls Gemini."""
import os
from datetime import date, timedelta
from src.storage.repositories import SPREADSHEET_NAME
from src.storage.sheets_client import get_or_create_prepared_worksheet, get_all_records_retried
from src.api.gemini_client import chat

SYSTEM_PROMPT = """
Eres el asistente personal de salud y fitness de Monster Fit.
Tu usuario es una persona real que lleva un seguimiento de su actividad, sueño, entrenos, peso y pulso.
Habla siempre en español, en tono cercano y motivador pero directo.
Basate ÚNICAMENTE en los datos que se te proporcionan. No inventes cifras.
Cuando des consejos, sé concreto y práctico. Máximo 3-4 frases por respuesta.
Si el usuario hace una pregunta fuera de sus datos de salud, redirige amablemente al tema de fitness.
""".strip()

def _get_user_rows(sheet_name: str, username: str) -> list[dict]:
    try:
        sheet = get_or_create_prepared_worksheet(SPREADSHEET_NAME, sheet_name)
        rows  = get_all_records_retried(sheet)
        return [r for r in rows if str(r.get("user_id", "")) == str(username)]
    except Exception:
        return []

def _last_n(rows: list[dict], n: int, date_key: str = "date") -> list[dict]:
    sorted_rows = sorted(rows, key=lambda r: str(r.get(date_key, "")))
    return sorted_rows[-n:]

def build_context(username: str) -> str:
    """Fetch recent data for a user and format it as a readable summary."""
    today = date.today()
    week_ago = today - timedelta(days=7)

    activity = _last_n(_get_user_rows("daily_activity", username), 7)
    sleep    = _last_n(_get_user_rows("sleep", username), 7)
    hr       = _last_n(_get_user_rows("heart_rate_daily", username), 7)
    weight   = _last_n(_get_user_rows("body_weight", username), 5)
    workouts = _last_n(_get_user_rows("workouts", username), 20, "date")

    lines = [f"=== Datos de {username} — últimos 7 días ===", f"Fecha hoy: {today}"]

    # Activity
    if activity:
        avg_steps = int(sum(r.get("steps", 0) for r in activity) / len(activity))
        avg_cal   = int(sum(r.get("calories", 0) for r in activity) / len(activity))
        last_act  = activity[-1]
        lines.append(f"\nACTIVIDAD:")
        lines.append(f"  Hoy: {last_act.get('steps', '?')} pasos, {int(last_act.get('calories', 0))} kcal")
        lines.append(f"  Media 7d: {avg_steps} pasos/día, {avg_cal} kcal/día")

    # Sleep
    if sleep:
        avg_sleep = round(sum(r.get("duration_hours", 0) for r in sleep) / len(sleep), 1)
        last_sl   = sleep[-1]
        lines.append(f"\nSUEÑO:")
        lines.append(f"  Última noche: {last_sl.get('duration_hours', '?')}h "
                     f"(profundo: {last_sl.get('deep_min', 0)}min, REM: {last_sl.get('rem_min', 0)}min)")
        lines.append(f"  Media 7d: {avg_sleep}h por noche")

    # Heart rate
    if hr:
        avg_hr  = int(sum(r.get("hr_avg", 0) for r in hr) / len(hr))
        last_hr = hr[-1]
        lines.append(f"\nPULSO:")
        lines.append(f"  Hoy: {last_hr.get('hr_avg', '?')} bpm promedio (máx {last_hr.get('hr_max', '?')} bpm)")
        lines.append(f"  Media 7d: {avg_hr} bpm en reposo")

    # Weight
    if weight:
        last_w = weight[-1]
        first_w = weight[0]
        delta  = round(float(last_w.get("weight", 0)) - float(first_w.get("weight", 0)), 1)
        lines.append(f"\nPESO:")
        lines.append(f"  Último registro: {last_w.get('weight', '?')} kg ({last_w.get('date', '?')})")
        if len(weight) > 1:
            lines.append(f"  Variación últimos {len(weight)} registros: {'+' if delta > 0 else ''}{delta} kg")

    # Workouts summary
    if workouts:
        unique_dates = set(str(r.get("date", ""))[:10] for r in workouts)
        exercises    = list({r.get("exercise", "") for r in workouts if r.get("exercise")})[:5]
        lines.append(f"\nENTRENOS:")
        lines.append(f"  Sesiones recientes: {len(unique_dates)} días con entreno")
        lines.append(f"  Ejercicios trabajados: {', '.join(exercises)}")

    return "\n".join(lines)


def get_insights(username: str) -> str:
    """Generate a wellness insight summary for the user."""
    context = build_context(username)
    prompt  = (
        f"{context}\n\n"
        "Dame un resumen motivador de cómo va mi semana: qué está bien, qué podría mejorar, "
        "y un consejo concreto para hoy. Sé breve y directo."
    )
    return chat(SYSTEM_PROMPT, prompt)


def answer_question(username: str, question: str) -> str:
    """Answer a user's free-form question about their health data."""
    context = build_context(username)
    prompt  = f"{context}\n\nPregunta del usuario: {question}"
    return chat(SYSTEM_PROMPT, prompt)
