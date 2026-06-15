"use client";
import { useState, useRef } from "react";
import { useNavigate } from "@/lib/router";
import {
  Image as ImageIcon, FileText, Stethoscope, Clapperboard, X, Globe, Smile,
  Paperclip, Video, Hash, Users, Lock, ChevronDown, Wand2, Music2, Type, Scissors,
} from "lucide-react";
import { Avatar } from "@/components/ui/Primitives";
import { EmojiPicker } from "@/components/ui/Overlays";
import MediaEditor from "@/components/MediaEditor";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

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
  const fileRef = useRef(null);
  const [type, setType] = useState("post");
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState(false);
  const [media, setMedia] = useState([]);
  const [editing, setEditing] = useState(null);
  const [vis, setVis] = useState("public");
  const [visOpen, setVisOpen] = useState(false);

  const onFiles = (e) => {
    const files = Array.from(e.target.files || []);
    const next = files.map((f) => ({ url: URL.createObjectURL(f), kind: f.type.startsWith("video") ? "video" : "image", filter: "Original", name: f.name }));
    setMedia((m) => [...m, ...next].slice(0, 10));
    if (next.length) setEditing(media.length);
  };

  const curVis = VIS.find((v) => v.key === vis);
  const isReel = type === "reel";

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

        <div className="px-4 pt-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={media.length ? 3 : 6} placeholder={isReel ? "Add a caption for your Pulse…" : "Share a case, paper or healthcare update…"} className="w-full resize-none text-[15px] outline-none placeholder:text-ink-400" />
        </div>

        {media.length > 0 && (
          <div className="px-4 pb-2">
            <div className={cn("grid gap-2", isReel ? "grid-cols-2" : "grid-cols-3")}>
              {media.map((m, i) => (
                <div key={i} className={cn("group relative overflow-hidden rounded-xl bg-ink-900/5", isReel ? "aspect-[9/16]" : "aspect-square")}>
                  {m.kind === "video"
                    ? <video src={m.url} style={{ filter: presetCss(m), transform: `scale(${m.crop?.zoom || 1})` }} className="h-full w-full object-cover" />
                    : <img src={m.url} alt="" style={{ filter: presetCss(m), transform: `scale(${m.crop?.zoom || 1})` }} className="h-full w-full object-cover" />}
                  {m.texts?.map((t) => (
                    <span key={t.id} className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 font-bold leading-tight drop-shadow" style={{ left: `${t.x}%`, top: `${t.y}%`, color: t.color, fontSize: (t.size || 28) * 0.4 }}>{t.text}</span>
                  ))}
                  {/* edited badges */}
                  <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
                    {m.kind === "video" && <Badge icon={Video} text="VIDEO" />}
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
            <p className="mt-2 text-center text-xs text-ink-400">Tap the wand to crop, trim, add filters, text & music</p>
          </div>
        )}

        <div className="relative flex items-center justify-between border-t border-ink-900/[.06] p-4">
          <div className="flex items-center gap-1">
            <input ref={fileRef} type="file" accept={isReel ? "video/*" : "image/*,video/*"} multiple={!isReel} hidden onChange={onFiles} />
            <button onClick={() => fileRef.current?.click()} className="press rounded-full p-2 text-brand-600 hover:bg-brand-50" title="Photo / video"><ImageIcon size={20} /></button>
            <button onClick={() => fileRef.current?.click()} className="press rounded-full p-2 text-brand-600 hover:bg-brand-50" title="Attach file"><Paperclip size={20} /></button>
            <button onClick={() => setEmoji((v) => !v)} className="press rounded-full p-2 text-brand-600 hover:bg-brand-50" title="Emoji"><Smile size={20} /></button>
            <button className="press rounded-full p-2 text-brand-600 hover:bg-brand-50" title="Hashtag"><Hash size={20} /></button>
            {emoji && <div className="absolute bottom-14 left-2 z-10"><EmojiPicker onPick={(e) => setText((t) => t + e)} /></div>}
          </div>
          <button disabled={!text.trim() && !media.length} onClick={() => nav("/app")} className="btn-primary px-6 py-2 text-sm">Publish</button>
        </div>
      </div>

      {editing != null && media[editing] && (
        <MediaEditor
          item={media[editing]}
          isReel={isReel}
          onClose={() => setEditing(null)}
          onSave={(edited) => { setMedia((m) => m.map((x, i) => (i === editing ? edited : x))); setEditing(null); }}
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
