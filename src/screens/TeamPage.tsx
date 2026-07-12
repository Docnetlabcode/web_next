"use client";
import { Link } from "@/lib/router";
import { ArrowRight, Linkedin, Twitter, Mail, MapPin, GraduationCap, BadgeCheck } from "lucide-react";
import NavArrows from "@/components/ui/NavArrows";
import { SiteNav, SiteFooter } from "@/components/landing/SiteChrome";
import TeamAvatar from "@/components/landing/TeamAvatar";
import { TEAM, TeamMember } from "@/lib/team";
import { useScrollReveal, cn } from "@/lib/utils";

/** /team — the team landing page. Landing cards deep-link here as /team#slug. */
export default function TeamPage() {
  useScrollReveal();
  return (
    <div className="overflow-x-clip bg-surface">
      <NavArrows variant="floating" />
      <SiteNav />
      <Hero />
      <Principles />
      <Members />
      <JoinCTA />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative">
      <div className="absolute inset-0 mesh" />
      <div className="absolute inset-x-0 top-0 h-[420px] grid-bg" />
      <div className="container-x relative pb-16 pt-16 text-center lg:pb-20 lg:pt-24">
        <div className="mx-auto flex justify-center -space-x-3">
          {TEAM.map((m) => (
            <TeamAvatar key={m.slug} member={m} className="h-14 w-14 rounded-full text-base ring-4 ring-surface" />
          ))}
        </div>
        <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-extrabold tracking-tight text-ink-900 text-balance sm:text-5xl lg:text-6xl">
          The people building <span className="text-gradient">Orovion</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-ink-500">
          A small team of clinicians and engineers with one rule: if it wouldn&rsquo;t
          earn a doctor&rsquo;s trust on a busy ward, it doesn&rsquo;t ship.
        </p>
      </div>
    </section>
  );
}

const PRINCIPLES = [
  { title: "Verification first", text: "Every health professional is checked against medical registries before the badge appears. Trust is the product." },
  { title: "Clinician-led", text: "Our Chief Medical Officer practises medicine every week. Features are tested against real ward shifts, not personas." },
  { title: "Private by architecture", text: "Consults and messages are engineered to stay between you and your colleague — privacy isn't a settings toggle." },
];

function Principles() {
  return (
    <section className="bg-ink-50 py-16">
      <div className="container-x grid gap-10 md:grid-cols-3">
        {PRINCIPLES.map((p) => (
          <div key={p.title} className="reveal">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white shadow-glow"><BadgeCheck size={18} /></span>
            <h2 className="mt-4 font-display text-lg font-bold text-ink-900">{p.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{p.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Members() {
  return (
    <section className="container-x space-y-16 py-16 sm:space-y-20 sm:py-20 lg:space-y-28 lg:py-28">
      {TEAM.map((m, i) => <MemberProfile key={m.slug} member={m} flip={i % 2 === 1} />)}
    </section>
  );
}

function MemberProfile({ member: m, flip }: { member: TeamMember; flip: boolean }) {
  return (
    <article id={m.slug} className="reveal scroll-mt-28">
      <div className={cn("grid items-start gap-8 md:gap-10", flip ? "md:grid-cols-[1fr_300px] lg:grid-cols-[1fr_340px]" : "md:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr]")}>
        {/* profile card */}
        <div className={cn("md:sticky md:top-24 lg:top-28", flip && "md:order-2")}>
          <div className="card relative overflow-hidden p-6">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-brand-600 to-brand-800" />
            <div className="absolute inset-x-0 top-0 h-24 grid-bg opacity-40" />
            <div className="relative">
              <TeamAvatar member={m} className="h-24 w-24 text-2xl ring-4 ring-surface" />
              <h3 className="mt-4 font-display text-xl font-extrabold text-ink-900">{m.name}</h3>
              <p className="text-sm font-semibold text-brand-700">{m.role}</p>
              <ul className="mt-5 space-y-2.5 text-sm text-ink-600">
                <li className="flex items-center gap-2.5"><GraduationCap size={16} className="shrink-0 text-ink-400" /> {m.education}</li>
                <li className="flex items-center gap-2.5"><MapPin size={16} className="shrink-0 text-ink-400" /> {m.location}</li>
              </ul>
              <div className="mt-5 flex gap-2 border-t border-ink-900/[.06] pt-4">
                {m.socials.linkedin && <SocialButton href={m.socials.linkedin} label={`${m.name} on LinkedIn`} icon={Linkedin} />}
                {m.socials.twitter && <SocialButton href={m.socials.twitter} label={`${m.name} on X (Twitter)`} icon={Twitter} />}
                {m.socials.email && <SocialButton href={`mailto:${m.socials.email}`} label={`Email ${m.name}`} icon={Mail} />}
              </div>
            </div>
          </div>
        </div>

        {/* story */}
        <div className={cn("min-w-0", flip && "md:order-1")}>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-ink-900 text-balance sm:text-4xl">{m.name}</h2>
          <p className="mt-1 text-base font-semibold text-brand-700">{m.role}</p>
          <div className="mt-6 max-w-2xl space-y-4 text-[15px] leading-relaxed text-ink-600">
            {m.story.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            {m.focus.map((f) => <span key={f} className="chip bg-brand-50 text-brand-700">{f}</span>)}
          </div>
        </div>
      </div>
    </article>
  );
}

function SocialButton({ href, label, icon: Icon }: { href: string; label: string; icon: any }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="press grid h-10 w-10 place-items-center rounded-full bg-ink-900/[.05] text-ink-600 transition hover:bg-brand-50 hover:text-brand-700"
    >
      <Icon size={16} />
    </a>
  );
}

function JoinCTA() {
  return (
    <section className="container-x pb-16 sm:pb-24">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-6 py-12 text-center shadow-glow sm:px-16 sm:py-14">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="relative">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-white text-balance sm:text-4xl">Want to build this with us?</h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-white/85">We&rsquo;re a small team and we hire slowly, but we always read every note.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a href="mailto:hello@orovion.com" className="btn bg-surface px-6 py-3 text-base text-brand-700 hover:bg-surface/90">Email the team</a>
            <Link to="/login" className="btn border border-white/30 px-6 py-3 text-base text-white transition hover:bg-white/10">
              Join the Orovion <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
