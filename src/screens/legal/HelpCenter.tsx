"use client";
import { Rocket, BadgeCheck, Newspaper, Stethoscope, ShieldAlert } from "lucide-react";
import { ChevronDown } from "lucide-react";
import LegalShell from "@/components/legal/LegalShell";

/** Native-details FAQ accordion — keyboard accessible out of the box. */
function Faq({ items }) {
  return (
    <div className="divide-y divide-ink-900/[.05] overflow-hidden rounded-2xl border border-ink-900/[.06] bg-white shadow-card">
      {items.map(([q, a], i) => (
        <details key={i} className="group">
          <summary className="flex cursor-pointer items-center gap-3 px-4 py-3.5 text-[15px] font-semibold text-ink-900 transition hover:bg-ink-900/[.02] [&::-webkit-details-marker]:hidden">
            <span className="flex-1">{q}</span>
            <ChevronDown size={16} className="shrink-0 text-ink-400 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4 text-sm leading-relaxed text-ink-600">{a}</div>
        </details>
      ))}
    </div>
  );
}

const SECTIONS = [
  {
    id: "getting-started",
    icon: Rocket,
    title: "Getting started",
    body: (
      <Faq items={[
        ["How do I create an account?", "Sign in with Google or your phone number, pick your role (doctor, student, or general user), and complete onboarding. Doctors and students can then submit credentials for verification."],
        ["What's the difference between roles?", "Doctors get the full clinical toolkit — posting, cases, consultations. Students get learning-focused access. General users can follow clinicians, learn from content, and book consultations."],
        ["How does the home feed work?", "The feed shows posts from people you follow plus recommended content. Use the specialty bar at the top to filter by field (Cardiology, Pediatrics, and so on), or by content type like Research and Case studies."],
      ]} />
    ),
  },
  {
    id: "verification",
    icon: BadgeCheck,
    title: "Verification & the blue badge",
    body: (
      <Faq items={[
        ["How do I get verified?", "Open Profile → Edit profile → Verification & Credentials and upload your license or registration documents. Our review team checks them, usually within 2–3 business days."],
        ["Why was my verification rejected?", "The rejection notice includes the reviewer's reason — most often unreadable documents or a name mismatch. Fix the issue and resubmit from the same screen."],
        ["What does the badge change?", "Verified clinicians appear with the checkmark everywhere their name shows, rank higher in search and suggestions, and can run paid consultations."],
      ]} />
    ),
  },
  {
    id: "posts-feed",
    icon: Newspaper,
    title: "Posts, comments & saving",
    body: (
      <Faq items={[
        ["Can I edit a post after publishing?", "Yes — within 24 hours of posting, from the post's ⋯ menu. After that the edit option closes; you can still delete the post at any time."],
        ["How do mentions work?", "Type @ in any comment and pick a colleague from the suggestions. They get a notification that deep-links straight to your comment."],
        ["Who can see my saved items?", "Only you. The Saved tab is private and organized by type: posts, case studies, research, theses, and Pulse."],
        ["How do I see fewer posts like one in my feed?", "Open the post's ⋯ menu: Not interested hides it and tunes recommendations; Don't recommend stops suggestions from that author entirely."],
      ]} />
    ),
  },
  {
    id: "consultations",
    icon: Stethoscope,
    title: "Consultations & payments",
    body: (
      <Faq items={[
        ["How do I book a consultation?", "Open a doctor's profile and tap Request consultation, pick a slot from their availability, and pay to confirm. The video call happens inside DokLynk."],
        ["What if my consultation fails or is missed?", "If a doctor cancels or doesn't join, the payment is automatically refunded to the original method within 5–7 business days."],
        ["Where are my prescriptions?", "Prescriptions and reports shared during a consultation stay in that consultation's history — only you and your doctor can open them."],
      ]} />
    ),
  },
  {
    id: "safety",
    icon: ShieldAlert,
    title: "Privacy, reporting & safety",
    body: (
      <Faq items={[
        ["How do I report a post or user?", "Use Report in the post's ⋯ menu and pick a category. Reports go to the moderation team, who can remove content network-wide. Reporting is anonymous."],
        ["How do I block someone?", "From their profile's menu choose Block. They won't be able to see your profile, message you, or appear in your feed. Manage your block list in Settings → Privacy."],
        ["How do private accounts work?", "When your account is private, new followers must send a request you approve from Network → Requests before they see your content."],
      ]} />
    ),
  },
];

export default function HelpCenter() {
  return (
    <LegalShell
      eyebrow="Support"
      title="Help center"
      updated={undefined}
      sections={SECTIONS}
    />
  );
}
