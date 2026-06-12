"use client";
import { useState, useEffect } from "react";
import { useSettings, ALL_SECTIONS } from "@/lib/settings";
import { useTheme } from "@/lib/theme";

function GoalInput({
  label, value, unit, min, max, step = 1,
  onChange,
}: {
  label: string; value: number; unit: string;
  min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => { setLocal(String(value)); }, [value]);

  function commit() {
    const n = parseFloat(local);
    if (!isNaN(n) && n >= min && n <= max) onChange(n);
    else setLocal(String(value));
  }

  return (
    <div className="flex items-center justify-between gap-3 py-3"
      style={{ borderBottom: "1px solid var(--border-col)" }}>
      <span className="text-sm" style={{ color: "var(--text-primary)" }}>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={local}
          min={min}
          max={max}
          step={step}
          onChange={e => setLocal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => e.key === "Enter" && commit()}
          className="w-24 text-right rounded-xl px-3 py-1.5 text-sm font-bold focus:outline-none"
          style={{
            background: "var(--surface-2)",
            border: "1px solid #8B0057",
            color: "var(--text-primary)",
          }}
        />
        <span className="text-xs w-8" style={{ color: "var(--text-muted)" }}>{unit}</span>
      </div>
    </div>
  );
}

export default function SettingsModal() {
  const { settings, update, settingsOpen, closeSettings } = useSettings();
  const { theme, toggle } = useTheme();

  if (!settingsOpen) return null;

  function toggleSection(key: string) {
    const cur = settings.visibleSections;
    const next = cur.includes(key as never)
      ? cur.filter(k => k !== key)
      : [...cur, key as never];
    update({ visibleSections: next });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center"
      onClick={closeSettings}>

      {/* Backdrop */}
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }} />

      {/* Sheet */}
      <div
        className="relative w-full md:max-w-sm md:rounded-3xl rounded-t-3xl animate-fade-up overflow-hidden"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-col)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(139,0,87,0.1)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* LED top strip */}
        <div className="absolute top-0 left-8 right-8 h-px rounded-full"
          style={{ background: "linear-gradient(90deg, transparent, #8B0057 50%, transparent)" }} />

        {/* Handle / header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border-col)" }}>
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚙️</span>
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Ajustes</h2>
          </div>
          <button onClick={closeSettings}
            className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            ×
          </button>
        </div>

        <div className="px-6 py-4 space-y-6">

          {/* ─ Theme ─ */}
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-3"
              style={{ color: "#8B0057" }}>Apariencia</p>
            <button
              onClick={toggle}
              className="w-full flex items-center justify-between py-3 rounded-2xl px-4 transition-all active:scale-98"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-col)" }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{theme === "dark" ? "🌙" : "☀️"}</span>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Tema {theme === "dark" ? "oscuro" : "claro"}
                </span>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-lg font-medium"
                style={{ background: "#8B0057", color: "white" }}>
                {theme === "dark" ? "Cambiar a claro" : "Cambiar a oscuro"}
              </span>
            </button>
          </div>

          {/* ─ Sections ─ */}
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-3"
              style={{ color: "#8B0057" }}>Secciones visibles</p>
            <div className="space-y-1">
              {ALL_SECTIONS.map(s => {
                const isOn = s.locked || settings.visibleSections.includes(s.key);
                return (
                  <button
                    key={s.key}
                    onClick={() => !s.locked && toggleSection(s.key)}
                    disabled={!!s.locked}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all"
                    style={{
                      background: isOn ? "rgba(139,0,87,0.12)" : "var(--surface-2)",
                      border: `1px solid ${isOn ? "rgba(139,0,87,0.35)" : "var(--border-col)"}`,
                      opacity: s.locked ? 0.6 : 1,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{s.icon}</span>
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {s.label}
                      </span>
                      {s.locked && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider"
                          style={{ background: "var(--border-col)", color: "var(--text-muted)" }}>
                          siempre
                        </span>
                      )}
                    </div>
                    {/* Toggle pill */}
                    <div className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
                      style={{ background: isOn ? "#8B0057" : "var(--border-col)" }}>
                      <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                        style={{ left: isOn ? "calc(100% - 20px)" : "4px", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─ Goals ─ */}
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-1"
              style={{ color: "#8B0057" }}>Objetivos diarios</p>
            <GoalInput label="Pasos" value={settings.stepGoal} unit="pasos"
              min={1000} max={50000} step={500}
              onChange={v => update({ stepGoal: v })} />
            <GoalInput label="Calorías totales" value={settings.calGoal} unit="kcal"
              min={500} max={8000} step={100}
              onChange={v => update({ calGoal: v })} />
            <GoalInput label="Horas de sueño" value={settings.sleepGoalH} unit="h"
              min={4} max={12} step={0.5}
              onChange={v => update({ sleepGoalH: v })} />
          </div>

        </div>
      </div>
    </div>
  );
}
