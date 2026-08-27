# Villiersdorp Skou Mobile

Shared Expo application for the Villiersdorp Skou iOS and Android apps.

The app connects to the existing production Skou API and reuses the same accounts, roles, tickets, family records and wallets as the PWA at `app.villiersdorpskou.co.za`.

## Current native slice

- Branded splash and sign-in/registration flow
- Secure device storage for the native access token
- Server-enforced visitor, vendor, staff and committee roles
- Live ticket and wallet summaries
- Ticket purchase and QR hand-off
- Live family records
- Links to existing programme, map, vendor, POS, gate, horse and operations workflows

## Local development

```bash
npm install
npx expo start
```

Use Expo Go for the initial layout/API tests. Store builds require the final Apple bundle identifier, Android application ID, signing teams and store metadata before release.
