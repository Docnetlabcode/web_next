"use client";
import { useEffect, useState } from "react";
import { Stethoscope, Eye, ThumbsUp, MessageCircle, Plus } from "lucide-react";
import { Avatar, Verified } from "@/components/ui/Primitives";
import RightRail from "@/components/layout/RightRail";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn, compact, timeAgo } from "@/lib/utils";

const URGENCY = { high: "bg-rose-50 text-rose-600", medium: "bg-amber-50 text-amber-600", low: "bg-brand-50 text-brand-600" };

export default function Cases() {
  const { demo } = useAuth();
  const [cases, setCases] = useState(null);
  useEffect(() => {
    dok.cases.feed("?limit=12").then((d) => setCases(d.cases || [])).catch(() => setCases([]));
  }, []);

  return (
    <div className="flex gap-6">
      <div className="mx-auto w-full max-w-2xl pb-24">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-extrabold text-ink-900">Clinical cases</h1>
            <p className="text-sm text-ink-500">Crowdsource expertise on de-identified cases.</p>
          </div>
          <button className="btn-primary px-4 py-2 text-sm"><Plus size={16} /> New case</button>
        </header>
        <div className="space-y-4">
          {(cases || []).map((c) => (
            <article key={c._id} className="card p-5 transition hover:shadow-glow">
              <div className="flex items-center gap-3">
                <Avatar user={c.author} size={40} />
                <div className="flex-1">
                  <p className="flex items-center gap-1 text-sm font-semibold">{c.author?.fullName} {c.author?.isVerified && <Verified size={12} />}</p>
                  <p className="text-xs text-ink-400">{c.specialty} · {timeAgo(c.createdAt) || "4h"}</p>
                </div>
                <span className={cn("chip uppercase text-[10px]", URGENCY[c.clinicalSnapshot?.urgency] || URGENCY.low)}>{c.clinicalSnapshot?.urgency || "open"}</span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-ink-900">{c.title}</h3>
              {c.clinicalSnapshot && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Snap label={`${c.clinicalSnapshot.patientGender || "—"}, ${c.clinicalSnapshot.patientAge}y`} />
                  {c.clinicalSnapshot.chiefComplaints?.map((cc) => <Snap key={cc} label={cc} />)}
                </div>
              )}
              <div className="mt-4 flex items-center gap-5 border-t border-ink-900/[.05] pt-3 text-sm text-ink-500">
                <span className="flex items-center gap-1.5"><ThumbsUp size={15} /> {compact(c.helpfulCount || 0)} helpful</span>
                <span className="flex items-center gap-1.5"><MessageCircle size={15} /> {compact(c.commentsCount || 0)}</span>
                <span className="flex items-center gap-1.5"><Eye size={15} /> {compact(c.viewCount || 0)}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
      <RightRail />
    </div>
  );
}

function Snap({ label }) {
  return <span className="inline-flex items-center gap-1.5 rounded-lg bg-ink-900/[.04] px-2.5 py-1 text-xs font-medium text-ink-700"><Stethoscope size={12} className="text-brand-600" /> {label}</span>;
}
