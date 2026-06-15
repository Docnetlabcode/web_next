"use client";
import { useEffect, useState } from "react";
import { MapPin, Briefcase, GraduationCap, Building2, Share2, MoreHorizontal, ArrowLeft, Settings as SettingsIcon, Stethoscope } from "lucide-react";
import { useNavigate } from "@/lib/router";
import { Avatar, Verified, RoleBadge, Spinner } from "@/components/ui/Primitives";
import PostCard from "@/components/PostCard";
import ShareSheet from "@/components/ShareSheet";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn, compact } from "@/lib/utils";

const TABS = ["Posts", "Pulse", "Cases", "About"];
const yr = (d) => (d ? new Date(d).getFullYear() : "Now");

export default function Profile() {
  const { user: authUser } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("Posts");
  const [share, setShare] = useState(false);

  // Live profile: { user, roleProfile }.
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    dok.profile
      .me()
      .then((d) => alive && setData(d))
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const user = data?.user || authUser || {};
  const rp = data?.roleProfile || {};
  const headline = user.professionalHeadline || user.headline || rp.mainSpecialization || rp.course || "";
  const primaryPlace = rp.hospitals?.[0]?.name || rp.institution || "";
  const subtitle = [primaryPlace, user.city].filter(Boolean).join(" · ");
  const verified = user.isVerified || rp.kyc?.status === "verified";

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <div className="card overflow-hidden">
        {/* cover */}
        <div className="relative h-40 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-900">
          {user.coverPhoto && <img src={user.coverPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 grid-bg opacity-30" />
          <button onClick={() => nav(-1)} className="press absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"><ArrowLeft size={18} /></button>
          <button onClick={() => nav("/app/settings")} className="press absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"><MoreHorizontal size={18} /></button>
        </div>
        <div className="px-5 pb-5">
          <div className="-mt-14 flex items-end justify-between">
            <Avatar user={user} size={104} className="ring-4 ring-white" />
            <div className="mb-1 flex gap-2">
              <button onClick={() => setShare(true)} className="btn-outline press px-4 py-2 text-sm"><Share2 size={15} /> Share</button>
              <button onClick={() => nav("/app/profile/edit")} className="btn-primary press px-4 py-2 text-sm"><SettingsIcon size={15} /> Edit profile</button>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <h1 className="font-display text-2xl font-extrabold text-ink-900">{user.titlePrefix ? `${user.titlePrefix} ` : ""}{user.fullName || "Your name"}</h1>
            {verified && <Verified size={18} />}
          </div>
          {headline && <p className="text-sm text-ink-600">{headline}</p>}
          {subtitle && <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500"><Building2 size={14} /> {subtitle}</p>}
          <div className="mt-3 flex gap-6 text-sm">
            <Stat n={user.connectionsCount} label="connections" />
            <Stat n={user.followersCount} label="followers" />
            <Stat n={user.postsCount} label="posts" />
          </div>
          <div className="mt-3"><RoleBadge role={user.role} /></div>
        </div>
      </div>

      {/* tabs */}
      <div className="sticky top-16 z-20 mt-5 flex gap-1 border-b border-ink-900/[.06] bg-[#f4f6f6]/90 backdrop-blur">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("press relative px-4 py-3 text-sm font-semibold transition", tab === t ? "text-brand-700" : "text-ink-400 hover:text-ink-700")}>
            {t}{tab === t && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-600 anim-pop" />}
          </button>
        ))}
      </div>

      <div className="mt-5 animate-fade-up">
        {loading ? (
          <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div>
        ) : (
          <>
            {tab === "Posts" && <Empty icon={Briefcase} text="Posts you publish will appear here." />}
            {tab === "Pulse" && <Empty icon={Stethoscope} text="Your reels (Pulse) will appear here." />}
            {tab === "Cases" && <Empty icon={Stethoscope} text="Clinical cases you publish will appear here." />}
            {tab === "About" && <About user={user} rp={rp} />}
          </>
        )}
      </div>

      <ShareSheet open={share} onClose={() => setShare(false)} kind="profile" />
    </div>
  );
}

const Stat = ({ n, label }) => <span><b className="text-ink-900">{compact(n || 0)}</b> <span className="text-ink-500">{label}</span></span>;

function Empty({ icon: Icon, text }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-10 text-center text-ink-500">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-900/[.04] text-ink-400"><Icon size={22} /></span>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function About({ user, rp }) {
  const role = user.role;
  const education = rp.education || [];
  const hospitals = rp.hospitals || rp.workplace || [];
  const bio = user.bio;

  const hasAny = bio || education.length || hospitals.length || rp.specializations?.length || rp.course || rp.skills?.length;
  if (!hasAny) return <Empty icon={MapPin} text="Add your bio, education and experience from Settings → Edit profile." />;

  return (
    <div className="card space-y-2 p-5">
      {bio && <p className="mb-3 text-sm leading-relaxed text-ink-700">{bio}</p>}

      {role === "doctor" && rp.specializations?.length > 0 && (
        <Row icon={Stethoscope} tint="bg-brand-50 text-brand-600" title="Specializations" text={rp.specializations.join(" · ")} />
      )}

      {hospitals.map((h, i) => (
        <Row key={`w${i}`} icon={Briefcase} tint="bg-brand-50 text-brand-600"
          title={[h.designation, h.name].filter(Boolean).join(" · ") || h.name}
          text={[h.address, `${yr(h.startDate)} — ${yr(h.endDate)}`].filter(Boolean).join(" · ")} />
      ))}

      {education.map((e, i) => (
        <Row key={`e${i}`} icon={GraduationCap} tint="bg-amber-50 text-amber-600"
          title={[e.degreeName, e.organizationName].filter(Boolean).join(" · ") || e.organizationName}
          text={[e.departmentName, `${yr(e.startDate)} — ${yr(e.endDate)}`].filter(Boolean).join(" · ")} />
      ))}

      {role === "student" && (rp.course || rp.institution) && (
        <Row icon={GraduationCap} tint="bg-amber-50 text-amber-600"
          title={[rp.course, rp.institution].filter(Boolean).join(" · ")}
          text={[rp.yearOfStudy, rp.graduationYear && `Grad ${rp.graduationYear}`].filter(Boolean).join(" · ")} />
      )}

      {rp.skills?.length > 0 && (
        <Row icon={Stethoscope} tint="bg-ink-900/[.04] text-ink-600" title="Skills" text={rp.skills.join(" · ")} />
      )}
    </div>
  );
}

function Row({ icon: Icon, title, text, tint }) {
  return (
    <div className="flex gap-3 rounded-xl p-2 transition hover:bg-ink-900/[.02]">
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", tint)}><Icon size={18} /></span>
      <div><p className="text-sm font-semibold text-ink-900">{title}</p>{text && <p className="text-sm text-ink-500">{text}</p>}</div>
    </div>
  );
}
