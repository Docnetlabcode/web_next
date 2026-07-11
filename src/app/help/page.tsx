import type { Metadata } from "next";
import HelpCenter from "@/screens/legal/HelpCenter";

export const metadata: Metadata = {
  title: "Help center — Orovion",
  description: "Answers about Orovion accounts, verification, the home feed, posts and comments, consultations, payments, and safety tools.",
};

export default function Page() {
  return <HelpCenter />;
}
