"use client";
import { useState, useEffect } from "react";
import { Link, Navigate } from "@/lib/router";
import {
  ShieldCheck, Stethoscope, Clapperboard, Users, MessageSquare, FileText,
  ArrowRight, Heart, MessageCircle, BadgeCheck, Activity, Search, Sparkles,
} from "lucide-react";
import { Avatar, Verified, Spinner } from "@/components/ui/Primitives";
import NavArrows from "@/components/ui/NavArrows";
import StoreBadge from "@/components/ui/StoreBadge";
import { SiteNav, SiteFooter } from "@/components/landing/SiteChrome";
import TeamAvatar from "@/components/landing/TeamAvatar";
import { TEAM } from "@/lib/team";
import { useScrollReveal } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

// Illustrative people for the marketing page only (pre-login showcase — not live data).
const SAMPLE = [
  { _id: "s1", fullName: "Dr. Sara Reyes", role: "doctor", professionalHeadline: "Pediatric Oncologist · AIIMS", isVerified: true },
  { _id: "s2", fullName: "Dr. Daniel Kovač", role: "doctor", professionalHeadline: "Interventional Cardiology · AKH Vienna", isVerified: true },
  { _id: "s3", fullName: "Dr. Elena Novak", role: "doctor", professionalHeadline: "Neurology · Charité Berlin", isVerified: true },
  { _id: "s4", fullName: "Dr. Vikram Nair", role: "doctor", professionalHeadline: "Cardiothoracic Surgery", isVerified: true },
];

