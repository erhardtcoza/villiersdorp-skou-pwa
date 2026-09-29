"use client";

import HomePage from "../page";

// This route is intentionally an app shell, rather than a second POS UI.
// The Worker routes only its /pos-test/api calls to isolated POS staging.
export default function PosTestPage() {
  return <HomePage />;
}
