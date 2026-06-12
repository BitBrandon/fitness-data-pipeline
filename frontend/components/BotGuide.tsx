"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import MonsterLogo from "./MonsterLogo";

const MESSAGES: Record<string, string> = {
  "/dashboard":  "Aquí ves tu misión de hoy. Los anillos muestran cuánto has cumplido de cada objetivo. Toca el botón Monster para navegar.",
  "/sleep":      "Tu historial de sueño. Fucsia = profundo, rosa = REM. Son las fases más recuperadoras, cuanto más, mejor.",
  "/activity":   "Pasos y calorías por día. La barra de abajo te dice cuánto falta para tu meta. El historial completo está al fondo.",
  "/heart-rate": "Tu frecuencia cardíaca en reposo. Cuanto más baja, mejor forma cardiovascular. La zona te clasifica automáticamente.",
  "/workouts":   "Todos tus entrenos de Hevy. Arriba están tus records personales ordenados por peso máximo. Filtra por ejercicio.",
  "/body":       "Evolución de tu peso. El número en verde o rojo muestra el cambio total desde tu primer registro.",
};

export default function BotGuide() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [hasBeenSeen, setHasBeenSeen] = useState(false);
  const message = MESSAGES[pathname];

  useEffect(() => {
    if (!message) return;
    const key = `guide_${pathname.replace("/", "") || "dashboard"}`;
    const seen = localStorage.getItem(key);
    if (!seen) {
      const t = setTimeout(() => setVisible(true), 900);
      setHasBeenSeen(false);
      return () => clearTimeout(t);
    } else {
      setHasBeenSeen(true);
      setVisible(false);
    }
  }, [pathname, message]);

  function dismiss() {
    const key = `guide_${pathname.replace("/", "") || "dashboard"}`;
    localStorage.setItem(key, "1");
    setVisible(false);
    setHasBeenSeen(true);
  }

  function reopen() {
    setVisible(true);
    setHasBeenSeen(false);
  }

  if (!message) return null;

  return (
    <div className="fixed left-4 md:left-60 z-40" style={{ bottom: "5.5rem" }}>
      {/* Speech bubble */}
      {visible && (
        <div className="bubble-in mb-3 relative">
          <div
            className="rounded-2xl rounded-bl-sm p-3.5 max-w-[210px] relative"
            style={{
              background: "var(--surface)",
              border: "1px solid #8B0057",
              boxShadow: "0 0 16px rgba(139,0,87,0.25), 0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            {/* LED top strip */}
            <div
              className="absolute top-0 left-4 right-4 h-px rounded-full"
              style={{ background: "linear-gradient(90deg, transparent, #8B0057 50%, transparent)" }}
            />
            <button
              onClick={dismiss}
              className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded-full text-xs"
              style={{ color: "var(--text-muted)", background: "var(--surface-2)" }}
            >
              ×
            </button>
            <p className="text-xs leading-relaxed pr-5" style={{ color: "var(--text-primary)" }}>
              {message}
            </p>
          </div>
          {/* Tail pointing down-left */}
          <div
            className="absolute -bottom-1.5 left-3 w-3 h-3 rotate-45"
            style={{ background: "var(--surface)", borderRight: "1px solid #8B0057", borderBottom: "1px solid #8B0057" }}
          />
        </div>
      )}

      {/* Avatar button */}
      <button
        onClick={visible ? dismiss : reopen}
        className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 float-bob"
        style={{
          background: "linear-gradient(135deg, #8B0057, #3a0025)",
          boxShadow: visible
            ? "0 0 18px rgba(139,0,87,0.7), 0 0 36px rgba(139,0,87,0.3)"
            : !hasBeenSeen
            ? "0 0 14px rgba(139,0,87,0.6), 0 0 28px rgba(139,0,87,0.25)"
            : "0 0 10px rgba(139,0,87,0.4)",
        }}
      >
        <MonsterLogo size={20} />
      </button>
    </div>
  );
}
