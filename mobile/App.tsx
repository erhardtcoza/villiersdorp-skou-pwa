import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Linking, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

const API_BASE = "https://tickets.villiersdorpskou.co.za";
const TOKEN_KEY = "villiersdorp_skou_access_token";

type User = { id: number; name: string; email: string | null; phone: string | null; role: string; source: "visitor" | "staff"; verified: boolean; permissions?: string[] };
type Ticket = { id: number; ticket_name: string; event_name: string; state: string; short_code?: string; qr_url: string; family_member_id?: number | null };
type Wallet = { id: string; name: string; balance_cents: number; status: string };
type FamilyMember = { id: number; name: string; relationship?: string | null; date_of_birth?: string | null };
type TicketEvent = { id: number; name: string; sales_closed?: boolean | number };
type TicketType = { id: number; name: string; price_cents: number; per_order_limit?: number; requires_gender?: boolean | number };
type BarTransactionItem = { id: number; name: string; qty: number; unit_price_cents: number; total_cents: number };
type BarTransactionPayment = { method: string; provider?: string | null; provider_reference?: string | null; amount_cents: number };
type BarRefund = { id: number | string; method: string; amount_cents: number; status: string };
type BarTransaction = { id: number; order_code?: string | null; created_at: number; total_cents: number; refunded_cents: number; refundable_cents: number; wallet_id?: string | null; location_name?: string | null; operator_name?: string | null; customer_name?: string | null; payment?: BarTransactionPayment | null; items: BarTransactionItem[]; refunds: BarRefund[] };
type Me = { ok: true; user: User; tickets: Ticket[]; wallets: Wallet[] };
type RoleView = "visitor" | "vendor" | "staff" | "committee";
type Screen = "home" | "messages" | "calendar" | "tickets" | "family" | "wallet" | "bar" | "profile";
type AuthMode = "login" | "register" | "verify" | "forgot" | "reset-code" | "reset-password";
type Module = { key: string; icon: string; title: string; detail: string; roles: readonly RoleView[]; href?: string; permissions?: readonly string[] };
type ModuleGroup = { key: string; icon: string; title: string; detail: string; roles: readonly RoleView[]; modules: readonly string[] };

const modules: readonly Module[] = [
  { key: "tickets", icon: "🎟️", title: "My Kaartjies", detail: "Koop, wys en bestuur jou QR-kaartjies", roles: ["visitor", "vendor", "staff", "committee"] },
  { key: "family", icon: "👨‍👩‍👧‍👦", title: "My Familie", detail: "Gesinslede en kaartjiehouers", roles: ["visitor", "committee"] },
  { key: "membership", icon: "🪪", title: "Lidmaatskap", detail: "Sluit aan, hernu of vra lidmaatskap-hulp", roles: ["visitor", "staff", "committee"], href: "https://www.villiersdorpskou.co.za/raak-n-lid" },
  { key: "programme", icon: "📅", title: "Skouprogram", detail: "Tye, verhoë en hoogtepunte", roles: ["visitor", "vendor", "staff", "committee"], href: "https://www.villiersdorpskou.co.za/#program" },
  { key: "map", icon: "🗺️", title: "Skoukaart", detail: "Hekke, arenas, stalletjies en geriewe", roles: ["visitor", "vendor", "staff", "committee"], href: "https://www.villiersdorpskou.co.za/vendors" },
  { key: "photos", icon: "🖼️", title: "Skoufoto’s", detail: "Foto’s en albums van die Skou", roles: ["visitor", "vendor", "staff", "committee"], href: "https://app.villiersdorpskou.co.za/?module=photos" },
  { key: "wallet", icon: "💳", title: "Skoubeursie", detail: "Balans, kaart en transaksies", roles: ["visitor", "committee"] },
  { key: "vendor-application", icon: "🏪", title: "My Aansoek", detail: "Stalletjie-aansoek en status", roles: ["vendor", "committee"], href: "https://app.villiersdorpskou.co.za/?module=vendor-application", permissions: ["vendors_applications", "vendors_approve"] },
  { key: "vendor-profile", icon: "🏪", title: "Uitstallerprofiel", detail: "Besigheid- en stalletjie-inligting", roles: ["vendor", "committee"], href: "https://app.villiersdorpskou.co.za/?module=vendor-profile", permissions: ["vendors_applications", "vendors_approve"] },
  { key: "vendor-team", icon: "👥", title: "Uitstallerspan", detail: "Werknemers, voertuie en bywoningsdae", roles: ["vendor", "committee"], href: "https://app.villiersdorpskou.co.za/?module=vendor-team", permissions: ["vendors_applications", "vendors_approve"] },
  { key: "passes", icon: "🎫", title: "Hekpasse", detail: "QR-passe vir jou span", roles: ["vendor", "committee"], href: "https://app.villiersdorpskou.co.za/?module=passes", permissions: ["vendors_applications", "vendors_approve"] },
  { key: "applications", icon: "📋", title: "Stalletjie-aansoeke", detail: "Personeel queue en opvolgstatus", roles: ["staff", "committee"], href: "https://app.villiersdorpskou.co.za/?module=applications", permissions: ["vendors_applications", "vendors_approve"] },
  { key: "bar", icon: "🍻", title: "Kroegtransaksies", detail: "Laaste verkope en gemagtigde refunds", roles: ["staff", "committee"], permissions: ["bar_transactions", "bar_refunds"] },
  { key: "pos", icon: "🧾", title: "Hek POS", detail: "Hekkaartjies, verkope en dagafsluiting", roles: ["staff", "committee"], href: "https://app.villiersdorpskou.co.za/app?pos_area=hek", permissions: ["pos_sales"] },
  { key: "bar-pos", icon: "🍻", title: "Kroeg POS", detail: "Kroegverkope, Yoco en beursiebetalings", roles: ["staff", "committee"], href: "https://app.villiersdorpskou.co.za/app?pos_area=kroeg", permissions: ["bar_pos"] },
  { key: "wallet-topup", icon: "💳", title: "Beursie aanvulling", detail: "Laai of skep ’n gas se skoubeursie met kontant of kaart", roles: ["staff", "committee"], href: "https://app.villiersdorpskou.co.za/?module=wallet-topup", permissions: ["pos_sales", "bar_pos"] },
  { key: "kitchen-pos", icon: "🍽️", title: "Kombuis POS", detail: "Kombuisverkope en toekomstige afdelings", roles: ["staff", "committee"], href: "https://app.villiersdorpskou.co.za/app?pos_area=kombuis", permissions: ["kitchen_pos"] },
  { key: "gates", icon: "📷", title: "Hek scan in / uit", detail: "Skandeer kaartjies en monitor toegang", roles: ["staff", "committee"], href: "https://app.villiersdorpskou.co.za/scan", permissions: ["gates_scan"] },
  { key: "horse-apply", icon: "🏆", title: "Doen perde-aansoek", detail: "Inskrywings, klasse en dokumente", roles: ["visitor", "vendor", "staff", "committee"], href: "https://app.villiersdorpskou.co.za/perde" },
  { key: "horse-processing", icon: "📋", title: "Verwerk perde-aansoeke", detail: "Personeel queue en opvolgstatus", roles: ["staff", "committee"], href: "https://app.villiersdorpskou.co.za/perde", permissions: ["horses_entries", "horses_approve", "horses_programme"] },
  { key: "horse-programme", icon: "📅", title: "Perdeprogram", detail: "Publieke program, klasse en tye", roles: ["visitor", "vendor", "staff", "committee"], href: "https://app.villiersdorpskou.co.za/perde" },
  { key: "venue-booking", icon: "🏛️", title: "Terreinbespreking", detail: "Bespreek terrein, arena of saal", roles: ["visitor", "vendor", "staff", "committee"], href: "https://app.villiersdorpskou.co.za/terreinbesprekings" },
  { key: "rentals", icon: "🏛️", title: "Verhuring-aansoek", detail: "Verhurings, besprekings en opvolg", roles: ["visitor", "vendor", "staff", "committee"], href: "https://app.villiersdorpskou.co.za/verhurings" },
  { key: "venue-approvals", icon: "📋", title: "Terreingoedkeurings", detail: "Hersien terreinversoeke en opvolgstatus", roles: ["staff", "committee"], href: "https://app.villiersdorpskou.co.za/?module=venue-approvals", permissions: ["grounds_venues", "grounds_facilities"] },
  { key: "rental-approvals", icon: "📋", title: "Verhuring-goedkeuring", detail: "Personeel queue en goedkeurings", roles: ["staff", "committee"], href: "https://app.villiersdorpskou.co.za/verhurings", permissions: ["rentals_manage", "grounds_venues", "grounds_facilities"] },
  { key: "buildings", icon: "🏠", title: "Geboue", detail: "Geboue, sale en terrein gereedheid", roles: ["staff", "committee"], href: "https://app.villiersdorpskou.co.za/?module=buildings", permissions: ["buildings_manage", "grounds_facilities"] },
  { key: "finance", icon: "💼", title: "Finansies", detail: "Invoices, betalings, bank recon en verslae", roles: ["staff", "committee"], href: "https://app.villiersdorpskou.co.za/?module=finance", permissions: ["finance_reconcile", "finance_reports", "vendors_invoices", "bar_cashup"] },
  { key: "meetings", icon: "🗓️", title: "Vergaderings", detail: "Agendas, RSVP’s en dokumente", roles: ["staff", "committee"], href: "https://app.villiersdorpskou.co.za/?module=meetings", permissions: ["meetings_manage"] },
  { key: "krymekaar", icon: "🏆", title: "Krymekaar & Slaglam", detail: "Veiling, event en eie vermaak", roles: ["staff", "committee"], href: "https://app.villiersdorpskou.co.za/?module=krymekaar", permissions: ["krymekaar_manage", "entertainment_programme"] },
  { key: "users", icon: "👤", title: "Gebruikers & Rolle", detail: "Bestuur personeeltoegang en regte", roles: ["committee"], href: "https://app.villiersdorpskou.co.za/?module=users", permissions: ["access_manage"] },
  { key: "operations", icon: "📊", title: "Operasies", detail: "Bywoning, verkope en stelselgesondheid", roles: ["staff", "committee"], href: "https://www.villiersdorpskou.co.za/admin#posv1", permissions: ["ops_reports"] },
] as const;

