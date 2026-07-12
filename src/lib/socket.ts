import { io } from "socket.io-client";
import { dok, TOKENS } from "./api";
import { socketUrl, onBackendChange } from "./backend";

// Main realtime socket (notifications + chat). Lives in chat-service (5001) —
// api-service has no Socket.IO server, so the socket URL must point at
// chat-service (NEXT_PUBLIC_SOCKET_URL, or the *_RENDER/_AWS pair when the
// backend runs on both deployments — see lib/backend.ts).
let socket = null;
let myUserId = null;
let refreshing = false;

function socketOrigin() {
  return socketUrl(); // undefined => same origin via proxy
}

// Dual-deployment failover: when the app switches between Render and AWS,
// re-point the existing manager at the new chat-service origin (same-origin
// for a proxied deployment). socket.io reads io.uri on every (re)connect
// attempt, so all registered event listeners survive the switch.
onBackendChange((d) => {
  if (!socket || typeof window === "undefined") return;
  socket.io.uri = d.socketUrl || window.location.origin;
  if (socket.connected) {
    socket.disconnect();
    socket.connect();
  }
});

export function getSocket() {
  if (socket) return socket;

  socket = io(socketOrigin(), {
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

  // Re-announce presence + notification subscription on every (re)connect so a
  // dropped connection fully restores itself.
  socket.on("connect", () => {
    if (myUserId) {
      socket.emit("user_join", myUserId);
      socket.emit("subscribe_notifications", myUserId);
    }
  });

  // Self-heal an expired access token, then let socket.io retry.
  socket.on("connect_error", async (err) => {
    const msg = err?.message || "";
    if (/auth|token|unauthor/i.test(msg) && !refreshing) {
      refreshing = true;
      try {
        await dok.auth.refresh();
      } catch {
        /* not logged in */
      } finally {
        refreshing = false;
      }
    }
  });

  return socket;
}

export function connectSocket(userId) {
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
