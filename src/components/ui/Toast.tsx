"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, Info, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Lightweight toast stack for optimistic-update feedback.
 *   const toast = useToast();
 *   toast.error("Couldn't save — try again");
 *   toast.success("Report submitted");
 *   toast.show("Author muted", { action: { label: "Undo", onClick: ... } });
 */
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info };
const TONE = {
  success: "text-brand-300",
  error: "text-rose-300",
  info: "text-sky-300",
};

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  // Portal only after mount — rendering it during hydration makes the client's
  // initial UI differ from the server HTML (hydration mismatch).
  const [mounted, setMounted] = useState(false);
  const timers = useRef({});

  useEffect(() => setMounted(true), []);

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    // flag as leaving so the exit animation plays before removal
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 240);
  }, []);

  const show = useCallback(
    (message, { type = "info", duration = 3800, action } = {}) => {
      const id = nextId++;
      setToasts((t) => [...t.slice(-3), { id, message, type, action }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const value = {
    show,
    dismiss,
    success: (m, o) => show(m, { ...o, type: "success" }),
    error: (m, o) => show(m, { ...o, type: "error" }),
    info: (m, o) => show(m, { ...o, type: "info" }),
  };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {mounted &&
        createPortal(
          <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[90] flex flex-col items-center gap-2 px-4">
            {toasts.map((t) => {
              const Icon = ICONS[t.type] || Info;
              return (
                <div
                  key={t.id}
                  role="status"
                  className={cn(
                    "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-ink-900/95 px-4 py-3 text-sm font-medium text-white shadow-4 backdrop-blur transition-all duration-200 ease-out",
                    t.leaving ? "translate-y-2 opacity-0" : "anim-toast-in"
                  )}
                >
                  <Icon size={17} className={cn("shrink-0", TONE[t.type])} />
                  <span className="flex-1">{t.message}</span>
                  {t.action && (
                    <button
                      onClick={() => { t.action.onClick?.(); dismiss(t.id); }}
                      className="press flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white transition hover:bg-white/20"
                    >
                      <Undo2 size={12} /> {t.action.label}
                    </button>
                  )}
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </ToastCtx.Provider>
  );
}
