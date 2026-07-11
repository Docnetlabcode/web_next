"use client";
import { cn, initials, avatarColor } from "@/lib/utils";
import { BadgeCheck } from "lucide-react";

export function Avatar({ user, size = 40, className = "" }: { user?: any; size?: number; className?: string }) {
  const s = { width: size, height: size, fontSize: size * 0.38 };
  if (user?.profilePhoto) {
    return (
      <img
        src={user.profilePhoto}
        alt={user.fullName}
        style={s}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }
  return (
    <div
      style={{ ...s, background: avatarColor(user?.fullName || user?._id || "?") }}
      className={cn("flex items-center justify-center rounded-full font-bold text-white", className)}
    >
      {initials(user?.fullName || "?")}
    </div>
  );
}

export function Verified({ size = 15, className = "" }: { size?: number; className?: string }) {
  return <BadgeCheck size={size} className={cn("inline-block text-brand-600 fill-brand-100", className)} />;
}

/**
 * Orovion brand lockup (assets in /public/brand, source: /LOGO).
 * `light` = rendered on a dark background → primary (white) variant;
 * default = secondary (ink #0E1213) variant for light backgrounds.
 * `withText` renders the full wordmark (icon + "orovion" typeface, 5.2:1);
 * otherwise the square icon alone.
 */
export function Logo({ size = 30, withText = true, light = false }) {
  const variant = light ? "primary" : "secondary";
  if (!withText) {
    return (
      <img
        src={`/brand/icon-${variant}.svg`}
        alt="Orovion"
        width={size}
        height={size}
        draggable={false}
        className="select-none"
      />
    );
  }
  return (
    <img
      src={`/brand/wordmark-${variant}.svg`}
      alt="Orovion"
      height={size}
      style={{ height: size, width: "auto" }}
      draggable={false}
      className="select-none"
    />
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={cn("inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600", className)}
    />
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-ink-900/[.06]", className)}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

const ROLE = {
  doctor: { label: "Health Professional", cls: "bg-brand-50 text-brand-700" },
  student: { label: "Medical Student", cls: "bg-amber-50 text-amber-700" },
  general_user: { label: "General User", cls: "bg-ink-900/5 text-ink-700" },
};
export function RoleBadge({ role }) {
  const r = ROLE[role] || ROLE.general_user;
  return <span className={cn("chip", r.cls)}>{r.label}</span>;
}

const TYPE = {
  research: "Research", thesis: "Thesis", case_study: "Case Study",
};
export function PostTypeBadge({ type }) {
  if (!type || type === "post") return null;
  return <span className="chip bg-brand-600/10 text-brand-700 uppercase tracking-wide text-[10px]">{TYPE[type]}</span>;
}
