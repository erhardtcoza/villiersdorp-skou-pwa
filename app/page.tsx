"use client";

import { Activity, ArrowRight, Bell, CalendarDays, CheckCircle2, ChevronRight, CircleUserRound, ClipboardCheck, Eye, EyeOff, Home, Images, KeyRound, Landmark, LogIn, LogOut, MapPinned, MessageCircle, QrCode, RefreshCw, ScanLine, ShieldCheck, Store, Ticket, Trophy, UserPlus, Users, WalletCards, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";

type AppUser = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  source: "visitor" | "staff";
  verified: boolean;
};
type AppTicket = {
  id: number;
  ticket_name: string;
  event_name: string;
  state: string;
  short_code?: string;
  qr_url: string;
  attendee_first?: string | null;
  attendee_last?: string | null;
  family_member_id?: number | null;
};
type FamilyMember = { id: number; name: string; relationship?: string | null; date_of_birth?: string | null; email?: string | null; phone?: string | null };
type AppWallet = {
  id: string;
  name: string;
  balance_cents: number;
  status: string;
};
type MeResponse = {
  ok: boolean;
  user: AppUser;
  tickets: AppTicket[];
  wallets: AppWallet[];
  linkage: string;
};
type AuthView = "welcome" | "login" | "register" | "verify" | "forgot" | "reset-code" | "reset-password";
type AppTab = "home" | "messages" | "calendar" | "profile";
type RoleView = "visitor" | "vendor" | "staff" | "committee";
type AppModule = {
  key: string;
  title: string;
  detail: string;
  icon: LucideIcon;
  roles: RoleView[];
  href?: string;
  live?: boolean;
};

