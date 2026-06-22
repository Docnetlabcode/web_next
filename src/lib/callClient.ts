import { io, Socket } from "socket.io-client";
import { dok, TOKENS } from "./api";

// The calling signaling lives in chat-service (port 5001), NOT api-service.
// Point NEXT_PUBLIC_CHAT_SOCKET_URL at the chat-service origin, e.g.
//   NEXT_PUBLIC_CHAT_SOCKET_URL=http://localhost:5001
// Falls back to NEXT_PUBLIC_SOCKET_URL, then same-origin.
let callSocket: Socket | null = null;
let refreshing = false;

function chatOrigin(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_CHAT_SOCKET_URL ||
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    undefined
  );
}

export function getCallSocket(): Socket {
  if (callSocket) return callSocket;

  callSocket = io(chatOrigin(), {
    autoConnect: false,
    transports: ["websocket"],
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

  // Self-heal: if the handshake is rejected because the token expired, mint a
  // fresh one and let socket.io's auto-reconnect retry (auth() reads the new
  // token on the next attempt). Guarded so we never spam the refresh endpoint.
  callSocket.on("connect_error", async (err: any) => {
    const msg = err?.message || "";
    if (/auth|token|unauthor/i.test(msg) && !refreshing) {
      refreshing = true;
      try {
        await dok.auth.refresh();
      } catch {
        /* not logged in — nothing to refresh */
      } finally {
        refreshing = false;
      }
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
