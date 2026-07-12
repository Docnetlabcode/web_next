"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "@/lib/router";
import { Send, Check, CheckCheck, Phone, Video, Search, MessageSquare, ArrowLeft } from "lucide-react";
import { Avatar, Verified } from "@/components/ui/Primitives";
import { RowsSkeleton, ChatThreadSkeleton } from "@/components/ui/Skeletons";
import { useAppearance } from "@/context/AppearanceContext";
import { BUBBLES, WALLPAPERS } from "@/lib/appearance";
import { useAuth } from "@/context/AuthContext";
import { useCall } from "@/context/CallContext";
import { useToast } from "@/components/ui/Toast";
import { dok } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { cn, timeAgo } from "@/lib/utils";

const cidOf = (c) => c?.conversationId || c?.id || c?._id;
const midOf = (m) => m?._id || m?.id;
const STATUS_RANK = { sent: 0, delivered: 1, seen: 2 };

export default function Messages() {
  const { user } = useAuth();
  const { startCall } = useCall();
  const toast = useToast();
  const myId = user?._id || user?.id;
  const [sp] = useSearchParams();
  // Chat customization (Settings → Appearance): bubble shape + wallpaper.
  const { appearance } = useAppearance();
  const bubble = BUBBLES[appearance.bubble];
  const wallpaper = WALLPAPERS[appearance.wallpaper].className;

  const [convos, setConvos] = useState(null); // null = loading
  const [active, setActive] = useState(null);
  // Below md the list and the thread share the screen (master–detail): tapping
  // a conversation slides to the thread, the header back button returns. On
  // md+ both panes are always visible and this flag has no effect.
  const [mobileThread, setMobileThread] = useState(false);
  const [msgs, setMsgs] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const [peerTyping, setPeerTyping] = useState(false);
  const endRef = useRef(null);

  // Socket handlers are registered once; refs give them the current values.
  const activeRef = useRef(null);
  activeRef.current = active;
  const myIdRef = useRef(null);
  myIdRef.current = myId;
  const peerTypingTimer = useRef(null);
  const selfTyping = useRef({ last: 0, timer: null });

  // The "other" participant on a 1:1 conversation, regardless of payload shape.
  const peer = (c) =>
    c?.participant ||
    (c?.participants || []).find((p) => (p.id || p._id) !== myId) ||
    (c?.participants || [])[0] ||
    {};

  // The other participant's userId (decorated `participant` or raw subdocs).
  const peerIdOf = (c) => {
    const p = c?.participant || c?.other || c?.otherParticipant;
    return (
      p?.id || p?._id || p?.userId ||
      (c?.participants || [])
        .map((x) => x.userId || x.id || x._id)
        .find((id) => id && String(id) !== String(myIdRef.current))
    );
  };

  const markSeen = (c) => {
    const cid = cidOf(c);
    const pid = peerIdOf(c);
    if (!cid || !pid) return;
    getSocket().emit("mark_seen", { conversationId: String(cid), senderId: String(pid) });
    setConvos((prev) => (prev ? prev.map((x) => (cidOf(x) === cid ? { ...x, unreadCount: 0 } : x)) : prev));
  };

  // load conversation list
  useEffect(() => {
    dok.chat.conversations()
      .then((d) => setConvos(d.conversations || d || []))
      .catch(() => setConvos([]));
  }, []);

  // pick the deep-linked (?c=) conversation, else the first one
  useEffect(() => {
    if (!convos) return;
    const wanted = sp?.get("c");
    const match = wanted ? convos.find((c) => String(cidOf(c)) === String(wanted)) : null;
    if (match) setMobileThread(true); // deep link opens the thread on small screens too
    setActive((a) => a || match || convos[0] || null);
  }, [convos, sp]);

  // load messages for the active conversation, join its room, mark it seen
  useEffect(() => {
    if (!active) { setMsgs(active === null ? null : []); return; }
    setPeerTyping(false);
    getSocket().emit("join_conversation", { conversationId: String(cidOf(active)) });
    setMsgs(null);
    let alive = true;
    dok.chat.messages(cidOf(active))
      .then((d) => {
        if (!alive) return;
        setMsgs(d.messages || d || []);
        markSeen(active);
      })
      .catch(() => alive && setMsgs([]));
    return () => { alive = false; };
  }, [active]);

  // realtime: subscribe once to the chat-service socket events
  useEffect(() => {
    const s = getSocket();

    // Move the conversation to the top of the list with a fresh preview.
    const bump = (m, { unread }) =>
      setConvos((prev) => {
        if (!prev) return prev;
        const cid = String(m.conversationId);
        const idx = prev.findIndex((c) => String(cidOf(c)) === cid);
        if (idx === -1) {
          // brand-new conversation — refetch the list to pick it up
          dok.chat.conversations().then((d) => setConvos(d.conversations || d || [])).catch(() => {});
          return prev;
        }
        const c = {
          ...prev[idx],
          lastMessage: { content: m.content, type: m.type, messageType: m.type, senderId: m.senderId, timestamp: m.createdAt, createdAt: m.createdAt },
          unreadCount: unread ? (prev[idx].unreadCount || 0) + 1 : prev[idx].unreadCount || 0,
        };
        return [c, ...prev.filter((_, i) => i !== idx)];
      });

    // Append to the open thread, replacing an optimistic temp / skipping dupes.
    const appendToThread = (m) =>
      setMsgs((prev) => {
        if (!prev) return prev; // thread still loading — the fetch will include it
        if (prev.some((x) => String(midOf(x)) === String(midOf(m)))) return prev;
        const tmpIdx = prev.findIndex(
          (x) => String(midOf(x)).startsWith("tmp-") && x.content === m.content && String(x.senderId) === String(m.senderId),
        );
        if (tmpIdx !== -1) { const next = [...prev]; next[tmpIdx] = m; return next; }
        return [...prev, m];
      });

    const onNewMessage = (m) => {
      const act = activeRef.current;
      const isActive = act && String(cidOf(act)) === String(m.conversationId);
      if (isActive) {
        appendToThread(m);
        setPeerTyping(false);
        // viewing the thread — flip it to seen right away
        s.emit("mark_seen", { conversationId: String(m.conversationId), senderId: String(m.senderId) });
      }
      bump(m, { unread: !isActive });
    };

    // Echo of our own message (from this tab or another device).
    const onMessageSent = (m) => {
      const act = activeRef.current;
      if (act && String(cidOf(act)) === String(m.conversationId)) appendToThread(m);
      bump(m, { unread: false });
    };

    // Unified shape: { conversationId, messageIds, status, seenBy? }.
    // Only upgrade (sent → delivered → seen) so late events can't downgrade.
    const onStatus = ({ conversationId, messageIds, status }) => {
      if (!messageIds?.length) return;
      const act = activeRef.current;
      if (!act || String(cidOf(act)) !== String(conversationId)) return;
      const ids = new Set(messageIds.map(String));
      setMsgs((prev) =>
        prev
          ? prev.map((x) =>
              ids.has(String(midOf(x))) && (STATUS_RANK[status] ?? 0) > (STATUS_RANK[x.status] ?? 0)
                ? { ...x, status }
                : x,
            )
          : prev,
      );
    };

    const onDeleted = ({ messageId, conversationId }) => {
      const act = activeRef.current;
      if (!act || (conversationId && String(cidOf(act)) !== String(conversationId))) return;
      setMsgs((prev) =>
        prev ? prev.map((x) => (String(midOf(x)) === String(messageId) ? { ...x, content: "This message was deleted.", isDeleted: true } : x)) : prev,
      );
    };

    const onTypingStart = ({ userId: uid, conversationId }) => {
      const act = activeRef.current;
      if (!act || String(cidOf(act)) !== String(conversationId) || String(uid) === String(myIdRef.current)) return;
      setPeerTyping(true);
      clearTimeout(peerTypingTimer.current);
      peerTypingTimer.current = setTimeout(() => setPeerTyping(false), 4000);
    };

    const onTypingStop = ({ conversationId }) => {
      const act = activeRef.current;
      if (act && String(cidOf(act)) === String(conversationId)) setPeerTyping(false);
    };

    // Rooms don't survive a reconnect — rejoin the open conversation.
    const onConnect = () => {
      const act = activeRef.current;
      if (act) s.emit("join_conversation", { conversationId: String(cidOf(act)) });
    };

    s.on("connect", onConnect);
    s.on("new_message", onNewMessage);
    s.on("message_sent", onMessageSent);
    s.on("message_status_update", onStatus);
    s.on("message_deleted", onDeleted);
    s.on("typing_start", onTypingStart);
    s.on("typing_stop", onTypingStop);
    return () => {
      s.off("connect", onConnect);
      s.off("new_message", onNewMessage);
      s.off("message_sent", onMessageSent);
      s.off("message_status_update", onStatus);
      s.off("message_deleted", onDeleted);
      s.off("typing_start", onTypingStart);
      s.off("typing_stop", onTypingStop);
      clearTimeout(peerTypingTimer.current);
      clearTimeout(selfTyping.current.timer);
    };
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const isMine = (m) => m.mine ?? ((m.senderId || m.sender?.id || m.sender?._id) === myId);

  const onInputChange = (e) => {
    setText(e.target.value);
    if (!active) return;
    const s = getSocket();
    const cid = String(cidOf(active));
    const now = Date.now();
    if (now - selfTyping.current.last > 1200) {
      selfTyping.current.last = now;
      s.emit("typing_start", { conversationId: cid });
    }
    clearTimeout(selfTyping.current.timer);
    selfTyping.current.timer = setTimeout(() => s.emit("typing_stop", { conversationId: cid }), 1500);
  };

  const send = async () => {
    const content = text.trim();
    if (!content || !active || sending) return;
    const temp = { _id: `tmp-${Date.now()}`, senderId: myId, content, status: "sent", createdAt: new Date().toISOString() };
    setMsgs((m) => [...(m || []), temp]);
    setText("");
    setSending(true);
    clearTimeout(selfTyping.current.timer);
    getSocket().emit("typing_stop", { conversationId: String(cidOf(active)) });
    try {
      const d = await dok.chat.send(cidOf(active), { content, type: "text", messageType: "text" });
      const real = d.message || d;
      if (midOf(real)) {
        setMsgs((m) => {
          const list = m || [];
          // the socket echo may have replaced the temp already — just drop it
          if (list.some((x) => String(midOf(x)) === String(midOf(real)))) return list.filter((x) => midOf(x) !== temp._id);
          return list.map((x) => (midOf(x) === temp._id ? real : x));
        });
      }
    } catch {
      setMsgs((m) => (m || []).filter((x) => midOf(x) !== temp._id));
      setText(content);
      toast?.error("Couldn't send — try again");
    } finally {
      setSending(false);
    }
  };

  const shown = (convos || []).filter((c) => {
    if (!query.trim()) return true;
    return (peer(c).fullName || "").toLowerCase().includes(query.toLowerCase());
  });

  return (
    // Height: 9rem = topbar (4rem) + page padding + breathing room. Below lg
    // the fixed bottom nav (~3.5rem) also eats viewport, or the composer ends
    // up underneath it — hence the smaller mobile height.
    <div className="grid h-[calc(100vh-12.5rem)] grid-cols-1 grid-rows-1 overflow-hidden rounded-2xl border border-ink-900/[.06] bg-surface shadow-card md:grid-cols-[320px_1fr] lg:h-[calc(100vh-9rem)]">
      {/* List — on small screens hidden while a thread is open */}
      <div className={cn("min-h-0 flex-col border-r border-ink-900/[.06]", mobileThread && active ? "hidden md:flex" : "flex")}>
        <div className="border-b border-ink-900/[.06] p-4">
          <h2 className="font-display text-lg font-extrabold">Messages</h2>
          <div className="relative mt-3"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-full rounded-full bg-ink-900/[.04] py-2 pl-9 pr-3 text-sm outline-none" /></div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {convos === null ? (
            <RowsSkeleton count={5} className="p-1.5" />
          ) : shown.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink-400">{query ? "No matches" : "No conversations yet. Connect with colleagues to start chatting."}</p>
          ) : shown.map((c) => {
            const p = peer(c);
            const lm = c.lastMessage || {};
            return (
              <button key={cidOf(c)} onClick={() => { setActive(c); setMobileThread(true); }}
                className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-ink-900/[.03]", cidOf(active) === cidOf(c) && "bg-brand-50")}>
                <div className="relative"><Avatar user={p} size={46} />{c.isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface bg-emerald-500" />}</div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold">{p.fullName} {p.isVerified && <Verified size={11} />}</p>
                  <p className="truncate text-xs text-ink-500">{lm.content || ""}</p>
                </div>
                <div className="text-right">
                  {(lm.createdAt || lm.timestamp) && <p className="text-[11px] text-ink-400">{timeAgo(lm.createdAt || lm.timestamp)}</p>}
                  {c.unreadCount > 0 && <span className="mt-1 inline-grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">{c.unreadCount}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thread — full-screen on small screens once a conversation is opened */}
      <div className={cn("min-h-0 flex-col bg-ink-50", mobileThread && active ? "flex" : "hidden md:flex")}>
        {!active ? (
          <div className="grid flex-1 place-items-center text-center text-ink-400">
            <div><MessageSquare size={40} className="mx-auto mb-2 text-ink-300" /><p className="text-sm">Select a conversation to start messaging.</p></div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-ink-900/[.06] bg-surface px-3 py-3 md:px-5">
              <button onClick={() => setMobileThread(false)} aria-label="Back to conversations"
                className="-mr-1 shrink-0 rounded-full p-1.5 text-ink-500 hover:bg-ink-900/5 md:hidden"><ArrowLeft size={20} /></button>
              <Avatar user={peer(active)} size={40} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate font-semibold">{peer(active).fullName} {peer(active).isVerified && <Verified size={12} />}</p>
                <p className="text-xs text-emerald-600">{peerTyping ? "typing…" : active.isOnline ? "Online" : "last seen recently"}</p>
              </div>
              <button
                onClick={() => { const p = peer(active); startCall(p.id || p._id, p.fullName || "User", p.profilePhoto || p.avatar || null, "audio"); }}
                className="shrink-0 rounded-full p-2 text-ink-500 hover:bg-ink-900/5" title="Audio call"><Phone size={18} /></button>
              <button
                onClick={() => { const p = peer(active); startCall(p.id || p._id, p.fullName || "User", p.profilePhoto || p.avatar || null, "video"); }}
                className="shrink-0 rounded-full p-2 text-brand-600 hover:bg-brand-50" title="Video call"><Video size={18} /></button>
            </div>

            <div className={cn("min-h-0 flex-1 space-y-3 overflow-y-auto p-4 md:p-5", wallpaper)}>
              {msgs === null ? (
                <ChatThreadSkeleton />
              ) : msgs.length === 0 ? (
                <p className="mt-6 text-center text-sm text-ink-400">No messages yet — say hello 👋</p>
              ) : msgs.map((m) => {
                const mine = isMine(m);
                return (
                  <div key={midOf(m)} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[75%] px-4 py-2.5 text-sm shadow-soft", mine ? cn(bubble.mine, "bubble-mine text-white") : cn(bubble.theirs, "bg-surface text-ink-900"))}>
                      <p className={cn(m.isDeleted && "italic opacity-70")}>{m.content}</p>
                      <p className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", mine ? "text-white/70" : "text-ink-400")}>
                        {timeAgo(m.createdAt)}
                        {mine && !m.isDeleted && (m.status === "seen" ? <CheckCheck size={13} className="text-sky-200" /> : m.status === "delivered" ? <CheckCheck size={13} /> : <Check size={13} />)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <div className="flex items-center gap-2 border-t border-ink-900/[.06] bg-surface p-3">
              <input value={text} onChange={onInputChange} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message…" className="flex-1 rounded-full bg-ink-900/[.04] px-4 py-3 text-sm outline-none" />
              <button onClick={send} disabled={sending || !text.trim()} className="grid h-11 w-11 place-items-center rounded-full bg-brand-600 text-white shadow-glow disabled:opacity-50"><Send size={18} /></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
