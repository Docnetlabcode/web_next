"use client";
import { useEffect, useState } from "react";
import { Link } from "@/lib/router";
import {
  ShieldCheck, Stethoscope, Clapperboard, Users, MessageSquare, FileText,
  ArrowRight, Heart, MessageCircle, BadgeCheck, Activity, Search, Sparkles,
  Linkedin, Twitter, Instagram, Mail, MapPin, Phone,
} from "lucide-react";
import { Logo, Avatar, Verified } from "@/components/ui/Primitives";
import NavArrows from "@/components/ui/NavArrows";
import { useScrollReveal, cn } from "@/lib/utils";

// Illustrative people for the marketing page only (pre-login showcase — not live data).
const SAMPLE = [
  { _id: "s1", fullName: "Dr. Sara Reyes", role: "doctor", professionalHeadline: "Pediatric Oncologist · AIIMS", isVerified: true },
  { _id: "s2", fullName: "Dr. Daniel Kovač", role: "doctor", professionalHeadline: "Interventional Cardiology · AKH Vienna", isVerified: true },
  { _id: "s3", fullName: "Dr. Elena Novak", role: "doctor", professionalHeadline: "Neurology · Charité Berlin", isVerified: true },
  { _id: "s4", fullName: "Dr. Vikram Nair", role: "doctor", professionalHeadline: "Cardiothoracic Surgery", isVerified: true },
];

