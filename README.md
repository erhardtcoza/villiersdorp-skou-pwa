# Villiersdorp Skou PWA

Mobile-first progressive web app for the Villiersdorp Landbou Skou platform.

The PWA is the test and implementation shell for visitor, vendor, staff and committee workflows. It is designed to connect to the existing Villiersdorp Skou Cloudflare backend instead of embedding desktop website pages or rebuilding working business logic.

## Current preview

- Live PWA: <https://app.villiersdorpskou.co.za>
- Original visual prototype: <https://villiersdorp-skou-pwa.erhardte.chatgpt.site>
- Event: Villiersdorp Skou, 23–24 October 2026
- Status: live authentication and role shell with connected tickets, family records, wallets, Yoco top-ups, ticket purchases, venue requests and authorised Kroeg transaction/refund review; remaining prototype modules are being connected incrementally

## Product structure

| Role | Access model |
|---|---|
| Visitor | Tickets, family, programme, map, venue requests and Bar Wallet prototype |
| Vendor | Vendor profile, application, team, passes, programme, map and venue requests |
| Staff | Only modules explicitly assigned by an administrator/authorised access manager |
| Committee | Committee/department modules assigned per person; admin/manager accounts retain full operational access |

Staff permissions currently cover:

- Point of Sale
- Stall approvals
- Horse-show approvals
- Venue approvals
- Meetings
- Gate control
- Operations reports
- Kroeg transactions
- Kroeg refunds
- Department membership across Skou Bestuur, Kroeg, Perde, Vermaak, Gronde, Uitstallers, Hekke, Bemarking and Finansies

## Implemented prototype modules

- Role-based home menus and profile role switching
- Branded installable PWA shell and offline app shell
- Family members, age eligibility, invitations and ticket assignment
- Individual swipe-style tickets with large demo QR areas
- Shared Bar Wallet permissions, recharge simulation and activity ledger
- Two-day event programme, filters, search and saved activities
- Interactive show map with categories and phone-location demonstration
- Current events, grounds contacts and venue booking requests
- Venue approval, committee price and provisional reservation workflow
- Staff/committee accounts and granular permission assignment
- Point of Sale basket, payment choices and supervisor flow
- Gate scanning simulation with IN/OUT movements and live counts
- Operations dashboard for attendance, sales and device health
- Stall application review, document checks, pricing and allocation
- Horse-show entry review, classes, documents and approval
- Meetings, invitations, RSVP tracking, agendas, documents, reminders and minutes

See [PROGRESS_REPORT.md](PROGRESS_REPORT.md) for the complete implementation status.

## Live system integration

The production PWA now uses the existing Skou Worker as its system of record for:

- Visitor registration, email verification, login and password reset
- Existing staff identities and server-enforced roles
- Automatic ticket and wallet matching by verified contact details
- Family records and ticket-holder assignment
- Ticket purchase and secure QR hand-off
- Wallet top-ups through Yoco-hosted checkout
- Venue booking request capture and history
- Authorised Kroeg transaction review and audited refund capture

The remaining prototype workflows require backend integration before production use:

- Ticket transfer, WhatsApp delivery and Apple/Google Wallet passes
- Automatic Yoco provider refunds after the exact live provider flow is confirmed
- Real gate scan validation and offline synchronisation
- Vendor and horse application records
- Venue availability and committee approvals
- Meeting invitations, push reminders and document storage
- D1/R2 persistence, audit logs and notifications

Do not use the current demo QR codes, wallet balances or approval buttons for a live event.

## Technology

- React 19
- TypeScript
- Vinext / Vite
- Cloudflare-compatible Worker output
- Installable web app manifest and service worker
- Lucide icons
- Optional D1 and R2 bindings reserved through the hosting manifest

## Run locally

Requirements:

- Node.js 22.13 or newer
- npm

```bash
git clone https://github.com/erhardtcoza/villiersdorp-skou-pwa.git
cd villiersdorp-skou-pwa
npm ci
npm run dev
```

Production checks:

```bash
npm run build
npm run lint
```

## Important files

| Path | Purpose |
|---|---|
| `app/page.tsx` | Current role menus and prototype workflows |
| `app/brand.css` | Villiersdorp Skou interface styling |
| `app/meetings.css` | Meetings workspace styles |
| `app/manifest.ts` | Installable PWA metadata |
| `public/sw.js` | Offline shell service worker |
| `public/skou-crest.png` | Header and ticket crest |
| `public/skou-app-icon.png` | App icon |
| `docs/INTEGRATION.md` | Existing-system integration guide |
| `PROGRESS_REPORT.md` | Current progress and remaining work |
| `mobile/` | Shared Expo SDK 57 codebase for the iOS and Android apps |

## Integration approach

Keep the existing event backend as the system of record.

```text
PWA / future native app
        ↓ authenticated HTTPS API
Existing Villiersdorp Skou Worker
        ↓
D1 · R2 · Yoco · WhatsApp · audit logs
```

The PWA should receive mobile-focused JSON responses. It should never depend on the existing admin website being mobile responsive.

Recommended order:

1. Connect authentication and `/me` permissions.
2. Connect family records and existing ticket orders.
3. Replace demo ticket QR values with secure backend-issued tokens.
4. Connect vendor, horse and venue approval workflows.
5. Connect gate scanning and the movement ledger.
6. Connect POS and payments.
7. Add meetings, notifications and R2 documents.
8. Add the financial Bar Wallet only after ledger and reconciliation testing.

The exact endpoint contracts and migration checklist are in [docs/INTEGRATION.md](docs/INTEGRATION.md).

## Security rules

- Enforce roles and permissions on the API, not only in the menu.
- Use short-lived access tokens and rotating refresh tokens.
- Require staff MFA or passkeys.
- Never put payment keys, WhatsApp tokens or signing secrets in the PWA.
- Sign ticket QR payloads or use opaque single-use identifiers.
- Store financial activity in an append-only ledger.
- Record every approval, scan, refund, reversal and permission change.
- Treat age entered by a user as profile information, not alcohol-sale proof.

## PWA and native apps

The `mobile/` Expo project already reuses:

- The branded splash, authentication and role-based home experience
- Native bearer sessions stored with Expo SecureStore
- Live tickets, wallets and family records
- The complete password-reset flow
- Committee role-preview navigation
- The same production API and permission rules as the PWA

Native-only QR camera, NFC, push-notification and offline scanning features follow after the shared live workflows are stable. Store builds still require the final Apple bundle identifier, Android application ID, signing credentials and store accounts.

## Repository policy

Never commit secrets, production exports, customer information or payment data. Use environment variables for local development and managed runtime secrets in production.
