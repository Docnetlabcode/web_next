import AppLayout from "@/components/layout/AppLayout";

// Auth-gated, client-driven shell — render dynamically rather than prerender at build.
export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
