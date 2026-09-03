import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Horses",
  description: "Horse show information, applications and staff workflows inside the Villiersdorp Skou app.",
  alternates: {
    canonical: "/perde",
    languages: { "af-ZA": "/perde", "en-ZA": "/horses" },
  },
};

export default function HorsesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
