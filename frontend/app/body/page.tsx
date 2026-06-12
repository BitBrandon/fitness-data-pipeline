"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api, WeightRow } from "@/lib/api";
import AppShell from "@/components/AppShell";
import LoadingScreen from "@/components/LoadingScreen";
import { useTheme } from "@/lib/theme";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: "var(--surface-2)", border: "1px solid var(--border-col)" }}>
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-sm font-bold text-[#FFD600]">{payload[0].value} kg</p>
    </div>
  );
}

export default function BodyPage() {
  const router = useRouter();
  const [data, setData] = useState<WeightRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  const load = useCallback(async () => {
    try {
      const rows = await api.weight();
      setData(rows.sort((a, b) => a.date.localeCompare(b.date)));
    } catch { router.replace("/login"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingScreen color="#FFD600" />;

  const latest = data[data.length - 1];
  const first = data[0];
  const minW = data.length ? Math.min(...data.map(r => r.weight)) : 0;
  const maxW = data.length ? Math.max(...data.map(r => r.weight)) : 0;
  const change = latest && first ? (latest.weight - first.weight).toFixed(1) : ",";
  const changeNum = latest && first ? latest.weight - first.weight : 0;

  const chartData = data.map(r => ({ date: r.date.slice(5), weight: r.weight }));
  const gridColor = theme === "dark" ? "#1C1C1C" : "#E5E7EB";
  const tickColor = theme === "dark" ? "#6B6B6B" : "#9CA3AF";

  const summaryStats = [
    { label: "Mínimo",     value: minW,                           unit: "kg", color: "#4CAF50" },
    { label: "Máximo",     value: maxW,                           unit: "kg", color: "#FF3B30" },
    { label: "Variación",  value: (maxW - minW).toFixed(1),       unit: "kg", color: "var(--text-muted)" },
    { label: "Registros",  value: data.length,                                color: "#FFD600" },
  ];

  return (
    <AppShell>
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div>
          <div className="h-0.5 w-12 bg-gradient-to-r from-[#FFD600] to-[#8B0057] rounded-full mb-3" />
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Cuerpo</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{data.length} registros de peso</p>
        </div>

        {latest && (
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid rgba(255,214,0,0.3)" }}>
            <p className="text-xs text-[#FFD600] uppercase tracking-wider mb-3">Último registro · {latest.date}</p>
            <div className="flex items-end gap-4">
              <div>
                <p className="text-5xl font-black" style={{ color: "var(--text-primary)" }}>
                  {latest.weight}<span className="text-xl font-normal ml-1" style={{ color: "var(--text-muted)" }}>kg</span>
                </p>
              </div>
              {data.length > 1 && (
                <div className="pb-1">
                  <span className={`text-lg font-bold ${changeNum < 0 ? "text-green-400" : changeNum > 0 ? "text-red-400" : ""}`}
                    style={changeNum === 0 ? { color: "var(--text-muted)" } : undefined}>
                    {changeNum > 0 ? "+" : ""}{change} kg
                  </span>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>desde {first.date}</p>
                </div>
              )}
            </div>
          </div>
        )}

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

        {chartData.length > 0 && (
          <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
            <p className="text-xs uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>Evolución del peso</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="date" tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} axisLine={false}
                  interval={Math.floor(chartData.length / 6)} />
                <YAxis tick={{ fill: tickColor, fontSize: 11 }} tickLine={false} axisLine={false}
                  domain={["dataMin - 1", "dataMax + 1"]} />
                <Tooltip content={<CustomTooltip />} />
                {latest && <ReferenceLine y={latest.weight} stroke="#FFD600" strokeDasharray="3 3" strokeOpacity={0.4} />}
                <Line type="monotone" dataKey="weight" stroke="#FFD600" strokeWidth={2}
                  dot={false} activeDot={{ r: 4, fill: "#FFD600" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border-col)" }}>
          <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border-col)" }}>
            <h3 className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Historial completo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-col)" }}>
                  {["Fecha", "Peso", "Cambio"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map((r, i, arr) => {
                  const prev = arr[i + 1];
                  const diff = prev ? (r.weight - prev.weight).toFixed(1) : null;
                  const diffNum = prev ? r.weight - prev.weight : 0;
                  return (
                    <tr key={r.date} className="row-hover transition-colors" style={{ borderBottom: "1px solid var(--border-col)" }}>
                      <td className="px-4 py-2.5" style={{ color: "var(--text-muted)" }}>{r.date}</td>
                      <td className="px-4 py-2.5 font-semibold text-[#FFD600]">{r.weight} kg</td>
                      <td className="px-4 py-2.5 text-xs">
                        {diff !== null && (
                          <span className={diffNum < 0 ? "text-green-400" : diffNum > 0 ? "text-red-400" : ""}>
                            {diffNum > 0 ? "+" : ""}{diff} kg
                          </span>
                        )}
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
