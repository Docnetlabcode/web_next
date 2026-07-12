"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, ChevronDown, Phone } from "lucide-react";
import { useCall } from "@/context/CallContext";
import { cn } from "@/lib/utils";
import { useFloatingDrag } from "./useFloatingDrag";

export default function AudioCallPage() {
  const { call, phase, minimized, setMinimized, remoteStream, micOn, toggleMic, endCall } = useCall();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [secs, setSecs] = useState(0);
  const [speakerOn, setSpeakerOn] = useState(true);
  const { style, handlers } = useFloatingDrag(() => setMinimized(false));

  useEffect(() => { if (audioRef.current) audioRef.current.srcObject = remoteStream; }, [remoteStream]);
  useEffect(() => { if (audioRef.current) audioRef.current.muted = !speakerOn; }, [speakerOn, remoteStream]);
  useEffect(() => {
    if (phase !== "connected") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  if (!call) return null;
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const avatar = (size: string, text: string) => (
    <div className={cn("grid place-items-center overflow-hidden rounded-full bg-emerald-700/30", size)}>
      {call.peerPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={call.peerPhoto} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className={cn("font-bold", text)}>{(call.peerName || "?")[0]?.toUpperCase()}</span>
      )}
    </div>
  );

  // One container, two skins: full-screen call, or a WhatsApp-style floating
  // pill (drag to move, tap to restore). The <audio> element stays mounted
  // across the switch so the remote audio never restarts.
  return (
    <div
      {...(minimized ? handlers : {})}
      style={minimized ? style : undefined}
      className={cn(
        "z-[100] bg-[#0E1213] text-white",
        minimized
          ? "fixed right-4 top-20 flex cursor-grab touch-none select-none items-center gap-2.5 rounded-full border border-white/10 py-2 pl-2.5 pr-3 shadow-2xl"
          : "fixed inset-0 grid place-items-center",
      )}
    >
      <audio ref={audioRef} autoPlay />
      {minimized ? (
        <>
          {avatar("h-9 w-9 shrink-0", "text-sm")}
          <div className="min-w-0">
            <p className="max-w-28 truncate text-xs font-semibold">{call.peerName}</p>
            <p className="flex items-center gap-1 text-[10px] tabular-nums text-emerald-400">
              <Phone size={10} /> {phase === "connected" ? fmt(secs) : "Connecting…"}
            </p>
          </div>
          <button onPointerDown={(e) => e.stopPropagation()} onClick={endCall} aria-label="End call"
            className="ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-600"><PhoneOff size={14} /></button>
        </>
      ) : (
        <>
          <button onClick={() => setMinimized(true)} aria-label="Minimize call"
            className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">
            <ChevronDown size={22} />
          </button>
          <div className="text-center">
            <div className="mx-auto mb-5">{avatar("mx-auto h-32 w-32", "text-4xl")}</div>
            <p className="text-2xl font-bold">{call.peerName}</p>
            <p className="mt-2 text-sm tabular-nums text-white/60">{phase === "connected" ? fmt(secs) : "Connecting…"}</p>
            <div className="mt-10 flex items-center justify-center gap-6">
              <button onClick={toggleMic} className={`grid h-14 w-14 place-items-center rounded-full ${micOn ? "bg-white/15" : "bg-red-600/40"}`}>
                {micOn ? <Mic size={22} /> : <MicOff size={22} />}
              </button>
              <button onClick={() => setSpeakerOn((v) => !v)} className={`grid h-14 w-14 place-items-center rounded-full ${speakerOn ? "bg-white/15" : "bg-red-600/40"}`}>
                {speakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
              </button>
              <button onClick={endCall} className="grid h-14 w-14 place-items-center rounded-full bg-red-600"><PhoneOff size={24} /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
