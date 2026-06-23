// Generic WebRTC peer wrapper for the web calling system (testing layer).
// Mirrors the Flutter WebRtcConfig: STUN + optional TURN from NEXT_PUBLIC_* env.
// Signaling is injected (`send`) so this class stays transport-agnostic.

export function iceServers() {
  const servers: RTCIceServer[] = [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302",
        "stun:stun2.l.google.com:19302",
      ],
    },
  ];
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUser = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnPass = process.env.NEXT_PUBLIC_TURN_PASSWORD;
  const turnTls = process.env.NEXT_PUBLIC_TURN_URL_TLS;
  if (turnUrl && turnUser && turnPass) {
    const urls = [turnUrl];
    if (turnTls) urls.push(turnTls);
    servers.push({ urls, username: turnUser, credential: turnPass });
  } else if (typeof window !== "undefined") {
    console.warn("[WebRTC] No TURN configured — calls may fail on CGNAT/symmetric NAT.");
  }
  return servers;
}

export function rtcConfig(): RTCConfiguration {
  return {
    iceServers: iceServers(),
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
  };
}

type Send = (event: string, payload: any) => void;
type Log = (line: string) => void;

export interface CallHandlers {
  send: Send;
  onRemoteStream: (s: MediaStream) => void;
  onConnected: () => void;
  onIceType?: (dir: "sent" | "recv", type: string) => void;
  onState?: (state: string) => void;
  onFailed?: () => void;
  log?: Log;
}

/** Owns one RTCPeerConnection for a single call, identified by callId/peerId. */
export class WebRTCService {
  pc: RTCPeerConnection | null = null;
  localStream: MediaStream | null = null;
  private pending: RTCIceCandidateInit[] = [];
  private hasRemote = false;
  private facing: "user" | "environment" = "user";

  constructor(
    public callId: string,
    public peerId: string,
    public hasVideo: boolean,
    private h: CallHandlers,
  ) {}

  private log(s: string) {
    this.h.log?.(s);
    console.log(`[WebRTC] ${s}`);
  }

