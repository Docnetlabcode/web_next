import type { Metadata } from "next";
import PrivacyPolicy from "@/screens/legal/PrivacyPolicy";

export const metadata: Metadata = {
  title: "Privacy policy — Orovion",
  description: "How Orovion collects, uses, stores, shares and protects information: registration data, verification documents, payments, data retention, account deletion, and your rights.",
};

export default function Page() {
  return <PrivacyPolicy />;
}
