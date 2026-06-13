"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import MonsterLogo from "./MonsterLogo";
import { useTheme } from "@/lib/theme";
import { useSettings } from "@/lib/settings";

function NavItem({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all"
      style={active ? {
        background: "var(--c-active-bg)",
        border: "1px solid var(--c-active-brd)",
        color: "var(--text-primary)",
      } : {
        border: "1px solid transparent",
        color: "var(--text-muted)",
      }}
    >
      <span className="text-base w-5 text-center">{icon}</span>
      <span className="font-medium">{label}</span>
      {active && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "var(--c-hl)" }} />}
    </Link>
  );
}

export default function Nav({ username, onSync, onLogout }: {
  username: string;
  onSync: () => void;
  onLogout: () => void;
}) {
  const pathname = usePathname();
  const { theme, toggle, icon } = useTheme();
  const { visibleSections, openSettings } = useSettings();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col w-56 min-h-screen fixed left-0 top-0 z-20"
        style={{ background: "var(--bg-nav)", borderRight: "1px solid var(--border-col)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5" style={{ borderBottom: "1px solid var(--border-col)" }}>
          <MonsterLogo size={30} />
          <div>
            <span className="block text-sm font-black uppercase tracking-widest leading-none"
              style={{ color: "var(--text-primary)", textShadow: "0 0 6px var(--c-main), 0 0 14px var(--c-main), 0 0 28px var(--c-main), 0 0 50px var(--c-glow)" }}>
              Monster
            </span>
            <span className="block text-xs font-black uppercase tracking-[0.3em] leading-none"
              style={{ color: "var(--c-hl)", textShadow: "0 0 6px var(--c-hl), 0 0 14px var(--c-glow)" }}>
              Fit
            </span>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleSections.map(s => (
            <NavItem key={s.href} href={s.href} label={s.label} icon={s.icon} active={pathname === s.href} />
          ))}
        </nav>

        {/* User + actions */}
        <div className="px-3 py-4 space-y-2" style={{ borderTop: "1px solid var(--border-col)" }}>
          <button
            onClick={onSync}
            className="w-full text-xs px-3 py-2 rounded-xl transition-colors"
            style={{ background: "var(--c-active-bg)", border: "1px solid var(--c-active-brd)", color: "var(--text-primary)" }}
          >
            ↻ Sincronizar datos
          </button>
          <div className="flex items-center justify-between px-1">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>@{username}</span>
            <div className="flex items-center gap-2">
              <button
                onClick={toggle}
                className="text-sm hover:opacity-80 transition-opacity"
                title={theme === "dark" ? "Modo claro" : theme === "light" ? "Tema Sakura" : "Modo oscuro"}
              >
                {icon}
              </button>
              <button
                onClick={openSettings}
                className="text-sm hover:opacity-80 transition-opacity"
                title="Ajustes"
              >
                ⚙️
              </button>
              <button
                onClick={onLogout}
                className="text-xs transition-colors px-2 py-1 rounded-lg"
                style={{ color: "var(--text-muted)", border: "1px solid var(--border-col)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#FF3B30")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-20 h-12 flex items-center justify-between px-4"
        style={{ background: "var(--bg-nav)", borderBottom: "1px solid var(--border-col)" }}
      >
        <div className="flex items-center gap-2">
          <MonsterLogo size={24} />
          <span className="text-sm font-black uppercase tracking-widest"
            style={{ color: "var(--text-primary)", textShadow: "0 0 6px var(--c-main), 0 0 16px var(--c-main), 0 0 30px var(--c-glow)" }}>
            Monster <span style={{ color: "var(--c-hl)", textShadow: "0 0 6px var(--c-hl), 0 0 12px var(--c-glow)" }}>Fit</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggle} className="text-sm" title="Cambiar tema">
            {icon}
          </button>
          <button onClick={openSettings} className="text-sm" title="Ajustes">⚙️</button>
          <button onClick={onSync} className="text-xs" style={{ color: "var(--text-muted)" }} title="Sincronizar">↻</button>
          <button onClick={onLogout} className="text-xs font-medium" style={{ color: "#FF3B30" }}>Salir</button>
        </div>
      </header>

    </>
  );
}
