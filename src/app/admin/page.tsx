import type { Metadata } from "next";
import Admin from "@/screens/Admin";

// Operator-only console: never indexed, never linked from the product UI.
export const metadata: Metadata = {
  title: "Admin console — DokLynk",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function Page() {
  return <Admin />;
}
