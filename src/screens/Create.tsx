"use client";
import { useState, useRef } from "react";
import { useNavigate } from "@/lib/router";
import {
  Image as ImageIcon, FileText, Stethoscope, Clapperboard, X, Globe, Smile,
  Paperclip, Video, Hash, AtSign, Users, Lock, ChevronDown, Wand2, Music2, Type, Scissors, Loader2,
} from "lucide-react";
import { Avatar, Verified } from "@/components/ui/Primitives";
import { EmojiPicker } from "@/components/ui/Overlays";
import MediaEditor from "@/components/MediaEditor";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { dok } from "@/lib/api";
import { cn, compact } from "@/lib/utils";

// Hashtags are auto-parsed from the caption server-side; mentions are NOT — they
// must be sent as a dedicated array (docs/API.md "Create Post"). Mirror the backend
// regexes so what we send matches what gets rendered.
const extractHashtags = (s = "") => [...new Set((s.match(/#[\w]+/g) || []).map((t) => t.slice(1).toLowerCase()))];
const extractMentions = (s = "") => {
  const out = new Set();
  const re = /(?:^|[^a-z0-9._@])@([a-z0-9._]{1,30})/gi;
  let m;
  while ((m = re.exec(s))) { const h = m[1].replace(/\.+$/, "").toLowerCase(); if (h) out.add(`@${h}`); }
  return [...out];
};
// multer turns a single repeated field into a string, not an array; append an empty
// sentinel for length-1 so req.body.mentions is always an array (empties are dropped server-side).
const appendArray = (fd, key, arr) => {
  if (!arr.length) return;
  arr.forEach((v) => fd.append(key, v));
  if (arr.length === 1) fd.append(key, "");
};

const TYPES = [
  { key: "post", icon: ImageIcon, label: "Post" },
  { key: "research", icon: FileText, label: "Research" },
  { key: "case_study", icon: Stethoscope, label: "Case" },
  { key: "thesis", icon: FileText, label: "Thesis" },
  { key: "reel", icon: Clapperboard, label: "Pulse" },
];
const VIS = [
  { key: "public", icon: Globe, label: "Public" },
  { key: "followers", icon: Users, label: "Followers" },
  { key: "only_me", icon: Lock, label: "Only me" },
];

const presetCss = (m) => {
  const F = { Original: "", Clinical: "saturate(1.15) contrast(1.06)", Warm: "sepia(.28) saturate(1.25) brightness(1.02)", Cool: "hue-rotate(-12deg) saturate(1.1)", Mono: "grayscale(1) contrast(1.05)", Noir: "grayscale(1) contrast(1.35) brightness(.92)", Crisp: "contrast(1.22) brightness(1.05) saturate(1.1)", Fade: "contrast(.85) brightness(1.1) saturate(.85) sepia(.12)", Vivid: "saturate(1.5) contrast(1.12)", Soft: "brightness(1.06) saturate(.95) blur(.4px)" };
  const a = m.adjust || { brightness: 100, contrast: 100, saturate: 100, warmth: 0 };
  return [F[m.filter] || "", `brightness(${a.brightness}%)`, `contrast(${a.contrast}%)`, `saturate(${a.saturate}%)`, a.warmth ? `sepia(${a.warmth}%)` : ""].filter(Boolean).join(" ");
};

export default function Create() {
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const fileRef = useRef(null);
  const taRef = useRef(null);
  const debounce = useRef(null);
  const [type, setType] = useState("post");
  const [text, setText] = useState("");
  const [suggest, setSuggest] = useState(null); // { kind: "mention"|"hashtag", items: array|null }
  const [emoji, setEmoji] = useState(false);
  const [media, setMedia] = useState([]);
  const [editing, setEditing] = useState(null);
  const [vis, setVis] = useState("public");
  const [visOpen, setVisOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // --- caption autocomplete: # hashtags + @ mentions on the token at the caret ---
  const detectToken = (v, caret) => {
    const upto = v.slice(0, caret);
    const mention = /(?:^|[^\w@])@([a-zA-Z0-9._]{1,30})$/.exec(upto);
    const hashtag = /(?:^|[^\w#])#([a-zA-Z0-9_]{1,40})$/.exec(upto);
    clearTimeout(debounce.current);
    if (mention) {
      const q = mention[1];
      setSuggest({ kind: "mention", items: null });
      debounce.current = setTimeout(async () => {
        try { const d = await dok.search.users(q); setSuggest({ kind: "mention", items: (d.users || d.results || []).filter((u) => u.uniqueUsername).slice(0, 6) }); }
        catch { setSuggest(null); }
      }, 200);
    } else if (hashtag) {
      const q = hashtag[1];
      setSuggest({ kind: "hashtag", items: null });
      debounce.current = setTimeout(async () => {
        try { const d = await dok.search.hashtags(q); setSuggest({ kind: "hashtag", items: (d.hashtags || d.results || []).slice(0, 6) }); }
        catch { setSuggest(null); }
      }, 200);
    } else {
      setSuggest(null);
    }
  };

  const onTextChange = (e) => {
    setText(e.target.value);
    detectToken(e.target.value, e.target.selectionStart ?? e.target.value.length);
  };

  // Insert a bare "#" or "@" at the caret (with a leading space when needed) and focus.
  const insertToken = (char) => {
    const el = taRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    const ins = (before.length && !/\s$/.test(before) ? " " : "") + char;
    const next = before + ins + text.slice(end);
    setText(next);
    const pos = before.length + ins.length;
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(pos, pos); });
  };

  const pickMention = (u) => {
    const el = taRef.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, caret).replace(/@([a-zA-Z0-9._]{0,30})$/, `@${u.uniqueUsername} `);
    setText(before + text.slice(caret));
    setSuggest(null);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(before.length, before.length); });
  };

  const pickHashtag = (raw) => {
    const el = taRef.current;
    const caret = el?.selectionStart ?? text.length;
    const clean = String(raw).replace(/^#/, "");
    const before = text.slice(0, caret).replace(/#([a-zA-Z0-9_]{0,40})$/, `#${clean} `);
    setText(before + text.slice(caret));
    setSuggest(null);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(before.length, before.length); });
  };

  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const next = files.map((f) => ({ file: f, url: URL.createObjectURL(f), kind: f.type.startsWith("video") ? "video" : "image", filter: "Original", name: f.name }));
    setMedia((m) => [...m, ...next].slice(0, 10));
    if (next.length) setEditing(media.length);
  };

  const curVis = VIS.find((v) => v.key === vis);
  const isReel = type === "reel";

  const publish = async () => {
    if (busy) return;
    setErr("");
    const content = text.trim();
    const videoItem = media.find((m) => m.kind === "video");

    if (isReel && !videoItem?.file) { setErr("Add a video to publish a Pulse."); return; }
    if (!isReel && !content && media.length === 0) { setErr("Write something or add media first."); return; }

    const hashtags = extractHashtags(content);
    const mentions = extractMentions(content);

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("visibility", vis);
      if (isReel) {
        fd.append("video", videoItem.file);
        fd.append("caption", content);
        if (videoItem.cover != null) fd.append("thumbnailOffset", String(Math.max(0, Math.round(videoItem.cover * 10) / 10)));
        appendArray(fd, "hashtags", hashtags);
        appendArray(fd, "mentions", mentions);
        await dok.reels.create(fd);
        toast?.success("Pulse uploaded — it'll appear once processing finishes");
        nav("/app/reels");
      } else {
        fd.append("content", content);
        fd.append("postType", type);
        media.forEach((m) => m.file && fd.append("media", m.file));
        appendArray(fd, "hashtags", hashtags);
        appendArray(fd, "mentions", mentions);
        await dok.posts.create(fd);
        toast?.success("Published");
        nav("/app");
      }
    } catch (e) {
      setErr(e?.response?.data?.message || "Couldn't publish — please try again.");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl pb-24">
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-900/[.06] p-4">
          <h2 className="font-display text-lg font-extrabold">Create</h2>
          <button onClick={() => nav(-1)} className="press rounded-full p-1.5 hover:bg-ink-900/5"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-5 gap-1 p-3">
          {TYPES.map((t) => (
            <button key={t.key} onClick={() => setType(t.key)} className={cn("press flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 text-[11px] font-semibold transition", type === t.key ? "bg-brand-600 text-white shadow-glow" : "text-ink-600 hover:bg-brand-50")}>
              <t.icon size={20} /> <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 px-4 pt-2">
          <Avatar user={user} size={40} />
          <div className="flex-1">
            <p className="text-sm font-semibold">{user?.fullName}</p>
            <div className="relative">
              <button onClick={() => setVisOpen((v) => !v)} className="press mt-0.5 flex items-center gap-1 rounded-full bg-ink-900/[.05] px-2.5 py-1 text-xs font-medium text-ink-600">
                <curVis.icon size={12} /> {curVis.label} <ChevronDown size={12} />
              </button>
              {visOpen && (
                <div className="absolute z-10 mt-1 w-40 overflow-hidden rounded-xl border border-ink-900/[.08] bg-white shadow-card anim-pop">
                  {VIS.map((v) => <button key={v.key} onClick={() => { setVis(v.key); setVisOpen(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-brand-50"><v.icon size={14} /> {v.label}</button>)}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative px-4 pt-3">
          <textarea
            ref={taRef}
            value={text}
            onChange={onTextChange}
            onKeyDown={(e) => { if (e.key === "Escape") setSuggest(null); }}
            onBlur={() => setTimeout(() => setSuggest(null), 150)}
            rows={media.length ? 3 : 6}
            placeholder={isReel ? "Add a caption for your Pulse…  use # and @" : "Share a case, paper or healthcare update…  use # and @"}
            className="w-full resize-none text-[15px] outline-none placeholder:text-ink-400"
          />
          {suggest && (
            <div className="anim-pop absolute inset-x-4 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-ink-900/[.08] bg-white shadow-card">
              {suggest.items === null ? (
                <div className="grid place-items-center py-4"><Loader2 size={16} className="animate-spin text-ink-400" /></div>
              ) : suggest.items.length === 0 ? (
                <p className="px-3 py-3 text-center text-xs text-ink-400">No matches</p>
              ) : suggest.kind === "mention" ? (
                suggest.items.map((u) => (
                  <button key={u._id || u.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pickMention(u)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-brand-50">
                    <Avatar user={u} size={30} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 truncate text-sm font-semibold text-ink-900">{u.fullName} {u.isVerified && <Verified size={11} />}</span>
                      <span className="block truncate text-[11px] text-ink-500">@{u.uniqueUsername}</span>
                    </span>
                  </button>
                ))
              ) : (
                suggest.items.map((h, i) => {
                  const tag = String(h.tag || h.name || h).replace(/^#/, "");
                  return (
                    <button key={tag + i} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pickHashtag(tag)} className="flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-brand-50">
                      <span className="text-sm font-semibold text-brand-700">#{tag}</span>
                      {(h.count != null || h.postsCount != null) && <span className="text-[11px] text-ink-400">{compact(h.count ?? h.postsCount)} posts</span>}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {media.length > 0 && (
          <div className="px-4 pb-2">
            <div className={cn("grid gap-2", isReel ? "grid-cols-2" : "grid-cols-3")}>
              {media.map((m, i) => (
                <div key={i} className={cn("group relative overflow-hidden rounded-xl bg-ink-900/5", isReel ? "aspect-[9/16]" : "aspect-square")}>
                  {m.kind === "video"
                    ? <video src={m.cover != null ? `${m.url}#t=${m.cover}` : m.url} preload="metadata" style={{ filter: presetCss(m), transform: `scale(${m.crop?.zoom || 1})` }} className="h-full w-full object-cover" />
                    : <img src={m.url} alt="" style={{ filter: presetCss(m), transform: `scale(${m.crop?.zoom || 1})` }} className="h-full w-full object-cover" />}
                  {m.texts?.map((t) => (
                    <span key={t.id} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 font-bold leading-tight drop-shadow" style={{ left: `${t.x}%`, top: `${t.y}%`, color: t.color, fontSize: (t.size || 28) * 0.4 }}>{t.text}</span>
                  ))}
                  {/* edited badges */}
                  <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
                    {m.kind === "video" && <Badge icon={Video} text="VIDEO" />}
                    {m.cover != null && <Badge icon={ImageIcon} text="COVER" />}
                    {m.filter && m.filter !== "Original" && <Badge text={m.filter} />}
                    {m.music && <Badge icon={Music2} />}
                    {m.texts?.length > 0 && <Badge icon={Type} />}
                    {m.trim && m.trim.start > 0 && <Badge icon={Scissors} />}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-ink-900/40 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => setEditing(i)} className="press grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink-900"><Wand2 size={16} /></button>
                    <button onClick={() => setMedia((mm) => mm.filter((_, idx) => idx !== i))} className="press grid h-9 w-9 place-items-center rounded-full bg-white/90 text-danger-500"><X size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-center text-xs text-ink-400">Tap the wand to crop, trim, {isReel ? "pick a cover, " : ""}add filters, text & music</p>
          </div>
        )}

        <div className="relative flex items-center justify-between border-t border-ink-900/[.06] p-4">
          <div className="flex items-center gap-1">
            <input ref={fileRef} type="file" accept={isReel ? "video/*" : "image/*,video/*"} multiple={!isReel} hidden onChange={onFiles} />
            <button onClick={() => fileRef.current?.click()} className="press rounded-full p-2 text-brand-600 hover:bg-brand-50" title="Photo / video"><ImageIcon size={20} /></button>
            <button onClick={() => fileRef.current?.click()} className="press rounded-full p-2 text-brand-600 hover:bg-brand-50" title="Attach file"><Paperclip size={20} /></button>
            <button onClick={() => setEmoji((v) => !v)} className="press rounded-full p-2 text-brand-600 hover:bg-brand-50" title="Emoji"><Smile size={20} /></button>
            <button onClick={() => insertToken("#")} className="press rounded-full p-2 text-brand-600 hover:bg-brand-50" title="Add hashtag"><Hash size={20} /></button>
            <button onClick={() => insertToken("@")} className="press rounded-full p-2 text-brand-600 hover:bg-brand-50" title="Tag people"><AtSign size={20} /></button>
            {emoji && <div className="absolute bottom-14 left-2 z-10"><EmojiPicker onPick={(e) => setText((t) => t + e)} /></div>}
          </div>
          <div className="flex items-center gap-3">
            {err && <span className="text-xs text-rose-600">{err}</span>}
            <button disabled={busy || (!text.trim() && !media.length)} onClick={publish} className="btn-primary px-6 py-2 text-sm">
              {busy ? "Publishing…" : "Publish"}
            </button>
          </div>
        </div>
      </div>

      {editing != null && media[editing] && (
        <MediaEditor
          item={media[editing]}
          isReel={isReel}
          onClose={() => setEditing(null)}
          onSave={(edited) => { setMedia((m) => m.map((x, i) => (i === editing ? { ...edited, file: x.file } : x))); setEditing(null); }}
        />
      )}
    </div>
  );
}

function Badge({ icon: Icon, text }) {
  return (
    <span className="flex items-center gap-0.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white backdrop-blur">
      {Icon && <Icon size={9} />}{text}
    </span>
  );
}
