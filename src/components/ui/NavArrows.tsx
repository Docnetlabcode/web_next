"use client";
import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small back / forward history controls, shared by every page shell.
 *
 * - `inline`   — sits in a topbar (app header, legal header, admin console)
 * - `floating` — fixed glass pill for pages without a shared topbar
 *                (landing, login, onboarding, admin gate)
 *
 * Browsers don't expose "is there a forward entry?", so we track it ourselves:
 * going back banks a forward step, going forward spends one, and any fresh
 * navigation (link/push) clears the stack. The store lives at module level so
 * the state survives remounts when the user crosses page shells.
 */

const store = {
  fwd: 0,
  viaHistory: false, // the next pathname change came from back/forward, not a push
  listeners: new Set(),
  set(fwd) {
    this.fwd = Math.max(0, fwd);
    this.listeners.forEach((l) => l(this.fwd));
  },
};

export default function NavArrows({ variant = "inline", className }) {
  const nav = useNavigate();
  const pathname = usePathname();
  const [canBack, setCanBack] = useState(false);
  const [fwd, setFwd] = useState(store.fwd);

  // subscribe to the shared forward-stack
  useEffect(() => {
    const l = (n) => setFwd(n);
    store.listeners.add(l);
    return () => store.listeners.delete(l);
  }, []);

  // on every route change: refresh back-availability and, if the change was a
  // fresh push (not back/forward), clear the forward stack
  useEffect(() => {
    setCanBack(window.history.length > 1);
    if (store.viaHistory) store.viaHistory = false;
    else store.set(0);
    setFwd(store.fwd);
  }, [pathname]);

  // browser-native back/forward should also not clear the stack
  useEffect(() => {
    const onPop = () => { store.viaHistory = true; };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const back = () => {
    store.viaHistory = true;
    store.set(store.fwd + 1);
    nav(-1);
  };
  const forward = () => {
    store.viaHistory = true;
    store.set(store.fwd - 1);
    nav(1);
  };

  const btn = "press group grid place-items-center rounded-full border border-ink-900/[.08] bg-white text-ink-700 transition hover:border-brand-300 hover:text-brand-700 disabled:pointer-events-none disabled:opacity-35";
  const size = variant === "floating" ? "h-10 w-10" : "h-8 w-8 sm:h-9 sm:w-9";

  return (
    <div
      className={cn(
        "flex items-center gap-1",
        variant === "floating" && "glass fixed bottom-5 left-5 z-40 rounded-full p-1 shadow-3 print:hidden",
        className
      )}
    >
      <button
        onClick={back}
        disabled={!canBack}
        aria-label="Go back"
        title="Back"
        className={cn(btn, size, "hover:-translate-x-0.5")}
      >
        <ChevronLeft size={17} className="transition group-hover:-translate-x-0.5" />
      </button>
      <button
        onClick={forward}
        disabled={fwd === 0}
        aria-label="Go forward"
        title="Forward"
        className={cn(btn, size, "hover:translate-x-0.5")}
      >
        <ChevronRight size={17} className="transition group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}
