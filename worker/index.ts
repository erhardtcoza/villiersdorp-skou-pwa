/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
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

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

async function proxyBackend(request: Request, upstreamPath?: string): Promise<Response> {
  const url = new URL(request.url);
  const backendOrigin = "https://tickets.villiersdorpskou.co.za";
  const upstream = new URL(upstreamPath || `${url.pathname}${url.search}`, backendOrigin);
  const headers = new Headers(request.headers);
  headers.set("host", upstream.host);
  const response = await fetch(new Request(upstream, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
    redirect: "manual",
  }));
  const proxiedHeaders = new Headers(response.headers);
  proxiedHeaders.set("cache-control", "no-store");
  const location = proxiedHeaders.get("location");
  if (location) {
    const rewritten = location.startsWith(backendOrigin) ? location.slice(backendOrigin.length) || "/" : location;
    proxiedHeaders.set("location", rewritten);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: proxiedHeaders });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

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
        upstream: "tickets.villiersdorpskou.co.za",
        checks: {
          app_worker: { status: "ok", detail: "PWA worker is responding." },
        },
      };

      try {
        const backendHealth = await fetch("https://tickets.villiersdorpskou.co.za/api/app/health", {
          headers: { accept: "application/json" },
        });
        const backendBody = await backendHealth.json().catch(() => null) as {
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
        const publicHealth = await fetch("https://tickets.villiersdorpskou.co.za/api/public/health", {
          headers: { accept: "application/json" },
        });
        const publicBody = await publicHealth.json().catch(() => null) as { ok?: boolean; ticket_types?: number; event?: { sales_closed?: number | boolean } } | null;
        const ticketTypes = Number(publicBody?.ticket_types || 0);
        payload.event.ticket_types = ticketTypes;
        payload.event.sales_closed = publicBody?.event?.sales_closed === true || Number(publicBody?.event?.sales_closed || 0) === 1;
        payload.checks.ticket_catalogue = {
          status: publicHealth.ok && ticketTypes > 0 ? "ok" : "warn",
          detail: ticketTypes > 0 ? `${ticketTypes} ticket types available.` : "No public ticket types returned.",
        };
        payload.ok = backendOk && ticketTypes > 0;
      } catch (error) {
        payload.checks.backend_api = {
          status: "fail",
          detail: error instanceof Error ? error.message : "App backend API could not be reached.",
        };
        payload.checks.ticket_catalogue = {
          status: "fail",
          detail: "Ticket catalogue could not be checked.",
        };
      }

      return new Response(JSON.stringify(payload), {
        status: payload.ok ? 200 : 503,
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      });
    }

    const isBackendPage = url.pathname === "/app" || url.pathname === "/scan" || url.pathname.startsWith("/pos/") || url.pathname.startsWith("/scan/");
    const isBackendMedia = url.pathname.startsWith("/media/");
    const isBackendApi = url.pathname.startsWith("/api/");
    if (isBackendPage || isBackendMedia || isBackendApi) {
      return proxyBackend(request);
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

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
