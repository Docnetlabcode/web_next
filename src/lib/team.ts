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
    tagline: "The best technology doesn't replace people—it helps them find, understand, and care for one another more easily. That's the future I'm building with Orovion.",
    story: [
      "For Pawan, meaningful products begin with identifying problems people have simply learned to work around. Orovion started from that belief—the idea that healthcare interactions could be more connected and built around the people who are part of the community.",
      "Coming from a technology background, he has been involved in shaping Orovion from its earliest conversations. While his core focus lies in backend systems, architecture, and infrastructure, he also works closely across product and technology decisions that shape the platform's overall direction.",
      "Today, Pawan leads Orovion's vision while remaining deeply involved in its technical foundation and evolution. He believes meaningful products are built by continuously questioning, improving, and staying committed to the problem they set out to solve.",
    ],
    focus: ["Platform Vision","Backend Architecture", "Technology Strategy"],
    education: "B.Tech, ECE, MMMUT, Gorakhpur",
    location: "Varanasi, India",
    photo: "/team/member-1.png",
    socials: { linkedin: "https://www.linkedin.com/in/pawangupta800", instagram: "https://www.instagram.com/pawan._24_?igsh=c2tjeWlhbmw5b3hq", email: "pawan.gupta@orovion.com" },
  },
  {
    slug: "adarsh-singh",
    name: "Adarsh Singh",
    role: "Co-founder & Product Lead",
    tagline: "Shapes Orovion's product direction, turning complex ideas and user needs into clear, connected digital experiences.",
    story: [
      "From the earliest conversations around Orovion, Adarsh has been closely involved in shaping what the platform could become. His focus has been on understanding the people it is built for, mapping how different roles connect, share, and communicate, and turning an ambitious idea into a clear and connected product experience.",
      "Coming from a technical background, Adarsh found his way into product design through a growing interest in how digital products are shaped and experienced. Since then, he has worked across product research, competitive analysis, user experience, and interface design — bringing a product-first perspective to Orovion from day one.",
      "Day to day, he leads product strategy, user experience, and product design, working closely with the team to turn ideas and complex product requirements into thoughtful experiences as Orovion moves towards launch.",
    ],
    focus: ["Product Strategy" ,"User Experience", "Product Design"],
    education: "B.Tech, ECE, MMMUT, Gorakhpur",
    location: "Lucknow, India",
    photo: "/team/member2.jpeg",
    socials: { linkedin: "https://www.linkedin.com/in/adarshuix",instagram: "https://www.instagram.com/ad__837?igsh=cGRqYWNocXJiaTZk", email: "singhadarsh1708@gmail.com" },
  },
  {
    slug: "Sachan-Ayush",
    name: "Ayush Sachan",
    role: "Co-founder & Frontend Lead",
    tagline: "Leads frontend development and product implementation, turning complex designs and flows into smooth, responsive, and reliable digital experiences.",
    story: [
      "For Ayush, technology has always been about turning ideas into experiences people can actually use. He approaches development with a focus on making products feel smooth, reliable, and simple, while ensuring that what is designed translates effectively into a working product.",
      "Coming from an engineering background, he naturally found his path in frontend and mobile development. Over time, his focus grew beyond building interfaces to understanding how interactions, performance, and technical implementation come together to shape the overall user experience.",
      "Today, Ayush leads frontend development and product implementation at Orovion, translating complex flows and designs into functional digital experiences. He works closely across product and backend to ensure the platform remains responsive, consistent, and ready to scale as it grows.",
    ],
    focus: ["Frontend Development" ,"Mobile Engineering" , "Product Implementation"],
    education: "B.Tech, EE, MMMUT, Gorakhpur",
    location: "Kanpur, India",
    photo: "/team/member-3.png",
    socials: { linkedin: "https://www.linkedin.com/in/ayush-sachan-b22583292",instagram: "https://www.instagram.com/ayushsachan544?igsh=M3VtcmlvbmMyYTVh", email: "dev.ayush005@gmail.com" },
  },
];
