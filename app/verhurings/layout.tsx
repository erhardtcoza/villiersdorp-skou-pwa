import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verhurings",
  description: "Verhuringsaansoeke, goedkeurings en bestuur binne die Villiersdorp Skou app.",
  alternates: { canonical: "/verhurings" },
};

export default function VerhuringsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
