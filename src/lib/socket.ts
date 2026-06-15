import { io } from "socket.io-client";
import { TOKENS } from "./api";

let socket = null;

export function getSocket() {
  if (socket) return socket;
  const url = process.env.NEXT_PUBLIC_SOCKET_URL || undefined; // same origin via proxy
  socket = io(url, {
    autoConnect: false,
    transports: ["websocket"],
    auth: { token: TOKENS.access },
  });
  return socket;
}

export function connectSocket(userId) {
  const s = getSocket();
  s.auth = { token: TOKENS.access };
  if (!s.connected) s.connect();
  if (userId) {
    s.emit("user_join", userId);
    s.emit("subscribe_notifications", userId);
  }
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
