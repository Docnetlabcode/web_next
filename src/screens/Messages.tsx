"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "@/lib/router";
import { Send, Check, CheckCheck, Phone, Video, Search, MessageSquare, Loader2 } from "lucide-react";
import { Avatar, Verified } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { dok } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";

const cidOf = (c) => c?.conversationId || c?.id || c?._id;
const midOf = (m) => m?._id || m?.id;

export default function Messages() {
  const { user } = useAuth();
  const toast = useToast();
  const myId = user?._id || user?.id;
  const [sp] = useSearchParams();

  const [convos, setConvos] = useState(null); // null = loading
  const [active, setActive] = useState(null);
  const [msgs, setMsgs] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [query, setQuery] = useState("");
  const endRef = useRef(null);

  // The "other" participant on a 1:1 conversation, regardless of payload shape.
  const peer = (c) =>
    c?.participant ||
    (c?.participants || []).find((p) => (p.id || p._id) !== myId) ||
    (c?.participants || [])[0] ||
    {};

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
    setActive((a) => a || match || convos[0] || null);
  }, [convos, sp]);

  // load messages for the active conversation
  useEffect(() => {
    if (!active) { setMsgs(active === null ? null : []); return; }
    setMsgs(null);
    let alive = true;
    dok.chat.messages(cidOf(active))
      .then((d) => alive && setMsgs(d.messages || d || []))
      .catch(() => alive && setMsgs([]));
    return () => { alive = false; };
  }, [active]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const isMine = (m) => m.mine ?? ((m.senderId || m.sender?.id || m.sender?._id) === myId);

  const send = async () => {
    const content = text.trim();
    if (!content || !active || sending) return;
    const temp = { _id: `tmp-${Date.now()}`, senderId: myId, content, status: "sent", createdAt: new Date().toISOString() };
    setMsgs((m) => [...(m || []), temp]);
    setText("");
    setSending(true);
    try {
      const d = await dok.chat.send(cidOf(active), { content, messageType: "text" });
      const real = d.message || d;
      if (midOf(real)) setMsgs((m) => m.map((x) => (midOf(x) === temp._id ? real : x)));
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
    <div className="grid h-[calc(100vh-9rem)] grid-cols-1 overflow-hidden rounded-2xl border border-ink-900/[.06] bg-white shadow-card md:grid-cols-[320px_1fr]">
      {/* List */}
      <div className="border-r border-ink-900/[.06]">
        <div className="border-b border-ink-900/[.06] p-4">
          <h2 className="font-display text-lg font-extrabold">Messages</h2>
          <div className="relative mt-3"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="w-full rounded-full bg-ink-900/[.04] py-2 pl-9 pr-3 text-sm outline-none" /></div>
        </div>
        <div className="overflow-y-auto">
          {convos === null ? (
            <div className="space-y-1 p-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-ink-900/[.04]" />)}</div>
          ) : shown.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink-400">{query ? "No matches" : "No conversations yet. Connect with colleagues to start chatting."}</p>
          ) : shown.map((c) => {
            const p = peer(c);
            const lm = c.lastMessage || {};
            return (
              <button key={cidOf(c)} onClick={() => setActive(c)}
                className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-ink-900/[.03]", cidOf(active) === cidOf(c) && "bg-brand-50")}>
                <div className="relative"><Avatar user={p} size={46} />{c.isOnline && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />}</div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-sm font-semibold">{p.fullName} {p.isVerified && <Verified size={11} />}</p>
                  <p className="truncate text-xs text-ink-500">{lm.content || ""}</p>
                </div>
                <div className="text-right">
                  {lm.createdAt && <p className="text-[11px] text-ink-400">{timeAgo(lm.createdAt)}</p>}
                  {c.unreadCount > 0 && <span className="mt-1 inline-grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">{c.unreadCount}</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thread */}
      <div className="hidden flex-col bg-[#f4f6f6] md:flex">
        {!active ? (
          <div className="grid flex-1 place-items-center text-center text-ink-400">
            <div><MessageSquare size={40} className="mx-auto mb-2 text-ink-300" /><p className="text-sm">Select a conversation to start messaging.</p></div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-ink-900/[.06] bg-white px-5 py-3">
              <Avatar user={peer(active)} size={40} />
              <div className="flex-1">
                <p className="flex items-center gap-1 font-semibold">{peer(active).fullName} {peer(active).isVerified && <Verified size={12} />}</p>
                <p className="text-xs text-emerald-600">{active.isOnline ? "Online" : "last seen recently"}</p>
              </div>
              <button className="rounded-full p-2 text-ink-500 hover:bg-ink-900/5"><Phone size={18} /></button>
              <button className="rounded-full p-2 text-brand-600 hover:bg-brand-50"><Video size={18} /></button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {msgs === null ? (
                <div className="grid h-full place-items-center"><Loader2 size={22} className="animate-spin text-brand-600" /></div>
              ) : msgs.length === 0 ? (
                <p className="mt-6 text-center text-sm text-ink-400">No messages yet — say hello 👋</p>
              ) : msgs.map((m) => {
                const mine = isMine(m);
                return (
                  <div key={midOf(m)} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-soft", mine ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md bg-white text-ink-900")}>
                      <p>{m.content}</p>
                      <p className={cn("mt-1 flex items-center justify-end gap-1 text-[10px]", mine ? "text-white/70" : "text-ink-400")}>
                        {timeAgo(m.createdAt)}
                        {mine && (m.status === "seen" ? <CheckCheck size={13} className="text-sky-200" /> : m.status === "delivered" ? <CheckCheck size={13} /> : <Check size={13} />)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>

            <div className="flex items-center gap-2 border-t border-ink-900/[.06] bg-white p-3">
              <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message…" className="flex-1 rounded-full bg-ink-900/[.04] px-4 py-3 text-sm outline-none" />
              <button onClick={send} disabled={sending || !text.trim()} className="grid h-11 w-11 place-items-center rounded-full bg-brand-600 text-white shadow-glow disabled:opacity-50"><Send size={18} /></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
