# Villiersdorp Skou PWA — Progress Report

Updated: 27 August 2026

## Executive status

The PWA now provides a coherent mobile interface for the main Villiersdorp Skou user groups. It is suitable for stakeholder testing and backend integration planning.

The front end is not yet a production transaction system. Most complex modules save prototype changes on the current device. Live operation requires authentication, API integration, database persistence, notifications and operational testing.

## Delivery status

| Area | Current state | Next production step |
|---|---|---|
| PWA shell and branding | Implemented | Final accessibility and device testing |
| Role-based menus | Implemented | Replace test role switcher with authenticated role claims |
| Committee super admin | Implemented in UI | Enforce on every API endpoint |
| Staff permissions | Functional prototype | Load grants from backend and audit changes |
| Family management | Functional prototype | Connect user/family tables and invitations |
| Ticket assignment | Functional prototype | Connect existing order and holder records |
| Ticket display | Functional demo | Issue secure real QR tokens and scan status |
| Programme | Functional prototype | Load event programme API and push reminders |
| Show map | Functional prototype | Import official mapped polygons and coordinates |
| Phone location | Demonstrated | Calibrate GPS-to-map positioning on the grounds |
| Bar Wallet | Functional simulation | Build ledger, Yoco flows, limits and reconciliation |
| Venue booking | Functional prototype | Connect availability, estimates and reservations |
| Venue approvals | Functional prototype | Persist decisions, price, conditions and audit trail |
| Staff POS | Functional simulation | Connect products, tills, orders, payments and cash-up |
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

- Receive only committee-assigned module access
- Operate the POS simulation
- Scan tickets IN or OUT in the Gate Control simulation
- Review stall or horse applications when assigned
- Review venue bookings when assigned
- Access meetings and operations reports when assigned

### Committee

- Super administrator access across all modules
- Create and suspend staff accounts in the prototype
- Grant or revoke individual staff permissions
- Review venue requests and decide pricing
- Review stall applications and allocate sites
- Review horse entries, classes and documents
- Manage meetings, RSVPs, agenda items, reminders and minutes
- View operational attendance, sales and device status

## Business rules captured

- Committee members are super administrators.
- Staff are restricted to explicitly assigned functions.
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

