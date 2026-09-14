const LIVE_BACKEND = 'https://tickets.villiersdorpskou.co.za';
const DEV_BACKEND = 'https://skou-events-dev.vinetis.workers.dev';
const LIVE_APP_HOSTS = new Set(['app.villiersdorpskou.co.za', 'villiersdorp-skou-app.vinetis.workers.dev']);

// Never derive a credential-bearing upstream from a client header or query.
// Unknown preview/local hosts always use the isolated development backend.
export function backendOrigin(requestUrl: string): string {
  return LIVE_APP_HOSTS.has(new URL(requestUrl).hostname) ? LIVE_BACKEND : DEV_BACKEND;
}
