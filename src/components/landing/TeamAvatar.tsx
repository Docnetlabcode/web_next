"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { TeamMember } from "@/lib/team";

/** Team portrait with a graceful fallback to an initials monogram when the
    photo is missing or broken (the /public/team files are placeholders). */
export default function TeamAvatar({ member, className = "h-20 w-20 text-xl" }: { member: Pick<TeamMember, "name" | "photo">; className?: string }) {
  const [broken, setBroken] = useState(false);
  const initials = member.name.replace(/^Dr\.?\s*/i, "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const frame = cn("rounded-2xl ring-1 ring-ink-900/[.06] shadow-card", className);
  if (member.photo && !broken) {
    return <img src={member.photo} alt={member.name} onError={() => setBroken(true)} className={cn(frame, "object-cover")} />;
  }
  return (
    <span className={cn("grid shrink-0 place-items-center bg-gradient-to-br from-brand-600 to-brand-800 font-display font-extrabold text-white", frame)}>
      {initials}
    </span>
  );
}
