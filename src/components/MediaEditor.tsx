"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X, Check, Crop, SlidersHorizontal, Sparkles, Type, Music2, Scissors,
  Sun, Contrast, Droplets, Flame, Aperture, Plus, Trash2, Play, Pause, Square, Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Built-in royalty-free music options for the editor's "music" tool.
const TRACKS = [
  { id: "t1", title: "Calm Pulse", artist: "Orovion Audio", dur: "0:30", mood: "Calm" },
  { id: "t2", title: "Clinical Focus", artist: "Ambient Lab", dur: "0:45", mood: "Focus" },
  { id: "t3", title: "Bright Rounds", artist: "Studio Health", dur: "0:28", mood: "Upbeat" },
  { id: "t4", title: "Slow Recovery", artist: "Lo-Fi Med", dur: "0:52", mood: "Chill" },
  { id: "t5", title: "Heartbeat 96 BPM", artist: "Vital Signs", dur: "0:33", mood: "Energetic" },
  { id: "t6", title: "Quiet Ward", artist: "Night Shift", dur: "1:02", mood: "Soft" },
];

/* ---------- Filter presets (CSS) ---------- */
const FILTERS = [
  { key: "Original", css: "" },
  { key: "Clinical", css: "saturate(1.15) contrast(1.06)" },
  { key: "Warm", css: "sepia(.28) saturate(1.25) brightness(1.02)" },
  { key: "Cool", css: "hue-rotate(-12deg) saturate(1.1) brightness(1.02)" },
  { key: "Mono", css: "grayscale(1) contrast(1.05)" },
  { key: "Noir", css: "grayscale(1) contrast(1.35) brightness(.92)" },
  { key: "Crisp", css: "contrast(1.22) brightness(1.05) saturate(1.1)" },
  { key: "Fade", css: "contrast(.85) brightness(1.1) saturate(.85) sepia(.12)" },
  { key: "Vivid", css: "saturate(1.5) contrast(1.12)" },
  { key: "Soft", css: "brightness(1.06) saturate(.95) blur(.4px)" },
];
const RATIOS = [
  { key: "1:1", v: 1 }, { key: "4:5", v: 4 / 5 }, { key: "9:16", v: 9 / 16 },
  { key: "16:9", v: 16 / 9 }, { key: "3:4", v: 3 / 4 },
];
const TEXT_COLORS = ["#ffffff", "#0e1213", "#1e7b74", "#e8957a", "#d8b25a", "#7aa9cf", "#d23a3a"];

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function MediaEditor({ item, isReel = false, onSave, onClose }) {
  const isVideo = item.kind === "video";
  const [tool, setTool] = useState("filter");
  const [filter, setFilter] = useState(item.filter || "Original");
  const [adjust, setAdjust] = useState(item.adjust || { brightness: 100, contrast: 100, saturate: 100, warmth: 0, vignette: 0 });
  const [ratio, setRatio] = useState(item.crop?.ratio || (isReel ? "9:16" : "1:1"));
  const [zoom, setZoom] = useState(item.crop?.zoom || 1);
  const [texts, setTexts] = useState(item.texts || []);
  const [activeText, setActiveText] = useState(null);
  const [music, setMusic] = useState(item.music || null);
  const [trim, setTrim] = useState(item.trim || { start: 0, end: 0 });
  const [cover, setCover] = useState(item.cover ?? null); // reel thumbnail frame (seconds)
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef(null);
  const frameRef = useRef(null);

  const preset = FILTERS.find((f) => f.key === filter)?.css || "";
  const filterCss = [
    preset,
    `brightness(${adjust.brightness}%)`,
    `contrast(${adjust.contrast}%)`,
    `saturate(${adjust.saturate}%)`,
    adjust.warmth ? `sepia(${adjust.warmth}%)` : "",
  ].filter(Boolean).join(" ");

  /* video meta */
  const onMeta = () => {
    const d = videoRef.current?.duration || 0;
    setDuration(d);
    setTrim((t) => ({ start: t.start || 0, end: t.end || d }));
  };
  useEffect(() => {
    if (!isVideo) return;
    const v = videoRef.current; if (!v) return;
    const onTime = () => { if (v.currentTime >= (trim.end || v.duration)) { v.currentTime = trim.start; } };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [isVideo, trim]);

  const togglePlay = () => {
    const v = videoRef.current; if (!v) return;
    if (v.paused) { v.currentTime = trim.start || 0; v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };

  // Entering the Cover tool: pause and freeze on the chosen frame so it's visible.
  useEffect(() => {
    if (tool !== "cover" || !isVideo) return;
    const v = videoRef.current; if (!v) return;
    v.pause(); setPlaying(false);
    v.currentTime = cover ?? 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  /* drag text overlays */
  const dragText = useCallback((id) => (e) => {
    e.preventDefault();
    const frame = frameRef.current.getBoundingClientRect();
    const move = (ev) => {
      const cx = (ev.touches?.[0]?.clientX ?? ev.clientX) - frame.left;
      const cy = (ev.touches?.[0]?.clientY ?? ev.clientY) - frame.top;
      setTexts((ts) => ts.map((t) => t.id === id ? { ...t, x: Math.max(4, Math.min(96, (cx / frame.width) * 100)), y: Math.max(4, Math.min(96, (cy / frame.height) * 100)) } : t));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }, []);

  const addText = () => {
    const id = Date.now() + "";
    setTexts((t) => [...t, { id, text: "Tap to edit", x: 50, y: 50, color: "#ffffff", size: 28 }]);
    setActiveText(id); setTool("text");
  };
  const updateText = (id, patch) => setTexts((ts) => ts.map((t) => t.id === id ? { ...t, ...patch } : t));

  const TOOLS = [
    { key: "crop", icon: Crop, label: "Crop" },
    ...(isVideo ? [{ key: "trim", icon: Scissors, label: "Trim" }] : []),
    ...(isReel && isVideo ? [{ key: "cover", icon: Camera, label: "Cover" }] : []),
    { key: "filter", icon: Sparkles, label: "Filters" },
    { key: "adjust", icon: SlidersHorizontal, label: "Adjust" },
    { key: "text", icon: Type, label: "Text" },
    ...(isReel || isVideo ? [{ key: "music", icon: Music2, label: "Music" }] : []),
  ];

  const apply = () => onSave({ ...item, filter, adjust, crop: { ratio, zoom }, texts, music, trim, cover, _editedCss: filterCss });

  return createPortal(
    <div className="fixed inset-0 z-[90] flex flex-col bg-ink-950 text-white animate-fade-in">
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onClose} className="press rounded-full p-2 hover:bg-white/10"><X size={22} /></button>
        <p className="font-display text-sm font-bold">Edit {isVideo ? "video" : "photo"}</p>
        <button onClick={apply} className="press flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold shadow-glow hover:bg-brand-500"><Check size={16} /> Done</button>
      </div>

      {/* canvas */}
      <div className="flex flex-1 items-center justify-center overflow-hidden px-4">
        <div ref={frameRef} className="relative max-h-full overflow-hidden rounded-2xl bg-black shadow-4"
             style={{ aspectRatio: RATIOS.find((r) => r.key === ratio)?.v || 1, height: "min(58vh, 560px)", maxWidth: "100%" }}>
          {isVideo ? (
            <video ref={videoRef} src={item.url} onLoadedMetadata={onMeta} playsInline muted
                   style={{ filter: filterCss, transform: `scale(${zoom})` }}
                   className="h-full w-full object-cover transition-[filter] duration-200" />
          ) : (
            <img src={item.url} alt="" style={{ filter: filterCss, transform: `scale(${zoom})` }}
                 className="h-full w-full select-none object-cover transition-[filter] duration-200" draggable={false} />
          )}

          {/* vignette */}
          {adjust.vignette > 0 && <div className="pointer-events-none absolute inset-0" style={{ boxShadow: `inset 0 0 ${adjust.vignette * 1.4}px ${adjust.vignette / 1.5}px rgba(0,0,0,.75)` }} />}

          {/* crop grid */}
          {tool === "crop" && (
            <div className="pointer-events-none absolute inset-0">
              {[1, 2].map((i) => <div key={"v" + i} className="absolute top-0 bottom-0 w-px bg-white/30" style={{ left: `${(i * 100) / 3}%` }} />)}
              {[1, 2].map((i) => <div key={"h" + i} className="absolute left-0 right-0 h-px bg-white/30" style={{ top: `${(i * 100) / 3}%` }} />)}
            </div>
          )}

          {/* text overlays */}
          {texts.map((t) => (
            <div key={t.id} onPointerDown={dragText(t.id)} onClick={() => { setActiveText(t.id); setTool("text"); }}
                 className={cn("absolute -translate-x-1/2 -translate-y-1/2 cursor-move select-none px-2 text-center font-bold leading-tight drop-shadow-lg", activeText === t.id && "ring-2 ring-white/70 rounded")}
                 style={{ left: `${t.x}%`, top: `${t.y}%`, color: t.color, fontSize: t.size, fontFamily: '"Plus Jakarta Sans", sans-serif', textShadow: "0 1px 6px rgba(0,0,0,.5)" }}>
              {t.text}
            </div>
          ))}

          {/* play btn for video */}
          {isVideo && tool !== "trim" && tool !== "cover" && (
            <button onClick={togglePlay} className="absolute bottom-3 left-3 grid h-10 w-10 place-items-center rounded-full bg-black/50 backdrop-blur hover:bg-black/70">
              {playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>
          )}
          {music && <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs backdrop-blur"><Music2 size={13} /> {music.title}</div>}
        </div>
      </div>

      {/* controls panel */}
      <div className="px-4 pb-2 pt-1">
        {tool === "filter" && (
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button key={f.key} onClick={() => setFilter(f.key)} className="press shrink-0 text-center">
                <span className={cn("block h-16 w-16 overflow-hidden rounded-xl ring-2 transition", filter === f.key ? "ring-brand-500" : "ring-transparent")}>
                  {isVideo
                    ? <span className="block h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${item.thumbnailUrl || item.url})`, filter: f.css }} />
                    : <img src={item.url} alt="" style={{ filter: f.css }} className="h-full w-full object-cover" />}
                </span>
                <span className={cn("mt-1 block text-[11px] font-semibold", filter === f.key ? "text-brand-300" : "text-white/60")}>{f.key}</span>
              </button>
            ))}
          </div>
        )}

        {tool === "adjust" && (
          <div className="space-y-3 pb-1">
            <Slider icon={Sun} label="Brightness" min={50} max={150} value={adjust.brightness} onChange={(v) => setAdjust((a) => ({ ...a, brightness: v }))} />
            <Slider icon={Contrast} label="Contrast" min={50} max={150} value={adjust.contrast} onChange={(v) => setAdjust((a) => ({ ...a, contrast: v }))} />
            <Slider icon={Droplets} label="Saturation" min={0} max={200} value={adjust.saturate} onChange={(v) => setAdjust((a) => ({ ...a, saturate: v }))} />
            <Slider icon={Flame} label="Warmth" min={0} max={80} value={adjust.warmth} onChange={(v) => setAdjust((a) => ({ ...a, warmth: v }))} />
            <Slider icon={Aperture} label="Vignette" min={0} max={100} value={adjust.vignette} onChange={(v) => setAdjust((a) => ({ ...a, vignette: v }))} />
          </div>
        )}

        {tool === "crop" && (
          <div className="space-y-3 pb-1">
            <div className="flex gap-2">
              {RATIOS.map((r) => (
                <button key={r.key} onClick={() => setRatio(r.key)} className={cn("press rounded-lg px-3 py-2 text-xs font-bold transition", ratio === r.key ? "bg-brand-600 text-white" : "bg-white/10 text-white/70 hover:bg-white/20")}>{r.key}</button>
              ))}
            </div>
            <Slider icon={Crop} label="Zoom" min={100} max={250} value={Math.round(zoom * 100)} onChange={(v) => setZoom(v / 100)} suffix="%" />
          </div>
        )}

        {tool === "trim" && isVideo && (
          <TrimBar duration={duration} trim={trim} setTrim={setTrim} videoRef={videoRef} />
        )}

        {tool === "cover" && isVideo && (
          <CoverBar duration={duration} cover={cover} setCover={setCover} videoRef={videoRef} />
        )}

        {tool === "text" && (
          <div className="space-y-3 pb-1">
            {!activeText ? (
              <button onClick={addText} className="press flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 py-3 text-sm font-semibold hover:bg-white/10"><Plus size={16} /> Add text</button>
            ) : (
              <>
                <input value={texts.find((t) => t.id === activeText)?.text || ""} onChange={(e) => updateText(activeText, { text: e.target.value })}
                       className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm outline-none placeholder:text-white/40" placeholder="Type something…" autoFocus />
                <div className="flex items-center gap-2">
                  {TEXT_COLORS.map((c) => (
                    <button key={c} onClick={() => updateText(activeText, { color: c })} className="press h-7 w-7 rounded-full ring-2 ring-white/30" style={{ background: c }} />
                  ))}
                  <div className="ml-auto flex items-center gap-2">
                    <input type="range" min={16} max={56} value={texts.find((t) => t.id === activeText)?.size || 28} onChange={(e) => updateText(activeText, { size: +e.target.value })} className="accent-brand-500" />
                    <button onClick={() => { setTexts((ts) => ts.filter((t) => t.id !== activeText)); setActiveText(null); }} className="press rounded-lg bg-danger-500/20 p-2 text-danger-500"><Trash2 size={15} /></button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setActiveText(null)} className="press flex-1 rounded-xl bg-white/10 py-2 text-sm font-semibold">Done</button>
                  <button onClick={addText} className="press rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold"><Plus size={15} /></button>
                </div>
              </>
            )}
          </div>
        )}

        {tool === "music" && (
          <div className="no-scrollbar max-h-44 space-y-1.5 overflow-y-auto pb-1">
            {TRACKS.map((t) => (
              <button key={t.id} onClick={() => setMusic(music?.id === t.id ? null : t)}
                      className={cn("press flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition", music?.id === t.id ? "bg-brand-600" : "bg-white/[.06] hover:bg-white/10")}>
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/10">
                  {music?.id === t.id ? <Equalizer /> : <Music2 size={16} />}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{t.title}</span>
                  <span className="block text-xs text-white/50">{t.artist} · {t.mood}</span>
                </span>
                <span className="text-xs text-white/50">{t.dur}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* tool tabs */}
      <div className="flex items-center justify-around border-t border-white/10 px-2 py-2">
        {TOOLS.map((t) => (
          <button key={t.key} onClick={() => { setTool(t.key); if (t.key !== "text") setActiveText(null); }}
                  className={cn("press flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition", tool === t.key ? "text-brand-300" : "text-white/55 hover:text-white")}>
            <t.icon size={20} /> {t.label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}

function Slider({ icon: Icon, label, value, min, max, onChange, suffix = "" }) {
  return (
    <div className="flex items-center gap-3">
      <Icon size={16} className="shrink-0 text-white/60" />
      <span className="w-20 shrink-0 text-xs font-semibold text-white/70">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)} className="flex-1 accent-brand-500" />
      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-white/60">{value}{suffix}</span>
    </div>
  );
}

function TrimBar({ duration, trim, setTrim, videoRef }) {
  const barRef = useRef(null);
  const drag = (which) => (e) => {
    e.preventDefault();
    const rect = barRef.current.getBoundingClientRect();
    const move = (ev) => {
      const x = (ev.touches?.[0]?.clientX ?? ev.clientX) - rect.left;
      const t = Math.max(0, Math.min(duration, (x / rect.width) * duration));
      setTrim((prev) => {
        const next = { ...prev };
        if (which === "start") next.start = Math.min(t, prev.end - 0.5);
        else next.end = Math.max(t, prev.start + 0.5);
        if (videoRef.current) videoRef.current.currentTime = which === "start" ? next.start : next.end;
        return next;
      });
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const pct = (v) => (duration ? (v / duration) * 100 : 0);
  return (
    <div className="pb-1">
      <div ref={barRef} className="relative h-14 rounded-xl bg-white/10">
        <div className="absolute inset-y-0 rounded-xl bg-brand-600/30 ring-2 ring-brand-500" style={{ left: `${pct(trim.start)}%`, right: `${100 - pct(trim.end)}%` }} />
        <Handle pos={pct(trim.start)} onDown={drag("start")} />
        <Handle pos={pct(trim.end)} onDown={drag("end")} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-white/60"><span>{fmt(trim.start)}</span><span>Trim · {fmt(Math.max(0, trim.end - trim.start))}</span><span>{fmt(trim.end)}</span></div>
    </div>
  );
}
function CoverBar({ duration, cover, setCover, videoRef }) {
  const barRef = useRef(null);
  const val = cover ?? 0;
  const seek = (e) => {
    e.preventDefault();
    const rect = barRef.current.getBoundingClientRect();
    const move = (ev) => {
      const x = (ev.touches?.[0]?.clientX ?? ev.clientX) - rect.left;
      const t = Math.max(0, Math.min(duration, (x / rect.width) * duration));
      setCover(t);
      if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = t; }
    };
    move(e);
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };
  const pct = duration ? (val / duration) * 100 : 0;
  return (
    <div className="pb-1">
      <p className="mb-2 text-center text-xs text-white/60">Drag to choose the cover frame</p>
      <div ref={barRef} onPointerDown={seek} className="relative h-14 cursor-pointer rounded-xl bg-white/10">
        <div className="absolute inset-y-0 left-0 rounded-l-xl bg-brand-600/25" style={{ width: `${pct}%` }} />
        <div className="absolute top-1/2 z-10 grid h-12 w-5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-md bg-brand-500 shadow-lg" style={{ left: `${pct}%` }}>
          <span className="h-5 w-0.5 rounded bg-white/80" />
        </div>
      </div>
      <div className="mt-2 text-center text-xs text-white/60">Cover frame at {fmt(val)}</div>
    </div>
  );
}

function Handle({ pos, onDown }) {
  return (
    <div onPointerDown={onDown} className="absolute top-1/2 z-10 grid h-12 w-5 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize place-items-center rounded-md bg-brand-500 shadow-lg" style={{ left: `${pos}%` }}>
      <span className="h-5 w-0.5 rounded bg-white/80" />
    </div>
  );
}
function Equalizer() {
  return (
    <span className="flex items-end gap-0.5">
      {[0, 1, 2].map((i) => <span key={i} className="w-1 rounded-full bg-white" style={{ height: 6 + i * 4, animation: `eq 0.7s ${i * 0.12}s ease-in-out infinite alternate` }} />)}
      <style>{`@keyframes eq{from{transform:scaleY(.4)}to{transform:scaleY(1.4)}}`}</style>
    </span>
  );
}
