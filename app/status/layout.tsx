import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stelselstatus",
  description: "Publieke health check vir die Villiersdorp Skou app, tickets en API-koppeling.",
  alternates: { canonical: "/status" },
};

export default function StatusLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
