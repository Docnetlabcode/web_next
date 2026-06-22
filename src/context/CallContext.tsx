"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { connectCallSocket } from "@/lib/callClient";
import { WebRTCService } from "@/lib/webrtcService";

export type CallPhase = "idle" | "outgoing" | "incoming" | "connecting" | "connected" | "ended";
export type CallType = "audio" | "video";

export interface ActiveCall {
  callId: string;
  peerId: string;
  peerName: string;
  peerPhoto?: string | null;
  type: CallType;
  isCaller: boolean;
}

interface CallCtx {
  phase: CallPhase;
  call: ActiveCall | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
  logs: string[];
  socketConnected: boolean;
  startCall: (peerId: string, peerName: string, peerPhoto: string | null, type: CallType) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  toggleMic: () => void;
  toggleCam: () => void;
}

const Ctx = createContext<CallCtx | null>(null);
export const useCall = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCall must be used within CallProvider");
  return c;
};

const newCallId = () => `call_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

export function CallProvider({ children }: { children: React.ReactNode }) {
  const auth: any = useAuth() || {};
  const user = auth.user;
  const myId = user?._id || user?.id;

  const [phase, setPhase] = useState<CallPhase>("idle");
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);

  const svcRef = useRef<WebRTCService | null>(null);
  const callRef = useRef<ActiveCall | null>(null);
  const ringTimeout = useRef<any>(null);
  callRef.current = call;

  const log = useCallback((line: string) => {
    const ts = new Date().toISOString().substring(11, 23);
    setLogs((p) => [`[${ts}] ${line}`, ...p].slice(0, 200));
    // eslint-disable-next-line no-console
    console.log(`[Call] ${line}`);
  }, []);

  const socket = useRef<any>(null);

  // Build the WebRTCService for the current call and wire its callbacks.
  const buildService = useCallback((c: ActiveCall) => {
    const svc = new WebRTCService(c.callId, c.peerId, c.type === "video", {
      send: (event, payload) => socket.current?.emit(event, payload),
      onRemoteStream: (s) => setRemoteStream(s),
      onConnected: () => setPhase((p) => (p === "connected" ? p : (log("✅ connected"), "connected"))),
      onIceType: (dir, t) => log(`ICE ${dir} ${t}`),
      log,
    });
    svcRef.current = svc;
    return svc;
  }, [log]);

  const cleanup = useCallback((reason: string) => {
    if (ringTimeout.current) clearTimeout(ringTimeout.current);
    svcRef.current?.close();
    svcRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setMicOn(true);
    setCamOn(true);
    log(`🔚 ended (${reason})`);
    setPhase("idle");
    setCall(null);
  }, [log]);

  // ── Socket wiring ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;
    const s = connectCallSocket();
    socket.current = s;

    const onConnect = () => { setSocketConnected(true); log("socket connected"); s.emit("user_join", myId); };
    const onDisconnect = () => { setSocketConnected(false); log("socket disconnected"); };

    const onInvite = (d: any) => {
      log(`INVITE RECEIVED ${d.callId} from ${d.fromUserId} (${d.callType})`);
      if (callRef.current) { s.emit("user_call_busy", { callId: d.callId, toUserId: d.fromUserId }); return; }
      setCall({
        callId: d.callId, peerId: d.fromUserId, peerName: d.callerName || "Unknown",
        peerPhoto: d.callerPhoto, type: d.callType === "audio" ? "audio" : "video", isCaller: false,
      });
      setPhase("incoming");
    };

    const onAccepted = async (d: any) => {
      const c = callRef.current;
      if (!c || d.callId !== c.callId) return;
      if (ringTimeout.current) clearTimeout(ringTimeout.current);
      log("callee accepted → starting media/offer");
      setPhase("connecting");
      const svc = buildService(c);
      try {
        await svc.start();
        setLocalStream(svc.localStream);
        await svc.createOffer();
      } catch (e: any) {
        log(`media/offer failed: ${e?.message || e}`);
        socket.current?.emit("user_call_end", { callId: c.callId, toUserId: c.peerId });
        cleanup("media error");
      }
    };

    const onRejected = (d: any) => { if (callRef.current && d.callId === callRef.current.callId) cleanup("rejected/timeout"); };
    const onBusy = (d: any) => { if (callRef.current && d.callId === callRef.current.callId) cleanup("busy"); };
    const onRemoteEnd = (d: any) => { if (callRef.current && d.callId === callRef.current.callId) cleanup("remote ended"); };
    const onUnavailable = (d: any) => { if (callRef.current && d.callId === callRef.current.callId) cleanup("unavailable"); };

    const onOffer = async (d: any) => {
      const c = callRef.current;
      if (!c || d.callSessionId !== c.callId || c.isCaller) return;
      await svcRef.current?.handleOffer(d.offer);
    };
    const onAnswer = async (d: any) => {
      const c = callRef.current;
      if (!c || d.callSessionId !== c.callId || !c.isCaller) return;
      await svcRef.current?.handleAnswer(d.answer);
    };
    const onIce = async (d: any) => {
      const c = callRef.current;
      if (!c || d.callSessionId !== c.callId) return;
      await svcRef.current?.addIce(d.candidate);
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("user_call_invite", onInvite);
    s.on("user_call_accept", onAccepted);
    s.on("user_call_reject", onRejected);
    s.on("user_call_timeout", onRejected);
    s.on("user_call_busy", onBusy);
    s.on("user_call_end", onRemoteEnd);
    s.on("user_call_unavailable", onUnavailable);
    s.on("webrtc_offer", onOffer);
    s.on("webrtc_answer", onAnswer);
    s.on("webrtc_ice_candidate", onIce);
    if (s.connected) onConnect();

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("user_call_invite", onInvite);
      s.off("user_call_accept", onAccepted);
      s.off("user_call_reject", onRejected);
      s.off("user_call_timeout", onRejected);
      s.off("user_call_busy", onBusy);
      s.off("user_call_end", onRemoteEnd);
      s.off("user_call_unavailable", onUnavailable);
      s.off("webrtc_offer", onOffer);
      s.off("webrtc_answer", onAnswer);
      s.off("webrtc_ice_candidate", onIce);
    };
  }, [myId, buildService, cleanup, log]);

  // ── Public actions ──────────────────────────────────────────────────────────
  const startCall = useCallback((peerId: string, peerName: string, peerPhoto: string | null, type: CallType) => {
    if (!peerId || callRef.current) return;
    const c: ActiveCall = { callId: newCallId(), peerId, peerName, peerPhoto, type, isCaller: true };
    setCall(c);
    setPhase("outgoing");
    socket.current?.emit("user_call_invite", {
      callId: c.callId, toUserId: peerId, callType: type,
      callerName: user?.fullName, callerPhoto: user?.profilePhoto || null,
    });
    log(`INVITE SENT ${c.callId} → ${peerId} (${type})`);
    ringTimeout.current = setTimeout(() => {
      socket.current?.emit("user_call_timeout", { callId: c.callId, toUserId: peerId });
      cleanup("no answer");
    }, 45000);
  }, [user, log, cleanup]);

  const acceptCall = useCallback(async () => {
    const c = callRef.current;
    if (!c) return;
    setPhase("connecting");
    const svc = buildService(c);
    // Acquire media and build the peer connection BEFORE telling the caller to
    // send its offer. Otherwise the offer can arrive before our pc exists and
    // handleOffer() silently drops it, leaving the call stuck on "Connecting…".
    try {
      await svc.start();
    } catch (e: any) {
      log(`media failed: ${e?.message || e}`);
      socket.current?.emit("user_call_reject", { callId: c.callId, toUserId: c.peerId });
      cleanup("media error");
      return;
    }
    setLocalStream(svc.localStream);
    socket.current?.emit("user_call_accept", { callId: c.callId, toUserId: c.peerId });
    log("media ready → ACCEPT sent, waiting for offer");
  }, [buildService, log, cleanup]);

  const rejectCall = useCallback(() => {
    const c = callRef.current;
    if (c) socket.current?.emit("user_call_reject", { callId: c.callId, toUserId: c.peerId });
    cleanup("rejected locally");
  }, [cleanup]);

  const endCall = useCallback(() => {
    const c = callRef.current;
    if (c) socket.current?.emit("user_call_end", { callId: c.callId, toUserId: c.peerId });
    cleanup("ended locally");
  }, [cleanup]);

  const toggleMic = useCallback(() => {
    setMicOn((on) => { svcRef.current?.toggleMic(!on); return !on; });
  }, []);
  const toggleCam = useCallback(() => {
    setCamOn((on) => { svcRef.current?.toggleCam(!on); return !on; });
  }, []);

  return (
    <Ctx.Provider value={{
      phase, call, localStream, remoteStream, micOn, camOn, logs, socketConnected,
      startCall, acceptCall, rejectCall, endCall, toggleMic, toggleCam,
    }}>
      {children}
    </Ctx.Provider>
  );
}
