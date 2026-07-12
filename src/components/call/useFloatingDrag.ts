"use client";

import { useRef, useState } from "react";

/**
 * Pointer-drag behaviour for the minimized (floating) call tile.
 * A press that moves < 6px is a tap → onTap (restore the call full-screen);
 * anything more drags the tile, clamped inside the viewport. Until the first
 * drag `style` is undefined so the tile sits at its CSS default position.
 * Give the tile `touch-none` so mobile browsers don't scroll while dragging.
 */
export function useFloatingDrag(onTap: () => void) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{
    startX: number; startY: number; x: number; y: number; w: number; h: number; moved: boolean;
  } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    drag.current = { startX: e.clientX, startY: e.clientY, x: r.left, y: r.top, w: r.width, h: r.height, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    setPos({
      x: Math.min(Math.max(8, d.x + dx), window.innerWidth - d.w - 8),
      y: Math.min(Math.max(8, d.y + dy), window.innerHeight - d.h - 8),
    });
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) onTap();
  };

  return {
    style: pos
      ? ({ left: pos.x, top: pos.y, right: "auto", bottom: "auto" } as React.CSSProperties)
      : undefined,
    handlers: { onPointerDown, onPointerMove, onPointerUp },
  };
}
