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
  log?: Log;
}

/** Owns one RTCPeerConnection for a single call, identified by callId/peerId. */
export class WebRTCService {
  pc: RTCPeerConnection | null = null;
  localStream: MediaStream | null = null;
  private pending: RTCIceCandidateInit[] = [];
  private hasRemote = false;

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
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: this.hasVideo ? { facingMode: "user" } : false,
    });
    this.log(`local media: ${this.localStream.getAudioTracks().length}a/${this.localStream.getVideoTracks().length}v`);

    const pc = new RTCPeerConnection(rtcConfig());
    this.pc = pc;
    this.localStream.getTracks().forEach((t) => pc.addTrack(t, this.localStream!));

    pc.ontrack = (e) => {
      if (e.streams[0]) {
        this.h.onRemoteStream(e.streams[0]);
        this.h.onConnected();
      }
    };
    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      this.h.send("webrtc_ice_candidate", {
        recipientId: this.peerId,
        callSessionId: this.callId,
        candidate: {
          candidate: e.candidate.candidate,
          sdpMid: e.candidate.sdpMid,
          sdpMLineIndex: e.candidate.sdpMLineIndex,
        },
      });
      this.h.onIceType?.("sent", iceType(e.candidate.candidate));
    };
    pc.oniceconnectionstatechange = () => {
      this.log(`ICE: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
        this.h.onConnected();
      }
    };
    pc.onconnectionstatechange = () => this.log(`pc: ${pc.connectionState}`);
  }

  async createOffer() {
    if (!this.pc) return;
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.h.send("webrtc_offer", {
      recipientId: this.peerId,
      callSessionId: this.callId,
      offer: { sdp: offer.sdp, type: offer.type },
    });
    this.log("offer sent");
  }

  async handleOffer(offer: any) {
    if (!this.pc) return;
    this.log("offer received");
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    await this.drain();
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    this.h.send("webrtc_answer", {
      recipientId: this.peerId,
      callSessionId: this.callId,
      answer: { sdp: answer.sdp, type: answer.type },
    });
    this.log("answer sent");
  }

  async handleAnswer(answer: any) {
    if (!this.pc) return;
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    await this.drain();
    this.log("answer received");
  }

  async addIce(candidate: RTCIceCandidateInit) {
    this.h.onIceType?.("recv", iceType((candidate as any).candidate || ""));
    if (this.hasRemote && this.pc) {
      try { await this.pc.addIceCandidate(candidate); } catch {}
    } else {
      this.pending.push(candidate);
    }
  }

  private async drain() {
    this.hasRemote = true;
    for (const c of this.pending) {
      try { await this.pc?.addIceCandidate(c); } catch {}
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
