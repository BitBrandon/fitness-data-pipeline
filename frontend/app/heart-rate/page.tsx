"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, HeartRateRow } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { HeartRateChart } from "@/components/Charts";
import MetricBox from "@/components/MetricBox";
import LoadingScreen from "@/components/LoadingScreen";

function hrZone(avg: number): { zone: string; color: string; desc: string } {
  if (avg < 60) return { zone: "Atlético", color: "#00C6FF", desc: "Ritmo cardíaco en reposo bajo — excelente forma física" };
  if (avg < 70) return { zone: "Bueno",    color: "#FFD600", desc: "Ritmo cardíaco saludable" };
  if (avg < 80) return { zone: "Normal",   color: "#FF9500", desc: "Rango normal para adultos" };
  return             { zone: "Elevado",    color: "#FF3B30", desc: "Por encima del rango normal" };
}

export default function HeartRatePage() {
  const router = useRouter();
  const [data, setData] = useState<HeartRateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const rows = await api.heartRate();
      setData(rows.sort((a, b) => a.date.localeCompare(b.date)));
    } catch { router.replace("/login"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingScreen color="#B5006E" />;

  const last = data[data.length - 1];
  const avgOf = (key: keyof HeartRateRow) => data.length
    ? Math.round(data.reduce((s, r) => s + Number(r[key]), 0) / data.length)
    : 0;
  const minAll = data.length ? Math.min(...data.map(r => r.hr_min)) : 0;
  const maxAll = data.length ? Math.max(...data.map(r => r.hr_max)) : 0;
  const zone = last ? hrZone(last.hr_avg) : null;

  return (
    <AppShell>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <div className="h-0.5 w-12 bg-gradient-to-r from-[#B5006E] to-[#FFD600] rounded-full mb-3" />
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Pulso Cardíaco</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{data.length} días registrados</p>
        </div>

        {last && zone && (
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid rgba(181,0,110,0.3)" }}>
            <p className="text-xs text-[#B5006E] uppercase tracking-wider mb-3">Último registro · {last.date}</p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <MetricBox label="Promedio" value={Math.round(last.hr_avg)} unit="bpm" color="#B5006E" />
              <MetricBox label="Máximo" value={last.hr_max} unit="bpm" color="#FF3B30" />
              <MetricBox label="Mínimo" value={last.hr_min} unit="bpm" color="#FFD600" />
            </div>
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "var(--surface-2)" }}>
              <span className="text-base">❤️</span>
              <div>
                <p className="text-xs font-semibold" style={{ color: zone.color }}>Zona: {zone.zone}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{zone.desc}</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Promedios históricos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricBox label="FC media avg" value={avgOf("hr_avg")} unit="bpm" color="#B5006E" />
            <MetricBox label="FC máx avg" value={avgOf("hr_max")} unit="bpm" color="#FF3B30" />
            <MetricBox label="FC mín avg" value={avgOf("hr_min")} unit="bpm" color="#FFD600" />
            <MetricBox label="Variabilidad" value={maxAll - minAll} unit="bpm" color="var(--text-muted)" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl px-4 py-4" style={{ background: "var(--surface)", border: "1px solid rgba(255,59,48,0.2)" }}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>FC máx registrada</p>
            <p className="text-3xl font-black text-[#FF3B30]">{maxAll}<span className="text-base font-normal ml-1" style={{ color: "var(--text-muted)" }}>bpm</span></p>
          </div>
          <div className="rounded-xl px-4 py-4" style={{ background: "var(--surface)", border: "1px solid rgba(255,214,0,0.2)" }}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>FC mín registrada</p>
            <p className="text-3xl font-black text-[#FFD600]">{minAll}<span className="text-base font-normal ml-1" style={{ color: "var(--text-muted)" }}>bpm</span></p>
          </div>
        </div>

        {data.length > 0 && <HeartRateChart data={data} />}

        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
          <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border-col)" }}>
            <h3 className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Historial completo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-col)" }}>
                  {["Fecha", "Promedio", "Máximo", "Mínimo", "Zona"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map(r => {
                  const z = hrZone(r.hr_avg);
                  return (
                    <tr key={r.date} className="row-hover transition-colors" style={{ borderBottom: "1px solid var(--border-col)" }}>
                      <td className="px-4 py-2.5" style={{ color: "var(--text-muted)" }}>{r.date}</td>
                      <td className="px-4 py-2.5 font-semibold text-[#B5006E]">{Math.round(r.hr_avg)} bpm</td>
                      <td className="px-4 py-2.5 text-[#FF3B30]">{r.hr_max} bpm</td>
                      <td className="px-4 py-2.5 text-[#FFD600]">{r.hr_min} bpm</td>
                      <td className="px-4 py-2.5 text-xs font-medium" style={{ color: z.color }}>{z.zone}</td>
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
