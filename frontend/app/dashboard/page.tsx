"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, ActivityRow, HeartRateRow, SleepRow, WeeklyRow } from "@/lib/api";
import { StepsChart, HeartRateChart, SleepChart, VolumeChart, Sparkline } from "@/components/Charts";
import AppShell from "@/components/AppShell";
import LoadingScreen from "@/components/LoadingScreen";
import { useSettings } from "@/lib/settings";

const DEFAULT_STEP_GOAL    = 8000;
const DEFAULT_CAL_GOAL     = 2000;
const DEFAULT_SLEEP_GOAL_H = 8;

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "BUENOS DÍAS";
  if (h < 20) return "BUENAS TARDES";
  return "BUENAS NOCHES";
}

function calcStreak(activity: ActivityRow[], stepGoal: number): number {
  const sorted = [...activity].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const r of sorted) { if (r.steps >= stepGoal) streak++; else break; }
  return streak;
}

function sleepScore(row: SleepRow, goalH: number): number {
  const total = row.deep_min + row.rem_min + row.light_min;
  const dur  = Math.min(50, (row.duration_hours / goalH) * 50);
  const qual = total > 0 ? Math.min(50, ((row.deep_min + row.rem_min) / total) * 50) : 0;
  return Math.round(dur + qual);
}

/* ── Animated ring ── */
function Ring({ pct, color, icon, label, value, delay = 0 }: {
  pct: number; color: string; icon: string; label: string; value: string; delay?: number;
}) {
  const [a, setA] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setA(pct), delay + 100);
    return () => clearTimeout(t);
  }, [pct, delay]);
  const r = 38, circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(1, a));
  return (
    <div className="flex flex-col items-center gap-2 animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="relative">
        <svg width="96" height="96" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={r} fill="none" stroke="var(--border-col)" strokeWidth={7} />
          <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth={7}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            transform="rotate(-90 48 48)"
            style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.34,1.2,0.64,1)", filter: `drop-shadow(0 0 4px ${color}80)` }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl">{icon}</span>
      </div>
      <p className="text-sm font-black" style={{ color }}>{value}</p>
      <p className="text-[9px] tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}

/* ── Stat tile with sparkline ── */
function StatTile({ icon, label, value, unit, color, spark, delay = 0 }: {
  icon: string; label: string; value: string | number; unit?: string;
  color: string; spark: number[]; delay?: number;
}) {
  return (
    <div className="rounded-2xl p-4 flex flex-col justify-between overflow-hidden animate-fade-up"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-col)",
        animationDelay: `${delay}ms`,
        minHeight: 100,
      }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-base">{icon}</span>
        <span className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{label}</span>
      </div>
      <p className="text-2xl font-black leading-none" style={{ color }}>
        {value}<span className="text-xs font-normal ml-1" style={{ color: "var(--text-muted)" }}>{unit}</span>
      </p>
      <div className="mt-2 -mx-4 -mb-4">
        <Sparkline data={spark} color={color} height={36} />
      </div>
    </div>
  );
}

