"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Navigate } from "@/lib/router";
import { ArrowLeft, MapPin, Share2, Lock, MoreHorizontal, ShieldOff, UserMinus, Mail, Phone, Languages as LangIcon, Briefcase, GraduationCap, Stethoscope, Activity, CalendarDays, Award, UserPlus, UserCheck, Clock, Link2, Loader2, MessageSquare } from "lucide-react";
import { Avatar, Verified, RoleBadge, Skeleton } from "@/components/ui/Primitives";
import PostCard from "@/components/PostCard";
import ShareSheet from "@/components/ShareSheet";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { compact, roleLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Another user's profile — the routing target for every DP / display-name tap
 * across feed cards, like lists, and comment rows. Renders the documented
 * third-party shape (docs/profile.md §9): { user, roleDetails, isFollowing,
 * isRequested, connectionStatus, … }, with the list-visibility privacy gate.
 */
const yr = (d) => (d ? new Date(d).getFullYear() : "Now");
const monthYear = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : null);

export default function UserProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user: me, demo } = useAuth();
  const [data, setData] = useState(null);
  const [posts, setPosts] = useState(null);
  const [share, setShare] = useState(false);
  const [failed, setFailed] = useState(false);

  const isMe = me && (me._id === id || me.id === id);

  useEffect(() => {
    if (isMe) return;
    let alive = true;
    Promise.allSettled([dok.profile.byId(id), dok.follows.check(id)])
      .then(([p, f]) => {
        if (!alive) return;
        if (p.status !== "fulfilled") { setFailed(true); return; }
        const profile = p.value || {};
        const u = profile.user || profile;
        const rel = f.status === "fulfilled" ? f.value : {};
        // Relationship flags live at the TOP LEVEL of the byId payload (docs/profile.md §9),
        // not inside `user`; follows.check is a fallback (it lacks connectionStatus).
        setData({
          ...profile,
          user: {
            ...u,
            isSelf: u.isSelf ?? profile.isSelf,
            isFollowing: profile.isFollowing ?? rel.isFollowing ?? u.isFollowing,
            isFollowedBy: profile.isFollowedBy ?? rel.isFollowedBy ?? u.isFollowedBy,
            isRequested: profile.isRequested ?? rel.isRequested ?? u.isRequested,
            connectionStatus: profile.connectionStatus ?? u.connectionStatus ?? rel.connectionStatus,
            connectionRequestId: profile.connectionRequestId ?? u.connectionRequestId,
          },
        });
      });
    dok.posts
      .byUser(id, "?limit=20")
      .then((d) => alive && setPosts(d.posts || d.feed || []))
      .catch(() => alive && setPosts([]));
    return () => { alive = false; };
  }, [id, demo, isMe]);

  if (isMe) return <Navigate to="/app/profile" replace />;
  if (failed) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card grid place-items-center gap-3 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-ink-900/[.05] text-ink-400"><Lock size={24} /></span>
          <p className="text-lg font-semibold text-ink-900">Profile unavailable</p>
          <p className="text-sm text-ink-500">This account may be private, deactivated, or removed.</p>
          <button onClick={() => nav(-1)} className="btn-ghost px-5 py-2 text-sm">Go back</button>
        </div>
      </div>
    );
  }
  if (!data) return <ProfileSkeleton />;

  const u = data.user;
  const rd = data.roleDetails || data.roleProfile || {};
  const headline = u.professionalHeadline || u.headline || rd.mainSpecialization || rd.course || roleLabel(u.role);
  const place = [rd.hospitals?.[0]?.name || rd.institution, u.city].filter(Boolean).join(" · ");
  const since = monthYear(u.createdAt);
  const isPrivate = Boolean(u.isPrivate);
  const canViewLists = !isPrivate; // public, or a private account the viewer already follows (then byId returns full data)
  const patients = rd.patientVerificationCount;

  const uid = u.id || u._id;
  const listLink = (t) => `/app/connections?user=${uid}&tab=${t}&name=${encodeURIComponent(u.fullName || "")}`;
  const metrics = [
    { n: u.postsCount, label: "Posts" },
    // Followers/Following open for any user when the privacy wall allows (§3B).
    { n: u.followersCount, label: "Followers", to: canViewLists ? listLink("followers") : null },
    { n: u.followingCount, label: "Following", to: canViewLists ? listLink("following") : null },
    // No backend endpoint for a third party's connections list — display-only.
    { n: u.connectionsCount, label: "Connections" },
  ];

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <div className="card overflow-hidden">
        <div className="relative h-40 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-900">
          {u.coverPhoto && <img src={u.coverPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="grid-bg absolute inset-0 opacity-30" />
          <button onClick={() => nav(-1)} aria-label="Back" className="press absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"><ArrowLeft size={18} /></button>
          <div className="absolute right-3 top-3 flex gap-2">
            <button onClick={() => setShare(true)} aria-label="Share profile" className="press grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"><Share2 size={17} /></button>
            <ProfileMenu user={u} demo={demo} onChanged={(patch) => setData((d) => ({ ...d, user: { ...d.user, ...patch } }))} />
          </div>
        </div>

        <div className="px-5 pb-5">
          {/* relative z-10 lifts the DP + action above the absolutely-positioned cover image */}
          <div className="relative z-10 -mt-14">
            <span className="inline-block rounded-full ring-4 ring-white"><Avatar user={u} size={104} /></span>
          </div>

          <div className="mt-3">
            {u.uniqueUsername && <p className="text-sm font-semibold text-brand-700">@{u.uniqueUsername}</p>}
            <h1 className="mt-0.5 flex items-center gap-1.5 font-display text-2xl font-extrabold tracking-tight text-ink-900 text-balance">
              {u.fullName} {u.isVerified && <Verified size={18} />}
            </h1>
            <p className="mt-1 text-[15px] leading-snug text-ink-700">{headline}</p>
            {place && <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500"><MapPin size={13} /> {place}</p>}
            {since && (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-400">
                <span className="flex items-center gap-1.5"><CalendarDays size={13} /> Joined {since}</span>
                {u.role === "doctor" && patients != null && (
                  <span className="flex items-center gap-1.5 font-semibold text-brand-700"><Activity size={13} /> {compact(patients)} patients verified</span>
                )}
              </p>
            )}
            <div className="mt-2"><RoleBadge role={u.role} /></div>
          </div>

          {/* Follow + Connect — two distinct buttons on the profile (vs. one morphing button on cards) */}
          {!u.isSelf && <ProfileActions user={u} demo={demo} />}

          {/* interactive metrics with the private-account visibility gate (§3B) */}
          <div className="mt-4 border-t border-ink-900/[.06] pt-4">
            {!canViewLists && (
              <p className="mb-2 flex items-center gap-1.5 text-xs text-ink-400"><Lock size={12} /> Followers, following and connections are hidden on this private account.</p>
            )}
            <div className={cn("flex", !canViewLists && "opacity-60")}>
              {metrics.map((m) =>
                m.to ? (
                  <button key={m.label} onClick={() => nav(m.to)} className="press flex flex-1 flex-col items-start rounded-xl px-2 py-1.5 text-left transition hover:bg-ink-900/[.03]">
                    <b className="font-display text-lg font-extrabold tabular-nums text-ink-900">{compact(m.n || 0)}</b>
                    <span className="text-xs text-ink-500">{m.label}</span>
                  </button>
                ) : (
                  <div key={m.label} className="flex flex-1 flex-col items-start px-2 py-1.5">
                    <b className="font-display text-lg font-extrabold tabular-nums text-ink-900">{compact(m.n || 0)}</b>
                    <span className="text-xs text-ink-500">{m.label}</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* role-based detail sections */}
      {!isPrivate && <Details user={u} rd={rd} />}
      {isPrivate && (
        <div className="mt-5 card flex flex-col items-center gap-2 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-ink-900/[.05] text-ink-400"><Lock size={22} /></span>
          <p className="font-semibold text-ink-900">This account is private</p>
          <p className="max-w-xs text-sm text-ink-500">Follow {u.fullName?.split(" ")[0]} to see their posts, reels and network.</p>
        </div>
      )}

      {/* content (the 6-tab archive grid is a later build; public posts shown for now) */}
      {!isPrivate && (
        <div className="mt-5 space-y-5">
          {posts === null ? (
            <Skeleton className="h-48 w-full rounded-2xl" />
          ) : posts.length === 0 ? (
            <div className="card py-12 text-center">
              <p className="font-semibold text-ink-900">No posts yet</p>
              <p className="mt-1 text-sm text-ink-500">{u.fullName?.split(" ")[0]} hasn't shared anything public.</p>
            </div>
          ) : (
            posts.map((p) => <PostCard key={p._id || p.id} post={p} demo={demo} onRemoved={(pid) => setPosts((x) => x.filter((y) => (y._id || y.id) !== pid))} />)
          )}
        </div>
      )}

      <ShareSheet
        open={share}
        onClose={() => setShare(false)}
        kind="profile"
        demo={demo}
        shareUrl={u.uniqueUsername ? `${typeof window !== "undefined" ? window.location.origin : "https://doklynk.app"}/u/${u.uniqueUsername}` : undefined}
      />
    </div>
  );
}

/* 3-dot overflow: Block / Unfollow (Disconnect needs a backend endpoint — deferred). */
function ProfileMenu({ user, demo, onChanged }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef(null);
  const id = user.id || user._id;

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const block = async () => {
    setOpen(false);
    if (demo || !window.confirm(`Block ${user.fullName}? They won't be able to find, follow or message you.`)) return;
    setBusy(true);
    try { await dok.profile.block(id); toast?.success?.("User blocked"); onChanged?.({ isFollowing: false, isBlocked: true }); }
    catch { toast?.error("Couldn't block — try again"); }
    finally { setBusy(false); }
  };

  const unfollow = async () => {
    setOpen(false);
    setBusy(true);
    try { await dok.follows.unfollow(id); toast?.success?.("Unfollowed"); onChanged?.({ isFollowing: false, connectionStatus: "none" }); }
    catch { toast?.error("Couldn't unfollow — try again"); }
    finally { setBusy(false); }
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} disabled={busy} aria-label="More options" aria-haspopup="menu" aria-expanded={open} className="press grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25">
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div role="menu" className="anim-pop absolute right-0 top-11 z-30 w-48 overflow-hidden rounded-2xl border border-ink-900/[.06] bg-white p-1.5 shadow-card">
          {user.isFollowing && (
            <button role="menuitem" onClick={unfollow} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-sm font-medium text-ink-700 hover:bg-ink-900/[.04]">
              <UserMinus size={17} className="text-ink-400" /> Unfollow
            </button>
          )}
          <button role="menuitem" onClick={block} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-sm font-medium text-danger-700 hover:bg-danger-50">
            <ShieldOff size={17} /> Block user
          </button>
        </div>
      )}
    </div>
  );
}

