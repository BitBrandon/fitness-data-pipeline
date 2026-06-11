"use client";
import { useEffect, useState } from "react";

export default function LoadingScreen({ color = "#8B0057" }: { color?: string }) {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setDots(d => (d + 1) % 4), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <p className="text-lg font-semibold tracking-widest" style={{ color }}>
        Cargando{".".repeat(dots)}
      </p>
    </div>
  );
}
