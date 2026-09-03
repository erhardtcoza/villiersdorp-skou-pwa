import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My kaartjies",
  description: "Koop, betaal, wys en bestuur jou Villiersdorp Skou kaartjies in die app.",
  alternates: { canonical: "/kaartjies" },
};

export default function KaartjiesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
