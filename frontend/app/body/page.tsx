"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, WeightRow } from "@/lib/api";
import AppShell from "@/components/AppShell";
import { WeightChart } from "@/components/Charts";
import LoadingScreen from "@/components/LoadingScreen";
import { useTheme } from "@/lib/theme";

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function avg(rows: WeightRow[]): number {
  if (!rows.length) return 0;
  return Math.round((rows.reduce((s, r) => s + r.weight, 0) / rows.length) * 10) / 10;
}

export default function BodyPage() {
  const router = useRouter();
  const { accents } = useTheme();
  const [data,    setData]    = useState<WeightRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const rows = await api.weight();
      setData(rows.sort((a, b) => a.date.localeCompare(b.date)));
    } catch { router.replace("/login"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);
  if (loading) return <LoadingScreen color={accents.hl} />;

  const latest   = data[data.length - 1];
  const first    = data[0];
  const minW     = data.length ? Math.min(...data.map(r => r.weight)) : 0;
  const maxW     = data.length ? Math.max(...data.map(r => r.weight)) : 0;
  const atBest   = latest?.weight === minW;

  const totalChange  = latest && first ? +(latest.weight - first.weight).toFixed(1) : 0;
  const lastDelta    = data.length > 1 ? +(latest.weight - data[data.length - 2].weight).toFixed(1) : null;

  // 30d trend
  const last30   = data.slice(-30);
  const prev30   = data.slice(-60, -30);
  const avg30    = avg(last30);
  const avgPrev  = avg(prev30);
  const trend30  = prev30.length ? +(avg30 - avgPrev).toFixed(1) : null;

  // weekly warning
  const stale    = !latest || daysSince(latest.date) > 7;

  // range position bar (where current sits between min and max)
  const rangePct = maxW > minW && latest
    ? Math.round(((latest.weight - minW) / (maxW - minW)) * 100) : 0;

  // monthly summaries (last 6 months)
  const monthMap = new Map<string, number[]>();
  for (const r of data) {
    const m = r.date.slice(0, 7); // "2026-06"
    if (!monthMap.has(m)) monthMap.set(m, []);
    monthMap.get(m)!.push(r.weight);
  }
  const months = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([m, weights]) => ({
      month: new Date(m + "-01").toLocaleDateString("es-ES", { month: "short", year: "2-digit" }),
      avg:   +(weights.reduce((s, v) => s + v, 0) / weights.length).toFixed(1),
    }));

  return (
    <AppShell>
      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* header */}
        <div className="animate-fade-up">
          <p className="text-[9px] tracking-[0.3em] font-semibold uppercase" style={{ color: accents.hl }}>Cuerpo</p>
          <div className="flex items-center justify-between mt-0.5">
            <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>Evolución del peso</h1>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{data.length} registros</span>
          </div>
        </div>

        {/* weekly warning */}
        {stale && (
          <div className="rounded-2xl px-4 py-3 flex items-center gap-3 animate-fade-up"
            style={{ background: `${accents.hl2}14`, border: `1px solid ${accents.hl2}59`, animationDelay: "30ms" }}>
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-xs font-semibold" style={{ color: accents.hl2 }}>
                {!latest ? "Sin registros aún" : `Sin pesarte desde hace ${daysSince(latest.date)} días`}
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                Registra tu peso semanalmente para ver tu progreso real
              </p>
            </div>
          </div>
        )}

        {/* hero */}
        {latest && (
          <div className="scan-on-mount rounded-2xl p-5 animate-fade-up"
            style={{ background: "var(--surface)", border: `1px solid ${accents.hl}4D`, boxShadow: `0 0 28px ${accents.hl}14`, animationDelay: "60ms" }}>

            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>
                  Último registro · {latest.date}
                </p>
                <p className="text-5xl font-black" style={{ color: "var(--text-primary)", textShadow: `0 0 24px ${accents.hl}33` }}>
                  {latest.weight}
                  <span className="text-xl font-normal ml-1" style={{ color: "var(--text-muted)" }}>kg</span>
                </p>
              </div>
              <div className="text-right space-y-1">
                {atBest && (
                  <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold"
                    style={{ background: "rgba(0,201,80,0.15)", border: "1px solid rgba(0,201,80,0.3)", color: "#00C950" }}>
                    Mejor peso
                  </span>
                )}
                {totalChange !== 0 && (
                  <p className="text-xl font-black" style={{ color: totalChange < 0 ? "#00C950" : accents.hl2 }}>
                    {totalChange > 0 ? "+" : ""}{totalChange} kg
                  </p>
                )}
                {totalChange !== 0 && (
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>desde el inicio</p>
                )}
              </div>
            </div>

            {/* range bar */}
            {maxW > minW && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-[9px]" style={{ color: "var(--text-muted)" }}>
                  <span>Min {minW} kg</span>
                  <span>Actual {latest.weight} kg</span>
                  <span>Max {maxW} kg</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden relative" style={{ background: "var(--border-col)" }}>
                  <div className="h-full rounded-full" style={{
                    width: `${rangePct}%`,
                    background: rangePct < 30
                      ? "linear-gradient(90deg,#00C950,#00C950)"
                      : rangePct < 70
                        ? `linear-gradient(90deg,#00C950,${accents.hl})`
                        : `linear-gradient(90deg,${accents.hl},${accents.hl2})`,
                    boxShadow: `0 0 6px ${accents.hl}66`,
                    transition: "width 1s ease-out",
                  }} />
                </div>
              </div>
            )}

            {/* last delta */}
            {lastDelta !== null && lastDelta !== 0 && (
              <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>
                Respecto al registro anterior:
                <span className="font-semibold ml-1" style={{ color: lastDelta < 0 ? "#00C950" : accents.hl2 }}>
                  {lastDelta > 0 ? "+" : ""}{lastDelta} kg
                </span>
              </p>
            )}
          </div>
        )}

        {/* stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Mejor peso",   value: `${minW} kg`,               color: "#00C950", delay: 120 },
            { label: "Mayor peso",   value: `${maxW} kg`,               color: accents.hl2, delay: 160 },
            { label: "Media global", value: `${avg(data)} kg`,          color: accents.hl,  delay: 200 },
            { label: "Variación",    value: `${+(maxW - minW).toFixed(1)} kg`, color: "var(--text-muted)", delay: 240 },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 animate-fade-up"
              style={{ background: "var(--surface)", border: "1px solid var(--border-col)", animationDelay: `${s.delay}ms` }}>
              <p className="text-[9px] uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
              <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* 30d trend */}
        {trend30 !== null && (
          <div className="rounded-2xl px-5 py-4 flex items-center justify-between animate-fade-up"
            style={{ background: "var(--surface)", border: "1px solid var(--border-col)", animationDelay: "260ms" }}>
            <div>
              <p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: "var(--text-muted)" }}>Tendencia 30 días</p>
              <p className="text-2xl font-black" style={{ color: trend30 < 0 ? "#00C950" : trend30 > 0 ? accents.hl2 : accents.hl }}>
                {trend30 > 0 ? "+" : ""}{trend30} kg
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                {trend30 < 0 ? "Bajando de peso" : trend30 > 0 ? "Subiendo de peso" : "Peso estable"}
              </p>
            </div>
            <div className="text-right text-xs" style={{ color: "var(--text-muted)" }}>
              <p>Últimos 30d: <strong style={{ color: "var(--text-primary)" }}>{avg30} kg</strong></p>
              <p>Anteriores 30d: <strong style={{ color: "var(--text-primary)" }}>{avgPrev} kg</strong></p>
            </div>
          </div>
        )}

        {/* chart */}
        {data.length > 1 && (
          <div className="animate-fade-up" style={{ animationDelay: "300ms" }}>
            <WeightChart data={data} />
          </div>
        )}

        {/* monthly summary */}
        {months.length > 1 && (
          <div className="rounded-2xl p-5 animate-fade-up"
            style={{ background: "var(--surface)", border: "1px solid var(--border-col)", animationDelay: "340ms" }}>
            <p className="text-[9px] uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>Media mensual</p>
            <div className="flex items-end gap-3 h-20">
              {months.map((m, i) => {
                const range = maxW - minW || 1;
                const h = Math.max(8, Math.round(((m.avg - minW) / range) * 64) + 8);
                const isLast = i === months.length - 1;
                return (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-[9px] font-bold" style={{ color: isLast ? accents.hl : "var(--text-muted)" }}>
                      {m.avg}
                    </p>
                    <div className="w-full rounded-t-lg transition-all duration-700"
                      style={{ height: h, background: isLast ? accents.hl : "var(--surface-2)", boxShadow: isLast ? `0 0 8px ${accents.hl}66` : "none" }} />
                    <p className="text-[8px]" style={{ color: "var(--text-muted)" }}>{m.month}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* history */}
        <div className="rounded-2xl overflow-hidden animate-fade-up"
          style={{ background: "var(--surface)", border: "1px solid var(--border-col)", animationDelay: "380ms" }}>
          <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border-col)" }}>
            <h3 className="text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Historial completo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-col)" }}>
                  {["Fecha", "Peso", "Cambio", "vs Mejor"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map((r, i, arr) => {
                  const prev    = arr[i + 1];
                  const delta   = prev ? +(r.weight - prev.weight).toFixed(1) : null;
                  const vsBest  = +(r.weight - minW).toFixed(1);
                  return (
                    <tr key={r.date} className="row-hover transition-colors" style={{ borderBottom: "1px solid var(--border-col)" }}>
                      <td className="px-4 py-2.5 text-xs" style={{ color: "var(--text-muted)" }}>{r.date}</td>
                      <td className="px-4 py-2.5 font-semibold" style={{ color: accents.hl }}>{r.weight} kg</td>
                      <td className="px-4 py-2.5 text-xs">
                        {delta !== null && delta !== 0 ? (
                          <span style={{ color: delta < 0 ? "#00C950" : accents.hl2 }}>
                            {delta > 0 ? "▲" : "▼"} {Math.abs(delta)} kg
                          </span>
                        ) : delta === 0 ? (
                          <span style={{ color: "var(--text-muted)" }}>—</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {vsBest === 0
                          ? <span style={{ color: "#00C950" }}>Mejor</span>
                          : <span style={{ color: "var(--text-muted)" }}>+{vsBest} kg</span>
                        }
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
