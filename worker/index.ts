/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import type { D1Database, Fetcher } from "@cloudflare/workers-types";
import { backendOrigin as resolveBackendOrigin, usesBoundDevelopmentBackend } from "../lib/backend-origin";
import { fetchHealthJson } from "./health-fetch";
import { walletCardPage } from "./wallet-card";

interface Env {
  DEV_BACKEND?: Fetcher;
  POS_TEST_BACKEND?: Fetcher;
  WALLET_BACKEND_ORIGIN?: string;
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

function isPosTestPath(pathname: string) {
  return pathname === "/pos-test" || pathname.startsWith("/pos-test/");
}

function posTestRequestHeaders(headers: Headers) {
  const rewritten = new Headers(headers);
  const cookie = rewritten.get("cookie");
  if (cookie) {
    const testCookie = "vs_pos_test_sess=";
    const ordinaryCookie = "vs_app_sess=";
    const upstreamCookie = cookie
      .split(/;\s*/)
      .filter((part) => !part.startsWith(ordinaryCookie))
      .map((part) => part.startsWith(testCookie) ? `${ordinaryCookie}${part.slice(testCookie.length)}` : part)
      .join("; ");
    if (upstreamCookie) rewritten.set("cookie", upstreamCookie);
    else rewritten.delete("cookie");
  }
  return rewritten;
}

function posTestResponseHeaders(headers: Headers) {
  const rewritten = new Headers(headers);
  const setCookie = rewritten.get("set-cookie");
  if (setCookie) {
    rewritten.set("set-cookie", setCookie
      .replace(/(^|,\s*)vs_app_sess=/g, "$1vs_pos_test_sess=")
      .replace(/;\s*Path=\//gi, "; Path=/pos-test"));
  }
  rewritten.set("cache-control", "no-store");
  rewritten.set("x-robots-tag", "noindex, nofollow, noarchive");
  return rewritten;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

async function proxyBackend(request: Request, upstreamPath?: string, env?: Env): Promise<Response> {
  const url = new URL(request.url);
  const backendOrigin = resolveBackendOrigin(request.url);
  const usesBoundBackend = usesBoundDevelopmentBackend(request.url);
  const upstream = new URL(upstreamPath || `${url.pathname}${url.search}`, backendOrigin);
  const headers = new Headers(request.headers);
  headers.set("host", upstream.host);
  const upstreamRequest = new Request(upstream, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });
  const response = await (usesBoundBackend && env?.DEV_BACKEND ? env.DEV_BACKEND.fetch(upstreamRequest) : fetch(upstreamRequest));
  const proxiedHeaders = new Headers(response.headers);
  proxiedHeaders.set("cache-control", "no-store");
  // API responses can contain operational or account-specific state, including
  // scanner denials. Preserve the backend's status/body but never expose any
  // proxied API endpoint to search indexing.
  if (url.pathname.startsWith("/api/")) proxiedHeaders.set("x-robots-tag", "noindex, nofollow, noarchive, nosnippet");
  const location = proxiedHeaders.get("location");
  if (location) {
    const rewritten = location.startsWith(backendOrigin) ? location.slice(backendOrigin.length) || "/" : location;
    proxiedHeaders.set("location", rewritten);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: proxiedHeaders });
}

async function proxyPosTestBackend(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const upstreamPath = `${url.pathname.slice("/pos-test".length)}${url.search}`;
  const upstream = new URL(upstreamPath, "https://skou-events-staging.vinetis.workers.dev");
  const headers = posTestRequestHeaders(request.headers);
  headers.set("host", upstream.host);
  const upstreamRequest = new Request(upstream, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  });
  if (!env.POS_TEST_BACKEND) return new Response(JSON.stringify({ ok: false, error: "POS-toetsmodus is nie beskikbaar nie." }), { status: 503, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  const response = await env.POS_TEST_BACKEND.fetch(upstreamRequest);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: posTestResponseHeaders(response.headers) });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/n/") || url.hostname === "wallet.villiersdorpskou.co.za") return walletCardPage(request, env.WALLET_BACKEND_ORIGIN);
    const backendOrigin = resolveBackendOrigin(request.url);
    const isDevelopment = backendOrigin !== "https://tickets.villiersdorpskou.co.za";
    const usesBoundBackend = usesBoundDevelopmentBackend(request.url);
    if (isDevelopment && url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", { headers: { "content-type": "text/plain; charset=utf-8", "x-robots-tag": "noindex, nofollow" } });
    }

    if (url.pathname.startsWith("/pos-test/api/")) return proxyPosTestBackend(request, env);

    if (url.pathname === "/api/app/health") {
      const checkedAt = new Date().toISOString();
      const payload: {
        ok: boolean;
        service: string;
        checked_at: string;
        upstream: string;
        checks: Record<string, { status: "ok" | "warn" | "fail"; detail: string }>;
        event?: { id?: number; name?: string; sales_closed: boolean; ticket_types: number };
      } = {
        ok: false,
        service: "villiersdorp-skou-app",
        checked_at: checkedAt,
        upstream: new URL(backendOrigin).hostname,
        checks: {
          app_worker: { status: "ok", detail: "PWA worker is responding." },
        },
      };

      try {
        const transport = (probe: Request) => usesBoundBackend && env.DEV_BACKEND ? env.DEV_BACKEND.fetch(probe) : fetch(probe);
        const [backendHealth, publicHealth] = await Promise.all([
          fetchHealthJson(`${backendOrigin}/api/app/health`, transport),
          fetchHealthJson(`${backendOrigin}/api/public/health`, transport),
        ]);
        const backendBody = backendHealth.body as {
          ok?: boolean;
          event?: { id?: number; name?: string; sales_closed?: number | boolean };
          checks?: Record<string, { status?: "ok" | "warn" | "fail"; detail?: string }>;
        } | null;
        const backendOk = backendHealth.ok && backendBody?.ok === true;

        payload.event = {
          id: backendBody?.event?.id,
          name: backendBody?.event?.name,
          sales_closed: backendBody?.event?.sales_closed === true || Number(backendBody?.event?.sales_closed || 0) === 1,
          ticket_types: 0,
        };
        payload.checks.backend_api = {
          status: backendOk ? "ok" : "fail",
          detail: backendOk ? "App backend health API is reachable." : `App backend health API returned HTTP ${backendHealth.status}.`,
        };
        for (const [key, check] of Object.entries(backendBody?.checks || {})) {
          if (!check || key === "worker" || key === "database" || key === "current_event") continue;
          payload.checks[key] = {
            status: check.status || "warn",
            detail: check.detail || "Backend check returned no detail.",
          };
        }
        const publicBody = publicHealth.body as { ok?: boolean; ticket_types?: number; event?: { sales_closed?: number | boolean } } | null;
        const ticketTypes = Number(publicBody?.ticket_types || 0);
        payload.event.ticket_types = ticketTypes;
        payload.event.sales_closed = publicBody?.event?.sales_closed === true || Number(publicBody?.event?.sales_closed || 0) === 1;
        payload.checks.ticket_catalogue = {
          status: publicHealth.ok && ticketTypes > 0 ? "ok" : "warn",
          detail: ticketTypes > 0 ? `${ticketTypes} ticket types available.` : "No public ticket types returned.",
        };
        payload.ok = backendOk && publicHealth.ok && publicBody?.ok === true && Number.isSafeInteger(ticketTypes) && ticketTypes > 0;
      } catch (error) {
        payload.checks.backend_api = {
          status: "fail",
          detail: "App backend health checks failed or timed out. Please try again shortly.",
        };
        payload.checks.ticket_catalogue = {
          status: "fail",
          detail: "Ticket catalogue could not be checked.",
        };
      }

      return new Response(JSON.stringify(payload), {
        status: payload.ok ? 200 : 503,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow, noarchive" },
      });
    }

    if (url.pathname === "/app" || url.pathname === "/scan" || url.pathname.startsWith("/scan/")) {
      const posArea = url.searchParams.get("pos_area");
      const moduleKey = url.pathname === "/scan" || url.pathname.startsWith("/scan/")
        ? "gates"
        : posArea === "kroeg"
          ? "bar-pos"
          : posArea === "kombuis"
            ? "kitchen-pos"
            : "pos";
      return Response.redirect(new URL(`/?module=${encodeURIComponent(moduleKey)}`, url.origin).toString(), 302);
    }

    const isBackendPage = url.pathname.startsWith("/pos/");
    const isBackendMedia = url.pathname.startsWith("/media/");
    const isBackendApi = url.pathname.startsWith("/api/");
    if (isBackendPage || isBackendMedia || isBackendApi) {
      return proxyBackend(request, undefined, env);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const rendered = await handler.fetch(request, env, ctx);
    if (isPosTestPath(url.pathname)) {
      const testHeaders = new Headers(rendered.headers);
      testHeaders.set("cache-control", "no-store");
      testHeaders.set("x-robots-tag", "noindex, nofollow, noarchive");
      return new Response(rendered.body, { status: rendered.status, statusText: rendered.statusText, headers: testHeaders });
    }
    if (!isDevelopment) return rendered;
    const previewHeaders = new Headers(rendered.headers);
    previewHeaders.set("x-robots-tag", "noindex, nofollow, noarchive");
    return new Response(rendered.body, { status: rendered.status, statusText: rendered.statusText, headers: previewHeaders });
  },
};

export default worker;
