import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Perde",
  description: "Perdeskou-inligting, aansoeke en personeelfunksies binne die Villiersdorp Skou app.",
  alternates: {
    canonical: "/perde",
    languages: { "af-ZA": "/perde", "en-ZA": "/horses" },
  },
};

export default function PerdeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