export default function Landing() {
  const { user, loading, isProfileComplete } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useScrollReveal();

  // A returning, already-signed-in visitor should open their account, not the
  // marketing page. Once the silent refresh resolves, redirect. Until then, if a
  // session probably exists (the readable dl_csrf hint), show a neutral splash
  // instead of flashing the landing. Gated on `mounted` so the server-rendered
  // and first client render both show the landing — no hydration mismatch.
  if (!loading && user) return <Navigate to={isProfileComplete ? "/app" : "/onboarding"} replace />;
  const sessionHint = mounted && typeof window !== "undefined" && !!localStorage.getItem("dl_csrf");
  if (loading && sessionHint) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-50">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  return (
    <div className="overflow-x-clip bg-surface">
      <NavArrows variant="floating" />
      <SiteNav />
      <Hero />
      <Features />
      <Roles />
      <Showcase />
      <Team />
      <CTA />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative">
      <div className="absolute inset-0 mesh" />
      <div className="absolute inset-x-0 top-0 h-[600px] grid-bg" />
      <div className="container-x relative grid items-center gap-10 pb-16 pt-10 sm:gap-12 sm:pt-16 lg:grid-cols-2 lg:pb-28 lg:pt-20">
        <div>
          <span className="inline-flex animate-fade-in items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-500" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
            </span>
            Verified Professionals. Trusted connections.
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-ink-900 text-balance sm:text-5xl sm:leading-[1.05] md:text-6xl xl:text-7xl">
            Where healthcare <br className="hidden sm:block" /> <span className="text-gradient">comes together.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-500">
            Orovion brings healthcare professionals, medical students and people
            into one trusted network to connect, share knowledge and access
            private consultations.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/login" className="btn-primary group px-6 py-3.5 text-base">
              Join Orovion <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </Link>
            <Link to="/app" className="btn-outline px-6 py-3.5 text-base">Explore as guest</Link>
          </div>
          {/* mobile app: badges route to /mobile-app until the store listings go live */}
          <div className="mt-8">
            <div className="flex flex-wrap items-center gap-2.5">
              <Link to="/mobile-app" className="group press" aria-label="Orovion on the App Store — learn more">
                <StoreBadge store="apple" />
              </Link>
              <Link to="/mobile-app" className="group press" aria-label="Orovion on Google Play — learn more">
                <StoreBadge store="google" />
              </Link>
            </div>
            <p className="mt-2.5 text-xs text-ink-400">Your healthcare network, wherever you go.</p>
          </div>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md animate-fade-up">
      {/* floating verified pill */}
      <div className="absolute -left-6 top-12 z-20 hidden animate-float rounded-2xl bg-surface p-3 shadow-card sm:flex sm:items-center sm:gap-2" style={{ animationDelay: ".4s" }}>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50"><BadgeCheck size={18} className="text-brand-600" /></span>
        <div><p className="text-xs font-bold">License verified</p><p className="text-[10px] text-ink-400">MD · MGH</p></div>
      </div>
      {/* floating reaction pill */}
      <div className="absolute -right-4 bottom-24 z-20 hidden animate-float rounded-2xl bg-surface px-3 py-2 shadow-card sm:flex sm:items-center sm:gap-2" style={{ animationDelay: "1.2s" }}>
        <Heart size={16} className="fill-rose-500 text-rose-500" />
        <span className="text-xs font-bold">+248</span>
        <MessageCircle size={16} className="ml-1 text-ink-400" />
        <span className="text-xs font-bold">34</span>
      </div>

      {/* main card — image-free, fully on-brand (no external media) */}
      <div className="relative z-10 rounded-3xl border border-ink-900/[.06] bg-surface p-5 shadow-card">
        <div className="flex items-center gap-3">
          <Avatar user={SAMPLE[1]} size={46} />
          <div className="flex-1">
            <p className="flex items-center gap-1 text-sm font-bold">{SAMPLE[1].fullName} <Verified size={14} /></p>
            <p className="text-xs text-ink-400">{SAMPLE[1].professionalHeadline} · 4h</p>
          </div>
          <span className="chip bg-brand-600/10 text-brand-700 text-[10px] uppercase">Case</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">
          Unusual STEMI in a 38-year-old marathon runner — SCAD on angiography.
          How are you managing antiplatelet duration?
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[Activity, Stethoscope, FileText].map((Icon, i) => (
            <div key={i} className="grid aspect-square place-items-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600">
              <Icon size={22} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          {["Cardiology", "SCAD"].map((t) => <span key={t} className="chip bg-brand-50 text-brand-700">{t}</span>)}
        </div>
      </div>

      {/* back card */}
      <div className="absolute -bottom-6 left-8 right-8 -z-0 h-40 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 opacity-90 shadow-glow" />
    </div>
  );
}

const FEATURES = [
  { icon: Stethoscope, title: "Clinical cases", text: "Share de-identified clinical cases, add relevant case details and discuss perspectives with the professional community." },
  { icon: Clapperboard, title: "Medical Pulse reels", text: "Discover short-form healthcare content, clinical insights and educational videos shared by the community." },
  { icon: FileText, title: "Research & thesis", text: "Share research, papers and thesis work, collaborate with peers and attach supporting documents." },
  { icon: Users, title: "Professional network", text: "Connect with healthcare professionals, follow relevant people and build your professional presence." },
  { icon: MessageSquare, title: "Real-time consults", text: "Message privately and send consultation requests to available healthcare professionals." },
  { icon: ShieldCheck, title: "License verification", text: "Healthcare professionals complete a credential and identity verification process before receiving a verified badge." },
];

function Features() {
  useScrollReveal();
  return (
    <section id="features" className="bg-ink-50 py-16 sm:py-24">
      <div className="container-x">
        <div className="reveal mx-auto max-w-2xl text-center">
          <span className="chip bg-brand-50 text-brand-700"><Sparkles size={14} /> Everything in one place</span>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink-900 text-balance sm:text-5xl">
            Everything healthcare needs to connect.
          </h2>
          <p className="mt-4 text-lg text-ink-500">From professional discussions and research to discovery and private consultations — connected in one platform.</p>
        </div>
        <div className="mt-10 grid gap-5 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="reveal card group p-6 transition hover:-translate-y-1 hover:shadow-glow" style={{ transitionDelay: `${i * 60}ms` }}>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-white shadow-glow transition group-hover:scale-110">
                <f.icon size={22} />
              </span>
              <h3 className="mt-5 text-lg font-bold text-ink-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const ROLES = [
  { tag: "Health Professionals", title: "Build your clinical presence", points: ["Verified professional profile", "Accept consultation requests, when enabled", "Grow followers with reels & cases"], color: "from-brand-600 to-brand-800" },
  { tag: "Medical Students", title: "Learn from the best", points: ["Follow mentors & specialties", "Share thesis & research", "Connect with professionals and peers"], color: "from-amber-500 to-amber-700" },
  { tag: "General Users", title: "Trusted healthcare connections", points: ["Discover verified professionals", "Follow, save & message", "Access healthcare content"], color: "from-teal-600 to-emerald-700" },
];
function Roles() {
  useScrollReveal();
  return (
    <section id="roles" className="container-x py-16 sm:py-24">
      <div className="reveal mx-auto max-w-2xl text-center">
        <h2 className="font-display text-4xl font-extrabold tracking-tight text-ink-900 text-balance sm:text-5xl">One network, three journeys</h2>
        <p className="mt-4 text-lg text-ink-500">Whether you practise, study or seek healthcare guidance, Orovion creates an experience around your role.</p>
      </div>
      <div className="mt-10 grid gap-6 sm:mt-14 md:grid-cols-3">
        {ROLES.map((r, i) => (
          <div key={r.tag} className="reveal overflow-hidden rounded-3xl border border-ink-900/[.06] bg-surface shadow-card" style={{ transitionDelay: `${i * 80}ms` }}>
            <div className={`bg-gradient-to-br ${r.color} p-6 text-white`}>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/80">{r.tag}</p>
              <h3 className="mt-1 font-display text-2xl font-bold">{r.title}</h3>
            </div>
            <ul className="space-y-3 p-6">
              {r.points.map((p) => (
                <li key={p} className="flex items-center gap-3 text-sm text-ink-700">
                  <BadgeCheck size={18} className="text-brand-600" /> {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function Showcase() {
  useScrollReveal();
  return (
    <section id="showcase" className="bg-ink-50 py-16 sm:py-24">
      <div className="container-x grid items-center gap-10 md:grid-cols-2 lg:gap-14">
        <div className="reveal">
          <span className="chip bg-brand-50 text-brand-700"><Activity size={14} />Connected in real time</span>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink-900 text-balance sm:text-5xl">Search, discover, and connect — instantly</h2>
          <p className="mt-4 text-lg text-ink-500">Find healthcare professionals by name or specialty, follow relevant discussions and connect through one real-time platform.</p>
          <div className="mt-7 space-y-3">
            {["Discover people, specialties and discussions", "Search across professionals and content", "Real-time messaging, presence and activity"].map((t) => (
              <div key={t} className="flex items-center gap-3 text-ink-700"><span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-white"><BadgeCheck size={15} /></span>{t}</div>
            ))}
          </div>
        </div>
        <div className="reveal relative">
          <div className="card overflow-hidden p-5">
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
              <div className="w-full rounded-full border border-ink-900/10 py-2.5 pl-11 text-sm text-ink-400">SCAD case</div>
            </div>
            <div className="mt-4 space-y-3">
              {SAMPLE.slice(0, 2).map((u) => (
                <div key={u._id} className="flex items-center gap-3 rounded-xl border border-ink-900/[.05] p-3">
                  <Avatar user={u} size={40} />
                  <div className="min-w-0 flex-1"><p className="flex items-center gap-1 truncate text-sm font-semibold">{u.fullName} <Verified size={13} /></p><p className="truncate text-xs text-ink-400">{u.professionalHeadline}</p></div>
                  <button className="btn-ghost shrink-0 px-3 py-1.5 text-xs">+ Connect</button>
                </div>
              ))}
              <div className="rounded-xl bg-brand-50 p-3">
                <span className="chip bg-surface text-brand-700 text-[10px] uppercase">Trending</span>
                <p className="mt-1.5 text-sm font-semibold text-ink-900">#SCAD · +312 posts this week</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const firstName = (name: string) => name.replace(/^Dr\.?\s*/i, "").split(/\s+/)[0];

function Team() {
  useScrollReveal();
  return (
    <section id="team" className="container-x py-16 sm:py-24">
      <div className="reveal mx-auto max-w-2xl text-center">
        <span className="chip bg-brand-50 text-brand-700"><Users size={14} /> The people behind Orovion</span>
        <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink-900 text-balance sm:text-5xl">Meet the team</h2>
        <p className="mt-4 text-lg text-ink-500">Built by a multidisciplinary team working across product, technology and healthcare collaboration.</p>
      </div>
      <div className="mt-10 grid gap-6 sm:mt-14 md:grid-cols-3">
        {TEAM.map((m, i) => (
          <Link
            key={m.slug}
            to={`/team#${m.slug}`}
            className="reveal card group flex flex-col p-6 transition duration-300 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-glow"
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center gap-4">
              <TeamAvatar member={m} className="h-16 w-16 shrink-0 text-lg" />
              <div className="min-w-0">
                <h3 className="truncate font-display text-lg font-bold text-ink-900 transition group-hover:text-brand-700">{m.name}</h3>
                <p className="text-sm font-semibold text-brand-700">{m.role}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-500">{m.tagline}</p>
            <div className="mb-5 mt-4 flex flex-wrap gap-1.5">
              {m.focus.slice(0, 2).map((f) => <span key={f} className="chip bg-brand-50 text-brand-700">{f}</span>)}
            </div>
            <span className="mt-auto flex items-center gap-1.5 border-t border-ink-900/[.06] pt-4 text-sm font-semibold text-brand-700">
              Read {firstName(m.name)}&rsquo;s story <ArrowRight size={15} className="transition group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="container-x py-16 sm:py-24">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 py-12 text-center shadow-glow sm:px-16 sm:py-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-white text-balance sm:text-4xl lg:text-5xl">Join the network built on trust</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">Create your profile and join a healthcare network built for professionals, students and people seeking trusted connections.</p>
          <div className="mt-8 flex justify-center">
            <Link to="/login" className="btn px-7 py-3.5 text-base bg-white text-[rgb(var(--brand-700))] hover:bg-white/90">Join Orovion</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
