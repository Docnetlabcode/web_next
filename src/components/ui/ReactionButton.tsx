"use client";
import { useState, useRef } from "react";
import { ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** Reactions from the Orovion design: Helpful, Insightful, Heart, Clinical. */
export const REACTIONS = [
  { key: "helpful", emoji: "👍", label: "Helpful", color: "#1E7B74" },
  { key: "insightful", emoji: "🔥", label: "Insightful", color: "#E07A4D" },
  { key: "heart", emoji: "❤️", label: "Love", color: "#E0245E" },
  { key: "clinical", emoji: "⚗️", label: "Clinical", color: "#2a9085" },
];

/**
 * Hover (desktop) / long-press (mobile) to reveal the reaction palette,
 * LinkedIn-style. Calls onReact(key|null).
 */
export default function ReactionButton({ current, count, onReact }) {
  const [open, setOpen] = useState(false);
  const [burst, setBurst] = useState(false);
  const timer = useRef(null);
  const active = REACTIONS.find((r) => r.key === current);

  const show = () => { clearTimeout(timer.current); setOpen(true); };
  const hide = () => { timer.current = setTimeout(() => setOpen(false), 220); };

  const pick = (key) => {
    setOpen(false);
    setBurst(true);
    setTimeout(() => setBurst(false), 420);
    onReact(current === key ? null : key);
  };

  const toggleDefault = () => pick(active ? active.key : "helpful");

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      {open && (
        <div className="absolute -top-14 left-0 z-20 flex items-center gap-1 rounded-full border border-ink-900/[.06] bg-white px-2 py-1.5 shadow-card anim-pop"
             onMouseEnter={show} onMouseLeave={hide}>
          {REACTIONS.map((r, i) => (
            <button key={r.key} onClick={() => pick(r.key)} title={r.label}
              style={{ animationDelay: `${i * 35}ms` }}
              className="press group/r relative grid h-9 w-9 place-items-center rounded-full text-xl transition hover:-translate-y-1 hover:scale-125 anim-pop">
              {r.emoji}
              <span className="pointer-events-none absolute -top-7 whitespace-nowrap rounded-md bg-ink-900 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 transition group-hover/r:opacity-100">{r.label}</span>
            </button>
          ))}
        </div>
      )}

      <button onClick={toggleDefault}
        className={cn("press relative flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition hover:bg-ink-900/5",
          active ? "" : "text-ink-500")}
        style={active ? { color: active.color } : undefined}>
        <span className={cn("grid place-items-center", burst && "anim-burst")}>
          {active ? <span className="text-base leading-none">{active.emoji}</span> : <ThumbsUp size={18} />}
        </span>
        <span>{count > 0 ? count : active?.label || "React"}</span>
      </button>
    </div>
  );
}
