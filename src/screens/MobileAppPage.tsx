"use client";
import { Link } from "@/lib/router";
import {
  BadgeCheck, Bell, Clapperboard, Heart, MessageCircle, MessageSquare,
  Phone, Play, Search, Send, Stethoscope, Video, Wifi,
} from "lucide-react";
import { Avatar, Verified } from "@/components/ui/Primitives";
import NavArrows from "@/components/ui/NavArrows";
import StoreBadge from "@/components/ui/StoreBadge";
import { SiteNav, SiteFooter } from "@/components/landing/SiteChrome";
import { useScrollReveal, cn } from "@/lib/utils";

// TODO: set the real store URLs once the listings are live; the badges become
// links automatically. Until then they render as static badges with a note.
const APP_STORE_URL: string | null = null;
const PLAY_STORE_URL: string | null = null;

// Illustrative people for the phone mockups only (marketing page — not live data).
const SAMPLE = [
  { _id: "m1", fullName: "Dr. Sara Reyes", role: "doctor", professionalHeadline: "Pediatric Oncology · AIIMS", isVerified: true },
  { _id: "m2", fullName: "Dr. Daniel Kovač", role: "doctor", professionalHeadline: "Interventional Cardiology", isVerified: true },
];

/** /mobile-app — marketing page for the iOS & Android apps. */
export default function MobileAppPage() {
  useScrollReveal();
  return (
    <div className="overflow-x-clip bg-surface">
      <NavArrows variant="floating" />
      <SiteNav />
      <Hero />
      <Screens />
      <Capabilities />
      <StoresCTA />
      <SiteFooter />
    </div>
  );
}

/** Store badge that upgrades to a real link once the URL exists. */
function BadgeSlot({ store, url }: { store: "apple" | "google"; url: string | null }) {
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="group press" aria-label={store === "apple" ? "Download Orovion on the App Store" : "Get Orovion on Google Play"}>
        <StoreBadge store={store} />
      </a>
    );
  }
  return <StoreBadge store={store} className="opacity-95" />;
}

