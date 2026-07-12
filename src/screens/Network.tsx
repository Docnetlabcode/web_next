"use client";
import { useEffect, useState } from "react";
import { Check, X, Loader2, Users } from "lucide-react";
import { useNavigate } from "@/lib/router";
import { Avatar, Verified, Skeleton } from "@/components/ui/Primitives";
import FollowButton from "@/components/ui/FollowButton";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { dok } from "@/lib/api";
import { cn, compact, roleLabel } from "@/lib/utils";

const TABS = ["Suggestions", "Requests", "Connections"];
const rid = (x) => x?._id || x?.id;

export default function Network() {
  const { demo } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [tab, setTab] = useState("Suggestions");
  const [discover, setDiscover] = useState(null);
  const [requests, setRequests] = useState(null);
  const [connections, setConnections] = useState(null);
  const [acting, setActing] = useState({}); // { [requestId]: "accept" | "reject" }

  useEffect(() => {
    // Be tolerant of the response key the backend uses (suggestions vs users, requests vs pending).
    dok.network.discover("?limit=12")
      .then((d) => setDiscover(d.suggestions || d.users || d.discover || (Array.isArray(d) ? d : [])))
      .catch(() => setDiscover([]));
    dok.network.requests()
      .then((d) => setRequests(d.requests || d.pending || (Array.isArray(d) ? d : [])))
      .catch(() => setRequests([]));
    dok.network.connections()
      .then((d) => setConnections((d.connections || d.users || (Array.isArray(d) ? d : [])).map((c) => c.recipient || c.requester || c.user || c)))
      .catch(() => setConnections([]));
  }, []);

  const resolve = async (req, action) => {
    const reqId = rid(req);
    // The accept/reject route keys off the connection id — fall back across likely field names.
    const connId = req.connectionId || req.connectionRequestId || req.requestId || reqId;
    const who = req.requester || req.sender || req.user;
    setActing((a) => ({ ...a, [reqId]: action }));
    try {
      if (!demo) await (action === "accept" ? dok.network.accept(connId) : dok.network.reject(connId));
      setRequests((rs) => (rs || []).filter((r) => rid(r) !== reqId));
      if (action === "accept") {
        if (who) setConnections((cs) => [who, ...(cs || [])]);
        toast?.success(`You're now connected with ${who?.fullName || "them"}`);
      }
    } catch {
      toast?.error("Couldn't update the request — try again");
      setActing((a) => { const n = { ...a }; delete n[reqId]; return n; });
    }
  };

  const openProfile = (u) => nav(`/app/profile/${rid(u)}`);

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Network</h1>
      <p className="text-sm text-ink-500">LinkedIn-style connections for the medical community.</p>

      <div className="mt-5 flex gap-2 border-b border-ink-900/[.06]">
        {TABS.map((t) => {
          const badge = t === "Requests" ? (requests || []).length : 0;
          return (
            <button key={t} onClick={() => setTab(t)}
              className={cn("relative px-3 py-3 text-sm font-semibold transition",
                tab === t ? "text-brand-700" : "text-ink-400 hover:text-ink-700")}>
              {t}{badge > 0 && <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] text-white">{badge}</span>}
              {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
            </button>
          );
        })}
      </div>

      <div className="mt-5 space-y-3">
        {/* ---------- Requests ---------- */}
        {tab === "Requests" && (
          requests === null ? <ListSkeleton /> :
          requests.length === 0 ? <Empty label="No pending requests" hint="Connection requests from colleagues show up here." /> :
          requests.map((req) => {
            const u = req.requester || req.sender || req.user || req;
            const busy = acting[rid(req)];
            return (
              <div key={rid(req)} className="card flex items-center gap-3 p-4">
                <button onClick={() => openProfile(u)} className="press shrink-0"><Avatar user={u} size={48} /></button>
                <button onClick={() => openProfile(u)} className="min-w-0 flex-1 text-left">
                  <p className="flex items-center gap-1 truncate font-semibold">{u.fullName} {u.isVerified && <Verified size={13} />}</p>
                  <p className="truncate text-xs text-ink-500">{u.professionalHeadline || roleLabel(u.role)}</p>
                </button>
                <button onClick={() => resolve(req, "accept")} disabled={Boolean(busy)} className="btn-primary px-3 py-2 text-xs">
                  {busy === "accept" ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Accept
                </button>
                <button onClick={() => resolve(req, "reject")} disabled={Boolean(busy)} aria-label="Ignore request" className="btn-outline px-2.5 py-2 text-xs">
                  {busy === "reject" ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                </button>
              </div>
            );
          })
        )}

        {/* ---------- Suggestions ---------- */}
        {tab === "Suggestions" && (
          discover === null ? <ListSkeleton /> :
          discover.length === 0 ? <Empty label="No suggestions right now" hint="Check back as the community grows." /> :
          <div className="grid gap-3 sm:grid-cols-2">
            {discover.map((u) => (
              <div key={rid(u)} className="card p-5 text-center">
                <button onClick={() => openProfile(u)} className="press"><Avatar user={u} size={64} className="mx-auto" /></button>
                <button onClick={() => openProfile(u)} className="mt-3 block w-full">
                  <p className="flex items-center justify-center gap-1 font-semibold">{u.fullName} {u.isVerified && <Verified size={13} />}</p>
                  <p className="truncate text-xs text-ink-500">{u.professionalHeadline || roleLabel(u.role)}</p>
                </button>
                <p className="mt-1 text-xs text-ink-400">{compact(u.followersCount || 0)} followers</p>
                <div className="mt-3 flex justify-center"><FollowButton user={u} demo={demo} /></div>
              </div>
            ))}
          </div>
        )}

        {/* ---------- Connections ---------- */}
        {tab === "Connections" && (
          connections === null ? <ListSkeleton /> :
          connections.length === 0 ? <Empty label="No connections yet" hint="Accept requests or connect with colleagues to grow your network." /> :
          connections.map((u) => (
            <div key={rid(u)} className="card flex items-center gap-3 p-4">
              <button onClick={() => openProfile(u)} className="press shrink-0"><Avatar user={u} size={48} /></button>
              <button onClick={() => openProfile(u)} className="min-w-0 flex-1 text-left">
                <p className="flex items-center gap-1 truncate font-semibold">{u.fullName} {u.isVerified && <Verified size={13} />}</p>
                <p className="truncate text-xs text-ink-500">{u.professionalHeadline || roleLabel(u.role)}</p>
              </button>
              <FollowButton user={{ ...u, isFollowing: true, connectionStatus: "connected" }} demo={demo} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Empty({ label, hint }) {
  return (
    <div className="card grid place-items-center gap-2 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600"><Users size={24} /></span>
      <p className="text-lg font-semibold text-ink-900">{label}</p>
      <p className="max-w-xs text-sm text-ink-500">{hint}</p>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card flex items-center gap-3 p-4">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
