"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MonsterLogo from "./MonsterLogo";
import { useSettings } from "@/lib/settings";

const R = 95;

function arcPositions(count: number): { x: number; y: number }[] {
  if (count === 0) return [];
  if (count === 1) return [{ x: 0, y: -R }];
  const start = -80, end = 80;
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, i) => {
    const deg = start + i * step;
    const rad = (deg * Math.PI) / 180;
    return { x: Math.round(R * Math.sin(rad)), y: -Math.round(R * Math.cos(rad)) };
  });
}

export default function RadialMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { visibleSections, openSettings } = useSettings();

  useEffect(() => { setOpen(false); }, [pathname]);

  const positions = arcPositions(visibleSections.length);

  return (
    <div className="md:hidden">
      {open && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setOpen(false)}
        />
      )}

      <div className="fixed bottom-6 left-1/2 z-50" style={{ transform: "translateX(-50%)" }}>
        {/* Radial items */}
        {visibleSections.map((item, i) => {
          const isActive = pathname === item.href;
          const pos = positions[i];
          const delay = open ? i * 35 : (visibleSections.length - 1 - i) * 20;
          return (
            <div
              key={item.href}
              className="absolute"
              style={{
                bottom: 0,
                left: "50%",
                transform: open
                  ? `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(1)`
                  : `translate(-50%, -50%) scale(0)`,
                opacity: open ? 1 : 0,
                transition: `transform 280ms cubic-bezier(0.34,1.56,0.64,1) ${delay}ms, opacity 200ms ease ${delay}ms`,
                pointerEvents: open ? "auto" : "none",
              }}
            >
              <Link href={item.href} onClick={() => setOpen(false)} className="flex flex-col items-center gap-1">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
                  style={{
                    background: isActive ? "var(--c-main)" : "var(--surface)",
                    border: `1px solid ${isActive ? "var(--c-light)" : "var(--border-col)"}`,
                    boxShadow: isActive ? "0 0 14px var(--c-glow)" : "0 4px 12px rgba(0,0,0,0.35)",
                  }}
                >
                  {item.icon}
                </div>
                <span className="text-[9px] font-semibold tracking-wide"
                  style={{ color: isActive ? "var(--c-main)" : "var(--text-muted)" }}>
                  {item.label}
                </span>
              </Link>
            </div>
          );
        })}

        {/* Settings button */}
        <div
          className="absolute"
          style={{
            bottom: 0,
            left: "50%",
            transform: open
              ? `translate(calc(-50% - ${R}px), calc(-50% + 16px)) scale(1)`
              : `translate(-50%, -50%) scale(0)`,
            opacity: open ? 1 : 0,
            transition: `transform 280ms cubic-bezier(0.34,1.56,0.64,1) ${visibleSections.length * 35 + 40}ms, opacity 200ms ease`,
            pointerEvents: open ? "auto" : "none",
          }}
        >
          <button
            onClick={() => { setOpen(false); openSettings(); }}
            className="flex flex-col items-center gap-1"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-col)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
              }}
            >
              ⚙️
            </div>
            <span className="text-[9px] font-semibold tracking-wide" style={{ color: "var(--text-muted)" }}>
              Ajustes
            </span>
          </button>
        </div>

        {/* Central Monster button */}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-14 h-14 rounded-full flex items-center justify-center relative"
          style={{
            background: "linear-gradient(135deg, var(--c-main), var(--c-light))",
            boxShadow: open
              ? "0 0 24px var(--c-glow), 0 0 50px var(--c-scan)"
              : "0 0 16px var(--c-glow), 0 4px 16px rgba(0,0,0,0.4)",
            transform: open ? "scale(1.08)" : "scale(1)",
            transition: "transform 200ms ease, box-shadow 200ms ease",
          }}
        >
          <div style={{ transition: "transform 300ms ease", transform: open ? "rotate(45deg)" : "rotate(0deg)" }}>
            {open
              ? <span className="text-white text-3xl font-thin leading-none" style={{ marginTop: -2 }}>+</span>
              : <MonsterLogo size={28} />
            }
          </div>
        </button>
      </div>
    </div>
  );
}
