import { io, Socket } from "socket.io-client";
import { dok, TOKENS } from "./api";
import { socketUrl, onBackendChange } from "./backend";
import { planReauth } from "./socketReauth";

// Main realtime socket (notifications + chat). Lives in chat-service (5001) —
// api-service has no Socket.IO server, so the socket URL must point at
// chat-service (NEXT_PUBLIC_SOCKET_URL, or the *_RENDER/_AWS pair when the
// backend runs on both deployments — see lib/backend.ts).
// Typed like callClient.ts's `callSocket`: `= null` alone makes TS infer the
// type as `null`, which errored on every later use of this variable.
let socket: Socket | null = null;
let myUserId: string | null = null;
let refreshing = false;
let reauthAttempts = 0;

function socketOrigin() {
  return socketUrl(); // undefined => same origin via proxy
}

// Dual-deployment failover: when the app switches between Render and AWS,
// re-point the existing manager at the new chat-service origin (same-origin
// for a proxied deployment). socket.io reads io.uri on every (re)connect
// attempt, so all registered event listeners survive the switch.
onBackendChange((d) => {
  const s = socket;
  if (!s || typeof window === "undefined") return;
  // `uri` is marked private in the typings but is the documented way to
  // re-point a live manager, so the double cast is deliberate.
  (s.io as unknown as { uri?: string }).uri = d.socketUrl || window.location.origin;
  if (s.connected) {
    s.disconnect();
    s.connect();
  }
});

export function getSocket(): Socket {
  if (socket) return socket;

  // Bind to a local const: every handler below closes over `s`, so TypeScript
  // doesn't have to re-narrow the module-level `socket` inside each callback.
  const s: Socket = io(socketOrigin(), {
    autoConnect: false,
    // Polling first, then upgrade to WebSocket — a websocket-only handshake is
    // rejected by Render's edge / many proxies (the onrender.com WS failures).
    transports: ["polling", "websocket"],
    // Function form so every (re)connect sends the CURRENT token. A static
    // object snapshots the token once and goes stale after it rotates, which
    // makes reconnects fail with "Invalid token" and drops the user offline.
    auth: (cb) => cb({ token: TOKENS.access || "" }),
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket = s;

  // Re-announce presence + notification subscription on every (re)connect so a
  // dropped connection fully restores itself.
  s.on("connect", () => {
    reauthAttempts = 0; // a healthy connection restores the re-auth budget
    if (myUserId) {
      s.emit("user_join", myUserId);
      s.emit("subscribe_notifications", myUserId);
    }
  });

  // Self-heal an expired access token.
  //
  // CRITICAL: a handshake rejected by server middleware is a DENIED connection,
  // not a transport error — socket.io sets `socket.active = false` and stops
  // reconnecting FOREVER. Refreshing the token alone (what this used to do) left
  // the new token unused and the socket dead until a full page reload, which is
  // why real-time chat silently stopped while REST kept working.
  s.on("connect_error", async (err) => {
    const plan = planReauth(err?.message, {
      active: s.active,
      attempts: reauthAttempts,
    });
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

    // socket.io will never retry a denied handshake on its own, so do it here.
    if (refreshed && plan.reconnect) {
      setTimeout(() => {
        if (!s.connected && !s.active) s.connect();
      }, plan.delayMs);
    }
  });

  return s;
}

export function connectSocket(userId?: string): Socket {
  if (userId) myUserId = userId;
  const s = getSocket();
  if (!s.connected) s.connect();
  else if (myUserId) {
    s.emit("user_join", myUserId);
    s.emit("subscribe_notifications", myUserId);
  }
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
