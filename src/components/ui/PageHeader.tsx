"use client";
import { useNavigate } from "@/lib/router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Sticky page header with animated back + forward arrows. */
export function PageHeader({ title, subtitle, right, back = true, forward = true, className = "" }: { title?: any; subtitle?: any; right?: any; back?: boolean; forward?: boolean; className?: string }) {
  const nav = useNavigate();
  return (
    <header className={cn("mb-5 flex items-center gap-2.5", className)}>
      {back && (
        <button
          onClick={() => nav(-1)}
          aria-label="Go back"
          className="press group grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink-900/[.08] bg-white text-ink-700 transition hover:-translate-x-0.5 hover:border-brand-300 hover:text-brand-700"
        >
          <ArrowLeft size={18} className="transition group-hover:-translate-x-0.5" />
        </button>
      )}
      {forward && (
        <button
          onClick={() => nav(1)}
          aria-label="Go forward"
          className="press group hidden h-10 w-10 shrink-0 place-items-center rounded-full border border-ink-900/[.08] bg-white text-ink-700 transition hover:translate-x-0.5 hover:border-brand-300 hover:text-brand-700 sm:grid"
        >
          <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />
        </button>
      )}
      <div className="ml-1 min-w-0 flex-1">
        <h1 className="truncate font-display text-2xl font-extrabold text-ink-900">{title}</h1>
        {subtitle && <p className="truncate text-sm text-ink-500">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

/** Wrap a route's content to get a smooth enter animation on every navigation. */
export function PageTransition({ children, keyId }) {
  return (
    <div key={keyId} className="animate-[fade-up_.45s_cubic-bezier(.2,0,0,1)_both]">
      {children}
    </div>
  );
}
