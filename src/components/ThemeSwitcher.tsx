"use client";

import { useTheme } from "@/contexts/ThemeContext";
import type { Theme } from "@/contexts/ThemeContext";

interface ThemeOption {
  theme: Theme;
  displayName: string;
  color: string;
}

const themeOptions: ThemeOption[] = [
  { theme: "cyan", displayName: "CYAN", color: "#00F5FF" },
  { theme: "matrix", displayName: "MATRIX", color: "#00FF41" },
  { theme: "ares", displayName: "ARES", color: "#FF0040" },
];

export function ThemeSwitcher() {
  const { currentTheme, setTheme } = useTheme();

  return (
    <div className="mb-3">
      <div 
        className="text-[8px] font-mono tracking-wider uppercase mb-2"
        style={{ color: "rgba(var(--accent-rgb), 0.5)" }}
      >
        INTERFACE COLOR
      </div>
      <div className="flex gap-1">
        {themeOptions.map((option) => {
          const isActive = currentTheme === option.theme;
          return (
            <button
              key={option.theme}
              onClick={() => setTheme(option.theme)}
              className="relative px-2 py-1.5 text-[8px] font-mono tracking-wider uppercase transition-all"
              style={{
                color: isActive ? "var(--accent)" : "rgba(var(--accent-rgb), 0.4)",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: isActive 
                  ? "rgba(var(--accent-rgb), 0.5)" 
                  : "rgba(var(--accent-rgb), 0.2)",
                borderRadius: "var(--r)",
                backgroundColor: isActive 
                  ? "rgba(var(--accent-rgb), 0.1)" 
                  : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "rgba(var(--accent-rgb), 0.3)";
                  e.currentTarget.style.color = "rgba(var(--accent-rgb), 0.5)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "rgba(var(--accent-rgb), 0.2)";
                  e.currentTarget.style.color = "rgba(var(--accent-rgb), 0.4)";
                }
              }}
            >
              <span className="relative z-10 flex items-center gap-1.5">
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
                {option.displayName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

