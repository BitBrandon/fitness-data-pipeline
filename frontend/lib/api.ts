const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

function token() {
  return typeof window !== "undefined" ? localStorage.getItem("token") : null;
}

function authHeaders(): HeadersInit {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function get<T>(path: string, timeoutMs = 10_000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
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

export type ActivityRow  = { date: string; steps: number; calories: number; active_minutes?: number };
export type HeartRateRow = { date: string; hr_avg: number; hr_max: number; hr_min: number };
export type SleepRow     = { date: string; duration_hours: number; deep_min: number; light_min: number; rem_min: number; awake_min: number };
export type WorkoutRow   = { workout: string; date: string; exercise: string; reps: number; weight: number; volume: number };
export type WeightRow    = { date: string; weight: number };
export type WeeklyRow    = { week: string; total_volume: number; total_sets: number };
export type PrRow        = { exercise: string; pr_weight: number; date: string };
export type ExSummaryRow = { exercise: string; total_sets: number; max_weight: number; total_volume: number };

export const api = {
  activity:        () => get<ActivityRow[]>("/activity"),
  heartRate:       () => get<HeartRateRow[]>("/heart-rate"),
  sleep:           () => get<SleepRow[]>("/sleep"),
  workouts:        () => get<WorkoutRow[]>("/workouts"),
  weeklyVolume:    () => get<WeeklyRow[]>("/workouts/weekly-volume"),
  prs:             () => get<PrRow[]>("/workouts/prs"),
  exerciseSummary: () => get<ExSummaryRow[]>("/workouts/summary"),
  weight:          () => get<WeightRow[]>("/weight"),
  sync:        (days = 30) => fetch(`${BASE}/sync?days=${days}`, { method: "POST", headers: authHeaders() }),
  syncStatus:  () => get<{ state: string; pct: number; step: string; error: string | null }>("/sync/status"),
  logWeight:   (weight: number) => fetch(`${BASE}/weight`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ weight }),
  }),
  debugCounts: () => get<{
    username: string;
    tables: Record<string, { count: number; last?: Record<string, unknown>; error?: string }>;
  }>("/debug/counts", 90_000),  // 90s — 5 sequential reads + possible quota retries
  debugToken:  () => get<{ file_exists: boolean; has_token?: boolean; has_refresh?: boolean; expiry?: string; scopes?: string[] }>("/debug/token-status"),
  debugLogs:   (n = 200) => get<{ logs: string[]; note?: string }>(`/debug/logs?n=${n}`),
  deletePr:    (exercise: string) => fetch(`${BASE}/debug/pr?exercise=${encodeURIComponent(exercise)}`, { method: "DELETE", headers: authHeaders() }).then(r => r.json() as Promise<{ deleted: number; message?: string; error?: string }>),
  aiInsights: () => get<{ response: string }>("/ai/insights"),
  aiChat:     (question: string) => fetch(`${BASE}/ai/chat`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  }).then(r => r.json() as Promise<{ response: string }>),
};
