// Dual-deployment backend resolution. The backend is deployed to BOTH AWS and
// Render; whichever is live serves the app. Before the first API call we
// probe each deployment's api-service GET /health (AWS first) and lock onto
// the first live one — so AWS serves whenever it is up, and Render takes over
// only when AWS is not available. If the active deployment later dies with a
// network error, api.ts calls failover() to flip to the other. Socket
// singletons follow the switch via onBackendChange.
//
// Env (NEXT_PUBLIC_* — inlined at BUILD time, set them before `next build`):
//   NEXT_PUBLIC_API_BASE_RENDER   / NEXT_PUBLIC_API_BASE_AWS      api-service origin
//   NEXT_PUBLIC_SOCKET_URL_RENDER / NEXT_PUBLIC_SOCKET_URL_AWS    chat-service origin
//   NEXT_PUBLIC_CHAT_SOCKET_URL_RENDER / _AWS                     optional; defaults to SOCKET_URL
// When neither *_RENDER nor *_AWS is set, the legacy single-URL vars apply
// unchanged (NEXT_PUBLIC_API_BASE / NEXT_PUBLIC_SOCKET_URL / NEXT_PUBLIC_CHAT_SOCKET_URL).

export type Deployment = {
  name: "render" | "aws" | "default";
  apiBase: string; // "" => same-origin (dev-proxy rewrites in next.config.mjs)
  socketUrl?: string;
  chatSocketUrl?: string;
};

const candidates: Deployment[] = [];
// AWS first: it is the preferred deployment whenever its /health answers;
// Render is the fallback when AWS is not available.
if (process.env.NEXT_PUBLIC_API_BASE_AWS) {
  candidates.push({
    name: "aws",
    apiBase: process.env.NEXT_PUBLIC_API_BASE_AWS,
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL_AWS || undefined,
    chatSocketUrl:
      process.env.NEXT_PUBLIC_CHAT_SOCKET_URL_AWS ||
      process.env.NEXT_PUBLIC_SOCKET_URL_AWS ||
      undefined,
  });
}
if (process.env.NEXT_PUBLIC_API_BASE_RENDER) {
  candidates.push({
    name: "render",
    apiBase: process.env.NEXT_PUBLIC_API_BASE_RENDER,
    socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL_RENDER || undefined,
    chatSocketUrl:
      process.env.NEXT_PUBLIC_CHAT_SOCKET_URL_RENDER ||
      process.env.NEXT_PUBLIC_SOCKET_URL_RENDER ||
      undefined,
  });
}

// Legacy single-deployment config — used when no Render/AWS pair is set.
const legacy: Deployment = {
  name: "default",
  apiBase: process.env.NEXT_PUBLIC_API_BASE || "",
  socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || undefined,
  chatSocketUrl:
    process.env.NEXT_PUBLIC_CHAT_SOCKET_URL ||
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    undefined,
};

let active: Deployment = candidates[0] ?? legacy;

export const getBackend = () => active;
export const apiBase = () => active.apiBase;
export const socketUrl = () => active.socketUrl;
export const chatSocketUrl = () => active.chatSocketUrl || active.socketUrl;

/** Pure selection: the first candidate whose probe answered, else null. */
export function chooseDeployment<T>(list: T[], alive: boolean[]): T | null {
  const i = alive.findIndex(Boolean);
  return i === -1 ? null : list[i];
}

// The chosen deployment is cached in sessionStorage for a short TTL so full
// page reloads don't re-probe every time, while a flip (AWS back up, Render
// down) is still picked up within a minute.
const CACHE_KEY = "dl_backend";
const CACHE_TTL_MS = 60_000;
const PROBE_TIMEOUT_MS = 5_000;

function readCache(): Deployment | null {
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { name, ts } = JSON.parse(raw);
    if (typeof ts !== "number" || Date.now() - ts > CACHE_TTL_MS) return null;
    return candidates.find((c) => c.name === name) || null;
  } catch {
    return null;
  }
}

function writeCache(d: Deployment) {
  try {
    window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ name: d.name, ts: Date.now() }));
  } catch {
    /* storage unavailable — probe again next load */
  }
}

function clearCache() {
  try {
    window.sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

type BackendListener = (d: Deployment) => void;
const listeners = new Set<BackendListener>();

/** Register for deployment switches (used by the socket singletons). */
export function onBackendChange(fn: BackendListener) {
  listeners.add(fn);
}

function setActive(d: Deployment) {
  const changed = active !== d;
  active = d;
  writeCache(d);
  if (changed) {
    for (const fn of listeners) {
      try {
        fn(d);
      } catch {
        /* a listener error must not break backend resolution */
      }
    }
  }
}

// /health is unauthenticated on api-service and passes through its CORS layer,
// so a live, correctly configured deployment always answers this probe.
async function isLive(d: Deployment): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${d.apiBase}/health`, { signal: ctrl.signal, cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function probeAll(): Promise<Deployment> {
  const alive = await Promise.all(candidates.map(isLive));
  const winner = chooseDeployment(candidates, alive);
  // Both dark: keep the current deployment; failover() re-probes on the next
  // network error, so the app recovers as soon as either side comes back.
  if (winner) setActive(winner);
  return active;
}

let resolved: Promise<Deployment> | null = null;

/**
 * Pick the live deployment. Memoized — the first API call pays for the probe,
 * every later call awaits an already-settled promise. Single-deployment and
 * server-side contexts resolve immediately without probing.
 */
export function resolveBackend(): Promise<Deployment> {
  if (candidates.length < 2 || typeof window === "undefined") return Promise.resolve(active);
  if (!resolved) {
    const cached = readCache();
    if (cached) {
      setActive(cached);
      resolved = Promise.resolve(cached);
    } else {
      resolved = probeAll();
    }
  }
  return resolved;
}

let failingOver: Promise<boolean> | null = null;

/**
 * Called on a network-level request failure: re-probe both deployments and
 * switch if the live one changed. Resolves true when the caller should retry
 * against the new deployment. Concurrent failures share one probe round.
 */
export function failover(): Promise<boolean> {
  if (candidates.length < 2 || typeof window === "undefined") return Promise.resolve(false);
  if (!failingOver) {
    failingOver = (async () => {
      const before = active;
      clearCache();
      resolved = probeAll();
      await resolved;
      return active !== before;
    })().finally(() => {
      failingOver = null;
    });
  }
  return failingOver;
}
