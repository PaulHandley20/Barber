import type { Metadata } from "next";
import { BARBERSHOP } from "@/lib/barbershop";

export const metadata: Metadata = {
  title: "Reservar turno",
  description: `Reservá tu turno online en ${BARBERSHOP.legalName}, ${BARBERSHOP.city}. Elegí servicio, día y horario en menos de un minuto.`,
};

export default function ReservarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
