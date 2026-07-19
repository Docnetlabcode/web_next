import { io, Socket } from "socket.io-client";
import { dok, TOKENS } from "./api";
import { chatSocketUrl, onBackendChange } from "./backend";
import { planReauth } from "./socketReauth";

// The calling signaling lives in chat-service (port 5001), NOT api-service.
// Point NEXT_PUBLIC_CHAT_SOCKET_URL (or the *_RENDER/_AWS pair — see
// lib/backend.ts) at the chat-service origin, e.g. http://localhost:5001.
// Falls back to the deployment's socket URL, then same-origin.
let callSocket: Socket | null = null;
let refreshing = false;
let reauthAttempts = 0;

function chatOrigin(): string | undefined {
  return chatSocketUrl();
}

// Dual-deployment failover: follow a Render <-> AWS switch by re-pointing the
// existing manager (Manager.open() builds the engine from io.uri on every
// (re)connect, so registered call-event listeners survive; the typings mark
// uri private, hence the cast). Same-origin (proxied deployment) when the
// deployment has no socket URL.
onBackendChange((d) => {
  if (!callSocket || typeof window === "undefined") return;
  const next = d.chatSocketUrl || d.socketUrl || window.location.origin;
  (callSocket.io as unknown as { uri?: string }).uri = next;
  if (callSocket.connected) {
    callSocket.disconnect();
    callSocket.connect();
  }
});

export function getCallSocket(): Socket {
  if (callSocket) return callSocket;

  callSocket = io(chatOrigin(), {
    autoConnect: false,
    // Start with HTTP long-polling, then upgrade to WebSocket. A websocket-ONLY
    // handshake is rejected by Render's edge (and many proxies), which require the
    // polling handshake first — that was why wss://…onrender.com/socket.io failed.
    transports: ["polling", "websocket"],
    // `auth` MUST be a function, not a static object. socket.io invokes it before
    // every (re)connect, so the CURRENT access token is always sent. With an
    // object the token is snapshotted once; after it rotates (~15 min) reconnects
    // fail with "Invalid token" and the user silently drops out of presence —
    // callers then see "unavailable" while the app still looks online.
    auth: (cb) => cb({ token: TOKENS.access || "" }),
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  // A healthy connection restores the re-auth budget.
  callSocket.on("connect", () => {
    reauthAttempts = 0;
  });

  // Self-heal an expired access token, then RECONNECT.
  //
  // CRITICAL: a handshake rejected by server middleware is a DENIED connection,
  // not a transport error — socket.io sets `socket.active = false` and stops
  // reconnecting FOREVER. This used to only refresh the token and assume
  // socket.io would retry; it doesn't, so the fresh token was never used and the
  // user silently dropped out of presence (callers saw "unavailable") until a
  // full page reload.
  callSocket.on("connect_error", async (err: any) => {
    const s = callSocket;
    if (!s) return;
    const plan = planReauth(err?.message, { active: s.active, attempts: reauthAttempts });
    if (!plan.refresh || refreshing) return;

    reauthAttempts += 1;
    refreshing = true;
    let refreshed = false;
    try {
      await dok.auth.refresh();
      refreshed = true;
    } catch {
      /* genuinely signed out — do NOT reconnect, or we'd hammer the server */
    } finally {
      refreshing = false;
    }

    if (refreshed && plan.reconnect) {
      setTimeout(() => {
        if (!s.connected && !s.active) s.connect();
      }, plan.delayMs);
    }
  });

  return callSocket;
}

export function connectCallSocket(): Socket {
  const s = getCallSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectCallSocket() {
  if (callSocket?.connected) callSocket.disconnect();
}
