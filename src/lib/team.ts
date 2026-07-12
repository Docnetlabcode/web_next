// Founding-team content shared by the landing Team section and the /team page.
// TODO: replace with the real founding team (names, roles, stories, photos in
// /public/team/, and real social links).

export type TeamMember = {
  slug: string;
  name: string;
  role: string;
  /** One-line description shown on the landing card. */
  tagline: string;
  /** Full story paragraphs for the /team page. */
  story: string[];
  /** Areas of focus, rendered as chips. */
  focus: string[];
  education: string;
  location: string;
  photo?: string;
  socials: { linkedin?: string; twitter?: string; email?: string };
};

export const TEAM: TeamMember[] = [
  {
    slug: "aarav-mehta",
    name: "Aarav Mehta",
    role: "Founder & CEO",
    tagline: "Sets the product direction: a license-verified home for clinical knowledge, built with clinicians rather than for them.",
    story: [
      "Aarav started Orovion after watching clinicians trade case photos and drug questions across five different consumer apps, none of which could say who was actually a doctor. The fix he kept coming back to was simple: verify licenses first, then let the network grow on top of that trust.",
      "Before Orovion he spent six years in health technology, shipping tools used in hospitals across India. That experience shaped the product's core rule — attribution before content. Every case, paper and reel on Orovion leads with who wrote it and what their credentials are.",
      "Day to day he works across product and clinical partnerships, and still reads every piece of feedback that comes through the app.",
    ],
    focus: ["Product", "Clinical partnerships", "Verification"],
    education: "B.Tech, IIT Bombay",
    location: "Bengaluru, India",
    photo: "/team/member-1.png",
    socials: { linkedin: "#", twitter: "#", email: "hello@orovion.com" },
  },
  {
    slug: "riya-sharma",
    name: "Dr. Riya Sharma",
    role: "Co-founder & Chief Medical Officer",
    tagline: "Practising physician who shapes clinical safety, license verification and the consultation experience.",
    story: [
      "Riya is a practising physician and the reason Orovion feels like it was built by people who have actually worked a ward shift. She owns the clinical side of the product: what counts as a safe case discussion, how de-identification should work, and when a consult needs to move from chat to a video call.",
      "She designed the verification pipeline that checks every health professional against medical registries before the badge appears, and she reviews the edge cases the pipeline can't decide on its own.",
      "Her test for every feature is blunt and useful: would she trust it between two patients on a busy outpatient day? If not, it doesn't ship.",
    ],
    focus: ["Clinical safety", "Verification policy", "Consultations"],
    education: "MBBS, MD — Internal Medicine",
    location: "New Delhi, India",
    photo: "/team/member-2.png",
    socials: { linkedin: "#", email: "hello@orovion.com" },
  },
  {
    slug: "karan-patel",
    name: "Karan Patel",
    role: "Co-founder & CTO",
    tagline: "Leads the real-time platform: feed, chat, reels and consults engineered for speed and privacy.",
    story: [
      "Karan runs the engineering side of Orovion: the feed, real-time chat, video consultations and the reel pipeline. His bar is that the app should feel instant on a hospital corridor's patchy 4G, because that's where clinicians actually use it.",
      "He built the platform around two commitments. Messages and consults are private by architecture, not by policy. And the system degrades gracefully — if a service goes down, the app keeps working with what it has instead of showing a spinner.",
      "Before Orovion he built messaging infrastructure used by millions of daily users, which is why the chat feels closer to a consumer messenger than to hospital software.",
    ],
    focus: ["Real-time systems", "Privacy engineering", "Mobile"],
    education: "M.S. Computer Science",
    location: "Bengaluru, India",
    photo: "/team/member-3.png",
    socials: { linkedin: "#", twitter: "#", email: "hello@orovion.com" },
  },
];