const roleNames: Record<string, string> = {
  admin: "Administrateur",
  committee: "Komiteelid",
  manager: "Bestuurder",
  pos: "Verkooppunt",
  scan: "Hekpersoneel",
  staff: "Personeel",
  visitor: "Besoeker",
  vendor: "Uitstaller",
  exhibitor: "Uitstaller",
  uitstaller: "Uitstaller",
};
const allViews: RoleView[] = ["visitor", "vendor", "staff", "committee"];
const appModules: AppModule[] = [
  {
    key: "tickets",
    title: "My Kaartjies",
    detail: "Koop, wys en bestuur jou QR-kaartjies",
    icon: Ticket,
    roles: allViews,
    live: true,
  },
  {
    key: "family",
    title: "My Familie",
    detail: "Gesinslede en kaartjiehouers",
    icon: Users,
    roles: ["visitor", "committee"],
    live: true,
  },
  {
    key: "programme",
    title: "Skouprogram",
    detail: "Tye, verhoë en hoogtepunte",
    icon: CalendarDays,
    roles: allViews,
    href: "https://www.villiersdorpskou.co.za/#program",
    live: true,
  },
  {
    key: "map",
    title: "Skoukaart",
    detail: "Hekke, arenas, stalletjies en geriewe",
    icon: MapPinned,
    roles: allViews,
    href: "https://www.villiersdorpskou.co.za/vendors",
    live: true,
  },
  {
    key: "photos",
    title: "Skoufoto’s",
    detail: "Foto’s en albums van die Skou",
    icon: Images,
    roles: allViews,
  },
  {
    key: "wallet",
    title: "Skoubeursie",
    detail: "Balans, kaart en transaksies",
    icon: WalletCards,
    roles: ["visitor", "committee"],
    live: true,
  },
  {
    key: "vendor-profile",
    title: "Uitstallerprofiel",
    detail: "Besigheid- en stalletjie-inligting",
    icon: Store,
    roles: ["vendor", "committee"],
  },
  {
    key: "vendor-application",
    title: "My Aansoek",
    detail: "Status, vereistes en dokumente",
    icon: ClipboardCheck,
    roles: ["vendor", "committee"],
    href: "https://www.villiersdorpskou.co.za/vendor-apply",
    live: true,
  },
  {
    key: "vendor-team",
    title: "Uitstallerspan",
    detail: "Werknemers en bywoningsdae",
    icon: Users,
    roles: ["vendor", "committee"],
  },
  {
    key: "passes",
    title: "Hekpasse",
    detail: "QR-passe vir jou span",
    icon: QrCode,
    roles: ["vendor", "committee"],
  },
  {
    key: "pos",
    title: "Verkooppunt",
    detail: "Verkope, kasse en dagafsluiting",
    icon: Store,
    roles: ["staff", "committee"],
    href: "https://tickets.villiersdorpskou.co.za/app",
    live: true,
  },
  {
    key: "applications",
    title: "Stalletjie-aansoeke",
    detail: "Hersien, keur goed en ken staanplekke toe",
    icon: ClipboardCheck,
    roles: ["staff", "committee"],
    href: "https://www.villiersdorpskou.co.za/admin#vendors",
    live: true,
  },
  {
    key: "horses",
    title: "Perdeskou",
    detail: "Inskrywings, klasse en dokumente",
    icon: Trophy,
    roles: ["staff", "committee"],
    href: "https://www.villiersdorpskou.co.za/admin#horses",
    live: true,
  },
  {
    key: "venues",
    title: "Terreinbesprekings",
    detail: "Gebeurtenisse en besprekingsversoeke",
    icon: Landmark,
    roles: allViews,
  },
  {
    key: "venue-approvals",
    title: "Terreingoedkeurings",
    detail: "Hersien versoeke en pryse",
    icon: ClipboardCheck,
    roles: ["staff", "committee"],
  },
  {
    key: "meetings",
    title: "Vergaderings",
    detail: "Agendas, RSVP’s en dokumente",
    icon: CalendarDays,
    roles: ["staff", "committee"],
  },
  {
    key: "gates",
    title: "Hekbeheer",
    detail: "Skandeer kaartjies en monitor toegang",
    icon: ScanLine,
    roles: ["staff", "committee"],
    href: "https://tickets.villiersdorpskou.co.za/scan",
    live: true,
  },
  {
    key: "reports",
    title: "Operasies",
    detail: "Bywoning, verkope en stelselgesondheid",
    icon: Activity,
    roles: ["staff", "committee"],
    href: "https://www.villiersdorpskou.co.za/admin#posv1",
    live: true,
  },
  {
    key: "users",
    title: "Gebruikers & Rolle",
    detail: "Bestuur personeeltoegang en regte",
    icon: CircleUserRound,
    roles: ["committee"],
    href: "https://www.villiersdorpskou.co.za/admin",
    live: true,
  },
];

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  const data = await response.json().catch(() => ({
    ok: false,
    error: "Die bediener het nie korrek geantwoord nie",
  }));
  if (!response.ok) throw new Error(data.error || "Iets het verkeerd geloop");
  return data;
}

function Splash() {
  return (
    <main className="app-auth splash-screen">
      <div className="splash-glow" />
      <Image unoptimized src="/skou-crest.png" width={150} height={150} priority alt="Villiersdorp Landbou Skou" />
      <p>Villiersdorp Landbou Skou</p>
      <h1>Welkom by die Skou-app</h1>
      <span>Alles wat jy vir die skou nodig het, in jou hand.</span>
    </main>
  );
}

