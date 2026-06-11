const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

function authHeaders(): HeadersInit {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function get<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: authHeaders(),
      signal: controller.signal,
    });
    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res.json();
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new Error("Timeout: no se puede conectar al servidor");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function login(username: string, password: string): Promise<string> {
  const body = new URLSearchParams({ username, password });
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error("Usuario o contraseña incorrectos");
  const data = await res.json();
  return data.access_token;
}

export type ActivityRow  = { date: string; steps: number; calories: number };
export type HeartRateRow = { date: string; hr_avg: number; hr_max: number; hr_min: number };
export type SleepRow     = { date: string; duration_hours: number; deep_min: number; light_min: number; rem_min: number; awake_min: number };
export type WorkoutRow   = { workout: string; date: string; exercise: string; reps: number; weight: number; volume: number };
export type WeightRow    = { date: string; weight: number };
export type WeeklyRow    = { week: string; total_volume: number; total_sets: number };

export const api = {
  activity:    () => get<ActivityRow[]>("/activity"),
  heartRate:   () => get<HeartRateRow[]>("/heart-rate"),
  sleep:       () => get<SleepRow[]>("/sleep"),
  workouts:    () => get<WorkoutRow[]>("/workouts"),
  weeklyVolume:() => get<WeeklyRow[]>("/workouts/weekly-volume"),
  weight:      () => get<WeightRow[]>("/weight"),
  sync:        () => fetch(`${BASE}/sync`, { method: "POST", headers: authHeaders() }),
};
