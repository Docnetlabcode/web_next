"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import { useCall } from "@/context/CallContext";
import { useRingtone } from "@/hooks/useRingtone";

export default function IncomingCallModal() {
  const { call, acceptCall, rejectCall } = useCall();
  useRingtone(!!call, "ring");
  if (!call) return null;
  const isVideo = call.type === "video";

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70">
      <div className="w-[320px] rounded-2xl bg-[#0B1A19] p-6 text-center text-white shadow-2xl">
        <p className="text-sm text-white/60">Incoming {isVideo ? "video" : "audio"} call</p>
        <div className="mx-auto my-5 grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-emerald-700/30">
          {call.peerPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={call.peerPhoto} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl font-bold">{(call.peerName || "?")[0]?.toUpperCase()}</span>
          )}
        </div>
        <p className="text-xl font-bold">{call.peerName}</p>
        <div className="mt-8 flex items-center justify-around">
          <button onClick={rejectCall} className="grid h-16 w-16 place-items-center rounded-full bg-red-600">
            <PhoneOff size={26} />
          </button>
          <button onClick={acceptCall} className="grid h-16 w-16 place-items-center rounded-full bg-emerald-600">
            {isVideo ? <Video size={26} /> : <Phone size={26} />}
          </button>
        </div>
      </div>
    </div>
  );
}
