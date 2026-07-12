"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link2, Check, Send, ShieldCheck, Search, Loader2, Share2 } from "lucide-react";
import { Modal } from "@/components/ui/Overlays";
import { Avatar, Verified, Skeleton } from "@/components/ui/Primitives";
import { dok } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

/**
 * Multi-channel share tray (docs/feed.md §7):
 *  1. In-app DM share — search contacts + recent-thread suggestion grid,
 *     POST /posts/:id/share/inapp { recipientIds }
 *  2. Copy link — GET /posts/:id/share/link → secured read-only public preview
 *  3. External deep links — WhatsApp / Telegram / native share, built client-side
 *     from the copy-link URL.
 */
export default function ShareSheet({ open, onClose, post, demo, kind = "post", shareUrl }) {
  const toast = useToast();
  const postId = post?._id || post?.id;
  const [picked, setPicked] = useState([]);
  const [contacts, setContacts] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null); // live search hits
  const [link, setLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const debounce = useRef(null);

  // reset + load on open
  useEffect(() => {
    if (!open) return;
    setPicked([]); setQuery(""); setResults(null); setCopied(false); setSent(false); setSending(false);

    // Suggestion grid: recent chat threads first, then network connections
    (async () => {
      try {
        const seen = new Set();
        const list = [];
        const push = (u) => {
          const id = u?.id || u?._id;
          if (id && !seen.has(id)) { seen.add(id); list.push(u); }
        };
        try {
          const convs = await dok.chat.conversations();
          (convs.conversations || convs || []).forEach((c) => push(c.participant || c.participants?.[0]));
        } catch { /* chat may be empty */ }
        if (list.length < 12) {
          try {
            const net = await dok.network.connections("?limit=12");
            (net.connections || net.users || []).forEach((c) => push(c.user || c));
          } catch { /* connections may be empty */ }
        }
        setContacts(list);
      } catch {
        setContacts([]);
      }
    })();
    // Secured public link (read-only preview endpoint; no tokens leak).
    // A caller-supplied URL (e.g. a profile's /u/username link) wins.
    if (shareUrl) {
      setLink({ webFallback: shareUrl });
    } else if (kind === "reel") {
      setLink({ webFallback: `${typeof window !== "undefined" ? window.location.origin : "https://orovion.app"}/reel/${postId || ""}` });
    } else if (postId) {
      dok.posts.shareLink(postId).then(setLink).catch(() => setLink(null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, demo, postId, kind, shareUrl]);

  // low-latency contact search
  useEffect(() => {
    clearTimeout(debounce.current);
    if (!query.trim()) { setResults(null); return; }
    debounce.current = setTimeout(async () => {
      try {
        const d = await dok.search.users(query.trim());
        setResults(d.users || d.results || []);
      } catch { setResults([]); }
    }, 200);
    return () => clearTimeout(debounce.current);
  }, [query, demo]);

  const shown = results ?? contacts;
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const url = link?.webFallback || link?.deepLink || "";
  const shareText = post?.content ? `${post.content.slice(0, 120)}${post.content.length > 120 ? "…" : ""}` : "Worth a read on Orovion";

  const copy = async () => {
    if (!url) { toast?.error("Link isn't ready yet"); return; }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast?.error("Couldn't copy the link");
    }
  };

  const external = (channel) => {
    if (!url) { toast?.error("Link isn't ready yet"); return; }
    const enc = encodeURIComponent;
    const targets = {
      whatsapp: `https://wa.me/?text=${enc(`${shareText}\n${url}`)}`,
      telegram: `https://t.me/share/url?url=${enc(url)}&text=${enc(shareText)}`,
    };
    window.open(targets[channel], "_blank", "noopener,noreferrer");
  };

  const nativeShare = async () => {
    if (!url) return;
    if (navigator.share) {
      try { await navigator.share({ title: "Orovion", text: shareText, url }); } catch { /* user dismissed */ }
    } else {
      copy();
    }
  };

  const send = async () => {
    if (picked.length === 0) return;
    setSending(true);
    try {
      // Reels have no in-app share endpoint yet — copy-link / external still work.
      if (!demo && kind !== "reel") await dok.posts.shareInApp(postId, picked);
      setSent(true);
      setTimeout(onClose, 1100);
    } catch {
      toast?.error("Couldn't share — try again");
      setSending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={`Share ${kind}`} className="max-w-md">
      <div className="p-5">
        {/* real-time contact search */}
        <div className="flex items-center gap-2 rounded-full bg-ink-900/[.04] px-4 py-2.5 text-sm">
          <Search size={16} className="shrink-0 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people…"
            className="flex-1 bg-transparent outline-none placeholder:text-ink-400"
          />
          {query && results === null && <Loader2 size={14} className="animate-spin text-ink-400" />}
        </div>

        <p className="mb-3 mt-4 text-xs font-bold uppercase tracking-wide text-ink-400">Send privately</p>
        {shown === null ? (
          <div className="flex gap-4 pb-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-14 rounded-full" />)}</div>
        ) : shown.length === 0 ? (
          <p className="py-3 text-center text-sm text-ink-400">{query ? "No one found — check the spelling" : "Connect with colleagues to share privately"}</p>
        ) : (
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {shown.map((u) => {
              const id = u.id || u._id;
              const isPicked = picked.includes(id);
              return (
                <button key={id} onClick={() => toggle(id)} aria-pressed={isPicked} className="press relative flex w-16 shrink-0 flex-col items-center gap-1.5">
                  <span className={cn("relative rounded-full ring-2 ring-offset-2 ring-offset-surface transition", isPicked ? "ring-brand-500" : "ring-transparent")}>
                    <Avatar user={u} size={56} />
                    {isPicked && (
                      <span className="anim-pop absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-surface bg-brand-600 text-white"><Check size={13} /></span>
                    )}
                  </span>
                  <span className="flex max-w-full items-center gap-0.5 text-xs font-medium">
                    <span className="truncate">{(u.fullName || "").split(" ").filter((w) => !/^(dr\.?|prof\.?)$/i.test(w))[0] || u.fullName}</span>
                    {u.isVerified && <Verified size={10} className="shrink-0" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <p className="mb-3 mt-5 text-xs font-bold uppercase tracking-wide text-ink-400">Where to</p>
        <div className="flex gap-5">
          <Channel icon={copied ? Check : Link2} label={copied ? "Copied!" : "Copy link"} active={copied} onClick={copy} />
          <Channel label="WhatsApp" onClick={() => external("whatsapp")} svg={<WhatsAppGlyph />} />
          <Channel label="Telegram" onClick={() => external("telegram")} svg={<TelegramGlyph />} />
          <Channel icon={Share2} label="More" onClick={nativeShare} />
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-2xl bg-ink-900/[.04] p-3 text-xs text-ink-500">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-brand-600" />
          Public links open a read-only preview — no account data or session details are exposed.
        </div>

        {picked.length > 0 && (
          <button
            onClick={send}
            disabled={sending}
            className={cn("btn-primary anim-pop mt-4 w-full py-3 text-sm", sending && "opacity-80")}
          >
            {sent ? <Check size={16} /> : sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {sent ? "Sent" : `Send to ${picked.length} ${picked.length === 1 ? "person" : "people"}`}
          </button>
        )}
      </div>
    </Modal>
  );
}

function Channel({ icon: Icon, svg, label, onClick, active }) {
  return (
    <button onClick={onClick} className="press flex flex-col items-center gap-1.5">
      <span className={cn("grid h-14 w-14 place-items-center rounded-2xl transition", active ? "bg-success-50 text-success-500" : "bg-brand-50 text-brand-600 hover:bg-brand-100")}>
        {svg || <Icon size={20} />}
      </span>
      <span className="text-xs font-medium text-ink-600">{label}</span>
    </button>
  );
}

/* Brand glyphs (inline so we don't pull an icon pack for two marks) */
function WhatsAppGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3a8.2 8.2 0 1 1 6.9 3.8Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.2-.8l.4-.5c.1-.2.1-.4 0-.5l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.9.9-1.2 2.2-.3 3.9a12 12 0 0 0 4.6 4.5c1.7.9 2.6.8 3.4.7.6 0 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.6-.4Z" />
    </svg>
  );
}
function TelegramGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.9 4.6 18.9 19c-.2 1-.8 1.2-1.6.8l-4.6-3.4-2.2 2.1c-.2.2-.4.4-.9.4l.3-4.6L18.4 7c.4-.3-.1-.5-.6-.2L7.5 13.3l-4.4-1.4c-1-.3-1-1 .2-1.4L20.6 3.2c.8-.3 1.5.2 1.3 1.4Z" />
    </svg>
  );
}
