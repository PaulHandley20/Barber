import { createSign } from "node:crypto";

/*
  Google Calendar con una "cuenta de servicio" de Google Cloud.

  Variables de entorno (solo servidor):
    GOOGLE_SERVICE_ACCOUNT_EMAIL        ej. barberos@proyecto.iam.gserviceaccount.com
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY  la "private_key" del JSON (con \n)
    GOOGLE_CALENDAR_ID                  ej. barberia.donsegundo@gmail.com

  El calendario de la barbería se comparte con el email de la cuenta de
  servicio con permiso "Hacer cambios en eventos".
*/

const SCOPE = "https://www.googleapis.com/auth/calendar.events";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/calendar/v3";

let cachedToken: { value: string; expiresAt: number } | null = null;

function config() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim();
  return email && key && calendarId ? { email, key, calendarId } : null;
}

export function isCalendarConfigured() {
  return config() !== null;
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

async function accessToken() {
  const cfg = config();
  if (!cfg) throw new Error("Google Calendar no está configurado.");

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({ iss: cfg.email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = signer.sign(cfg.key).toString("base64url");

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google rechazó la cuenta de servicio (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function calendarFetch(path: string, init: RequestInit) {
  const cfg = config();
  if (!cfg) throw new Error("Google Calendar no está configurado.");

  return fetch(`${API}/calendars/${encodeURIComponent(cfg.calendarId)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

/* Crea o actualiza el evento (también "revive" uno borrado). */
export async function upsertCalendarEvent(eventId: string, event: Record<string, unknown>) {
  const update = await calendarFetch(`/events/${eventId}`, {
    method: "PUT",
    body: JSON.stringify(event),
  });

  if (update.ok) return "updated";

  if (update.status !== 404) {
    throw new Error(`No se pudo actualizar el evento (${update.status}): ${await update.text()}`);
  }

  const insert = await calendarFetch(`/events`, {
    method: "POST",
    body: JSON.stringify({ ...event, id: eventId }),
  });

  if (!insert.ok) {
    throw new Error(`No se pudo crear el evento (${insert.status}): ${await insert.text()}`);
  }

  return "created";
}

export async function deleteCalendarEvent(eventId: string) {
  const response = await calendarFetch(`/events/${eventId}`, { method: "DELETE" });

  // 404/410: ya no existe, no hay nada que borrar.
  if (response.ok || response.status === 404 || response.status === 410) return "deleted";

  throw new Error(`No se pudo borrar el evento (${response.status}): ${await response.text()}`);
}
