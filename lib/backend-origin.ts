const LIVE_BACKEND = 'https://tickets.villiersdorpskou.co.za';
const DEV_BACKEND = 'https://skou-events-dev.vinetis.workers.dev';
const POS_STAGING_BACKEND = 'https://skou-events-staging.vinetis.workers.dev';
const LIVE_APP_HOSTS = new Set(['app.villiersdorpskou.co.za', 'villiersdorp-skou-app.vinetis.workers.dev']);
const POS_STAGING_APP_HOSTS = new Set(['villiersdorp-skou-app-dev.vinetis.workers.dev']);

// Never derive a credential-bearing upstream from a client header or query.
// Unknown preview/local hosts always use the isolated development backend.
export function backendOrigin(requestUrl: string): string {
  const host = new URL(requestUrl).hostname;
  if (LIVE_APP_HOSTS.has(host)) return LIVE_BACKEND;
  if (POS_STAGING_APP_HOSTS.has(host)) return POS_STAGING_BACKEND;
  return DEV_BACKEND;
}

export function usesBoundDevelopmentBackend(requestUrl: string): boolean {
  return POS_STAGING_APP_HOSTS.has(new URL(requestUrl).hostname);
}
