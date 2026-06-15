"use client";
import { useEffect, useState } from "react";
import { Play, Heart, Eye } from "lucide-react";
import { Avatar, Verified } from "@/components/ui/Primitives";
import ReelViewer from "@/components/ReelViewer";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { compact } from "@/lib/utils";

export default function Reels() {
  const { demo } = useAuth();
  const [reels, setReels] = useState(null);
  const [open, setOpen] = useState(null); // index
  useEffect(() => {
    dok.reels.feed("?limit=12").then((d) => setReels(d.reels || [])).catch(() => setReels([]));
  }, []);
  const list = reels || [];
  const removeReel = (rid) => setReels((rs) => (rs || []).filter((r) => (r._id || r.id) !== rid));

  return (
    <div className="pb-24">
      <header className="mb-5">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Pulse</h1>
        <p className="text-sm text-ink-500">Short-form medical teaching from verified clinicians.</p>
      </header>
      {reels === null ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[9/16] animate-pulse rounded-2xl bg-ink-900/[.06]" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="card grid place-items-center gap-2 py-20 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600"><Play size={24} /></span>
          <p className="text-lg font-semibold text-ink-900">No Pulses yet</p>
          <p className="max-w-xs text-sm text-ink-500">Short clinical videos from people you follow will show up here.</p>
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((r, idx) => (
          <button key={r._id || r.id} onClick={() => setOpen(idx)} className="lift group relative block aspect-[9/16] overflow-hidden rounded-2xl bg-ink-900 text-left shadow-card">
            <img src={r.thumbnailUrl} alt="" className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-110 group-hover:opacity-100" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />
            <div className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white/15 backdrop-blur transition group-hover:scale-110 group-hover:bg-brand-600"><Play size={15} className="fill-white text-white" /></div>
            <div className="absolute inset-x-0 bottom-0 p-3 text-white">
              <div className="mb-1.5 flex items-center gap-1.5">
                <Avatar user={r.author} size={22} className="ring-1 ring-white/60" />
                <span className="truncate text-xs font-semibold">{r.author?.fullName}</span>
                {r.author?.isVerified && <Verified size={11} />}
              </div>
              <p className="line-clamp-2 text-xs leading-snug text-white/90">{r.caption}</p>
              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-white/80">
                <span className="flex items-center gap-1"><Heart size={12} /> {compact(r.likesCount)}</span>
                <span className="flex items-center gap-1"><Eye size={12} /> {compact(r.viewsCount)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      )}
      {open != null && <ReelViewer reels={list} index={open} onClose={() => setOpen(null)} onRemoved={removeReel} />}
    </div>
  );
}
