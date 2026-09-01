"use client";

import { Activity, ArrowLeft, ArrowRight, Bell, CalendarDays, CheckCircle2, ChevronRight, CircleUserRound, ClipboardCheck, Eye, EyeOff, Home, Images, KeyRound, Landmark, LogIn, LogOut, MapPinned, MessageCircle, QrCode, RefreshCw, ScanLine, ShieldCheck, Store, Ticket, Trophy, UserPlus, Users, WalletCards, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState, type FormEvent } from "react";

type AppUser = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  source: "visitor" | "staff";
  verified: boolean;
  permissions?: string[];
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
  mobile?: string | null;
  balance_cents: number;
  version?: number;
  status: string;
};
type TicketType = {
  id: number;
  name: string;
  price_cents: number;
  capacity: number;
  per_order_limit: number;
  requires_gender: number;
  requires_name: number;
};
type TicketEvent = { id: number; name: string; sales_closed: number };
type MeResponse = {
  ok: boolean;
  user: AppUser;
  tickets: AppTicket[];
  wallets: AppWallet[];
  linkage: string;
};
type AppHealth = {
  ok: boolean;
  checked_at?: string;
  event?: { ticket_types?: number };
  checks?: Record<string, { status?: "ok" | "warn" | "fail"; detail?: string }>;
};
type AppPhoto = {
  id: number;
  title: string;
  caption?: string | null;
  status: string;
  uploader_name?: string | null;
  file_url: string;
  created_at: number;
  own?: boolean;
};
type AppMessage = {
  id: number;
  direction: "incoming" | "outgoing";
  sender_name: string;
  recipient_name: string;
  recipient_type: string;
  recipient_id: number;
  scope: string;
  body: string;
  created_at: number;
};
type AppMessageContact = {
  type: string;
  id: number;
  name: string;
  detail?: string | null;
};
type AuthView = "welcome" | "login" | "register" | "verify" | "forgot" | "reset-code" | "reset-password";
type AppTab = "home" | "messages" | "calendar" | "profile";
type AppPage = "home" | "tickets" | "venues" | "bar" | "pos" | "horses" | "rentals";
type RoleView = "visitor" | "vendor" | "staff" | "committee";
type AppModuleGroup = {
  key: string;
  title: string;
  detail: string;
  icon: LucideIcon;
  roles: RoleView[];
  modules: string[];
};
type AppModule = {
  key: string;
  title: string;
  detail: string;
  icon: LucideIcon;
  roles: RoleView[];
  permissions?: string[];
  href?: string;
  live?: boolean;
  status?: "live" | "admin" | "coming";
};
type PosLaunchOption = {
  key: string;
  title: string;
  detail: string;
  href?: string;
  status: "live" | "coming";
  badge: string;
};
type AppPosDepartment = {
  area: string;
  title: string;
  detail: string;
  badge: string;
  status: "live" | "coming" | "not_configured";
  location_count: number;
  product_count: number;
  primary_location_id: number | null;
  launch_url: string | null;
};
type AppPosConfig = {
  ok: boolean;
  departments: AppPosDepartment[];
  event?: { id: number; name: string } | null;
};
type VenueRequest = {
  id: number;
  event_name: string;
  event_type: string | null;
  preferred_date: string;
  end_date: string | null;
  expected_guests: number | null;
  venue_area: string;
  details: string;
  status: string;
  created_at: number;
};
type ServiceRequest = {
  id: number;
  module_key: string;
  request_type: string;
  title: string;
  contact_name: string;
  contact_email?: string | null;
  contact_phone: string;
  details: string;
  payload_json?: string | null;
  status: string;
  admin_notes?: string | null;
  created_at: number;
  updated_at: number;
};
type StaffRequest = ServiceRequest & {
  source: "service" | "venue";
  payload?: Record<string, unknown> | null;
  preferred_date?: string | null;
  end_date?: string | null;
  venue_area?: string | null;
  expected_guests?: number | null;
};
type ServiceField = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "select" | "date" | "number" | "email" | "tel";
  required?: boolean;
  placeholder?: string;
  options?: string[];
};
type ServiceModuleConfig = {
  eyebrow: string;
  title: string;
  intro: string;
  requestType: string;
  primaryLabel?: string;
  fields: ServiceField[];
};
type BarTransactionItem = {
  id: number;
  name: string;
  qty: number;
  unit_price_cents: number;
  total_cents: number;
  fulfilled_qty: number;
};
type BarRefund = {
  id: number;
  method: string;
  amount_cents: number;
  status: string;
  reason?: string | null;
  actor_name?: string | null;
  created_at: number;
};
type BarTransaction = {
  id: number;
  order_code: string;
  created_at: number;
  status: string;
  group_name: string;
  location_name: string;
  operator_name: string;
  customer_name: string;
  customer_mobile: string;
  wallet_id: string;
  total_cents: number;
  refunded_cents: number;
  refundable_cents: number;
  payment: null | {
    id: number;
    method: string;
    provider: string;
    provider_reference: string;
    status: string;
    amount_cents: number;
  };
  items: BarTransactionItem[];
  refunds: BarRefund[];
};
type HorseBackendApplication = {
  id: number;
  event_id: number;
  status: string;
  stud_name: string;
  contact_name: string;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  membership_agreed: boolean;
  notes?: string | null;
  exhibitor_id?: number | null;
  portal_status?: string | null;
  invoice_id?: number | null;
  invoice_no?: string | null;
  invoice_status?: string | null;
  total_cents: number;
  number_deposit_cents: number;
  deposit_refunded_at?: number | null;
  reviewed_at?: number | null;
  approval_email_sent_at?: number | null;
  approval_whatsapp_sent_at?: number | null;
  created_at: number;
  updated_at: number;
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
const posLaunchOptions: PosLaunchOption[] = [
  {
    key: "gate-pos",
    title: "Hek POS",
    detail: "Kaartjieverkope, wristband verkope en hek-dagafsluiting.",
    href: "https://tickets.villiersdorpskou.co.za/app?pos_area=hek",
    status: "live",
    badge: "HEK",
  },
  {
    key: "bar-pos",
    title: "Kroeg POS",
    detail: "Kroegverkope met Yoco, kontant en beursiebetalings.",
    href: "https://tickets.villiersdorpskou.co.za/app?pos_area=kroeg",
    status: "live",
    badge: "KROEG",
  },
  {
    key: "wallet-topup",
    title: "Beursie aanvulling",
    detail: "Laai of skep ’n gas se skoubeursie met kontant of kaart by die POS.",
    status: "live",
    badge: "BEURSIE",
  },
  {
    key: "kitchen-pos",
    title: "Kombuis POS",
    detail: "Gereserveer vir kombuisprodukte, eie sessies en cash-up.",
    status: "coming",
    badge: "KOMBUIS",
  },
  {
    key: "gate-scanner",
    title: "Hek scan in / uit",
    detail: "Skandeer QR-kaartjies en hanteer toegang by hekke.",
    href: "https://tickets.villiersdorpskou.co.za/scan",
    status: "live",
    badge: "SCAN",
  },
];
const appModules: AppModule[] = [
  {
    key: "tickets",
    title: "My Kaartjies",
    detail: "Koop, wys en bestuur jou QR-kaartjies",
    icon: Ticket,
    roles: allViews,
    live: true,
    status: "live",
  },
  {
    key: "family",
    title: "My Familie",
    detail: "Gesinslede en kaartjiehouers",
    icon: Users,
    roles: ["visitor", "committee"],
    live: true,
    status: "live",
  },
  {
    key: "membership",
    title: "Lidmaatskap",
    detail: "Sluit aan, hernu of vra lidmaatskap-hulp",
    icon: ShieldCheck,
    roles: ["visitor", "staff", "committee"],
    live: true,
    status: "live",
  },
  {
    key: "programme",
    title: "Skouprogram",
    detail: "Tye, verhoë en hoogtepunte",
    icon: CalendarDays,
    roles: allViews,
    href: "https://www.villiersdorpskou.co.za/#program",
    live: true,
    status: "admin",
  },
  {
    key: "map",
    title: "Skoukaart",
    detail: "Hekke, arenas, stalletjies en geriewe",
    icon: MapPinned,
    roles: allViews,
    href: "https://www.villiersdorpskou.co.za/vendors",
    live: true,
    status: "admin",
  },
  {
    key: "photos",
    title: "Skoufoto’s",
    detail: "Laai foto’s op en sien goedgekeurde albums",
    icon: Images,
    roles: allViews,
    live: true,
    status: "live",
  },
  {
    key: "wallet",
    title: "Skoubeursie",
    detail: "Balans, kaart en transaksies",
    icon: WalletCards,
    roles: ["visitor", "committee"],
    live: true,
    status: "live",
  },
  {
    key: "vendor-profile",
    title: "Uitstallerprofiel",
    detail: "Besigheid- en stalletjie-inligting",
    icon: Store,
    roles: ["vendor", "committee"],
    live: true,
    status: "live",
  },
  {
    key: "vendor-application",
    title: "My Aansoek",
    detail: "Status, vereistes en dokumente",
    icon: ClipboardCheck,
    roles: ["vendor", "committee"],
    live: true,
    status: "live",
  },
  {
    key: "vendor-team",
    title: "Uitstallerspan",
    detail: "Werknemers en bywoningsdae",
    icon: Users,
    roles: ["vendor", "committee"],
    live: true,
    status: "live",
  },
  {
    key: "passes",
    title: "Hekpasse",
    detail: "QR-passe vir jou span",
    icon: QrCode,
    roles: ["vendor", "committee"],
    live: true,
    status: "live",
  },
  {
    key: "pos",
    title: "Hek POS",
    detail: "Hekkaartjies, verkope en dagafsluiting",
    icon: Store,
    roles: ["staff", "committee"],
    permissions: ["pos_sales"],
    href: "https://tickets.villiersdorpskou.co.za/app?pos_area=hek",
    live: true,
    status: "admin",
  },
  {
    key: "bar-transactions",
    title: "Kroeg transaksies",
    detail: "Laaste transaksies en gemagtigde refunds",
    icon: Activity,
    roles: ["staff", "committee"],
    permissions: ["bar_transactions", "bar_refunds"],
    live: true,
    status: "live",
  },
  {
    key: "wallet-topup",
    title: "Beursie aanvulling",
    detail: "Laai/skep gaste se skoubeursies met kontant of kaart",
    icon: WalletCards,
    roles: ["staff", "committee"],
    permissions: ["pos_sales", "bar_pos"],
    live: true,
    status: "live",
  },
  {
    key: "bar-pos",
    title: "Kroeg POS",
    detail: "Kroegverkope, Yoco en beursiebetalings",
    icon: Store,
    roles: ["staff", "committee"],
    permissions: ["bar_pos"],
    href: "https://tickets.villiersdorpskou.co.za/app?pos_area=kroeg",
    live: true,
    status: "admin",
  },
  {
    key: "kitchen-pos",
    title: "Kombuis POS",
    detail: "Kombuisverkope en toekomstige afdelings",
    icon: Store,
    roles: ["staff", "committee"],
    permissions: ["kitchen_pos"],
    href: "https://tickets.villiersdorpskou.co.za/app?pos_area=kombuis",
    live: true,
    status: "admin",
  },
  {
    key: "applications",
    title: "Stalletjie-aansoeke",
    detail: "Hersien app-aansoeke en stuur formele admin-opvolg",
    icon: ClipboardCheck,
    roles: ["staff", "committee"],
    permissions: ["vendors_applications", "vendors_approve"],
    href: "https://www.villiersdorpskou.co.za/admin#vendors",
    live: true,
    status: "live",
  },
  {
    key: "horses",
    title: "Doen perde-aansoek",
    detail: "Inskrywings, klasse en dokumente",
    icon: Trophy,
    roles: allViews,
    href: "https://www.villiersdorpskou.co.za/horses/apply",
    live: true,
    status: "live",
  },
  {
    key: "horse-processing",
    title: "Verwerk perde-aansoeke",
    detail: "Hersien app-inskrywings, navrae en opvolgstatus",
    icon: ClipboardCheck,
    roles: ["staff", "committee"],
    permissions: ["horses_entries", "horses_approve", "horses_programme"],
    href: "https://www.villiersdorpskou.co.za/admin#horses",
    live: true,
    status: "live",
  },
  {
    key: "horse-programme",
    title: "Perdeprogram",
    detail: "Publieke program, klasse en tye",
    icon: CalendarDays,
    roles: allViews,
    href: "https://www.villiersdorpskou.co.za/perde",
    live: true,
    status: "admin",
  },
  {
    key: "venues",
    title: "Terreinbesprekings",
    detail: "Gebeurtenisse en besprekingsversoeke",
    icon: Landmark,
    roles: allViews,
    live: true,
    status: "live",
  },
  {
    key: "venue-approvals",
    title: "Terreingoedkeurings",
    detail: "Hersien app-versoeke en merk opvolgstatus",
    icon: ClipboardCheck,
    roles: ["staff", "committee"],
    permissions: ["grounds_venues", "grounds_facilities"],
    live: true,
    status: "live",
  },
  {
    key: "buildings",
    title: "Geboue",
    detail: "Geboue, sale en terrein gereedheid",
    icon: Home,
    roles: ["staff", "committee"],
    permissions: ["buildings_manage", "grounds_facilities"],
    live: true,
    status: "live",
  },
  {
    key: "rentals",
    title: "Verhuring-aansoek",
    detail: "Verhurings, besprekings en opvolg",
    icon: Landmark,
    roles: allViews,
    live: true,
    status: "live",
  },
  {
    key: "rental-approvals",
    title: "Verhuring-goedkeuring",
    detail: "Hersien app-verhuringversoeke en opvolgstatus",
    icon: ClipboardCheck,
    roles: ["staff", "committee"],
    permissions: ["rentals_manage", "grounds_venues", "grounds_facilities"],
    href: "https://www.villiersdorpskou.co.za/admin#app",
    live: true,
    status: "live",
  },
  {
    key: "krymekaar",
    title: "Krymekaar & Slaglam",
    detail: "Veiling, event en eie vermaak",
    icon: Trophy,
    roles: ["staff", "committee"],
    permissions: ["krymekaar_manage", "entertainment_programme"],
    live: true,
    status: "live",
  },
  {
    key: "finance",
    title: "Finansies",
    detail: "Invoices, betalings, bank recon en verslae",
    icon: WalletCards,
    roles: ["staff", "committee"],
    permissions: ["finance_reconcile", "finance_reports", "vendors_invoices", "bar_cashup"],
    href: "https://www.villiersdorpskou.co.za/admin#invoices",
    live: true,
    status: "admin",
  },
  {
    key: "meetings",
    title: "Vergaderings",
    detail: "Agendas, RSVP’s en dokumente",
    icon: CalendarDays,
    roles: ["staff", "committee"],
    permissions: ["meetings_manage"],
    live: true,
    status: "live",
  },
  {
    key: "gates",
    title: "Hekbeheer",
    detail: "Skandeer kaartjies en monitor toegang",
    icon: ScanLine,
    roles: ["staff", "committee"],
    permissions: ["gates_scan"],
    href: "https://tickets.villiersdorpskou.co.za/scan",
    live: true,
    status: "admin",
  },
  {
    key: "reports",
    title: "Operasies",
    detail: "Bywoning, verkope en stelselgesondheid",
    icon: Activity,
    roles: ["staff", "committee"],
    permissions: ["ops_reports"],
    href: "https://www.villiersdorpskou.co.za/admin#posv1",
    live: true,
    status: "admin",
  },
  {
    key: "users",
    title: "Gebruikers & Rolle",
    detail: "Bestuur personeeltoegang en regte",
    icon: CircleUserRound,
    roles: ["committee"],
    permissions: ["access_manage"],
    href: "https://www.villiersdorpskou.co.za/admin",
    live: true,
    status: "admin",
  },
];

const appModuleGroups: AppModuleGroup[] = [
  {
    key: "visitor",
    title: "Kaartjies & Beursie",
    detail: "Koop kaartjies, wys QR’s, bestuur familie en laai beursie.",
    icon: Ticket,
    roles: allViews,
    modules: ["tickets", "wallet", "family", "membership"],
  },
  {
    key: "pos-access",
    title: "POS & Toegang",
    detail: "Hek, kroeg, kombuis en scan workflows vir personeel.",
    icon: ScanLine,
    roles: ["staff", "committee"],
    modules: ["pos", "bar-pos", "wallet-topup", "kitchen-pos", "gates", "bar-transactions", "reports"],
  },
  {
    key: "horses",
    title: "Perde",
    detail: "Aansoeke, klasse, program en personeelverwerking.",
    icon: Trophy,
    roles: allViews,
    modules: ["horses", "horse-processing", "horse-programme"],
  },
  {
    key: "vendors",
    title: "Uitstallers",
    detail: "Aansoeke, profiel, span, hekpasse en admin verwerking.",
    icon: Store,
    roles: ["vendor", "staff", "committee"],
    modules: ["vendor-application", "vendor-profile", "vendor-team", "passes", "applications"],
  },
  {
    key: "grounds",
    title: "Terrein & Verhurings",
    detail: "Terreinbesprekings, geboue, verhurings en goedkeurings.",
    icon: Landmark,
    roles: allViews,
    modules: ["venues", "rentals", "venue-approvals", "rental-approvals", "buildings"],
  },
  {
    key: "show",
    title: "Skou-inligting",
    detail: "Program, kaart en foto’s vir besoekers en bestuur.",
    icon: MapPinned,
    roles: allViews,
    modules: ["programme", "map", "photos"],
  },
  {
    key: "management",
    title: "Bestuur",
    detail: "Finansies, vergaderings, komitees, gebruikers en spesiale events.",
    icon: ShieldCheck,
    roles: ["staff", "committee"],
    modules: ["finance", "meetings", "krymekaar", "users"],
  },
];

function hasAnyPermission(user: AppUser, required?: string[]) {
  if (!required?.length) return true;
  if (["admin", "manager"].includes(String(user.role || "").toLowerCase())) return true;
  return required.some((permission) => user.permissions?.includes(permission));
}

const modulePanels: Record<string, { status: string; ready: string[]; next: string[]; action?: string; href?: string }> = {
  membership: {
    status: "Lidmaatskap kan nou direk uit die app as ’n versoek ingedien word. Admin sien dit onder Admin → App → App-versoeke.",
    ready: ["Dien lidmaatskap- of hernuwingsversoek in", "Gebruik jou app-kontakbesonderhede", "Hou opvolg/status in die app"],
    next: ["Koppel direk aan betaalde lid-rekords", "Outomatiese faktuur en betaalstatus", "Bestuursverkiesbaarheid volgens betaalde lidstatus"],
  },
  programme: {
    status: "Die publieke skouprogram is reeds live. Die app-spesifieke programme, filters en push reminders word nog teen dieselfde bron gekoppel.",
    ready: ["Open die huidige publieke program", "Wys Vrydag/Saterdag skou-inligting", "Hou een app-ingang vir visitors, vendors, staff en committee"],
    next: ["Koppel program-items aan ’n live API", "Voeg persoonlike gunstelinge en reminders by", "Maak Perde/Vermaak afdelings filterbaar"],
    action: "Maak huidige program oop",
  },
  map: {
    status: "Die vendor/public map is beskikbaar. Die volgende stap is om die amptelike terrein-poligone en vendor staanplekke app-native te teken.",
    ready: ["Open die huidige vendor/skoukaart", "Gebruik dieselfde Skou branding", "Wys map as visitor/vendor/staff funksie"],
    next: ["Import amptelike vendor maps", "Koppel staanplekke aan approved vendors", "Voeg hek, arena, kroeg, toilette en noodpunte as filters by"],
    action: "Maak huidige skoukaart oop",
  },
  photos: {
    status: "Foto-oplaaie werk nou in die app. Nuwe foto’s word veilig gestoor en wag vir goedkeuring voordat dit publiek gebruik word.",
    ready: ["Laai foto’s op vanaf selfoon", "Stoor lêers in R2", "Wys jou eie uploads en goedgekeurde foto’s"],
    next: ["Admin moderation queue", "Publieke albums en grootskerm slideshow", "Consent/status filters vir bemarking"],
  },
  "vendor-profile": {
    status: "Uitstallers kan nou profielveranderinge uit die app indien vir logo, Facebook, beskrywing en kontakdetails.",
    ready: ["Dien profiel-update uit die app in", "Admin sien dit in App-versoeke", "Gebruik dieselfde access model"],
    next: ["Koppel direk aan vendor rekord", "Logo upload na permanente storage", "Selfdiens publiseer/goedkeur workflow"],
  },
  "vendor-application": {
    status: "’n Uitstaller-aansoek kan nou uit die app ingedien word vir admin-opvolg. Die formele vendor admin en faktuur-flow bly die bron van waarheid.",
    ready: ["Dien aansoek uit die app in", "Admin kan status/notes terugskryf", "Aansoekgeskiedenis wys in app"],
    next: ["Koppel direk aan vendor application tabel", "Gebruik finale 2026 pryslyste en afdeling-keuses", "Outomatiese approval/rejection/invoice boodskappe"],
  },
  "vendor-team": {
    status: "Uitstallers kan nou span-, voertuig- en bandjie-inligting uit die app indien.",
    ready: ["Dien spanlys uit die app in", "Admin kry alle details in een queue"],
    next: ["Koppel employee records", "Genereer QR-passe", "Laat vendor self veranderings bevestig"],
  },
  passes: {
    status: "Hekpas-versoeke kan nou in die app ingestuur word; finale QR-passe bly onder adminbeheer totdat vendor/perde/staff lyste vas is.",
    ready: ["Vra ’n hekpas of verandering aan", "Admin kan opvolgstatus terugskryf"],
    next: ["Koppel passes aan vendor/perde/staff records", "Maak QR/NFC compatible", "Laat hek scanner dit valideer"],
  },
  pos: {
    status: "Hek POS gebruik tans POS V1 as die betroubare verkoopskerm vir hekkaartjies, terminal leases, Yoco/manual betalings en beursie-guards.",
    ready: ["Open live Hek POS", "Terminal lease en wallet guard bly op backend", "POS/scan toegang word deur server sessie beheer"],
    next: ["Maak Hek POS app-native", "Finaliseer Yoco terminal/live refund flow", "Voltooi real-device tablet testing"],
    action: "Maak Hek POS oop",
  },
  "kitchen-pos": {
    status: "Kombuis POS gebruik dieselfde POS V1 backend-pad as Hek en Kroeg, maar word net gewys vir gebruikers met Kombuis POS-regte. As daar nog nie kombuisprodukte/liggings gekoppel is nie, wys die POS dit as ’n opset-taak.",
    ready: ["Aparte Kombuis POS-menu", "Aparte Kombuis permission", "Dieselfde backend model vir sessies, betalings en cash-up"],
    next: ["Skep/voltooi Kombuis POS group/location/products", "Toets aparte kombuis cash-up en reports", "Voeg toekomstige afdelings by via POS config"],
    action: "Maak Kombuis POS oop",
  },
  "bar-pos": {
    status: "Kroeg POS launch tans na die bestaande POS V1 skerm. Die kassier kies/gebruik die kroeg afdeling daar totdat die app-native POS klaar is.",
    ready: ["Open live POS vir kroegverkope", "Yoco/manual/wallet betalings bly server-side", "Kroeg transaksies en refunds het ’n aparte app skerm"],
    next: ["Launch direk in Main Bar/Kroeg konteks", "Maak produkfilters app-native", "Koppel real Yoco refunds"],
    action: "Maak Kroeg POS oop",
  },
  "wallet-topup": {
    status: "Beursie-aanvulling gebruik die bestaande operateur-skerm waar personeel ’n gas se beursie kan soek/skep en met kontant of kaart top-up.",
    ready: ["Open live beursie topup skerm", "Soek per wallet ID of selfoon", "Skep nuwe skoubeursie vir gaste", "Kontant/kaart topups bly op die backend geaudit"],
    next: ["Maak NFC scan direk app-native", "Koppel Yoco terminal topup onderskeid duideliker", "Wys laaste topups in app dashboard"],
    action: "Maak beursie aanvulling oop",
  },
  applications: {
    status: "Uitstaller-, span- en hekpasversoeke kan nou in die app hersien word. Formele staanplektoekenning en fakture bly as sekondêre admin-opvolg beskikbaar.",
    ready: ["App-native review queue", "Status en admin-notas kan teruggeskryf word", "Access is permission-based"],
    next: ["Koppel approval/rejection templates", "Koppel fakture en vendor profile verify", "Maak staanplektoekenning app-native"],
    action: "Maak vendor admin oop",
  },
  horses: {
    status: "Gebruik hierdie vir ’n nuwe perde-aansoek. Die bestaande publieke perde-aansoek bly die bron van waarheid; die app kan steeds ’n opvolgversoek stoor indien iemand hulp nodig het.",
    ready: ["Open die bestaande online perde-aansoek", "Visitors kan ’n perde-versoek uit die app stuur", "Public perdeblad en admin verwerking bestaan"],
    next: ["Koppel direk aan horse application tables", "Koppel vorige vertoners, klasse, fakture en bandjies"],
  },
  "horse-processing": {
    status: "Perde app-versoeke kan nou in die app deur personeel hersien word. Formele klasse, fakture en deposito’s bly steeds op die bestaande perde-admin totdat daardie rekords direk gekoppel is.",
    ready: ["App-native review queue", "Perde permissions beskerm toegang", "Status en admin-notas kan teruggeskryf word"],
    next: ["Koppel direk aan horse application tables", "Wys klasse en faktuurstatus in die app", "Voeg deposito/bandjie/nommerstatus by"],
    action: "Maak perde admin oop",
  },
  "horse-programme": {
    status: "Die publieke perdeprogram is reeds beskikbaar en bly op /perde en /horses. Die app kan dit as aparte subopsie oopmaak.",
    ready: ["Open publieke perdeprogram", "Werk vir visitors en personeel", "Hou /perde en /horses beskikbaar"],
    next: ["Koppel app-native programme filter", "Wys dag/klas/arena filters", "Laat personeel program updates voorstel"],
    action: "Maak perdeprogram oop",
  },
  "venue-approvals": {
    status: "Terreinbesprekings kan deur visitors ingedien word en gemagtigde personeel kan dit nou app-native hersien en status verander.",
    ready: ["Visitor terreinbespreking is live", "Requests het status/history", "Admin kan submitted/reviewing/approved/declined/cancelled terugskryf"],
    next: ["Voeg pricing/conditions by", "Skep faktuur na goedkeuring", "Koppel kalender en betalingstatus"],
    href: "https://www.villiersdorpskou.co.za/admin#app",
    action: "Maak app-admin oop",
  },
  buildings: {
    status: "Gebou- en terrein-gereedheid versoeke kan nou uit die app aangeteken word vir die betrokke bestuur.",
    ready: ["Permission-gated app menu", "Dien gebou take/kwessies in", "Kan saam met Gronde/Fasiliteite werk"],
    next: ["Bou app-native gebou take/checklists", "Koppel aan verhurings en terreinversoeke", "Voeg verantwoordelike persone per gebou by"],
  },
  rentals: {
    status: "Verhuring-aansoeke en opvolg kan nou uit die app gestuur word en deur admin opgevolg word. Dit bly in dieselfde app/backend request queue totdat pryse, voorwaardes en fakture finaal vas is.",
    ready: ["Dien verhuring-aansoek uit die app in", "Kan terreinbesprekings as bron gebruik", "Admin sien die versoek in die app queue"],
    next: ["Koppel quote/faktuur na goedkeuring", "Maak huurkontrak/voorwaardes templates", "Wys kalender van verhuring versoeke"],
  },
  "rental-approvals": {
    status: "Verhuring- en terreinversoeke kan nou app-native deur gemagtigde personeel hersien word; pryse, voorwaardes en fakture bly die volgende formele koppeling.",
    ready: ["App-native review queue", "Permission-gated vir Gronde/Verhurings", "Kan status terugskryf na die app"],
    next: ["Skep faktuur vanaf goedgekeurde aansoek", "Wys kalender en betalingstatus", "Koppel huurkontrak/voorwaardes"],
    action: "Maak goedkeurings oop",
  },
  krymekaar: {
    status: "Krymekaar/Slaglam versoeke en programnotas kan nou uit die app ingestuur word.",
    ready: ["Permission-gated app menu", "Program- of veilingnotas kan ingedien word", "Kan saam met Vermaak permissions gebruik word"],
    next: ["Bou event-spesifieke program items", "Koppel eie entertainers", "Koppel veiling/admin dokumente"],
  },
  finance: {
    status: "Finansies is nou apart permission-gated vir Blair/finansiële bestuur: invoices, betalings, recon en verslagdoening.",
    ready: ["Invoices admin launch", "Finance permissions vir recon en reports", "Kan hoë-risiko betalingsrolle apart hou"],
    next: ["Bankstaat import", "Transaksie matching", "Jaar-einde reports en proefbalans"],
    action: "Maak fakture oop",
  },
  meetings: {
    status: "Vergadering-, agenda- en notule versoeke kan nou uit die app ingestuur word.",
    ready: ["Permission-gated app menu", "Dien agenda/notule item in", "Admin kan status terugskryf"],
    next: ["Koppel agendas/notules aan R2 of DB", "RSVP/reminder flow", "Dokument upload/download"],
  },
  gates: {
    status: "Die live scanner bly tans die betroubare skerm vir hekbeheer. Die app wys ’n launch-pad vir users met gate access.",
    ready: ["Open live scanner", "Server vereis staff session", "Scan in/out bly geaudit"],
    next: ["Maak scanner app-native", "Offline queue", "Finaliseer NFC/QR saamwerk"],
    action: "Maak scanner oop",
  },
  reports: {
    status: "Operasionele verslae lê tans in admin/POS V1 preflight en reports. Hierdie app-module word net vir reports permission gewys.",
    ready: ["Open live admin reports", "Permission-gated module"],
    next: ["Koppel live app dashboard", "Wys laaste verkope, hek scans en terminal heartbeats", "Maak export opsies"],
    action: "Maak admin reports oop",
  },
  users: {
    status: "Gebruikers en rolle word nou in Admin → Users → Access bestuur. Hierdie module is net sigbaar vir access managers.",
    ready: ["Create/edit users", "Assign departments", "Grant/revoke explicit permissions"],
    next: ["Maak app-native user admin", "Voeg audit history by", "Koppel Skou-lid prerequisite enforcement"],
    action: "Maak admin users oop",
  },
};

const requestModuleDetails: Record<string, ServiceModuleConfig> = {
  membership: {
    eyebrow: "Lidmaatskap",
    title: "Lidmaatskap versoek",
    intro: "Gebruik hierdie om aan te sluit, hernuwing te vra, of ’n lidmaatskap-probleem aan die kantoor te stuur.",
    requestType: "membership_support",
    primaryLabel: "Stuur lidmaatskap-versoek",
    fields: [
      { key: "membership_need", label: "Wat moet gebeur?", type: "select", required: true, options: ["Nuwe lid", "Hernu lidmaatskap", "Betaalstatus navraag", "Persoonlike besonderhede verander", "Ander"] },
      { key: "member_reference", label: "Lidnaam of verwysing indien bekend", placeholder: "Byvoorbeeld: familienaam / ou lidnommer" },
    ],
  },
  "vendor-application": {
    eyebrow: "Uitstallers",
    title: "Stalletjie-aansoek",
    intro: "Dien jou stalletjie-aansoek of navraag hier in. Die kantoor sal dit teen die formele vendor-proses en beskikbare staanplekke hanteer.",
    requestType: "vendor_application",
    primaryLabel: "Stuur stalletjie-aansoek",
    fields: [
      { key: "business_name", label: "Besigheidsnaam", required: true },
      { key: "stall_category", label: "Stalletjie-afdeling", type: "select", required: true, options: ["Kos", "Food court", "Agri", "Nywerheidsaal", "Buite stalletjie", "Kinder area", "Ander"] },
      { key: "products", label: "Wat wil jy verkoop of uitstal?", type: "textarea", required: true, placeholder: "Produklys, spyskaart of kort beskrywing" },
      { key: "electricity", label: "Benodig elektrisiteit?", type: "select", options: ["Nee", "Ja", "Nie seker nie"] },
    ],
  },
  "vendor-profile": {
    eyebrow: "Uitstallers",
    title: "Profiel en bemarking",
    intro: "Stuur jou logo/Facebook/Instagram/link besonderhede sodat die Skou jou publieke uitstallerprofiel kan regmaak.",
    requestType: "vendor_profile",
    primaryLabel: "Stuur profiel-info",
    fields: [
      { key: "business_name", label: "Besigheidsnaam", required: true },
      { key: "facebook", label: "Facebook blad of skakel" },
      { key: "instagram", label: "Instagram of webwerf" },
      { key: "logo_note", label: "Logo/foto nota", type: "textarea", placeholder: "Sê vir ons of jy ’n logo/foto per WhatsApp of e-pos stuur." },
    ],
  },
  "vendor-team": {
    eyebrow: "Uitstallers",
    title: "Span en voertuie",
    intro: "Stuur die mense, voertuie en dae wat by jou stalletjie hoort vir bandjies en hekpasse.",
    requestType: "vendor_team",
    primaryLabel: "Stuur span-inligting",
    fields: [
      { key: "business_name", label: "Besigheidsnaam", required: true },
      { key: "team_members", label: "Spanlede / werknemers", type: "textarea", required: true, placeholder: "Naam, selfoon, dag(e) teenwoordig" },
      { key: "vehicles", label: "Voertuigregistrasies", type: "textarea", placeholder: "Registrasienommers en voertuigbeskrywing" },
    ],
  },
  passes: {
    eyebrow: "Hekpasse",
    title: "Pas-versoek",
    intro: "Gebruik hierdie vir vendor-, perde-, staff- of ander hekpasse wat aan persone of voertuie gekoppel moet word.",
    requestType: "access_pass",
    primaryLabel: "Stuur pas-versoek",
    fields: [
      { key: "pass_type", label: "Tipe pas", type: "select", required: true, options: ["Uitstaller", "Perde", "Staff", "Komitee", "Voertuig", "Ander"] },
      { key: "people_or_vehicle", label: "Persoon/voertuig details", type: "textarea", required: true },
      { key: "valid_days", label: "Geldige dae", type: "select", options: ["Vrydag", "Saterdag", "Beide dae", "Ander"] },
    ],
  },
  horses: {
    eyebrow: "Perde",
    title: "Perde navraag of inskrywing",
    intro: "Dien perde-inskrywings, klasnavrae, vertonerbesonderhede of program-opvolg uit die app in.",
    requestType: "horse_entry",
    primaryLabel: "Stuur perde-versoek",
    fields: [
      { key: "stable_or_school", label: "Stoet / ryskool / vertoner", required: true },
      { key: "entry_type", label: "Versoek tipe", type: "select", required: true, options: ["Nuwe inskrywing", "Klasnavraag", "Bandjies", "Nommer deposito", "Program navraag", "Ander"] },
      { key: "horse_classes", label: "Perde en klasse", type: "textarea", placeholder: "Perdnaam, ruiter/vertoner, klasnommers indien bekend" },
    ],
  },
  buildings: {
    eyebrow: "Geboue",
    title: "Gebou / terrein taak",
    intro: "Teken gebou-, saal- of terrein gereedheid take uit die app aan.",
    requestType: "building_task",
    primaryLabel: "Stuur gebou-taak",
    fields: [
      { key: "area", label: "Gebou of area", type: "select", required: true, options: ["Nywerheidsaal", "Brandweersaal", "Veteranesaal", "Kantoor", "Toilette", "Kroeg", "Ander"] },
      { key: "priority", label: "Prioriteit", type: "select", options: ["Normaal", "Dringend", "Voor skoudag klaar", "Na skou opvolg"] },
    ],
  },
  rentals: {
    eyebrow: "Verhurings",
    title: "Verhuring opvolg",
    intro: "Dien ’n verhuring navraag, opvolg of verandering in.",
    requestType: "rental_followup",
    primaryLabel: "Stuur verhuring-versoek",
    fields: [
      { key: "rental_type", label: "Tipe verhuring", type: "select", required: true, options: ["Saal", "Terrein", "Toerusting", "Parkering", "Ander"] },
      { key: "event_date", label: "Datum indien bekend", type: "date" },
      { key: "client_or_event", label: "Kliënt / geleentheid naam" },
    ],
  },
  krymekaar: {
    eyebrow: "Krymekaar",
    title: "Krymekaar / Slaglam versoek",
    intro: "Stuur program-, veiling-, entertainer- of operasionele notas vir Krymekaar en Slaglam.",
    requestType: "krymekaar_event",
    primaryLabel: "Stuur Krymekaar-versoek",
    fields: [
      { key: "event_area", label: "Area", type: "select", options: ["Krymekaar", "Slaglam Veiling", "Vermaak", "Kos/verkope", "Ander"] },
      { key: "needed_by", label: "Benodig teen", type: "date" },
    ],
  },
  meetings: {
    eyebrow: "Vergaderings",
    title: "Agenda / notule versoek",
    intro: "Stuur ’n agenda item, notule-opmerking of vergadering opvolg.",
    requestType: "meeting_admin",
    primaryLabel: "Stuur vergadering-versoek",
    fields: [
      { key: "meeting_type", label: "Vergadering tipe", type: "select", options: ["AJV", "Bestuur", "Komitee", "Afdeling", "Ander"] },
      { key: "meeting_date", label: "Datum indien bekend", type: "date" },
      { key: "agenda_item", label: "Agenda item / notule punt", type: "textarea", required: true },
    ],
  },
};

const staffReviewScopes: Record<string, { scope: string; title: string; intro: string }> = {
  "horse-processing": {
    scope: "horses",
    title: "Verwerk perde-aansoeke",
    intro: "Hersien perde-aansoeke en navrae wat uit die app ingestuur is. Die bestaande perde-admin bly beskikbaar vir fakture, klasse en formele verwerking.",
  },
  "venue-approvals": {
    scope: "venues",
    title: "Terreingoedkeurings",
    intro: "Hersien terreinbesprekings vanaf die app en merk hulle vir opvolg, goedkeuring of kansellasie.",
  },
  "rental-approvals": {
    scope: "rentals",
    title: "Verhuring-goedkeuring",
    intro: "Hersien verhuring- en terreinversoeke sodat bestuur later kwotasies, voorwaardes en fakture kan koppel.",
  },
  applications: {
    scope: "vendors",
    title: "Uitstaller-aansoeke",
    intro: "Hersien app-ingediende uitstaller-, span- en hekpasversoeke. Die formele vendor admin bly die bron van waarheid vir fakture en staanplekke.",
  },
};

async function api(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  let response: Response;
  const headers = new Headers(init?.headers || {});
  if (!(init?.body instanceof FormData) && !headers.has("content-type")) headers.set("content-type", "application/json");
  try {
    response = await fetch(path, {
      ...init,
      credentials: "same-origin",
      signal: init?.signal || controller.signal,
      headers,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw new Error("Die versoek het te lank geneem. Herlaai die blad en probeer weer.");
    throw err;
  } finally {
    window.clearTimeout(timeout);
  }
  const data = await response.json().catch(() => ({ ok: false, error: "Die bediener het nie korrek geantwoord nie" }));
  if (!response.ok || data?.ok === false) {
    const message = data.error || data.reason || `Die bediener het HTTP ${response.status} teruggegee`;
    const suffix = data.request_id ? ` Verwysing: ${data.request_id}` : "";
    throw new Error(`${message}${suffix}`);
  }
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
    [view, setView] = useState<AuthView>(() => (typeof window !== "undefined" && isAppDeepLinkPath(window.location.pathname) ? "login" : "welcome")),
    [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState(""),
    [resetToken, setResetToken] = useState("");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [health, setHealth] = useState<AppHealth | null>(null);

  const loadMe = async () => {
    try {
      const data = await api("/api/app/me");
      setMe(data);
      setView(data.user.verified || data.user.source === "staff" ? "welcome" : "verify");
    } catch {
      setMe(null);
      if (typeof window !== "undefined" && isAppDeepLinkPath(window.location.pathname)) {
        setView("login");
        setMessage("Teken in om hierdie app-afdeling oop te maak.");
      }
    }
  };
  const loadHealth = async () => {
    try {
      const response = await fetch("/api/app/health", { cache: "no-store" });
      const data = await response.json().catch(() => null) as AppHealth | null;
      setHealth(data && typeof data.ok === "boolean" ? data : { ok: false });
    } catch {
      setHealth({ ok: false });
    }
  };
  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 1250);
    const boot = queueMicrotask(() => void loadMe());
    const health = queueMicrotask(() => void loadHealth());
    return () => {
      clearTimeout(timer);
      void boot;
      void health;
    };
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topupId = params.get("topup");
    const payment = params.get("payment");
    const ticketCode = params.get("code");
    if (payment === "ticket" && ticketCode) {
      queueMicrotask(async () => {
        await loadMe();
        setMessage("Dankie. Yoco het jou kaartjie-betaling ontvang; jou kaartjies sal hier wys sodra die betaling bevestig is.");
        window.history.replaceState({}, "", "/kaartjies");
      });
      return;
    }
    if (payment === "cancelled" && ticketCode) {
      queueMicrotask(() => setMessage("Die kaartjie-betaling is gekanselleer; geen kaartjies is uitgereik nie."));
      window.history.replaceState({}, "", "/kaartjies");
      return;
    }
    if (payment === "failed" && ticketCode) {
      queueMicrotask(() => setMessage("Die kaartjie-betaling het misluk; probeer weer of kies ’n ander betaalmetode."));
      window.history.replaceState({}, "", "/kaartjies");
      return;
    }
    if (!topupId || !payment) return;
    if (payment === "cancelled") {
      queueMicrotask(() => setMessage("Die betaling is gekanselleer; jou beursiebalans het nie verander nie."));
      window.history.replaceState({}, "", "/");
      return;
    }
    if (payment === "failed") {
      queueMicrotask(() => setMessage("Die beursie-aanvulling het misluk; jou balans het nie verander nie."));
      window.history.replaceState({}, "", "/");
      return;
    }
    let stopped = false;
    let attempts = 0;
    const check = async () => {
      attempts += 1;
      try {
        const result = await api(`/api/app/wallet-topups/${encodeURIComponent(topupId)}`);
        if (result.topup?.status === "paid") {
          await loadMe();
          if (!stopped) setMessage(`Betaling ontvang—R ${(Number(result.topup.amount_cents || 0) / 100).toFixed(2)} is by jou beursie gevoeg.`);
          window.history.replaceState({}, "", "/");
          return;
        }
      } catch {}
      if (!stopped && attempts < 10) window.setTimeout(check, 1500);
      else if (!stopped) setMessage("Yoco verwerk nog jou betaling. Jou balans sal outomaties wys sodra dit bevestig is.");
    };
    void check();
    return () => { stopped = true; };
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
  if (me && (me.user.verified || me.user.source === "staff")) return <Dashboard data={me} message={message} health={health} onLogout={logout} />;

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

function Dashboard({ data, message, health, onLogout }: { data: MeResponse; message: string; health: AppHealth | null; onLogout: () => void }) {
  const { user, tickets, wallets } = data;
  const actualView: RoleView = user.role === "visitor" ? "visitor" : ["vendor", "exhibitor", "uitstaller"].includes(user.role) ? "vendor" : ["admin", "committee", "manager"].includes(user.role) ? "committee" : "staff";
  const [tab, setTab] = useState<AppTab>("home"),
    [preview, setPreview] = useState<RoleView>(actualView),
    [selected, setSelected] = useState<string | null>(() => typeof window === "undefined" ? null : moduleFromBrowserQuery(window.location.search)),
    [page, setPage] = useState<AppPage>(() => typeof window === "undefined" ? "home" : pageFromBrowserPath(window.location.pathname));
  const walletTotal = wallets.reduce((sum, w) => sum + w.balance_cents, 0),
    visible = appModules.filter((item) => item.roles.includes(preview) && hasAnyPermission(user, item.permissions)),
    allowed = appModules.filter((item) => item.roles.includes(actualView) && hasAnyPermission(user, item.permissions)),
    grouped = appModuleGroups
      .filter((group) => group.roles.includes(preview))
      .map((group) => ({ ...group, items: group.modules.map((key) => visible.find((item) => item.key === key)).filter((item): item is AppModule => Boolean(item)) }))
      .filter((group) => group.items.length > 0),
    allowedGrouped = appModuleGroups
      .filter((group) => group.roles.includes(actualView))
      .map((group) => ({ ...group, items: group.modules.map((key) => allowed.find((item) => item.key === key)).filter((item): item is AppModule => Boolean(item)) }))
      .filter((group) => group.items.length > 0);
  const allowedGroupByKey = (key: string) => allowedGrouped.find((group) => group.key === key);
  const canOpenModule = (key: string) => Boolean(allowed.find((item) => item.key === key));
  const healthChecks = Object.values(health?.checks || {});
  const healthIssues = healthChecks.filter((check) => check.status && check.status !== "ok");
  const healthStatus = health ? (!health.ok || healthIssues.some((check) => check.status === "fail") ? "fail" : healthIssues.length ? "warn" : "ok") : "checking";
  const healthSummary = healthStatus === "ok"
    ? `${health.event?.ticket_types || 0} kaartjie-tipes · ${health.checks?.yoco_payments?.detail || "Yoco nagegaan"} · ${health.checks?.pos_config?.detail || "POS nagegaan"}`
    : healthStatus === "warn"
      ? `${healthIssues.length} waarskuwing${healthIssues.length === 1 ? "" : "s"} — maak status oop`
      : health
        ? "Maak statusblad oop vir detail"
        : "Besig om status te toets";
  const pageFromPath = () => pageFromBrowserPath(window.location.pathname);
  const navigatePage = (next: AppPage, replace = false) => {
    const path = pagePath(next);
    window.history[replace ? "replaceState" : "pushState"]({}, "", path);
    setPage(next);
    setTab("home");
    setSelected(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openGroup = (group: AppModuleGroup & { items: AppModule[] }) => {
    if (group.key === "pos-access") navigatePage("pos");
    else if (group.key === "horses") navigatePage("horses");
    else if (group.key === "grounds") navigatePage("rentals");
    else if (group.items[0]) openModule(group.items[0]);
  };
  useEffect(() => {
    const onPopState = () => setPage(pageFromPath());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  const openModule = (item: AppModule) => {
    if (item.key === "tickets") navigatePage("tickets");
    else if (item.key === "venues") navigatePage("venues");
    else if (item.key === "bar-transactions") navigatePage("bar");
    else setSelected(item.key);
  };
  const chooseTab = (next: AppTab) => {
    if (page !== "home") navigatePage("home");
    setTab(next);
  };
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
        {page === "tickets" ? (
          <AppSubPage eyebrow="My kaartjies" title="Koop of wys kaartjies" icon={Ticket} onBack={() => navigatePage("home")}>
            <TicketsFlow user={user} tickets={tickets} standalone />
          </AppSubPage>
        ) : page === "venues" ? (
          <AppSubPage eyebrow="Terreinbesprekings" title="Bespreek die Skouterrein" icon={Landmark} onBack={() => navigatePage("home")}>
            <VenueBookingPage user={user} />
          </AppSubPage>
        ) : page === "bar" ? (
          <AppSubPage eyebrow="Kroeg" title="Kroegtransaksies" icon={Activity} onBack={() => navigatePage("home")}>
            {canOpenModule("bar-transactions") ? <BarTransactionsPage user={user} /> : <EmptyState icon={<ShieldCheck />} title="Geen toegang" text="Jy het nog nie kroegtransaksie- of refund-regte op hierdie rekening nie." />}
          </AppSubPage>
        ) : page === "pos" ? (
          <AppSubPage eyebrow="POS & Toegang" title="Kies POS-afdeling" icon={ScanLine} onBack={() => navigatePage("home")}>
            {canOpenModule("pos") || canOpenModule("bar-pos") || canOpenModule("kitchen-pos") ? (
              <PosLauncherPanel moduleKey="pos-menu" ModuleIcon={ScanLine} />
            ) : (
              <WorkflowGroupPage group={allowedGroupByKey("pos-access")} onOpen={openModule} fallback="Jy het nog nie POS- of hektoegang op hierdie rekening nie." />
            )}
          </AppSubPage>
        ) : page === "horses" ? (
          <AppSubPage eyebrow="Perde" title="Perde-aansoeke en verwerking" icon={Trophy} onBack={() => navigatePage("home")}>
            <WorkflowGroupPage group={allowedGroupByKey("horses")} onOpen={openModule} fallback="Perde-aansoeke en programskakels is nog nie vir hierdie rekening beskikbaar nie." />
          </AppSubPage>
        ) : page === "rentals" ? (
          <AppSubPage eyebrow="Verhurings" title="Terrein, geboue en goedkeurings" icon={Landmark} onBack={() => navigatePage("home")}>
            <WorkflowGroupPage group={allowedGroupByKey("grounds")} onOpen={openModule} fallback="Verhurings- en terreinopsies is nog nie vir hierdie rekening beskikbaar nie." />
          </AppSubPage>
        ) : tab === "home" && (
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
              <button onClick={() => navigatePage("tickets")}>
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
            <a className={`app-health-strip ${healthStatus}`} href="/status">
              {healthStatus === "ok" ? <CheckCircle2 /> : <Activity />}
              <span>
                <strong>{healthStatus === "ok" ? "Stelsel aanlyn" : healthStatus === "warn" ? "Stelsel waarskuwing" : health ? "Stelsel aandag nodig" : "Toets stelselstatus"}</strong>
                <small>{healthSummary}</small>
              </span>
              <b>Status</b>
            </a>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Jou toegang</p>
                <h2>Wat wil jy doen?</h2>
              </div>
              <span>{grouped.length} groepe</span>
            </div>
            <div className="module-group-list">
              {grouped.map((group) => (
                <AppModuleGroupCard key={group.key} group={group} onOpen={openModule} onOpenGroup={() => openGroup(group)} />
              ))}
            </div>
          </>
        )}
        {tab === "messages" && (
          <MessagesPanel user={user} />
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
        <NavButton label="Home" icon={Home} active={page === "home" && tab === "home"} onClick={() => chooseTab("home")} />
        <NavButton label="Boodskappe" icon={MessageCircle} active={page === "home" && tab === "messages"} onClick={() => chooseTab("messages")} />
        <NavButton label="Kalender" icon={CalendarDays} active={page === "home" && tab === "calendar"} onClick={() => chooseTab("calendar")} />
        <NavButton label="Profiel" icon={CircleUserRound} active={page === "home" && tab === "profile"} onClick={() => chooseTab("profile")} />
      </nav>
      {selected && canOpenModule(selected) && <ModuleSheet moduleKey={selected} user={user} tickets={tickets} wallets={wallets} onClose={() => { setSelected(null); window.history.replaceState({}, "", pagePath(page)); }} />}
    </main>
  );
}

function pageFromBrowserPath(pathname: string): AppPage {
  if (pathname === "/kaartjies") return "tickets";
  if (pathname === "/terreinbesprekings") return "venues";
  if (pathname === "/kroeg") return "bar";
  if (pathname === "/pos") return "pos";
  if (pathname === "/perde" || pathname === "/horses") return "horses";
  if (pathname === "/verhurings") return "rentals";
  return "home";
}

function isAppDeepLinkPath(pathname: string) {
  return pageFromBrowserPath(pathname) !== "home";
}

function moduleFromBrowserQuery(search: string) {
  const moduleKey = new URLSearchParams(search).get("module") || "";
  return appModules.some((item) => item.key === moduleKey) ? moduleKey : null;
}

function pagePath(page: AppPage) {
  if (page === "tickets") return "/kaartjies";
  if (page === "venues") return "/terreinbesprekings";
  if (page === "bar") return "/kroeg";
  if (page === "pos") return "/pos";
  if (page === "horses") return "/perde";
  if (page === "rentals") return "/verhurings";
  return "/";
}

function AppModuleGroupCard({ group, onOpen, onOpenGroup }: { group: AppModuleGroup & { items: AppModule[] }; onOpen: (item: AppModule) => void; onOpenGroup: () => void }) {
  const GroupIcon = group.icon;
  const previewItems = group.items.slice(0, 3);
  const extraCount = Math.max(0, group.items.length - previewItems.length);
  return (
    <article className="module-group-card">
      <button className="module-group-header" onClick={onOpenGroup}>
        <span className="module-icon">
          <GroupIcon />
        </span>
        <span>
          <strong>{group.title}</strong>
          <small>{group.detail}</small>
        </span>
        <b>{group.items.length}</b>
      </button>
      <div>
        {previewItems.map((item) => (
          <AppModuleCard key={item.key} item={item} onOpen={() => onOpen(item)} compact />
        ))}
        {extraCount > 0 && (
          <button className="module-more-button" onClick={onOpenGroup}>
            Wys nog {extraCount} opsie{extraCount === 1 ? "" : "s"} <ArrowRight />
          </button>
        )}
      </div>
    </article>
  );
}

function WorkflowGroupPage({ group, onOpen, fallback }: { group?: AppModuleGroup & { items: AppModule[] }; onOpen: (item: AppModule) => void; fallback: string }) {
  if (!group) return <EmptyState icon={<ShieldCheck />} title="Geen toegang" text={fallback} />;
  return (
    <section className="workflow-group-page">
      <p>{group.detail}</p>
      <div className="workflow-option-list">
        {group.items.map((item) => (
          <AppModuleCard key={item.key} item={item} onOpen={() => onOpen(item)} />
        ))}
      </div>
      <div className="handoff">
        <strong>Een backend, verskillende aansigte</strong>
        <p>Hierdie PWA wys net die aksies waarvoor jou rekening regte het. Elke aksie word steeds teen die bestaande web/backend-regte nagegaan.</p>
      </div>
    </section>
  );
}

function AppModuleCard({ item, onOpen, compact = false }: { item: AppModule; onOpen: () => void; compact?: boolean }) {
  const Icon = item.icon;
  const status = item.status || (item.live ? "live" : "coming");
  const label = status === "live" ? "Live" : status === "admin" ? "Web/admin skerm" : "Kom binnekort";
  const content = (
    <>
      <span className="module-icon">
        <Icon />
      </span>
      <span className="module-copy">
        <strong>{item.title}</strong>
        <small>{item.detail}</small>
        <em data-status={status}>{label}</em>
      </span>
      <ChevronRight className="chevron" />
    </>
  );
  return (
    <button className={`module-card${compact ? " compact" : ""}`} onClick={onOpen}>
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
function AppSubPage({ eyebrow, title, icon: Icon, onBack, children }: { eyebrow: string; title: string; icon: LucideIcon; onBack: () => void; children: React.ReactNode }) {
  return (
    <section className="app-subpage">
      <header className="subpage-header">
        <button onClick={onBack} aria-label="Terug na tuisblad"><ArrowLeft /></button>
        <span className="subpage-icon"><Icon /></span>
        <div><p>{eyebrow}</p><h1>{title}</h1></div>
      </header>
      <div className="subpage-body">{children}</div>
    </section>
  );
}

function VenueBookingPage({ user }: { user: AppUser }) {
  const [requests, setRequests] = useState<VenueRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const loadRequests = async () => {
    try {
      const result = await api("/api/app/venue-requests");
      setRequests(result.requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Besprekings kon nie gelaai word nie");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    void api("/api/app/venue-requests")
      .then((result) => { if (active) setRequests(result.requests || []); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Besprekings kon nie gelaai word nie"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/app/venue-requests", {
        method: "POST",
        body: JSON.stringify({
          event_name: form.get("event_name"), event_type: form.get("event_type"),
          preferred_date: form.get("preferred_date"), end_date: form.get("end_date"),
          expected_guests: form.get("expected_guests"), venue_area: form.get("venue_area"),
          contact_name: form.get("contact_name"), contact_phone: form.get("contact_phone"), details: form.get("details"),
        }),
      });
      event.currentTarget.reset();
      setMessage("Dankie. Jou terreinbesprekingsversoek is ontvang en sal deur die Skoukantoor opgevolg word.");
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Die versoek kon nie gestuur word nie");
    } finally {
      setBusy(false);
    }
  };
  const statusLabel = (status: string) => status === "approved" ? "Goedgekeur" : status === "declined" ? "Afgekeur" : status === "info_required" ? "Meer inligting nodig" : status === "reviewing" ? "Word hersien" : "Ontvang";
  return (
    <div className="venue-page-content">
      <article className="venue-intro-card">
        <small>VILLIERSDORP SKOUGRONDE</small>
        <h2>’n Plek vir jou volgende geleentheid</h2>
        <p>Stuur jou besonderhede vir beskikbaarheid, ’n terreinvoorstel en ’n formele kwotasie. Geen bespreking is finaal voordat dit goedgekeur is nie.</p>
      </article>
      <form className="venue-request-form" onSubmit={submit}>
        <div className="form-section-heading"><span>1</span><div><strong>Geleentheid</strong><small>Vertel ons wat jy beplan.</small></div></div>
        <label>Naam van geleentheid<input name="event_name" required placeholder="Byvoorbeeld: familiefees of fondsinsameling" /></label>
        <div className="venue-form-grid">
          <label>Tipe geleentheid<select name="event_type" defaultValue="private"><option value="private">Privaat funksie</option><option value="community">Gemeenskapsgeleentheid</option><option value="agriculture">Landbougeleentheid</option><option value="sport">Sportgeleentheid</option><option value="other">Ander</option></select></label>
          <label>Verwagte gaste<input name="expected_guests" type="number" min="1" inputMode="numeric" placeholder="250" /></label>
        </div>
        <div className="venue-form-grid">
          <label>Voorkeurdatum<input name="preferred_date" type="date" required /></label>
          <label>Einddatum, indien meerdaags<input name="end_date" type="date" /></label>
        </div>
        <label>Terrein of afdeling<select name="venue_area" defaultValue="Hele skougronde"><option>Hele skougronde</option><option>Hoofarena</option><option>Perde-arena</option><option>Hoofverhoog-area</option><option>Nywerheidsaal</option><option>Ander afdeling</option></select></label>
        <div className="form-section-heading"><span>2</span><div><strong>Kontak en behoeftes</strong><small>Ons gebruik dit om jou versoek op te volg.</small></div></div>
        <div className="venue-form-grid">
          <label>Kontakpersoon<input name="contact_name" required defaultValue={user.name} /></label>
          <label>Selfoonnommer<input name="contact_phone" required inputMode="tel" defaultValue={user.phone || ""} /></label>
        </div>
        <label>Besonderhede en terreinbehoeftes<textarea name="details" required placeholder="Beskryf die geleentheid, opstelling, elektrisiteit, toegang, parkering of enige ander behoeftes." /></label>
        {message && <p className="success-note"><CheckCircle2 />{message}</p>}
        {error && <p className="form-error">{error}</p>}
        <button className="app-primary" disabled={busy}>{busy ? <RefreshCw className="spin" /> : <ClipboardCheck />}{busy ? "Stuur versoek…" : "Stuur besprekingsversoek"}</button>
        <small className="venue-disclaimer">Die Skoukantoor bevestig beskikbaarheid, koste, voorwaardes en die finale bespreking afsonderlik.</small>
      </form>
      <section className="venue-request-history">
        <div className="section-heading"><div><p className="eyebrow">Opvolg</p><h2>My versoeke</h2></div><span>{requests.length}</span></div>
        {loading ? <p className="loading-line"><RefreshCw className="spin" /> Laai versoeke…</p> : requests.length ? requests.map((request) => (
          <article key={request.id}>
            <div><small>{request.preferred_date}</small><strong>{request.event_name}</strong><p>{request.venue_area}{request.expected_guests ? ` · ${request.expected_guests} gaste` : ""}</p></div>
            <span data-status={request.status}>{statusLabel(request.status)}</span>
          </article>
        )) : <EmptyState icon={<Landmark />} title="Nog geen versoeke nie" text="Jou eerste terreinbesprekingsversoek sal hier verskyn." />}
      </section>
    </div>
  );
}

function BarTransactionsPage({ user }: { user: AppUser }) {
  const [transactions, setTransactions] = useState<BarTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [canRefund, setCanRefund] = useState(hasAnyPermission(user, ["bar_refunds"]));
  const [activeRefundId, setActiveRefundId] = useState<number | null>(null);
  const [busyRefundId, setBusyRefundId] = useState<number | null>(null);
  const [refundAmount, setRefundAmount] = useState<Record<number, string>>({});
  const [refundMethod, setRefundMethod] = useState<Record<number, string>>({});
  const [refundReason, setRefundReason] = useState<Record<number, string>>({});
  const [refundKeys, setRefundKeys] = useState<Record<number, string>>({});

  const loadTransactions = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api("/api/app/bar/transactions?limit=15");
      setTransactions(result.transactions || []);
      setCanRefund(Boolean(result.can_refund));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kroegtransaksies kon nie gelaai word nie");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const boot = queueMicrotask(() => void loadTransactions());
    return () => void boot;
  }, []);

  const submitRefund = async (transaction: BarTransaction) => {
    const amount = Math.round(Number(refundAmount[transaction.id] || transaction.refundable_cents / 100) * 100);
    const method = refundMethod[transaction.id] || (transaction.payment?.method === "event_balance" ? "wallet" : "card");
    const reason = String(refundReason[transaction.id] || "").trim();
    if (!Number.isFinite(amount) || amount < 1 || amount > transaction.refundable_cents) {
      setMessage("");
      setError("Refund bedrag is ongeldig.");
      return;
    }
    if (reason.length < 3) {
      setMessage("");
      setError("Gee asseblief eers ’n rede vir die refund.");
      return;
    }
    if (method === "wallet" && !transaction.wallet_id && transaction.payment?.method !== "event_balance") {
      setMessage("");
      setError("Hierdie transaksie het nie ’n kliëntbeursie gekoppel nie. Kies Yoco-kaart refund/opvolg, of koppel die kliënt se beursie eers.");
      return;
    }
    const idempotencyKey = refundKeys[transaction.id] || crypto.randomUUID();
    setRefundKeys((current) => ({ ...current, [transaction.id]: idempotencyKey }));
    setBusyRefundId(transaction.id);
    setError("");
    setMessage("");
    try {
      const result = await api(`/api/app/bar/transactions/${transaction.id}/refund`, {
        method: "POST",
        body: JSON.stringify({
          amount_cents: amount,
          method,
          reason,
          idempotency_key: idempotencyKey,
        }),
      });
      if (result.transaction) {
        setTransactions((current) => current.map((row) => row.id === transaction.id ? result.transaction : row));
      }
      setActiveRefundId(null);
      setRefundKeys((current) => {
        const next = { ...current };
        delete next[transaction.id];
        return next;
      });
      setMessage(result.refund?.status === "pending_provider" ? "Refund is veilig aangeteken. Yoco het nog nie finaal bevestig nie; verfris transaksies oor ’n oomblik." : "Refund is voltooi en die transaksie is opgedateer.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund kon nie gestoor word nie");
    } finally {
      setBusyRefundId(null);
    }
  };

  const paymentLabel = (transaction: BarTransaction) => {
    if (!transaction.payment) return "Geen betaling";
    if (transaction.payment.method === "event_balance") return "Skoubeursie";
    if (transaction.payment.method.includes("yoco") || transaction.payment.provider === "yoco") return "Yoco-kaart";
    return transaction.payment.method;
  };

  return (
    <div className="bar-page-content">
      <article className="bar-intro-card">
        <small>STAFF TOEGANG</small>
        <h2>Laaste kroegtransaksies</h2>
        <p>Slegs personeel met kroeg- of refund-regte kan hierdie aksies uitvoer. Die bediener kontroleer die regte weer voordat ’n refund gestoor word.</p>
      </article>
      <button className="sheet-primary-link sheet-primary-button refresh-transactions" onClick={() => void loadTransactions()} disabled={loading}>
        {loading ? "Laai transaksies…" : "Verfris transaksies"} <RefreshCw className={loading ? "spin" : ""} />
      </button>
      {message && <p className="success-note"><CheckCircle2 />{message}</p>}
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="loading-line"><RefreshCw className="spin" /> Laai kroegtransaksies…</p>
      ) : transactions.length ? (
        <div className="bar-transaction-list">
          {transactions.map((transaction) => {
            const defaultMethod = transaction.payment?.method === "event_balance" ? "wallet" : "card";
            const activeMethod = refundMethod[transaction.id] || defaultMethod;
            const refundOpen = activeRefundId === transaction.id;
            return (
              <article className="bar-transaction-card" key={transaction.id}>
                <header>
                  <div>
                    <small>{new Date(transaction.created_at * 1000).toLocaleString("af-ZA")}</small>
                    <strong>{transaction.order_code || `Transaksie #${transaction.id}`}</strong>
                    <span>{transaction.location_name} · {transaction.operator_name || "Onbekende kassier"}</span>
                  </div>
                  <b>R {(transaction.total_cents / 100).toFixed(2)}</b>
                </header>
                <div className="bar-transaction-meta">
                  <span>{paymentLabel(transaction)}</span>
                  <span>{transaction.customer_name || "Walk-in"}</span>
                  {transaction.refunded_cents > 0 && <span>Refunds: R {(transaction.refunded_cents / 100).toFixed(2)}</span>}
                </div>
                <ul className="bar-item-list">
                  {transaction.items.map((item) => (
                    <li key={item.id}>
                      <span>{item.name}</span>
                      <em>{item.qty} × R {(item.unit_price_cents / 100).toFixed(2)}</em>
                    </li>
                  ))}
                </ul>
                {transaction.refunds.length > 0 && (
                  <div className="refund-history">
                    {transaction.refunds.map((refund) => (
                      <small key={refund.id}>{refund.method} · R {(refund.amount_cents / 100).toFixed(2)} · {refund.status}</small>
                    ))}
                  </div>
                )}
                {canRefund && transaction.refundable_cents > 0 && (
                  <>
                    <button className="refund-toggle" onClick={() => setActiveRefundId(refundOpen ? null : transaction.id)}>
                      {refundOpen ? "Maak refund toe" : "Refund transaksie"}
                    </button>
                    {refundOpen && (
                      <div className="refund-panel">
                        <div className="refund-form-grid">
                          <label>Bedrag
                            <input value={refundAmount[transaction.id] ?? (transaction.refundable_cents / 100).toFixed(2)} inputMode="decimal" onChange={(event) => setRefundAmount((current) => ({ ...current, [transaction.id]: event.target.value }))} />
                          </label>
                          <label>Metode
                            <select value={activeMethod} onChange={(event) => setRefundMethod((current) => ({ ...current, [transaction.id]: event.target.value }))}>
                              <option value="wallet">Terug na beursie</option>
                              <option value="card">Yoco-kaart refund</option>
                            </select>
                          </label>
                        </div>
                        {activeMethod === "card" && <p className="provider-note">Die app probeer die Yoco-kaart refund dadelik. As Yoco stadig antwoord, word die refund veilig as opvolg aangeteken met dieselfde refund-sleutel.</p>}
                        {busyRefundId === transaction.id && <p className="provider-note">Besig om veilig te stoor. As die netwerk stadig is en jy probeer weer, gebruik die app dieselfde refund-sleutel om ’n dubbel refund te voorkom.</p>}
                        <label>Rede vir refund
                          <textarea value={refundReason[transaction.id] || ""} onChange={(event) => setRefundReason((current) => ({ ...current, [transaction.id]: event.target.value }))} placeholder="Byvoorbeeld: verkeerde item, duplikaat, kassier-fout" />
                        </label>
                        <button className="refund-submit" disabled={busyRefundId === transaction.id} onClick={() => void submitRefund(transaction)}>
                          {busyRefundId === transaction.id ? "Stoor refund…" : "Stoor refund"}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<Activity />} title="Geen kroegtransaksies gevind nie" text="Sodra kroegverkope deur POS V1 loop, sal die laaste transaksies hier verskyn." />
      )}
    </div>
  );
}

function ModuleSheet({ moduleKey, user, tickets, wallets, onClose }: { moduleKey: string; user: AppUser; tickets: AppTicket[]; wallets: AppWallet[]; onClose: () => void }) {
  const moduleInfo = appModules.find((item) => item.key === moduleKey);
  const ModuleIcon = moduleInfo?.icon;
  const isPosLauncher = ["pos", "bar-pos", "kitchen-pos", "gates"].includes(moduleKey);
  const staffReview = staffReviewScopes[moduleKey];
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section className="detail-sheet live-sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        <button className="sheet-close" onClick={onClose} aria-label="Maak toe">
          ×
        </button>
        {moduleKey === "tickets" ? (
          <TicketsFlow user={user} tickets={tickets} />
        ) : moduleKey === "family" ? (
          <FamilyFlow />
        ) : moduleKey === "wallet" ? (
          <WalletFlow wallets={wallets} />
        ) : moduleKey === "photos" ? (
          <PhotosFlow />
        ) : moduleKey === "wallet-topup" ? (
          <PosWalletTopupPanel />
        ) : requestModuleDetails[moduleKey] ? (
          <ServiceRequestFlow moduleKey={moduleKey} user={user} moduleInfo={moduleInfo} config={requestModuleDetails[moduleKey]} />
        ) : moduleKey === "horse-processing" && staffReview ? (
          <HorseApplicationsPanel moduleInfo={moduleInfo} ModuleIcon={ModuleIcon} />
        ) : staffReview ? (
          <StaffRequestReviewPanel moduleKey={moduleKey} moduleInfo={moduleInfo} ModuleIcon={ModuleIcon} config={staffReview} />
        ) : isPosLauncher ? (
          <PosLauncherPanel moduleKey={moduleKey} moduleInfo={moduleInfo} ModuleIcon={ModuleIcon} />
        ) : (
          <ConnectedModulePanel moduleKey={moduleKey} moduleInfo={moduleInfo} ModuleIcon={ModuleIcon} />
        )}
      </section>
    </div>
  );
}

function PosLauncherPanel({ moduleKey, moduleInfo, ModuleIcon }: { moduleKey: string; moduleInfo?: AppModule; ModuleIcon?: LucideIcon }) {
  const [config, setConfig] = useState<AppPosConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWalletTopup, setShowWalletTopup] = useState(false);
  const preferred = moduleKey === "bar-pos" ? "bar-pos" : moduleKey === "kitchen-pos" ? "kitchen-pos" : moduleKey === "gates" ? "gate-scanner" : "gate-pos";
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await api("/api/app/pos/config");
        if (active) setConfig(result);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "POS-afdelings kon nie gelaai word nie");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);
  const liveOptions: PosLaunchOption[] = (config?.departments || []).map((department) => ({
    key: department.area === "hek" ? "gate-pos" : department.area === "kroeg" ? "bar-pos" : department.area === "kombuis" ? "kitchen-pos" : `${department.area}-pos`,
    title: department.title,
    detail: department.detail,
    href: department.launch_url || undefined,
    status: department.status === "live" ? "live" : "coming",
    badge: department.badge,
  }));
  const optionMatchesModule = (option: PosLaunchOption) => {
    if (moduleKey === "bar-pos") return option.key === "bar-pos" || option.key === "wallet-topup";
    if (moduleKey === "kitchen-pos") return option.key === "kitchen-pos";
    if (moduleKey === "gates") return option.key === "gate-scanner";
    if (moduleKey === "pos") return option.key === "gate-pos" || option.key === "gate-scanner" || option.key === "wallet-topup";
    return true;
  };
  const scopedLiveOptions = liveOptions.filter(optionMatchesModule);
  const scopedFallbackOptions = posLaunchOptions.filter(optionMatchesModule);
  const liveKeys = new Set(scopedLiveOptions.map((option) => option.key));
  const fallbackAdditions = scopedFallbackOptions.filter((option) => !liveKeys.has(option.key));
  const ordered = [...(scopedLiveOptions.length ? [...scopedLiveOptions, ...fallbackAdditions] : scopedFallbackOptions)].sort((a, b) => (a.key === preferred ? -1 : b.key === preferred ? 1 : 0));
  if (showWalletTopup) return <PosWalletTopupPanel onBack={() => setShowWalletTopup(false)} />;
  return (
    <>
      <span className="detail-icon">{ModuleIcon && <ModuleIcon />}</span>
      <p className="eyebrow">POS & toegang</p>
      <h2>{moduleInfo?.title || "Kies POS-afdeling"}</h2>
      <p className="module-availability" data-status={moduleInfo?.status || "admin"}>
        Mobiele launch-pad vir personeel se verkoop- en toegangskerms.
      </p>
      <p>Die PWA hou die menu skoon: kies Hek, Kroeg, Kombuis of enige toekomstige POS-afdeling wat in die backend opgestel word. Die bestaande POS backend bly die bron van waarheid vir sessies, betalings, voorraad en cash-up.</p>
      {loading && <p className="loading-line"><RefreshCw className="spin" /> Laai live POS-afdelings…</p>}
      {error && <p className="provider-note">Live POS-afdelings kon nie gelees word nie: {error}. Die veilige standaard-skakels bly beskikbaar.</p>}
      {config?.event?.name && <p className="provider-note">Gekoppel aan: {config.event.name}</p>}
      <div className="pos-launch-grid">
        {ordered.map((option) => (
          option.key === "wallet-topup" ? (
            <button className="pos-launch-card" type="button" key={option.key} onClick={() => setShowWalletTopup(true)}>
              <span>{option.badge}</span>
              <strong>{option.title}</strong>
              <small>{option.detail}</small>
              <em data-status={option.status}>Live</em>
              <ArrowRight />
            </button>
          ) : option.href ? (
            <a className="pos-launch-card" href={option.href} key={option.key}>
              <span>{option.badge}</span>
              <strong>{option.title}</strong>
              <small>{option.detail}</small>
              <em data-status={option.status}>{option.status === "live" ? "Live" : "Kom binnekort"}</em>
              <ArrowRight />
            </a>
          ) : (
            <article className="pos-launch-card disabled" key={option.key}>
              <span>{option.badge}</span>
              <strong>{option.title}</strong>
              <small>{option.detail}</small>
              <em data-status={option.status}>Kom binnekort</em>
            </article>
          )
        ))}
      </div>
      <div className="handoff">
        <strong>Backend-koppeling</strong>
        <p>Hek en Kroeg gebruik reeds dieselfde POS V1 backend. Kombuis word eers live wanneer die Kombuis group/location/products in admin geskep en getoets is.</p>
      </div>
    </>
  );
}

function ConnectedModulePanel({ moduleKey, moduleInfo, ModuleIcon }: { moduleKey: string; moduleInfo?: AppModule; ModuleIcon?: LucideIcon }) {
  const panel = modulePanels[moduleKey];
  const status = moduleInfo?.status || (moduleInfo?.live ? "live" : "coming");
  const statusText = status === "live" ? "Hierdie funksie werk reeds in die app." : status === "admin" ? "Hierdie funksie gebruik tans die bestaande web/admin skerm of vereis admin-toegang." : "Hierdie funksie is gemerk as kom binnekort.";
  return (
    <>
      <span className="detail-icon">{ModuleIcon && <ModuleIcon />}</span>
      <p className="eyebrow">Skou-app</p>
      <h2>{moduleInfo?.title || "Module"}</h2>
      <p className="module-availability" data-status={status}>{statusText}</p>
      <p>{panel?.status || moduleInfo?.detail}</p>
      {(moduleInfo?.href || panel?.href) && (
        <a className="sheet-primary-link module-launch" href={moduleInfo?.href || panel?.href}>
          {panel?.action || "Maak live skerm oop"} <ArrowRight />
        </a>
      )}
      <div className="module-status-grid">
        <section>
          <strong>Reeds bruikbaar</strong>
          <ul>{(panel?.ready || ["Menu en access control is beskikbaar."]).map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <section>
          <strong>Volgende koppeling</strong>
          <ul>{(panel?.next || ["Finale live data en aksies word aan die bestaande Skou-stelsel gekoppel."]).map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>
      <div className="handoff">
        <strong>Access word reeds deur die server beheer</strong>
        <p>As hierdie module nie vir ’n gebruiker wys nie, gee eers die toepaslike permission in Admin → Users → Access.</p>
      </div>
    </>
  );
}

function HorseApplicationsPanel({ moduleInfo, ModuleIcon }: { moduleInfo?: AppModule; ModuleIcon?: LucideIcon }) {
  const [applications, setApplications] = useState<HorseBackendApplication[]>([]);
  const [eventName, setEventName] = useState("");
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setWarning("");
    try {
      const result = await api("/api/app/staff/horse-applications?limit=50");
      setApplications(result.applications || []);
      setEventName(result.event?.name || "");
      setSettings(result.settings || {});
      setWarning(result.warning || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Perde-aansoeke kon nie gelaai word nie");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => { active = false; };
  }, [load]);
  return (
    <>
      <span className="detail-icon">{ModuleIcon && <ModuleIcon />}</span>
      <p className="eyebrow">Perde</p>
      <h2>Verwerk perde-aansoeke</h2>
      <p className="request-intro">Hierdie lys kom direk van die bestaande perde-backend af. Goedkeuring, fakture, klasse en deposito’s bly vir nou op die bestaande perde-admin sodat ons nie werkende verwerking dupliseer nie.</p>
      {moduleInfo?.href && (
        <a className="sheet-primary-link module-launch secondary-launch" href={moduleInfo.href}>
          Maak bestaande perde-admin oop <ArrowRight />
        </a>
      )}
      {eventName && <p className="provider-note">Gekoppel aan: {eventName}</p>}
      {typeof settings.is_open !== "undefined" && (
        <p className="provider-note">Aansoeke is tans {Number(settings.is_open) ? "oop" : "gesluit"}{settings.closing_date ? ` · sluit ${String(settings.closing_date)}` : ""}</p>
      )}
      {warning && <p className="provider-note">{warning}</p>}
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="loading-line"><RefreshCw className="spin" /> Laai bestaande perde-aansoeke…</p>
      ) : applications.length ? (
        <section className="staff-review-list">
          {applications.map((application) => (
            <article key={application.id} className="staff-review-card">
              <div className="staff-review-head">
                <div>
                  <small>#{application.id} · {new Date(application.created_at * 1000).toLocaleString("af-ZA")}</small>
                  <strong>{application.stud_name || application.contact_name || "Perde-aansoek"}</strong>
                  <p>{application.contact_name}{application.phone ? ` · ${application.phone}` : ""}{application.whatsapp ? ` · WhatsApp ${application.whatsapp}` : ""}{application.email ? ` · ${application.email}` : ""}</p>
                </div>
                <span data-status={application.status}>{serviceStatusLabel(application.status)}</span>
              </div>
              {application.notes && <p className="staff-review-detail">{application.notes}</p>}
              <div className="module-status-grid">
                <section>
                  <strong>Faktuur</strong>
                  <ul>
                    <li>{application.invoice_no || "Nog geen faktuur gekoppel nie"}</li>
                    <li>Status: {application.invoice_status || "—"}</li>
                    <li>Totaal: R{(application.total_cents / 100).toFixed(2)}</li>
                  </ul>
                </section>
                <section>
                  <strong>Verwerking</strong>
                  <ul>
                    <li>Lid bevestig: {application.membership_agreed ? "Ja" : "Nee"}</li>
                    <li>Portal: {application.portal_status || "—"}</li>
                    <li>Goedkeuring e-pos: {application.approval_email_sent_at ? "gestuur" : "nog nie"}</li>
                  </ul>
                </section>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState icon={ModuleIcon ? <ModuleIcon /> : <ClipboardCheck />} title="Geen perde-aansoeke gevind nie" text="Daar is tans geen bestaande perde-aansoeke vir die aktiewe skou nie, of jou gebruiker het nie die nodige perde-regte nie." />
      )}
      <button className="sheet-secondary" onClick={() => void load()} disabled={loading}>
        <RefreshCw className={loading ? "spin" : ""} /> Herlaai perde-aansoeke
      </button>
    </>
  );
}

function StaffRequestReviewPanel({ moduleKey, moduleInfo, ModuleIcon, config }: { moduleKey: string; moduleInfo?: AppModule; ModuleIcon?: LucideIcon; config: { scope: string; title: string; intro: string } }) {
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { status: string; admin_notes: string }>>({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const panel = modulePanels[moduleKey];
  const keyFor = (request: StaffRequest) => `${request.source}:${request.id}`;
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api(`/api/app/staff/requests?scope=${encodeURIComponent(config.scope)}&limit=50`);
      const rows = result.requests || [];
      setRequests(rows);
      setDrafts(Object.fromEntries(rows.map((request: StaffRequest) => [keyFor(request), { status: request.status || "submitted", admin_notes: request.admin_notes || "" }])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Versoeke kon nie gelaai word nie");
    } finally {
      setLoading(false);
    }
  }, [config.scope]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void load();
    });
    return () => { active = false; };
  }, [load]);
  const updateDraft = (request: StaffRequest, patch: Partial<{ status: string; admin_notes: string }>) => {
    const key = keyFor(request);
    setDrafts((current) => ({ ...current, [key]: { status: current[key]?.status || request.status || "submitted", admin_notes: current[key]?.admin_notes ?? request.admin_notes ?? "", ...patch } }));
  };
  const save = async (request: StaffRequest) => {
    const key = keyFor(request);
    const draft = drafts[key] || { status: request.status, admin_notes: request.admin_notes || "" };
    setBusyKey(key);
    setError("");
    setMessage("");
    try {
      const result = await api(`/api/app/staff/requests/${encodeURIComponent(request.source)}/${request.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: draft.status, admin_notes: draft.admin_notes }),
      });
      setRequests((current) => current.map((row) => keyFor(row) === key ? result.request : row));
      setDrafts((current) => ({ ...current, [key]: { status: result.request.status, admin_notes: result.request.admin_notes || "" } }));
      setMessage("Versoek is opgedateer.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Versoek kon nie opgedateer word nie");
    } finally {
      setBusyKey("");
    }
  };
  return (
    <>
      <span className="detail-icon">{ModuleIcon && <ModuleIcon />}</span>
      <p className="eyebrow">Personeel verwerking</p>
      <h2>{config.title}</h2>
      <p className="request-intro">{config.intro}</p>
      {moduleInfo?.href && (
        <a className="sheet-primary-link module-launch secondary-launch" href={moduleInfo.href}>
          Maak bestaande admin/web skerm oop <ArrowRight />
        </a>
      )}
      {message && <p className="success-note"><CheckCircle2 />{message}</p>}
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="loading-line"><RefreshCw className="spin" /> Laai versoeke…</p>
      ) : requests.length ? (
        <section className="staff-review-list">
          {requests.map((request) => {
            const key = keyFor(request);
            const draft = drafts[key] || { status: request.status || "submitted", admin_notes: request.admin_notes || "" };
            return (
              <article key={key} className="staff-review-card">
                <div className="staff-review-head">
                  <div>
                    <small>{request.source === "venue" ? "Terreinbespreking" : request.module_key} · {new Date(request.created_at * 1000).toLocaleString("af-ZA")}</small>
                    <strong>{request.title}</strong>
                    <p>{request.contact_name} · {request.contact_phone}{request.contact_email ? ` · ${request.contact_email}` : ""}</p>
                  </div>
                  <span data-status={request.status}>{serviceStatusLabel(request.status)}</span>
                </div>
                <p className="staff-review-detail">{request.details}</p>
                {request.source === "venue" && <small className="provider-note">{request.venue_area}{request.preferred_date ? ` · ${request.preferred_date}` : ""}{request.expected_guests ? ` · ${request.expected_guests} gaste` : ""}</small>}
                <div className="staff-review-controls">
                  <label>Status
                    <select value={draft.status} onChange={(event) => updateDraft(request, { status: event.target.value })}>
                      <option value="submitted">Ontvang</option>
                      <option value="reviewing">Word hersien</option>
                      <option value="approved">Goedgekeur</option>
                      <option value="declined">Afgekeur</option>
                      <option value="cancelled">Gekanselleer</option>
                      <option value="completed">Voltooi</option>
                    </select>
                  </label>
                  <label>Admin nota
                    <textarea value={draft.admin_notes} onChange={(event) => updateDraft(request, { admin_notes: event.target.value })} placeholder="Kort opvolgnota vir die aansoeker of adminspan." />
                  </label>
                </div>
                <button className="app-primary compact-action" disabled={busyKey === key} onClick={() => void save(request)}>
                  {busyKey === key ? <RefreshCw className="spin" /> : <ClipboardCheck />}
                  {busyKey === key ? "Stoor…" : "Stoor status"}
                </button>
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState icon={ModuleIcon ? <ModuleIcon /> : <ClipboardCheck />} title="Geen versoeke gevind nie" text="Daar is tans geen app-versoeke vir hierdie afdeling of jou regte nie." />
      )}
      {panel && (
        <div className="handoff">
          <strong>Volgende koppeling</strong>
          <p>{panel.next.join(" · ")}</p>
        </div>
      )}
      <button className="sheet-secondary" onClick={() => void load()} disabled={loading || Boolean(busyKey)}>
        <RefreshCw className={loading ? "spin" : ""} /> Herlaai lys
      </button>
    </>
  );
}

function ServiceRequestFlow({ moduleKey, user, moduleInfo, config }: { moduleKey: string; user: AppUser; moduleInfo?: AppModule; config: ServiceModuleConfig }) {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const ModuleIcon = moduleInfo?.icon || ClipboardCheck;
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api(`/api/app/service-requests?module_key=${encodeURIComponent(moduleKey)}`);
      setRequests(result.requests || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Versoeke kon nie gelaai word nie");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let active = true;
    void api(`/api/app/service-requests?module_key=${encodeURIComponent(moduleKey)}`)
      .then((result) => { if (active) setRequests(result.requests || []); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Versoeke kon nie gelaai word nie"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [moduleKey]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload: Record<string, FormDataEntryValue | null> = {};
    config.fields.forEach((field) => {
      payload[field.key] = form.get(field.key);
    });
    const title = String(form.get("title") || config.title).trim();
    try {
      await api("/api/app/service-requests", {
        method: "POST",
        body: JSON.stringify({
          module_key: moduleKey,
          request_type: config.requestType,
          title,
          contact_name: form.get("contact_name") || user.name,
          contact_email: form.get("contact_email") || user.email || "",
          contact_phone: form.get("contact_phone") || user.phone || "",
          details: form.get("details"),
          payload,
        }),
      });
      event.currentTarget.reset();
      setMessage("Dankie. Jou versoek is ontvang en sal deur die regte afdeling opgevolg word.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Die versoek kon nie gestuur word nie");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <span className="detail-icon"><ModuleIcon /></span>
      <p className="eyebrow">{config.eyebrow}</p>
      <h2>{config.title}</h2>
      <p className="request-intro">{config.intro}</p>
      {moduleInfo?.href && (
        <a className="sheet-primary-link module-launch secondary-launch" href={moduleInfo.href}>
          Maak bestaande admin/web skerm oop <ArrowRight />
        </a>
      )}
      <form className="service-request-form" onSubmit={submit}>
        <div className="form-section-heading"><span>1</span><div><strong>Versoek</strong><small>Gee genoeg detail vir die kantoor of afdeling.</small></div></div>
        <label>Opskrif<input name="title" required defaultValue={config.title} /></label>
        {config.fields.map((field) => <ServiceFieldInput key={field.key} field={field} />)}
        <label>Volledige besonderhede<textarea name="details" required placeholder="Skryf hier presies wat moet gebeur, enige datums, persone, bedrae of notas." /></label>
        <div className="form-section-heading"><span>2</span><div><strong>Kontak</strong><small>Hiermee kan die regte persoon opvolg.</small></div></div>
        <div className="venue-form-grid">
          <label>Kontakpersoon<input name="contact_name" required defaultValue={user.name} /></label>
          <label>Selfoonnommer<input name="contact_phone" required inputMode="tel" defaultValue={user.phone || ""} /></label>
        </div>
        <label>E-posadres<input name="contact_email" type="email" defaultValue={user.email || ""} /></label>
        {message && <p className="success-note"><CheckCircle2 />{message}</p>}
        {error && <p className="form-error">{error}</p>}
        <button className="app-primary" disabled={busy}>{busy ? <RefreshCw className="spin" /> : <ClipboardCheck />}{busy ? "Stuur versoek…" : config.primaryLabel || "Stuur versoek"}</button>
      </form>
      <section className="service-request-history">
        <div className="section-heading"><div><p className="eyebrow">Opvolg</p><h2>My versoeke</h2></div><span>{requests.length}</span></div>
        {loading ? <p className="loading-line"><RefreshCw className="spin" /> Laai versoeke…</p> : requests.length ? requests.map((request) => (
          <article key={request.id}>
            <div>
              <small>{new Date(request.created_at * 1000).toLocaleString("af-ZA")}</small>
              <strong>{request.title}</strong>
              <p>{request.details}</p>
              {request.admin_notes && <em>Admin: {request.admin_notes}</em>}
            </div>
            <span data-status={request.status}>{serviceStatusLabel(request.status)}</span>
          </article>
        )) : <EmptyState icon={<ModuleIcon />} title="Nog geen versoeke nie" text="Sodra jy ’n versoek stuur, bly die opvolg hier in die app." />}
      </section>
    </>
  );
}

function ServiceFieldInput({ field }: { field: ServiceField }) {
  const type = field.type || "text";
  if (type === "textarea") {
    return (
      <label>{field.label}
        <textarea name={field.key} required={field.required} placeholder={field.placeholder} />
      </label>
    );
  }
  if (type === "select") {
    return (
      <label>{field.label}
        <select name={field.key} required={field.required} defaultValue="">
          <option value="">Kies ’n opsie</option>
          {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      </label>
    );
  }
  return (
    <label>{field.label}
      <input name={field.key} type={type} required={field.required} placeholder={field.placeholder} inputMode={type === "tel" ? "tel" : type === "number" ? "numeric" : undefined} />
    </label>
  );
}

function serviceStatusLabel(status: string) {
  if (status === "approved") return "Goedgekeur";
  if (status === "declined") return "Afgekeur";
  if (status === "cancelled") return "Gekanselleer";
  if (status === "completed") return "Voltooi";
  if (status === "reviewing") return "Word hersien";
  return "Ontvang";
}

function TicketsFlow({ user, tickets, standalone = false }: { user: AppUser; tickets: AppTicket[]; standalone?: boolean }) {
  const [family, setFamily] = useState<FamilyMember[]>([]);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [buying, setBuying] = useState(standalone);
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
      {!standalone && <><span className="detail-icon"><Ticket /></span><p className="eyebrow">My kaartjies</p><h2>Koop of wys kaartjies</h2></>}
      <div className={standalone ? "ticket-page-tabs" : ""}>
        <button className={`sheet-primary-link sheet-primary-button ${standalone && buying ? "active" : ""}`} onClick={() => setBuying(true)}>
          Koop kaartjies <ArrowRight />
        </button>
        {standalone && <button className={`sheet-primary-link sheet-primary-button ${!buying ? "active" : ""}`} onClick={() => setBuying(false)}>My kaartjies <Ticket /></button>}
      </div>
      {buying && <TicketPurchase user={user} />}
      {error && <p className="form-error">{error}</p>}
      {!buying && (tickets.length ? (
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
      ) : <EmptyState icon={<Ticket />} title="Geen kaartjies gevind nie" text="Nuwe aankope wat by jou bevestigde e-pos en selfoon pas, verskyn outomaties hier." />)}
    </>
  );
}

function TicketPurchase({ user }: { user: AppUser }) {
  const [event, setEvent] = useState<TicketEvent | null>(null);
  const [types, setTypes] = useState<TicketType[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [genders, setGenders] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void api("/api/public/events/villiersdorp-skou-2026")
      .then((result) => {
        if (!active) return;
        setEvent(result.event || null);
        setTypes(result.ticket_types || []);
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Kaartjies kon nie gelaai word nie"); });
    return () => { active = false; };
  }, []);
  const setQuantity = (type: TicketType, next: number) => {
    const limit = type.per_order_limit > 0 ? type.per_order_limit : 20;
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
    setBusy(true);
    setError("");
    try {
      const items = types.filter((type) => (quantities[type.id] || 0) > 0).map((type) => ({ ticket_type_id: type.id, qty: quantities[type.id] }));
      const nameParts = user.name.trim().split(/\s+/);
      const first = nameParts.shift() || user.name;
      const last = nameParts.join(" ");
      const attendees = types.flatMap((type) => Array.from({ length: quantities[type.id] || 0 }, (_, index) => ({
        ticket_type_id: type.id,
        attendee_first: first,
        attendee_last: last,
        phone: user.phone || "",
        gender: type.requires_gender ? genders[`${type.id}-${index}`] || "" : "",
      })));
      const missingGender = attendees.some((attendee) => types.find((type) => type.id === attendee.ticket_type_id)?.requires_gender && !attendee.gender);
      if (missingGender) throw new Error("Kies asseblief die vereiste besonderhede vir elke kaartjie");
      const order = await api("/api/public/orders/create", {
        method: "POST",
        body: JSON.stringify({ event_id: event.id, items, attendees, buyer_name: user.name, email: user.email || "", phone: user.phone || "", method: "pay_now" }),
      });
      const code = order.order?.short_code;
      if (!code) throw new Error("Die bestelling kon nie geskep word nie");
      const payment = await api("/api/payments/yoco/intent", { method: "POST", body: JSON.stringify({ code, app_return: true }) });
      if (!payment.redirect_url) throw new Error("Yoco-betaling kon nie begin nie");
      window.location.assign(payment.redirect_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Die kaartjie-aankoop het misluk");
      setBusy(false);
    }
  };
  if (!event && !error) return <p className="loading-line"><RefreshCw className="spin" /> Laai kaartjies…</p>;
  return (
    <section className="purchase-panel">
      <div className="purchase-heading"><strong>{event?.name || "Villiersdorp Skou 2026"}</strong><span>{count} kaartjie(s)</span></div>
      {event?.sales_closed ? <p className="form-error">Aanlyn kaartjieverkope is gesluit.</p> : (
        <div className="ticket-catalogue">
          {types.map((type) => {
            const quantity = quantities[type.id] || 0;
            return (
              <article key={type.id}>
                <div><strong>{type.name}</strong><small>R {(type.price_cents / 100).toFixed(2)}</small></div>
                <div className="quantity-control">
                  <button type="button" disabled={!quantity} onClick={() => setQuantity(type, quantity - 1)}>−</button>
                  <b>{quantity}</b>
                  <button type="button" onClick={() => setQuantity(type, quantity + 1)}>+</button>
                </div>
                {type.requires_gender && quantity > 0 && (
                  <div className="attendee-details">
                    {Array.from({ length: quantity }, (_, index) => (
                      <label key={index}>Kaartjie {index + 1}
                        <select value={genders[`${type.id}-${index}`] || ""} onChange={(e) => setGenders((current) => ({ ...current, [`${type.id}-${index}`]: e.target.value }))}>
                          <option value="">Kies besonderhede</option><option value="female">Vroulik</option><option value="male">Manlik</option>
                        </select>
                      </label>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      <div className="purchase-total"><span>Totaal</span><strong>R {(total / 100).toFixed(2)}</strong></div>
      <button className="app-primary" disabled={busy || !count || total <= 0 || Boolean(event?.sales_closed)} onClick={() => void buy()}>
        {busy ? <RefreshCw className="spin" /> : <ShieldCheck />}{busy ? "Gaan na Yoco…" : "Betaal veilig met Yoco"}
      </button>
      <small className="payment-note">Jou kaartjies verskyn outomaties in die app nadat Yoco die betaling bevestig het.</small>
    </section>
  );
}

function WalletFlow({ wallets }: { wallets: AppWallet[] }) {
  const [selectedWallet, setSelectedWallet] = useState(wallets[0]?.id || "");
  const [amount, setAmount] = useState(10000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const topup = async () => {
    if (!selectedWallet) return;
    setBusy(true);
    setError("");
    try {
      const result = await api(`/api/app/wallets/${encodeURIComponent(selectedWallet)}/topup-intent`, { method: "POST", body: JSON.stringify({ amount_cents: amount }) });
      if (!result.redirect_url) throw new Error("Yoco-betaling kon nie begin nie");
      window.location.assign(result.redirect_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Die aanvulling kon nie begin nie");
      setBusy(false);
    }
  };
  return (
    <>
      <span className="detail-icon"><WalletCards /></span>
      <p className="eyebrow">My beursie</p>
      <h2>Skoubeursie</h2>
      {wallets.length ? (
        <>
          <div className="wallet-list sheet-list">
            {wallets.map((wallet) => (
              <button className={`wallet-link wallet-select ${selectedWallet === wallet.id ? "selected" : ""}`} key={wallet.id} onClick={() => setSelectedWallet(wallet.id)}>
                <WalletCards /><div><small>{wallet.name}</small><strong>R {(wallet.balance_cents / 100).toFixed(2)}</strong></div><span>{selectedWallet === wallet.id ? "Gekies" : "Kies"}</span>
              </button>
            ))}
          </div>
          <section className="topup-panel">
            <strong>Hoeveel wil jy aanvul?</strong>
            <div className="amount-options">
              {[5000, 10000, 20000, 50000].map((value) => <button key={value} className={amount === value ? "active" : ""} onClick={() => setAmount(value)}>R {value / 100}</button>)}
            </div>
            <label>Ander bedrag
              <input type="number" min="10" max="5000" step="10" value={amount / 100} onChange={(event) => setAmount(Math.round(Number(event.target.value || 0) * 100))} />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button className="app-primary" disabled={busy || amount < 1000 || amount > 500000} onClick={() => void topup()}>
              {busy ? <RefreshCw className="spin" /> : <ShieldCheck />}{busy ? "Gaan na Yoco…" : `Betaal R ${(amount / 100).toFixed(2)} met Yoco`}
            </button>
          </section>
        </>
      ) : <EmptyState icon={<WalletCards />} title="Geen beursie gekoppel nie" text="’n Beursie met dieselfde bevestigde selfoonnommer sal outomaties hier verskyn." />}
      <div className="secure-topup-note"><ShieldCheck /><p><strong>Veilige aanlyn aanvulling</strong><br />Jou balans verander eers nadat Yoco die betaling aan die Skou-bediener bevestig het.</p></div>
    </>
  );
}

function PosWalletTopupPanel({ onBack }: { onBack?: () => void }) {
  const [query, setQuery] = useState("");
  const [wallet, setWallet] = useState<AppWallet | null>(null);
  const [newName, setNewName] = useState("");
  const [newMobile, setNewMobile] = useState("");
  const [amount, setAmount] = useState(10000);
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const lookup = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (!query.trim()) return;
    setBusy("lookup");
    setError("");
    setMessage("");
    try {
      const result = await api(`/api/app/staff/wallets/lookup?q=${encodeURIComponent(query.trim())}`);
      setWallet(result.wallet);
      setMessage("Beursie gelaai.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Beursie kon nie gelaai word nie");
    } finally {
      setBusy("");
    }
  };
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy("create");
    setError("");
    setMessage("");
    try {
      const result = await api("/api/app/staff/wallets/create", {
        method: "POST",
        body: JSON.stringify({ name: newName, mobile: newMobile }),
      });
      setWallet(result.wallet);
      setQuery(result.wallet?.id || "");
      setNewName("");
      setNewMobile("");
      setMessage("Nuwe beursie geskep.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Beursie kon nie geskep word nie");
    } finally {
      setBusy("");
    }
  };
  const topup = async () => {
    if (!wallet?.id) return;
    setBusy("topup");
    setError("");
    setMessage("");
    try {
      const result = await api("/api/app/staff/wallets/topup", {
        method: "POST",
        body: JSON.stringify({ wallet_id: wallet.id, amount_cents: amount, method, note }),
      });
      setWallet(result.wallet);
      setNote("");
      setMessage(`${method === "cash" ? "Kontant" : "Kaart"} topup van R ${(amount / 100).toFixed(2)} is gestoor.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Topup kon nie gestoor word nie");
    } finally {
      setBusy("");
    }
  };
  return (
    <>
      {onBack && (
        <button className="sheet-secondary inline-back" type="button" onClick={onBack}>
          <ArrowLeft /> Terug na POS-afdelings
        </button>
      )}
      <span className="detail-icon"><WalletCards /></span>
      <p className="eyebrow">POS beursie</p>
      <h2>Beursie aanvulling</h2>
      <p className="request-intro">Soek ’n gas se beursie per ID of selfoon, skep ’n nuwe beursie indien nodig, en teken kontant of kaart-topups binne die app aan.</p>

      <form className="topup-panel" onSubmit={lookup}>
        <strong>Laai bestaande beursie</strong>
        <label>Beursie ID of selfoonnommer
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="bv. V95AQHY of 082… / 2772…" />
        </label>
        <button className="app-primary" disabled={busy === "lookup" || !query.trim()}>
          {busy === "lookup" ? <RefreshCw className="spin" /> : <WalletCards />}
          {busy === "lookup" ? "Laai…" : "Laai beursie"}
        </button>
      </form>

      <form className="topup-panel" onSubmit={create}>
        <strong>Skep nuwe beursie</strong>
        <label>Naam
          <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Gas se naam" />
        </label>
        <label>Selfoon
          <input value={newMobile} onChange={(event) => setNewMobile(event.target.value)} placeholder="082… of 2772…" inputMode="tel" />
        </label>
        <button className="app-secondary" disabled={busy === "create" || !newName.trim()}>
          {busy === "create" ? <RefreshCw className="spin" /> : <UserPlus />}
          {busy === "create" ? "Skep…" : "Skep beursie"}
        </button>
      </form>

      {wallet && (
        <section className="topup-panel">
          <div className="purchase-heading">
            <div>
              <strong>{wallet.name || "Skoubeursie"}</strong>
              <small>{wallet.mobile || wallet.id}</small>
            </div>
            <span>R {(wallet.balance_cents / 100).toFixed(2)}</span>
          </div>
          <div className="amount-options">
            {[5000, 10000, 20000, 30000].map((value) => <button type="button" key={value} className={amount === value ? "active" : ""} onClick={() => setAmount(value)}>R {value / 100}</button>)}
          </div>
          <label>Ander bedrag
            <input type="number" min="10" max="5000" step="10" value={amount / 100} onChange={(event) => setAmount(Math.round(Number(event.target.value || 0) * 100))} />
          </label>
          <div className="amount-options payment-method-options">
            <button type="button" className={method === "cash" ? "active" : ""} onClick={() => setMethod("cash")}>Kontant</button>
            <button type="button" className={method === "card" ? "active" : ""} onClick={() => setMethod("card")}>Kaart</button>
          </div>
          <label>Nota / verwysing
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder={method === "card" ? "Yoco strokie/verwysing indien beskikbaar" : "Opsioneel"} />
          </label>
          <button className="app-primary" type="button" disabled={busy === "topup" || amount < 1000 || amount > 500000} onClick={() => void topup()}>
            {busy === "topup" ? <RefreshCw className="spin" /> : <ShieldCheck />}
            {busy === "topup" ? "Stoor…" : `Stoor ${method === "cash" ? "kontant" : "kaart"} topup`}
          </button>
          <small className="payment-note">Gebruik “Kaart” nadat die Yoco-kaartbetaling by die kassier bevestig is. Die balans word onmiddellik op die backend geaudit.</small>
        </section>
      )}

      {message && <p className="success-note"><CheckCircle2 />{message}</p>}
      {error && <p className="form-error">{error}</p>}
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

function PhotosFlow() {
  const [photos, setPhotos] = useState<AppPhoto[] | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const load = async () => {
    const result = await api("/api/app/photos");
    setPhotos(result.photos || []);
  };
  useEffect(() => {
    let active = true;
    void api("/api/app/photos")
      .then((result) => { if (active) setPhotos(result.photos || []); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Foto’s kon nie gelaai word nie"); });
    return () => { active = false; };
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError("Kies asseblief ’n foto.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    const form = new FormData();
    form.set("file", file);
    form.set("title", title || "Skoufoto");
    form.set("caption", caption);
    try {
      await api("/api/app/photos", { method: "POST", body: form });
      setFile(null);
      setTitle("");
      setCaption("");
      const input = event.currentTarget.querySelector<HTMLInputElement>('input[type="file"]');
      if (input) input.value = "";
      setMessage("Foto opgelaai. Dit wag nou vir goedkeuring voordat dit publiek gebruik word.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Foto kon nie opgelaai word nie");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <span className="detail-icon"><Images /></span>
      <p className="eyebrow">Skoufoto’s</p>
      <h2>Laai foto’s op</h2>
      <p className="request-intro">Laai jou Skoufoto’s direk uit die app op. Nuwe foto’s bly eers privaat/pending totdat admin dit goedkeur vir publieke albums, bemarking of grootskerm gebruik.</p>
      <form className="photo-upload-form" onSubmit={submit}>
        <label>Titel
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="bv. Saterdag kuiertuin" maxLength={120} />
        </label>
        <label>Kort beskrywing
          <textarea value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Wie/wat is op die foto? Enige notas vir admin." maxLength={600} />
        </label>
        <label>Foto
          <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => setFile(event.target.files?.[0] || null)} />
        </label>
        <button className="app-primary" disabled={busy || !file}>
          {busy ? <RefreshCw className="spin" /> : <Images />}
          {busy ? "Laai op…" : "Laai foto op"}
        </button>
      </form>
      {message && <p className="success-note"><CheckCircle2 />{message}</p>}
      {error && <p className="form-error">{error}</p>}
      <section className="photo-gallery">
        <div className="purchase-heading">
          <div>
            <strong>Foto’s</strong>
            <small>Jou uploads plus foto’s wat reeds goedgekeur is</small>
          </div>
          <span>{photos?.length || 0}</span>
        </div>
        {photos === null ? (
          <p className="loading-line"><RefreshCw className="spin" /> Laai foto’s…</p>
        ) : photos.length ? (
          <div className="photo-grid">
            {photos.map((photo) => (
              <article key={photo.id}>
                <img src={photo.file_url} alt={photo.title} loading="lazy" />
                <div>
                  <strong>{photo.title}</strong>
                  {photo.caption && <p>{photo.caption}</p>}
                  <small>{photo.status === "approved" ? "Goedgekeur" : photo.status === "rejected" ? "Afgekeur" : "Wag vir goedkeuring"} · {new Date(photo.created_at * 1000).toLocaleString("af-ZA")}</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Images />} title="Nog geen foto’s nie" text="Laai die eerste foto op. Dit sal hier verskyn terwyl dit wag vir goedkeuring." />
        )}
      </section>
    </>
  );
}

function MessagesPanel({ user }: { user: AppUser }) {
  const [contacts, setContacts] = useState<AppMessageContact[]>([]);
  const [messages, setMessages] = useState<AppMessage[] | null>(null);
  const [selected, setSelected] = useState("committee:0");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    const [contactResult, messageResult] = await Promise.all([api("/api/app/messages/contacts"), api("/api/app/messages")]);
    setContacts(contactResult.contacts || []);
    setMessages(messageResult.messages || []);
    const first = contactResult.contacts?.[0];
    if (first) setSelected(`${first.type}:${first.id}`);
  };
  useEffect(() => {
    let active = true;
    void Promise.all([api("/api/app/messages/contacts"), api("/api/app/messages")])
      .then(([contactResult, messageResult]) => {
        if (!active) return;
        const nextContacts = contactResult.contacts || [];
        setContacts(nextContacts);
        setMessages(messageResult.messages || []);
        const first = nextContacts[0];
        if (first) setSelected(`${first.type}:${first.id}`);
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Boodskappe kon nie gelaai word nie"); });
    return () => { active = false; };
  }, []);
  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const [recipient_type, rawId] = selected.split(":");
    setBusy(true);
    setError("");
    try {
      await api("/api/app/messages", { method: "POST", body: JSON.stringify({ recipient_type, recipient_id: Number(rawId || 0), body }) });
      setBody("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Boodskap kon nie gestuur word nie");
    } finally {
      setBusy(false);
    }
  };
  return (
    <SimplePanel title="Boodskappe" subtitle={user.source === "staff" ? "Komitee- en personeelkommunikasie." : "Familie-notas en boodskappe aan die Skou-kantoor."}>
      <form className="message-compose" onSubmit={send}>
        <label>Stuur aan
          <select value={selected} onChange={(event) => setSelected(event.target.value)}>
            {contacts.map((contact) => <option key={`${contact.type}:${contact.id}`} value={`${contact.type}:${contact.id}`}>{contact.name}</option>)}
          </select>
        </label>
        {contacts.length > 0 && (
          <div className="contact-strip">
            {contacts.slice(0, 8).map((contact) => (
              <button type="button" key={`${contact.type}:${contact.id}`} className={selected === `${contact.type}:${contact.id}` ? "active" : ""} onClick={() => setSelected(`${contact.type}:${contact.id}`)}>
                <strong>{contact.name}</strong>
                {contact.detail && <small>{contact.detail}</small>}
              </button>
            ))}
          </div>
        )}
        <label>Boodskap
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Tik jou boodskap hier…" maxLength={1000} />
        </label>
        <button className="app-primary" disabled={busy || body.trim().length < 2 || contacts.length === 0}>
          {busy ? <RefreshCw className="spin" /> : <MessageCircle />}
          {busy ? "Stuur…" : "Stuur boodskap"}
        </button>
      </form>
      {error && <p className="form-error">{error}</p>}
      <div className="message-list">
        {messages === null ? (
          <p className="loading-line"><RefreshCw className="spin" /> Laai boodskappe…</p>
        ) : messages.length ? (
          messages.map((item) => (
            <article key={item.id} className={item.direction}>
              <small>{item.direction === "outgoing" ? `Aan ${item.recipient_name}` : `Van ${item.sender_name}`} · {new Date(item.created_at * 1000).toLocaleString("af-ZA")}</small>
              <p>{item.body}</p>
            </article>
          ))
        ) : (
          <EmptyState icon={<MessageCircle />} title="Nog geen boodskappe nie" text="Gebruik hierdie skerm vir familie-notas, komitee-opvolg en hulpversoeke." />
        )}
      </div>
    </SimplePanel>
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
