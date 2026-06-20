"use client";
import { NavLink, useNavigate, Link, useLocation, Navigate } from "@/lib/router";
import {
  Home, Clapperboard, Stethoscope, Users, MessageSquare,
  Bell, Bookmark, Search, Plus, LogOut, Settings,
} from "lucide-react";
import { Avatar, Logo, Verified, Spinner } from "@/components/ui/Primitives";
import NavArrows from "@/components/ui/NavArrows";
import NotificationBell from "@/components/ui/NotificationBell";
import { useAuth } from "@/context/AuthContext";
import { cn, compact } from "@/lib/utils";
import { useState, useEffect } from "react";

const NAV = [
  { to: "/app", icon: Home, label: "Home", end: true },
  { to: "/app/reels", icon: Clapperboard, label: "Pulse" },
  { to: "/app/cases", icon: Stethoscope, label: "Cases" },
  { to: "/app/network", icon: Users, label: "Network" },
  { to: "/app/messages", icon: MessageSquare, label: "Messages" },
  { to: "/app/notifications", icon: Bell, label: "Notifications" },
  { to: "/app/saved", icon: Bookmark, label: "Saved" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, demo, isProfileComplete, logout } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [menu, setMenu] = useState(false);

  // Route guards (previously <Protected> + <RequireProfile> in the router).
  if (loading) return <AppLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!demo && !isProfileComplete) return <Navigate to="/onboarding" replace />;

  return (
    <div className="min-h-screen bg-[#f4f6f6]">
      <RouteProgress trigger={location.pathname} />
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b border-ink-900/[.06] glass">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/app"><Logo /></Link>
          <NavArrows />
          <form
            onSubmit={(e) => { e.preventDefault(); const q = e.target.q.value.trim(); if (q) nav(`/app/search?q=${encodeURIComponent(q)}`); }}
            className="relative ml-2 hidden max-w-md flex-1 sm:block"
          >
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input name="q" placeholder="Search people, specialties, papers…" className="w-full rounded-full border border-ink-900/10 bg-white/80 py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
          </form>
          <div className="flex-1 sm:hidden" />
          <button onClick={() => nav("/app/create")} className="btn-primary hidden px-4 py-2 text-sm sm:inline-flex">
            <Plus size={17} /> Create
          </button>
          <NotificationBell />
          <div className="relative">
            <button onClick={() => setMenu((m) => !m)} className="rounded-full ring-2 ring-transparent transition hover:ring-brand-200">
              <Avatar user={user} size={38} />
            </button>
            {menu && (
              <div onMouseLeave={() => setMenu(false)} className="absolute right-0 mt-2 w-56 animate-scale-in rounded-2xl border border-ink-900/[.06] bg-white p-2 shadow-card">
                <Link to="/app/profile" className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-ink-900/5">
                  <Avatar user={user} size={36} />
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 truncate text-sm font-semibold">{user?.fullName} {user?.isVerified && <Verified size={12} />}</p>
                    <p className="truncate text-xs text-ink-500">View profile</p>
                  </div>
                </Link>
                <div className="my-1 h-px bg-ink-900/[.06]" />
                <MenuItem icon={Settings} label="Settings" onClick={() => nav("/app/settings")} />
                <MenuItem icon={LogOut} label="Log out" onClick={() => { logout(); nav("/"); }} />
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        {/* Left nav */}
        <aside className="sticky top-[5.5rem] hidden h-fit w-60 shrink-0 lg:block">
          <nav className="space-y-1">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end}
                className={({ isActive }) => cn(
                  "flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition",
                  isActive ? "bg-brand-600 text-white shadow-glow" : "text-ink-700 hover:bg-brand-50 hover:text-brand-700"
                )}>
                <n.icon size={20} /> {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white shadow-glow">
            <p className="text-sm font-semibold">Verified by license.</p>
            <p className="mt-1 text-xs text-white/80">Get your MD badge and unlock consults.</p>
            <button onClick={() => nav("/app/profile")} className="mt-3 w-full rounded-full bg-white py-2 text-xs font-bold text-brand-700">Start verification</button>
          </div>
        </aside>

        {/* Page */}
        <main className="min-w-0 flex-1">
          <div key={location.pathname} className="animate-[fade-up_.42s_cubic-bezier(.21,.65,.36,1)_both]">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-ink-900/[.06] bg-white/90 py-2 backdrop-blur lg:hidden">
        {NAV.slice(0, 5).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) => cn("rounded-xl p-2.5", isActive ? "text-brand-600" : "text-ink-400")}>
            <n.icon size={22} />
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** App-shell loader. After a few seconds it explains the likely cold-start wait
 *  so a sleeping free-tier backend doesn't look like a frozen app. */
function AppLoading() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="flex max-w-xs flex-col items-center gap-3 text-center">
        <Spinner className="h-8 w-8" />
        {slow && (
          <p className="text-sm leading-relaxed text-ink-500">
            Waking up the server… the backend sleeps when idle and can take up to a minute to respond.
          </p>
        )}
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-sm font-medium text-ink-700 hover:bg-ink-900/5">
      <Icon size={18} /> {label}
    </button>
  );
}

/** Thin gradient bar that fills on each route change. */
function RouteProgress({ trigger }) {
  const [stage, setStage] = useState("done"); // start -> done
  useEffect(() => {
    setStage("start");
    const a = setTimeout(() => setStage("mid"), 30);
    const b = setTimeout(() => setStage("done"), 480);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [trigger]);
  const width = stage === "start" ? "8%" : stage === "mid" ? "92%" : "100%";
  const opacity = stage === "done" ? 0 : 1;
  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-0.5">
      <div
        className="h-full bg-gradient-to-r from-brand-400 via-brand-600 to-brand-500 shadow-glow transition-all duration-300 ease-out"
        style={{ width, opacity }}
      />
    </div>
  );
}
