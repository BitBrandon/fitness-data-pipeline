"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, HeartRateRow } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { HeartRateChart } from "@/components/Charts";
import LoadingScreen from "@/components/LoadingScreen";

function hrZone(avg: number): { zone: string; color: string; desc: string } {
  if (avg < 60) return { zone: "Atlético",  color: "#00C6FF", desc: "FC en reposo muy baja — excelente forma CV" };
  if (avg < 70) return { zone: "Saludable", color: "#00C950", desc: "FC saludable, buena condición física" };
  if (avg < 80) return { zone: "Normal",    color: "#FFD600", desc: "Rango normal para adultos" };
  return             { zone: "Elevado",    color: "#FF6B35", desc: "Por encima del rango normal" };
}

function ZoneBar({ avg }: { avg: number }) {
  // Map 40-100bpm to 0-100%
  const pct = Math.min(100, Math.max(0, ((avg - 40) / 60) * 100));
  const z   = hrZone(avg);
  return (
    <div className="space-y-1.5">
      <div className="h-2 rounded-full overflow-hidden relative" style={{ background: "var(--border-col)" }}>
        {/* gradient zones */}
        <div className="absolute inset-0 rounded-full" style={{
          background: "linear-gradient(90deg, #00C6FF 0%, #00C950 20%, #FFD600 50%, #FF6B35 75%, #FF3B30 100%)"
        }} />
        {/* mask */}
        <div className="absolute inset-0 rounded-full" style={{
          background: `linear-gradient(90deg, transparent ${pct}%, var(--border-col) ${pct}%)`
        }} />
      </div>
      <div className="flex justify-between text-[9px]" style={{ color: "var(--text-muted)" }}>
        <span>40 bpm</span><span>70</span><span>80</span><span>100 bpm</span>
      </div>
    </div>
  );
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

  const last    = data[data.length - 1];
  const avgOf   = (k: keyof HeartRateRow) =>
    data.length ? Math.round(data.reduce((s, r) => s + Number(r[k]), 0) / data.length) : 0;
  const minAll  = data.length ? Math.min(...data.map(r => r.hr_min)) : 0;
  const maxAll  = data.length ? Math.max(...data.map(r => r.hr_max)) : 0;

  const last7   = data.slice(-7);
  const prev7   = data.slice(-14, -7);
  const avg7    = last7.length  ? Math.round(last7.reduce((s, r) => s + r.hr_avg, 0) / last7.length)  : 0;
  const avgPrev = prev7.length  ? Math.round(prev7.reduce((s, r) => s + r.hr_avg, 0) / prev7.length) : 0;
  const trend   = prev7.length  ? avg7 - avgPrev : null;

  const zone = last ? hrZone(last.hr_avg) : null;

  return (
    <AppShell>
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* header */}
        <div className="animate-fade-up">
          <p className="text-[9px] tracking-[0.3em] font-semibold uppercase" style={{ color: "#B5006E" }}>Pulso cardíaco</p>
          <div className="flex items-center justify-between mt-0.5">
            <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>Frecuencia cardíaca</h1>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{data.length} días</span>
          </div>
        </div>

        {/* last reading hero */}
        {last && zone && (
          <div className="scan-on-mount rounded-2xl p-5 animate-fade-up"
            style={{ background: "var(--surface)", border: "1px solid rgba(181,0,110,0.3)", boxShadow: "0 0 24px rgba(181,0,110,0.08)", animationDelay: "50ms" }}>
            <p className="text-[9px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Último registro · {last.date}</p>

            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="text-4xl font-black" style={{ color: "#B5006E", textShadow: "0 0 20px rgba(181,0,110,0.3)" }}>
                  {Math.round(last.hr_avg)}
                  <span className="text-lg font-normal ml-1" style={{ color: "var(--text-muted)" }}>bpm</span>
                </p>
                <div className="flex gap-3 mt-1 text-xs">
                  <span style={{ color: "var(--text-muted)" }}>Min <strong style={{ color: "#FFD600" }}>{last.hr_min}</strong></span>
                  <span style={{ color: "var(--text-muted)" }}>Max <strong style={{ color: "#FF3B30" }}>{last.hr_max}</strong></span>
                </div>
              </div>
              <div className="text-right px-3 py-2 rounded-xl" style={{ background: "var(--surface-2)", border: `1px solid ${zone.color}40` }}>
                <p className="text-xs font-black" style={{ color: zone.color }}>{zone.zone}</p>
                <p className="text-[9px] mt-0.5 max-w-[120px] text-right" style={{ color: "var(--text-muted)" }}>{zone.desc}</p>
              </div>
            </div>

            <ZoneBar avg={last.hr_avg} />
          </div>
        )}

        {/* stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "FC media avg",  value: `${avgOf("hr_avg")} bpm`, color: "#B5006E", delay: 100 },
            { label: "FC máx avg",    value: `${avgOf("hr_max")} bpm`, color: "#FF3B30", delay: 140 },
            { label: "FC mín avg",    value: `${avgOf("hr_min")} bpm`, color: "#FFD600", delay: 180 },
            { label: "Rango total",   value: `${maxAll - minAll} bpm`, color: "var(--text-muted)", delay: 220 },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 animate-fade-up"
              style={{ background: "var(--surface)", border: "1px solid var(--border-col)", animationDelay: `${s.delay}ms` }}>
              <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
              <p className="text-lg font-black leading-none" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* trend + records */}
        <div className="grid grid-cols-2 gap-3 animate-fade-up" style={{ animationDelay: "250ms" }}>
          <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
            <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Tendencia 7d</p>
            {trend !== null ? (
              <p className="text-xl font-black" style={{ color: trend <= 0 ? "#00C950" : "#FF6B35" }}>
                {trend >= 0 ? "+" : ""}{trend} bpm
              </p>
            ) : <p className="text-xl font-black" style={{ color: "var(--text-muted)" }}>—</p>}
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              {trend !== null && trend < 0 ? "Mejorando" : trend !== null && trend > 0 ? "Subiendo" : "Estable"}
            </p>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid rgba(255,59,48,0.2)" }}>
            <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>FC máx registrada</p>
            <p className="text-xl font-black text-[#FF3B30]">{maxAll} bpm</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>FC mín: {minAll} bpm</p>
          </div>
        </div>

        {/* chart */}
        {data.length > 0 && (
          <div className="animate-fade-up" style={{ animationDelay: "290ms" }}>
            <HeartRateChart data={data} />
          </div>
        )}

        {/* history */}
        <div className="rounded-2xl overflow-hidden animate-fade-up"
          style={{ background: "var(--surface)", border: "1px solid var(--border-col)", animationDelay: "330ms" }}>
          <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border-col)" }}>
            <h3 className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Historial completo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-col)" }}>
                  {["Fecha", "Promedio", "Máximo", "Mínimo", "Zona"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map(r => {
                  const z = hrZone(r.hr_avg);
                  return (
                    <tr key={r.date} className="row-hover transition-colors" style={{ borderBottom: "1px solid var(--border-col)" }}>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-muted)" }}>{r.date}</td>
                      <td className="px-4 py-2.5 font-semibold text-[#B5006E]">{Math.round(r.hr_avg)} bpm</td>
                      <td className="px-4 py-2.5 text-xs text-[#FF3B30]">{r.hr_max} bpm</td>
                      <td className="px-4 py-2.5 text-xs text-[#FFD600]">{r.hr_min} bpm</td>
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
