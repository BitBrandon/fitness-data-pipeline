"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, SleepRow } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { SleepChart } from "@/components/Charts";
import MetricBox from "@/components/MetricBox";
import LoadingScreen from "@/components/LoadingScreen";

export default function SleepPage() {
  const router = useRouter();
  const [data, setData] = useState<SleepRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const rows = await api.sleep();
      setData(rows.sort((a, b) => a.date.localeCompare(b.date)));
    } catch { router.replace("/login"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingScreen />;

  const last = data[data.length - 1];
  const avg = (key: keyof SleepRow) => data.length
    ? Math.round((data.reduce((s, r) => s + Number(r[key]), 0) / data.length) * 10) / 10
    : 0;

  const best = data.reduce((b, r) => r.duration_hours > (b?.duration_hours ?? 0) ? r : b, data[0]);

  return (
    <AppShell>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <div className="h-0.5 w-12 bg-gradient-to-r from-[#8B0057] to-[#FFD600] rounded-full mb-3" />
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Sueño</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{data.length} noches registradas</p>
        </div>

        {last && (
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid rgba(139,0,87,0.3)" }}>
            <p className="text-xs text-[#8B0057] uppercase tracking-wider mb-3">Última noche · {last.date}</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <MetricBox label="Total" value={last.duration_hours} unit="h" color="#FFD600" />
              <MetricBox label="Profundo" value={last.deep_min} unit="min" color="#8B0057" />
              <MetricBox label="REM" value={last.rem_min} unit="min" color="#B5006E" />
              <MetricBox label="Ligero" value={last.light_min} unit="min" color="var(--text-muted)" />
              <MetricBox label="Despierto" value={last.awake_min} unit="min" color="var(--text-muted)" />
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Promedios ({data.length} noches)</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <MetricBox label="Horas/noche" value={avg("duration_hours")} unit="h" color="#FFD600" />
            <MetricBox label="Profundo avg" value={avg("deep_min")} unit="min" color="#8B0057" />
            <MetricBox label="REM avg" value={avg("rem_min")} unit="min" color="#B5006E" />
            <MetricBox label="Ligero avg" value={avg("light_min")} unit="min" color="var(--text-muted)" />
            <MetricBox label="Despierto avg" value={avg("awake_min")} unit="min" color="var(--text-muted)" />
          </div>
        </div>

        {best && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: "var(--surface)", border: "1px solid rgba(255,214,0,0.2)" }}>
            <span className="text-lg">🏆</span>
            <div>
              <p className="text-xs text-[#FFD600] uppercase tracking-wider">Mejor noche</p>
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                {best.date} — <span className="font-bold">{best.duration_hours}h</span>
                <span style={{ color: "var(--text-muted)" }}> ({best.deep_min}min profundo · {best.rem_min}min REM)</span>
              </p>
            </div>
          </div>
        )}

        {data.length > 0 && <SleepChart data={data} />}

        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
          <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border-col)" }}>
            <h3 className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Historial completo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-col)" }}>
                  {["Fecha", "Total", "Profundo", "REM", "Ligero", "Despierto"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map(r => (
                  <tr key={r.date} className="row-hover transition-colors" style={{ borderBottom: "1px solid var(--border-col)" }}>
                    <td className="px-4 py-2.5" style={{ color: "var(--text-muted)" }}>{r.date}</td>
                    <td className="px-4 py-2.5 font-semibold text-[#FFD600]">{r.duration_hours}h</td>
                    <td className="px-4 py-2.5 text-[#8B0057]">{r.deep_min}min</td>
                    <td className="px-4 py-2.5 text-[#B5006E]">{r.rem_min}min</td>
                    <td className="px-4 py-2.5" style={{ color: "var(--text-muted)" }}>{r.light_min}min</td>
                    <td className="px-4 py-2.5" style={{ color: "var(--text-muted)" }}>{r.awake_min}min</td>
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
