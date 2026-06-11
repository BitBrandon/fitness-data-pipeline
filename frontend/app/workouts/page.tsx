"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, WorkoutRow, WeeklyRow } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { VolumeChart } from "@/components/Charts";
import LoadingScreen from "@/components/LoadingScreen";

export default function WorkoutsPage() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [weekly, setWeekly] = useState<WeeklyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<string>("all");

  const load = useCallback(async () => {
    try {
      const [w, wk] = await Promise.all([api.workouts(), api.weeklyVolume()]);
      setWorkouts(w.sort((a, b) => b.date.localeCompare(a.date)));
      setWeekly(wk.sort((a, b) => a.week.localeCompare(b.week)));
    } catch { router.replace("/login"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingScreen color="#FFD600" />;

  const exercises = ["all", ...Array.from(new Set(workouts.map(w => w.exercise))).sort()];
  const filtered = selectedExercise === "all" ? workouts : workouts.filter(w => w.exercise === selectedExercise);

  const uniqueSessions  = new Set(workouts.map(w => w.workout)).size;
  const totalVolume     = workouts.reduce((s, w) => s + w.volume, 0);
  const totalSets       = workouts.length;
  const uniqueExercises = new Set(workouts.map(w => w.exercise)).size;

  const prByExercise = exercises.slice(1).map(ex => {
    const rows = workouts.filter(w => w.exercise === ex);
    const pr = rows.reduce((b, r) => r.weight > b.weight ? r : b, rows[0]);
    return { exercise: ex, weight: pr?.weight ?? 0, date: pr?.date ?? "" };
  }).sort((a, b) => b.weight - a.weight).slice(0, 10);

  const summaryStats = [
    { label: "Sesiones",       value: uniqueSessions,                          color: "#FFD600" },
    { label: "Series totales", value: totalSets.toLocaleString(),              color: "#8B0057" },
    { label: "Volumen total",  value: `${Math.round(totalVolume / 1000)}k`, unit: "kg", color: "#B5006E" },
    { label: "Ejercicios",     value: uniqueExercises,                         color: "#FF9500" },
  ];

  return (
    <AppShell>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <div className="h-0.5 w-12 bg-gradient-to-r from-[#FFD600] to-[#8B0057] rounded-full mb-3" />
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Entrenamientos</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{uniqueSessions} sesiones · {uniqueExercises} ejercicios</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryStats.map(m => (
            <div key={m.label} className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>{m.label}</p>
              <p className="text-2xl font-bold" style={{ color: m.color }}>
                {m.value}
                {m.unit && <span className="text-sm font-normal ml-1" style={{ color: "var(--text-muted)" }}>{m.unit}</span>}
              </p>
            </div>
          ))}
        </div>

        {weekly.length > 0 && <VolumeChart data={weekly} />}

        {prByExercise.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--border-col)" }}>
              <span className="text-base">🏆</span>
              <h3 className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Records personales (top 10)</h3>
            </div>
            <div>
              {prByExercise.map((pr, i) => (
                <div key={pr.exercise} className="px-5 py-3 flex items-center justify-between row-hover transition-colors"
                  style={{ borderBottom: "1px solid var(--border-col)" }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-5" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>{pr.exercise}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-[#FFD600]">{pr.weight} kg</span>
                    <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>{pr.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
          <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border-col)" }}>
            <h3 className="text-xs uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Historial de series</h3>
            <div className="flex flex-wrap gap-2">
              {exercises.slice(0, 15).map(ex => (
                <button
                  key={ex}
                  onClick={() => setSelectedExercise(ex)}
                  className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                  style={selectedExercise === ex
                    ? { background: "#8B0057", color: "#fff" }
                    : { background: "var(--surface-2)", color: "var(--text-muted)" }
                  }
                >
                  {ex === "all" ? "Todos" : ex}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-col)" }}>
                  {["Fecha", "Sesión", "Ejercicio", "Reps", "Peso", "Volumen"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((r, i) => (
                  <tr key={i} className="row-hover transition-colors" style={{ borderBottom: "1px solid var(--border-col)" }}>
                    <td className="px-4 py-2.5" style={{ color: "var(--text-muted)" }}>{r.date}</td>
                    <td className="px-4 py-2.5 max-w-[120px] truncate" style={{ color: "var(--text-muted)" }}>{r.workout}</td>
                    <td className="px-4 py-2.5" style={{ color: "var(--text-primary)" }}>{r.exercise}</td>
                    <td className="px-4 py-2.5 text-[#B5006E]">{r.reps}</td>
                    <td className="px-4 py-2.5 font-semibold text-[#FFD600]">{r.weight} kg</td>
                    <td className="px-4 py-2.5" style={{ color: "var(--text-muted)" }}>{r.volume} kg</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <p className="text-xs text-center py-3" style={{ color: "var(--text-muted)" }}>
                Mostrando 100 de {filtered.length} series
              </p>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
