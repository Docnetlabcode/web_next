import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// SLUG is captured at module load, so stub the env and import fresh per test.
async function loadMiddleware(slug?: string) {
  vi.resetModules();
  if (slug === undefined) vi.stubEnv("ADMIN_PANEL_SLUG", "");
  else vi.stubEnv("ADMIN_PANEL_SLUG", slug);
  const mod = await import("../middleware");
  return mod.middleware;
}

const req = (path: string) => new NextRequest(`http://localhost:5173${path}`);

beforeEach(() => vi.unstubAllEnvs());

describe("admin panel slug middleware", () => {
  it("rewrites /<ADMIN_PANEL_SLUG> to the internal /admin route", async () => {
    const middleware = await loadMiddleware("pawanguptaadmin");
    const res = middleware(req("/pawanguptaadmin"));
    const rewrite = res?.headers.get("x-middleware-rewrite");
    expect(rewrite).toContain("/admin");
  });

  it("also accepts a trailing slash on the slug", async () => {
    const middleware = await loadMiddleware("pawanguptaadmin");
    const res = middleware(req("/pawanguptaadmin/"));
    expect(res?.headers.get("x-middleware-rewrite")).toContain("/admin");
  });

  it("404s direct requests to /admin and /admin/*", async () => {
    const middleware = await loadMiddleware("pawanguptaadmin");
    expect(middleware(req("/admin"))?.status).toBe(404);
    expect(middleware(req("/admin/users"))?.status).toBe(404);
  });

  it("does not treat other paths as the slug", async () => {
    const middleware = await loadMiddleware("pawanguptaadmin");
    const res = middleware(req("/pawanguptaadmin-nope"));
    expect(res?.headers.get("x-middleware-rewrite")).toBeNull();
    expect(res?.status).toBe(200);
  });

  it("falls back to the dev slug when the env var is unset", async () => {
    const middleware = await loadMiddleware(undefined);
    const res = middleware(req("/dl-ops-92f4c1a7"));
    expect(res?.headers.get("x-middleware-rewrite")).toContain("/admin");
  });

  it("tolerates a leading slash in the env value", async () => {
    const middleware = await loadMiddleware("/pawanguptaadmin");
    const res = middleware(req("/pawanguptaadmin"));
    expect(res?.headers.get("x-middleware-rewrite")).toContain("/admin");
  });
});
