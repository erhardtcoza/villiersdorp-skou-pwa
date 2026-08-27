# Integration Guide

This guide explains how to integrate the PWA into the existing Villiersdorp Skou event platform.

## 1. Integration principle

The existing Cloudflare Worker remains the source of truth for users, tickets, vendors, events, payments and approvals. The PWA becomes another authenticated client of that API.

Do not copy production business logic into React components. Keep reusable rules in backend services used by both the current web admin and this PWA.

## 2. Repository relationship

Keep the projects separate during integration:

```text
vill-skou-events/          Existing API, admin and event platform
villiersdorp-skou-pwa/    Mobile-first PWA client
```

This avoids destabilising the live platform while the PWA is tested.

Share these contracts when practical:

- TypeScript request and response types
- Permission names
- Zod validation schemas
- Ticket and approval status enums
- API error format

A small internal package such as `@villiersdorp/events-contracts` can hold those definitions later.

## 3. Environment configuration

Add a public API base URL per environment:

```env
NEXT_PUBLIC_EVENT_API_URL=https://events.villiersdorpskou.co.za
```

Never expose Yoco secret keys, WhatsApp access tokens, QR signing keys, D1 credentials, R2 access keys or admin tokens to the browser.

## 4. Authentication

Recommended flow:

1. User enters a mobile number or email.
2. Backend sends an OTP or creates a passkey challenge.
3. Backend issues a short-lived access token and rotating refresh token.
4. PWA calls `GET /api/me`.
5. The response includes role memberships and staff permission grants.
6. Every backend endpoint verifies those permissions again.

Suggested response:

```json
{
  "user": {
    "id": "usr_123",
    "name": "Anna Besoeker",
    "mobile": "+27820000000"
  },
  "roles": ["visitor"],
  "permissions": []
}
```

Committee users receive the `committee` role. Staff receive `staff` plus exact grants such as `gates`, `pos` or `meetings`.

## 5. Suggested API surface

Reuse matching endpoints where they already exist. The routes below describe the required contracts and do not require renaming working routes.

### Identity and family

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/me` | User, roles and permissions |
| `GET` | `/api/me/family` | Family/dependant list |
| `POST` | `/api/me/family` | Add family member |
| `PATCH` | `/api/me/family/:id` | Update member |
| `POST` | `/api/me/family/:id/invite` | Send invitation |
| `POST` | `/api/invitations/:token/accept` | Accept and link account |

### Tickets

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/me/tickets` | Tickets owned or assigned to user |
| `POST` | `/api/tickets/:id/assign` | Assign holder |
| `POST` | `/api/tickets/:id/transfer` | Transfer ticket |
| `POST` | `/api/tickets/:id/reclaim` | Reclaim unaccepted transfer |
| `GET` | `/api/tickets/:id/presentation` | Short-lived gate QR payload |
| `POST` | `/api/gates/scan` | Validate and record IN/OUT movement |

Gate scans require an idempotency key, device ID, operator ID, gate ID, direction and local timestamp.

### Vendors and applications

| Method | Route | Purpose |
|---|---|---|
| `GET/PATCH` | `/api/vendor/profile` | Vendor profile |
| `GET/POST` | `/api/vendor/applications` | Vendor applications |
| `POST` | `/api/vendor/applications/:id/documents` | Upload document |
| `GET/PATCH` | `/api/vendor/team` | Employees and attendance days |
| `GET` | `/api/vendor/passes` | Approved employee passes |
| `GET` | `/api/admin/vendor-applications` | Permission-filtered review queue |
| `POST` | `/api/admin/vendor-applications/:id/decision` | Approve, decline or request information |

### Horse show

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/horse-entries` | Review queue |
| `GET` | `/api/admin/horse-entries/:id` | Entry, classes, payment and documents |
| `POST` | `/api/admin/horse-entries/:id/decision` | Committee decision |

### Venues

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/venues` | Venues and sections |
| `GET` | `/api/venues/availability` | Date-range availability |
| `POST` | `/api/venue-bookings/estimate` | Server-calculated estimate |
| `POST` | `/api/venue-bookings` | Create provisional reservation |
| `GET` | `/api/admin/venue-bookings` | Approval queue |
| `POST` | `/api/admin/venue-bookings/:id/decision` | Price, conditions and decision |