export default function HomePage() {
  const [booting, setBooting] = useState(true),
    [view, setView] = useState<AuthView>("welcome"),
    [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState(""),
    [resetToken, setResetToken] = useState("");
  const [me, setMe] = useState<MeResponse | null>(null);

  const loadMe = async () => {
    try {
      const data = await api("/api/app/me");
      setMe(data);
      setView(data.user.verified || data.user.source === "staff" ? "welcome" : "verify");
    } catch {
      setMe(null);
    }
  };
  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 1250);
    const boot = queueMicrotask(() => void loadMe());
    return () => {
      clearTimeout(timer);
      void boot;
    };
  }, []);

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await api("/api/app/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: form.get("identifier"),
          password: form.get("password"),
        }),
      });
      await loadMe();
      if (result.requires_verification) setView("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Teken in het misluk");
    } finally {
      setBusy(false);
    }
  };
  const submitRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || ""),
      confirm = String(form.get("confirm") || "");
    if (password !== confirm) {
      setError("Die twee wagwoorde stem nie ooreen nie");
      setBusy(false);
      return;
    }
    try {
      const result = await api("/api/app/register", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone"),
          password,
        }),
      });
      setMessage(result.verification_sent ? "Ons het 'n 6-syfer kode na jou e-pos gestuur." : "Jou rekening is geskep, maar die e-pos kon nie gestuur word nie. Probeer Stuur weer.");
      await loadMe();
      setView("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registrasie het misluk");
    } finally {
      setBusy(false);
    }
  };
  const submitCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/app/verify-email", {
        method: "POST",
        body: JSON.stringify({ code: form.get("code") }),
      });
      setMessage("Dankie—jou rekening is bevestig en jou bestaande kaartjies en beursie is nagegaan.");
      await loadMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verifikasie het misluk");
    } finally {
      setBusy(false);
    }
  };
  const resend = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/api/app/resend-verification", { method: "POST", body: "{}" });
      setMessage("'n Nuwe kode is gestuur.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ons kon nie die kode stuur nie");
    } finally {
      setBusy(false);
    }
  };
  const requestReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "")
      .trim()
      .toLowerCase();
    try {
      const result = await api("/api/app/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setResetEmail(email);
      setMessage(result.message || "As die rekening bestaan, is 'n kode gestuur.");
      setView("reset-code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ons kon nie die herstelversoek stuur nie");
    } finally {
      setBusy(false);
    }
  };
  const resendReset = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await api("/api/app/password-reset/request", {
        method: "POST",
        body: JSON.stringify({ email: resetEmail }),
      });
      setMessage(result.message || "'n Nuwe kode is gestuur.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ons kon nie die kode weer stuur nie");
    } finally {
      setBusy(false);
    }
  };
  const verifyReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await api("/api/app/password-reset/verify", {
        method: "POST",
        body: JSON.stringify({ email: resetEmail, code: form.get("code") }),
      });
      setResetToken(result.reset_token);
      setMessage("");
      setView("reset-password");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Die kode kon nie bevestig word nie");
    } finally {
      setBusy(false);
    }
  };
  const completeReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || ""),
      confirm = String(form.get("confirm") || "");
    if (password !== confirm) {
      setError("Die twee wagwoorde stem nie ooreen nie");
      setBusy(false);
      return;
    }
    try {
      await api("/api/app/password-reset/complete", {
        method: "POST",
        body: JSON.stringify({
          email: resetEmail,
          reset_token: resetToken,
          password,
        }),
      });
      setResetToken("");
      setMessage("Jou wagwoord is verander. Jy kan nou met jou nuwe wagwoord inteken.");
      setView("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ons kon nie jou wagwoord verander nie");
    } finally {
      setBusy(false);
    }
  };
  const logout = async () => {
    await api("/api/app/logout", { method: "POST", body: "{}" }).catch(() => null);
    setMe(null);
    setMessage("");
    setError("");
    setView("welcome");
  };

  if (booting) return <Splash />;
  if (me && (me.user.verified || me.user.source === "staff")) return <Dashboard data={me} message={message} onLogout={logout} />;

  return (
    <main className="app-auth auth-screen">
      <section className="auth-brand">
        <Image unoptimized src="/skou-crest.png" width={64} height={64} priority alt="Villiersdorp Landbou Skou" />
        <div>
          <p>Villiersdorp Landbou Skou</p>
          <h1>{view === "welcome" ? "Welkom" : view === "login" ? "Welkom terug" : view === "register" ? "Skep jou rekening" : view === "verify" ? "Bevestig jou e-pos" : view === "forgot" ? "Herstel jou wagwoord" : view === "reset-code" ? "Bevestig jou kode" : "Kies 'n nuwe wagwoord"}</h1>
        </div>
      </section>
      {view === "welcome" && (
        <section className="auth-card welcome-panel">
          <div className="welcome-art">
            <span>23–24 Oktober 2026</span>
            <h2>
              Jou Kaartjie,
              <br />
              Jou Beursie,
              <br />
              als op een plek
            </h2>
            <p>Vind jou kaartjies, beursie en die jongste skou-inligting op een plek.</p>
          </div>
          <button
            className="app-primary"
            onClick={() => {
              setView("register");
              setError("");
            }}
          >
            <UserPlus />
            Registreer
          </button>
          <button
            className="app-secondary"
            onClick={() => {
              setView("login");
              setError("");
            }}
          >
            <LogIn />
            Teken in
          </button>
        </section>
      )}
      {view === "login" && (
        <form className="auth-card auth-form" onSubmit={submitLogin}>
          <p className="form-intro">Gebruik jou e-posadres, selfoonnommer of bestaande personeel-gebruikersnaam.</p>
          {message && (
            <p className="success-note">
              <CheckCircle2 />
              {message}
            </p>
          )}
          <label>
            E-pos, selfoon of gebruikersnaam
            <input name="identifier" autoComplete="username" required placeholder="naam@voorbeeld.co.za" />
          </label>
          <label>
            Wagwoord
            <span className="password-field">
              <input name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Wys of versteek wagwoord">
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </span>
          </label>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setView("forgot");
              setMessage("");
              setError("");
            }}
          >
            Wagwoord vergeet?
          </button>
          {error && <p className="form-error">{error}</p>}
          <button className="app-primary" disabled={busy}>
            {busy ? <RefreshCw className="spin" /> : <LogIn />}
            {busy ? "Besig…" : "Teken in"}
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setView("welcome");
              setMessage("");
              setError("");
            }}
          >
            Terug
          </button>
        </form>
      )}
      {view === "register" && (
        <form className="auth-card auth-form" onSubmit={submitRegister}>
          <p className="form-intro">Registreer as ’n gewone besoeker. Ons sal bestaande aankope veilig met jou rekening vergelyk.</p>
          <label>
            Volle naam
            <input name="name" autoComplete="name" required />
          </label>
          <label>
            E-posadres
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Selfoonnommer
            <input name="phone" inputMode="tel" autoComplete="tel" placeholder="082 123 4567" required />
          </label>
          <label>
            Wagwoord
            <input name="password" type="password" autoComplete="new-password" minLength={8} required />
            <small>Minstens 8 karakters.</small>
          </label>
          <label>
            Bevestig wagwoord
            <input name="confirm" type="password" autoComplete="new-password" minLength={8} required />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="app-primary" disabled={busy}>
            {busy ? <RefreshCw className="spin" /> : <ArrowRight />}
            {busy ? "Skep rekening…" : "Registreer"}
          </button>
          <button type="button" className="text-button" onClick={() => setView("welcome")}>
            Terug
          </button>
        </form>
      )}
      {view === "verify" && (
        <form className="auth-card auth-form verify-panel" onSubmit={submitCode}>
          <ShieldCheck />
          <h2>Een laaste stap</h2>
          <p>{message || "Tik die 6-syfer kode wat ons na jou e-pos gestuur het."}</p>
          <input className="code-input" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" required />
          {error && <p className="form-error">{error}</p>}
          <button className="app-primary" disabled={busy}>
            <CheckCircle2 />
            Bevestig rekening
          </button>
          <button type="button" className="app-secondary" disabled={busy} onClick={resend}>
            Stuur kode weer
          </button>
          <button type="button" className="text-button" onClick={logout}>
            Teken uit
          </button>
        </form>
      )}
      {view === "forgot" && (
        <form className="auth-card auth-form verify-panel" onSubmit={requestReset}>
          <KeyRound />
          <h2>Wagwoord vergeet?</h2>
          <p>Voer die e-posadres van jou rekening in. Ons stuur vir jou ’n eenmalige 6-syfer kode.</p>
          <label>
            E-posadres
            <input name="email" type="email" autoComplete="email" required placeholder="naam@voorbeeld.co.za" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="app-primary" disabled={busy}>
            {busy ? <RefreshCw className="spin" /> : <ArrowRight />}
            {busy ? "Stuur…" : "Stuur kode"}
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setView("login");
              setError("");
            }}
          >
            Terug na aanmelding
          </button>
        </form>
      )}
      {view === "reset-code" && (
        <form className="auth-card auth-form verify-panel" onSubmit={verifyReset}>
          <ShieldCheck />
          <h2>Kontroleer jou e-pos</h2>
          <p>{message}</p>
          <input className="code-input" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" required />
          {error && <p className="form-error">{error}</p>}
          <button className="app-primary" disabled={busy}>
            <CheckCircle2 />
            Bevestig kode
          </button>
          <button type="button" className="app-secondary" disabled={busy} onClick={resendReset}>
            Stuur kode weer
          </button>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setView("forgot");
              setError("");
            }}
          >
            Gebruik ’n ander e-posadres
          </button>
        </form>
      )}
      {view === "reset-password" && (
        <form className="auth-card auth-form verify-panel" onSubmit={completeReset}>
          <KeyRound />
          <h2>Nuwe wagwoord</h2>
          <p>Kies ’n nuwe wagwoord van minstens 8 karakters.</p>
          <label>
            Nuwe wagwoord
            <span className="password-field">
              <input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Wys of versteek wagwoord">
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </span>
          </label>
          <label>
            Bevestig nuwe wagwoord
            <input name="confirm" type={showPassword ? "text" : "password"} autoComplete="new-password" minLength={8} required />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="app-primary" disabled={busy}>
            {busy ? <RefreshCw className="spin" /> : <CheckCircle2 />}
            {busy ? "Verander…" : "Verander wagwoord"}
          </button>
        </form>
      )}
    </main>
  );
}

