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
