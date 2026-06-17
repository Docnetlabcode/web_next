"use client";
import { useEffect, useState } from "react";
import { MapPin, Briefcase, GraduationCap, Building2, Share2, ArrowLeft, Settings as SettingsIcon, Stethoscope, Activity, CalendarDays, Mail, Phone, Languages as LangIcon, Award } from "lucide-react";
import { useNavigate } from "@/lib/router";
import { Avatar, Verified, RoleBadge, Spinner } from "@/components/ui/Primitives";
import PostCard from "@/components/PostCard";
import ShareSheet from "@/components/ShareSheet";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn, compact } from "@/lib/utils";

const TABS = ["About", "Posts", "Pulse", "Cases"];
const yr = (d) => (d ? new Date(d).getFullYear() : "Now");
const monthYear = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : null);

export default function Profile() {
  const { user: authUser } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("About");
  const [share, setShare] = useState(false);

  // Live profile: { user, roleProfile }.
  const [data, setData] = useState(null);
  const [full, setFull] = useState(null); // hydrate payload: memberSince, accountAge, role metrics
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.allSettled([
      dok.profile.me(),
      dok.profile.full()
    ]).then(([meRes, fullRes]) => {
      if (!alive) return;
      if (meRes.status === "fulfilled") setData(meRes.value);
      if (fullRes.status === "fulfilled") setFull(fullRes.value);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const user = full?.user || data?.user || authUser || {};
  const doctor = full?.doctor || {};
  const student = full?.student || {};
  const general = full?.general || {};
  const rp = data?.roleProfile || {};

  const headline = user.professionalHeadline || user.headline || doctor.specialties?.[0] || rp.mainSpecialization || rp.course || "";
  const primaryPlace = doctor.workplace?.[0]?.organizationName || student.academics?.[0]?.collegeName || rp.hospitals?.[0]?.name || rp.institution || "";
  const subtitle = [primaryPlace, user.city].filter(Boolean).join(" · ");
  const verified = user.isVerified || full?.verification?.status === "verified" || rp.kyc?.status === "verified";
  const since = monthYear(full?.memberSince || user.createdAt);
  const ageLabel = full?.accountAge?.label;

  // Doctor-only metrics — render only when the value actually exists (never faked).
  const patients = full?.doctor?.patientVerificationCount ?? rp.patientVerificationCount;
  const yearsExp = full?.doctor?.yearsOfClinicalExperience ?? rp.yearsOfClinicalExperience;

  const metrics = [
    { n: user.followingCount, label: "Following", onClick: () => nav("/app/connections?tab=following") },
    { n: user.followersCount, label: "Followers", onClick: () => nav("/app/connections?tab=followers") },
    { n: user.connectionsCount, label: "Connections", onClick: () => nav("/app/connections?tab=connections") },
    { n: user.postsCount, label: "Posts", onClick: () => setTab("Posts") },
  ];

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <div className="card overflow-hidden">
        {/* cover */}
        <div className="relative h-40 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-900">
          {user.coverPhoto && <img src={user.coverPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="absolute inset-0 grid-bg opacity-30" />
          <button onClick={() => nav(-1)} className="press absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"><ArrowLeft size={18} /></button>
        </div>

        <div className="px-5 pb-5">
          <div className="-mt-14 flex items-end justify-between">
            {/* avatar with verified badge overlapping the DP frame */}
            <div className="relative">
              <Avatar user={user} size={104} className="ring-4 ring-white" />
              {verified && (
                <span className="absolute -bottom-0.5 -right-0.5 grid h-8 w-8 place-items-center rounded-full bg-white ring-1 ring-ink-900/[.06]" title="Verified professional">
                  <Verified size={22} />
                </span>
              )}
            </div>
            <div className="mb-1 flex gap-2">
              <button onClick={() => setShare(true)} className="btn-outline press px-4 py-2 text-sm"><Share2 size={15} /> Share</button>
              <button onClick={() => nav("/app/profile/edit")} className="btn-primary press px-4 py-2 text-sm"><SettingsIcon size={15} /> Edit profile</button>
            </div>
          </div>

          {user.uniqueUsername && <p className="mt-3 text-sm font-semibold text-brand-700">@{user.uniqueUsername}</p>}
          <div className={cn("flex items-center gap-1.5", user.uniqueUsername ? "mt-0.5" : "mt-3")}>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 text-balance">{user.titlePrefix ? `${user.titlePrefix} ` : ""}{user.fullName || "Your name"}</h1>
          </div>
          {subtitle && <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500"><Building2 size={14} /> {subtitle}</p>}
          {since && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-400">
              <CalendarDays size={13} /> Member since {since}{ageLabel ? ` · ${ageLabel} on DokLynk` : ""}
            </p>
          )}

          {/* doctor-only validated metrics */}
          {user.role === "doctor" && (patients != null || yearsExp != null) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {patients != null && <span className="chip bg-brand-50 text-brand-700"><Activity size={13} /> {compact(patients)} patients verified</span>}
              {yearsExp != null && <span className="chip bg-ink-900/[.04] text-ink-600"><Stethoscope size={13} /> {yearsExp} yrs experience</span>}
            </div>
          )}

          {/* interactive relationship + content metrics */}
          <div className="mt-4 flex">
            {metrics.map((m) => (
              <button key={m.label} onClick={m.onClick} className="press flex flex-1 flex-col items-start rounded-xl px-2 py-1.5 text-left transition hover:bg-ink-900/[.03]">
                <b className="font-display text-lg font-extrabold tabular-nums text-ink-900">{compact(m.n || 0)}</b>
                <span className="text-xs text-ink-500">{m.label}</span>
              </button>
            ))}
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
            {tab === "About" && <About user={user} doctor={doctor} student={student} general={general} />}
          </>
        )}
      </div>

      <ShareSheet open={share} onClose={() => setShare(false)} kind="profile" />
    </div>
  );
}

