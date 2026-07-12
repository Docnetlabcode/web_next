import type { Metadata } from "next";
import MobileAppPage from "@/screens/MobileAppPage";

export const metadata: Metadata = {
  title: "Get the app — Orovion",
  description: "Orovion for iOS and Android: the verified clinical network with cases, Pulse reels, real-time chat and video consults, on the App Store and Google Play.",
};

export default function Page() {
  return <MobileAppPage />;
}
