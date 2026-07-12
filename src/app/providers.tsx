"use client";

import { AuthProvider } from "@/context/AuthContext";
import { CallProvider } from "@/context/CallContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ToastProvider } from "@/components/ui/Toast";
import CallRoot from "@/components/call/CallRoot";

// Client-side providers wrapper (AuthProvider holds session, demo state, socket).
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CallProvider>
            {children}
            <CallRoot />
          </CallProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