function Empty({ icon: Icon, text }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-10 text-center text-ink-500">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-900/[.04] text-ink-400"><Icon size={22} /></span>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function About({ user, doctor, student, general }) {
  const role = user.role;
  const education = doctor.education || [];
  const workplace = doctor.workplace || [];
  const academics = student.academics || [];
  const experiences = student.experiences || [];
  const certificates = doctor.certificates || [];
  const specialties = doctor.specialties || [];
  const interests = general.interests || [];

  const hasContact = user.bio || user.city || user.languages?.length || user.workEmail || user.workPhone || user.age != null;
  const hasRoleDetails =
    role === "doctor" ? (education.length > 0 || workplace.length > 0 || certificates.length > 0 || specialties.length > 0) :
    role === "student" ? (academics.length > 0 || experiences.length > 0) :
    role === "general_user" ? (interests.length > 0) : false;

  const hasAny = hasContact || hasRoleDetails;
  if (!hasAny) return <Empty icon={MapPin} text="Add your bio, education and experience from Edit profile." />;

  return (
    <div className="space-y-5">
      {hasContact && (
        <Section title="About">
          {user.bio && (
            <p className="text-sm leading-relaxed text-ink-700 whitespace-pre-wrap">{user.bio}</p>
          )}
          {user.bio && (user.city || user.age != null || user.languages?.length > 0 || user.workEmail || user.workPhone) && (
            <hr className="my-4 border-ink-900/[.06]" />
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {user.city && <Line icon={MapPin} text={user.city} />}
            {user.age != null && <Line icon={CalendarDays} text={`${user.age} years`} />}
            {user.languages?.length > 0 && <Line icon={LangIcon} text={user.languages.join(", ")} />}
            {user.workEmail && <Line icon={Mail} text={user.workEmail} />}
            {user.workPhone && <Line icon={Phone} text={user.workPhone} />}
          </div>
        </Section>
      )}

      {role === "doctor" && specialties.length > 0 && (
        <Section title="Specialties">
          <div className="flex flex-wrap gap-2">
            {specialties.map((s) => <span key={s} className="chip bg-brand-50 text-brand-700">{s}</span>)}
          </div>
        </Section>
      )}

      {role === "doctor" && workplace.length > 0 && (
        <Section title="Experience">
          {workplace.map((h, i) => (
            <Row key={`w${i}`} icon={Briefcase} tint="bg-brand-50 text-brand-600"
              title={[h.role || h.designation, h.organizationName || h.name].filter(Boolean).join(" · ") || h.organizationName || h.name}
              text={[h.department || h.address, `${yr(h.startDate)} — ${h.endDate ? yr(h.endDate) : "Present"}`].filter(Boolean).join(" · ")} />
          ))}
        </Section>
      )}

      {role === "doctor" && education.length > 0 && (
        <Section title="Education">
          {education.map((e, i) => (
            <Row key={`e${i}`} icon={GraduationCap} tint="bg-amber-50 text-amber-600"
              title={[e.organizationName, e.departmentName].filter(Boolean).join(" · ") || e.organizationName}
              text={`${yr(e.startDate)} — ${e.endDate ? yr(e.endDate) : "Present"}`} />
          ))}
        </Section>
      )}

      {role === "student" && academics.length > 0 && (
        <Section title="Academics">
          {academics.map((a, i) => (
            <Row key={`a${i}`} icon={GraduationCap} tint="bg-amber-50 text-amber-600"
              title={[a.program, a.collegeName].filter(Boolean).join(" · ") || a.collegeName}
              text={[a.city, a.currentYear, a.expectedGraduationDate && `Grad ${yr(a.expectedGraduationDate)}`].filter(Boolean).join(" · ")} />
          ))}
        </Section>
      )}

      {role === "student" && experiences.length > 0 && (
        <Section title="Experience & interests">
          {experiences.map((e, i) => (
            <Row key={`x${i}`} icon={Briefcase} tint="bg-brand-50 text-brand-600"
              title={[e.program, e.institution].filter(Boolean).join(" · ") || e.institution}
              text={[e.city, `${yr(e.startDate)} — ${e.endDate ? yr(e.endDate) : "Present"}`, e.interests?.join(", ")].filter(Boolean).join(" · ")} />
          ))}
        </Section>
      )}

      {role === "doctor" && certificates.length > 0 && (
        <Section title="Certificates">
          {certificates.map((c, i) => (
            <Row key={`c${i}`} icon={Award} tint="bg-ink-900/[.04] text-ink-600"
              title={c.name}
              text={[c.validationDate && `Valid ${monthYear(c.validationDate)}`, c.fileUrl && "Document attached"].filter(Boolean).join(" · ")} />
          ))}
        </Section>
      )}

      {role === "general_user" && interests.length > 0 && (
        <Section title="Clinical interests">
          <div className="flex flex-wrap gap-2">
            {interests.map((t, i) => <span key={i} className="chip bg-brand-50 text-brand-700">{typeof t === "string" ? t : t.topic}</span>)}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-400">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Line({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-900/[.04] bg-ink-900/[.01] p-3 transition hover:bg-ink-900/[.03]">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
        <Icon size={16} />
      </span>
      <span className="text-sm font-medium text-ink-700 break-all">{text}</span>
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