  async start(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasAudio = devices.some(d => d.kind === "audioinput");
      const hasVideo = devices.some(d => d.kind === "videoinput");

      console.log("[WEBRTC] Available devices:", devices.map(d => `${d.kind}: ${d.label || d.deviceId}`).join(", "));

      // Always request audio. EnumerateDevices might not see inputs until permission is granted.
      let audioConstraints: boolean | MediaTrackConstraints = true;
      let videoConstraints: boolean | MediaTrackConstraints = false;

      if (this.hasVideo) {
        if (hasVideo) {
          videoConstraints = { facingMode: "user" };
          console.log("[WEBRTC] Video requested and camera found. Selected default camera.");
        } else {
          console.log("[WEBRTC] Fallback: Video requested but no camera found. Falling back to audio-only.");
        }
      }

      if (!hasAudio) {
        console.log("[WEBRTC] Fallback: No microphone found in enumeration, but requesting audio anyway to prompt permissions.");
      }

      console.log("[WEBRTC] getUserMedia constraints:", { audio: audioConstraints, video: videoConstraints });

      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: videoConstraints,
        });
        console.log("[WEBRTC] getUserMedia success");
      } catch (e: any) {
        console.error(`[WEBRTC] Primary getUserMedia failed: ${e.message}. Retrying with audio-only basic constraints.`);
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        console.log("[WEBRTC] getUserMedia fallback success");
      }

      this.log(`local media: ${this.localStream?.getAudioTracks().length || 0}a/${this.localStream?.getVideoTracks().length || 0}v`);

      const pc = new RTCPeerConnection(rtcConfig());
      console.log("[WEBRTC] createPeerConnection success");
      this.pc = pc;
      this.localStream.getTracks().forEach((t) => {
        pc.addTrack(t, this.localStream!);
        console.log(`[WEBRTC] addTrack: ${t.kind}`);
      });

      pc.ontrack = (e) => {
        if (e.streams[0]) {
          this.h.onRemoteStream(e.streams[0]);
          this.h.onConnected();
        }
      };
      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        console.log(`[WEBRTC] ICE_GENERATED: ${e.candidate.candidate}`);
        this.h.send("webrtc_ice_candidate", {
          recipientId: this.peerId,
          callSessionId: this.callId,
          candidate: {
            candidate: e.candidate.candidate,
            sdpMid: e.candidate.sdpMid,
            sdpMLineIndex: e.candidate.sdpMLineIndex,
          },
        });
        console.log("[WEBRTC] ICE_SENT");
        this.h.onIceType?.("sent", iceType(e.candidate.candidate));
      };
      pc.oniceconnectionstatechange = () => {
        console.log(`[WEBRTC] ICE_CONNECTION_STATE=${pc.iceConnectionState}`);
        this.log(`ICE: ${pc.iceConnectionState}`);
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          this.h.onConnected();
        }
        if (pc.iceConnectionState === "failed") this.h.onFailed?.();
      };
      pc.onconnectionstatechange = () => {
        console.log(`[WEBRTC] CONNECTION_STATE=${pc.connectionState}`);
        this.log(`pc: ${pc.connectionState}`);
        this.h.onState?.(pc.connectionState);
        if (pc.connectionState === "failed") this.h.onFailed?.();
      };
      pc.onicegatheringstatechange = () => {
        console.log(`[WEBRTC] ICE_GATHERING_STATE=${pc.iceGatheringState}`);
      };
      pc.onsignalingstatechange = () => {
        console.log(`[WEBRTC] SIGNALING_STATE=${pc.signalingState}`);
      };
    } catch (e: any) {
      console.error(`[WEBRTC] ERROR in src/lib/webrtcService.ts:start - ${e.message}`, e);
    }
  }

  /** Swap to the next camera (mobile front/back). On single-camera desktops this is a no-op visually. */
  async switchCamera(): Promise<void> {
    if (!this.hasVideo || !this.pc || !this.localStream) return;
    this.facing = this.facing === "user" ? "environment" : "user";
    let newStream: MediaStream;
    try {
      newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: this.facing }, audio: false });
    } catch {
      return;
    }
    const newTrack = newStream.getVideoTracks()[0];
    if (!newTrack) return;
    const sender = this.pc.getSenders().find((s) => s.track?.kind === "video");
    if (sender) await sender.replaceTrack(newTrack);
    const old = this.localStream.getVideoTracks()[0];
    if (old) { this.localStream.removeTrack(old); old.stop(); }
    this.localStream.addTrack(newTrack);
    this.log(`switched camera → ${this.facing}`);
  }

  async createOffer() {
    if (!this.pc) return;
    try {
      const offer = await this.pc.createOffer();
      console.log("[WEBRTC] OFFER_CREATED");
      await this.pc.setLocalDescription(offer);
      console.log("[WEBRTC] setLocalDescription(offer) success");
      this.h.send("webrtc_offer", {
        recipientId: this.peerId,
        callSessionId: this.callId,
        offer: { sdp: offer.sdp, type: offer.type },
      });
      console.log("[WEBRTC] OFFER_SENT");
      this.log("offer sent");
    } catch (e: any) {
      console.error(`[WEBRTC] ERROR in src/lib/webrtcService.ts:createOffer - ${e.message}`, e);
    }
  }

  async handleOffer(offer: any) {
    if (!this.pc) return;
    console.log("[WEBRTC] OFFER_RECEIVED");
    this.log("offer received");
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log("[WEBRTC] setRemoteDescription(offer) success");
      await this.drain();
      const answer = await this.pc.createAnswer();
      console.log("[WEBRTC] ANSWER_CREATED");
      await this.pc.setLocalDescription(answer);
      console.log("[WEBRTC] setLocalDescription(answer) success");
      this.h.send("webrtc_answer", {
        recipientId: this.peerId,
        callSessionId: this.callId,
        answer: { sdp: answer.sdp, type: answer.type },
      });
      console.log("[WEBRTC] ANSWER_SENT");
      this.log("answer sent");
    } catch (e: any) {
      console.error(`[WEBRTC] ERROR in src/lib/webrtcService.ts:handleOffer - ${e.message}`, e);
    }
  }

  async handleAnswer(answer: any) {
    if (!this.pc) return;
    console.log("[WEBRTC] ANSWER_RECEIVED");
    try {
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log("[WEBRTC] setRemoteDescription(answer) success");
      await this.drain();
      this.log("answer received");
    } catch (e: any) {
      console.error(`[WEBRTC] ERROR in src/lib/webrtcService.ts:handleAnswer - ${e.message}`, e);
    }
  }

  async addIce(candidate: RTCIceCandidateInit) {
    console.log(`[WEBRTC] ICE_RECEIVED: ${candidate.candidate}`);
    this.h.onIceType?.("recv", iceType((candidate as any).candidate || ""));
    if (this.hasRemote && this.pc) {
      try {
        await this.pc.addIceCandidate(candidate);
        console.log("[WEBRTC] ICE_ADDED");
      } catch (e: any) {
        console.error(`[WEBRTC] ERROR in src/lib/webrtcService.ts:addIce - ${e.message}`, e);
      }
    } else {
      this.pending.push(candidate);
      console.log("[WEBRTC] ICE_QUEUED");
    }
  }

  private async drain() {
    this.hasRemote = true;
    for (const c of this.pending) {
      try {
        await this.pc?.addIceCandidate(c);
        console.log("[WEBRTC] ICE_ADDED (from queue)");
      } catch (e: any) {
        console.error(`[WEBRTC] ERROR in src/lib/webrtcService.ts:drain - ${e.message}`, e);
      }
    }
    this.pending = [];
  }

  toggleMic(on: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = on));
  }
  toggleCam(on: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = on));
  }

  close() {
    try { this.pc?.close(); } catch {}
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.pc = null;
    this.localStream = null;
  }
}

function iceType(c: string) {
  if (c.includes("typ relay")) return "relay";
  if (c.includes("typ srflx")) return "srflx";
  if (c.includes("typ host")) return "host";
  return "?";
}
