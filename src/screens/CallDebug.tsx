"use client";

import { useState } from "react";
import { useCall, type CallType } from "@/context/CallContext";

/**
 * Temporary calling debug dashboard (spec Step 14). Mounted at /app/call-debug.
 * Shows live socket/call state and lets you place a call directly by user id so
 * web-to-web calling can be proven without going through the chat list.
 */
export default function CallDebug() {
  const {
    socketConnected, myId, phase, call, connectionState, debug, logs, startCall, endCall,
  } = useCall();
  const [peerId, setPeerId] = useState("");
  const [type, setType] = useState<CallType>("video");

  const place = () => { if (peerId.trim()) startCall(peerId.trim(), "Debug Peer", null, type); };

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-5 text-sm">
      <h1 className="text-lg font-bold">Call Debug</h1>

      <section className="grid grid-cols-2 gap-3">
        <Stat label="Socket connected" value={socketConnected ? "✅ yes" : "❌ no"} />
        <Stat label="Current user id" value={myId || "—"} mono />
        <Stat label="Call state (phase)" value={phase} />
        <Stat label="WebRTC connection" value={connectionState || "—"} />
        <Stat label="Peer" value={call ? `${call.peerName} (${call.peerId})` : "—"} mono />
        <Stat label="Call id" value={call?.callId || "—"} mono />
      </section>

      <section className="rounded-xl border border-ink-900/10 p-4">
        <p className="mb-2 font-semibold">Place a call by user id</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={peerId}
            onChange={(e) => setPeerId(e.target.value)}
            placeholder="target users.id (UUID)"
            className="min-w-[260px] flex-1 rounded-lg border border-ink-900/15 px-3 py-2"
          />
          <select value={type} onChange={(e) => setType(e.target.value as CallType)} className="rounded-lg border border-ink-900/15 px-3 py-2">
            <option value="video">video</option>
            <option value="audio">audio</option>
          </select>
          <button onClick={place} className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white">Call</button>
          {call && <button onClick={endCall} className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white">End</button>}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <Json label="Last invite" data={debug.lastInvite} />
        <Json label="Last offer" data={debug.lastOffer} />
        <Json label="Last answer" data={debug.lastAnswer} />
        <Json label="Last ICE candidate" data={debug.lastIce} />
      </section>

      <section className="rounded-xl border border-ink-900/10 p-4">
        <p className="mb-2 font-semibold">Event log ({logs.length})</p>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-ink-900/90 p-3 text-xs leading-relaxed text-emerald-200">
          {logs.join("\n") || "no events yet"}
        </pre>
      </section>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-ink-900/10 p-3">
      <p className="text-xs text-ink-500">{label}</p>
      <p className={`mt-0.5 font-semibold ${mono ? "break-all font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}

function Json({ label, data }: { label: string; data: any }) {
  return (
    <div className="rounded-xl border border-ink-900/10 p-3">
      <p className="mb-1 text-xs font-semibold text-ink-500">{label}</p>
      <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-snug">
        {data ? JSON.stringify(data, null, 2) : "—"}
      </pre>
    </div>
  );
}