function Dashboard({ data, message, onLogout }: { data: MeResponse; message: string; onLogout: () => void }) {
  const { user, tickets, wallets } = data;
  const actualView: RoleView = user.role === "visitor" ? "visitor" : ["vendor", "exhibitor", "uitstaller"].includes(user.role) ? "vendor" : ["admin", "committee", "manager"].includes(user.role) ? "committee" : "staff";
  const [tab, setTab] = useState<AppTab>("home"),
    [preview, setPreview] = useState<RoleView>(actualView),
    [selected, setSelected] = useState<string | null>(null);
  const walletTotal = wallets.reduce((sum, w) => sum + w.balance_cents, 0),
    visible = appModules.filter((item) => item.roles.includes(preview));
  const openModule = (item: AppModule) => setSelected(item.key);
  return (
    <main className="app-shell live-app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <Image unoptimized src="/skou-crest.png" width={64} height={58} priority alt="Villiersdorp Landbou Skou" />
          <div>
            <strong>VILLIERSDORP</strong>
            <span>LANDBOU SKOU · AGRI SHOW</span>
          </div>
        </div>
        <p className="event-date">23–24 Oktober 2026</p>
        <button className="icon-button" aria-label="Kennisgewings">
          <Bell />
          <i className="notification-dot" />
        </button>
      </header>
      <section className="viewport">
        {tab === "home" && (
          <>
            <article className="welcome-card">
              <Image unoptimized className="hero-crest" src="/skou-crest.png" width={220} height={220} alt="" />
              <div>
                <p className="welcome-label">Welkom terug</p>
                <h1>{user.name}</h1>
                <p>Alles wat jy vir die Skou nodig het, op een plek.</p>
              </div>
              <span className="role-badge">{preview}</span>
              <div className="field-lines">
                <i />
                <i />
                <i />
              </div>
            </article>
            {message && (
              <p className="success-note">
                <CheckCircle2 />
                {message}
              </p>
            )}
            <div className="live-summary">
              <button onClick={() => setSelected("tickets")}>
                <Ticket />
                <span>
                  <strong>{tickets.length}</strong>
                  <small>My kaartjies</small>
                </span>
              </button>
              <button onClick={() => setSelected("wallet")}>
                <WalletCards />
                <span>
                  <strong>R {(walletTotal / 100).toFixed(2)}</strong>
                  <small>Beursiebalans</small>
                </span>
              </button>
            </div>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Jou toegang</p>
                <h2>Wat wil jy doen?</h2>
              </div>
              <span>{visible.length} opsies</span>
            </div>
            <div className="module-grid">
              {visible.map((item) => (
                <AppModuleCard key={item.key} item={item} onOpen={() => openModule(item)} />
              ))}
            </div>
          </>
        )}
        {tab === "messages" && (
          <SimplePanel title="Boodskappe" subtitle="Amptelike kennisgewings en hulp.">
            <InfoRow icon={Bell} title="Amptelike kennisgewings" text="Belangrike Skou-opdaterings sal hier verskyn." />
            <InfoRow icon={MessageCircle} title="Skou-ondersteuning" text="Kontak die Skoukantoor vir hulp." />
          </SimplePanel>
        )}
        {tab === "calendar" && (
          <SimplePanel title="Kalender" subtitle="Belangrike Skou-datums.">
            <InfoRow icon={CalendarDays} title="Vrydag, 23 Oktober 2026" text="Skoudag 1" />
            <InfoRow icon={CalendarDays} title="Saterdag, 24 Oktober 2026" text="Skoudag 2" />
          </SimplePanel>
        )}
        {tab === "profile" && (
          <SimplePanel title="Profiel" subtitle="Jou rekening en toegang.">
            <div className="profile-card">
              <div className="avatar">{user.name.charAt(0)}</div>
              <strong>{user.name}</strong>
              <span>{roleNames[user.role] || user.role}</span>
            </div>
            {actualView === "committee" && (
              <>
                <p className="switch-label">Kyk as</p>
                <div className="role-list">
                  {allViews.map((view) => (
                    <button key={view} className={preview === view ? "active" : ""} onClick={() => setPreview(view)}>
                      <span>{view}</span>
                      {preview === view && <ShieldCheck />}
                    </button>
                  ))}
                </div>
                <p className="privacy-note">Hierdie verander net die aansig. Alle regte en aksies word steeds deur die bediener afgedwing.</p>
              </>
            )}
            <button className="profile-logout" onClick={onLogout}>
              <LogOut />
              Teken uit
            </button>
          </SimplePanel>
        )}
      </section>
      <nav className="bottom-nav" aria-label="Hoofnavigasie">
        <NavButton label="Home" icon={Home} active={tab === "home"} onClick={() => setTab("home")} />
        <NavButton label="Boodskappe" icon={MessageCircle} active={tab === "messages"} onClick={() => setTab("messages")} />
        <NavButton label="Kalender" icon={CalendarDays} active={tab === "calendar"} onClick={() => setTab("calendar")} />
        <NavButton label="Profiel" icon={CircleUserRound} active={tab === "profile"} onClick={() => setTab("profile")} />
      </nav>
      {selected && <ModuleSheet moduleKey={selected} tickets={tickets} wallets={wallets} onClose={() => setSelected(null)} />}
    </main>
  );
}

