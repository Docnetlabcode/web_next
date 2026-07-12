import { describe, it, expect, afterEach, vi } from "vitest";

// backend.ts reads NEXT_PUBLIC_* at import time, so each scenario resets the
// module registry, seeds process.env, stubs window/sessionStorage + fetch, and
// re-imports the module fresh.

const ENV_KEYS = [
  "NEXT_PUBLIC_API_BASE_RENDER",
  "NEXT_PUBLIC_SOCKET_URL_RENDER",
  "NEXT_PUBLIC_CHAT_SOCKET_URL_RENDER",
  "NEXT_PUBLIC_API_BASE_AWS",
  "NEXT_PUBLIC_SOCKET_URL_AWS",
  "NEXT_PUBLIC_CHAT_SOCKET_URL_AWS",
  "NEXT_PUBLIC_API_BASE",
  "NEXT_PUBLIC_SOCKET_URL",
  "NEXT_PUBLIC_CHAT_SOCKET_URL",
];

const RENDER_API = "https://api.onrender.test";
const RENDER_CHAT = "https://chat.onrender.test";
const AWS_API = "http://aws.test:5000";
const AWS_CHAT = "http://aws.test:5001";

const DUAL_ENV = {
  NEXT_PUBLIC_API_BASE_RENDER: RENDER_API,
  NEXT_PUBLIC_SOCKET_URL_RENDER: RENDER_CHAT,
  NEXT_PUBLIC_API_BASE_AWS: AWS_API,
  NEXT_PUBLIC_SOCKET_URL_AWS: AWS_CHAT,
};

// fetch stub: /health answers { ok: true } when up(url), otherwise rejects
// like a dead host does.
const fetchWhere = (up: (url: string) => boolean) =>
  vi.fn(async (url: string) => {
    if (up(url)) return { ok: true };
    throw new TypeError("fetch failed");
  });

async function load(env: Record<string, string>, fetchImpl: unknown) {
  vi.resetModules();
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, env);
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    sessionStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  });
  vi.stubGlobal("fetch", fetchImpl);
  return import("@/lib/backend");
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ENV_KEYS) delete process.env[k];
});

describe("chooseDeployment (pure selection)", () => {
  it("picks the first live candidate, in candidate order", async () => {
    const { chooseDeployment } = await load({}, fetchWhere(() => true));
    expect(chooseDeployment(["aws", "render"], [true, true])).toBe("aws");
    expect(chooseDeployment(["aws", "render"], [false, true])).toBe("render");
    expect(chooseDeployment(["aws", "render"], [true, false])).toBe("aws");
    expect(chooseDeployment(["aws", "render"], [false, false])).toBeNull();
    expect(chooseDeployment([], [])).toBeNull();
  });
});

describe("resolveBackend — dual deployment", () => {
  it("prefers AWS when both /health probes answer", async () => {
    const fetch = fetchWhere(() => true);
    const b = await load(DUAL_ENV, fetch);
    await b.resolveBackend();
    expect(b.apiBase()).toBe(AWS_API);
    expect(b.socketUrl()).toBe(AWS_CHAT);
    expect(b.chatSocketUrl()).toBe(AWS_CHAT); // defaults to the socket URL
    expect(fetch).toHaveBeenCalledWith(`${AWS_API}/health`, expect.anything());
    expect(fetch).toHaveBeenCalledWith(`${RENDER_API}/health`, expect.anything());
  });

  it("falls back to Render when AWS is dark", async () => {
    const b = await load(DUAL_ENV, fetchWhere((url) => url.startsWith(RENDER_API)));
    await b.resolveBackend();
    expect(b.apiBase()).toBe(RENDER_API);
    expect(b.socketUrl()).toBe(RENDER_CHAT);
  });

  it("treats a non-2xx /health as dark", async () => {
    const fetch = vi.fn(async (url: string) =>
      url.startsWith(AWS_API) ? { ok: false } : { ok: true }
    );
    const b = await load(DUAL_ENV, fetch);
    await b.resolveBackend();
    expect(b.apiBase()).toBe(RENDER_API);
  });

  it("probes only once — later calls reuse the settled promise", async () => {
    const fetch = fetchWhere(() => true);
    const b = await load(DUAL_ENV, fetch);
    await b.resolveBackend();
    await b.resolveBackend();
    expect(fetch).toHaveBeenCalledTimes(2); // one probe per deployment, total
  });

  it("keeps the first candidate (AWS) when both are dark", async () => {
    const b = await load(DUAL_ENV, fetchWhere(() => false));
    await b.resolveBackend();
    expect(b.apiBase()).toBe(AWS_API);
  });
});

