"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, ScanFace, Check, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { dok } from "@/lib/api";
import { dataUrlToBlob, verificationMissing } from "@/lib/profileForms";
import { Field, Text } from "./fields";
import FileUpload from "./FileUpload";
import MediaViewer from "./MediaViewer";
import LivenessCheck from "./LivenessCheck";

const STATUS_LABEL = {
  not_submitted: { text: "Not started", cls: "bg-ink-900/5 text-ink-600" },
  pending: { text: "Pending review", cls: "bg-amber-50 text-amber-700" },
  verified: { text: "Verified", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { text: "Rejected", cls: "bg-rose-50 text-rose-700" },
};

const labelFor = (k) => ({
  countryOfPractice: "Country of practice", stateRegion: "State / region", professionType: "Profession type",
  registrationNumber: "Registration number", highestQualification: "Highest qualification",
  aadhaarDoc: "Aadhaar / Gov-ID", panDoc: "PAN card", workIdCard: "Work ID card", livenessMedia: "Liveness scan",
  workplaceContactNumber: "Workplace contact number", workplaceLocation: "Workplace location", contactNumber: "Your contact number",
}[k] || k);

export default function VerificationWizard({ onChanged }) {
  const [status, setStatus] = useState("not_submitted");
  const [rejection, setRejection] = useState("");
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Path A (credential)
  const [a, setA] = useState({ countryOfPractice: "", stateRegion: "", professionType: "", registrationNumber: "", highestQualification: "" });
  const [licenseDoc, setLicenseDoc] = useState(null);
  const setAk = (k) => (v) => setA((s) => ({ ...s, [k]: v }));

  // Path B (document + liveness)
  const [b, setB] = useState({ workplaceName: "", workplaceContactNumber: "", workplaceLocation: "", contactNumber: "" });
  const [aadhaarDoc, setAadhaar] = useState(null);
  const [panDoc, setPan] = useState(null);
  const [workIdCard, setWorkId] = useState(null);
  const [livenessBlob, setLivenessBlob] = useState(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [livenessView, setLivenessView] = useState(false);
  const setBk = (k) => (v) => setB((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    dok.profile.verificationGet()
      .then((d) => { setStatus(d?.status || "not_submitted"); setRejection(d?.rejectionReason || ""); })
      .catch(() => {});
  }, []);

  const submitA = async () => {
    setErr("");
    const missing = verificationMissing("credential", a, {});
    if (missing.length) { setErr(`${labelFor(missing[0])} is required.`); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("pathType", "credential");
      Object.entries(a).forEach(([k, v]) => v && fd.append(k, v));
      if (licenseDoc instanceof Blob) fd.append("licenseDoc", licenseDoc, licenseDoc.name || "license");
      await dok.profile.verificationSubmit(fd);
      setStep(2);
    } catch (e) { setErr(e?.response?.data?.message || "Couldn't submit Path A."); }
    finally { setBusy(false); }
  };

  const submitB = async () => {
    setErr("");
    const files = { aadhaarDoc, panDoc, workIdCard, livenessMedia: livenessBlob };
    const missing = verificationMissing("document", b, files);
    if (missing.length) { setErr(`${labelFor(missing[0])} is required.`); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("pathType", "document");
      Object.entries(b).forEach(([k, v]) => v && fd.append(k, v));
      fd.append("aadhaarDoc", aadhaarDoc, aadhaarDoc.name || "aadhaar");
      fd.append("panDoc", panDoc, panDoc.name || "pan");
      fd.append("workIdCard", workIdCard, workIdCard.name || "workid");
      fd.append("livenessMedia", livenessBlob, "liveness.jpg");
      fd.append("livenessPassed", "true");
      await dok.profile.verificationSubmit(fd);
      setStatus("pending");
      onChanged?.();
    } catch (e) { setErr(e?.response?.data?.message || "Couldn't submit Path B."); }
    finally { setBusy(false); }
  };

  const label = STATUS_LABEL[status] || STATUS_LABEL.not_submitted;
  const submitted = status === "pending" || status === "verified";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4">
        <ShieldCheck size={22} className="mt-0.5 text-brand-600" />
        <div className="flex-1">
          <p className="flex items-center gap-2 text-sm font-bold text-brand-800">Verification <span className={cn("chip text-[10px]", label.cls)}>{label.text}</span></p>
          <p className="mt-0.5 text-sm text-brand-700/80">Complete Path A, then Path B. Submissions are reviewed by our team.</p>
          {status === "rejected" && rejection && <p className="mt-1 text-sm text-rose-600">Reason: {rejection}</p>}
        </div>
      </div>

      {submitted ? (
        <p className="rounded-xl bg-ink-900/[.03] p-4 text-center text-sm text-ink-500">
          {status === "verified" ? "Your profile is verified ✓" : "Your submission is pending review."}
        </p>
      ) : (
        <>
          {/* stepper */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className={cn("rounded-full px-3 py-1", step === 1 ? "bg-brand-600 text-white" : "bg-emerald-50 text-emerald-700")}>1 · Credential</span>
            <span className="h-px flex-1 bg-ink-900/10" />
            <span className={cn("rounded-full px-3 py-1", step === 2 ? "bg-brand-600 text-white" : "bg-ink-900/5 text-ink-500")}>2 · Documents</span>
          </div>

          {step === 1 ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Country of practice *"><Text value={a.countryOfPractice} onChange={setAk("countryOfPractice")} placeholder="India" /></Field>
                <Field label="State / region *"><Text value={a.stateRegion} onChange={setAk("stateRegion")} placeholder="Maharashtra" /></Field>
                <Field label="Profession type *"><Text value={a.professionType} onChange={setAk("professionType")} placeholder="Cardiologist" /></Field>
                <Field label="Registration number *"><Text value={a.registrationNumber} onChange={setAk("registrationNumber")} placeholder="MH-2014-55821" /></Field>
              </div>
              <Field label="Highest qualification *"><Text value={a.highestQualification} onChange={setAk("highestQualification")} placeholder="DM Cardiology" /></Field>
              <Field label="License document" hint="Image or PDF (optional)"><FileUpload value={licenseDoc} onChange={setLicenseDoc} label="License document" /></Field>
              {err && <p className="text-sm text-rose-600">{err}</p>}
              <button onClick={submitA} disabled={busy} className="btn-primary w-full py-3 text-sm">{busy ? "Submitting…" : "Complete Path A →"}</button>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-ink-500 hover:text-brand-700"><ArrowLeft size={15} /> Back to Path A</button>
              <Field label="Aadhaar / Government ID *"><FileUpload value={aadhaarDoc} onChange={setAadhaar} label="Aadhaar / Gov-ID" /></Field>
              <Field label="PAN card *"><FileUpload value={panDoc} onChange={setPan} label="PAN card" /></Field>
              <Field label="Work ID card *"><FileUpload value={workIdCard} onChange={setWorkId} label="Work ID card" /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Workplace name"><Text value={b.workplaceName} onChange={setBk("workplaceName")} placeholder="Lilavati Hospital" /></Field>
                <Field label="Workplace contact number *"><Text value={b.workplaceContactNumber} onChange={setBk("workplaceContactNumber")} placeholder="+91 22 5555 1234" /></Field>
                <Field label="Workplace location *"><Text value={b.workplaceLocation} onChange={setBk("workplaceLocation")} placeholder="Bandra, Mumbai" /></Field>
                <Field label="Your contact number *"><Text value={b.contactNumber} onChange={setBk("contactNumber")} placeholder="+91 98765 43210" /></Field>
              </div>

              {/* liveness */}
              <div className={cn("flex items-center gap-3 rounded-xl border-2 p-3", livenessBlob ? "border-emerald-300 bg-emerald-50" : "border-ink-900/15")}>
                <button type="button" onClick={() => livenessBlob && setLivenessView(true)} className={cn("grid h-10 w-10 place-items-center overflow-hidden rounded-xl", livenessBlob ? "bg-emerald-100 text-emerald-600" : "bg-ink-900/[.04] text-ink-500")}>
                  {livenessBlob ? <Check size={18} /> : <ScanFace size={18} />}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink-900">Liveness check *</p>
                  <p className="text-xs text-ink-400">{livenessBlob ? "Captured ✓ — tap icon to view" : "3-second live face scan (required)"}</p>
                </div>
                <button type="button" onClick={() => setScanOpen(true)} className="btn-outline px-3 py-2 text-xs">{livenessBlob ? "Re-scan" : "Start"}</button>
              </div>

              {err && <p className="text-sm text-rose-600">{err}</p>}
              <button onClick={submitB} disabled={busy} className="btn-primary w-full py-3 text-sm">{busy ? "Submitting…" : "Submit for verification"}</button>
            </div>
          )}
        </>
      )}

      {scanOpen && (
        <LivenessCheck
          onClose={() => setScanOpen(false)}
          onComplete={(dataUrl) => { setLivenessBlob(dataUrlToBlob(dataUrl)); setScanOpen(false); }}
        />
      )}
      {livenessView && livenessBlob && (
        <MediaViewer src={URL.createObjectURL(livenessBlob)} kind="image" onClose={() => setLivenessView(false)} />
      )}
    </div>
  );
}
