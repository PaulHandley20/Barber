import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mi reserva",
  description: "Consultá, reprogramá o cancelá tu turno.",
  robots: { index: false, follow: true },
};

export default function GestionarReservaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