describe("failover — mid-session switch", () => {
  it("flips AWS -> Render when AWS dies, and notifies listeners", async () => {
    let awsUp = true;
    const b = await load(
      DUAL_ENV,
      fetchWhere((url) => (url.startsWith(AWS_API) ? awsUp : true))
    );
    await b.resolveBackend();
    expect(b.apiBase()).toBe(AWS_API);

    const switches: string[] = [];
    b.onBackendChange((d) => switches.push(d.name));

    awsUp = false;
    await expect(b.failover()).resolves.toBe(true);
    expect(b.apiBase()).toBe(RENDER_API);
    expect(switches).toEqual(["render"]);
  });

  it("returns false when nothing changed (active deployment still the live one)", async () => {
    const b = await load(DUAL_ENV, fetchWhere(() => true));
    await b.resolveBackend();
    await expect(b.failover()).resolves.toBe(false);
    expect(b.apiBase()).toBe(AWS_API);
  });

  it("returns to AWS once it is live again", async () => {
    let awsUp = false;
    const b = await load(
      DUAL_ENV,
      fetchWhere((url) => (url.startsWith(AWS_API) ? awsUp : true))
    );
    await b.resolveBackend();
    expect(b.apiBase()).toBe(RENDER_API);

    awsUp = true;
    await expect(b.failover()).resolves.toBe(true);
    expect(b.apiBase()).toBe(AWS_API);
  });
});

describe("proxied deployment (NEXT_PUBLIC_API_BASE_AWS=proxy)", () => {
  // AWS is plain http on a bare IP, so it is reached same-origin through the
  // next.config.mjs rewrites; its probe therefore hits the RELATIVE /health.
  const PROXY_ENV = {
    NEXT_PUBLIC_API_BASE_AWS: "proxy",
    NEXT_PUBLIC_API_BASE_RENDER: RENDER_API,
    NEXT_PUBLIC_SOCKET_URL_RENDER: RENDER_CHAT,
  };

  it("maps 'proxy' to same-origin: empty api base, no socket URL", async () => {
    const fetch = fetchWhere(() => true);
    const b = await load(PROXY_ENV, fetch);
    await b.resolveBackend();
    expect(b.apiBase()).toBe(""); // relative /api -> rewritten server-side
    expect(b.socketUrl()).toBeUndefined(); // socket.io connects same-origin
    expect(fetch).toHaveBeenCalledWith("/health", expect.anything());
  });

  it("falls back to Render when the proxied /health fails (e.g. Next returns 502)", async () => {
    const fetch = vi.fn(async (url: string) =>
      url === "/health" ? { ok: false } : { ok: true }
    );
    const b = await load(PROXY_ENV, fetch);
    await b.resolveBackend();
    expect(b.apiBase()).toBe(RENDER_API);
    expect(b.socketUrl()).toBe(RENDER_CHAT);
  });

  it("fails over proxied-AWS -> Render mid-session and back", async () => {
    let awsUp = true;
    const b = await load(
      PROXY_ENV,
      fetchWhere((url) => (url === "/health" ? awsUp : true))
    );
    await b.resolveBackend();
    expect(b.apiBase()).toBe("");

    awsUp = false;
    await expect(b.failover()).resolves.toBe(true);
    expect(b.apiBase()).toBe(RENDER_API);

    awsUp = true;
    await expect(b.failover()).resolves.toBe(true);
    expect(b.apiBase()).toBe("");
  });
});

describe("legacy single-deployment config", () => {
  it("uses the plain vars without probing", async () => {
    const fetch = fetchWhere(() => true);
    const b = await load(
      {
        NEXT_PUBLIC_API_BASE: "http://single.test:5000",
        NEXT_PUBLIC_SOCKET_URL: "http://single.test:5001",
      },
      fetch
    );
    await b.resolveBackend();
    expect(b.apiBase()).toBe("http://single.test:5000");
    expect(b.socketUrl()).toBe("http://single.test:5001");
    expect(b.chatSocketUrl()).toBe("http://single.test:5001"); // falls back to socket URL
    expect(fetch).not.toHaveBeenCalled();
    await expect(b.failover()).resolves.toBe(false);
  });

  it("defaults to same-origin (dev proxy) when nothing is set", async () => {
    const b = await load({}, fetchWhere(() => true));
    await b.resolveBackend();
    expect(b.apiBase()).toBe("");
    expect(b.socketUrl()).toBeUndefined();
  });
});
