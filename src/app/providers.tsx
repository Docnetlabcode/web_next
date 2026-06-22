"use client";

import { AuthProvider } from "@/context/AuthContext";
import { CallProvider } from "@/context/CallContext";
import { ToastProvider } from "@/components/ui/Toast";
import CallRoot from "@/components/call/CallRoot";

// Client-side providers wrapper (AuthProvider holds session, demo state, socket).
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <CallProvider>
          {children}
          <CallRoot />
        </CallProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