const moduleGroups: readonly ModuleGroup[] = [
  { key: "visitor", icon: "🎟️", title: "Kaartjies & Beursie", detail: "Koop kaartjies, wys QR’s, bestuur familie en laai beursie.", roles: ["visitor", "vendor", "staff", "committee"], modules: ["tickets", "wallet", "family", "membership"] },
  { key: "pos-access", icon: "📷", title: "POS & Toegang", detail: "Hek, Kroeg, Kombuis en scan workflows vir personeel.", roles: ["staff", "committee"], modules: ["pos", "bar-pos", "wallet-topup", "kitchen-pos", "gates", "bar", "operations"] },
  { key: "horses", icon: "🏆", title: "Perde", detail: "Doen aansoek, sien program, of verwerk aansoeke met regte.", roles: ["visitor", "vendor", "staff", "committee"], modules: ["horse-apply", "horse-processing", "horse-programme"] },
  { key: "vendors", icon: "🏪", title: "Uitstallers", detail: "Aansoeke, profiel, span, hekpasse en verwerking.", roles: ["vendor", "staff", "committee"], modules: ["vendor-application", "vendor-profile", "vendor-team", "passes", "applications"] },
  { key: "grounds", icon: "🏛️", title: "Terrein & Verhurings", detail: "Terreinbesprekings, geboue, verhurings en goedkeurings.", roles: ["visitor", "vendor", "staff", "committee"], modules: ["venue-booking", "rentals", "venue-approvals", "rental-approvals", "buildings"] },
  { key: "show", icon: "🗺️", title: "Skou-inligting", detail: "Program, kaart, foto’s en publieke inligting.", roles: ["visitor", "vendor", "staff", "committee"], modules: ["programme", "map", "photos"] },
  { key: "management", icon: "🛡️", title: "Bestuur", detail: "Finansies, vergaderings, komitees, gebruikers en spesiale events.", roles: ["staff", "committee"], modules: ["finance", "meetings", "krymekaar", "users"] },
] as const;

function canUseModule(user: User, item: Module) {
  if (!item.permissions?.length) return true;
  if (["admin", "manager"].includes(user.role)) return true;
  return item.permissions.some((permission) => user.permissions?.includes(permission));
}

