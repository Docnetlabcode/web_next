import type { Metadata } from "next";
import TeamPage from "@/screens/TeamPage";

export const metadata: Metadata = {
  title: "Meet the team — Orovion",
  description: "The clinicians and engineers building Orovion: a license-verified network for cases, research, reels and real-time consults.",
};

export default function Page() {
  return <TeamPage />;
}
