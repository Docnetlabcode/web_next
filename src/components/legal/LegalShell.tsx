"use client";
import { useEffect, useState } from "react";
import { Link } from "@/lib/router";
import { Logo } from "@/components/ui/Primitives";
import NavArrows from "@/components/ui/NavArrows";
import { Mail, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Public document shell for /privacy, /terms and /help — mirrors the Figma
 * legal screens: "Last updated" line, an "On this page" jump nav with
 * scroll-spy, numbered icon sections, and the legal contact card.
 * No auth required; safe to index and share.
 */
export default function LegalShell({ eyebrow, title, updated, intro, sections, children, contact = true }) {
  const [active, setActive] = useState(sections?.[0]?.id);

  // scroll-spy for the jump nav
  useEffect(() => {
    if (!sections?.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [sections]);

  return (
    <div className="min-h-screen bg-ink-50">
      {/* public topbar */}
      <header className="glass sticky top-0 z-40 border-b border-ink-900/[.06]">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-5 sm:gap-4 sm:px-8">
          <Link to="/"><Logo /></Link>
          <NavArrows />
          <nav className="ml-auto flex items-center gap-1 text-sm font-semibold text-ink-600 sm:gap-2">
            <TopLink to="/help" label="Help center" />
            <TopLink to="/privacy" label="Privacy" />
            <TopLink to="/terms" label="Terms" />
            <Link to="/login" className="btn-primary ml-2 hidden px-4 py-2 text-sm sm:inline-flex">Open Orovion</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="max-w-2xl">
          {eyebrow && <p className="text-sm font-bold text-brand-600">{eyebrow}</p>}
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl" style={{ textWrap: "balance" }}>{title}</h1>
          {updated && <p className="mt-2 text-sm text-ink-500">{updated}</p>}
          {intro && <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-ink-700">{intro}</div>}
        </div>

        <div className="mt-10 flex gap-10">
          {/* On this page (desktop) */}
          {sections?.length > 0 && (
            <aside className="sticky top-24 hidden h-fit w-56 shrink-0 lg:block">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-400">On this page</p>
              <nav className="no-scrollbar mt-3 max-h-[calc(100vh-10rem)] space-y-1 overflow-y-auto pr-1">
                {sections.map((s, i) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition",
                      active === s.id ? "bg-brand-50 font-semibold text-brand-700" : "text-ink-500 hover:bg-ink-900/[.03] hover:text-ink-900"
                    )}
                  >
                    <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-md text-[11px] font-bold", active === s.id ? "bg-brand-600 text-white" : "bg-ink-900/[.06] text-ink-500")}>{i + 1}</span>
                    <span className="truncate">{s.title}</span>
                  </a>
                ))}
              </nav>
            </aside>
          )}

          <div className="min-w-0 max-w-2xl flex-1">
            {/* jump chips (mobile) */}
            {sections?.length > 0 && (
              <div className="no-scrollbar -mx-1 mb-8 flex gap-2 overflow-x-auto px-1 lg:hidden">
                {sections.map((s) => (
                  <a key={s.id} href={`#${s.id}`} className="chip shrink-0 bg-surface text-ink-600 ring-1 ring-ink-900/[.06]">{s.title}</a>
                ))}
              </div>
            )}

            <div className="space-y-10">
              {sections?.map((s, i) => {
                const Icon = s.icon;
                return (
                  <section key={s.id} id={s.id} className="scroll-mt-24">
                    <h2 className="flex items-center gap-3 font-display text-xl font-extrabold text-ink-900">
                      {Icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon size={18} /></span>}
                      <span><span className="mr-1.5 text-brand-600">{i + 1}.</span>{s.title}</span>
                    </h2>
                    <div className="prose-dok mt-4 space-y-3 text-[15px] leading-relaxed text-ink-700">{s.body}</div>
                  </section>
                );
              })}
              {children}
            </div>

            {contact && (
              <div className="mt-12 flex flex-col items-start gap-3 rounded-2xl border border-ink-900/[.06] bg-surface p-5 shadow-card sm:flex-row sm:items-center">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"><Mail size={20} /></span>
                <div className="flex-1">
                  <p className="font-semibold text-ink-900">Questions about these terms?</p>
                  <p className="text-sm text-ink-500">Reach our team at <a href="mailto:support@orovion.com" className="font-semibold text-brand-700 hover:underline">support@orovion.com</a> — we reply within 2 business days.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t border-ink-900/[.06] py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-5 text-sm text-ink-400 sm:flex-row sm:px-8">
          <p>© 2026 Orovion. All rights reserved. Built for the healthcare community.</p>
          <div className="flex gap-5">
            <Link to="/help" className="hover:text-brand-700">Help center</Link>
            <Link to="/privacy" className="hover:text-brand-700">Privacy</Link>
            <Link to="/terms" className="hover:text-brand-700">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TopLink({ to, label }) {
  return <Link to={to} className="rounded-full px-3 py-2 transition hover:bg-brand-50 hover:text-brand-700">{label}</Link>;
}

/** Plain bullet list for enumerations without lead-in labels. */
export function Bullets({ items }) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" aria-hidden />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/** "Review required" callout for policy areas still being finalized. */
export function Note({ title = "Review required", children }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-warning-500/20 bg-warning-50 p-3.5 text-sm text-ink-700">
      <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warning-500" />
      <span><strong className="font-semibold text-warning-700">{title}.</strong> {children}</span>
    </div>
  );
}

/** Checkmark bullet list matching the Figma legal screens. */
export function CheckList({ items }) {
  return (
    <ul className="space-y-2">
      {items.map(([head, rest], i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-1 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden><path d="M2.5 6.2 5 8.7l4.5-5.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
          <span><strong className="font-semibold text-ink-900">{head}</strong>{rest ? <> — {rest}</> : null}</span>
        </li>
      ))}
    </ul>
  );
}