function AppModuleCard({ item, onOpen }: { item: AppModule; onOpen: () => void }) {
  const Icon = item.icon;
  const content = (
    <>
      <span className="module-icon">
        <Icon />
      </span>
      <span className="module-copy">
        <strong>{item.title}</strong>
        <small>{item.detail}</small>
        <em data-status={item.live ? "ready" : "planned"}>{item.live ? "Live" : "Word gekoppel"}</em>
      </span>
      <ChevronRight className="chevron" />
    </>
  );
  return item.href ? (
    <a className="module-card" href={item.href}>
      {content}
    </a>
  ) : (
    <button className="module-card" onClick={onOpen}>
      {content}
    </button>
  );
}

function NavButton({ label, icon: Icon, active, onClick }: { label: string; icon: LucideIcon; active: boolean; onClick: () => void }) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      <Icon />
      <span>{label}</span>
    </button>
  );
}
function SimplePanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="simple-view">
      <h1>{title}</h1>
      <p className="view-subtitle">{subtitle}</p>
      <div className="view-list">{children}</div>
    </section>
  );
}
function InfoRow({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <article className="list-row">
      <span className="module-icon">
        <Icon />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </article>
  );
}
function ModuleSheet({ moduleKey, tickets, wallets, onClose }: { moduleKey: string; tickets: AppTicket[]; wallets: AppWallet[]; onClose: () => void }) {
  const moduleInfo = appModules.find((item) => item.key === moduleKey);
  const ModuleIcon = moduleInfo?.icon;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="detail-sheet live-sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        <button className="sheet-close" onClick={onClose} aria-label="Maak toe">
          ×
        </button>
        {moduleKey === "tickets" ? (
          <TicketsFlow tickets={tickets} />
        ) : moduleKey === "family" ? (
          <FamilyFlow />
        ) : moduleKey === "wallet" ? (
          <>
            <span className="detail-icon">
              <WalletCards />
            </span>
            <p className="eyebrow">My beursie</p>
            <h2>Skoubeursie</h2>
            {wallets.length ? (
              <div className="wallet-list sheet-list">
                {wallets.map((wallet) => (
                  <a className="wallet-link" key={wallet.id} href={`https://tickets.villiersdorpskou.co.za/w/${encodeURIComponent(wallet.id)}`}>
                    <WalletCards />
                    <div>
                      <small>{wallet.name}</small>
                      <strong>R {(wallet.balance_cents / 100).toFixed(2)}</strong>
                    </div>
                    <span>Maak oop</span>
                  </a>
                ))}
              </div>
            ) : (
              <EmptyState icon={<WalletCards />} title="Geen beursie gekoppel nie" text="’n Beursie met dieselfde bevestigde selfoonnommer sal outomaties hier verskyn." />
            )}
            <div className="secure-topup-note">
              <ShieldCheck />
              <p>
                <strong>Veilige aanlyn aanvulling</strong>
                <br />
                Yoco-aanvulling word gekoppel sodat jou balans eers verander nadat betaling bevestig is.
              </p>
            </div>
          </>
        ) : (
          <>
            <span className="detail-icon">{ModuleIcon && <ModuleIcon />}</span>
            <p className="eyebrow">Skou-app</p>
            <h2>{moduleInfo?.title || "Module"}</h2>
            <p>{moduleInfo?.detail}</p>
            <div className="handoff">
              <strong>Word veilig gekoppel</strong>
              <p>Die aansig is beskikbaar; die finale live data en bedienerregte word nou aan die bestaande Skou-stelsel gekoppel.</p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function TicketsFlow({ tickets }: { tickets: AppTicket[] }) {
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void api("/api/app/family")
      .then((result) => setFamily(result.family || []))
      .catch(() => setFamily([]));
  }, []);
  const assign = async (ticketId: number, familyMemberId: string) => {
    setAssigning(ticketId);
    setError("");
    try {
      await api(`/api/app/tickets/${ticketId}/assign`, { method: "POST", body: JSON.stringify({ family_member_id: familyMemberId ? Number(familyMemberId) : null }) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaartjie-toewysing het misluk");
    } finally {
      setAssigning(null);
    }
  };
  return (
    <>
      <span className="detail-icon"><Ticket /></span>
      <p className="eyebrow">My kaartjies</p>
      <h2>Koop of wys kaartjies</h2>
      <a className="sheet-primary-link" href="https://tickets.villiersdorpskou.co.za/shop/villiersdorp-skou-2026">Koop kaartjies <ArrowRight /></a>
      {error && <p className="form-error">{error}</p>}
      {tickets.length ? (
        <div className="app-ticket-list sheet-list">
          {tickets.map((ticket) => (
            <article key={ticket.id} className="app-ticket-card">
              <a href={ticket.qr_url} className="app-ticket-main">
                <Ticket />
                <span><strong>{ticket.ticket_name}</strong><small>{ticket.event_name}{ticket.short_code ? ` · ${ticket.short_code}` : ""}</small></span>
                <b>{ticket.state === "unused" ? "Gereed" : ticket.state}</b>
              </a>
              <label>
                Kaartjiehouer
                <select defaultValue={ticket.family_member_id || ""} disabled={assigning === ticket.id} onChange={(event) => void assign(ticket.id, event.target.value)}>
                  <option value="">Ek self</option>
                  {family.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </label>
            </article>
          ))}
        </div>
      ) : <EmptyState icon={<Ticket />} title="Geen kaartjies gevind nie" text="Nuwe aankope wat by jou bevestigde e-pos en selfoon pas, verskyn outomaties hier." />}
    </>
  );
}

function FamilyFlow() {
  const [family, setFamily] = useState<FamilyMember[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const result = await api("/api/app/family");
      setFamily(result.family || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ons kon nie jou familielede laai nie");
    }
  };
  useEffect(() => {
    let active = true;
    void api("/api/app/family")
      .then((result) => { if (active) setFamily(result.family || []); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Ons kon nie jou familielede laai nie"); });
    return () => { active = false; };
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/app/family", { method: "POST", body: JSON.stringify({ name: form.get("name"), relationship: form.get("relationship"), date_of_birth: form.get("date_of_birth"), email: form.get("email"), phone: form.get("phone") }) });
      setAdding(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ons kon nie die familielid byvoeg nie");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <span className="detail-icon"><Users /></span>
      <p className="eyebrow">My familie</p>
      <h2>Gesin en kaartjiehouers</h2>
      <p className="family-intro">Voeg die mense by vir wie jy kaartjies bestuur. Jy kan daarna elke kaartjie aan die regte persoon toewys.</p>
      {error && <p className="form-error">{error}</p>}
      {family === null ? <p className="loading-line"><RefreshCw className="spin" /> Laai familielede…</p> : family.length ? (
        <div className="family-list">{family.map((member) => <article key={member.id}><span className="family-avatar">{member.name.charAt(0)}</span><div><strong>{member.name}</strong><small>{member.relationship || "Familielid"}{member.date_of_birth ? ` · ${member.date_of_birth}` : ""}</small></div></article>)}</div>
      ) : <EmptyState icon={<Users />} title="Nog geen familielede nie" text="Voeg ’n familielid by om kaartjies namens hulle te bestuur." />}
      {adding ? (
        <form className="family-form" onSubmit={submit}>
          <label>Volle naam<input name="name" required minLength={2} /></label>
          <label>Verwantskap<input name="relationship" placeholder="bv. Kind, eggenoot" /></label>
          <label>Geboortedatum<input name="date_of_birth" type="date" /></label>
          <label>E-pos (opsioneel)<input name="email" type="email" /></label>
          <label>Selfoon (opsioneel)<input name="phone" inputMode="tel" /></label>
          <button className="app-primary" disabled={busy}>{busy ? <RefreshCw className="spin" /> : <UserPlus />}{busy ? "Stoor…" : "Stoor familielid"}</button>
          <button type="button" className="text-button" onClick={() => setAdding(false)}>Kanselleer</button>
        </form>
      ) : <button className="sheet-primary-link family-add" onClick={() => setAdding(true)}><UserPlus /> Voeg familielid by</button>}
    </>
  );
}

function EmptyState({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}
