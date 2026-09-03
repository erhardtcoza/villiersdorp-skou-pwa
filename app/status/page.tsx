"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2, RefreshCw, Server, Ticket, WifiOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type CheckStatus = "ok" | "warn" | "fail";
type HealthCheck = { status: CheckStatus; detail: string };
type HealthPayload = {
  ok: boolean;
  service: string;
  checked_at: string;
  upstream: string;
  checks: Record<string, HealthCheck>;
  event?: {
    id?: number;
    name?: string;
    sales_closed: boolean;
    ticket_types: number;
  };
};

const statusLabel: Record<CheckStatus, string> = {
  ok: "Werk",
  warn: "Aandag",
  fail: "Fout",
};

function formatCheckedAt(value?: string) {
  if (!value) return "Nog nie nagegaan nie";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("af-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function StatusPage() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadHealth() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/app/health", { cache: "no-store" });
      const data = await response.json().catch(() => null) as HealthPayload | null;
      if (!data) throw new Error(`Health endpoint het HTTP ${response.status} geantwoord, maar geen JSON teruggegee nie.`);
      setHealth(data);
      if (!response.ok && data.ok) setError(`Health endpoint het HTTP ${response.status} geantwoord.`);
    } catch (err) {
      setHealth(null);
      setError(err instanceof Error ? err.message : "Die status kon nie gelaai word nie.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const health = queueMicrotask(() => void loadHealth());
    return () => {
      void health;
    };
  }, []);

  const checks = health ? Object.entries(health.checks) : [];
  const overallStatus: CheckStatus = error ? "fail" : health?.ok ? "ok" : loading ? "warn" : "fail";

  return (
    <main className="status-page">
      <section className="status-hero">
        <div>
          <Image src="/skou-crest.png" alt="Villiersdorp Landbou Skou" width={96} height={96} priority />
          <p>Stelselstatus</p>
          <h1>Skou-app health</h1>
          <span>Veilige publieke toets vir die app, tickets en API-koppeling.</span>
        </div>
        <span className={`status-pill ${overallStatus}`}>
          {overallStatus === "ok" ? <CheckCircle2 size={18} /> : overallStatus === "warn" ? <AlertTriangle size={18} /> : <WifiOff size={18} />}
          {loading ? "Besig" : statusLabel[overallStatus]}
        </span>
      </section>

      <section className="status-card">
        <div className="status-card-title">
          <div>
            <p>Laaste toets</p>
            <h2>{formatCheckedAt(health?.checked_at)}</h2>
          </div>
          <button type="button" onClick={loadHealth} disabled={loading}>
            <RefreshCw size={18} className={loading ? "spin" : ""} />
            Herlaai
          </button>
        </div>

        {error ? <div className="status-error">{error}</div> : null}

        <div className="status-summary-grid">
          <article>
            <Server size={22} />
            <small>Worker</small>
            <strong>{health?.service || "villiersdorp-skou-app"}</strong>
          </article>
          <article>
            <Server size={22} />
            <small>Backend</small>
            <strong>{health?.upstream || "tickets.villiersdorpskou.co.za"}</strong>
          </article>
          <article>
            <Ticket size={22} />
            <small>Kaartjies</small>
            <strong>{health?.event?.ticket_types ?? "—"}</strong>
          </article>
        </div>

        <div className="status-checks">
          {checks.length ? checks.map(([key, check]) => (
            <article key={key} className={check.status}>
              <span>{check.status === "ok" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}</span>
              <div>
                <strong>{key.replaceAll("_", " ")}</strong>
                <p>{check.detail}</p>
              </div>
              <b>{statusLabel[check.status]}</b>
            </article>
          )) : (
            <article className="warn">
              <span><AlertTriangle size={18} /></span>
              <div>
                <strong>Besig om te toets</strong>
                <p>Die app vra nou die health endpoint.</p>
              </div>
              <b>Besig</b>
            </article>
          )}
        </div>
      </section>

      <section className="status-note">
        <strong>Wat wys ons nie publiek nie?</strong>
        <p>Geen passwords, tokens, databasis-rye, interne logs of finansiële detail word hier uitgegee nie. Die blad wys net of die publieke pad wat die app nodig het tans gesond lyk.</p>
      </section>

      <Link className="status-back" href="/">
        <ArrowLeft size={18} />
        Terug app toe
      </Link>
    </main>
  );
}
