"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Video, VideoOff, PhoneOff, SwitchCamera } from "lucide-react";
import { useCall } from "@/context/CallContext";

export default function VideoCallPage() {
  const { call, phase, localStream, remoteStream, micOn, camOn, toggleMic, toggleCam, switchCamera, endCall } = useCall();
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const [secs, setSecs] = useState(0);

  useEffect(() => { if (localRef.current) localRef.current.srcObject = localStream; }, [localStream]);
  useEffect(() => { if (remoteRef.current) remoteRef.current.srcObject = remoteStream; }, [remoteStream]);
  useEffect(() => {
    if (phase !== "connected") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  if (!call) return null;
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[100] bg-[#0E1213] text-white">
      <video ref={remoteRef} autoPlay playsInline className="h-full w-full object-cover" />
      {phase === "connected" && (
        <div className="absolute left-1/2 top-5 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm tabular-nums">{fmt(secs)}</div>
      )}
      {phase !== "connected" && (
        <div className="absolute inset-0 grid place-items-center bg-black/50">
          <div className="text-center">
            <p className="text-xl font-bold">{call.peerName}</p>
            <p className="mt-1 text-sm text-white/60">Connecting…</p>
          </div>
        </div>
      )}
      <video ref={localRef} autoPlay playsInline muted className="absolute right-4 top-4 h-40 w-28 rounded-xl border border-white/20 object-cover" />
      <div className="absolute inset-x-0 bottom-8 flex items-center justify-center gap-5">
        <CtrlBtn onClick={toggleMic} on={micOn} icon={micOn ? <Mic size={22} /> : <MicOff size={22} />} />
        <CtrlBtn onClick={toggleCam} on={camOn} icon={camOn ? <Video size={22} /> : <VideoOff size={22} />} />
        <CtrlBtn onClick={switchCamera} on icon={<SwitchCamera size={22} />} />
        <button onClick={endCall} className="grid h-14 w-14 place-items-center rounded-full bg-red-600"><PhoneOff size={24} /></button>
      </div>
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
