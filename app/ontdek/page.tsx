"use client";

import { useEffect, useState } from "react";
import "./ontdek.css";

type EventSummary = { id?: number; slug?: string; name?: string; starts_at?: string; ends_at?: string; venue?: string };
type Health = { event?: EventSummary; ticket_types?: number };
type ShowSection = { id?: number; title?: string; summary?: string; cta_label?: string; cta_url?: string; image_url?: string };
type SectionsResponse = { items?: ShowSection[]; sections?: ShowSection[] };

const publicSite = "https://www.villiersdorpskou.co.za";

function sectionItems(result: SectionsResponse): ShowSection[] {
  return Array.isArray(result.items) ? result.items : Array.isArray(result.sections) ? result.sections : [];
}

function publicSectionUrl(path: string, eventSlug?: string): string {
  if (/^(https?:|mailto:|tel:)/.test(path)) return path;
  if (path.startsWith("#")) return `${publicSite}/shows/${eventSlug || "villiersdorp-skou-2026"}${path}`;
  return `${publicSite}${path}`;
}

export default function DiscoverPage() {
  const [event, setEvent] = useState<EventSummary | null>(null);
  const [sections, setSections] = useState<ShowSection[]>([]);
  const [ticketTypes, setTicketTypes] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const healthResponse = await fetch("/api/public/health", { cache: "no-store" });
        if (!healthResponse.ok) throw new Error("health");
        const health = await healthResponse.json() as Health;
        const eventId = Number.isSafeInteger(health.event?.id) ? `?event_id=${encodeURIComponent(String(health.event?.id))}` : "";
        const sectionsResponse = await fetch(`/api/public/show-sections${eventId}`, { cache: "no-store" });
        const sectionsBody = sectionsResponse.ok ? await sectionsResponse.json() as SectionsResponse : {};
        if (!active) return;
        const availableTicketTypes = Number(health.ticket_types);
        setEvent(health.event || null);
        setTicketTypes(Number.isSafeInteger(availableTicketTypes) ? availableTicketTypes : null);
        setSections(sectionItems(sectionsBody).slice(0, 6));
        setStatus("ready");
      } catch {
        if (active) setStatus("error");
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  return <main className="discover-page">
    <section className="discover-hero">
      <div className="discover-wrap">
        <p className="discover-eyebrow">Villiersdorp Landbou Skou</p>
        <h1>Ontdek die Skou</h1>
        <p className="discover-lead">Alles wat besoekers, toekomstige borge en lede nodig het, op een plek.</p>
        <div className="discover-actions">
          <a className="discover-primary" href={`${publicSite}/shows/villiersdorp-skou-2026`}>Besoek die 2026-skoublad</a>
          <a className="discover-secondary" href={`${publicSite}/borgskap`}>Borgskapgeleenthede</a>
        </div>
      </div>
    </section>

    <section className="discover-wrap discover-content" aria-live="polite">
      {status === "loading" && <p className="discover-status">Laai die huidige skou-inligting…</p>}
      {status === "error" && <p className="discover-status discover-error">Die jongste skou-inligting kon nie nou laai nie. Probeer asseblief weer.</p>}
      {status === "ready" && <>
        <section className="discover-event" aria-label="Huidige skou">
          <p className="discover-label">Huidige skou</p>
          <h2>{event?.name || "Villiersdorp Skou"}</h2>
          {event?.venue && <p>{event.venue}</p>}
          {ticketTypes !== null && <p className="discover-muted">{ticketTypes} kaartjie-tipes is tans beskikbaar.</p>}
        </section>
        <section aria-labelledby="discover-sections-title">
          <div className="discover-heading"><p className="discover-label">Skou-afdelings</p><h2 id="discover-sections-title">Beplan jou besoek</h2></div>
          <div className="discover-grid">
            {sections.map((section) => <article className="discover-card" key={section.id || section.title}>
              {section.image_url && <img src={section.image_url} alt="" loading="lazy" />}
              <h3>{section.title || "Skou-afdeling"}</h3>
              {section.summary && <p>{section.summary}</p>}
              {section.cta_url && <a href={publicSectionUrl(section.cta_url, event?.slug)}>{section.cta_label || "Lees meer"}</a>}
            </article>)}
          </div>
        </section>
      </>}
    </section>
  </main>;
}
