"use client";

import { PhoneOff } from "lucide-react";
import { useCall } from "@/context/CallContext";

export default function OutgoingCallModal() {
  const { call, endCall } = useCall();
  if (!call) return null;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70">
      <div className="w-[320px] rounded-2xl bg-[#0B1A19] p-6 text-center text-white shadow-2xl">
        <p className="text-sm text-white/60">Calling…</p>
        <div className="mx-auto my-5 grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-emerald-700/30">
          {call.peerPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={call.peerPhoto} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl font-bold">{(call.peerName || "?")[0]?.toUpperCase()}</span>
          )}
        </div>
        <p className="text-xl font-bold">{call.peerName}</p>
        <p className="mt-1 text-xs text-white/50">{call.type === "video" ? "Video call" : "Audio call"}</p>
        <button onClick={endCall} className="mx-auto mt-8 grid h-16 w-16 place-items-center rounded-full bg-red-600">
          <PhoneOff size={26} />
        </button>
      </div>
    </div>
  );
}
