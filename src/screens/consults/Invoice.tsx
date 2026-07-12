"use client";
import { useEffect, useState } from "react";
import { useParams } from "@/lib/router";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DetailSkeleton } from "@/components/ui/Skeletons";
import { dok } from "@/lib/api";
import { formatRupees } from "@/lib/consultations/types";

export default function Invoice() {
  const { requestId } = useParams<{ requestId: string }>();
  const [inv, setInv] = useState<any | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    dok.consults.getInvoice(requestId).then((d) => setInv(d.invoice || d)).catch(() => setError(true));
  }, [requestId]);

  if (error) return <div className="mx-auto w-full max-w-xl"><PageHeader title="Invoice" /><div className="card p-8 text-center text-sm text-ink-600">Couldn't load this invoice.</div></div>;
  if (!inv) return <div className="mx-auto w-full max-w-xl pb-16 pt-2"><DetailSkeleton blocks={2} /></div>;

  const num = (v: any) => typeof v === "number" ? v : parseInt(String(v ?? 0), 10) || 0;
  const Row = ({ label, paise, bold }: { label: string; paise: number; bold?: boolean }) => (
    <div className={`flex items-center justify-between py-2 text-sm ${bold ? "font-bold text-ink-900" : "text-ink-600"}`}>
      <span>{label}</span><span>{formatRupees(paise)}</span>
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-xl pb-16">
      <PageHeader title="Invoice" forward={false} />
      <div className="card p-6">
        <div className="mb-4 flex items-center gap-3 border-b border-ink-900/[.06] pb-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><Receipt size={20} /></span>
          <div>
            <p className="text-sm font-bold text-ink-900">{inv.invoiceNumber || inv.number || "Consultation invoice"}</p>
            {inv.createdAt && <p className="text-xs text-ink-500">{new Date(inv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>}
          </div>
        </div>
        <Row label="Consultation fee" paise={num(inv.consultationFeePaise)} />
        <Row label="Platform fee" paise={num(inv.platformFeePaise)} />
        <Row label="GST" paise={num(inv.gstPaise)} />
        <div className="my-1 h-px bg-ink-900/[.06]" />
        <Row label="Total paid" paise={num(inv.totalPaise)} bold />
        {inv.paymentId && <p className="mt-4 text-xs text-ink-400">Payment ID: {inv.paymentId}</p>}
      </div>
    </div>
  );
}
