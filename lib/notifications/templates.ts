/*
  Emails de turnos (confirmación, cambio, cancelación, recordatorio) y
  archivo .ics para agendar el turno.

  Módulo puro (sin imports): se prueba con `npm test`.
*/

export type NotificationPayload = {
  appointment: {
    id: string;
    reservation_code: string | null;
    start_at: string;
    end_at: string;
    status: string;
    notes: string | null;
    cancelled_by: string | null;
    source: string | null;
  };
  customer: { full_name: string | null; phone: string | null; email: string | null };
  service: { name: string | null; duration_minutes: number | null; price: number | null };
  barber: { name: string | null };
  settings: {
    name: string | null;
    address: string | null;
    phone: string | null;
    instagram: string | null;
    notifications_enabled: boolean;
    appointment_confirmation_enabled: boolean;
    appointment_reminder_enabled: boolean;
    reminder_hours_before: number;
    calendar_sync_enabled: boolean;
    cancellation_notice_hours: number;
  } | null;
};

export type EmailKind = "confirmation" | "updated" | "cancelled" | "reminder";

export type BuiltEmail = {
  subject: string;
  html: string;
  text: string;
  ics?: string;
};

const TIME_ZONE = "America/Argentina/Buenos_Aires";

const COLORS = {
  page: "#100f0d",
  card: "#171613",
  border: "#2a2722",
  cream: "#EADFCB",
  text: "#F4EEE5",
  muted: "#a39a8e",
  gold: "#c9a46e",
  ink: "#1b1915",
  danger: "#e8a39a",
};

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatDate(iso: string) {
  return capitalize(
    new Intl.DateTimeFormat("es-AR", {
      timeZone: TIME_ZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(new Date(iso))
  );
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function firstName(fullName: string | null) {
  return (fullName ?? "").trim().split(/\s+/)[0] || "Hola";
}

function shopName(payload: NotificationPayload) {
  return payload.settings?.name?.trim() || "Don Segundo";
}

export function manageUrl(siteUrl: string, code: string | null) {
  const base = siteUrl.replace(/\/+$/, "");
  return code
    ? `${base}/gestionar-reserva?codigo=${encodeURIComponent(code)}`
    : `${base}/gestionar-reserva`;
}

function mapsUrl(address: string | null) {
  return address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;
}

/* ---------------------------------------------------------------
   .ics (para que el cliente agende el turno en su calendario)
   --------------------------------------------------------------- */

function icsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function icsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function buildIcs(payload: NotificationPayload, siteUrl: string, cancelled = false) {
  const { appointment, service, barber } = payload;
  const shop = shopName(payload);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BarberOS//Turnos//ES",
    "CALSCALE:GREGORIAN",
    `METHOD:${cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${appointment.id}@barberos`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(appointment.start_at)}`,
    `DTEND:${icsDate(appointment.end_at)}`,
    `SUMMARY:${icsText(`${service.name ?? "Turno"} · ${shop}`)}`,
    `DESCRIPTION:${icsText(
      [
        barber.name ? `Con ${barber.name}` : null,
        appointment.reservation_code ? `Código: ${appointment.reservation_code}` : null,
        `Gestioná tu reserva: ${manageUrl(siteUrl, appointment.reservation_code)}`,
      ]
        .filter(Boolean)
        .join("\n")
    )}`,
    payload.settings?.address ? `LOCATION:${icsText(payload.settings.address)}` : null,
    `STATUS:${cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean) as string[];

  return lines.join("\r\n") + "\r\n";
}

/* ---------------------------------------------------------------
   Emails
   --------------------------------------------------------------- */

type Copy = {
  subject: string;
  eyebrow: string;
  title: string;
  intro: string;
  tone: "ok" | "cancelled";
};

function copyFor(kind: EmailKind, payload: NotificationPayload): Copy {
  const shop = shopName(payload);
  const name = firstName(payload.customer.full_name);
  const date = formatDate(payload.appointment.start_at);
  const dateLower = `${date.charAt(0).toLowerCase()}${date.slice(1)}`;
  const when = `${dateLower} a las ${formatTime(payload.appointment.start_at)} hs`;

  switch (kind) {
    case "confirmation":
      return {
        subject: `Turno confirmado · ${formatDate(payload.appointment.start_at)} ${formatTime(payload.appointment.start_at)} hs`,
        eyebrow: "Reserva confirmada",
        title: `¡Listo, ${name}! Tu turno está confirmado.`,
        intro: `Te esperamos en ${shop} el ${when}.`,
        tone: "ok",
      };
    case "updated":
      return {
        subject: `Tu turno cambió · ${formatDate(payload.appointment.start_at)} ${formatTime(payload.appointment.start_at)} hs`,
        eyebrow: "Turno actualizado",
        title: `${name}, tu turno tiene cambios.`,
        intro: `Estos son los datos actualizados de tu turno en ${shop}.`,
        tone: "ok",
      };
    case "reminder":
      return {
        subject: `Recordatorio: tu turno es el ${when}`,
        eyebrow: "Recordatorio",
        title: `${name}, te esperamos pronto.`,
        intro: `Te recordamos tu turno en ${shop}: ${when}. Si no podés venir, avisanos cancelándolo desde tu reserva así otro cliente puede usar el horario.`,
        tone: "ok",
      };
    case "cancelled":
      return payload.appointment.cancelled_by === "cliente"
        ? {
            subject: `Cancelaste tu turno del ${dateLower}`,
            eyebrow: "Turno cancelado",
            title: `${name}, tu turno quedó cancelado.`,
            intro: `Cancelaste tu turno del ${when}. Cuando quieras, reservá uno nuevo.`,
            tone: "cancelled",
          }
        : {
            subject: `${shop} canceló tu turno del ${dateLower}`,
            eyebrow: "Turno cancelado",
            title: `${name}, tuvimos que cancelar tu turno.`,
            intro: `Tu turno del ${when} fue cancelado por la barbería. Disculpá las molestias: escribinos o reservá otro horario.`,
            tone: "cancelled",
          };
  }
}

function detailRow(label: string, value: string) {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};font:600 11px/1.4 Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${COLORS.gold};width:38%;">${escapeHtml(label)}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};font:15px/1.4 Georgia,serif;color:${COLORS.text};text-align:right;">${escapeHtml(value)}</td>
    </tr>`;
}

function button(href: string, label: string, primary: boolean) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:0 6px 10px 0;padding:13px 22px;border-radius:999px;font:700 11px/1 Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;text-decoration:none;${
    primary
      ? `background:${COLORS.cream};color:${COLORS.ink};`
      : `border:1px solid ${COLORS.border};color:${COLORS.text};`
  }">${escapeHtml(label)}</a>`;
}

export function buildAppointmentEmail(
  kind: EmailKind,
  payload: NotificationPayload,
  siteUrl: string
): BuiltEmail {
  const copy = copyFor(kind, payload);
  const shop = shopName(payload);
  const { appointment, service, barber, settings } = payload;
  const cancelled = copy.tone === "cancelled";
  const manage = manageUrl(siteUrl, appointment.reservation_code);
  const book = `${siteUrl.replace(/\/+$/, "")}/reservar`;
  const maps = mapsUrl(settings?.address ?? null);
  const price = formatPrice(service.price);

  const rows = [
    detailRow("Día", formatDate(appointment.start_at)),
    detailRow("Horario", `${formatTime(appointment.start_at)} – ${formatTime(appointment.end_at)} hs`),
    service.name ? detailRow("Servicio", service.name) : "",
    barber.name ? detailRow("Barbero", barber.name) : "",
    price && !cancelled ? detailRow("Total", `${price} · se abona en el local`) : "",
    appointment.reservation_code ? detailRow("Código", appointment.reservation_code) : "",
  ].join("");

  const actions = cancelled
    ? button(book, "Reservar otro turno", true)
    : [
        button(manage, "Ver mi reserva", true),
        maps ? button(maps, "Cómo llegar", false) : "",
      ].join("");

  const policy = cancelled
    ? ""
    : `<p style="margin:22px 0 0;font:13px/1.6 Arial,sans-serif;color:${COLORS.muted};">Podés cancelar en cualquier momento antes del turno${
        settings && settings.cancellation_notice_hours > 0
          ? ` y cambiar el día u horario hasta ${settings.cancellation_notice_hours} h antes`
          : ""
      }, desde “Ver mi reserva”.</p>`;

  const footerBits = [settings?.address, settings?.phone, settings?.instagram ? `@${settings.instagram.replace(/^@/, "")}` : null]
    .filter(Boolean)
    .map((item) => escapeHtml(String(item)))
    .join(" · ");

  const html = `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(copy.subject)}</title></head>
<body style="margin:0;padding:0;background:${COLORS.page};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.page};padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding:0 6px 22px;font:400 15px/1 Georgia,serif;letter-spacing:.24em;color:${COLORS.text};text-transform:uppercase;">${escapeHtml(shop)}</td></tr>
        <tr><td style="background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:22px;padding:30px 26px;">
          <p style="margin:0 0 12px;font:700 11px/1 Arial,sans-serif;letter-spacing:.24em;text-transform:uppercase;color:${cancelled ? COLORS.danger : COLORS.gold};">${escapeHtml(copy.eyebrow)}</p>
          <h1 style="margin:0 0 12px;font:400 26px/1.25 Georgia,serif;color:${COLORS.text};">${escapeHtml(copy.title)}</h1>
          <p style="margin:0 0 22px;font:15px/1.6 Arial,sans-serif;color:${COLORS.muted};">${escapeHtml(copy.intro)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;${cancelled ? "opacity:.75;" : ""}">${rows}</table>
          ${actions}
          ${policy}
        </td></tr>
        <tr><td style="padding:20px 6px 0;font:12px/1.6 Arial,sans-serif;color:${COLORS.muted};">${footerBits || escapeHtml(shop)}<br>Recibiste este email porque tenés un turno en ${escapeHtml(shop)}.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    copy.title,
    "",
    copy.intro,
    "",
    `Día: ${formatDate(appointment.start_at)}`,
    `Horario: ${formatTime(appointment.start_at)} – ${formatTime(appointment.end_at)} hs`,
    service.name ? `Servicio: ${service.name}` : null,
    barber.name ? `Barbero: ${barber.name}` : null,
    price && !cancelled ? `Total: ${price} (se abona en el local)` : null,
    appointment.reservation_code ? `Código: ${appointment.reservation_code}` : null,
    "",
    cancelled ? `Reservar otro turno: ${book}` : `Ver o cancelar tu reserva: ${manage}`,
    maps && !cancelled ? `Cómo llegar: ${maps}` : null,
    "",
    shop,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    subject: copy.subject,
    html,
    text,
    ics: kind === "confirmation" || kind === "updated" || kind === "cancelled"
      ? buildIcs(payload, siteUrl, cancelled)
      : undefined,
  };
}

/* ---------------------------------------------------------------
   Evento de Google Calendar
   --------------------------------------------------------------- */

/* Google acepta ids de evento con caracteres 0-9 y a-v: el UUID del turno
   sin guiones sirve y permite actualizarlo sin guardar nada extra. */
export function calendarEventId(appointmentId: string) {
  return appointmentId.replace(/-/g, "").toLowerCase();
}

export function buildCalendarEvent(payload: NotificationPayload, siteUrl: string) {
  const { appointment, customer, service, barber } = payload;
  const noShow = appointment.status === "no_show";
  const done = appointment.status === "completed";
  const prefix = noShow ? "No asistió · " : done ? "✓ " : "";

  return {
    summary: `${prefix}${service.name ?? "Turno"} · ${customer.full_name ?? "Cliente"}`,
    description: [
      barber.name ? `Barbero: ${barber.name}` : null,
      customer.phone ? `Teléfono: ${customer.phone}` : null,
      service.price !== null ? `Precio: ${formatPrice(service.price)}` : null,
      appointment.reservation_code ? `Código: ${appointment.reservation_code}` : null,
      appointment.source ? `Origen: ${appointment.source === "web" ? "reserva web" : "panel"}` : null,
      appointment.notes ? `Notas: ${appointment.notes}` : null,
      `Reserva: ${manageUrl(siteUrl, appointment.reservation_code)}`,
    ]
      .filter(Boolean)
      .join("\n"),
    location: payload.settings?.address ?? undefined,
    start: { dateTime: appointment.start_at, timeZone: TIME_ZONE },
    end: { dateTime: appointment.end_at, timeZone: TIME_ZONE },
    status: "confirmed",
    // 2 = verde (salvia), 8 = gris, 11 = rojo
    colorId: noShow ? "11" : done ? "8" : "2",
  };
}
