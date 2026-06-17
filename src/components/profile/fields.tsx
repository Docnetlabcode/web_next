"use client";
import { useState } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export const Text = ({ value, onChange, ...p }) => (
  <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="input" {...p} />
);

export const Num = ({ value, onChange, ...p }) => (
  <input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} className="input" {...p} />
);

export const Area = ({ value, onChange, ...p }) => (
  <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} className="input resize-none" {...p} />
);

export function Select({ value, onChange, options = [], placeholder = "Select…" }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="input">
      <option value="">{placeholder}</option>
      {options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
}

export function Toggle({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <p className="text-sm font-semibold text-ink-900">{label}</p>
        {desc && <p className="text-xs text-ink-500">{desc}</p>}
      </div>
      <button type="button" onClick={() => onChange(!value)} className={cn("relative h-6 w-11 rounded-full transition", value ? "bg-brand-600" : "bg-ink-900/15")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", value ? "left-[1.4rem]" : "left-0.5")} />
      </button>
    </div>
  );
}

export function Tags({ value = [], onChange, placeholder = "Type and press Enter" }) {
  const [draft, setDraft] = useState("");
  const add = () => { const v = draft.trim(); if (v && !value.includes(v)) { onChange([...value, v]); setDraft(""); } };
  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((t) => (
            <span key={t} className="chip bg-brand-50 text-brand-700">{t}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="ml-1 text-brand-500 hover:text-brand-800"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={placeholder} className="input flex-1" />
        <button type="button" onClick={add} className="btn-outline px-3"><Plus size={16} /></button>
      </div>
    </div>
  );
}

export function SaveBar({ onSave, saving, err, ok, label = "Save section" }) {
  return (
    <div className="pt-1">
      {err && <p className="mb-2 text-sm text-rose-600">{err}</p>}
      {ok && <p className="mb-2 text-sm text-emerald-600">Saved ✓</p>}
      <button type="button" onClick={onSave} disabled={saving} className="btn-primary w-full py-3 text-sm">{saving ? "Saving…" : label}</button>
    </div>
  );
}

// Wraps a save call: manages saving/err/ok + calls onSaved() to refresh the hub.
export function useSave(onSaved) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const run = async (fn) => {
    setErr(""); setOk(false); setSaving(true);
    try { await fn(); setOk(true); onSaved?.(); }
    catch (e) { setErr(e?.response?.data?.message || "Couldn't save. Please try again."); }
    finally { setSaving(false); }
  };
  return { saving, err, ok, run };
}

export const dateInput = (d) => (d ? String(d).slice(0, 10) : "");
