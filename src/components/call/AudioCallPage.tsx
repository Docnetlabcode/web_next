"use client";

import { useEffect, useRef, useState } from "react";
<<<<<<< HEAD
import { Mic, MicOff, PhoneOff } from "lucide-react";
=======
import { Mic, MicOff, PhoneOff, Volume2, VolumeX } from "lucide-react";
>>>>>>> 3aa5a3bac3ede00e58343cae27abe5a5f169d6cd
import { useCall } from "@/context/CallContext";

export default function AudioCallPage() {
  const { call, phase, remoteStream, micOn, toggleMic, endCall } = useCall();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [secs, setSecs] = useState(0);
<<<<<<< HEAD

  useEffect(() => { if (audioRef.current) audioRef.current.srcObject = remoteStream; }, [remoteStream]);
=======
  const [speakerOn, setSpeakerOn] = useState(true);

  useEffect(() => { if (audioRef.current) audioRef.current.srcObject = remoteStream; }, [remoteStream]);
  useEffect(() => { if (audioRef.current) audioRef.current.muted = !speakerOn; }, [speakerOn, remoteStream]);
>>>>>>> 3aa5a3bac3ede00e58343cae27abe5a5f169d6cd
  useEffect(() => {
    if (phase !== "connected") return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  if (!call) return null;
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#0E1213] text-white">
      <audio ref={audioRef} autoPlay />
      <div className="text-center">
        <div className="mx-auto mb-5 grid h-32 w-32 place-items-center overflow-hidden rounded-full bg-emerald-700/30">
          {call.peerPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={call.peerPhoto} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-4xl font-bold">{(call.peerName || "?")[0]?.toUpperCase()}</span>
          )}
        </div>
        <p className="text-2xl font-bold">{call.peerName}</p>
        <p className="mt-2 text-sm text-white/60">{phase === "connected" ? fmt(secs) : "Connecting…"}</p>
        <div className="mt-10 flex items-center justify-center gap-6">
          <button onClick={toggleMic} className={`grid h-14 w-14 place-items-center rounded-full ${micOn ? "bg-white/15" : "bg-red-600/40"}`}>
            {micOn ? <Mic size={22} /> : <MicOff size={22} />}
          </button>
<<<<<<< HEAD
=======
          <button onClick={() => setSpeakerOn((v) => !v)} className={`grid h-14 w-14 place-items-center rounded-full ${speakerOn ? "bg-white/15" : "bg-red-600/40"}`}>
            {speakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
          </button>
>>>>>>> 3aa5a3bac3ede00e58343cae27abe5a5f169d6cd
          <button onClick={endCall} className="grid h-14 w-14 place-items-center rounded-full bg-red-600"><PhoneOff size={24} /></button>
        </div>
      </div>
    </div>
  );
}
