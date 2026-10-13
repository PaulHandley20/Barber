/*
  ============================================================
  DON SEGUNDO · DATOS PÚBLICOS DEL NEGOCIO
  ============================================================

  Única fuente de verdad para los datos de contacto que se muestran
  en la web pública (landing, reservas, gestión de reservas y páginas
  legales). Si cambia algo (dirección, Instagram, email, WhatsApp),
  se cambia acá y se actualiza en todo el sitio.

  Los horarios reales se leen de Supabase (tabla barbershop_hours, que
  Manu administra desde /admin/horarios). Los de abajo son solo el
  respaldo por si la base no responde.
*/

export const BARBERSHOP = {
  name: "Don Segundo",
  legalName: "Don Segundo Barbería",
  owner: "Manuel Cladera",
  barber: "Manu",
  tagline: "La tradición del buen detalle.",
  description:
    "Barbería de autor en Concepción del Uruguay, Entre Ríos. Cortes, barba y una buena conversación. Reservá tu turno online.",
  city: "Concepción del Uruguay",
  province: "Entre Ríos",
  country: "Argentina",
  address: "Mitre 866",
  mapsUrl:
    "https://maps.google.com/?q=Mitre+866+Concepci%C3%B3n+del+Uruguay+Entre+R%C3%ADos",
  instagramHandle: "barberia.donsegundo",
  instagramUrl: "https://instagram.com/barberia.donsegundo",
  email: "barberiadonsegundo@gmail.com",
  /*
    WhatsApp en formato internacional sin "+" ni espacios
    (ej: 5493442123456). Se configura con la variable de entorno
    NEXT_PUBLIC_BARBERSHOP_WHATSAPP. Si está vacía, no se muestra
    el botón de WhatsApp.
  */
  whatsapp: (process.env.NEXT_PUBLIC_BARBERSHOP_WHATSAPP ?? "").replace(
    /\D/g,
    ""
  ),
} as const;

export function getWhatsappUrl(message?: string) {
  if (!BARBERSHOP.whatsapp) return null;

  const text = message ? `?text=${encodeURIComponent(message)}` : "";

  return `https://wa.me/${BARBERSHOP.whatsapp}${text}`;
}

/*
  Versión vigente de la Política de Privacidad y de los Términos.
  Se guarda junto al consentimiento de cada cliente, así se sabe
  exactamente qué texto aceptó. Si se modifica el contenido legal,
  hay que actualizar esta fecha.
*/
export const LEGAL_VERSION = "2026-10-13";
export const LEGAL_LAST_UPDATE = "13 de octubre de 2026";

/*
  Reglas de reserva por defecto. Los valores reales se leen de
  barbershop_settings (Configuración del panel) cuando la función
  pública get_public_booking_config está instalada en Supabase.
*/
export const DEFAULT_BOOKING_RULES = {
  maxBookingDaysAhead: 30,
  cancellationNoticeHours: 3,
  lateToleranceMinutes: 10,
};

export type BusinessDay = {
  day_of_week: number; // 0 = domingo … 6 = sábado (igual que Date.getDay())
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  has_break?: boolean | null;
  break_start?: string | null;
  break_end?: string | null;
};

export const FALLBACK_HOURS: BusinessDay[] = [
  { day_of_week: 0, is_open: false, open_time: null, close_time: null },
  { day_of_week: 1, is_open: true, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 2, is_open: true, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 3, is_open: true, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 4, is_open: true, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 5, is_open: true, open_time: "09:00", close_time: "18:00" },
  { day_of_week: 6, is_open: false, open_time: null, close_time: null },
];

const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function trimTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : "";
}

/*
  Agrupa días consecutivos con el mismo horario:
  [Lun–Vie · 09:00 – 18:00, Sáb · 09:00 – 13:00]
*/
export function summarizeHours(hours: BusinessDay[]) {
  const ordered = [1, 2, 3, 4, 5, 6, 0]
    .map((day) => hours.find((item) => item.day_of_week === day))
    .filter((item): item is BusinessDay => Boolean(item));

  const groups: { days: number[]; label: string }[] = [];

  ordered.forEach((day) => {
    if (!day.is_open) return;

    const breakLabel =
      day.has_break && day.break_start && day.break_end
        ? ` (cerrado ${trimTime(day.break_start)}–${trimTime(day.break_end)})`
        : "";

    const label = `${trimTime(day.open_time)} – ${trimTime(
      day.close_time
    )}${breakLabel}`;

    const last = groups[groups.length - 1];
    const lastDay = last?.days[last.days.length - 1];
    const isConsecutive =
      last !== undefined &&
      lastDay !== undefined &&
      (lastDay + 1) % 7 === day.day_of_week;

    if (last && last.label === label && isConsecutive) {
      last.days.push(day.day_of_week);
    } else {
      groups.push({ days: [day.day_of_week], label });
    }
  });

  return groups.map((group) => {
    const first = DAY_SHORT[group.days[0]];
    const last = DAY_SHORT[group.days[group.days.length - 1]];

    return {
      days: group.days.length > 1 ? `${first} – ${last}` : first,
      hours: group.label,
    };
  });
}
