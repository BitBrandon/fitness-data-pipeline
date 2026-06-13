"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { api, WorkoutRow, WeeklyRow, PrRow, ExSummaryRow } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { VolumeChart, ExerciseProgressChart } from "@/components/Charts";
import LoadingScreen from "@/components/LoadingScreen";

// ── date helpers ──────────────────────────────────────────────────────────────
const MONTHS: Record<string, number> = {
  Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5,
  Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11
};
function parseHevyDate(s: string): number {
  const m = s.match(/^(\d+)\s+(\w+)\s+(\d+),\s+(\d+):(\d+)/);
  if (!m) return 0;
  return new Date(+m[3], MONTHS[m[2]] ?? 0, +m[1], +m[4], +m[5]).getTime();
}
function shortDate(s: string): string {
  const m = s.match(/^(\d+)\s+(\w+)/);
  return m ? `${m[1]} ${m[2]}` : s;
}

// ── session builder ───────────────────────────────────────────────────────────
type SessionExercise = { name: string; sets: number; maxWeight: number; totalVolume: number };
type Session = {
  id: string; workout: string; date: string; ts: number;
  totalVolume: number; totalSets: number;
  exercises: SessionExercise[];
  rows: WorkoutRow[];
};

function buildSessions(rows: WorkoutRow[]): Session[] {
  const map = new Map<string, WorkoutRow[]>();
  for (const r of rows) {
    const key = `${r.workout}|||${r.date}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return Array.from(map.entries()).map(([key, sets]) => {
    const sep = key.indexOf("|||");
    const workout = key.slice(0, sep);
    const date    = key.slice(sep + 3);
    const exMap = new Map<string, WorkoutRow[]>();
    for (const s of sets) {
      if (!exMap.has(s.exercise)) exMap.set(s.exercise, []);
      exMap.get(s.exercise)!.push(s);
    }
    const exercises: SessionExercise[] = Array.from(exMap.entries()).map(([name, exSets]) => ({
      name, sets: exSets.length,
      maxWeight:   Math.max(...exSets.map(s => s.weight)),
      totalVolume: exSets.reduce((t, s) => t + s.volume, 0),
    }));
    return {
      id: key, workout, date, ts: parseHevyDate(date),
      totalVolume: sets.reduce((t, s) => t + s.volume, 0),
      totalSets: sets.length, exercises, rows: sets,
    };
  }).sort((a, b) => b.ts - a.ts);
}

// ── progression builder ───────────────────────────────────────────────────────
function buildProgression(rows: WorkoutRow[], exercise: string) {
  const byDate = new Map<string, { maxWeight: number; volume: number; ts: number }>();
  for (const r of rows.filter(r => r.exercise === exercise)) {
    const existing = byDate.get(r.date);
    const vol = (existing?.volume ?? 0) + r.volume;
    const max = Math.max(existing?.maxWeight ?? 0, r.weight);
    byDate.set(r.date, { maxWeight: max, volume: vol, ts: parseHevyDate(r.date) });
  }
  return Array.from(byDate.entries())
    .map(([date, v]) => ({ date: shortDate(date), maxWeight: v.maxWeight, volume: v.volume, ts: v.ts }))
    .sort((a, b) => a.ts - b.ts);
}

// ── tab types ─────────────────────────────────────────────────────────────────
type Tab = "records" | "sesiones" | "progresion";

// ── medal colors ─────────────────────────────────────────────────────────────
const MEDAL = ["#FFD600", "#C0C0C0", "#CD7F32"];

// ══════════════════════════════════════════════════════════════════════════════
export default function WorkoutsPage() {
  const router = useRouter();
  const [workouts,  setWorkouts]  = useState<WorkoutRow[]>([]);
  const [weekly,    setWeekly]    = useState<WeeklyRow[]>([]);
  const [prs,       setPrs]       = useState<PrRow[]>([]);
  const [summary,   setSummary]   = useState<ExSummaryRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState<Tab>("records");
  const [expanded,  setExpanded]  = useState<Set<string>>(new Set());
  const [selExercise, setSelExercise] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const [w, wk, p, s] = await Promise.all([
        api.workouts(), api.weeklyVolume(), api.prs(), api.exerciseSummary(),
      ]);
      setWorkouts(w);
      setWeekly(wk.sort((a, b) => a.week.localeCompare(b.week)));
      setPrs(p.sort((a, b) => b.pr_weight - a.pr_weight));
      setSummary(s.sort((a, b) => b.total_volume - a.total_volume));
    } catch { router.replace("/login"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const sessions   = useMemo(() => buildSessions(workouts), [workouts]);
  const exercises  = useMemo(() => [...new Set(workouts.map(r => r.exercise))].sort(), [workouts]);

  useEffect(() => {
    if (!selExercise && exercises.length > 0) setSelExercise(exercises[0]);
  }, [exercises, selExercise]);

  const progression = useMemo(
    () => selExercise ? buildProgression(workouts, selExercise) : [],
    [workouts, selExercise]
  );

  if (loading) return <LoadingScreen color="#FFD600" />;

  const totalVolume  = workouts.reduce((s, w) => s + w.volume, 0);
  const totalSets    = workouts.length;
  const totalSess    = sessions.length;
  const totalEx      = exercises.length;

  const toggleSession = (id: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const TABS: { key: Tab; label: string }[] = [
    { key: "records",   label: "Records" },
    { key: "sesiones",  label: "Sesiones" },
    { key: "progresion",label: "Progresión" },
  ];

  return (
    <AppShell>
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* header */}
        <div className="animate-fade-up">
          <p className="text-[9px] tracking-[0.3em] font-semibold uppercase" style={{ color: "#FFD600" }}>Hevy</p>
          <div className="flex items-center justify-between mt-0.5">
            <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>Entrenamientos</h1>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{totalSess} sesiones</span>
          </div>
        </div>

        {/* stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Sesiones",     value: totalSess,                               color: "#FFD600", delay: 50  },
            { label: "Ejercicios",   value: totalEx,                                 color: "#8B0057", delay: 100 },
            { label: "Series",       value: totalSets.toLocaleString(),              color: "#B5006E", delay: 150 },
            { label: "Volumen total",value: `${Math.round(totalVolume/1000)}k kg`,   color: "#FF6B35", delay: 200 },
          ].map(s => (
            <div key={s.label} className="scan-on-mount rounded-2xl p-4 animate-fade-up"
              style={{ background: "var(--surface)", border: "1px solid var(--border-col)", animationDelay: `${s.delay}ms` }}>
              <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
              <p className="text-xl font-black leading-none" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* volume chart */}
        {weekly.length > 0 && (
          <div className="animate-fade-up" style={{ animationDelay: "220ms" }}>
            <VolumeChart data={weekly} />
          </div>
        )}

        {/* tabs */}
        <div className="animate-fade-up" style={{ animationDelay: "260ms" }}>
          <div className="flex gap-2 mb-4">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={tab === t.key
                  ? { background: "linear-gradient(135deg,#8B0057,#620040)", color: "#fff", boxShadow: "0 0 12px rgba(139,0,87,0.4)" }
                  : { background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border-col)" }
                }>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── RECORDS tab ── */}
          {tab === "records" && (
            <div className="space-y-3">
              {prs.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Sin records aún</p>
              ) : prs.map((pr, i) => (
                <div key={pr.exercise}
                  className="rounded-2xl px-4 py-3.5 flex items-center justify-between transition-all hover:scale-[1.01]"
                  style={{
                    background: "var(--surface)",
                    border: `1px solid ${i < 3 ? MEDAL[i] + "40" : "var(--border-col)"}`,
                    boxShadow: i < 3 ? `0 0 12px ${MEDAL[i]}18` : "none",
                  }}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black w-5 text-center"
                      style={{ color: i < 3 ? MEDAL[i] : "var(--text-muted)" }}>
                      {i < 3 ? ["🥇","🥈","🥉"][i] : `${i+1}`}
                    </span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{pr.exercise}</p>
                      {(() => {
                        const ex = summary.find(s => s.exercise === pr.exercise);
                        return ex ? (
                          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            {ex.total_sets} series · {Math.round(ex.total_volume / 1000)}k kg vol
                          </p>
                        ) : null;
                      })()}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black" style={{ color: i < 3 ? MEDAL[i] : "var(--text-primary)" }}>
                      {pr.pr_weight} <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>kg</span>
                    </p>
                    <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>{shortDate(pr.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── SESIONES tab ── */}
          {tab === "sesiones" && (
            <div className="space-y-3">
              {sessions.map(sess => {
                const open = expanded.has(sess.id);
                return (
                  <div key={sess.id} className="rounded-2xl overflow-hidden transition-all"
                    style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
                    <button className="w-full px-5 py-4 flex items-center justify-between text-left"
                      onClick={() => toggleSession(sess.id)}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{sess.workout}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {shortDate(sess.date)} · {sess.exercises.length} ejercicios · {sess.totalSets} series
                        </p>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className="text-sm font-black text-[#FFD600]">{Math.round(sess.totalVolume / 1000)}k <span className="text-[10px] font-normal" style={{ color: "var(--text-muted)" }}>kg</span></p>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{open ? "▲" : "▼"}</p>
                      </div>
                    </button>

                    {open && (
                      <div style={{ borderTop: "1px solid var(--border-col)" }}>
                        {sess.exercises.map(ex => (
                          <div key={ex.name} className="px-5 py-3 flex items-center justify-between row-hover"
                            style={{ borderBottom: "1px solid var(--border-col)" }}>
                            <div>
                              <p className="text-sm" style={{ color: "var(--text-primary)" }}>{ex.name}</p>
                              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{ex.sets} series</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-[#FFD600]">{ex.maxWeight} kg</p>
                              <p className="text-[9px]" style={{ color: "var(--text-muted)" }}>{Math.round(ex.totalVolume)} kg vol</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── PROGRESIÓN tab ── */}
          {tab === "progresion" && (
            <div className="space-y-4">
              {/* exercise selector */}
              <div>
                <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Selecciona ejercicio</p>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {exercises.map(ex => (
                    <button key={ex} onClick={() => setSelExercise(ex)}
                      className="text-xs px-3 py-1.5 rounded-xl transition-all font-medium"
                      style={selExercise === ex
                        ? { background: "#8B0057", color: "#fff", boxShadow: "0 0 8px rgba(139,0,87,0.4)" }
                        : { background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border-col)" }
                      }>
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              {/* progression chart */}
              {selExercise && progression.length > 0 && (
                <>
                  <ExerciseProgressChart data={progression} exercise={selExercise} />

                  {/* exercise stats */}
                  {(() => {
                    const ex   = summary.find(s => s.exercise === selExercise);
                    const pr   = prs.find(p => p.exercise === selExercise);
                    const first = progression[0];
                    const last  = progression[progression.length - 1];
                    const gain  = first && last && first.maxWeight > 0
                      ? Math.round(((last.maxWeight - first.maxWeight) / first.maxWeight) * 100) : 0;
                    return (
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: "PR actual",   value: `${pr?.pr_weight ?? last?.maxWeight ?? 0} kg`, color: "#FFD600" },
                          { label: "Series total", value: ex?.total_sets.toLocaleString() ?? "—",       color: "#8B0057" },
                          { label: "Progreso",    value: `${gain >= 0 ? "+" : ""}${gain}%`,             color: gain >= 0 ? "#00C950" : "#FF6B35" },
                        ].map(s => (
                          <div key={s.label} className="rounded-2xl p-3"
                            style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
                            <p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                            <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </>
              )}

              {selExercise && progression.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Sin datos para este ejercicio</p>
              )}
            </div>
          )}
        </div>

      </main>
    </AppShell>
  );
}