Provisional reservations should expire if required information or payment is not received.

### Meetings

| Method | Route | Purpose |
|---|---|---|
| `GET/POST` | `/api/meetings` | List or create meetings |
| `GET/PATCH` | `/api/meetings/:id` | Details, notes and status |
| `POST` | `/api/meetings/:id/invitations` | Invite users or groups |
| `POST` | `/api/meetings/:id/rsvp` | Accept or decline |
| `GET/POST/PATCH` | `/api/meetings/:id/agenda` | Agenda management |
| `POST` | `/api/meetings/:id/documents` | R2 document upload |
| `POST` | `/api/meetings/:id/reminders` | Schedule reminder |

### POS and Bar Wallet

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/pos/products` | Products and current prices |
| `POST` | `/api/pos/orders` | Create sale |
| `POST` | `/api/pos/orders/:id/payment` | Start or record payment |
| `POST` | `/api/pos/orders/:id/void` | Supervisor-controlled void |
| `GET` | `/api/wallets/:id` | Wallet and permissions |
| `POST` | `/api/wallets/:id/recharge` | Start Yoco recharge |
| `POST` | `/api/wallets/:id/spend` | Append spend entry |
| `POST` | `/api/wallets/:id/reversal` | Append linked reversal |

Never update a wallet balance directly. Calculate it from immutable ledger entries.

## 6. Error format

Use one predictable shape:

```json
{
  "error": {
    "code": "TICKET_ALREADY_USED",
    "message": "This ticket has already entered.",
    "requestId": "req_abc123"
  }
}
```

The PWA can map stable codes to clear Afrikaans or English messages.

## 7. Data mapping

Before connecting a module, confirm the current production source:

| PWA concept | Existing source to confirm |
|---|---|
| User | Current customer/user table |
| Family member | New dependant or ticket-holder table |
| Ticket purchaser | Existing order/customer relationship |
| Ticket holder | Existing attendee or new holder relationship |
| Staff permission | Existing roles plus granular grants |
| Vendor profile | Existing vendor record |
| Venue section | Existing venue/section configuration |
| Gate movement | Existing scans plus new IN/OUT ledger |
| Wallet entry | New append-only financial ledger |

Create migrations only after checking current production columns and constraints.

## 8. Documents and images

Use R2 for vendor documents, horse records, meeting files, venue documents and moderated event photos.

Store ownership, access rules, checksums and retention dates in D1. Issue short-lived signed download URLs from the Worker.

## 9. Offline operations

The service worker currently caches the interface shell.

For Gate Control and POS, add a separate action queue:

- Generate an idempotency key per action.
- Store pending actions securely on the device.
- Show synchronisation state clearly.
- Retry after connectivity returns.
- Let the server detect duplicates and conflicts.
- Never treat unsynchronised financial activity as fully settled.

## 10. Integration sequence

1. Add a typed API client and environment configuration.
2. Connect `/api/me` and remove production role switching.
3. Connect family and tickets.
4. Test real QR presentation and gate validation in a test event.
5. Connect vendor, horse and venue review queues.
6. Connect staff permissions and audit logging.
7. Connect POS products and safe test payments.
8. Connect meetings and notifications.
9. Implement Bar Wallet ledger and reconciliation.
10. Run device, offline, security and event-volume testing.

Replace each module's `localStorage` code only after its API supports loading, mutation, errors, retries and permissions.

## 11. Acceptance checklist

- Authentication works across supported phones.
- Committee and staff permissions are enforced server-side.
- No production secrets appear in browser bundles.
- Ticket QR codes cannot be forged or replayed silently.
- Gate scans survive temporary loss of connectivity.
- Every privileged action creates an audit event.
- Payment webhooks are verified and idempotent.
- Wallet totals reconcile from ledger entries.
- R2 documents require authorised signed access.
- POPIA retention and deletion rules are documented.
- Staff complete a realistic gate/POS rehearsal before launch.

