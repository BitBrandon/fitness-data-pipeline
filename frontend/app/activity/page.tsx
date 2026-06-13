"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, ActivityRow } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { StepsChart } from "@/components/Charts";
import LoadingScreen from "@/components/LoadingScreen";
import { useSettings } from "@/lib/settings";
import { useTheme } from "@/lib/theme";

export default function ActivityPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const { accents } = useTheme();
  const STEP_GOAL = settings.stepGoal ?? 8000;

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

  const today   = data[data.length - 1];
  const avg     = (k: keyof ActivityRow) =>
    data.length ? Math.round(data.reduce((s, r) => s + Number(r[k] ?? 0), 0) / data.length) : 0;
  const best    = data.reduce((b, r) => r.steps > (b?.steps ?? 0) ? r : b, data[0]);
  const daysHit = data.filter(r => r.steps >= STEP_GOAL).length;

  const last7steps = data.slice(-7).map(r => r.steps);
  const prev7steps = data.slice(-14, -7).map(r => r.steps);
  const avg7    = last7steps.length ? Math.round(last7steps.reduce((a, v) => a + v, 0) / last7steps.length) : 0;
  const avgPrev = prev7steps.length ? Math.round(prev7steps.reduce((a, v) => a + v, 0) / prev7steps.length) : 0;
  const trend   = prev7steps.length ? avg7 - avgPrev : null;
  const stepPct = today ? Math.min(100, Math.round((today.steps / STEP_GOAL) * 100)) : 0;

  return (
    <AppShell>
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        <div className="animate-fade-up">
          <p className="text-[9px] tracking-[0.3em] font-semibold uppercase" style={{ color: accents.main }}>Actividad</p>
          <div className="flex items-center justify-between mt-0.5">
            <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>Historial de actividad</h1>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{data.length} días</span>
          </div>
        </div>

        {today && (
          <div className="scan-on-mount rounded-2xl p-5 animate-fade-up"
            style={{ background: "var(--surface)", border: "1px solid var(--border-glow)", boxShadow: "0 0 24px var(--c-glow)", animationDelay: "50ms" }}>
            <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Hoy · {today.date}</p>
            <div className="flex items-end justify-between mb-3">
              <p className="text-4xl font-black" style={{ color: "var(--text-primary)", textShadow: `0 0 20px var(--c-glow)` }}>
                {today.steps.toLocaleString()}
                <span className="text-sm font-normal ml-1" style={{ color: "var(--text-muted)" }}>pasos</span>
              </p>
              <p className="text-2xl font-black" style={{ color: stepPct >= 100 ? "#00C950" : accents.main }}>{stepPct}%</p>
            </div>
            <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: "var(--border-col)" }}>
              <div className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${stepPct}%`,
                  background: stepPct >= 100
                    ? "linear-gradient(90deg,#00C950,#00FF80)"
                    : `linear-gradient(90deg,${accents.main},${accents.light},${accents.hl2})`,
                  boxShadow: `0 0 8px var(--c-glow)`,
                }} />
            </div>
            <div className="flex gap-4 text-xs flex-wrap" style={{ color: "var(--text-muted)" }}>
              <span>Meta <strong style={{ color: "var(--text-primary)" }}>{STEP_GOAL.toLocaleString()}</strong> pasos</span>
              <span>🔥 <strong style={{ color: accents.hl2 }}>{Math.round(today.calories).toLocaleString()}</strong> kcal</span>
              {today.active_minutes != null && today.active_minutes > 0 && (
                <span>⚡ <strong style={{ color: accents.light }}>{today.active_minutes}</strong> min activos</span>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Pasos promedio", value: avg("steps").toLocaleString(),              color: accents.main,  delay: 100 },
            { label: "Mejor día",      value: best?.steps.toLocaleString() ?? "—",        color: accents.hl,    delay: 140 },
            { label: "Cal promedio",   value: `${avg("calories").toLocaleString()} kcal`, color: accents.hl2,   delay: 180 },
            { label: "Días con meta",  value: `${daysHit}/${data.length}`,                color: accents.light, delay: 220 },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 animate-fade-up"
              style={{ background: "var(--surface)", border: "1px solid var(--border-col)", animationDelay: `${s.delay}ms` }}>
              <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
              <p className="text-lg font-black leading-none" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: "250ms" }}>
          <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
            <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Tendencia 7d</p>
            {trend !== null ? (
              <p className="text-xl font-black" style={{ color: trend >= 0 ? "#00C950" : accents.hl2 }}>
                {trend >= 0 ? "+" : ""}{trend.toLocaleString()}
              </p>
            ) : <p className="text-xl font-black" style={{ color: "var(--text-muted)" }}>—</p>}
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Media 7d: {avg7.toLocaleString()} pasos</p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--c-active-brd)" }}>
            <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>% días con meta</p>
            <p className="text-xl font-black" style={{ color: accents.hl }}>
              {data.length ? Math.round((daysHit / data.length) * 100) : 0}%
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{daysHit} de {data.length} días</p>
          </div>
        </div>

        {data.length > 0 && (
          <div className="animate-fade-up" style={{ animationDelay: "290ms" }}>
            <StepsChart data={data} goalLine={STEP_GOAL} />
          </div>
        )}

        <div className="rounded-2xl overflow-hidden animate-fade-up"
          style={{ background: "var(--surface)", border: "1px solid var(--border-col)", animationDelay: "330ms" }}>
          <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border-col)" }}>
            <h3 className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Historial completo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-col)" }}>
                  {["Fecha", "Pasos", "Calorías", "Act. min", "Meta"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map(r => {
                  const pct = Math.min(100, Math.round((r.steps / STEP_GOAL) * 100));
                  return (
                    <tr key={r.date} className="row-hover transition-colors" style={{ borderBottom: "1px solid var(--border-col)" }}>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-muted)" }}>{r.date}</td>
                      <td className="px-4 py-2.5 font-semibold" style={{ color: accents.main }}>{r.steps.toLocaleString()}</td>
                      <td className="px-4 py-2.5" style={{ color: accents.hl2 }}>{Math.round(r.calories).toLocaleString()} kcal</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-muted)" }}>
                        {r.active_minutes != null && r.active_minutes > 0 ? `${r.active_minutes}m` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        {r.steps >= STEP_GOAL
                          ? <span className="text-xs font-medium" style={{ color: "#00C950" }}>✓</span>
                          : <span className="text-xs" style={{ color: "var(--text-muted)" }}>{pct}%</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </AppShell>
  );
}
