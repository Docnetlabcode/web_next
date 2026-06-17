"use client";
import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { User, GraduationCap, Briefcase, Stethoscope, BadgeCheck, Heart, ChevronDown, Check, ArrowLeft, Camera } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner, Avatar } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ROLE_SECTION_KEYS, completionForRole } from "@/lib/profileForms";
import PhotoUploader from "@/components/profile/PhotoUploader";
import VerificationWizard from "@/components/profile/VerificationWizard";
import {
  BasicContactForm, DoctorEducation, DoctorWorkplace, DoctorProfessional,
  StudentAcademics, StudentExperiences, GeneralInterests,
} from "@/components/profile/ProfileForms";

const SECTION_META = {
  basic: { title: "Basic Contact", icon: User },
  education: { title: "Education", icon: GraduationCap },
  workplace: { title: "Workplace", icon: Briefcase },
  professional: { title: "Professional Details", icon: Stethoscope },
  verification: { title: "Verification (KYC)", icon: BadgeCheck },
  academics: { title: "Academic Details", icon: GraduationCap },
  experiences: { title: "Experience & Interest", icon: Briefcase },
  interests: { title: "Clinic Interests", icon: Heart },
};

const VERIFICATION_BANNER = {
  pending: { text: "Verification pending review", cls: "bg-amber-50 text-amber-700" },
  verified: { text: "Verified", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { text: "Verification rejected — please resubmit", cls: "bg-rose-50 text-rose-700" },
};

export default function EditProfile() {
  const { user: authUser, demo, updateUser } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null); // full payload
  const [open, setOpen] = useState("basic");
  const [uploader, setUploader] = useState(null);
  const [loading, setLoading] = useState(!demo);

  const load = async () => {
    try {
      const full = await dok.profile.full();
      setData(full);
      if (full?.user) updateUser(full.user);
    } catch (e) {
      console.warn("Failed to load profile", e);
    }
  };

  useEffect(() => {
    if (demo) return;
    setLoading(true);
    load().finally(() => setLoading(false));
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
  const role = user.role || "general_user";
  const locks = data?.locks || {};
  const doctor = data?.doctor || {};
  const student = data?.student || {};
  const general = data?.general || {};
  const verificationStatus = data?.verification?.status || "not_submitted";
  const { sections: doneMap, done, total, percent } = completionForRole(role, data?.completion);
  const keys = ROLE_SECTION_KEYS[role] || ROLE_SECTION_KEYS.general_user;

  const renderSection = (key) => {
    switch (key) {
      case "basic": return <BasicContactForm user={user} role={role} locks={locks} onSaved={load} />;
      case "education": return <DoctorEducation doctor={doctor} onChanged={load} />;
      case "workplace": return <DoctorWorkplace doctor={doctor} onChanged={load} />;
      case "professional": return <DoctorProfessional doctor={doctor} onChanged={load} />;
      case "verification": return <VerificationWizard onChanged={load} />;
      case "academics": return <StudentAcademics student={student} onChanged={load} />;
      case "experiences": return <StudentExperiences student={student} onChanged={load} />;
      case "interests": return <GeneralInterests general={general} onChanged={load} />;
      default: return null;
    }
  };

  const banner = VERIFICATION_BANNER[verificationStatus];

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <button onClick={() => nav("/app/profile")} className="mb-2 flex items-center gap-1 text-sm text-ink-500 hover:text-brand-700"><ArrowLeft size={16} /> Back to profile</button>
      <PageHeader title="Edit profile" subtitle={`${done} of ${total} sections complete`} />

      {/* Header: cover + avatar */}
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
              <p className="font-display text-lg font-bold text-ink-900">{user.fullName || "Your name"}</p>
              <p className="text-sm text-ink-500">{user.professionalHeadline || user.headline || ""}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard: progress + verification status */}
      <div className="card mb-3 p-4">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-semibold text-ink-700">Profile completion</span>
          <span className="font-bold text-brand-700">{percent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-900/10"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${percent}%` }} /></div>
        {role === "doctor" && banner && (
          <div className={cn("mt-3 rounded-xl px-3 py-2 text-xs font-semibold", banner.cls)}>{banner.text}</div>
        )}
      </div>

      {loading ? (
        <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => {
            const meta = SECTION_META[key];
            const Icon = meta.icon;
            const opened = open === key;
            const complete = !!doneMap[key];
            return (
              <div key={key} className="card overflow-hidden">
                <button onClick={() => setOpen(opened ? null : key)} className="flex w-full items-center gap-3 p-4 text-left">
                  <span className={cn("grid h-10 w-10 place-items-center rounded-xl", complete ? "bg-emerald-50 text-emerald-600" : "bg-brand-50 text-brand-600")}><Icon size={18} /></span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-ink-900">{meta.title}</span>
                    <span className={cn("block text-xs", complete ? "text-emerald-600" : "text-ink-400")}>{complete ? "Complete" : "Incomplete"}</span>
                  </span>
                  {complete && <Check size={16} className="text-emerald-600" />}
                  <ChevronDown size={18} className={cn("text-ink-400 transition", opened && "rotate-180")} />
                </button>
                {opened && <div className="border-t border-ink-900/[.06] p-4">{renderSection(key)}</div>}
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