/* ── Weight bottom sheet ── */
function WeightSheet({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [val, setVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function save() {
    const w = parseFloat(val);
    if (!w || w < 20 || w > 300) return;
    setSaving(true);
    try {
      await api.logWeight(w);
      setDone(true);
      setTimeout(() => { onSaved(); onClose(); }, 800);
    } catch { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full rounded-t-3xl p-6 space-y-5 animate-fade-up"
        style={{ background: "var(--surface)", border: "1px solid var(--border-col)", boxShadow: "0 -8px 40px rgba(0,0,0,0.4)" }}
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto" style={{ background: "var(--border-col)" }} />
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Registrar peso</h2>
          <button onClick={onClose} className="text-xl" style={{ color: "var(--text-muted)" }}>×</button>
        </div>
        <div className="flex items-center gap-3">
          <input type="number" step="0.1" min="20" max="300" value={val}
            onChange={e => setVal(e.target.value)} onKeyDown={e => e.key === "Enter" && save()}
            className="flex-1 rounded-2xl px-4 py-4 text-3xl font-bold text-center focus:outline-none"
            style={{ background: "var(--surface-2)", border: "1px solid #8B0057", color: "var(--text-primary)", boxShadow: "0 0 12px rgba(139,0,87,0.15)" }}
            placeholder="70.5" autoFocus />
          <span className="text-xl font-semibold" style={{ color: "var(--text-muted)" }}>kg</span>
        </div>
        <button onClick={save} disabled={!val || saving}
          className="w-full py-3.5 rounded-2xl font-bold text-white transition-all disabled:opacity-40"
          style={{ background: done ? "#00C950" : "linear-gradient(135deg,#8B0057,#620040)", boxShadow: "0 0 16px rgba(139,0,87,0.35)" }}>
          {done ? "✓ Guardado" : saving ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════ PAGE ══════════════════════════════════ */
export default function Dashboard() {
  const router = useRouter();
  const [activity, setActivity]     = useState<ActivityRow[]>([]);
  const [heartRate, setHeartRate]   = useState<HeartRateRow[]>([]);
  const [sleep, setSleep]           = useState<SleepRow[]>([]);
  const [weekly, setWeekly]         = useState<WeeklyRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [showWeight, setShowWeight] = useState(false);
  const { settings } = useSettings();

  const STEP_GOAL    = settings.stepGoal   ?? DEFAULT_STEP_GOAL;
  const CAL_GOAL     = settings.calGoal    ?? DEFAULT_CAL_GOAL;
  const SLEEP_GOAL_H = settings.sleepGoalH ?? DEFAULT_SLEEP_GOAL_H;
  const username     = typeof window !== "undefined" ? (localStorage.getItem("username") ?? "") : "";

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
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
      if (msg.includes("Timeout") || msg.includes("fetch") || msg.includes("network")) {
        setError("No se puede conectar al servidor.");
      } else { router.replace("/login"); }
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <LoadingScreen />;

  if (error) return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--bg)" }}>
      <div className="max-w-sm text-center space-y-4">
        <div className="text-5xl">📡</div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{error}</p>
        <button onClick={loadData} className="px-6 py-2.5 rounded-xl text-sm font-medium text-white"
          style={{ background: "linear-gradient(135deg,#8B0057,#620040)", boxShadow: "0 0 16px rgba(139,0,87,0.4)" }}>
          Reintentar
        </button>
      </div>
    </div>
  );

  /* ── derive today's data ── */
  const todayStr    = new Date().toISOString().slice(0, 10);
  const today       = activity.find(r => r.date === todayStr) ?? activity[activity.length - 1];
  const latestHR    = heartRate.find(r => r.date === todayStr) ?? heartRate[heartRate.length - 1];
  const lastSleep   = sleep[sleep.length - 1];
  const isStale     = today?.date !== todayStr;
  const streak      = calcStreak(activity, STEP_GOAL);
  const sScore      = lastSleep ? sleepScore(lastSleep, SLEEP_GOAL_H) : null;

  const stepPct     = today ? Math.min(100, Math.round((today.steps / STEP_GOAL) * 100)) : 0;
  const calPct      = today ? Math.min(100, Math.round((today.calories / CAL_GOAL) * 100)) : 0;

  // sparkline data (last 7)
  const stepSpark   = activity.slice(-7).map(r => r.steps);
  const calSpark    = activity.slice(-7).map(r => r.calories);
  const hrSpark     = heartRate.slice(-7).map(r => r.hr_avg);

  return (
    <AppShell>
      {showWeight && <WeightSheet onClose={() => setShowWeight(false)} onSaved={loadData} />}

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* ── HEADER ── */}
        <div className="animate-fade-up">
          <p className="text-[9px] tracking-[0.3em] font-semibold uppercase" style={{ color: "#8B0057" }}>
            {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
          </p>
          <div className="flex items-center justify-between mt-0.5">
            <h1 className="text-xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
              {greeting()}{username ? `, ${username.toUpperCase()}` : ""}
            </h1>
            {streak > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold"
                style={{ background: "rgba(255,107,53,0.12)", border: "1px solid rgba(255,107,53,0.3)", color: "#FF6B35" }}>
                🔥 {streak}d
              </span>
            )}
          </div>
          {isStale && today && (
            <p className="text-[10px] mt-1" style={{ color: "#FF6B35" }}>
              ⚠️ Último dato: {today.date} — sincroniza para actualizar
            </p>
          )}
        </div>

        {/* ── HERO: STEPS ── */}
        <div className="scan-on-mount rounded-2xl p-5 animate-fade-up" style={{
          background: "var(--surface)",
          border: "1px solid var(--border-glow)",
          boxShadow: "0 0 30px rgba(139,0,87,0.12), inset 0 1px 0 rgba(139,0,87,0.2)",
          animationDelay: "50ms",
        }}>
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Pasos hoy</p>
              <p className="text-4xl font-black leading-none mt-1" style={{
                color: "var(--text-primary)",
                textShadow: "0 0 20px rgba(139,0,87,0.35)",
              }}>
                {today?.steps?.toLocaleString() ?? "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black" style={{ color: stepPct >= 100 ? "#00C950" : "#8B0057" }}>
                {stepPct}%
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>meta {STEP_GOAL.toLocaleString()}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: "var(--border-col)" }}>
            <div className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${stepPct}%`,
                background: stepPct >= 100
                  ? "linear-gradient(90deg,#00C950,#00FF80)"
                  : "linear-gradient(90deg,#8B0057,#B5006E,#FF6B35)",
                boxShadow: "0 0 8px rgba(139,0,87,0.6)",
              }} />
          </div>

          {/* Sub-stats */}
          <div className="flex gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
            {today?.active_minutes != null && today.active_minutes > 0 && (
              <span>⚡ <strong style={{ color: "var(--text-primary)" }}>{today.active_minutes}</strong> min activos</span>
            )}
            {today?.calories != null && (
              <span>🔥 <strong style={{ color: "var(--text-primary)" }}>{Math.round(today.calories).toLocaleString()}</strong> kcal</span>
            )}
            {latestHR?.hr_avg && (
              <span>❤️ <strong style={{ color: "var(--text-primary)" }}>{Math.round(latestHR.hr_avg)}</strong> bpm</span>
            )}
          </div>
        </div>

        {/* ── STAT TILES ── */}
        <div className="grid grid-cols-3 gap-3">
          <StatTile icon="🔥" label="Calorías" value={today?.calories ? Math.round(today.calories).toLocaleString() : "—"}
            unit="kcal" color="#FF6B35" spark={calSpark} delay={100} />
          <StatTile icon="❤️" label="Pulso" value={latestHR?.hr_avg ? Math.round(latestHR.hr_avg) : "—"}
            unit="bpm" color="#B5006E" spark={hrSpark} delay={160} />
          <StatTile icon="🌙" label="Sueño" value={lastSleep?.duration_hours ?? "—"}
            unit="h" color="#FFD600" spark={sleep.slice(-7).map(r => r.duration_hours)} delay={220} />
        </div>

        {/* ── SLEEP DETAIL ── */}
        {lastSleep && (
          <div className="rounded-2xl px-5 py-4 animate-fade-up" style={{
            background: "var(--surface)",
            border: "1px solid var(--border-col)",
            animationDelay: "280ms",
          }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Última noche · {lastSleep.date}
              </p>
              {sScore !== null && (
                <span className="text-xs font-black px-2 py-0.5 rounded-lg"
                  style={{
                    background: sScore >= 80 ? "rgba(0,201,80,0.15)" : sScore >= 60 ? "rgba(255,214,0,0.15)" : "rgba(255,107,53,0.15)",
                    color: sScore >= 80 ? "#00C950" : sScore >= 60 ? "#FFD600" : "#FF6B35",
                    border: `1px solid ${sScore >= 80 ? "rgba(0,201,80,0.3)" : sScore >= 60 ? "rgba(255,214,0,0.3)" : "rgba(255,107,53,0.3)"}`,
                  }}>
                  Score {sScore}
                </span>
              )}
            </div>

            {/* Phase bar */}
            <div className="flex h-3 rounded-full overflow-hidden gap-px mb-3">
              {[
                { min: lastSleep.deep_min,  color: "#8B0057",  label: "Profundo" },
                { min: lastSleep.rem_min,   color: "#B5006E",  label: "REM" },
                { min: lastSleep.light_min, color: "#2a2a2a",  label: "Ligero" },
                { min: lastSleep.awake_min, color: "#1a1a1a",  label: "Despierto" },
              ].map(s => {
                const total = lastSleep.deep_min + lastSleep.rem_min + lastSleep.light_min + lastSleep.awake_min;
                const w = total > 0 ? (s.min / total) * 100 : 0;
                return w > 0 ? (
                  <div key={s.label} title={`${s.label}: ${s.min}min`}
                    style={{ width: `${w}%`, background: s.color, minWidth: 2 }} />
                ) : null;
              })}
            </div>

            <div className="flex gap-4 text-xs flex-wrap">
              {[
                { label: "Profundo", min: lastSleep.deep_min,  color: "#8B0057" },
                { label: "REM",      min: lastSleep.rem_min,   color: "#B5006E" },
                { label: "Ligero",   min: lastSleep.light_min, color: "var(--text-muted)" },
              ].map(s => (
                <span key={s.label} className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                  <span style={{ color: "var(--text-muted)" }}>{s.label}</span>
                  <strong style={{ color: "var(--text-primary)" }}>{s.min}m</strong>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── GOAL RINGS ── */}
        <div className="rounded-2xl py-5 px-4 animate-fade-up" style={{
          background: "var(--surface)",
          border: "1px solid var(--border-glow)",
          boxShadow: "0 0 20px rgba(139,0,87,0.08)",
          animationDelay: "320ms",
        }}>
          <p className="text-[9px] uppercase tracking-widest text-center mb-4" style={{ color: "var(--text-muted)" }}>
            Objetivos del día
          </p>
          <div className="grid grid-cols-4 gap-1">
            <Ring pct={today ? today.steps / STEP_GOAL : 0}
              color="#8B0057" icon="👟" label="Pasos"
              value={today ? `${stepPct}%` : "—"} delay={0} />
            <Ring pct={today ? today.calories / CAL_GOAL : 0}
              color="#FF6B35" icon="🔥" label="Cal"
              value={today ? `${calPct}%` : "—"} delay={80} />
            <Ring pct={lastSleep ? lastSleep.duration_hours / SLEEP_GOAL_H : 0}
              color="#FFD600" icon="🌙" label="Sueño"
              value={lastSleep ? `${lastSleep.duration_hours}h` : "—"} delay={160} />
            <Ring
              pct={sScore !== null ? sScore / 100 : 0}
              color={sScore !== null ? (sScore >= 80 ? "#00C950" : sScore >= 60 ? "#FFD600" : "#FF6B35") : "var(--text-muted)"}
              icon="⭐" label="Calidad"
              value={sScore !== null ? `${sScore}` : "—"} delay={240} />
          </div>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: "360ms" }}>
          <button onClick={() => setShowWeight(true)}
            className="rounded-2xl py-3.5 flex items-center justify-center gap-2 font-semibold text-sm transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg,#8B0057,#620040)", color: "white", boxShadow: "0 0 14px rgba(139,0,87,0.35)" }}>
            <span>⚖️</span> Registrar peso
          </button>
          <a href="/activity"
            className="rounded-2xl py-3.5 flex items-center justify-center gap-2 font-semibold text-sm transition-all active:scale-95"
            style={{ background: "var(--surface)", border: "1px solid var(--border-col)", color: "var(--text-primary)" }}>
            <span>📊</span> Ver historial
          </a>
        </div>

        {/* ── CHARTS ── */}
        {(activity.length > 0 || heartRate.length > 0 || sleep.length > 0 || weekly.length > 0) && (
          <div className="space-y-3 animate-fade-up" style={{ animationDelay: "400ms" }}>
            <p className="text-[9px] uppercase tracking-[0.25em] font-semibold" style={{ color: "var(--text-muted)" }}>
              Tendencia 7 días
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activity.length  > 0 && <StepsChart data={activity} goalLine={STEP_GOAL} />}
              {heartRate.length > 0 && <HeartRateChart data={heartRate} />}
              {sleep.length     > 0 && <SleepChart data={sleep} />}
              {weekly.length    > 0 && <VolumeChart data={weekly} />}
            </div>
          </div>
        )}

      </main>
    </AppShell>
  );
}
