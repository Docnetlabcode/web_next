"use client";
import { useEffect, useState } from "react";
import { Heart, MessageCircle, UserPlus, AtSign, Bell, Check, X, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { useNavigate } from "@/lib/router";
import { Avatar, Verified } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { dok } from "@/lib/api";
import { routeFor } from "@/lib/notify";
import { broadcastFollow } from "@/lib/followBus";
import { cn, timeAgo } from "@/lib/utils";

const ICON = {
  post_like: { i: Heart, c: "bg-rose-50 text-rose-500" },
  reel_like: { i: Heart, c: "bg-rose-50 text-rose-500" },
  comment_like: { i: Heart, c: "bg-rose-50 text-rose-500" },
  post_comment: { i: MessageCircle, c: "bg-brand-50 text-brand-600" },
  reel_comment: { i: MessageCircle, c: "bg-brand-50 text-brand-600" },
  comment_reply: { i: MessageCircle, c: "bg-brand-50 text-brand-600" },
  mention_comment: { i: AtSign, c: "bg-amber-50 text-amber-600" },
  mention_post: { i: AtSign, c: "bg-amber-50 text-amber-600" },
  mention_reel: { i: AtSign, c: "bg-amber-50 text-amber-600" },
  follow: { i: UserPlus, c: "bg-sky-50 text-sky-600" },
  follow_request: { i: UserPlus, c: "bg-sky-50 text-sky-600" },
  follow_request_accepted: { i: UserPlus, c: "bg-emerald-50 text-emerald-600" },
  connection_request: { i: UserPlus, c: "bg-indigo-50 text-indigo-600" },
  connection_accepted: { i: UserPlus, c: "bg-emerald-50 text-emerald-600" },
  verification_approved: { i: ShieldCheck, c: "bg-emerald-50 text-emerald-600" },
  verification_rejected: { i: ShieldCheck, c: "bg-rose-50 text-rose-500" },
};
const FILTERS = [
  { key: "All", match: () => true },
  { key: "Mentions", match: (t) => t.startsWith("mention") },
  { key: "Comments", match: (t) => t === "post_comment" || t === "reel_comment" },
  { key: "Replies", match: (t) => t.includes("reply") },
  { key: "Likes", match: (t) => t.includes("like") },
  { key: "Network", match: (t) => t.startsWith("follow") || t.includes("connection") },
];
const nid = (n) => n?._id || n?.id;
const uid = (u) => u?.id || u?._id;

export default function Notifications() {
  const { demo } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState("All");
  const [items, setItems] = useState(null);
  const [acted, setActed] = useState({}); // { [id]: "confirmed" | "followedback" | "accepted" | "ignored" }
  const [busy, setBusy] = useState({});

  useEffect(() => {
    dok.notifications.list().then((d) => setItems(d.notifications || [])).catch(() => setItems([]));
  }, []);

  const matcher = FILTERS.find((f) => f.key === tab)?.match || (() => true);
  const list = (items || []).filter((n) => matcher(n.type || ""));

  // Keep the top-bar bell's unread count in sync after any read/clear action.
  const notifyChanged = () => window.dispatchEvent(new CustomEvent("dl:notifications-changed"));

  const markRead = (n) => {
    if (n.isRead) return;
    setItems((xs) => (xs || []).map((x) => (nid(x) === nid(n) ? { ...x, isRead: true } : x)));
    notifyChanged();
    if (!demo) dok.notifications.read(nid(n)).catch(() => {});
  };

  const markAllRead = () => {
    setItems((xs) => (xs || []).map((x) => ({ ...x, isRead: true })));
    notifyChanged();
    if (!demo) dok.notifications.readAll().catch(() => toast?.error("Couldn't mark all read"));
  };

  // No bulk-delete endpoint exists, so clear removes each notification individually.
  const clearAll = async () => {
    const all = items || [];
    if (all.length === 0) return;
    setItems([]); // optimistic
    notifyChanged();
    if (demo) return;
    const res = await Promise.allSettled(all.map((n) => dok.notifications.remove(nid(n))));
    if (res.some((r) => r.status === "rejected")) toast?.error("Some notifications couldn't be cleared");
  };

  const open = (n) => {
    markRead(n);
    const to = routeFor(n);
    if (to) nav(to);
  };

  // Inline relationship actions (Confirm / Follow back / Accept / Ignore).
  const act = async (n, action) => {
    const id = nid(n);
    const m = n.meta || {};
    const requesterId = m.requesterId || uid(n.sender);
    const requestId = m.connectionRequestId || m.requestId || requesterId;
    setBusy((b) => ({ ...b, [id]: action }));
    try {
      if (!demo) {
        if (action === "confirmed") await dok.follows.acceptRequest(requesterId);
        else if (action === "followedback") { await dok.follows.follow(requesterId); broadcastFollow(requesterId, true); }
        else if (action === "accepted") await dok.network.accept(requestId);
        else if (action === "ignored") await dok.network.reject(requestId);
      }
      setActed((a) => ({ ...a, [id]: action }));
      markRead(n);
      if (action === "accepted") toast?.success("Connection accepted");
    } catch {
      toast?.error("Couldn't complete that — try again");
    } finally {
      setBusy((b) => { const x = { ...b }; delete x[id]; return x; });
    }
  };

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Notifications</h1>
        <div className="flex items-center gap-3">
          <button onClick={markAllRead} className="flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"><Check size={15} /> Mark all read</button>
          <button onClick={clearAll} className="flex items-center gap-1.5 text-sm font-semibold text-ink-500 transition hover:text-danger-500"><Trash2 size={15} /> Clear</button>
        </div>
      </div>
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setTab(f.key)} className={cn("shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold", tab === f.key ? "bg-brand-600 text-white" : "bg-white text-ink-600 hover:bg-brand-50")}>{f.key}</button>
        ))}
      </div>

      {items === null ? (
        <div className="mt-5 space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="card h-20 animate-pulse bg-ink-900/[.03]" />)}</div>
      ) : list.length === 0 ? (
        <div className="card mt-6 py-20 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-50 text-brand-600"><Bell size={28} /></span>
          <p className="mt-4 text-lg font-bold">You're all caught up.</p>
          <p className="mt-1 text-sm text-ink-500">Replies, mentions and connection updates appear here.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {[["NEW", list.filter((n) => !n.isRead)], ["EARLIER", list.filter((n) => n.isRead)]].map(([label, group]) =>
            group.length === 0 ? null : (
              <div key={label}>
                <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-ink-400">{label}</p>
                <div className="card divide-y divide-ink-900/[.05]">
                  {group.map((n) => (
                    <Row key={nid(n)} n={n} onOpen={open} onAct={act} acted={acted[nid(n)]} busy={busy[nid(n)]} />
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function Row({ n, onOpen, onAct, acted, busy }) {
  const meta = ICON[n.type] || { i: Bell, c: "bg-ink-900/5 text-ink-500" };
  const Icon = meta.i;
  const isFollowReq = n.type === "follow_request";
  const isConnReq = n.type === "connection_request";

  return (
    <div onClick={() => onOpen(n)} className={cn("flex cursor-pointer items-start gap-3 p-4 transition hover:bg-ink-900/[.02]", !n.isRead && "bg-brand-50/40")}>
      <div className="relative shrink-0">
        <Avatar user={n.sender} size={44} />
        <span className={cn("absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full ring-2 ring-white", meta.c)}><Icon size={12} className={n.type.includes("like") ? "fill-current" : ""} /></span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-900"><span className="font-semibold">{n.sender?.fullName}</span> {n.sender?.isVerified && <Verified size={11} />} <span className="text-ink-600">{n.body || n.title}</span></p>
        {n.meta?.text && <p className="mt-1 rounded-lg bg-ink-900/[.03] px-3 py-2 text-sm text-ink-600">{n.meta.text}</p>}
        <p className="mt-1 text-xs text-ink-400">{timeAgo(n.createdAt)}</p>

        {/* inline relationship actions */}
        {(isFollowReq || isConnReq) && (
          <div className="mt-2.5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {acted === "confirmed" ? (
              <button onClick={() => onAct(n, "followedback")} disabled={busy} className="btn-outline px-3 py-1.5 text-xs">
                {busy === "followedback" ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />} Follow back
              </button>
            ) : acted === "followedback" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700"><Check size={13} /> Following</span>
            ) : acted === "accepted" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600"><Check size={13} /> Connected</span>
            ) : acted === "ignored" ? (
              <span className="text-xs text-ink-400">Ignored</span>
            ) : isFollowReq ? (
              <button onClick={() => onAct(n, "confirmed")} disabled={busy} className="btn-primary px-3.5 py-1.5 text-xs">
                {busy === "confirmed" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Confirm
              </button>
            ) : (
              <>
                <button onClick={() => onAct(n, "accepted")} disabled={busy} className="btn-primary px-3.5 py-1.5 text-xs">
                  {busy === "accepted" ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Accept
                </button>
                <button onClick={() => onAct(n, "ignored")} disabled={busy} className="btn-outline px-3 py-1.5 text-xs">
                  {busy === "ignored" ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Ignore
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {!n.isRead && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
    </div>
  );
}
