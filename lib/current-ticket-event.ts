type EventSummary = { id?: number; slug?: string; status?: string };
type EventLookupResponse = {
  event?: EventSummary;
  current?: EventSummary[];
  upcoming?: EventSummary[];
};

// Match the app's selected event by identity, never by year or list position.
export async function currentTicketEvent(request: (path: string) => Promise<EventLookupResponse>) {
  const health = await request("/api/app/health");
  const id = Number(health.event?.id);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error("Geen aktiewe skou gevind nie. Kontak admin vir hulp.");
  const catalogue = await request("/api/public/events/catalog");
  const candidates = [
    ...(Array.isArray(catalogue.current) ? catalogue.current : []),
    ...(Array.isArray(catalogue.upcoming) ? catalogue.upcoming : []),
  ];
  const event = candidates.find(item => Number(item.id) === id && item.status === "active");
  if (!event || typeof event.slug !== "string" || !event.slug.trim()) {
    throw new Error("Die huidige skou se kaartjiekatalogus is nie beskikbaar nie. Kontak admin vir hulp.");
  }
  return { id, slug: event.slug };
}
