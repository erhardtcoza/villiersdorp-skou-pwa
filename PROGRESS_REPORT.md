# Villiersdorp Skou PWA — Progress Report

Updated: 27 August 2026

## Executive status

The live PWA now uses the existing Skou authentication, roles, verified account linkage, family records, issued tickets and wallet records. Visitors can buy tickets and start secure Yoco wallet top-ups inside the app. Staff and committee users now see protected modules according to assigned server-side permissions, including Kroeg transaction review and controlled refunds. More specialised vendor, staff and committee modules are still being integrated from the prototype.

Wallet funds are credited only after a signed Yoco webhook confirms the exact payment. A low-value real Yoco wallet top-up and ticket purchase still require user-led end-to-end confirmation before the flow is treated as operationally signed off.

## Delivery status

| Area | Current state | Next production step |
|---|---|---|
| PWA shell and branding | Implemented | Final accessibility and device testing |
| Role-based menus | Implemented | Confirm each live user sees only assigned modules |
| Committee access model | Implemented | Assign real committee/department access |
| Staff permissions | Live admin controls | Audit every sensitive API before broad delegation |
| Family management | Live account records | Add invitations and transfer acceptance |
| Ticket assignment | Live existing ticket records | Add invitation-based transfers |
| Ticket display | Live issued QR tickets | Complete physical gate-device testing |
| Ticket purchase | Live Yoco checkout | Confirm one low-value real purchase and reconciliation |
| Programme | Functional prototype | Load event programme API and push reminders |
| Show map | Functional prototype | Import official mapped polygons and coordinates |
| Phone location | Demonstrated | Calibrate GPS-to-map positioning on the grounds |
| Bar Wallet | Live linked balance, Yoco top-up and wallet refund ledger | Confirm one low-value real top-up/refund and reconciliation |
| Venue booking | Functional prototype | Connect availability, estimates and reservations |
| Venue approvals | Functional prototype | Persist decisions, price, conditions and audit trail |
| Staff POS | Linked entry point plus Kroeg transaction review | Complete POS app merge and live cash-up views |
| Gate Control | Functional simulation | Connect ticket validation and offline movement queue |
| Operations | Functional dashboard | Connect gate, POS and device heartbeat data |
| Stall applications | Functional prototype | Connect existing vendor/application records |
| Horse Show | Functional prototype | Connect entries, documents, payments and passes |
| Meetings | Functional prototype | Connect invitations, calendar, R2 files and reminders |
| Vendor profile/team | Menu and presentation flow | Build live forms and employee/pass endpoints |
| Messaging | Navigation and sample conversations | Build channels, membership and moderation |
| Photos | Reserved | Define upload, consent, moderation and retention rules |

## Completed user journeys

### Visitors

- Register, verify, sign in and reset a forgotten password
- Automatically link existing paid tickets and wallets by the verified email/phone pair
- Buy current Skou tickets in-app and continue through Yoco hosted checkout
- Top up a linked wallet through Yoco without crediting the balance before webhook confirmation
- Manage a five-person family ticket bundle
- Add family members and record dates of birth
- Assign ticket holders and demonstrate invitations
- Swipe between individual tickets
- View attendee, ticket type, event details and gate status
- Manage a shared Bar Wallet simulation
- Build a personal programme
- Browse the map and request phone location
- View current events and submit a venue request

### Vendors

- Access vendor-specific menus
- See profile, application, team and pass entry points
- Browse the programme and show map
- Submit venue booking requests

Detailed live vendor forms and public vendor-directory integration remain to be connected.

### Staff

- Receive only assigned module access
- Review recent Kroeg transactions when granted bar access
- Record a wallet refund immediately when granted refund access
- Operate the POS simulation
- Scan tickets IN or OUT in the Gate Control simulation
- Review stall or horse applications when assigned
- Review venue bookings when assigned
- Access meetings and operations reports when assigned

### Committee

- Admin/manager accounts have full operational access; committee users receive access by assigned department/permission
- Create and suspend staff accounts in the prototype
- Grant or revoke individual staff permissions
- Review venue requests and decide pricing
- Review stall applications and allocate sites
- Review horse entries, classes and documents
- Manage meetings, RSVPs, agenda items, reminders and minutes
- View operational attendance, sales and device status

## Business rules captured

- Admin/manager users are operational super administrators.
- Committee and staff users are restricted to explicitly assigned functions.
- Kroeg refunds are restricted to assigned bar-management users; ordinary committee access is not enough.
- Ticket purchaser and ticket holder are separate concepts.
- Only eligible adults can receive Bar Wallet permissions.
- The Bar Wallet must use an append-only transaction ledger.
- Venue requests show an estimated price and await committee approval.
- Approved event organisers may use the ticketing/access system for a 10% fee.
- Venue settlement planning includes five milestones: 30 days before, 5 days before, event day, 2 days after and final reconciliation 5 days after invoice.
- Gate workflows support IN and OUT movements for attendance and re-entry.
- QR and NFC can eventually operate together on suitable native devices. NFC remains reserved for the native phase.

## Current data behavior

Prototype records use hard-coded starter data and browser `localStorage`.

This supports demonstrations, committee feedback, workflow changes, mobile layout validation and API contract design.

It is not suitable for multiple devices, shared staff updates, financial transactions, real ticket admission, authoritative approvals or compliance records.

## Production priorities

### Priority 1 — Identity and tickets

- Connect existing authentication
- Expose `/me`, roles and permission grants
- Connect family and dependant records
- Connect existing ticket orders and holders
- Secure QR issue and validation
- WhatsApp ticket delivery

### Priority 2 — Staff operations

- Gate scan API with offline queue and idempotency
- POS products, orders, tills and cash-up
- Application and approval APIs
- Audit log for all privileged changes
- Push and WhatsApp operational notices

### Priority 3 — Venue and meetings

- Venue/section availability calendar
- Provisional holds with expiry
- Committee price and approval conditions
- Event and emergency contacts
- Meeting invitations, RSVP links and reminders
- R2 document storage and minutes

### Priority 4 — Financial wallet

- Append-only wallet ledger
- Yoco recharge flow and verified webhooks
- Shared-user limits and permissions
- Refunds, reversals and reconciliation
- Bar till integration
- Legal, POPIA and alcohol-control review

### Priority 5 — Native app

- Reuse stable API contracts and workflows
- Add native push notifications
- Activate camera QR scanning
- Add NFC staff login, access and supervisor approval
- Prepare App Store and Play Store releases

## Risks before public launch

- Real permissions cannot rely on hidden menu items.
- Payment and wallet logic requires server-side ledger transactions and idempotency.
- Gate validation needs offline conflict handling and duplicate-scan protection.
- Public chat and photos need reporting, consent, retention and moderation.
- App Store review timing remains outside project control.
- The official map requires accurate site coordinates and polygon data.

## Definition of a production-ready first release

Authenticated users can:

- View and manage real tickets
- Assign holders and receive tickets through WhatsApp
- Display secure QR codes
- Let authorised staff scan at gates
- Let authorised staff review assigned workflows
- Let committee members manage roles and approvals
- View the official programme, map and notices
- Record every privileged action in an audit trail

Bar Wallet, NFC and open public social features should activate only after separate security and operational testing.
