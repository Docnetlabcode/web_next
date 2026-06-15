"use client";
import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { User, GraduationCap, Briefcase, Stethoscope, BadgeCheck, ChevronDown, Check, ArrowLeft, Camera } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner, Avatar } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn } from "@/lib/utils";
import PhotoUploader from "@/components/profile/PhotoUploader";
import {
  BasicContactForm, EducationForm, WorkplaceForm, ProfessionalForm, VerificationForm, StudentAcademicForm,
} from "@/components/profile/ProfileForms";

const BASIC = { key: "basic", title: "Basic Contact", icon: User, Comp: BasicContactForm };
const DOCTOR_SECTIONS = [
  BASIC,
  { key: "education", title: "Education", icon: GraduationCap, Comp: EducationForm },
  { key: "workplace", title: "Workplace", icon: Briefcase, Comp: WorkplaceForm },
  { key: "professional", title: "Professional Details", icon: Stethoscope, Comp: ProfessionalForm },
  { key: "verification", title: "Verification (KYC)", icon: BadgeCheck, Comp: VerificationForm },
];
const STUDENT_SECTIONS = [
  BASIC,
  { key: "academic", title: "Academic Details", icon: GraduationCap, Comp: StudentAcademicForm },
];
const SECTIONS_BY_ROLE = { doctor: DOCTOR_SECTIONS, student: STUDENT_SECTIONS, general_user: [BASIC] };

export default function EditProfile() {
  const { user: authUser, demo, updateUser } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null); // { user, roleProfile }
  const [status, setStatus] = useState(null);
  const [meta, setMeta] = useState({ specializations: [], degrees: [] });
  const [open, setOpen] = useState("basic");
  const [uploader, setUploader] = useState(null); // "avatar" | "cover" | null
  const [loading, setLoading] = useState(!demo);

  const load = async () => {
    const [me, st] = await Promise.allSettled([dok.profile.me(), dok.profile.status()]);
    if (me.status === "fulfilled") {
      setData(me.value);
      if (me.value.user) updateUser(me.value.user); // keep nav/profile name+photo in sync
    }
    if (st.status === "fulfilled") setStatus(st.value);
  };

  useEffect(() => {
    if (demo) return;
    setLoading(true);
    load().finally(() => setLoading(false));
    dok.auth.meta().then((d) => setMeta({ specializations: d.specializations || [], degrees: d.degrees || [] })).catch(() => {});
  }, [demo]);

  if (demo) {
    return (
      <div className="mx-auto max-w-2xl pb-24">
        <PageHeader title="Edit profile" subtitle="Complete your profile across each section" />
        <div className="card p-8 text-center text-ink-500">
          <p className="text-sm">You're exploring the demo. <button onClick={() => nav("/login")} className="font-semibold text-brand-700">Sign in</button> to edit your real profile.</p>
        </div>
      </div>
    );
  }

  const user = data?.user || authUser || {};
  const rp = data?.roleProfile || {};
  const role = user.role || "general_user";
  const sections = SECTIONS_BY_ROLE[role] || [BASIC];

  const isComplete = (key) => {
    if (key === "verification") return (status?.sections?.verification?.kycStatus || "") === "verified";
    if (key === "academic") return !!(status?.sections?.academic?.complete ?? status?.sections?.basic?.complete);
    return !!status?.sections?.[key]?.complete;
  };
  const doneCount = sections.filter((s) => isComplete(s.key)).length;
  const kyc = status?.sections?.verification?.kycStatus;

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <button onClick={() => nav("/app/profile")} className="mb-2 flex items-center gap-1 text-sm text-ink-500 hover:text-brand-700"><ArrowLeft size={16} /> Back to profile</button>
      <PageHeader title="Edit profile" subtitle={`${doneCount} of ${sections.length} sections complete${kyc && kyc !== "not_started" ? ` · KYC ${kyc.replace("_", " ")}` : ""}`} />

      {/* Header: cover + avatar with camera/upload controls */}
      <div className="card mb-3 overflow-hidden">
        <div className="relative h-28 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-900">
          {user.coverPhoto && <img src={user.coverPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <button onClick={() => setUploader("cover")} className="press absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/60"><Camera size={14} /> Cover</button>
        </div>
        <div className="px-5 pb-4">
          <div className="-mt-10 flex items-end gap-3">
            <div className="relative">
              <Avatar user={user} size={84} className="ring-4 ring-white" />
              <button onClick={() => setUploader("avatar")} className="press absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-white ring-2 ring-white hover:bg-brand-700"><Camera size={14} /></button>
            </div>
            <div className="pb-1">
              <p className="font-display text-lg font-bold text-ink-900">{user.titlePrefix ? `${user.titlePrefix} ` : ""}{user.fullName || "Your name"}</p>
              <p className="text-sm text-ink-500">{user.professionalHeadline || user.headline || rp.mainSpecialization || ""}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div>
      ) : (
        <div className="space-y-3">
          {sections.map(({ key, title, icon: Icon, Comp }) => {
            const opened = open === key;
            const complete = isComplete(key);
            return (
              <div key={key} className="card overflow-hidden">
                <button onClick={() => setOpen(opened ? null : key)} className="flex w-full items-center gap-3 p-4 text-left">
                  <span className={cn("grid h-10 w-10 place-items-center rounded-xl", complete ? "bg-emerald-50 text-emerald-600" : "bg-brand-50 text-brand-600")}><Icon size={18} /></span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-ink-900">{title}</span>
                    <span className={cn("block text-xs", complete ? "text-emerald-600" : "text-ink-400")}>{complete ? "Complete" : "Incomplete"}</span>
                  </span>
                  {complete && <Check size={16} className="text-emerald-600" />}
                  <ChevronDown size={18} className={cn("text-ink-400 transition", opened && "rotate-180")} />
                </button>
                {opened && (
                  <div className="border-t border-ink-900/[.06] p-4">
                    <Comp user={user} role={role} roleProfile={rp} meta={meta} onSaved={load} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {uploader && (
        <PhotoUploader
          kind={uploader}
          onClose={() => setUploader(null)}
          onUploaded={(url) => {
            const field = uploader === "avatar" ? "profilePhoto" : "coverPhoto";
            setData((d) => ({ ...(d || {}), user: { ...(d?.user || {}), [field]: url } }));
            updateUser({ [field]: url });
          }}
        />
      )}
    </div>
  );
}
