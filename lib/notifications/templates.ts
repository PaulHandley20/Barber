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

/* Paleta de la web (landing y reservas). */
const COLORS = {
  night: "#100f0d", // fondo oscuro del sitio
  nightLine: "#2a2722",
  paper: "#F4EEE5", // "ticket" color crema
  paperLine: "#e2d7c4",
  cream: "#EADFCB", // botones claros del sitio
  ink: "#1b1915", // texto sobre crema
  inkSoft: "#5d554a",
  inkMuted: "#8a8174",
  gold: "#C79A5A", // dorado de la landing
  goldDeep: "#8a6a3c", // dorado legible sobre crema
  textOnNight: "#F4EEE5",
  mutedOnNight: "#a39a8e",
  danger: "#a5473a",
};

const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "'Manrope', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const DEFAULT_LOCALITY = "Concepción del Uruguay, Entre Ríos";

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

/* "mitre 866" → "Mitre 866" (para mostrar). */
function displayAddress(address: string | null) {
  const value = (address ?? "").trim();
  return value ? value.replace(/(^|\s)([a-záéíóúñ])/g, (_, space, letter) => space + letter.toUpperCase()) : "";
}

function mapsUrl(address: string | null) {
  const value = (address ?? "").trim();
  if (!value) return null;
  const query = value.includes(",") ? value : `${value}, ${DEFAULT_LOCALITY}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
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

export type EmailOptions = {
  /* src del logo: "cid:..." (adjunto, por defecto) o una URL pública. */
  logoSrc?: string | null;
  /* Franja de aviso arriba del ticket (ej. "Email de prueba"). */
  notice?: string | null;
  /* Para calcular "hoy" / "mañana" en el recordatorio (pruebas). */
  now?: Date;
};

type Copy = {
  subject: string;
  eyebrow: string;
  title: string;
  intro: string;
  tone: "ok" | "cancelled";
};

function argentinaDay(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);
}

/* "hoy" / "mañana" / null según el día del turno en Argentina. */
export function relativeDay(iso: string, now = new Date()) {
  const day = argentinaDay(new Date(iso));
  if (day === argentinaDay(now)) return "hoy";
  if (day === argentinaDay(new Date(now.getTime() + 24 * 3600 * 1000))) return "mañana";
  return null;
}

function copyFor(kind: EmailKind, payload: NotificationPayload, now: Date): Copy {
  const shop = shopName(payload);
  const name = firstName(payload.customer.full_name);
  const date = formatDate(payload.appointment.start_at);
  const dateLower = `${date.charAt(0).toLowerCase()}${date.slice(1)}`;
  const time = `${formatTime(payload.appointment.start_at)} hs`;
  const when = `${dateLower} a las ${time}`;
  const service = payload.service.name ?? "tu turno";

  switch (kind) {
    case "confirmation":
      return {
        subject: `Turno confirmado · ${date}, ${time}`,
        eyebrow: "Reserva confirmada",
        title: `${name}, tu turno está confirmado.`,
        intro: `Te esperamos el ${when} para tu ${service.toLowerCase()}.`,
        tone: "ok",
      };
    case "updated":
      return {
        subject: `Tu turno cambió · ${date}, ${time}`,
        eyebrow: "Turno actualizado",
        title: `${name}, actualizamos tu turno.`,
        intro: `Estos son los datos nuevos: te esperamos el ${when}.`,
        tone: "ok",
      };
    case "reminder": {
      const relative = relativeDay(payload.appointment.start_at, now);
      const whenShort = relative ? `${relative} a las ${time}` : `el ${when}`;
      return {
        subject: `Recordatorio: ${relative ? `${relative} a las ${time}` : `el ${when}`} te esperamos en ${shop}`,
        eyebrow: "Recordatorio",
        title: relative ? `${name}, te esperamos ${relative}.` : `${name}, se acerca tu turno.`,
        intro: `Tu ${service.toLowerCase()} es ${whenShort}. Si no podés venir, cancelalo desde tu reserva así otro cliente puede usar el horario.`,
        tone: "ok",
      };
    }
    case "cancelled":
      return payload.appointment.cancelled_by === "cliente"
        ? {
            subject: `Cancelaste tu turno del ${dateLower}`,
            eyebrow: "Turno cancelado",
            title: `${name}, tu turno quedó cancelado.`,
            intro: `Cancelaste tu turno del ${when}. Gracias por avisar: cuando quieras, reservá uno nuevo.`,
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

function detailRow(label: string, value: string, options: { strong?: boolean; mono?: boolean } = {}) {
  return `
              <tr>
                <td style="padding:11px 0;border-top:1px solid ${COLORS.paperLine};font:700 10px/1.4 ${SANS};letter-spacing:.2em;text-transform:uppercase;color:${COLORS.goldDeep};width:36%;vertical-align:top;">${escapeHtml(label)}</td>
                <td style="padding:11px 0;border-top:1px solid ${COLORS.paperLine};font:${options.strong ? "700" : "400"} 15px/1.45 ${options.mono ? "'Courier New', Courier, monospace" : SERIF};${options.mono ? "letter-spacing:.08em;" : ""}color:${COLORS.ink};text-align:right;">${escapeHtml(value)}</td>
              </tr>`;
}

function button(href: string, label: string, primary: boolean) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin:0 8px 10px 0;padding:14px 26px;border-radius:999px;font:700 11px/1 ${SANS};letter-spacing:.22em;text-transform:uppercase;text-decoration:none;${
    primary
      ? `background:${COLORS.ink};color:${COLORS.cream};border:1px solid ${COLORS.ink};`
      : `background:transparent;color:${COLORS.ink};border:1px solid ${COLORS.ink};`
  }">${escapeHtml(label)}</a>`;
}