/* Two independent profile actions (PRD State A/B): a Follow button and a Connect button,
   both visible on the profile (unlike the single morphing button used on feed/reel cards). */
function ProfileActions({ user, demo }) {
  const nav = useNavigate();
  const toast = useToast();
  const id = user.id || user._id;

  const initFollow = user.isFollowing ? "following" : user.isRequested ? "requested" : "follow";
  const cs = user.connectionStatus;
  const initConnect = cs === "connected" ? "message" : cs === "pending_outgoing" ? "connecting" : cs === "pending_incoming" ? "accept" : "connect";

  const [fState, setF] = useState(initFollow);
  const [cState, setC] = useState(initConnect);
  const [busyMsg, setBusyMsg] = useState(false);

  // re-sync if the viewed user changes (block/unfollow from the 3-dot menu, navigation, etc.)
  useEffect(() => { setF(initFollow); setC(initConnect); /* eslint-disable-next-line */ }, [id, user.isFollowing, user.isRequested, cs]);

  if (!id) return null;

  /* follow side */
  const doFollow = async () => {
    setF("following");
    if (demo) return;
    try { const d = await dok.follows.follow(id); if (d?.status === "requested") setF("requested"); }
    catch { setF("follow"); toast?.error("Couldn't follow — try again"); }
  };
  const doUnfollow = async () => {
    setF("follow");
    if (demo) return;
    try { await dok.follows.unfollow(id); } catch { setF("following"); toast?.error("Couldn't unfollow"); }
  };
  const doWithdraw = async () => {
    setF("follow");
    if (demo) return;
    try { await dok.follows.withdraw(id); } catch { setF("requested"); toast?.error("Couldn't withdraw the request"); }
  };

  /* connect side */
  const doConnect = async () => {
    setC("connecting");
    if (demo) return;
    try { await dok.network.request(id); } catch (e) { setC("connect"); toast?.error(e?.response?.data?.message || "Couldn't send the connection request"); }
  };
  const doAccept = async () => {
    setC("message");
    if (demo) return;
    try { await dok.network.accept(user.connectionRequestId || id); } catch { setC("accept"); toast?.error("Couldn't accept the request"); }
  };
  const doMessage = async () => {
    if (demo) { nav("/app/messages"); return; }
    setBusyMsg(true);
    try {
      const d = await dok.chat.start({ recipientId: id });
      const cid = d?.conversation?.id || d?.conversation?._id || d?.conversationId;
      nav(cid ? `/app/messages?c=${cid}` : "/app/messages");
    } catch { toast?.error("Couldn't open the conversation"); }
    finally { setBusyMsg(false); }
  };

  const FOLLOW = {
    follow: { label: "Follow", icon: UserPlus, onClick: doFollow, cls: "btn-primary" },
    following: { label: "Following", icon: UserCheck, onClick: doUnfollow, cls: "btn-outline" },
    requested: { label: "Requested", icon: Clock, onClick: doWithdraw, cls: "btn-outline" },
  }[fState];

  const CONNECT = {
    connect: { label: "Connect", icon: Link2, onClick: doConnect, cls: "btn-outline" },
    connecting: { label: "Connecting", icon: Loader2, onClick: undefined, cls: "btn-outline", spin: true },
    accept: { label: "Accept", icon: UserCheck, onClick: doAccept, cls: "btn-primary" },
    message: { label: "Message", icon: MessageSquare, onClick: doMessage, cls: "btn-ghost", busy: busyMsg },
  }[cState];

  const FIcon = FOLLOW.icon;
  const CIcon = CONNECT.icon;

  return (
    <div className="mt-4 flex gap-2">
      <button onClick={FOLLOW.onClick} className={cn(FOLLOW.cls, "flex-1 py-2.5 text-sm")}>
        <FIcon size={16} /> {FOLLOW.label}
      </button>
      <button onClick={CONNECT.onClick} disabled={!CONNECT.onClick || CONNECT.busy} className={cn(CONNECT.cls, "flex-1 py-2.5 text-sm")}>
        {CONNECT.busy || CONNECT.spin ? <Loader2 size={16} className="animate-spin" /> : <CIcon size={16} />} {CONNECT.label}
      </button>
    </div>
  );
}

