"use client";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "@/lib/router";
import { dok } from "@/lib/api";

/**
 * Top-bar notification bell with an unread COUNT badge (not just a red dot).
 * Polls /notifications/unread-count, and refreshes on window focus and whenever
 * the Notifications screen dispatches `dl:notifications-changed` (read/clear).
 */
export default function NotificationBell() {
  const nav = useNavigate();
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    dok.notifications
      .unread()
      .then((d) => setCount(Number(d?.count ?? d?.unreadCount ?? d?.unread ?? 0) || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 60000);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("dl:notifications-changed", refresh);
    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("dl:notifications-changed", refresh);
    };
  }, [refresh]);

  return (
    <button
      onClick={() => nav("/app/notifications")}
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      className="press relative grid h-10 w-10 place-items-center rounded-full text-ink-700 transition hover:bg-brand-50 hover:text-brand-700"
    >
      <Bell size={20} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-surface anim-pop">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