export default function Landing() {
  useScrollReveal();
  return (
    <div className="overflow-x-clip bg-white">
      <NavArrows variant="floating" />
      <Nav />
      <Hero />
      <Features />
      <Roles />
      <Showcase />
      <Team />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled ? "glass border-b border-ink-900/[.06] shadow-2" : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="container-x flex h-20 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-medium text-ink-700 md:flex">
          <a href="#features" className="transition hover:text-brand-700">Features</a>
          <a href="#roles" className="transition hover:text-brand-700">For clinicians</a>
          <a href="#showcase" className="transition hover:text-brand-700">Showcase</a>
          <a href="#team" className="transition hover:text-brand-700">Team</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-primary px-5 py-2.5 text-sm">Get started</Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative">
      <div className="absolute inset-0 mesh" />
      <div className="absolute inset-x-0 top-0 h-[600px] grid-bg" />
      <div className="container-x relative grid items-center gap-12 pb-20 pt-16 lg:grid-cols-2 lg:pb-28 lg:pt-20">
        <div>
          <span className="inline-flex animate-fade-in items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-500" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
            </span>
            Verified by license. Always private.
          </span>
          <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-ink-900 text-balance sm:text-6xl lg:text-7xl">
            A trusted network <br /> of <span className="text-gradient">clinicians.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-500">
            DokLynk brings cases, research, reels and real-time consults into one
            professional home for doctors, medical students and patients.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/login" className="btn-primary group px-6 py-3.5 text-base">
              Join the DokLynk <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </Link>
            <Link to="/app" className="btn-outline px-6 py-3.5 text-base">Explore as guest</Link>
          </div>
          <div className="mt-9 flex items-center gap-4">
            <div className="flex -space-x-3">
              {SAMPLE.slice(0, 4).map((u) => <Avatar key={u._id} user={u} size={38} className="ring-2 ring-white" />)}
            </div>
            <p className="text-sm text-ink-500"><b className="text-ink-900">12,400+</b> verified clinicians already onboard</p>
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
      <div className="absolute -left-6 top-12 z-20 hidden animate-float rounded-2xl bg-white p-3 shadow-card sm:flex sm:items-center sm:gap-2" style={{ animationDelay: ".4s" }}>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50"><BadgeCheck size={18} className="text-brand-600" /></span>
        <div><p className="text-xs font-bold">License verified</p><p className="text-[10px] text-ink-400">MD · MGH</p></div>
      </div>
      {/* floating reaction pill */}
      <div className="absolute -right-4 bottom-24 z-20 hidden animate-float rounded-2xl bg-white px-3 py-2 shadow-card sm:flex sm:items-center sm:gap-2" style={{ animationDelay: "1.2s" }}>
        <Heart size={16} className="fill-rose-500 text-rose-500" />
        <span className="text-xs font-bold">+248</span>
        <MessageCircle size={16} className="ml-1 text-ink-400" />
        <span className="text-xs font-bold">34</span>
      </div>

      {/* main card — image-free, fully on-brand (no external media) */}
      <div className="relative z-10 rounded-3xl border border-ink-900/[.06] bg-white p-5 shadow-card">
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
  { icon: Stethoscope, title: "Clinical cases", text: "Share de-identified cases with structured snapshots — age, complaints, urgency — and crowdsource expertise." },
  { icon: Clapperboard, title: "Medical Pulse reels", text: "Short-form teaching videos. Learn an ECG in 60 seconds or a suturing technique on the go." },
  { icon: FileText, title: "Research & thesis", text: "Publish papers, theses and research with collaborators, DOCX & PDF attachments." },
  { icon: Users, title: "Professional network", text: "LinkedIn-style connections plus follows. Build an audience and your reputation." },
  { icon: MessageSquare, title: "Real-time consults", text: "WhatsApp-grade chat with read receipts, media, and paid video consultation requests." },
  { icon: ShieldCheck, title: "License verification", text: "Every health professional is checked against medical registries before the badge appears." },
];

function Features() {
  useScrollReveal();
  return (
    <section id="features" className="bg-[#f4f6f6] py-24">
      <div className="container-x">
        <div className="reveal mx-auto max-w-2xl text-center">
          <span className="chip bg-brand-50 text-brand-700"><Sparkles size={14} /> Everything in one place</span>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink-900 text-balance sm:text-5xl">
            Built for how clinicians actually work
          </h2>
          <p className="mt-4 text-lg text-ink-500">From the first case discussion to your next consultation — one platform, zero noise.</p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
  { tag: "Health Professionals", title: "Build your clinical presence", points: ["Verified MD badge", "Run paid online consults", "Grow followers with reels & cases"], color: "from-brand-600 to-brand-800" },
  { tag: "Medical Students", title: "Learn from the best", points: ["Follow mentors & specialties", "Share thesis & research", "Open-to-mentorship matching"], color: "from-amber-500 to-amber-700" },
  { tag: "General Users", title: "Trusted health knowledge", points: ["Discover verified clinicians", "Follow, save & message", "Wellness & health-Q&A feeds"], color: "from-teal-600 to-emerald-700" },
];
function Roles() {
  useScrollReveal();
  return (
    <section id="roles" className="container-x py-24">
      <div className="reveal mx-auto max-w-2xl text-center">
        <h2 className="font-display text-4xl font-extrabold tracking-tight text-ink-900 text-balance sm:text-5xl">One network, three journeys</h2>
        <p className="mt-4 text-lg text-ink-500">Whether you treat, study or seek care — DokLynk meets you where you are.</p>
      </div>
      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {ROLES.map((r, i) => (
          <div key={r.tag} className="reveal overflow-hidden rounded-3xl border border-ink-900/[.06] bg-white shadow-card" style={{ transitionDelay: `${i * 80}ms` }}>
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
    <section id="showcase" className="bg-[#f4f6f6] py-24">
      <div className="container-x grid items-center gap-14 lg:grid-cols-2">
        <div className="reveal">
          <span className="chip bg-brand-50 text-brand-700"><Activity size={14} /> Real-time everything</span>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink-900 text-balance sm:text-5xl">Search, discover, and connect — instantly</h2>
          <p className="mt-4 text-lg text-ink-500">Find specialists by name or specialty, follow trending discussions, and start a consult in two taps. Powered by a real-time engine with live presence and read receipts.</p>
          <div className="mt-7 space-y-3">
            {["Live trending in your specialty", "Smart search across people, posts & hashtags", "Online presence & typing indicators"].map((t) => (
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
                  <div className="flex-1"><p className="flex items-center gap-1 text-sm font-semibold">{u.fullName} <Verified size={13} /></p><p className="text-xs text-ink-400">{u.professionalHeadline}</p></div>
                  <button className="btn-ghost px-3 py-1.5 text-xs">+ Connect</button>
                </div>
              ))}
              <div className="rounded-xl bg-brand-50 p-3">
                <span className="chip bg-white text-brand-700 text-[10px] uppercase">Trending</span>
                <p className="mt-1.5 text-sm font-semibold text-ink-900">#SCAD · +312 posts this week</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// TODO: replace these placeholders with the real founding team (names, roles, bios, photos).
const TEAM = [
  { name: "Aarav Mehta", role: "Founder & CEO", bio: "Built DokLynk to give clinicians a trusted, license-verified home for clinical knowledge." },
  { name: "Dr. Riya Sharma", role: "Co-founder & Chief Medical Officer", bio: "Practising physician shaping the clinical safety, verification and consult experience." },
  { name: "Karan Patel", role: "Co-founder & CTO", bio: "Leads the real-time platform — feed, chat and consults built for speed and privacy." },
];

function Team() {
  useScrollReveal();
  return (
    <section id="team" className="container-x py-24">
      <div className="reveal mx-auto max-w-2xl text-center">
        <span className="chip bg-brand-50 text-brand-700"><Users size={14} /> The people behind DokLynk</span>
        <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink-900 text-balance sm:text-5xl">Meet the team</h2>
        <p className="mt-4 text-lg text-ink-500">Clinicians and engineers building a network the medical community can trust.</p>
      </div>
      <div className="mx-auto mt-14 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {TEAM.map((m, i) => (
          <div key={m.name} className="reveal card flex flex-col items-center p-7 text-center transition hover:-translate-y-1 hover:shadow-glow" style={{ transitionDelay: `${i * 80}ms` }}>
            <Avatar user={{ fullName: m.name }} size={84} className="ring-4 ring-brand-50" />
            <h3 className="mt-4 text-base font-bold text-ink-900">{m.name}</h3>
            <span className="chip mt-2 bg-brand-50 text-brand-700">{m.role}</span>
            <p className="mt-3 text-sm leading-relaxed text-ink-500">{m.bio}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="container-x py-24">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-8 py-16 text-center shadow-glow sm:px-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative">
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-white text-balance sm:text-5xl">Join the network built on trust</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">Create your verified profile in minutes. Free for students and general users.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/login" className="btn px-7 py-3.5 text-base bg-white text-brand-700 hover:bg-white/90">Join the DokLynk</Link>
            <Link to="/app" className="btn px-7 py-3.5 text-base border border-white/40 text-white hover:bg-white/10">Continue browsing</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// TODO: swap "#" social hrefs and the contact details for the real handles.
const SOCIALS = [
  { icon: Twitter, label: "X (Twitter)", href: "#" },
  { icon: Linkedin, label: "LinkedIn", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
];

function FooterCol({ title, links }) {
  return (
    <div>
      <h4 className="text-sm font-bold uppercase tracking-wide text-white/90">{title}</h4>
      <ul className="mt-4 space-y-3 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            {l.to
              ? <Link to={l.to} className="text-white/70 transition hover:text-white">{l.label}</Link>
              : <a href={l.href} className="text-white/70 transition hover:text-white">{l.label}</a>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Footer() {
  return (
    <footer className="relative overflow-hidden bg-brand-900 text-white">
      <div className="absolute inset-0 grid-bg opacity-[.12]" />
      <div className="container-x relative">
        <div className="grid gap-10 py-16 md:grid-cols-2 lg:grid-cols-5">
          {/* brand + socials */}
          <div className="lg:col-span-2">
            <Logo light />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              A license-verified network for clinicians, medical students and patients — cases,
              research, reels and real-time consults in one trusted home.
            </p>
            <div className="mt-6 flex gap-2.5">
              {SOCIALS.map((s) => (
                <a key={s.label} href={s.href} aria-label={s.label}
                  className="press grid h-10 w-10 place-items-center rounded-full bg-white/10 ring-1 ring-white/15 transition hover:bg-white/20">
                  <s.icon size={17} />
                </a>
              ))}
            </div>
          </div>

          <FooterCol title="Product" links={[
            { label: "Features", href: "#features" },
            { label: "For clinicians", href: "#roles" },
            { label: "Showcase", href: "#showcase" },
            { label: "Explore", to: "/app" },
          ]} />

          <FooterCol title="Company" links={[
            { label: "About", href: "#showcase" },
            { label: "Meet the team", href: "#team" },
            { label: "Careers", href: "#" },
            { label: "Blog", href: "#" },
          ]} />

          {/* contact */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide text-white/90">Contact</h4>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-2.5"><Mail size={15} className="shrink-0 text-white/50" /> hello@doklynk.com</li>
              <li className="flex items-center gap-2.5"><Phone size={15} className="shrink-0 text-white/50" /> +91 80 4718 2200</li>
              <li className="flex items-start gap-2.5"><MapPin size={15} className="mt-0.5 shrink-0 text-white/50" /> Bengaluru, Karnataka, India</li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-4 text-sm">
              <Link to="/privacy" className="text-white/70 transition hover:text-white">Privacy</Link>
              <Link to="/terms" className="text-white/70 transition hover:text-white">Terms</Link>
              <Link to="/help" className="text-white/70 transition hover:text-white">Help</Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 py-6 text-sm text-white/55 sm:flex-row">
          <p>© 2026 DokLynk. All rights reserved.</p>
          <p>Built for clinicians, students &amp; patients.</p>
        </div>
      </div>
    </footer>
  );
}
