"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, ActivityRow, HeartRateRow, SleepRow, WeeklyRow } from "@/lib/api";
import StatCard from "@/components/StatCard";
import { StepsChart, HeartRateChart, SleepChart, VolumeChart } from "@/components/Charts";
import AppShell from "@/components/AppShell";
import LoadingScreen from "@/components/LoadingScreen";

const STEP_GOAL = 8000;
const CAL_GOAL  = 2000;
const SLEEP_GOAL_H = 8;

/* ── helpers ── */
function calcStreak(activity: ActivityRow[]): number {
  const sorted = [...activity].sort((a, b) => b.date.localeCompare(a.date));
  let n = 0;
  for (const row of sorted) {
    if (row.steps >= STEP_GOAL) n++;
    else break;
  }
  return n;
}

function sleepScore(row: SleepRow): number {
  const totalMin = row.deep_min + row.rem_min + row.light_min;
  const durScore     = Math.min(50, (row.duration_hours / SLEEP_GOAL_H) * 50);
  const qualityScore = totalMin > 0 ? Math.min(50, ((row.deep_min + row.rem_min) / totalMin) * 50) : 0;
  return Math.round(durScore + qualityScore);
}

function scoreColor(s: number) {
  if (s >= 80) return "#00C950";
  if (s >= 60) return "#FFD600";
  return "#FF6B35";
}

/* ── Goal ring ── */
function GoalRing({ pct, color, icon, label, value }: {
  pct: number; color: string; icon: string; label: string; value: string;
}) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, pct));
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={r} fill="none" stroke="var(--border-col)" strokeWidth={7} />
          <circle
            cx="36" cy="36" r={r} fill="none"
            stroke={color} strokeWidth={7}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 36 36)"
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl">{icon}</span>
      </div>
      <p className="text-xs font-bold" style={{ color }}>{value}</p>
      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}

