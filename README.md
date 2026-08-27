# Villiersdorp Skou PWA

Mobile-first progressive web app for the Villiersdorp Landbou Skou platform.

The PWA is the test and implementation shell for visitor, vendor, staff and committee workflows. It is designed to connect to the existing Villiersdorp Skou Cloudflare backend instead of embedding desktop website pages or rebuilding working business logic.

## Current preview

- Hosted preview: https://villiersdorp-skou-pwa.erhardte.chatgpt.site
- Event: Villiersdorp Skou, 23–24 October 2026
- Status: functional front-end prototype with device-local demo data

## Product structure

| Role | Access model |
|---|---|
| Visitor | Tickets, family, programme, map, venue requests and Bar Wallet prototype |
| Vendor | Vendor profile, application, team, passes, programme, map and venue requests |
| Staff | Only modules explicitly assigned by a committee member |
| Committee | Super administrator access to every module and approval workflow |

## Implemented prototype modules

- Role-based home menus and profile role switching
- Branded installable PWA shell and offline app shell
- Family members, invitations and ticket assignment
- Individual swipe-style tickets with large demo QR areas
- Shared Bar Wallet permissions and activity simulation
- Event programme, filters and saved activities
- Interactive show map and phone-location demonstration
- Venue booking and approval workflows
- Staff accounts and granular permissions
- Point of Sale and Gate Control simulations
- Operations dashboard
- Stall and horse-show application review
- Meetings, RSVPs, agendas, documents, reminders and minutes

See [PROGRESS_REPORT.md](PROGRESS_REPORT.md) for full status and [docs/INTEGRATION.md](docs/INTEGRATION.md) for the existing-system integration guide.

## Run locally

Requirements: Node.js 22.13 or newer and npm.

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

## Integration approach

Keep the existing event backend as the system of record.

```text
PWA / future native app
        ↓ authenticated HTTPS API
Existing Villiersdorp Skou Worker
        ↓
D1 · R2 · Yoco · WhatsApp · audit logs
```

The PWA should receive mobile-focused JSON. It must not depend on the existing admin website being mobile responsive.

## Security rules

- Enforce roles and permissions on the API, not only in the menu.
- Never put payment keys, WhatsApp tokens or signing secrets in the PWA.
- Sign ticket QR payloads or use opaque identifiers.
- Store financial activity in an append-only ledger.
- Record every privileged action in an audit log.
- Do not use the current demo QR codes or wallet values for a live event.
