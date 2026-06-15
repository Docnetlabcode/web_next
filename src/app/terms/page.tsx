import type { Metadata } from "next";
import Terms from "@/screens/legal/Terms";

export const metadata: Metadata = {
  title: "Terms of Use — DokLynk",
  description: "The DokLynk Terms of Use: eligibility, user roles, professional verification, content standards, payments, intellectual property, account deletion, and governing law.",
};

export default function Page() {
  return <Terms />;
}
