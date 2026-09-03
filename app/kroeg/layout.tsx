import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kroeg en beursie",
  description: "Kroegfunksies, beursiebalans, aanvulling en toepaslike transaksies vir die Villiersdorp Skou.",
  alternates: { canonical: "/kroeg" },
};

export default function KroegLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