async function request(path: string, options: RequestInit = {}, token?: string | null) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, signal: options.signal || controller.signal, headers: { "content-type": "application/json", "x-app-client": "native", ...(token ? { authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw new Error("Die versoek het te lank geneem. Herlaai die app en probeer weer.");
    throw err;
  } finally {
    clearTimeout(timeout);
  }
  const data = await response.json().catch(() => ({ ok: false, error: "Die bediener het nie korrek geantwoord nie" }));
  if (!response.ok || data?.ok === false) {
    const suffix = data.request_id ? ` Verwysing: ${data.request_id}` : "";
    throw new Error(`${data.error || data.reason || "Iets het verkeerd geloop"}${suffix}`);
  }
  return data;
}

function roleView(role: string): RoleView {
  if (role === "visitor") return "visitor";
  if (["vendor", "exhibitor", "uitstaller"].includes(role)) return "vendor";
  if (["admin", "committee", "manager"].includes(role)) return "committee";
  return "staff";
}

function formatRand(cents: number) {
  return `R ${(Number(cents || 0) / 100).toFixed(2)}`;
}

export default function App() {
  const [token, setToken] = useState<string | null>(null), [me, setMe] = useState<Me | null>(null), [booting, setBooting] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>("login"), [screen, setScreen] = useState<Screen>("home");
  const loadMe = async (accessToken: string) => setMe(await request("/api/app/me", {}, accessToken));
  useEffect(() => { void SecureStore.getItemAsync(TOKEN_KEY).then(async (saved) => { if (saved) { try { await loadMe(saved); setToken(saved); } catch { await SecureStore.deleteItemAsync(TOKEN_KEY); } } setTimeout(() => setBooting(false), 900); }); }, []);
  const signedIn = async (accessToken: string, needsVerification = false) => { await SecureStore.setItemAsync(TOKEN_KEY, accessToken); setToken(accessToken); if (needsVerification) setAuthMode("verify"); else await loadMe(accessToken); };
  const logout = async () => { await SecureStore.deleteItemAsync(TOKEN_KEY); setToken(null); setMe(null); setScreen("home"); setAuthMode("login"); };
  if (booting) return <Splash />;
  if (!me) return <Auth mode={authMode} token={token} onMode={setAuthMode} onSignedIn={signedIn} onVerified={async () => { if (token) await loadMe(token); }} />;
  return <MainApp me={me} token={token!} screen={screen} onScreen={setScreen} onLogout={logout} onRefresh={() => loadMe(token!)} />;
}

function Splash() { return <LinearGradient colors={["#004d2f", "#0d683e", "#d3aa27"]} style={styles.splash}><StatusBar style="light" /><Image source={require("./assets/skou-crest.png")} style={styles.splashLogo} /><Text style={styles.splashLabel}>VILLIERSDORP LANDBOU SKOU</Text><Text style={styles.splashTitle}>Welkom by die Skou-app</Text><Text style={styles.splashCopy}>Alles wat jy vir die skou nodig het, in jou hand.</Text></LinearGradient>; }

function Auth({ mode, token, onMode, onSignedIn, onVerified }: { mode: AuthMode; token: string | null; onMode: (mode: AuthMode) => void; onSignedIn: (token: string, verify?: boolean) => Promise<void>; onVerified: () => Promise<void> }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [identifier, setIdentifier] = useState(""), [name, setName] = useState(""), [email, setEmail] = useState(""), [phone, setPhone] = useState(""), [password, setPassword] = useState(""), [code, setCode] = useState(""), [resetToken, setResetToken] = useState("");
  const submit = async () => {
    setBusy(true); setError("");
    try {
      if (mode === "verify") {
        await request("/api/app/verify-email", { method: "POST", body: JSON.stringify({ code }) }, token);
        await onVerified();
      } else if (mode === "forgot") {
        await request("/api/app/password-reset/request", { method: "POST", body: JSON.stringify({ email }) });
        onMode("reset-code");
      } else if (mode === "reset-code") {
        const result = await request("/api/app/password-reset/verify", { method: "POST", body: JSON.stringify({ email, code }) });
        setResetToken(result.reset_token); onMode("reset-password");
      } else if (mode === "reset-password") {
        await request("/api/app/password-reset/complete", { method: "POST", body: JSON.stringify({ email, reset_token: resetToken, password }) });
        setPassword(""); setCode(""); setResetToken(""); onMode("login");
      } else {
        const path = mode === "login" ? "/api/app/login" : "/api/app/register";
        const body = mode === "login" ? { identifier, password } : { name, email, phone, password };
        const result = await request(path, { method: "POST", body: JSON.stringify(body) });
        if (!result.access_token) throw new Error("Die native sessie kon nie geskep word nie");
        await onSignedIn(result.access_token, Boolean(result.requires_verification));
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Die versoek het misluk"); } finally { setBusy(false); }
  };
  const title = mode === "login" ? "Welkom terug" : mode === "register" ? "Skep jou rekening" : mode === "verify" ? "Bevestig jou e-pos" : mode === "forgot" ? "Herstel jou wagwoord" : mode === "reset-code" ? "Tik jou kode" : "Kies ’n nuwe wagwoord";
  const action = mode === "login" ? "Teken in" : mode === "register" ? "Registreer" : mode === "verify" ? "Bevestig rekening" : mode === "forgot" ? "Stuur herstelkode" : mode === "reset-code" ? "Bevestig kode" : "Verander wagwoord";
  return <SafeAreaView style={styles.authSafe}><StatusBar style="dark" /><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}><ScrollView contentContainerStyle={styles.authWrap} keyboardShouldPersistTaps="handled"><View style={styles.authBrand}><Image source={require("./assets/skou-crest.png")} style={styles.authLogo} /><View style={styles.flex}><Text style={styles.authLabel}>VILLIERSDORP LANDBOU SKOU</Text><Text style={styles.authTitle}>{title}</Text></View></View><View style={styles.authCard}>{mode === "verify" ? <><Text style={styles.intro}>Tik die 6-syfer kode wat ons na jou e-pos gestuur het.</Text><Field label="Verifikasiekode" value={code} onChange={setCode} keyboard="number-pad" /></> : mode === "forgot" ? <><Text style={styles.intro}>Ons stuur ’n eenmalige kode na die e-posadres op jou rekening.</Text><Field label="E-posadres" value={email} onChange={setEmail} keyboard="email-address" /></> : mode === "reset-code" ? <><Text style={styles.intro}>Tik die 6-syfer kode wat ons na {email} gestuur het.</Text><Field label="Herstelkode" value={code} onChange={setCode} keyboard="number-pad" /></> : mode === "reset-password" ? <><Text style={styles.intro}>Gebruik minstens 8 karakters vir jou nuwe wagwoord.</Text><Field label="Nuwe wagwoord" value={password} onChange={setPassword} secure /></> : <>{mode === "register" && <><Field label="Volle naam" value={name} onChange={setName} /><Field label="E-posadres" value={email} onChange={setEmail} keyboard="email-address" /><Field label="Selfoonnommer" value={phone} onChange={setPhone} keyboard="phone-pad" /></>}{mode === "login" && <Field label="E-pos, selfoon of gebruikersnaam" value={identifier} onChange={setIdentifier} keyboard="email-address" />}<Field label="Wagwoord" value={password} onChange={setPassword} secure /></>}{error ? <Text style={styles.error}>{error}</Text> : null}<Pressable style={styles.primary} onPress={submit} disabled={busy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>{action}</Text>}</Pressable>{mode === "login" && <Pressable onPress={() => onMode("forgot")}><Text style={styles.textButton}>Wagwoord vergeet?</Text></Pressable>}{mode !== "verify" && <Pressable onPress={() => onMode(mode === "login" ? "register" : "login")}><Text style={styles.textButton}>{mode === "login" ? "Nog nie geregistreer nie? Registreer" : "Terug na aanmelding"}</Text></Pressable>}</View></ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

function Field({ label, value, onChange, secure, keyboard }: { label: string; value: string; onChange: (value: string) => void; secure?: boolean; keyboard?: "default" | "email-address" | "phone-pad" | "number-pad" }) { return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChange} secureTextEntry={secure} autoCapitalize={keyboard === "email-address" ? "none" : "sentences"} keyboardType={keyboard || "default"} style={styles.input} /></View>; }

function MainApp({ me, token, screen, onScreen, onLogout, onRefresh }: { me: Me; token: string; screen: Screen; onScreen: (screen: Screen) => void; onLogout: () => void; onRefresh: () => Promise<void> }) {
  const view = roleView(me.user.role), [preview, setPreview] = useState<RoleView>(view), grouped = useMemo(() => moduleGroups.filter((group) => group.roles.includes(preview)).map((group) => ({ ...group, items: group.modules.map((key) => modules.find((item) => item.key === key)).filter((item): item is Module => {
    if (!item) return false;
    return item.roles.includes(preview) && canUseModule(me.user, item);
  }) })).filter((group) => group.items.length > 0), [preview, me.user]);
  const walletTotal = me.wallets.reduce((sum, wallet) => sum + wallet.balance_cents, 0);
  const openModule = (item: Module) => item.href ? void Linking.openURL(item.href) : onScreen(item.key as Screen);
  return <SafeAreaView style={styles.appSafe}><StatusBar style="dark" /><View style={styles.topbar}><Image source={require("./assets/skou-crest.png")} style={styles.topLogo} /><View style={styles.topBrand}><Text style={styles.topName}>VILLIERSDORP</Text><Text style={styles.topSub}>LANDBOU SKOU · AGRI SHOW</Text></View><Text style={styles.topDate}>23–24 OKT 2026</Text></View><View style={styles.appBody}>{screen === "home" ? <ScrollView contentContainerStyle={styles.content}><LinearGradient colors={["#06452e", "#087344"]} style={styles.hero}><Text style={styles.heroLabel}>WELKOM TERUG</Text><Text style={styles.heroTitle}>{me.user.name}</Text><Text style={styles.heroCopy}>Alles wat jy vir die Skou nodig het, op een plek.</Text><Text style={styles.rolePill}>{preview.toUpperCase()}</Text></LinearGradient><View style={styles.summaryRow}><Summary value={String(me.tickets.length)} label="My kaartjies" onPress={() => onScreen("tickets")} /><Summary value={`R ${(walletTotal / 100).toFixed(2)}`} label="Beursiebalans" onPress={() => onScreen("wallet")} /></View><View style={styles.headingRow}><View><Text style={styles.eyebrow}>JOU TOEGANG</Text><Text style={styles.heading}>Wat wil jy doen?</Text></View><Text style={styles.optionCount}>{grouped.length} groepe</Text></View><View style={styles.moduleList}>{grouped.map((group) => <View key={group.key} style={styles.groupCard}><View style={styles.groupHeader}><Text style={styles.moduleIcon}>{group.icon}</Text><View style={styles.moduleCopy}><Text style={styles.moduleTitle}>{group.title}</Text><Text style={styles.moduleDetail}>{group.detail}</Text></View></View><View style={styles.groupActions}>{group.items.map((item) => <Pressable key={item.key} style={styles.groupAction} onPress={() => openModule(item)}><Text style={styles.groupActionText}>{item.title}</Text></Pressable>)}</View></View>)}</View></ScrollView> : <ModuleScreen screen={screen} me={me} token={token} actualView={view} preview={preview} onPreview={setPreview} onBack={() => onScreen("home")} onLogout={onLogout} onRefresh={onRefresh} />}</View><View style={styles.bottomNav}><NavItem icon="⌂" label="Tuis" active={screen === "home"} onPress={() => onScreen("home")} /><NavItem icon="◉" label="Boodskappe" active={screen === "messages"} onPress={() => onScreen("messages")} /><NavItem icon="▣" label="Kalender" active={screen === "calendar"} onPress={() => onScreen("calendar")} /><NavItem icon="◎" label="Profiel" active={screen === "profile"} onPress={() => onScreen("profile")} /></View></SafeAreaView>;
}

function Summary({ value, label, onPress }: { value: string; label: string; onPress: () => void }) { return <Pressable style={styles.summary} onPress={onPress}><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></Pressable>; }

function NavItem({ icon, label, active, onPress }: { icon: string; label: string; active: boolean; onPress: () => void }) { return <Pressable style={styles.navItem} onPress={onPress}><Text style={[styles.navIcon, active && styles.navActive]}>{icon}</Text><Text style={[styles.navLabel, active && styles.navActive]}>{label}</Text></Pressable>; }

function NativeTicketPurchase({ user, tickets }: { user: User; tickets: Ticket[] }) {
  const [buying, setBuying] = useState(false), [event, setEvent] = useState<TicketEvent | null>(null), [types, setTypes] = useState<TicketType[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({}), [genders, setGenders] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(false), [error, setError] = useState("");
  const loadCatalogue = async () => {
    if (types.length) return;
    setLoading(true); setError("");
    try {
      const result = await request("/api/public/events/villiersdorp-skou-2026");
      setEvent(result.event || null);
      setTypes(result.ticket_types || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kaartjies kon nie gelaai word nie");
    } finally {
      setLoading(false);
    }
  };
  const openBuying = () => { setBuying(true); void loadCatalogue(); };
  const setQuantity = (type: TicketType, next: number) => {
    const limit = Number(type.per_order_limit || 20);
    setQuantities((current) => ({ ...current, [type.id]: Math.max(0, Math.min(limit, next)) }));
  };
  const total = types.reduce((sum, type) => sum + (quantities[type.id] || 0) * type.price_cents, 0);
  const count = Object.values(quantities).reduce((sum, quantity) => sum + quantity, 0);
  const buy = async () => {
    if (!event || !count) return;
    if (total <= 0) {
      setError("Gratis kaartjies moet saam met minstens een betaalde kaartjie gekies word.");
      return;
    }
    const missingGender = types.some((type) => Boolean(type.requires_gender) && Array.from({ length: quantities[type.id] || 0 }).some((_, index) => !genders[`${type.id}-${index}`]));
    if (missingGender) {
      setError("Kies asseblief die vereiste besonderhede vir elke kaartjie.");
      return;
    }
    setBusy(true); setError("");
    try {
      const nameParts = user.name.trim().split(/\s+/);
      const first = nameParts.shift() || user.name;
      const last = nameParts.join(" ");
      const items = types.filter((type) => (quantities[type.id] || 0) > 0).map((type) => ({ ticket_type_id: type.id, qty: quantities[type.id] }));
      const attendees = types.flatMap((type) => Array.from({ length: quantities[type.id] || 0 }, (_, index) => ({ ticket_type_id: type.id, attendee_first: first, attendee_last: last, phone: user.phone || "", gender: Boolean(type.requires_gender) ? genders[`${type.id}-${index}`] || "" : "" })));
      const order = await request("/api/public/orders/create", { method: "POST", body: JSON.stringify({ event_id: event.id, items, attendees, buyer_name: user.name, email: user.email || "", phone: user.phone || "", method: "pay_now" }) });
      const code = order.order?.short_code;
      if (!code) throw new Error("Die bestelling kon nie geskep word nie");
      const payment = await request("/api/payments/yoco/intent", { method: "POST", body: JSON.stringify({ code, app_return: true }) });
      if (!payment.redirect_url) throw new Error("Yoco-betaling kon nie begin nie");
      await Linking.openURL(payment.redirect_url);
      Alert.alert("Yoco-betaling oopgemaak", "Jou kaartjies sal in die app wys nadat Yoco die betaling bevestig het.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Die kaartjie-aankoop het misluk");
    } finally {
      setBusy(false);
    }
  };
  return <><Text style={styles.screenTitle}>My Kaartjies</Text><View style={styles.methodRow}><Pressable style={[styles.methodChip, !buying && styles.methodChipActive]} onPress={() => setBuying(false)}><Text style={[styles.methodChipText, !buying && styles.methodChipTextActive]}>My kaartjies</Text></Pressable><Pressable style={[styles.methodChip, buying && styles.methodChipActive]} onPress={openBuying}><Text style={[styles.methodChipText, buying && styles.methodChipTextActive]}>Koop kaartjies</Text></Pressable></View>{error ? <Text style={styles.error}>{error}</Text> : null}{buying ? <View style={styles.topupPanel}>{loading ? <ActivityIndicator color="#087344" /> : <><Text style={styles.noticeTitle}>{event?.name || "Villiersdorp Skou 2026"}</Text>{event?.sales_closed ? <Text style={styles.error}>Aanlyn kaartjieverkope is gesluit.</Text> : types.map((type) => { const quantity = quantities[type.id] || 0; return <View key={type.id} style={styles.purchaseType}><View style={styles.flex}><Text style={styles.moduleTitle}>{type.name}</Text><Text style={styles.moduleDetail}>{formatRand(type.price_cents)}</Text></View><View style={styles.quantityRow}><Pressable style={styles.qtyButton} disabled={!quantity} onPress={() => setQuantity(type, quantity - 1)}><Text style={styles.qtyText}>−</Text></Pressable><Text style={styles.qtyValue}>{quantity}</Text><Pressable style={styles.qtyButton} onPress={() => setQuantity(type, quantity + 1)}><Text style={styles.qtyText}>+</Text></Pressable></View>{Boolean(type.requires_gender) && quantity > 0 && <View style={styles.genderPanel}>{Array.from({ length: quantity }, (_, index) => <View key={index} style={styles.methodRow}><Text style={styles.genderLabel}>Kaartjie {index + 1}</Text><Pressable style={[styles.genderChip, genders[`${type.id}-${index}`] === "female" && styles.methodChipActive]} onPress={() => setGenders((current) => ({ ...current, [`${type.id}-${index}`]: "female" }))}><Text style={styles.methodChipText}>Vroulik</Text></Pressable><Pressable style={[styles.genderChip, genders[`${type.id}-${index}`] === "male" && styles.methodChipActive]} onPress={() => setGenders((current) => ({ ...current, [`${type.id}-${index}`]: "male" }))}><Text style={styles.methodChipText}>Manlik</Text></Pressable></View>)}</View>}</View>; })}<View style={styles.purchaseTotal}><Text style={styles.noticeTitle}>{count} kaartjie(s)</Text><Text style={styles.barTotal}>{formatRand(total)}</Text></View><Pressable style={[styles.primary, (busy || !count || total <= 0 || Boolean(event?.sales_closed)) && styles.disabled]} disabled={busy || !count || total <= 0 || Boolean(event?.sales_closed)} onPress={buy}>{busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Betaal veilig met Yoco</Text>}</Pressable></>}</View> : tickets.length ? tickets.map((ticket) => <View key={ticket.id} style={styles.ticketCard}><Text style={styles.ticketIcon}>🎟️</Text><View style={styles.flex}><Text style={styles.moduleTitle}>{ticket.ticket_name}</Text><Text style={styles.moduleDetail}>{ticket.event_name}{ticket.short_code ? ` · ${ticket.short_code}` : ""}</Text></View><Pressable onPress={() => void Linking.openURL(ticket.qr_url)}><Text style={styles.openText}>Wys QR</Text></Pressable></View>) : <View style={styles.notice}><Text style={styles.noticeTitle}>Geen kaartjies gevind nie</Text><Text style={styles.noticeCopy}>Nuwe aankope wat by jou bevestigde e-pos en selfoon pas, verskyn outomaties hier.</Text></View>}</>;
}

function ModuleScreen({ screen, me, token, actualView, preview, onPreview, onBack, onLogout, onRefresh }: { screen: Screen; me: Me; token: string; actualView: RoleView; preview: RoleView; onPreview: (view: RoleView) => void; onBack: () => void; onLogout: () => void; onRefresh: () => Promise<void> }) {
  const [family, setFamily] = useState<FamilyMember[]>([]), [loading, setLoading] = useState(screen === "family"), [adding, setAdding] = useState(false), [name, setName] = useState(""), [relationship, setRelationship] = useState("");
  const [selectedWalletId, setSelectedWalletId] = useState(me.wallets[0]?.id || ""), [topupAmount, setTopupAmount] = useState(10000), [topupBusy, setTopupBusy] = useState(false);
  const [barTransactions, setBarTransactions] = useState<BarTransaction[]>([]), [barLoading, setBarLoading] = useState(false), [barError, setBarError] = useState(""), [canRefund, setCanRefund] = useState(false);
  const [activeRefundId, setActiveRefundId] = useState<number | null>(null), [refundBusyId, setRefundBusyId] = useState<number | null>(null), [refundMethod, setRefundMethod] = useState<Record<number, "wallet" | "card">>({}), [refundReason, setRefundReason] = useState<Record<number, string>>({}), [refundKeys, setRefundKeys] = useState<Record<number, string>>({});
  const loadFamily = async () => { setLoading(true); try { const result = await request("/api/app/family", {}, token); setFamily(result.family || []); } catch (err) { Alert.alert("Kon nie laai nie", err instanceof Error ? err.message : "Probeer weer"); } finally { setLoading(false); } };
  const loadBarTransactions = async () => { setBarLoading(true); setBarError(""); try { const result = await request("/api/app/bar/transactions?limit=15", {}, token); setBarTransactions(result.transactions || []); setCanRefund(Boolean(result.can_refund)); } catch (err) { setBarError(err instanceof Error ? err.message : "Kroegtransaksies kon nie gelaai word nie"); } finally { setBarLoading(false); } };
  useEffect(() => { if (screen === "family" || screen === "tickets") void loadFamily(); }, [screen]);
  useEffect(() => { if (screen === "bar") void loadBarTransactions(); }, [screen]);
  const addMember = async () => { try { await request("/api/app/family", { method: "POST", body: JSON.stringify({ name, relationship }) }, token); setName(""); setRelationship(""); setAdding(false); await loadFamily(); } catch (err) { Alert.alert("Kon nie stoor nie", err instanceof Error ? err.message : "Probeer weer"); } };
  const paymentLabel = (transaction: BarTransaction) => !transaction.payment ? "Geen betaling" : transaction.payment.method === "event_balance" ? "Skoubeursie" : transaction.payment.method.includes("yoco") || transaction.payment.provider === "yoco" ? "Yoco-kaart" : transaction.payment.method;
  const submitBarRefund = async (transaction: BarTransaction) => {
    const reason = String(refundReason[transaction.id] || "").trim();
    if (reason.length < 3) {
      Alert.alert("Rede nodig", "Gee asseblief ’n kort rede vir die refund.");
      return;
    }
    const method = refundMethod[transaction.id] || (transaction.payment?.method === "event_balance" ? "wallet" : "card");
    const idempotencyKey = refundKeys[transaction.id] || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setRefundKeys((current) => ({ ...current, [transaction.id]: idempotencyKey }));
    setRefundBusyId(transaction.id);
    try {
      const result = await request(`/api/app/bar/transactions/${transaction.id}/refund`, { method: "POST", body: JSON.stringify({ amount_cents: transaction.refundable_cents, method, reason, idempotency_key: idempotencyKey }) }, token);
      if (result.transaction) setBarTransactions((current) => current.map((row) => row.id === transaction.id ? result.transaction : row));
      setActiveRefundId(null);
      setRefundReason((current) => ({ ...current, [transaction.id]: "" }));
      setRefundKeys((current) => { const next = { ...current }; delete next[transaction.id]; return next; });
      Alert.alert("Refund gestoor", result.refund?.status === "pending_provider" ? "Refund is veilig aangeteken. Yoco het nog nie finaal bevestig nie; verfris transaksies oor ’n oomblik." : "Refund is voltooi en die transaksie is opgedateer.");
    } catch (err) {
      Alert.alert("Refund kon nie stoor nie", err instanceof Error ? err.message : "Probeer weer");
    } finally {
      setRefundBusyId(null);
    }
  };
  const startTopup = async () => {
    if (!selectedWalletId) {
      Alert.alert("Geen beursie", "Daar is nog nie ’n beursie aan hierdie rekening gekoppel nie.");
      return;
    }
    setTopupBusy(true);
    try {
      const result = await request(`/api/app/wallets/${encodeURIComponent(selectedWalletId)}/topup-intent`, { method: "POST", body: JSON.stringify({ amount_cents: topupAmount }) }, token);
      if (!result.redirect_url) throw new Error("Yoco-betaling kon nie begin nie");
      await Linking.openURL(result.redirect_url);
      Alert.alert("Yoco-betaling oopgemaak", "Voltooi die betaling, keer terug na die app, en druk dan Verfris rekening.");
    } catch (err) {
      Alert.alert("Kon nie beursie aanvul nie", err instanceof Error ? err.message : "Probeer weer");
    } finally {
      setTopupBusy(false);
    }
  };
  if (screen === "tickets") return <ScrollView contentContainerStyle={styles.content}><Pressable style={styles.back} onPress={onBack}><Text style={styles.backText}>‹ Terug</Text></Pressable><NativeTicketPurchase user={me.user} tickets={me.tickets} /></ScrollView>;
  return <ScrollView contentContainerStyle={styles.content}><Pressable style={styles.back} onPress={onBack}><Text style={styles.backText}>‹ Terug</Text></Pressable>{screen === "messages" && <><Text style={styles.screenTitle}>Boodskappe</Text><View style={styles.notice}><Text style={styles.noticeTitle}>Amptelike kennisgewings</Text><Text style={styles.noticeCopy}>Belangrike Skou-opdaterings en hulpboodskappe sal hier verskyn.</Text></View></>}{screen === "calendar" && <><Text style={styles.screenTitle}>Kalender</Text><View style={styles.ticketCard}><Text style={styles.ticketIcon}>📅</Text><View><Text style={styles.moduleTitle}>Vrydag, 23 Oktober 2026</Text><Text style={styles.moduleDetail}>Skoudag 1</Text></View></View><View style={styles.ticketCard}><Text style={styles.ticketIcon}>📅</Text><View><Text style={styles.moduleTitle}>Saterdag, 24 Oktober 2026</Text><Text style={styles.moduleDetail}>Skoudag 2</Text></View></View></>}{screen === "wallet" && <><Text style={styles.screenTitle}>Skoubeursie</Text>{me.wallets.length === 0 ? <View style={styles.notice}><Text style={styles.noticeTitle}>Geen beursie gekoppel nie</Text><Text style={styles.noticeCopy}>Sodra ’n beursie of NFC-kaart aan jou rekening gekoppel word, sal dit hier wys.</Text></View> : me.wallets.map((wallet) => <Pressable key={wallet.id} style={[styles.walletCard, selectedWalletId === wallet.id && styles.walletCardActive]} onPress={() => setSelectedWalletId(wallet.id)}><Text style={styles.walletName}>{wallet.name}</Text><Text style={styles.walletBalance}>{formatRand(wallet.balance_cents)}</Text><View style={styles.walletActions}><Pressable style={styles.secondaryButton} onPress={() => void Linking.openURL(`${API_BASE}/w/${encodeURIComponent(wallet.id)}`)}><Text style={styles.secondaryButtonText}>Maak oop</Text></Pressable><Text style={styles.openText}>{selectedWalletId === wallet.id ? "Gekies vir aanvulling" : "Tik om te kies"}</Text></View></Pressable>)}<View style={styles.topupPanel}><Text style={styles.noticeTitle}>Laai beursie met Yoco</Text><Text style={styles.noticeCopy}>Kies ’n bedrag, betaal veilig met Yoco, en verfris dan jou rekening om die nuwe balans te sien.</Text><View style={styles.amountRow}>{[5000, 10000, 20000, 50000].map((amount) => <Pressable key={amount} style={[styles.amountChip, topupAmount === amount && styles.amountChipActive]} onPress={() => setTopupAmount(amount)}><Text style={[styles.amountChipText, topupAmount === amount && styles.amountChipTextActive]}>{formatRand(amount)}</Text></Pressable>)}</View><Pressable style={[styles.primary, (!selectedWalletId || topupBusy) && styles.disabled]} onPress={startTopup} disabled={!selectedWalletId || topupBusy}>{topupBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Laai {formatRand(topupAmount)}</Text>}</Pressable><Pressable style={styles.profileShortcut} onPress={() => void onRefresh()}><Text style={styles.profileShortcutText}>Verfris rekening</Text></Pressable></View></>}{screen === "family" && <><Text style={styles.screenTitle}>My Familie</Text><Text style={styles.intro}>Bestuur die mense vir wie jy kaartjies koop en hou.</Text>{loading ? <ActivityIndicator color="#087344" /> : family.map((member) => <View key={member.id} style={styles.familyRow}><View style={styles.familyAvatar}><Text style={styles.familyInitial}>{member.name.charAt(0)}</Text></View><View><Text style={styles.moduleTitle}>{member.name}</Text><Text style={styles.moduleDetail}>{member.relationship || "Familielid"}</Text></View></View>)}{adding ? <View style={styles.inlineForm}><Field label="Volle naam" value={name} onChange={setName} /><Field label="Verwantskap" value={relationship} onChange={setRelationship} /><Pressable style={styles.primary} onPress={addMember}><Text style={styles.primaryText}>Stoor familielid</Text></Pressable></View> : <Pressable style={styles.primary} onPress={() => setAdding(true)}><Text style={styles.primaryText}>Voeg familielid by</Text></Pressable>}</>}{screen === "bar" && <><Text style={styles.screenTitle}>Kroegtransaksies</Text><View style={styles.notice}><Text style={styles.noticeTitle}>Staff toegang</Text><Text style={styles.noticeCopy}>Net gebruikers met kroeg- of refund-regte kan transaksies sien en refunds stoor. Die bediener kontroleer dit weer.</Text></View><Pressable style={styles.primary} onPress={() => void loadBarTransactions()} disabled={barLoading}>{barLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Verfris transaksies</Text>}</Pressable>{barError ? <Text style={styles.error}>{barError}</Text> : null}{barLoading && barTransactions.length === 0 ? <ActivityIndicator color="#087344" /> : barTransactions.length === 0 ? <View style={styles.notice}><Text style={styles.noticeTitle}>Geen transaksies</Text><Text style={styles.noticeCopy}>Sodra kroegverkope deur POS V1 loop, sal die laaste 15 transaksies hier verskyn.</Text></View> : barTransactions.map((transaction) => { const defaultMethod = transaction.payment?.method === "event_balance" ? "wallet" : "card"; const selectedMethod = refundMethod[transaction.id] || defaultMethod; const refundOpen = activeRefundId === transaction.id; return <View key={transaction.id} style={styles.barCard}><View style={styles.barHeader}><View style={styles.flex}><Text style={styles.barCode}>{transaction.order_code || `Transaksie #${transaction.id}`}</Text><Text style={styles.moduleDetail}>{transaction.location_name || "Kroeg"} · {transaction.operator_name || "Onbekende kassier"}</Text><Text style={styles.moduleDetail}>{new Date(transaction.created_at * 1000).toLocaleString("af-ZA")}</Text></View><Text style={styles.barTotal}>{formatRand(transaction.total_cents)}</Text></View><View style={styles.barMetaRow}><Text style={styles.barPill}>{paymentLabel(transaction)}</Text><Text style={styles.barPill}>{transaction.customer_name || "Walk-in"}</Text>{transaction.refunded_cents > 0 && <Text style={styles.barPill}>Refunds {formatRand(transaction.refunded_cents)}</Text>}</View>{transaction.items.map((item) => <View key={item.id} style={styles.barItemRow}><Text style={styles.flex}>{item.name}</Text><Text style={styles.moduleDetail}>{item.qty} × {formatRand(item.unit_price_cents)}</Text></View>)}{transaction.refunds.map((refund) => <Text key={String(refund.id)} style={styles.refundHistory}>{refund.method} · {formatRand(refund.amount_cents)} · {refund.status}</Text>)}{canRefund && transaction.refundable_cents > 0 && <><Pressable style={styles.refundToggle} onPress={() => setActiveRefundId(refundOpen ? null : transaction.id)}><Text style={styles.refundToggleText}>{refundOpen ? "Maak refund toe" : `Refund ${formatRand(transaction.refundable_cents)}`}</Text></Pressable>{refundOpen && <View style={styles.refundPanel}><Text style={styles.noticeTitle}>Refund metode</Text><View style={styles.methodRow}><Pressable style={[styles.methodChip, selectedMethod === "wallet" && styles.methodChipActive]} onPress={() => setRefundMethod((current) => ({ ...current, [transaction.id]: "wallet" }))}><Text style={[styles.methodChipText, selectedMethod === "wallet" && styles.methodChipTextActive]}>Beursie</Text></Pressable><Pressable style={[styles.methodChip, selectedMethod === "card" && styles.methodChipActive]} onPress={() => setRefundMethod((current) => ({ ...current, [transaction.id]: "card" }))}><Text style={[styles.methodChipText, selectedMethod === "card" && styles.methodChipTextActive]}>Yoco-kaart</Text></Pressable></View>{selectedMethod === "card" && <Text style={styles.noticeCopy}>Die app probeer die Yoco-kaart refund dadelik. As Yoco stadig antwoord, word die refund veilig as opvolg aangeteken met dieselfde refund-sleutel.</Text>}<TextInput style={[styles.input, styles.reasonInput]} value={refundReason[transaction.id] || ""} onChangeText={(value) => setRefundReason((current) => ({ ...current, [transaction.id]: value }))} placeholder="Rede vir refund" multiline /><Pressable style={styles.dangerButton} onPress={() => void submitBarRefund(transaction)} disabled={refundBusyId === transaction.id}>{refundBusyId === transaction.id ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Stoor refund</Text>}</Pressable></View>}</>}</View>; })}</>}{screen === "profile" && <><Text style={styles.screenTitle}>Profiel</Text><View style={styles.profileCard}><View style={styles.profileAvatar}><Text style={styles.profileInitial}>{me.user.name.charAt(0)}</Text></View><Text style={styles.profileName}>{me.user.name}</Text><Text style={styles.moduleDetail}>{me.user.email || me.user.phone}</Text><Text style={styles.rolePill}>{actualView.toUpperCase()}</Text></View>{actualView === "committee" && <View style={styles.roleSwitcher}><Text style={styles.noticeTitle}>Kyk as</Text>{(["visitor", "vendor", "staff", "committee"] as RoleView[]).map((item) => <Pressable key={item} style={[styles.roleOption, preview === item && styles.roleOptionActive]} onPress={() => onPreview(item)}><Text style={[styles.roleOptionText, preview === item && styles.roleOptionTextActive]}>{item}</Text></Pressable>)}<Text style={styles.noticeCopy}>Dit verander net die aansig. Die bediener dwing steeds jou werklike regte af.</Text></View>}<Pressable style={styles.logout} onPress={onLogout}><Text style={styles.logoutText}>Teken uit</Text></Pressable><Pressable style={styles.profileShortcut} onPress={() => void onRefresh()}><Text style={styles.profileShortcutText}>Verfris rekening</Text></Pressable></>}</ScrollView>;
}

const styles = StyleSheet.create({
  flex:{flex:1},splash:{flex:1,alignItems:"center",justifyContent:"center",padding:34},splashLogo:{width:150,height:150,borderRadius:75},splashLabel:{marginTop:28,color:"#f1d487",fontSize:12,fontWeight:"900",letterSpacing:2},splashTitle:{marginTop:18,color:"#fff",fontFamily:Platform.OS==="ios"?"Georgia":undefined,fontSize:34,fontWeight:"800",textAlign:"center"},splashCopy:{marginTop:16,maxWidth:280,color:"#e6f1e9",fontSize:16,lineHeight:24,textAlign:"center"},
  authSafe:{flex:1,backgroundColor:"#f6f0e4"},authWrap:{padding:20,paddingTop:44},authBrand:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:28},authLogo:{width:72,height:72,borderRadius:20},authLabel:{color:"#087344",fontSize:10,fontWeight:"900",letterSpacing:1.5},authTitle:{color:"#173c2c",fontFamily:Platform.OS==="ios"?"Georgia":undefined,fontSize:31,fontWeight:"800"},authCard:{gap:14,padding:20,borderWidth:1,borderColor:"#ded6c8",borderRadius:26,backgroundColor:"#fff"},intro:{color:"#69766f",fontSize:15,lineHeight:22},field:{gap:6},fieldLabel:{color:"#173c2c",fontSize:13,fontWeight:"800"},input:{minHeight:52,paddingHorizontal:14,borderWidth:1,borderColor:"#d8d3ca",borderRadius:14,backgroundColor:"#fff",fontSize:16,color:"#173c2c"},primary:{minHeight:52,alignItems:"center",justifyContent:"center",marginTop:6,paddingHorizontal:18,borderRadius:15,backgroundColor:"#087c42"},primaryText:{color:"#fff",fontSize:16,fontWeight:"900"},textButton:{padding:8,color:"#426052",fontWeight:"700",textAlign:"center"},error:{padding:12,borderRadius:12,backgroundColor:"#fde9e8",color:"#a82b24",fontWeight:"700"},
  appSafe:{flex:1,backgroundColor:"#f5efe4"},appBody:{flex:1},topbar:{minHeight:72,flexDirection:"row",alignItems:"center",gap:10,paddingHorizontal:16,borderBottomWidth:1,borderColor:"#ded6c8",backgroundColor:"#f8f3e9"},topLogo:{width:52,height:52,borderRadius:14},topBrand:{flex:1},topName:{color:"#087344",fontSize:13,fontWeight:"900",letterSpacing:1.6},topSub:{marginTop:2,color:"#66766e",fontSize:8,fontWeight:"700"},topDate:{color:"#725614",fontSize:10,fontWeight:"900"},content:{padding:16,paddingBottom:42},hero:{position:"relative",overflow:"hidden",minHeight:210,padding:23,borderRadius:26},heroLabel:{color:"#e0bf67",fontSize:11,fontWeight:"900",letterSpacing:1.5},heroTitle:{maxWidth:"78%",marginTop:8,color:"#fff",fontFamily:Platform.OS==="ios"?"Georgia":undefined,fontSize:31,fontWeight:"800"},heroCopy:{maxWidth:"72%",marginTop:12,color:"#dcece1",fontSize:14,lineHeight:21},rolePill:{alignSelf:"flex-start",marginTop:18,paddingHorizontal:10,paddingVertical:6,borderRadius:999,overflow:"hidden",backgroundColor:"#ffffff24",color:"#fff",fontSize:9,fontWeight:"900",letterSpacing:1},summaryRow:{flexDirection:"row",gap:10,marginTop:14},summary:{flex:1,padding:15,borderWidth:1,borderColor:"#ded6c8",borderRadius:17,backgroundColor:"#fff"},summaryValue:{color:"#173c2c",fontSize:20,fontWeight:"900"},summaryLabel:{marginTop:3,color:"#6a776f",fontSize:11},headingRow:{flexDirection:"row",alignItems:"flex-end",justifyContent:"space-between",marginTop:25,marginBottom:12},eyebrow:{color:"#087344",fontSize:10,fontWeight:"900",letterSpacing:1.4},heading:{marginTop:4,color:"#173c2c",fontFamily:Platform.OS==="ios"?"Georgia":undefined,fontSize:25,fontWeight:"800"},optionCount:{color:"#6a776f",fontSize:11},moduleList:{gap:10},moduleCard:{minHeight:82,flexDirection:"row",alignItems:"center",gap:12,padding:14,borderWidth:1,borderColor:"#ded6c8",borderRadius:17,backgroundColor:"#fff"},groupCard:{gap:12,padding:14,borderWidth:1,borderColor:"#ded6c8",borderRadius:17,backgroundColor:"#fff"},groupHeader:{flexDirection:"row",alignItems:"center",gap:12},groupActions:{flexDirection:"row",flexWrap:"wrap",gap:8},groupAction:{paddingHorizontal:12,paddingVertical:9,borderRadius:999,backgroundColor:"#e8f2e9"},groupActionText:{color:"#087344",fontSize:11,fontWeight:"900"},moduleIcon:{width:45,fontSize:27,textAlign:"center"},moduleCopy:{flex:1},moduleTitle:{color:"#173c2c",fontSize:15,fontWeight:"900"},moduleDetail:{marginTop:3,color:"#6a776f",fontSize:12,lineHeight:17},chevron:{color:"#a3998e",fontSize:30},bottomNav:{minHeight:66,flexDirection:"row",borderTopWidth:1,borderColor:"#ded6c8",backgroundColor:"#fff"},navItem:{flex:1,alignItems:"center",justifyContent:"center",gap:2},navIcon:{color:"#849088",fontSize:20,fontWeight:"900"},navLabel:{color:"#849088",fontSize:9,fontWeight:"800"},navActive:{color:"#087344"},
  back:{alignSelf:"flex-start",marginBottom:18,paddingVertical:8,paddingRight:16},backText:{color:"#087344",fontSize:16,fontWeight:"900"},screenTitle:{marginBottom:15,color:"#173c2c",fontFamily:Platform.OS==="ios"?"Georgia":undefined,fontSize:32,fontWeight:"800"},ticketCard:{flexDirection:"row",alignItems:"center",gap:10,marginTop:10,padding:15,borderWidth:1,borderColor:"#ded6c8",borderRadius:17,backgroundColor:"#fff"},ticketIcon:{fontSize:24},openText:{color:"#087344",fontSize:11,fontWeight:"900"},walletCard:{marginBottom:10,padding:18,borderWidth:2,borderColor:"#07472f",borderRadius:20,backgroundColor:"#07472f"},walletCardActive:{borderColor:"#d3aa27"},walletName:{color:"#cfe3d5",fontSize:13,fontWeight:"700"},walletBalance:{marginTop:8,color:"#fff",fontSize:30,fontWeight:"900"},walletActions:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:10,marginTop:14},secondaryButton:{paddingHorizontal:13,paddingVertical:9,borderRadius:12,backgroundColor:"#fff"},secondaryButtonText:{color:"#07472f",fontSize:12,fontWeight:"900"},topupPanel:{gap:12,marginTop:14,padding:15,borderWidth:1,borderColor:"#ded6c8",borderRadius:18,backgroundColor:"#fff"},amountRow:{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:4},amountChip:{paddingHorizontal:13,paddingVertical:10,borderWidth:1,borderColor:"#ded6c8",borderRadius:999,backgroundColor:"#fff"},amountChipActive:{borderColor:"#087344",backgroundColor:"#e8f2e9"},amountChipText:{color:"#596a60",fontWeight:"900"},amountChipTextActive:{color:"#087344"},disabled:{opacity:.55},notice:{marginTop:14,padding:15,borderRadius:16,backgroundColor:"#e8f1e4"},noticeTitle:{color:"#2f5538",fontWeight:"900"},noticeCopy:{marginTop:5,color:"#57705b",fontSize:12,lineHeight:18},purchaseType:{gap:9,paddingVertical:10,borderTopWidth:1,borderColor:"#f0ece3"},quantityRow:{flexDirection:"row",alignItems:"center",alignSelf:"flex-start",gap:9},qtyButton:{width:38,height:38,alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:"#ded6c8",borderRadius:12,backgroundColor:"#fff"},qtyText:{color:"#087344",fontSize:22,fontWeight:"900"},qtyValue:{minWidth:22,textAlign:"center",color:"#173c2c",fontSize:16,fontWeight:"900"},genderPanel:{gap:7,padding:10,borderRadius:13,backgroundColor:"#f8f3e9"},genderLabel:{width:72,color:"#596a60",fontSize:11,fontWeight:"900"},genderChip:{flex:1,alignItems:"center",paddingVertical:8,borderWidth:1,borderColor:"#ded6c8",borderRadius:10,backgroundColor:"#fff"},purchaseTotal:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingTop:10,borderTopWidth:1,borderColor:"#f0ece3"},barCard:{gap:10,marginTop:12,padding:14,borderWidth:1,borderColor:"#ded6c8",borderRadius:18,backgroundColor:"#fff"},barHeader:{flexDirection:"row",alignItems:"flex-start",gap:10},barCode:{color:"#173c2c",fontSize:15,fontWeight:"900"},barTotal:{color:"#07472f",fontSize:18,fontWeight:"900"},barMetaRow:{flexDirection:"row",flexWrap:"wrap",gap:6},barPill:{overflow:"hidden",paddingHorizontal:8,paddingVertical:5,borderRadius:999,backgroundColor:"#e8f2e9",color:"#2f5538",fontSize:10,fontWeight:"800"},barItemRow:{flexDirection:"row",justifyContent:"space-between",gap:10,paddingTop:8,borderTopWidth:1,borderColor:"#f0ece3"},refundHistory:{color:"#78622b",fontSize:11,fontWeight:"700"},refundToggle:{minHeight:40,alignItems:"center",justifyContent:"center",borderRadius:12,backgroundColor:"#f7e9bf"},refundToggleText:{color:"#674e08",fontWeight:"900"},refundPanel:{gap:10,padding:12,borderRadius:14,backgroundColor:"#f8f3e9"},methodRow:{flexDirection:"row",gap:8},methodChip:{flex:1,alignItems:"center",paddingVertical:10,borderWidth:1,borderColor:"#ded6c8",borderRadius:12,backgroundColor:"#fff"},methodChipActive:{borderColor:"#087344",backgroundColor:"#e8f2e9"},methodChipText:{color:"#596a60",fontWeight:"900"},methodChipTextActive:{color:"#087344"},reasonInput:{minHeight:74,textAlignVertical:"top"},dangerButton:{minHeight:50,alignItems:"center",justifyContent:"center",borderRadius:14,backgroundColor:"#b42318"},familyRow:{flexDirection:"row",alignItems:"center",gap:12,marginBottom:9,padding:13,borderWidth:1,borderColor:"#ded6c8",borderRadius:16,backgroundColor:"#fff"},familyAvatar:{width:44,height:44,alignItems:"center",justifyContent:"center",borderRadius:22,backgroundColor:"#e8f2e9"},familyInitial:{color:"#087344",fontFamily:Platform.OS==="ios"?"Georgia":undefined,fontSize:20,fontWeight:"900"},inlineForm:{gap:12,marginTop:15,padding:15,borderWidth:1,borderColor:"#ded6c8",borderRadius:17,backgroundColor:"#fff"},profileCard:{alignItems:"center",padding:24,borderWidth:1,borderColor:"#ded6c8",borderRadius:22,backgroundColor:"#fff"},profileAvatar:{width:72,height:72,alignItems:"center",justifyContent:"center",borderRadius:36,backgroundColor:"#087344"},profileInitial:{color:"#fff",fontFamily:Platform.OS==="ios"?"Georgia":undefined,fontSize:32,fontWeight:"900"},profileName:{marginTop:12,color:"#173c2c",fontSize:20,fontWeight:"900"},roleSwitcher:{gap:8,marginTop:14,padding:15,borderWidth:1,borderColor:"#ded6c8",borderRadius:18,backgroundColor:"#fff"},roleOption:{paddingHorizontal:14,paddingVertical:11,borderWidth:1,borderColor:"#ded6c8",borderRadius:12},roleOptionActive:{borderColor:"#087344",backgroundColor:"#e8f2e9"},roleOptionText:{color:"#6a776f",fontWeight:"800",textTransform:"capitalize"},roleOptionTextActive:{color:"#087344"},logout:{minHeight:52,alignItems:"center",justifyContent:"center",marginTop:16,borderRadius:15,backgroundColor:"#173c2c"},logoutText:{color:"#fff",fontWeight:"900"},profileShortcut:{padding:12},profileShortcutText:{color:"#087344",textAlign:"center",fontWeight:"800"},
});
