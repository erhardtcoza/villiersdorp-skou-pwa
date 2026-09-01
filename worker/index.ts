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
        const backendHealth = await fetch("https://tickets.villiersdorpskou.co.za/api/public/health", {
          headers: { accept: "application/json" },
        });
        const backendBody = await backendHealth.json().catch(() => null) as {
          ok?: boolean;
          event?: { id?: number; name?: string; sales_closed?: number | boolean };
          ticket_types?: number;
          checks?: Record<string, { status?: "ok" | "warn" | "fail"; detail?: string }>;
        } | null;
        const ticketTypes = Number(backendBody?.ticket_types || 0);
        const backendOk = backendHealth.ok && backendBody?.ok === true;

        payload.event = {
          id: backendBody?.event?.id,
          name: backendBody?.event?.name,
          sales_closed: backendBody?.event?.sales_closed === true || Number(backendBody?.event?.sales_closed || 0) === 1,
          ticket_types: ticketTypes,
        };
        payload.checks.backend_api = {
          status: backendOk ? "ok" : "fail",
          detail: backendOk ? "Backend health API is reachable." : `Backend health API returned HTTP ${backendHealth.status}.`,
        };
        payload.checks.ticket_catalogue = {
          status: ticketTypes > 0 ? "ok" : "warn",
          detail: ticketTypes > 0 ? `${ticketTypes} ticket types available.` : "No public ticket types returned.",
        };
        for (const [key, check] of Object.entries(backendBody?.checks || {})) {
          if (!check || key === "worker" || key === "database" || key === "current_event" || key === "ticket_catalogue") continue;
          payload.checks[key] = {
            status: check.status || "warn",
            detail: check.detail || "Backend check returned no detail.",
          };
        }
        payload.ok = backendOk && ticketTypes > 0;
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
