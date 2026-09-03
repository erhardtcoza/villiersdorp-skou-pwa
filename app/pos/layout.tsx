import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "POS en toegang",
  description: "Kies hek, kroeg, kombuis, beursie-aanvulling en scan modules binne die Villiersdorp Skou app.",
  alternates: { canonical: "/pos" },
};

export default function PosLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
