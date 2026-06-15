import type { Metadata } from "next";
import HelpCenter from "@/screens/legal/HelpCenter";

export const metadata: Metadata = {
  title: "Help center — DokLynk",
  description: "Answers about DokLynk accounts, verification, the home feed, posts and comments, consultations, payments, and safety tools.",
};

export default function Page() {
  return <HelpCenter />;
}
