"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../lib/app-api";

type Photo = { id: number; title: string; caption?: string; uploader_name?: string; file_url: string; status: string };

export function PhotoModeration({ onChanged }: { onChanged: () => Promise<void> }) {
  const [filter, setFilter] = useState("pending");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [nextAfter, setNextAfter] = useState<number | null>(null);
  const [eventName, setEventName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  const generation = useRef(0);
  const load = useCallback(async (after = 0) => {
    const token = ++generation.current;
    setLoading(true); setError(""); setPhotos([]);
    try {
      const result = await api(`/api/app/staff/photos?status=${encodeURIComponent(filter)}&after=${after}`);
      if (generation.current !== token) return;
      setPhotos(result.photos || []); setEventName(result.event?.name || ""); setNextAfter(result.next_after ?? null);
    } catch (err) {
      if (generation.current === token) setError(err instanceof Error ? err.message : "Foto’s kon nie gelaai word nie");
    } finally { if (generation.current === token) setLoading(false); }
  }, [filter]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => { window.clearTimeout(timer); generation.current++; };
  }, [load]);

  const review = async (event: FormEvent<HTMLFormElement>, photo: Photo) => {
    event.preventDefault();
    if (pending.current) return;
    const form = new FormData(event.currentTarget);
    const status = String(form.get("status") || "");
    const reason = String(form.get("reason") || "").trim();
    if (!reason || reason.length > 600) { setError("Verskaf ’n rede van hoogstens 600 karakters."); return; }
    pending.current = true; setBusy(true); setError(""); setMessage("");
    try {
      await api(`/api/app/staff/photos/${photo.id}/review`, { method: "POST", body: JSON.stringify({ status, expected_status: photo.status, reason }) });
      setMessage(status === "approved" ? "Foto goedgekeur vir die app-galery." : "Foto afgekeur en uit die gedeelde app-galery verwyder.");
      await load(); await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Besluit kon nie gestoor word nie. Herlaai om die huidige status te sien.");
    } finally { pending.current = false; setBusy(false); }
  };

  return <section className="photo-gallery" aria-label="Fotogoedkeuring">
    <h3>Fotogoedkeuring</h3>
    <p>Goedkeuring maak die foto vir aangemelde app-gebruikers sigbaar. Webwerf- en TV-publikasie is nog nie gekoppel nie.</p>
    {eventName && <p>{eventName}</p>}
    <label>Status<select value={filter} disabled={busy} onChange={event => { setMessage(""); setFilter(event.target.value); }}>
      <option value="pending">Wag vir goedkeuring</option><option value="approved">Goedgekeur</option><option value="rejected">Afgekeur</option>
    </select></label>
    <button type="button" className="text-button" disabled={busy || loading} onClick={() => void load()}>Herlaai fotolys</button>
    {loading && <p role="status">Laai foto’s…</p>}
    {message && <p className="success-note" role="status">{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    {!loading && !error && !photos.length && <p>Geen foto’s met hierdie status vir die aktiewe skou nie.</p>}
    {nextAfter !== null && <button type="button" className="text-button" disabled={busy || loading} onClick={() => void load(nextAfter)}>Volgende foto’s</button>}
    <div className="photo-grid">{photos.map(photo => <article key={`${photo.id}-${photo.status}`}>
      <img src={photo.file_url} alt={photo.title} loading="lazy" />
      <div><strong>{photo.title}</strong><p>{photo.uploader_name}</p>{photo.caption && <p>{photo.caption}</p>}
        <form onSubmit={event => void review(event, photo)}>
          <label>Besluit<select name="status" disabled={busy} defaultValue={photo.status === "approved" ? "rejected" : "approved"}>
            {photo.status !== "approved" && <option value="approved">Keur goed</option>}
            {photo.status !== "rejected" && <option value="rejected">Keur af</option>}
          </select></label>
          <label>Rede<textarea name="reason" required maxLength={600} readOnly={busy} /></label>
          <button className="app-primary" disabled={busy || loading}>Stoor besluit</button>
        </form>
        <PhotoReviewHistory photoId={photo.id} />
      </div>
    </article>)}</div>
  </section>;
}

type Review = { id: number; reviewer_id: number; reviewer_name: string; previous_status: string; status: string; reason: string; created_at: number };
function PhotoReviewHistory({ photoId }: { photoId: number }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [next, setNext] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const load = async (before = 0) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const result = await api(`/api/app/staff/photos/${photoId}/reviews?before=${before}`);
      setReviews(result.reviews || []); setNext(result.next_before ?? null);
    } catch (err) { setError(err instanceof Error ? err.message : "Geskiedenis kon nie gelaai word nie"); }
    finally { inFlight.current = false; setBusy(false); }
  };
  const label = (value: string) => value === "approved" ? "Goedgekeur" : value === "rejected" ? "Afgekeur" : "Wag vir goedkeuring";
  return <section aria-label="Besluitgeskiedenis">
    <button type="button" className="text-button" disabled={busy} onClick={() => void load()}>{busy ? "Laai geskiedenis…" : "Wys / herlaai besluitgeskiedenis"}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
    {reviews?.length === 0 && <p>Geen besluite aangeteken nie.</p>}
    {reviews && <ul>{reviews.map(review => <li key={review.id}>
      <strong>{label(review.previous_status)} → {label(review.status)}</strong>
      <p>{review.reason}</p>
      <small>{review.reviewer_name} (#{review.reviewer_id}) · {new Date(review.created_at * 1000).toLocaleString("af-ZA", { timeZone: "Africa/Johannesburg" })}</small>
    </li>)}</ul>}
    {next !== null && <button type="button" className="text-button" disabled={busy} onClick={() => void load(next)}>Ouer besluite</button>}
  </section>;
}
