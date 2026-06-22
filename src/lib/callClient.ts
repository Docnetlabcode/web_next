import { io, Socket } from "socket.io-client";
import { TOKENS } from "./api";

// The calling signaling lives in chat-service (port 5001), NOT api-service.
// Point NEXT_PUBLIC_CHAT_SOCKET_URL at the chat-service origin, e.g.
//   NEXT_PUBLIC_CHAT_SOCKET_URL=http://localhost:5001
// Falls back to NEXT_PUBLIC_SOCKET_URL, then same-origin.
let callSocket: Socket | null = null;

export function getCallSocket(): Socket {
  if (callSocket) return callSocket;
  const url =
    process.env.NEXT_PUBLIC_CHAT_SOCKET_URL ||
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    undefined;
  callSocket = io(url, {
    autoConnect: false,
    transports: ["websocket"],
    auth: { token: TOKENS.access },
  });
  return callSocket;
}

export function connectCallSocket(): Socket {
  const s = getCallSocket();
  s.auth = { token: TOKENS.access };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectCallSocket() {
  if (callSocket?.connected) callSocket.disconnect();
}
