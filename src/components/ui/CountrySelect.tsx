"use client";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { COUNTRIES } from "@/data/countries";
import { cn } from "@/lib/utils";

export default function CountrySelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);
  const current = COUNTRIES.find((c) => c.dial === value && c.code === (value?.code || c.code)) ||
                  COUNTRIES.find((c) => c.dial === value) || COUNTRIES[0];

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = COUNTRIES.filter(
    (c) => c.name.toLowerCase().includes(q.toLowerCase()) || c.dial.includes(q) || c.code.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "press flex h-[50px] items-center gap-1.5 rounded-xl border bg-surface px-3 text-sm font-semibold text-ink-800 transition",
          open ? "border-brand-400 ring-4 ring-brand-100" : "border-ink-900/[.12] hover:border-brand-300"
        )}
      >
        <span className="text-lg leading-none">{current.flag}</span>
        <span>{current.dial}</span>
        <ChevronDown size={15} className={cn("text-ink-400 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-ink-900/[.08] bg-surface shadow-card anim-pop">
          <div className="border-b border-ink-900/[.06] p-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search country or code…"
                className="w-full rounded-lg bg-ink-50 py-2 pl-9 pr-3 text-sm outline-none"
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-400">No matches</p>}
            {filtered.map((c) => (
              <button
                key={c.code}
                onClick={() => { onChange(c); setOpen(false); setQ(""); }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-brand-50"
              >
                <span className="text-lg leading-none">{c.flag}</span>
                <span className="flex-1 truncate text-ink-800">{c.name}</span>
                <span className="font-semibold text-ink-500">{c.dial}</span>
                {current.code === c.code && <Check size={15} className="text-brand-600" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
