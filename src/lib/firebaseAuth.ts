import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  type ConfirmationResult,
} from "firebase/auth";
import { auth, firebaseEnabled } from "./firebase";

export { firebaseEnabled };

// --- deviceInfo: sent to the backend on verify-otp / google (recorded per session) ---
function getDeviceId() {
  let id = localStorage.getItem("dl_device_id");
  if (!id) {
    id = crypto?.randomUUID?.() || `web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem("dl_device_id", id);
  }
  return id;
}

export function deviceInfo() {
  return {
    deviceId: getDeviceId(),
    deviceName: (navigator.userAgent || "Web browser").slice(0, 120),
    platform: "web",
    appVersion: "1.0.0",
  };
}

// --- invisible reCAPTCHA (required by Firebase Phone Auth) ---
// Needs a DOM element with id="recaptcha-container" to be present (rendered by Login).
let recaptcha: RecaptchaVerifier | null = null;
function getRecaptcha() {
  if (!auth) throw new Error("Firebase is not configured.");
  if (recaptcha) return recaptcha;
  recaptcha = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
  return recaptcha;
}

export function resetRecaptcha() {
  try {
    recaptcha?.clear();
  } catch {
    /* ignore */
  }
  recaptcha = null;
}

// --- phone OTP: client-side SMS via Firebase, then ID token is posted to the backend ---
let confirmation: ConfirmationResult | null = null;

/** Sends the OTP SMS via Firebase. `e164Phone` must be full international form, e.g. "+919876543210". */
export async function startPhoneSignIn(e164Phone) {
  if (!auth) throw new Error("Firebase is not configured.");
  const verifier = getRecaptcha();
  try {
    confirmation = await signInWithPhoneNumber(auth, e164Phone, verifier);
  } catch (e) {
    // A failed attempt can leave the verifier in a bad state — rebuild it next time.
    resetRecaptcha();
    throw e;
  }
  return true;
}

/** Confirms the 6-digit code and returns the Firebase ID token to send to /auth/verify-otp. */
export async function confirmPhoneCode(code) {
  if (!confirmation) throw new Error("No OTP request in progress — please resend the code.");
  const cred = await confirmation.confirm(code);
  confirmation = null;
  return cred.user.getIdToken();
}

// --- Google: popup sign-in, returns the Firebase ID token for /auth/google ---
export async function signInWithGoogle() {
  if (!auth) throw new Error("Firebase is not configured.");
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const result = await signInWithPopup(auth, provider);
  return result.user.getIdToken();
}

// --- Apple: popup sign-in, returns the Firebase ID token + name for /auth/apple.
// Apple only sends the display name on the VERY FIRST sign-in (Firebase fills
// user.displayName then), and may send no email at all, so the backend keys on
// firebaseUid and treats email/name as optional. We forward the name when we
// have it. (Web Apple sign-in needs the domain registered with Apple; it won't
// work on localhost.) ---
export async function signInWithApple() {
  if (!auth) throw new Error("Firebase is not configured.");
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  const result = await signInWithPopup(auth, provider);
  return { idToken: await result.user.getIdToken(), fullName: result.user.displayName || null };
}