/* Role-aware detail sections (doctor / student / general) from the documented roleDetails shape. */
function Details({ user, rd }) {
  const role = user.role;
  const education = rd.education || [];
  const workplace = rd.workplace || rd.hospitals || [];
  const academics = rd.academics || [];
  const experiences = rd.experiences || [];
  const certificates = rd.certificates || [];
  const specialties = rd.specialties || rd.specializations || [];
  const interests = rd.interests || user.interests || [];

  const hasContact = user.bio || user.city || user.languages?.length || user.workEmail || user.workPhone || user.age != null;
  const hasAny = hasContact || education.length || workplace.length || academics.length || experiences.length || certificates.length || specialties.length || interests.length;
  if (!hasAny) return null;

  return (
    <div className="mt-5 space-y-5">
      {hasContact && (
        <Section title="About">
          {user.bio && <p className="text-sm leading-relaxed text-ink-700">{user.bio}</p>}
          <div className="flex flex-col gap-2">
            {user.city && <Line icon={MapPin} text={user.city} />}
            {user.age != null && <Line icon={CalendarDays} text={`${user.age} years`} />}
            {user.languages?.length > 0 && <Line icon={LangIcon} text={user.languages.join(", ")} />}
            {user.workEmail && <Line icon={Mail} text={user.workEmail} />}
            {user.workPhone && <Line icon={Phone} text={user.workPhone} />}
          </div>
        </Section>
      )}

      {specialties.length > 0 && (
        <Section title="Specialties">
          <div className="flex flex-wrap gap-2">
            {specialties.map((s) => <span key={s} className="chip bg-brand-50 text-brand-700">{s}</span>)}
          </div>
        </Section>
      )}

      {workplace.length > 0 && (
        <Section title="Experience">
          {workplace.map((h, i) => (
            <Row key={`w${i}`} icon={Briefcase} tint="bg-brand-50 text-brand-600"
              title={[h.role || h.designation, h.organizationName || h.name].filter(Boolean).join(" · ") || h.organizationName || h.name}
              text={[h.department || h.address, `${yr(h.startDate)} — ${h.endDate ? yr(h.endDate) : "Present"}`].filter(Boolean).join(" · ")} />
          ))}
        </Section>
      )}

      {education.length > 0 && (
        <Section title="Education">
          {education.map((e, i) => (
            <Row key={`e${i}`} icon={GraduationCap} tint="bg-amber-50 text-amber-600"
              title={[e.organizationName, e.departmentName].filter(Boolean).join(" · ") || e.organizationName}
              text={`${yr(e.startDate)} — ${e.endDate ? yr(e.endDate) : "Present"}`} />
          ))}
        </Section>
      )}

      {academics.length > 0 && (
        <Section title="Academics">
          {academics.map((a, i) => (
            <Row key={`a${i}`} icon={GraduationCap} tint="bg-amber-50 text-amber-600"
              title={[a.program, a.collegeName].filter(Boolean).join(" · ") || a.collegeName}
              text={[a.city, a.currentYear, a.expectedGraduationDate && `Grad ${yr(a.expectedGraduationDate)}`].filter(Boolean).join(" · ")} />
          ))}
        </Section>
      )}

      {experiences.length > 0 && (
        <Section title="Experience & interests">
          {experiences.map((e, i) => (
            <Row key={`x${i}`} icon={Briefcase} tint="bg-brand-50 text-brand-600"
              title={[e.program, e.institution].filter(Boolean).join(" · ") || e.institution}
              text={[e.city, `${yr(e.startDate)} — ${e.endDate ? yr(e.endDate) : "Present"}`, e.interests?.join(", ")].filter(Boolean).join(" · ")} />
          ))}
        </Section>
      )}

      {certificates.length > 0 && (
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
    <p className="flex items-center gap-2.5 text-sm text-ink-700"><Icon size={15} className="shrink-0 text-ink-400" /> {text}</p>
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

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="card overflow-hidden">
        <Skeleton className="h-40 w-full rounded-none" />
        <div className="space-y-3 px-5 pb-5">
          <div className="-mt-14"><Skeleton className="h-[104px] w-[104px] rounded-full ring-4 ring-white" /></div>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}
