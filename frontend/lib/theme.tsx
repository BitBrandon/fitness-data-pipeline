"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light" | "sakura";

const CYCLE: Theme[] = ["dark", "light", "sakura"];

export const THEME_META: Record<Theme, { icon: string; label: string; nextLabel: string }> = {
  dark:   { icon: "🌙", label: "Oscuro",  nextLabel: "Cambiar a claro"  },
  light:  { icon: "☀️",  label: "Claro",   nextLabel: "Tema Sakura"      },
  sakura: { icon: "🌸", label: "Sakura",  nextLabel: "Modo oscuro"      },
};

// JS accent colors (mirrors CSS --c-* vars — for recharts and inline styles)
export const ACCENTS: Record<Theme, { main: string; light: string; hl: string; hl2: string; glow: string }> = {
  dark: {
    main:  "#8B0057",
    light: "#B5006E",
    hl:    "#FFD600",
    hl2:   "#FF6B35",
    glow:  "rgba(139,0,87,0.25)",
  },
  light: {
    main:  "#8B0057",
    light: "#B5006E",
    hl:    "#FFD600",
    hl2:   "#FF6B35",
    glow:  "rgba(139,0,87,0.20)",
  },
  sakura: {
    main:  "#C2185B",
    light: "#E91E8C",
    hl:    "#FF80AB",
    hl2:   "#FF4FA0",
    glow:  "rgba(194,24,91,0.22)",
  },
};

interface ThemeContextValue {
  theme:     Theme;
  toggle:    () => void;
  setTheme:  (t: Theme) => void;
  icon:      string;
  accents:   typeof ACCENTS[Theme];
}

const ThemeContext = createContext<ThemeContextValue>({
  theme:    "dark",
  toggle:   () => {},
  setTheme: () => {},
  icon:     "🌙",
  accents:  ACCENTS.dark,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as Theme) ?? "dark";
    const valid: Theme = CYCLE.includes(saved) ? saved : "dark";
    setTheme(valid);
    document.documentElement.dataset.theme = valid;
  }, []);

  function setAndSave(next: Theme) {
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.dataset.theme = next;
  }

  function toggle() {
    setAndSave(CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]);
  }

  return (
    <ThemeContext.Provider value={{
      theme,
      toggle,
      setTheme: setAndSave,
      icon:     THEME_META[theme].icon,
      accents:  ACCENTS[theme],
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
