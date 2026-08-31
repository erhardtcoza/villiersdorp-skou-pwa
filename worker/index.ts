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
        const upstreamHealth = await fetch("https://tickets.villiersdorpskou.co.za/api/public/events/villiersdorp-skou-2026", {
          headers: { accept: "application/json" },
        });
        const upstreamBody = await upstreamHealth.json().catch(() => null) as {
          ok?: boolean;
          event?: { id?: number; name?: string; sales_closed?: number | boolean };
          ticket_types?: unknown[];
        } | null;
        const ticketTypes = Array.isArray(upstreamBody?.ticket_types) ? upstreamBody.ticket_types.length : 0;
        const upstreamOk = upstreamHealth.ok && upstreamBody?.ok === true;

        payload.event = {
          id: upstreamBody?.event?.id,
          name: upstreamBody?.event?.name,
          sales_closed: upstreamBody?.event?.sales_closed === true || Number(upstreamBody?.event?.sales_closed || 0) === 1,
          ticket_types: ticketTypes,
        };
        payload.checks.backend_api = {
          status: upstreamOk ? "ok" : "fail",
          detail: upstreamOk ? "Public ticket API is reachable." : `Public ticket API returned HTTP ${upstreamHealth.status}.`,
        };
        payload.checks.ticket_catalogue = {
          status: ticketTypes > 0 ? "ok" : "warn",
          detail: ticketTypes > 0 ? `${ticketTypes} ticket types available.` : "No public ticket types returned.",
        };
        payload.ok = upstreamOk && ticketTypes > 0;
      } catch (error) {
        payload.checks.backend_api = {
          status: "fail",
          detail: error instanceof Error ? error.message : "Public ticket API could not be reached.",
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

    const isAppApi = url.pathname.startsWith("/api/app/");
    const isTicketCatalogue = url.pathname.startsWith("/api/public/events/") && request.method === "GET";
    const isTicketOrder = url.pathname === "/api/public/orders/create" && request.method === "POST";
    const isTicketPayment = url.pathname === "/api/payments/yoco/intent" && request.method === "POST";
    if (isAppApi || isTicketCatalogue || isTicketOrder || isTicketPayment) {
      const upstream = new URL(url.pathname + url.search, "https://tickets.villiersdorpskou.co.za");
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
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers: proxiedHeaders });
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
