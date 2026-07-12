"use client";
import { useEffect, useState } from "react";
import { Plus, Loader2, CheckCircle2, Star, Trash2, Building2, ShieldCheck, ShieldAlert, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CardRowsSkeleton } from "@/components/ui/Skeletons";
import { useToast } from "@/components/ui/Toast";
import { dok } from "@/lib/api";
import { cn } from "@/lib/utils";
import { parseBankAccount, DoctorBankAccount } from "@/lib/consultations/types";
import { Empty } from "@/components/consult/parts";

export default function Payout() {
  const toast = useToast();
  const [accounts, setAccounts] = useState<DoctorBankAccount[] | null>(null);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    setError(false);
    dok.consults.listBankAccounts().then((d) => setAccounts((d.accounts || []).map(parseBankAccount))).catch(() => setError(true));
  };
  useEffect(() => { load(); }, []);

  const setPrimary = async (id: string) => {
    setBusy(id);
    try { await dok.consults.setPrimaryAccount(id); load(); toast?.success("Primary account updated."); }
    catch { toast?.error("Couldn't set primary."); }
    finally { setBusy(null); }
  };
  const remove = async (id: string) => {
    setBusy(id);
    try { await dok.consults.deleteBankAccount(id); setAccounts((p) => (p || []).filter((a) => a.id !== id)); toast?.success("Account removed."); }
    catch { toast?.error("Couldn't remove account."); }
    finally { setBusy(null); }
  };

  if (error) return <div className="mx-auto w-full max-w-xl"><PageHeader title="Payout settings" /><div className="card p-8 text-center"><p className="text-sm text-ink-600">Couldn't load your bank accounts.</p><button onClick={load} className="btn-primary mx-auto mt-4 px-5 py-2 text-sm">Retry</button></div></div>;

  return (
    <div className="mx-auto w-full max-w-xl pb-24">
      <PageHeader title="Payout settings" subtitle="Bank accounts & verification" forward={false}
        right={<button onClick={() => setAdding(true)} className="btn-primary px-3.5 py-2 text-sm"><Plus size={15} /> Add</button>} />

      {accounts === null ? (
        <CardRowsSkeleton count={2} className="space-y-3" />
      ) : accounts.length === 0 ? (
        <Empty icon={Building2} title="No bank accounts" hint="Add a bank account to receive consultation payouts." />
      ) : (
        <div className="space-y-3">
          {accounts.map((a) => (
            <div key={a.id} className={cn("card p-4", a.isPrimary && "border-brand-200")}>
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600"><Building2 size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink-900">{a.bankName} · {a.accountNumberMasked}</p>
                  <p className="truncate text-xs text-ink-500">{a.accountHolderName} · {a.ifscCode} · {a.accountType}</p>
                </div>
                {a.isPrimary && <span className="chip bg-brand-50 text-brand-700 text-[11px] font-semibold"><Star size={11} className="mr-1 inline fill-brand-500" />Primary</span>}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <VerifyBadge status={a.verificationStatus} verified={a.isVerified} />
                <div className="ml-auto flex items-center gap-2">
                  {!a.isPrimary && <button onClick={() => setPrimary(a.id)} disabled={!!busy} className="rounded-full border border-ink-900/10 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:border-brand-300 disabled:opacity-50">{busy === a.id ? <Loader2 size={12} className="animate-spin" /> : "Set primary"}</button>}
                  <button onClick={() => remove(a.id)} disabled={!!busy} className="rounded-full border border-rose-200 px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && <AddAccountSheet onClose={() => setAdding(false)} onAdded={() => { setAdding(false); load(); }} />}
    </div>
  );
}

function VerifyBadge({ status, verified }: { status: string; verified: boolean }) {
  if (verified || status === "VERIFIED") return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><ShieldCheck size={13} /> Verified</span>;
  if (status === "FAILED") return <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><ShieldAlert size={13} /> Verification failed</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600"><ShieldAlert size={13} /> Pending</span>;
}

function AddAccountSheet({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ accountHolderName: "", bankName: "", accountNumber: "", ifscCode: "", accountType: "SAVINGS", setAsPrimary: false });
  const [saving, setSaving] = useState(false);
  const up = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));

  const submit = async () => {
    if (!f.accountHolderName.trim() || !f.bankName.trim() || !f.accountNumber.trim() || !f.ifscCode.trim()) {
      return toast?.error("Fill in all account details.");
    }
    setSaving(true);
    try {
      // Backend verifies the account via RazorpayX (createContact + createFundAccount)
      // BEFORE saving — a 400 means verification failed. No duplicate verify on web.
      await dok.consults.addBankAccount({ ...f, accountHolderName: f.accountHolderName.trim(), bankName: f.bankName.trim(), accountNumber: f.accountNumber.trim(), ifscCode: f.ifscCode.trim().toUpperCase() });
      toast?.success("Bank account added & verified.");
      onAdded();
    } catch (e: any) { toast?.error(e?.response?.data?.message || "Couldn't verify this account. Check the details and try again."); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-end sm:place-items-center" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-ink-950/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md animate-[fade-up_.3s_ease-out_both] rounded-t-3xl bg-surface p-5 shadow-card sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between"><p className="text-base font-bold text-ink-900">Add bank account</p><button onClick={onClose} className="text-ink-400"><X size={18} /></button></div>
        <Input label="Account holder name" value={f.accountHolderName} onChange={(v) => up({ accountHolderName: v })} />
        <Input label="Bank name" value={f.bankName} onChange={(v) => up({ bankName: v })} />
        <Input label="Account number" value={f.accountNumber} onChange={(v) => up({ accountNumber: v.replace(/\D/g, "") })} />
        <Input label="IFSC code" value={f.ifscCode} onChange={(v) => up({ ifscCode: v.toUpperCase() })} />
        <label className="mb-2 block">
          <span className="mb-1 block text-xs font-semibold text-ink-600">Account type</span>
          <select value={f.accountType} onChange={(e) => up({ accountType: e.target.value })} className="w-full rounded-xl border border-ink-900/10 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-400">
            <option value="SAVINGS">Savings</option><option value="CURRENT">Current</option>
          </select>
        </label>
        <button onClick={() => up({ setAsPrimary: !f.setAsPrimary })} className="mb-3 mt-1 flex w-full items-center justify-between text-left text-sm text-ink-700">
          Set as primary account
          <span className={cn("relative h-5 w-9 rounded-full transition", f.setAsPrimary ? "bg-brand-600" : "bg-ink-900/15")}><span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", f.setAsPrimary ? "left-[1.15rem]" : "left-0.5")} /></span>
        </button>
        <div className="mb-3 flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-xs text-ink-600"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-brand-700" /> Your account is verified securely via RazorpayX before it's saved.</div>
        <button onClick={submit} disabled={saving} className="btn-primary w-full justify-center py-2.5 text-sm disabled:opacity-50">{saving ? <><Loader2 size={15} className="animate-spin" /> Verifying…</> : "Add & verify"}</button>
      </div>
    </div>
  );
}
function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="mb-2 block">
      <span className="mb-1 block text-xs font-semibold text-ink-600">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-ink-900/10 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
    </label>
  );
}
