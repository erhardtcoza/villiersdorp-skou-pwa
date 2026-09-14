# Apple Design adaptation for the Skou app

Requested reference: https://github.com/emilkowalski/skills/blob/main/skills/apple-design/SKILL.md
Read in full on 9 September 2026. Applied as design guidance, not installed as
a global skill or treated as authority to change backend behaviour.

## Current shared foundation

- Platform system text, size-specific heading tracking, readable form labels and
  16px-equivalent inputs; retain the official crest, Skou green/gold/cream identity.
- Instant visual press feedback; activation remains on click/release. No payment
  or refund is dispatched on pointer-down.
- Full-screen module surfaces retain predictable top-left return controls.
- Subtle translucent toolbar over scrolling content, solid controls for contrast.
- Reduced motion, reduced transparency and increased contrast alternatives.
- Keep native scrolling and existing native scroll-snap ticket swiping. No added
  animation dependency and no cosmetic timer that delays a financial action.

## Boundaries / subsequent work

This is an initial shared-style adaptation, not completion of every motion/gesture
recommendation in the reference. Do not add swipe dismissal to a live financial
workflow without pending-state protection, input-disambiguation and device tests.
If custom draggable panels are needed later, preserve pointer offset and velocity,
support interruption, and provide a reduced-motion alternative. Test real iOS and
Android with accessibility text sizes before declaring native-quality acceptance.

All style changes are isolated to `app/apple-design.css` and the live app shell.
Public site, admin invoice layout, payment rules and production records are not
redesigned by this work. Development review precedes any production promotion.
