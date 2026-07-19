"use client";
import { useEffect, useState } from "react";
import { Link } from "@/lib/router";
import {
  ShieldCheck, FileText, ArrowRight, Facebook, Linkedin, Twitter, Instagram, Mail, MapPin, Phone,
  ChevronDown, LifeBuoy, Menu, X, Smartphone,
} from "lucide-react";
import { Logo } from "@/components/ui/Primitives";
import ThemeToggle from "@/components/ui/ThemeToggle";
import StoreBadge from "@/components/ui/StoreBadge";
import { cn } from "@/lib/utils";

/* Shared marketing chrome (nav + footer) for the public pages: /, /team,
   /mobile-app. Section anchors are absolute (/#features) so they work from
   every page; on / the browser treats them as same-document scrolls. */

const NAV_SECTIONS = [
  { label: "Features", href: "/#features" },
  { label: "Healthcare Professionals", href: "/#roles" },
  { label: "Team", href: "/#team" },
];
const NAV_RESOURCES = [
  { label: "Mobile app", to: "/mobile-app", icon: Smartphone, desc: "Orovion on iOS & Android" },
  { label: "Help Center", to: "/help", icon: LifeBuoy, desc: "Answers, guides & support" },
  { label: "Privacy Policy", to: "/privacy", icon: ShieldCheck, desc: "How we protect your data" },
  { label: "Terms & Conditions", to: "/terms", icon: FileText, desc: "The rules of the platform" },
];

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

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
        scrolled || open ? "glass border-b border-ink-900/[.06] shadow-2" : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="container-x flex h-16 items-center justify-between sm:h-20">
        <Link to="/" aria-label="Orovion home"><Logo /></Link>

        {/* desktop links */}
        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-700 lg:flex">
          {NAV_SECTIONS.map((s) => (
            <a key={s.href} href={s.href} className="group relative py-1 transition hover:text-brand-700">
              {s.label}
              <span className="absolute inset-x-0 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-brand-600 transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}

          {/* Resources dropdown (hover) */}
          <div className="group relative">
            <button className="flex items-center gap-1 py-1 transition hover:text-brand-700">
              Resources <ChevronDown size={15} className="transition-transform duration-300 group-hover:rotate-180" />
            </button>
            {/* pt bridges the gap so the menu stays open while moving the cursor down */}
            <div className="invisible absolute right-0 top-full z-50 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100">
              <div className="w-72 overflow-hidden rounded-2xl border border-ink-900/[.06] bg-surface p-2 shadow-card">
                {NAV_RESOURCES.map((r) => (
                  <Link key={r.to} to={r.to} className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-brand-50">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><r.icon size={17} /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink-900">{r.label}</span>
                      <span className="block text-xs text-ink-400">{r.desc}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to="/login" className="btn-primary group hidden px-5 py-2.5 text-sm sm:inline-flex">
            Get started <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="press grid h-10 w-10 place-items-center rounded-xl text-ink-700 transition hover:bg-ink-900/[.05] lg:hidden"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* mobile menu */}
      {open && (
        <div className="glass max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-ink-900/[.06] lg:hidden">
          <div className="container-x flex flex-col py-3">
            {NAV_SECTIONS.map((s) => (
              <a key={s.href} href={s.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium text-ink-700 transition hover:bg-brand-50 hover:text-brand-700">{s.label}</a>
            ))}
            <div className="my-1.5 h-px bg-ink-900/[.06]" />
            {NAV_RESOURCES.map((r) => (
              <Link key={r.to} to={r.to} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-ink-700 transition hover:bg-brand-50 hover:text-brand-700">
                <r.icon size={17} className="text-brand-600" /> {r.label}
              </Link>
            ))}
            <Link to="/login" onClick={() => setOpen(false)} className="btn-primary mt-2 py-3 text-sm">Get started <ArrowRight size={16} /></Link>
          </div>
        </div>
      )}
    </header>
  );
}

// Reddit has no lucide icon; minimal inline SVG matching the 17px social buttons.
function RedditIcon({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}

const SOCIALS = [
  { icon: Facebook, label: "Facebook", href: "https://www.facebook.com/people/Orovion/61591959148775/" },
  { icon: Linkedin, label: "LinkedIn", href: "https://www.linkedin.com/company/orovion/" },
  { icon: Twitter, label: "X (Twitter)", href: "https://x.com/orovion?s=20" },
  { icon: RedditIcon, label: "Reddit", href: "https://www.reddit.com/user/orovion/" },
  { icon: Instagram, label: "Instagram", href: "https://www.instagram.com/orovion.app" },
];

function FooterCol({ title, links }: { title: string; links: { label: string; to?: string; href?: string }[] }) {
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

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-brand-900 text-white">
      <div className="absolute inset-0 grid-bg opacity-[.12]" />
      <div className="container-x relative">
        <div className="grid gap-10 py-12 sm:grid-cols-2 sm:py-16 lg:grid-cols-5">
          {/* brand + socials + app */}
          <div className="lg:col-span-2">
            <Logo light />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              A connected healthcare network for professionals, medical students and general
              users — bringing knowledge, professional connections and private consultations
              into one platform.
            </p>
            <div className="mt-6 flex gap-2.5">
              {SOCIALS.map((s) => (
                <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noopener noreferrer"
                  className="press grid h-10 w-10 place-items-center rounded-full bg-white/10 ring-1 ring-white/15 transition hover:bg-white/20">
                  <s.icon size={17} />
                </a>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link to="/mobile-app" className="group" aria-label="Get Orovion on Google Play">
                <StoreBadge store="google" size="sm" />
              </Link>
              <Link to="/mobile-app" className="group" aria-label="Get Orovion on the App Store">
                <StoreBadge store="apple" size="sm" />
              </Link>
            </div>
          </div>

          <FooterCol title="Explore" links={[
            { label: "Features", href: "/#features" },
            { label: "For Healthcare Professionals", href: "/#roles" },
            { label: "Get the App", to: "/mobile-app" },
            { label: "Meet the Team", to: "/team" },
          ]} />

          <FooterCol title="Legal" links={[
            { label: "Privacy Policy", to: "/privacy" },
            { label: "Terms & Conditions", to: "/terms" },
            { label: "Help Center", to: "/help" },
          ]} />

          {/* contact */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wide text-white/90">Contact</h4>
            <ul className="mt-4 space-y-3 text-sm text-white/70">
              <li className="flex items-center gap-2.5"><Mail size={15} className="shrink-0 text-white/50" /> <a href="mailto:hello@orovion.com" className="transition hover:text-white">hello@orovion.com</a></li>
              <li className="flex items-center gap-2.5"><Phone size={15} className="shrink-0 text-white/50" /> <a href="tel:+918004227370" className="transition hover:text-white">+91 80042 27370</a></li>
              <li className="flex items-start gap-2.5"><MapPin size={15} className="mt-0.5 shrink-0 text-white/50" /> Varanasi, Uttar Pradesh, India, 221010</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 py-6 text-sm text-white/55 sm:flex-row">
          <p>© 2026 Orovion. All rights reserved.</p>
          <p>Built for the healthcare community.</p>
        </div>
      </div>
    </footer>
  );
}
