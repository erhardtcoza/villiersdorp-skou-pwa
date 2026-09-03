import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terreinbesprekings",
  description: "Terreinbesprekings, versoeke en opvolgwerk vir die Villiersdorp Skou app.",
  alternates: { canonical: "/terreinbesprekings" },
};

export default function TerreinbesprekingsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
