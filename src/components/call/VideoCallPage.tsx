"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, SwitchCamera, ChevronDown } from "lucide-react";
import { useCall } from "@/context/CallContext";
import { cn } from "@/lib/utils";
import { useFloatingDrag } from "./useFloatingDrag";

export default function VideoCallPage() {
  const { call, phase, minimized, setMinimized, localStream, remoteStream, micOn, camOn, toggleMic, toggleCam, switchCamera, endCall } = useCall();
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const [secs, setSecs] = useState(0);
  const { style, handlers } = useFloatingDrag(() => setMinimized(false));

  useEffect(() => { if (localRef.current) localRef.current.srcObject = localStream; }, [localStream]);
  useEffect(() => { if (remoteRef.current) remoteRef.current.srcObject = remoteStream; }, [remoteStream]);
  useEffect(() => {
    if (phase !== "connected") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  if (!call) return null;
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // One container, two skins: full-screen call, or a WhatsApp-style floating
  // tile (drag to move, tap to restore). The <video> elements stay mounted
  // across the switch so the streams — and the remote AUDIO — never restart.
  return (
    <div
      {...(minimized ? handlers : {})}
      style={minimized ? style : undefined}
      className={cn(
        "z-[100] bg-[#0E1213] text-white",
        minimized
          ? "fixed right-4 top-20 h-48 w-32 cursor-grab touch-none select-none overflow-hidden rounded-2xl border border-white/20 shadow-2xl"
          : "fixed inset-0",
      )}
    >
      <video ref={remoteRef} autoPlay playsInline className="h-full w-full object-cover" />
      {phase === "connected" && (
        <div className={cn(
          "absolute left-1/2 -translate-x-1/2 rounded-full bg-black/50 tabular-nums",
          minimized ? "bottom-1.5 px-2 py-0.5 text-[10px]" : "top-5 px-3 py-1 text-sm",
        )}>{fmt(secs)}</div>
      )}
      {phase !== "connected" && (
        <div className="absolute inset-0 grid place-items-center bg-black/50">
          <div className="text-center">
            {!minimized && <p className="text-xl font-bold">{call.peerName}</p>}
            <p className={cn("text-white/60", minimized ? "text-[11px]" : "mt-1 text-sm")}>Connecting…</p>
          </div>
        </div>
      )}
      {/* Self-view is mirrored (-scale-x-100) like every mirror/selfie preview,
          so your left appears on YOUR left. Only the preview flips — the
          stream the peer receives is untouched, and the remote video above is
          never mirrored. Hidden while minimized (tile shows the peer only). */}
      <video ref={localRef} autoPlay playsInline muted
        className={cn("absolute right-4 top-4 h-40 w-28 -scale-x-100 rounded-xl border border-white/20 object-cover", minimized && "hidden")} />
      {!minimized && (
        <>
          <button onClick={() => setMinimized(true)} aria-label="Minimize call"
            className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-black/40 hover:bg-black/60">
            <ChevronDown size={22} />
          </button>
          <div className="absolute inset-x-0 bottom-8 flex items-center justify-center gap-5">
            <CtrlBtn onClick={toggleMic} on={micOn} icon={micOn ? <Mic size={22} /> : <MicOff size={22} />} />
            <CtrlBtn onClick={toggleCam} on={camOn} icon={camOn ? <Video size={22} /> : <VideoOff size={22} />} />
            <CtrlBtn onClick={switchCamera} on icon={<SwitchCamera size={22} />} />
            <button onClick={endCall} className="grid h-14 w-14 place-items-center rounded-full bg-red-600"><PhoneOff size={24} /></button>
          </div>
        </>
      )}
    </div>
  );
}

function CtrlBtn({ onClick, on, icon }: { onClick: () => void; on: boolean; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`grid h-14 w-14 place-items-center rounded-full ${on ? "bg-white/15" : "bg-red-600/40"}`}>
      {icon}
    </button>
  );
}
