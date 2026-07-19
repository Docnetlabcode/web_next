"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { dok, TOKENS } from "@/lib/api";
import { connectSocket, disconnectSocket } from "@/lib/socket";

const AuthCtx = createContext<any>(null);
export const useAuth = () => useContext(AuthCtx);

// The backend marks new users isProfileComplete:false; on reload /profile/me may omit the
// flag, so fall back to "has the minimum basic fields".
const profileComplete = (u) =>
  !u ? false : u.isProfileComplete ?? Boolean(u.fullName && u.gender);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Web flow: silently mint a fresh access token from the httpOnly refresh cookie,
      // then load the profile. No cookie => not logged in (stays on /login).
      try {
        await dok.auth.refresh();
        const data = await dok.profile.me();
        const u = data.user || data;
        setUser(u);
        connectSocket(u?._id || u?.id);
      } catch {
        TOKENS.clear();
      }
      setLoading(false);
    })();
  }, []);

  // If an in-flight refresh ultimately fails, the api layer fires this — log out locally.
  useEffect(() => {
    const onExpired = () => {
      TOKENS.clear();
      disconnectSocket();
      setUser(null);
    };
    window.addEventListener("dl:auth-expired", onExpired);
    return () => window.removeEventListener("dl:auth-expired", onExpired);
  }, []);

  // Called after verify-otp / google succeed. Web responses carry accessToken + csrfToken + user
  // (the refresh token is in an httpOnly cookie, not in JS).
  const setSession = ({ accessToken, csrfToken, user: u }) => {
    // TEMPORARY: Print the JWT token to the console for load testing
    //console.log("🚀 MY JWT TOKEN:", accessToken);
    
    TOKENS.set({ accessToken, csrfToken });
    setUser(u);
    connectSocket(u?._id || u?.id);
  };

  // Merge fresh fields into the current user (e.g. after onboarding completes the profile).
  const updateUser = (patch) => setUser((u) => ({ ...(u || {}), ...patch }));

  const logout = async () => {
    try {
      await dok.auth.logout();
    } catch {
      /* clear locally regardless of the network result */
    }
    TOKENS.clear();
    disconnectSocket();
    setUser(null);
  };

  return (
    <AuthCtx.Provider
      value={{
        user,
        loading,
        demo: false, // demo mode removed — the app is fully backed by the live API now
        isProfileComplete: profileComplete(user),
        setSession,
        updateUser,
        logout,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}
