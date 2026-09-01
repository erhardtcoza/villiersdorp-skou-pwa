import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const appShellRoutes = [
  "app/kaartjies/page.tsx",
  "app/kroeg/page.tsx",
  "app/perde/page.tsx",
  "app/horses/page.tsx",
  "app/pos/page.tsx",
  "app/terreinbesprekings/page.tsx",
  "app/verhurings/page.tsx",
];

test("app shell subroutes explicitly render the hydrated client app", async () => {
  for (const route of appShellRoutes) {
    const source = await readFile(path.join(root, route), "utf8");

    assert.match(source, /^"use client";/);
    assert.match(source, /import HomePage from "\.\.\/page";/);
    assert.match(source, /return <HomePage \/>;/);
    assert.doesNotMatch(source, /^export \{ default \} from "\.\.\/page";/m);
  }
});

test("app deep links map to the intended grouped workflow pages", async () => {
  const source = await readFile(path.join(root, "app/page.tsx"), "utf8");

  assert.match(source, /if \(pathname === "\/kaartjies"\) return "tickets"/);
  assert.match(source, /if \(pathname === "\/terreinbesprekings"\) return "venues"/);
  assert.match(source, /if \(pathname === "\/kroeg"\) return "bar"/);
  assert.match(source, /if \(pathname === "\/pos"\) return "pos"/);
  assert.match(source, /if \(pathname === "\/perde" \|\| pathname === "\/horses"\) return "horses"/);
  assert.match(source, /if \(pathname === "\/verhurings"\) return "rentals"/);
  assert.match(source, /if \(page === "horses"\) return "\/perde"/);
  assert.match(source, /if \(page === "rentals"\) return "\/verhurings"/);
  assert.match(source, /function moduleFromBrowserQuery\(search: string\)/);
  assert.match(source, /new URLSearchParams\(search\)\.get\("module"\)/);
  assert.match(source, /appModules\.some\(\(item\) => item\.key === moduleKey\) \? moduleKey : null/);
  assert.match(source, /canOpenModule\(selected\)/);
});

