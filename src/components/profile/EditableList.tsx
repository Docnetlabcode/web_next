"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field, Text, Area, Tags, SaveBar } from "./fields";
import FileUpload from "./FileUpload";
import { prune } from "@/lib/profileForms";

let _uid = 0;
const uid = () => `tmp_${++_uid}`;
const stripMeta = ({ _id, _new, _key, ...rest }) => rest;

// fields: [{ key, label, type?: "text"|"date"|"area"|"tags"|"file", placeholder?, required? }]
function RowField({ f, value, onChange }) {
  if (f.type === "area") return <Area value={value} onChange={onChange} placeholder={f.placeholder} />;
  if (f.type === "tags") return <Tags value={value || []} onChange={onChange} placeholder={f.placeholder || "Type and press Enter"} />;
  if (f.type === "file") return <FileUpload value={value} onChange={onChange} label={f.label} />;
  if (f.type === "date") return <Text type="date" value={value ? String(value).slice(0, 10) : ""} onChange={onChange} />;
  return <Text value={value} onChange={onChange} placeholder={f.placeholder} />;
}

function RowCard({ index, row, fields, itemLabel, onField, crud, onSaved, onRemoved }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const save = async () => {
    setErr(""); setOk(false);
    const body = prune(stripMeta(row));
    const missing = fields.find((f) => f.required && !body[f.key]);
    if (missing) { setErr(`${missing.label} is required.`); return; }
    setSaving(true);
    try {
      const res = row._new ? await crud.add(body) : await crud.update(row._id, body);
      setOk(true);
      onSaved(res?.item || res || {});
    } catch (e) {
      setErr(e?.response?.data?.message || "Couldn't save. Please try again.");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (row._new) { onRemoved(); return; }
    setErr(""); setSaving(true);
    try { await crud.remove(row._id); onRemoved(); }
    catch (e) { setErr(e?.response?.data?.message || "Couldn't delete."); setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-ink-900/10 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-ink-400">{itemLabel} {index + 1}</span>
        <button type="button" onClick={remove} disabled={saving} className="text-rose-500 hover:text-rose-700"><Trash2 size={15} /></button>
      </div>
      <div className="space-y-3">
        {fields.map((f) => (
          <Field key={f.key} label={f.label + (f.required ? " *" : "")} hint={f.hint}>
            <RowField f={f} value={row[f.key]} onChange={(v) => onField(f.key, v)} />
          </Field>
        ))}
      </div>
      <div className="mt-3"><SaveBar onSave={save} saving={saving} err={err} ok={ok} label={row._new ? "Save" : "Update"} /></div>
    </div>
  );
}

export default function EditableList({ itemLabel, addLabel, items = [], blank, fields, crud, onChanged, max = 25 }) {
  const [rows, setRows] = useState(() => (items || []).map((it) => ({ ...blank, ...it, _id: it.id, _key: it.id || uid() })));
  const setRow = (key, patch) => setRows((l) => l.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  const addRow = () => setRows((l) => [...l, { ...blank, _new: true, _key: uid() }]);

  return (
    <div className="space-y-4">
      {rows.length === 0 && <p className="text-sm text-ink-400">Nothing added yet.</p>}
      {rows.map((row, i) => (
        <RowCard
          key={row._key}
          index={i}
          row={row}
          fields={fields}
          itemLabel={itemLabel}
          onField={(k, v) => setRow(row._key, { [k]: v })}
          crud={crud}
          onSaved={(item) => { setRow(row._key, { ...item, _id: item.id, _new: false }); onChanged?.(); }}
          onRemoved={() => { setRows((l) => l.filter((r) => r._key !== row._key)); onChanged?.(); }}
        />
      ))}
      {rows.length < max && (
        <button type="button" onClick={addRow} className="btn-outline w-full py-2.5 text-sm"><Plus size={16} /> {addLabel || `Add ${itemLabel?.toLowerCase() || "entry"}`}</button>
      )}
    </div>
  );
}
