"use client";
import { useEffect, useState } from "react";
import { Flag, ShieldCheck, ChevronRight, Loader2 } from "lucide-react";
import { BottomSheet } from "@/components/ui/Overlays";
import { dok } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

/** Violation categories accepted by POST /posts/:id/report (docs/feed.md §2). */
const CATEGORIES = [
  { key: "spam", label: "Spam", desc: "Repetitive, promotional or off-platform bait" },
  { key: "misinformation", label: "Medical misinformation", desc: "False or unverifiable clinical claims" },
  { key: "harassment", label: "Harassment or bullying", desc: "Targets or degrades a person" },
  { key: "hate_speech", label: "Hate speech", desc: "Attacks a protected group" },
  { key: "nudity", label: "Nudity or sexual content", desc: "Non-clinical explicit material" },
  { key: "violence", label: "Violence", desc: "Threats or graphic violence" },
  { key: "self_harm", label: "Self-harm", desc: "Promotes or depicts self-injury" },
  { key: "intellectual_property", label: "Intellectual property", desc: "Uses someone's work without rights" },
  { key: "impersonation", label: "Impersonation", desc: "Pretends to be another clinician or person" },
  { key: "other", label: "Something else", desc: "Doesn't fit the categories above" },
];

/**
 * Report flow: pick a violation category → optional detail → submit.
 * The payload routes to the Central Administrative Dashboard for review.
 */
export default function ReportSheet({ open, onClose, postId, demo }) {
  const toast = useToast();
  const [step, setStep] = useState("pick"); // pick → detail → done
  const [category, setCategory] = useState(null);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (open) { setStep("pick"); setCategory(null); setReason(""); setSending(false); }
  }, [open]);

  const submit = async () => {
    setSending(true);
    try {
      if (!demo) await dok.posts.report(postId, { category: category.key, reason: reason.trim() || undefined });
      setStep("done");
      setTimeout(onClose, 1800);
    } catch (e) {
      toast?.error(e?.response?.data?.message || "Couldn't submit the report");
      setSending(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={step === "done" ? undefined : "Report post"}
      subtitle={step === "pick" ? "Why are you reporting this? Your report is anonymous." : step === "detail" ? category?.label : undefined}
    >
      {step === "pick" && (
        <div className="max-h-[55vh] overflow-y-auto overscroll-contain pb-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => { setCategory(c); setStep("detail"); }}
              className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-ink-900/[.03]"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-ink-900">{c.label}</span>
                <span className="block truncate text-xs text-ink-500">{c.desc}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-ink-300" />
            </button>
          ))}
        </div>
      )}

      {step === "detail" && (
        <div className="space-y-4 px-5 pb-4">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Add context for our review team (optional)…"
            className="input resize-none"
          />
          <div className="flex items-start gap-2 rounded-2xl bg-ink-900/[.04] p-3 text-xs text-ink-500">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-brand-600" />
            Reported posts go straight to DokLynk moderators, who can remove content network-wide if a violation is confirmed.
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep("pick")} className="btn-outline flex-1 py-2.5 text-sm">Back</button>
            <button onClick={submit} disabled={sending} className={cn("btn flex-1 bg-danger-500 py-2.5 text-sm text-white hover:bg-danger-700", sending && "opacity-70")}>
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Flag size={15} />} Submit report
            </button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="anim-pop grid place-items-center gap-3 px-5 pb-10 pt-6 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-success-50 text-success-500"><ShieldCheck size={26} /></span>
          <p className="font-display text-lg font-extrabold text-ink-900">Report submitted</p>
          <p className="max-w-xs text-sm text-ink-500">Our team will review it. Thanks for keeping DokLynk trustworthy.</p>
        </div>
      )}
    </BottomSheet>
  );
}
