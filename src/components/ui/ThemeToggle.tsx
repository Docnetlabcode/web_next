"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { toggledTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Sun/moon switch for the resolved theme. The visible icon is chosen by CSS
 * (`dark:` variants), not React state, so the first paint is always right —
 * the no-flash script has set `.dark` before hydration.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolved, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(toggledTheme(resolved))}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
      className={cn(
        "press relative grid h-10 w-10 place-items-center rounded-xl text-ink-600 transition hover:bg-ink-900/[.05] hover:text-ink-900",
        className
      )}
    >
      <Sun size={19} className="absolute rotate-0 scale-100 transition-all duration-300 ease-out dark:-rotate-90 dark:scale-0" />
      <Moon size={17} className="absolute rotate-90 scale-0 transition-all duration-300 ease-out dark:rotate-0 dark:scale-100" />
    </button>
  );
}
