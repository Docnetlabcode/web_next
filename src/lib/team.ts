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
  socials: { linkedin?: string; instagram?: string; email?: string };
};

export const TEAM: TeamMember[] = [
  {
    slug: "pawan-gupta",
    name: "Pawan Gupta",
    role: "Founder & CEO",
    tagline: "Every breakthrough begins by bridging a gap. Orovion exists to bridge the gaps in healthcare.",
    story: [
      "Pawan started Orovion after watching clinicians trade case photos and drug questions across five different consumer apps, none of which could say who was actually a doctor. The fix he kept coming back to was simple: verify licenses first, then let the network grow on top of that trust.",
      "Before Orovion he spent six years in health technology, shipping tools used in hospitals across India. That experience shaped the product's core rule — attribution before content. Every case, paper and reel on Orovion leads with who wrote it and what their credentials are.",
      "Day to day he works across product and clinical partnerships, and still reads every piece of feedback that comes through the app.",
    ],
    focus: ["Product"],
    education: "B.Tech , MMMUT, Gorakhpur",
    location: "Kanpur, India",
    photo: "/team/member-1.png",
    socials: { linkedin: "", instagram: "#", email: "pawan.gupta@orovion.com" },
  },
  {
    slug: "adarsh-singh",
    name: "Adarsh Singh",
    role: "Co-founder & Chief Medical Officer",
    tagline: "Practising physician who shapes clinical safety, license verification and the consultation experience.",
    story: [
      "Adarsh is a practising physician and the reason Orovion feels like it was built by people who have actually worked a ward shift. She owns the clinical side of the product: what counts as a safe case discussion, how de-identification should work, and when a consult needs to move from chat to a video call.",
      "She designed the verification pipeline that checks every health professional against medical registries before the badge appears, and she reviews the edge cases the pipeline can't decide on its own.",
      "Her test for every feature is blunt and useful: would she trust it between two patients on a busy outpatient day? If not, it doesn't ship.",
    ],
    focus: ["Clinical safety", "Verification policy", "Consultations"],
    education: "BTech, MMMUT, Gorakhpur",
    location: "Lucknow, India",
    photo: "/team/member2.jpeg",
    socials: { linkedin: "#", email: "adarsh.singh@orovion.com" },
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
    socials: { linkedin: "#", instagram: "#", email: "hello@orovion.com" },
  },
];
