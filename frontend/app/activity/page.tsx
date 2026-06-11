"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, ActivityRow } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { StepsChart } from "@/components/Charts";
import MetricBox from "@/components/MetricBox";
import LoadingScreen from "@/components/LoadingScreen";

export default function ActivityPage() {
  const router = useRouter();
  const [data, setData] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const rows = await api.activity();
      setData(rows.sort((a, b) => a.date.localeCompare(b.date)));
    } catch { router.replace("/login"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingScreen />;

  const today = data[data.length - 1];
  const avg = (key: keyof ActivityRow) => data.length
    ? Math.round(data.reduce((s, r) => s + Number(r[key]), 0) / data.length)
    : 0;
  const max = (key: keyof ActivityRow) => data.length ? Math.max(...data.map(r => Number(r[key]))) : 0;
  const total = (key: keyof ActivityRow) => data.reduce((s, r) => s + Number(r[key]), 0);

  const best = data.reduce((b, r) => r.steps > (b?.steps ?? 0) ? r : b, data[0]);
  const STEP_GOAL = 10000;
  const daysGoal = data.filter(r => r.steps >= STEP_GOAL).length;

  return (
    <AppShell>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <div className="h-0.5 w-12 bg-gradient-to-r from-[#8B0057] to-[#FFD600] rounded-full mb-3" />
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Actividad</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{data.length} días registrados</p>
        </div>

        {today && (
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid rgba(139,0,87,0.3)" }}>
            <p className="text-xs text-[#8B0057] uppercase tracking-wider mb-3">Hoy · {today.date}</p>
            <div className="grid grid-cols-2 gap-3">
              <MetricBox label="Pasos" value={today.steps.toLocaleString()} color="#8B0057" />
              <MetricBox label="Calorías" value={Math.round(today.calories).toLocaleString()} unit="kcal" color="#FF6B35" />
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                <span>Meta: {STEP_GOAL.toLocaleString()} pasos</span>
                <span>{Math.round((today.steps / STEP_GOAL) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                <div className="h-full bg-gradient-to-r from-[#8B0057] to-[#FFD600] rounded-full transition-all"
                  style={{ width: `${Math.min(100, (today.steps / STEP_GOAL) * 100)}%` }} />
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Estadísticas ({data.length} días)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricBox label="Pasos promedio" value={avg("steps").toLocaleString()} color="#8B0057" />
            <MetricBox label="Mejor día" value={max("steps").toLocaleString()} color="#FFD600" />
            <MetricBox label="Cal. promedio" value={avg("calories").toLocaleString()} unit="kcal" color="#FF6B35" />
            <MetricBox label="Cal. total" value={Math.round(total("calories") / 1000)} unit="Mcal" color="#B5006E" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl px-4 py-4" style={{ background: "var(--surface)", border: "1px solid rgba(255,214,0,0.2)" }}>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Meta de 10,000 pasos</p>
            <p className="text-3xl font-black text-[#FFD600]">{daysGoal}<span className="text-base font-normal ml-1" style={{ color: "var(--text-muted)" }}>días</span></p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{Math.round((daysGoal / data.length) * 100)}% de los días registrados</p>
          </div>
          {best && (
            <div className="rounded-xl px-4 py-4" style={{ background: "var(--surface)", border: "1px solid rgba(139,0,87,0.2)" }}>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>Mejor día</p>
              <p className="text-3xl font-black text-[#8B0057]">{best.steps.toLocaleString()}<span className="text-base font-normal ml-1" style={{ color: "var(--text-muted)" }}>pasos</span></p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{best.date} · {Math.round(best.calories).toLocaleString()} kcal</p>
            </div>
          )}
        </div>

        {data.length > 0 && <StepsChart data={data} />}

        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
          <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border-col)" }}>
            <h3 className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Historial completo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-col)" }}>
                  {["Fecha", "Pasos", "Calorías", "Meta"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map(r => (
                  <tr key={r.date} className="row-hover transition-colors" style={{ borderBottom: "1px solid var(--border-col)" }}>
                    <td className="px-4 py-2.5" style={{ color: "var(--text-muted)" }}>{r.date}</td>
                    <td className="px-4 py-2.5 font-semibold text-[#8B0057]">{r.steps.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-[#FF6B35]">{Math.round(r.calories).toLocaleString()} kcal</td>
                    <td className="px-4 py-2.5">
                      {r.steps >= STEP_GOAL
                        ? <span className="text-[#FFD600] text-xs">✓ Lograda</span>
                        : <span className="text-xs" style={{ color: "var(--text-muted)" }}>{Math.round((r.steps / STEP_GOAL) * 100)}%</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
