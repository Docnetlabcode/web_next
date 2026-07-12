"use client";
import { Skeleton } from "@/components/ui/Primitives";
import { cn } from "@/lib/utils";

/* Shared shimmer skeletons — every loading surface uses these instead of
   spinners (DESIGN.md: "skeletons shimmer, never spinners inside content").
   All of them inherit theming from the Skeleton primitive (bg-ink-900/[.06]
   flips with the ink ramp; the shimmer sweep dims in dark mode). */

/** Feed/post cards: avatar header + text lines + media block. */
export function PostFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-3 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div>
          </div>
          <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-52 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

/** Rows of avatar + two text lines — people/item lists. `card` wraps them in one card. */
export function RowsSkeleton({ count = 4, avatar = true, card = false, className = "" }: { count?: number; avatar?: boolean; card?: boolean; className?: string }) {
  const rows = (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3.5">
          {avatar && <Skeleton className="h-10 w-10 shrink-0 rounded-full" />}
          <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
        </div>
      ))}
    </>
  );
  return card
    ? <div className={cn("card divide-y divide-ink-900/[.05]", className)}>{rows}</div>
    : <div className={cn("space-y-1", className)}>{rows}</div>;
}

/** Standalone list cards (one card per row) — notifications, request lists. */
export function CardRowsSkeleton({ count = 4, className = "space-y-2" }: { count?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex items-center gap-3 p-4">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-2/3" /><Skeleton className="h-3 w-2/5" /></div>
        </div>
      ))}
    </div>
  );
}

/** Grid of media tiles (reels, galleries). */
export function TileGridSkeleton({ count = 8, className = "grid grid-cols-2 gap-3 sm:grid-cols-3", tile = "aspect-[9/16] rounded-2xl" }: { count?: number; className?: string; tile?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => <Skeleton key={i} className={tile} />)}
    </div>
  );
}

/** Chat thread: bubbles alternating sides. */
export function ChatThreadSkeleton({ count = 6 }: { count?: number }) {
  const widths = ["w-48", "w-56", "w-36", "w-60", "w-40", "w-52"];
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn("flex", i % 2 ? "justify-end" : "justify-start")}>
          <Skeleton className={cn("h-10 max-w-[75%] rounded-2xl", widths[i % widths.length])} />
        </div>
      ))}
    </div>
  );
}

/** Paragraph lines for text-only sections (About tabs, summaries). */
export function TextBlockSkeleton({ lines = 4, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3.5", i === lines - 1 ? "w-1/2" : "w-full")} />
      ))}
    </div>
  );
}

/** Detail/form page: heading + a few field/section blocks. */
export function DetailSkeleton({ blocks = 3 }: { blocks?: number }) {
  return (
    <div className="space-y-4">
      <div className="card space-y-3 p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
        </div>
      </div>
      {Array.from({ length: blocks }).map((_, i) => (
        <div key={i} className="card space-y-3 p-5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

/** Stat tiles grid (admin overview). */
export function StatGridSkeleton({ count = 6, className = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" }: { count?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-2 p-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-12" />
        </div>
      ))}
    </div>
  );
}
