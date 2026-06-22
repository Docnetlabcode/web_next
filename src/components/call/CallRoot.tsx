"use client";

import { useCall } from "@/context/CallContext";
import IncomingCallModal from "./IncomingCallModal";
import OutgoingCallModal from "./OutgoingCallModal";
import VideoCallPage from "./VideoCallPage";
import AudioCallPage from "./AudioCallPage";

/// Single global overlay host — renders the correct call surface for the
/// current phase. Mounted once near the app root.
export default function CallRoot() {
  const { phase, call } = useCall();
  if (phase === "incoming") return <IncomingCallModal />;
  if (phase === "outgoing") return <OutgoingCallModal />;
  if (phase === "connecting" || phase === "connected") {
    return call?.type === "video" ? <VideoCallPage /> : <AudioCallPage />;
  }
  return null;
}