export function buildAppointmentEmail(
  kind: EmailKind,
  payload: NotificationPayload,
  siteUrl: string,
  options: EmailOptions = {}
): BuiltEmail {
  const now = options.now ?? new Date();
  const copy = copyFor(kind, payload, now);
  const shop = shopName(payload);
  const { appointment, service, barber, settings } = payload;
  const cancelled = copy.tone === "cancelled";
  const manage = manageUrl(siteUrl, appointment.reservation_code);
  const book = `${siteUrl.replace(/\/+$/, "")}/reservar`;
  const maps = mapsUrl(settings?.address ?? null);
  const price = formatPrice(service.price);
  const address = displayAddress(settings?.address ?? null);
  const instagram = settings?.instagram ? `@${settings.instagram.replace(/^@/, "")}` : "";
  const logoSrc = options.logoSrc === undefined ? "cid:donsegundo-logo" : options.logoSrc;
  const date = formatDate(appointment.start_at);
  const time = formatTime(appointment.start_at);

  const rows = [
    service.name ? detailRow("Servicio", service.name) : "",
    barber.name ? detailRow("Barbero", barber.name) : "",
    service.duration_minutes ? detailRow("Duración", `${service.duration_minutes} min`) : "",
    address ? detailRow("Dónde", address) : "",
    price && !cancelled ? detailRow("Total", `${price}`, { strong: true }) : "",
    appointment.reservation_code ? detailRow("Código", appointment.reservation_code, { mono: true }) : "",
  ].join("");

  const actions = cancelled
    ? button(book, "Reservar otro turno", true)
    : [button(manage, "Ver mi reserva", true), maps ? button(maps, "Cómo llegar", false) : ""].join("");

  const policy = cancelled
    ? ""
    : `<p style="margin:18px 0 0;font:13px/1.6 ${SANS};color:${COLORS.inkMuted};">${
        price ? "Se abona en el local. " : ""
      }Podés cancelar en cualquier momento antes del turno${
        settings && settings.cancellation_notice_hours > 0
          ? ` y cambiar el día u horario hasta ${settings.cancellation_notice_hours} h antes`
          : ""
      }, desde “Ver mi reserva”.</p>`;

  const notice = options.notice
    ? `<tr><td style="padding:0 0 14px;"><div style="border:1px dashed ${COLORS.gold};border-radius:12px;padding:10px 14px;font:600 12px/1.5 ${SANS};color:${COLORS.gold};text-align:center;">${escapeHtml(options.notice)}</div></td></tr>`
    : "";

  const footerBits = [address, settings?.phone, instagram].filter(Boolean).map((item) => escapeHtml(String(item))).join(" &nbsp;·&nbsp; ");

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(copy.subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  @media (max-width: 480px) {
    .ds-pad { padding-left: 22px !important; padding-right: 22px !important; }
    .ds-time { font-size: 40px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${COLORS.night};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(copy.intro)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.night};">
    <tr><td align="center" style="padding:32px 12px 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

        <tr><td align="center" style="padding:0 0 26px;">
          ${logoSrc ? `<img src="${escapeHtml(logoSrc)}" width="120" height="120" alt="${escapeHtml(shop)}" style="display:block;width:120px;height:120px;margin:0 auto 16px;border:0;border-radius:50%;">` : ""}
          <div style="font:400 22px/1.1 ${SERIF};letter-spacing:.24em;text-transform:uppercase;color:${COLORS.textOnNight};">${escapeHtml(shop)}</div>
          <div style="margin-top:10px;font:700 10px/1.4 ${SANS};letter-spacing:.34em;text-transform:uppercase;color:${COLORS.gold};">Barbería exclusiva</div>
        </td></tr>

        ${notice}

        <tr><td style="background:${COLORS.paper};border-radius:22px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td class="ds-pad" style="padding:30px 32px 6px;">
              <p style="margin:0 0 14px;font:700 10px/1 ${SANS};letter-spacing:.28em;text-transform:uppercase;color:${cancelled ? COLORS.danger : COLORS.goldDeep};">${escapeHtml(copy.eyebrow)}</p>
              <h1 style="margin:0 0 10px;font:400 28px/1.2 ${SERIF};color:${COLORS.ink};">${escapeHtml(copy.title)}</h1>
              <p style="margin:0;font:15px/1.6 ${SANS};color:${COLORS.inkSoft};">${escapeHtml(copy.intro)}</p>
            </td></tr>

            <tr><td class="ds-pad" style="padding:22px 32px 6px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLORS.paperLine};border-radius:16px;background:#FBF8F2;">
                <tr><td align="center" style="padding:20px 16px 18px;">
                  <div style="font:700 10px/1 ${SANS};letter-spacing:.28em;text-transform:uppercase;color:${COLORS.goldDeep};">${escapeHtml(date)}</div>
                  <div class="ds-time" style="margin-top:10px;font:400 46px/1 ${SERIF};color:${cancelled ? COLORS.inkMuted : COLORS.ink};"><span style="${cancelled ? "text-decoration:line-through;" : ""}">${escapeHtml(time)}</span><span style="font-size:18px;"> hs</span></div>
                </td></tr>
              </table>
            </td></tr>

            <tr><td class="ds-pad" style="padding:12px 32px 4px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
              </table>
            </td></tr>

            <tr><td class="ds-pad" style="padding:0 32px;">
              <div style="height:0;border-top:2px dashed ${COLORS.paperLine};margin:14px 0 22px;"></div>
            </td></tr>

            <tr><td class="ds-pad" style="padding:0 32px 30px;">
              ${actions}
              ${policy}
            </td></tr>
          </table>
        </td></tr>

        <tr><td align="center" style="padding:24px 12px 0;font:12px/1.7 ${SANS};color:${COLORS.mutedOnNight};">
          ${footerBits ? `${footerBits}<br>` : ""}<span style="color:#6f675d;">Recibiste este email porque tenés un turno en ${escapeHtml(shop)}.</span>
        </td></tr>
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
    `Día: ${date}`,
    `Horario: ${time} – ${formatTime(appointment.end_at)} hs`,
    service.name ? `Servicio: ${service.name}` : null,
    barber.name ? `Barbero: ${barber.name}` : null,
    address ? `Dónde: ${address}` : null,
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