test("app module permissions and native review labels stay aligned", async () => {
  const source = await readFile(path.join(root, "app/page.tsx"), "utf8");

  assert.match(source, /key:\s*"pos"[\s\S]*?permissions:\s*\["pos_sales"\]/);
  assert.match(source, /key:\s*"bar-pos"[\s\S]*?permissions:\s*\["bar_pos"\]/);
  assert.match(source, /key:\s*"wallet-topup"[\s\S]*?permissions:\s*\["pos_sales",\s*"bar_pos"\]/);
  assert.match(source, /key:\s*"wallet-topup"[\s\S]*?status:\s*"live"/);
  assert.match(source, /key:\s*"photos"[\s\S]*?status:\s*"live"/);
  assert.match(source, /moduleKey === "photos"[\s\S]*<PhotosFlow/);
  assert.match(source, /api\("\/api\/app\/photos"/);
  assert.match(source, /form\.set\("file",\s*file\)/);
  assert.match(source, /init\?\.body instanceof FormData/);
  assert.match(source, /<MessagesPanel user=\{user\} \/>/);
  assert.match(source, /api\("\/api\/app\/messages\/contacts"\)/);
  assert.match(source, /api\("\/api\/app\/messages"\)/);
  assert.match(source, /moduleKey === "wallet-topup"[\s\S]*<PosWalletTopupPanel/);
  assert.match(source, /api\(`\/api\/app\/staff\/wallets\/lookup\?q=\$\{encodeURIComponent\(query\.trim\(\)\)\}`\)/);
  assert.match(source, /api\("\/api\/app\/staff\/wallets\/create"/);
  assert.match(source, /api\("\/api\/app\/staff\/wallets\/topup"/);
  assert.doesNotMatch(source, /key:\s*"wallet-topup"[\s\S]{0,260}href:\s*"https:\/\/tickets\.villiersdorpskou\.co\.za\/bar\/topup"/);
  assert.match(source, /key:\s*"kitchen-pos"[\s\S]*?permissions:\s*\["kitchen_pos"\]/);
  assert.match(source, /key:\s*"kitchen-pos"[\s\S]*?href:\s*"\/pos-terminal\?pos_area=kombuis"/);
  assert.match(source, /function appLocalPosHref\(href\?: string \| null\)/);
  assert.match(source, /parsed\.pathname === "\/app"[\s\S]*`\/pos-terminal\$\{parsed\.search\}`/);
  assert.match(source, /parsed\.pathname === "\/scan"[\s\S]*`\/scan-terminal\$\{parsed\.search\}`/);
  assert.match(source, /href:\s*"\/pos-terminal\?pos_area=hek"/);
  assert.match(source, /href:\s*"\/pos-terminal\?pos_area=kroeg"/);
  assert.match(source, /href:\s*"\/scan-terminal"/);
  assert.doesNotMatch(source, /href:\s*"https:\/\/tickets\.villiersdorpskou\.co\.za\/app/);
  assert.doesNotMatch(source, /href:\s*"https:\/\/tickets\.villiersdorpskou\.co\.za\/scan/);
  const fallbackPosOptions = source.slice(source.indexOf("const posLaunchOptions:"), source.indexOf("const appModules:"));
  const fallbackKitchenOption = fallbackPosOptions.slice(fallbackPosOptions.indexOf('key: "kitchen-pos"'), fallbackPosOptions.indexOf('key: "gate-scanner"'));
  assert.match(fallbackKitchenOption, /status:\s*"coming"/);
  assert.doesNotMatch(fallbackKitchenOption, /href:\s*"https:\/\/tickets\.villiersdorpskou\.co\.za\/app\?pos_area=kombuis"/);
  assert.doesNotMatch(fallbackKitchenOption, /status:\s*"live"/);
  for (const key of ["applications", "horse-processing", "venue-approvals", "rental-approvals"]) {
    const moduleBlock = source.match(new RegExp(`key:\\s*"${key}"[\\s\\S]*?status:\\s*"([^"]+)"`));
    assert.equal(moduleBlock?.[1], "live", `${key} should be marked as an app-native live workflow`);
  }
  assert.match(source, /const staffReviewScopes:[\s\S]*"horse-processing"[\s\S]*"venue-approvals"[\s\S]*"rental-approvals"[\s\S]*applications/);
  assert.match(source, /api\("\/api\/app\/staff\/horse-applications\?limit=50"\)/);
  assert.match(source, /moduleKey === "horse-processing" && staffReview[\s\S]*<HorseApplicationsPanel/);
  assert.match(source, /fallbackAdditions = scopedFallbackOptions\.filter/);
  assert.match(source, /moduleKey === "pos"[\s\S]*option\.key === "wallet-topup"/);
  assert.match(source, /page === "pos"[\s\S]*title="Kies POS-afdeling"[\s\S]*<PosLauncherPanel moduleKey="pos-menu" ModuleIcon=\{ScanLine\} \/>/);
  assert.match(source, /kies Hek, Kroeg, Kombuis of enige toekomstige POS-afdeling/);
});

test("native app keeps the same grouped app and POS navigation language", async () => {
  const nativeSource = await readFile(path.join(root, "mobile/App.tsx"), "utf8");

  for (const label of ["Kaartjies & Beursie", "POS & Toegang", "Perde", "Uitstallers", "Terrein & Verhurings", "Skou-inligting", "Bestuur", "Doen perde-aansoek", "Verwerk perde-aansoeke", "My Aansoek", "Uitstallerprofiel", "Uitstallerspan", "Stalletjie-aansoeke", "Terreinbespreking", "Terreingoedkeurings", "Verhuring-goedkeuring", "Geboue", "Skoufoto’s", "Finansies", "Vergaderings", "Krymekaar & Slaglam", "Gebruikers & Rolle"]) {
    assert.match(nativeSource, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(nativeSource, /Beursie aanvulling/);
  assert.match(nativeSource, /https:\/\/app\.villiersdorpskou\.co\.za\/\?module=wallet-topup/);
  assert.doesNotMatch(nativeSource, /\/bar\/topup/);
  for (const area of ["pos_area=hek", "pos_area=kroeg", "pos_area=kombuis"]) {
    assert.match(nativeSource, new RegExp(area));
  }
  assert.match(nativeSource, /permissions\?: string\[\]/);
  assert.match(nativeSource, /function canUseModule\(user: User, item: Module\)/);
  assert.match(nativeSource, /canUseModule\(me\.user, item\)/);
  assert.match(nativeSource, /\[preview,\s*me\.user\]/);
  assert.match(nativeSource, /grouped\.length\}\s*groepe/);
  assert.match(nativeSource, /group\.items\.map\(\(item\)/);
  assert.doesNotMatch(nativeSource, /group\.items\.slice\(0,\s*4\)/);
  assert.doesNotMatch(nativeSource, /verdere opsies op die PWA/);
  assert.match(nativeSource, /roles:\s*\["vendor",\s*"staff",\s*"committee"\],\s*modules:\s*\["vendor-application",\s*"vendor-profile",\s*"vendor-team",\s*"passes",\s*"applications"\]/);
  assert.match(nativeSource, /https:\/\/app\.villiersdorpskou\.co\.za\/\?module=vendor-application/);
  assert.match(nativeSource, /https:\/\/app\.villiersdorpskou\.co\.za\/\?module=applications/);
  for (const deepLink of ["photos", "venue-approvals", "buildings", "finance", "meetings", "krymekaar", "users"]) {
    assert.match(nativeSource, new RegExp(`https:\\/\\/app\\.villiersdorpskou\\.co\\.za\\/\\?module=${deepLink}`));
  }
  assert.match(nativeSource, /modules:\s*\["pos",\s*"bar-pos",\s*"wallet-topup",\s*"kitchen-pos",\s*"gates",\s*"bar",\s*"operations"\]/);
  assert.match(nativeSource, /roles:\s*\["staff",\s*"committee"\],\s*modules:\s*\["finance",\s*"meetings",\s*"krymekaar",\s*"users"\]/);
});

test("app and native menu permissions exist in the backend access catalog", async () => {
  const webSource = await readFile(path.join(root, "app/page.tsx"), "utf8");
  const nativeSource = await readFile(path.join(root, "mobile/App.tsx"), "utf8");
  const accessSource = await readFile(path.join(root, "../vill-skou-events-dev-live/src/utils/access_model.js"), "utf8");
  const backendPermissions = new Set([...accessSource.matchAll(/key:\s*"([^"]+)"/g)].map((match) => match[1]));
  const usedPermissions = new Set();
  for (const source of [webSource, nativeSource]) {
    for (const block of source.matchAll(/permissions:\s*\[([^\]]*)\]/g)) {
      for (const permission of block[1].matchAll(/"([^"]+)"/g)) {
        usedPermissions.add(permission[1]);
      }
    }
  }

  assert.notEqual(usedPermissions.size, 0, "menu permissions should be detected");
  for (const permission of usedPermissions) {
    assert.equal(backendPermissions.has(permission), true, `menu uses unknown backend permission ${permission}`);
  }
});

test("web and native menus preserve backend admin and manager all-access semantics", async () => {
  const webSource = await readFile(path.join(root, "app/page.tsx"), "utf8");
  const nativeSource = await readFile(path.join(root, "mobile/App.tsx"), "utf8");
  const accessSource = await readFile(path.join(root, "../vill-skou-events-dev-live/src/utils/access_model.js"), "utf8");

  assert.match(accessSource, /if \(\["admin", "manager"\]\.includes\(normalized\)\) return \[\.\.\.ALL_PERMISSION_KEYS\]/);
  assert.match(webSource, /function hasAnyPermission\(user: AppUser, required\?: string\[\]\)[\s\S]*\["admin", "manager"\]\.includes\(String\(user\.role \|\| ""\)\.toLowerCase\(\)\)/);
  assert.match(nativeSource, /if \(\["admin", "manager"\]\.includes\(user\.role\)\) return true/);
});

test("venue and rental review menus match backend review permissions", async () => {
  const webSource = await readFile(path.join(root, "app/page.tsx"), "utf8");
  const nativeSource = await readFile(path.join(root, "mobile/App.tsx"), "utf8");
  const backendSource = await readFile(path.join(root, "../vill-skou-events-dev-live/src/routes/app_auth.js"), "utf8");

  assert.match(backendSource, /function canReviewVenueRequests[\s\S]*\["grounds_venues", "grounds_facilities", "rentals_manage"\]/);
  assert.match(webSource, /key:\s*"rental-approvals"[\s\S]*permissions:\s*\["rentals_manage",\s*"grounds_venues",\s*"grounds_facilities"\]/);
  assert.match(nativeSource, /key:\s*"rental-approvals"[\s\S]*permissions:\s*\["rentals_manage",\s*"grounds_venues",\s*"grounds_facilities"\]/);
});

test("bar refund clients surface backend failures and reuse refund keys while busy", async () => {
  const webSource = await readFile(path.join(root, "app/page.tsx"), "utf8");
  const nativeSource = await readFile(path.join(root, "mobile/App.tsx"), "utf8");

  assert.match(webSource, /!response\.ok \|\| data\?\.ok === false/);
  assert.match(webSource, /data\.request_id \? ` Verwysing: \$\{data\.request_id\}` : ""/);
  assert.match(webSource, /useState\(hasAnyPermission\(user, \["bar_refunds"\]\)\)/);
  assert.match(webSource, /const idempotencyKey = refundKeys\[transaction\.id\] \|\| crypto\.randomUUID\(\)/);
  assert.match(webSource, /idempotency_key: idempotencyKey/);
  assert.match(webSource, /Yoco het nog nie finaal bevestig nie/);
  assert.match(webSource, /Die app probeer die Yoco-kaart refund dadelik/);
  assert.match(webSource, /health\.checks\?\.yoco_payments\?\.detail/);
  assert.match(webSource, /health\.checks\?\.pos_config\?\.detail/);

  assert.match(nativeSource, /!response\.ok \|\| data\?\.ok === false/);
  assert.match(nativeSource, /Die versoek het te lank geneem\. Herlaai die app en probeer weer/);
  assert.match(nativeSource, /const idempotencyKey = refundKeys\[transaction\.id\]/);
  assert.match(nativeSource, /idempotency_key: idempotencyKey/);
  assert.match(nativeSource, /reason\.length < 3/);
  assert.match(nativeSource, /provider_reference\?: string \| null/);
  assert.match(nativeSource, /wallet_id\?: string \| null/);
  assert.match(nativeSource, /Yoco het nog nie finaal bevestig nie/);
  assert.match(nativeSource, /Die app probeer die Yoco-kaart refund dadelik/);
});

test("app health route checks the app backend and ticket catalogue", async () => {
  const workerSource = await readFile(path.join(root, "worker/index.ts"), "utf8");

  assert.match(workerSource, /https:\/\/tickets\.villiersdorpskou\.co\.za\/api\/app\/health/);
  assert.match(workerSource, /https:\/\/tickets\.villiersdorpskou\.co\.za\/api\/public\/health/);
  assert.match(workerSource, /App backend health API is reachable/);
  assert.match(workerSource, /payload\.checks\.ticket_catalogue/);
});

test("app worker keeps POS and scanner flows under the app domain", async () => {
  const workerSource = await readFile(path.join(root, "worker/index.ts"), "utf8");

  assert.match(workerSource, /const BACKEND_ORIGIN = "https:\/\/tickets\.villiersdorpskou\.co\.za"/);
  assert.match(workerSource, /async function proxyBackend\(request: Request, upstreamPath\?: string\)/);
  assert.match(workerSource, /url\.pathname === "\/pos-terminal"[\s\S]*proxyBackend\(request,\s*`\/app\$\{url\.search\}`\)/);
  assert.match(workerSource, /url\.pathname === "\/scan-terminal"[\s\S]*proxyBackend\(request,\s*`\/scan\$\{url\.search\}`\)/);
  assert.match(workerSource, /url\.pathname === "\/app" \|\| url\.pathname === "\/scan" \|\| url\.pathname\.startsWith\("\/pos\/"\) \|\| url\.pathname\.startsWith\("\/scan\/"\)/);
  assert.match(workerSource, /url\.pathname\.startsWith\("\/api\/auth\/"\)/);
  assert.match(workerSource, /proxiedHeaders\.set\("location",\s*rewritten\)/);
});