/* ── Weekly delta chip ── */
function DeltaChip({ label, value, unit, delta }: { label: string; value: number; unit: string; delta: number }) {
  const up = delta >= 0;
  return (
    <div className="rounded-xl p-3 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
      <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</span>
      <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{value.toLocaleString()}<span className="text-xs font-normal ml-1" style={{ color: "var(--text-muted)" }}>{unit}</span></span>
      {delta !== 0 && (
        <span className="text-[10px] font-medium" style={{ color: up ? "#00C950" : "#FF3B30" }}>
          {up ? "▲" : "▼"} {Math.abs(delta).toLocaleString()} vs sem. ant.
        </span>
      )}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [heartRate, setHeartRate] = useState<HeartRateRow[]>([]);
  const [sleep, setSleep] = useState<SleepRow[]>([]);
  const [weekly, setWeekly] = useState<WeeklyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [act, hr, sl, wk] = await Promise.all([
        api.activity(), api.heartRate(), api.sleep(), api.weeklyVolume(),
      ]);
      setActivity(act.sort((a, b) => a.date.localeCompare(b.date)));
      setHeartRate(hr.sort((a, b) => a.date.localeCompare(b.date)));
      setSleep(sl.sort((a, b) => a.date.localeCompare(b.date)));
      setWeekly(wk.sort((a, b) => a.week.localeCompare(b.week)));
    } catch (e) {
      const msg = (e as Error).message ?? "";
      if (msg.includes("Timeout") || msg.includes("fetch")) {
        setError("No se puede conectar al servidor. Verifica que el backend esté corriendo y que estés en la misma red.");
      } else {
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingScreen />;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--bg)" }}>
        <div className="max-w-sm text-center space-y-4">
          <div className="text-4xl">📡</div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{error}</p>
          <button
            onClick={loadData}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white transition-all"
            style={{ background: "linear-gradient(135deg,#8B0057,#620040)", boxShadow: "0 0 16px rgba(139,0,87,0.4)" }}
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const todayStr   = new Date().toISOString().slice(0, 10);
  const today      = activity.find(r => r.date === todayStr) ?? activity[activity.length - 1];
  const latestHR   = heartRate.find(r => r.date === todayStr) ?? heartRate[heartRate.length - 1];
  const lastSleep  = sleep.find(r => r.date === todayStr) ?? sleep[sleep.length - 1];

  const streak     = calcStreak(activity);
  const sScore     = lastSleep ? sleepScore(lastSleep) : null;

  // Weekly comparison (last 2 full weeks by ISO week)
  const lastWeek   = weekly[weekly.length - 1];
  const prevWeek   = weekly[weekly.length - 2];
  const volDelta   = lastWeek && prevWeek ? Math.round(lastWeek.total_volume - prevWeek.total_volume) : 0;
  const setsDelta  = lastWeek && prevWeek ? lastWeek.total_sets - prevWeek.total_sets : 0;

  // Step goal % this week (avg of last 7 days)
  const last7Steps = activity.slice(-7).map(r => r.steps);
  const avgSteps   = last7Steps.length ? Math.round(last7Steps.reduce((s, v) => s + v, 0) / last7Steps.length) : 0;

  return (
    <AppShell>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <div className="h-0.5 w-12 bg-gradient-to-r from-[#8B0057] to-[#FFD600] rounded-full mb-3" />
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Resumen</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Pasos" value={today?.steps?.toLocaleString() ?? "—"} icon="👟" color="#8B0057"
            sub={today?.date} />
          <StatCard label="Calorías" value={today?.calories ? Math.round(today.calories).toLocaleString() : "—"}
            unit="kcal" icon="🔥" color="#FF6B35" sub={today?.date} />
          <StatCard label="Frec. cardíaca" value={latestHR?.hr_avg ? Math.round(latestHR.hr_avg) : "—"}
            unit="bpm" icon="❤️" color="#B5006E"
            sub={latestHR ? `${latestHR.hr_min}–${latestHR.hr_max} bpm` : undefined} />
          <StatCard label="Sueño" value={lastSleep?.duration_hours ?? "—"} unit="h" icon="🌙" color="#FFD600"
            sub={lastSleep ? `${lastSleep.deep_min}min profundo` : undefined} />
        </div>

        {/* Goal rings + streak */}
        <div
          className="rounded-2xl p-5"
          style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Objetivos
            </h2>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: streak >= 7 ? "rgba(139,0,87,0.15)" : "rgba(255,107,53,0.12)", color: streak >= 7 ? "#8B0057" : "#FF6B35", border: `1px solid ${streak >= 7 ? "rgba(139,0,87,0.3)" : "rgba(255,107,53,0.3)"}` }}>
                🔥 Racha {streak} {streak === 1 ? "día" : "días"}
              </div>
            )}
          </div>
          <div className="flex justify-around">
            <GoalRing
              pct={today ? today.steps / STEP_GOAL : 0}
              color="#8B0057"
              icon="👟"
              label="Pasos"
              value={today ? `${Math.round((today.steps / STEP_GOAL) * 100)}%` : "—"}
            />
            <GoalRing
              pct={today ? today.calories / CAL_GOAL : 0}
              color="#FF6B35"
              icon="🔥"
              label="Calorías"
              value={today ? `${Math.round((today.calories / CAL_GOAL) * 100)}%` : "—"}
            />
            <GoalRing
              pct={lastSleep ? lastSleep.duration_hours / SLEEP_GOAL_H : 0}
              color="#FFD600"
              icon="🌙"
              label="Sueño"
              value={lastSleep ? `${lastSleep.duration_hours}h` : "—"}
            />
            {sScore !== null && (
              <GoalRing
                pct={sScore / 100}
                color={scoreColor(sScore)}
                icon="⭐"
                label="Calidad"
                value={`${sScore}/100`}
              />
            )}
          </div>
        </div>

        {/* Weekly comparison */}
        {lastWeek && prevWeek && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
              Esta semana vs anterior
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DeltaChip label="Pasos medios" value={avgSteps} unit="pasos/día" delta={0} />
              <DeltaChip label="Volumen" value={lastWeek.total_volume} unit="kg" delta={volDelta} />
              <DeltaChip label="Series" value={lastWeek.total_sets} unit="series" delta={setsDelta} />
              <div className="rounded-xl p-3 flex flex-col gap-1" style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Media sueño</span>
                <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                  {sleep.length ? (sleep.slice(-7).reduce((s, r) => s + r.duration_hours, 0) / Math.min(7, sleep.length)).toFixed(1) : "—"}
                  <span className="text-xs font-normal ml-1" style={{ color: "var(--text-muted)" }}>h</span>
                </span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>últimos 7 días</span>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activity.length > 0 && <StepsChart data={activity} />}
          {heartRate.length > 0 && <HeartRateChart data={heartRate} />}
          {sleep.length > 0 && <SleepChart data={sleep} />}
          {weekly.length > 0 && <VolumeChart data={weekly} />}
        </div>
      </main>
    </AppShell>
  );
}
