import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildAppointmentEmail,
  buildCalendarEvent,
  buildIcs,
  calendarEventId,
  escapeHtml,
  manageUrl,
  relativeDay,
  type NotificationPayload,
} from "../lib/notifications/templates.ts";

const SITE = "https://donsegundo.com.ar/";

function payload(overrides: Partial<NotificationPayload["appointment"]> = {}): NotificationPayload {
  return {
    appointment: {
      id: "5f0c2b1e-8a7d-4c3b-9e21-0a1b2c3d4e5f",
      reservation_code: "DS-AB12CD34",
      // 15/10/2026 16:00 en Argentina (UTC-3)
      start_at: "2026-10-15T19:00:00.000Z",
      end_at: "2026-10-15T19:30:00.000Z",
      status: "confirmed",
      notes: null,
      cancelled_by: null,
      source: "web",
      ...overrides,
    },
    customer: { full_name: "Paul Handley", phone: "3442 555123", email: "paul@example.com" },
    service: { name: "Corte clásico", duration_minutes: 30, price: 15000 },
    barber: { name: "Manu" },
    settings: {
      name: "Don Segundo",
      address: "Mitre 866, Concepción del Uruguay",
      phone: null,
      instagram: "donsegundo",
      notifications_enabled: true,
      appointment_confirmation_enabled: true,
      appointment_reminder_enabled: true,
      reminder_hours_before: 24,
      calendar_sync_enabled: true,
      cancellation_notice_hours: 1,
    },
  };
}

test("la confirmación muestra fecha y hora de Argentina, barbero, precio y link a Mi reserva", () => {
  const email = buildAppointmentEmail("confirmation", payload(), SITE);

  assert.match(email.subject, /Turno confirmado · Jueves, 15 de octubre, 16:00 hs/);
  assert.match(email.html, /Paul, tu turno está confirmado\./);
  assert.match(email.html, />16:00<\/span><span style="font-size:18px;"> hs/);
  assert.match(email.text, /Horario: 16:00 – 16:30 hs/);
  assert.match(email.html, /Manu/);
  assert.match(email.html, /class="ds-logo-dark" src="cid:donsegundo-logo-dark"/);
  assert.match(email.html, /src="cid:donsegundo-logo-light"/);
  assert.match(email.html, /@media \(prefers-color-scheme: light\)/);
  // En Gmail (no informa el modo) se usa la insignia crema.
  assert.match(email.html, /u \+ \.body \.ds-logo-light \{ display: block !important;/);
  assert.match(email.html, /<body class="body ds-night" lang="es"/);
  assert.match(email.text, /Total: \$\s?15\.000 \(se abona en el local\)/);
  assert.match(email.html, /https:\/\/donsegundo\.com\.ar\/gestionar-reserva\?codigo=DS-AB12CD34/);
  assert.ok(email.ics, "la confirmación adjunta el .ics");
});

test("la cancelación distingue si canceló el cliente o la barbería", () => {
  const byClient = buildAppointmentEmail("cancelled", payload({ status: "cancelled", cancelled_by: "cliente" }), SITE);
  const byShop = buildAppointmentEmail("cancelled", payload({ status: "cancelled", cancelled_by: "admin" }), SITE);

  assert.match(byClient.subject, /^Cancelaste tu turno/);
  assert.match(byShop.subject, /^Don Segundo canceló tu turno/);
  assert.match(byShop.html, /Reservar otro turno/);
  assert.doesNotMatch(byShop.html, /se abona en el local/);
  assert.match(byShop.ics ?? "", /METHOD:CANCEL/);
});

test("el recordatorio dice 'mañana' o 'hoy', no adjunta .ics y pide avisar si no puede venir", () => {
  // 14/10 20:00 en Argentina → el turno del 15/10 es "mañana"
  const email = buildAppointmentEmail("reminder", payload(), SITE, { now: new Date("2026-10-14T23:00:00.000Z") });
  assert.equal(email.subject, "Recordatorio: mañana a las 16:00 hs te esperamos en Don Segundo");
  assert.match(email.html, /Paul, te esperamos mañana\./);
  assert.match(email.text, /cancelalo/);
  assert.equal(email.ics, undefined);

  assert.equal(relativeDay("2026-10-15T19:00:00.000Z", new Date("2026-10-15T12:00:00.000Z")), "hoy");
  assert.equal(relativeDay("2026-10-15T19:00:00.000Z", new Date("2026-10-12T12:00:00.000Z")), null);
});

test("la dirección se muestra con mayúscula y 'Cómo llegar' agrega la ciudad si falta", () => {
  const data = payload();
  data.settings!.address = "mitre 866";
  const email = buildAppointmentEmail("confirmation", data, SITE, { logos: null, notice: "Email de prueba" });
  assert.match(email.html, /Mitre 866/);
  assert.match(email.html, /query=mitre%20866%2C%20Concepci%C3%B3n%20del%20Uruguay/);
  assert.doesNotMatch(email.html, /cid:donsegundo-logo/);
  assert.match(email.html, /Email de prueba/);
});

test("los datos del cliente se escapan en el HTML", () => {
  const data = payload();
  data.customer.full_name = "<script>alert(1)</script>";
  const email = buildAppointmentEmail("confirmation", data, SITE);
  assert.doesNotMatch(email.html, /<script>/);
  assert.equal(escapeHtml(`"<a>&'`), "&quot;&lt;a&gt;&amp;&#39;");
});

test("el .ics usa horas UTC y escapa comas", () => {
  const ics = buildIcs(payload(), SITE);
  assert.match(ics, /DTSTART:20261015T190000Z/);
  assert.match(ics, /DTEND:20261015T193000Z/);
  assert.match(ics, /LOCATION:Mitre 866\\, Concepción del Uruguay/);
  assert.ok(ics.endsWith("\r\n"));
});

test("el id del evento de Google es válido (0-9 y a-v) y estable", () => {
  const id = calendarEventId("5F0C2B1E-8A7D-4C3B-9E21-0A1B2C3D4E5F");
  assert.equal(id, "5f0c2b1e8a7d4c3b9e210a1b2c3d4e5f");
  assert.match(id, /^[0-9a-v]{5,1024}$/);
});

test("el evento del calendario marca a los que no asistieron", () => {
  const event = buildCalendarEvent(payload({ status: "no_show" }), SITE);
  assert.match(event.summary, /^No asistió · Corte clásico · Paul Handley/);
  assert.equal(event.colorId, "11");
  assert.equal(event.start.timeZone, "America/Argentina/Buenos_Aires");
});

test("manageUrl tolera barras al final y códigos ausentes", () => {
  assert.equal(manageUrl("https://x.com///", null), "https://x.com/gestionar-reserva");
});
