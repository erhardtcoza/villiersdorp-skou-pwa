import type { D1Database } from "@cloudflare/workers-types";

// Keep Worker bindings scoped: importing their global browser types changes
// the web app's fetch/Response declarations. Native Expo has its own tsconfig.
declare global {
  namespace Cloudflare {
    interface Env {
      DB?: D1Database;
    }
  }
}
