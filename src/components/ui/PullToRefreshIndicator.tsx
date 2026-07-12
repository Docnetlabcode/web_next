"use client";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/** Spinner that slides down from under the top bar as the user pulls / while refreshing. */
export default function PullToRefreshIndicator({ pull, refreshing, threshold = 70 }) {
  if (pull <= 0 && !refreshing) return null;
  const progress = Math.min(pull / threshold, 1);
  const y = Math.min(pull, threshold);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center"
      style={{ transform: `translateY(${y}px)`, opacity: refreshing ? 1 : progress }}
    >
      <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-brand-600 shadow-card ring-1 ring-ink-900/[.06]">
        <RefreshCw
          size={18}
          className={cn(refreshing && "animate-spin")}
          style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
        />
      </span>
    </div>
  );
}