function Hero() {
  return (
    <section className="relative">
      <div className="absolute inset-0 mesh" />
      <div className="absolute inset-x-0 top-0 h-[560px] grid-bg" />
      <div className="container-x relative grid items-center gap-14 pb-20 pt-16 lg:grid-cols-2 lg:pb-28 lg:pt-20">
        <div>
          <span className="inline-flex animate-fade-in items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700">
            <Bell size={13} /> Now on the App Store &amp; Google Play
          </span>
          <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-ink-900 text-balance sm:text-6xl">
            Orovion, in <span className="text-gradient">your pocket.</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-500">
            The full network — cases, Pulse reels, real-time chat and video consults —
            built for the corridor, the ward and everywhere in between.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <BadgeSlot store="apple" url={APP_STORE_URL} />
            <BadgeSlot store="google" url={PLAY_STORE_URL} />
          </div>
          {!APP_STORE_URL && !PLAY_STORE_URL && (
            <p className="mt-3 text-xs text-ink-400">Store links go live here shortly — the apps are rolling out now.</p>
          )}
        </div>
        <div className="reveal in mx-auto">
          <PhoneFrame tilt="rotate-2">
            <FeedScreen />
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
}

function Screens() {
  return (
    <section className="bg-ink-50 py-24">
      <div className="container-x">
        <div className="reveal mx-auto max-w-2xl text-center">
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-ink-900 text-balance sm:text-5xl">Every surface, made for one hand</h2>
          <p className="mt-4 text-lg text-ink-500">The same verified network as the web, rebuilt around the moments between consults.</p>
        </div>
        <div className="mt-16 grid items-start justify-items-center gap-12 sm:grid-cols-2 lg:grid-cols-3">
          <ScreenDemo caption="The feed" text="Cases, research and updates from clinicians you trust — filtered by specialty.">
            <FeedScreen />
          </ScreenDemo>
          <ScreenDemo caption="Real-time chat" text="Read receipts, presence, and audio or video calls one tap away.">
            <ChatScreen />
          </ScreenDemo>
          <ScreenDemo caption="Pulse reels" text="Sixty-second teaching videos for the minutes you actually have." className="sm:col-span-2 lg:col-span-1">
            <ReelScreen />
          </ScreenDemo>
        </div>
      </div>
    </section>
  );
}

function ScreenDemo({ caption, text, children, className = "" }: { caption: string; text: string; children: React.ReactNode; className?: string }) {
  return (
    <figure className={cn("reveal flex max-w-xs flex-col items-center text-center", className)}>
      <PhoneFrame small>{children}</PhoneFrame>
      <figcaption className="mt-6">
        <p className="font-display text-lg font-bold text-ink-900">{caption}</p>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{text}</p>
      </figcaption>
    </figure>
  );
}

const CAPABILITIES = [
  { icon: Bell, title: "Push notifications", text: "Mentions, consult requests and connection updates reach you the moment they happen." },
  { icon: MessageSquare, title: "Full chat & calls", text: "The same private conversations as the web, with native audio and video calls." },
  { icon: Clapperboard, title: "Pulse on the go", text: "Swipe through short clinical teaching videos wherever you have two minutes." },
  { icon: Stethoscope, title: "Consults anywhere", text: "Accept, schedule and run paid video consultations straight from your phone." },
];

function Capabilities() {
  return (
    <section className="container-x py-24">
      <div className="reveal mx-auto max-w-2xl text-center">
        <h2 className="font-display text-4xl font-extrabold tracking-tight text-ink-900 text-balance sm:text-5xl">Nothing left behind</h2>
        <p className="mt-4 text-lg text-ink-500">If you can do it on Orovion, you can do it from the app.</p>
      </div>
      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {CAPABILITIES.map((c, i) => (
          <div key={c.title} className="reveal card flex items-start gap-4 p-6" style={{ transitionDelay: `${i * 60}ms` }}>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white shadow-glow"><c.icon size={20} /></span>
            <div>
              <h3 className="text-base font-bold text-ink-900">{c.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">{c.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StoresCTA() {
  return (
    <section className="container-x pb-24">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-8 py-14 text-center shadow-glow sm:px-16">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-white text-balance sm:text-4xl">We&rsquo;re on both stores</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-white/85">Download Orovion for iOS or Android and carry your network with you.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <BadgeSlot store="apple" url={APP_STORE_URL} />
            <BadgeSlot store="google" url={PLAY_STORE_URL} />
          </div>
          <p className="mt-4 text-sm text-white/70">Prefer the browser? <Link to="/login" className="font-semibold text-white underline underline-offset-2 hover:text-white/90">Open Orovion on the web</Link>.</p>
        </div>
      </div>
    </section>
  );
}

/* ── CSS phone mockups (image-free, on-brand — same approach as the landing hero) ── */

function PhoneFrame({ children, small = false, tilt = "" }: { children: React.ReactNode; small?: boolean; tilt?: string }) {
  return (
    <div className={cn("relative rounded-[2.6rem] bg-ink-950 p-2.5 shadow-4 ring-1 ring-white/10", small ? "w-60" : "w-72", tilt)} aria-hidden>
      {/* notch */}
      <div className="absolute left-1/2 top-4 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-ink-950" />
      <div className="relative overflow-hidden rounded-[2rem] bg-ink-50">
        {/* status bar */}
        <div className="flex items-center justify-between px-5 pb-1 pt-3 text-[10px] font-semibold text-ink-500">
          <span>9:41</span>
          <Wifi size={11} />
        </div>
        <div className={small ? "h-[26rem]" : "h-[30rem]"}>{children}</div>
      </div>
    </div>
  );
}

function FeedScreen() {
  return (
    <div className="space-y-2.5 p-3">
      <div className="flex items-center justify-between px-1">
        <p className="font-display text-base font-extrabold text-ink-900">Feed</p>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-surface text-ink-500 shadow-1"><Search size={13} /></span>
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-hidden">
        {["All", "Cardiology", "Neuro"].map((t, i) => (
          <span key={t} className={cn("shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold", i === 0 ? "bg-brand-600 text-white" : "bg-surface text-ink-600 shadow-1")}>{t}</span>
        ))}
      </div>
      <div className="rounded-2xl bg-surface p-3 shadow-1">
        <div className="flex items-center gap-2">
          <Avatar user={SAMPLE[0]} size={30} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-[11px] font-bold text-ink-900">{SAMPLE[0].fullName} <Verified size={10} /></p>
            <p className="truncate text-[9px] text-ink-400">{SAMPLE[0].professionalHeadline}</p>
          </div>
          <span className="rounded-full bg-brand-600/10 px-2 py-0.5 text-[8px] font-bold uppercase text-brand-700">Case</span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-700">Febrile neutropenia pathway update — day 3 cultures negative, when do you step down?</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {[Stethoscope, Heart, Play].map((Icon, i) => (
            <div key={i} className="grid aspect-square place-items-center rounded-lg bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600"><Icon size={14} /></div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-3 text-[10px] text-ink-500">
          <span className="flex items-center gap-1"><Heart size={11} className="fill-rose-500 text-rose-500" /> 248</span>
          <span className="flex items-center gap-1"><MessageCircle size={11} /> 34</span>
        </div>
      </div>
      <div className="rounded-2xl bg-surface p-3 shadow-1">
        <div className="flex items-center gap-2">
          <Avatar user={SAMPLE[1]} size={30} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-[11px] font-bold text-ink-900">{SAMPLE[1].fullName} <Verified size={10} /></p>
            <p className="truncate text-[9px] text-ink-400">{SAMPLE[1].professionalHeadline}</p>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-ink-700">New paper: radial vs femoral access outcomes in 2,400 PCI patients…</p>
      </div>
    </div>
  );
}

function ChatScreen() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 bg-surface px-3 py-2.5 shadow-1">
        <Avatar user={SAMPLE[1]} size={28} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-[11px] font-bold text-ink-900">{SAMPLE[1].fullName} <Verified size={10} /></p>
          <p className="text-[9px] font-medium text-emerald-600">Online</p>
        </div>
        <Phone size={13} className="text-ink-500" />
        <Video size={14} className="text-brand-600" />
      </div>
      <div className="flex-1 space-y-2 p-3">
        <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-surface px-3 py-2 text-[11px] leading-snug text-ink-700 shadow-1">
          ECG attached — ST elevation in V2–V4. Cath lab or thrombolysis given the transfer time?
        </div>
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-brand-600 px-3 py-2 text-[11px] leading-snug text-white shadow-1">
          Activate the lab. Door-to-balloon still beats lysis at 40 min transfer.
        </div>
        <div className="max-w-[60%] rounded-2xl rounded-tl-md bg-surface px-3 py-2 text-[11px] text-ink-700 shadow-1">
          Agreed — sending now. 🙏
        </div>
      </div>
      <div className="flex items-center gap-2 bg-surface px-3 py-2.5 shadow-1">
        <span className="flex-1 rounded-full bg-ink-900/[.05] px-3 py-1.5 text-[10px] text-ink-400">Message…</span>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-white"><Send size={12} /></span>
      </div>
    </div>
  );
}

function ReelScreen() {
  return (
    <div className="relative h-full bg-ink-950">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-800/70 via-ink-950 to-ink-950" />
      <div className="absolute inset-0 grid place-items-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur"><Play size={18} className="fill-white text-white" /></span>
      </div>
      <div className="absolute bottom-0 inset-x-0 p-3 text-white">
        <p className="flex items-center gap-1 text-[11px] font-bold">Dr. Sara Reyes <BadgeCheck size={11} className="text-white" /></p>
        <p className="mt-1 text-[10px] leading-snug text-white/85">Reading a paediatric ECG in 60 seconds — rate, rhythm, axis. #Pulse</p>
        <div className="mt-2 flex items-center gap-3 text-[10px] text-white/85">
          <span className="flex items-center gap-1"><Heart size={11} className="fill-rose-500 text-rose-500" /> 1.2k</span>
          <span className="flex items-center gap-1"><MessageCircle size={11} /> 86</span>
        </div>
      </div>
    </div>
  );
}
