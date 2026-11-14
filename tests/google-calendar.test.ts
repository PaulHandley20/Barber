import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, createVerify } from "node:crypto";

/*
  Google Calendar con respuestas simuladas: se verifica que la firma de la
  cuenta de servicio sea válida y que se cree, actualice y borre el evento
  correcto. (Con credenciales reales se prueba desde Configuración.)
*/

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "barberos@proyecto.iam.gserviceaccount.com";
process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = privateKey
  .export({ type: "pkcs8", format: "pem" })
  .toString()
  .replace(/\n/g, "\\n");
process.env.GOOGLE_CALENDAR_ID = "donsegundobarberia@gmail.com";

const calendar = await import("../lib/notifications/google-calendar.ts");

type Call = { url: string; method: string; body: string };
let calls: Call[] = [];
let responses: Array<{ status: number; body?: unknown }> = [];

beforeEach(() => {
  calls = [];
  responses = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? String(init.body) : "";
    calls.push({ url, method: init?.method ?? "GET", body });
    if (url === "https://oauth2.googleapis.com/token") {
      return new Response(JSON.stringify({ access_token: "token-123", expires_in: 3600 }), { status: 200 });
    }
    const next = responses.shift() ?? { status: 200, body: {} };
    return new Response(next.body === undefined ? null : JSON.stringify(next.body), { status: next.status });
  }) as typeof fetch;
});

test("está configurado con las 3 variables", () => {
  assert.equal(calendar.isCalendarConfigured(), true);
});

test("crea el evento si no existe (PUT 404 → POST con el id del turno)", async () => {
  responses = [{ status: 404, body: { error: "not found" } }, { status: 200, body: { id: "abc12345" } }];
  const result = await calendar.upsertCalendarEvent("abc12345", { summary: "Corte · Paul" });

  assert.equal(result, "created");
  const token = calls.find((call) => call.url.includes("oauth2"));
  assert.ok(token, "pide el token");

  // La firma JWT de la cuenta de servicio es válida
  const assertion = new URLSearchParams(token.body).get("assertion") ?? "";
  const [header, claims, signature] = assertion.split(".");
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${header}.${claims}`);
  assert.equal(verifier.verify(publicKey, Buffer.from(signature, "base64url")), true);
  const decoded = JSON.parse(Buffer.from(claims, "base64url").toString());
  assert.equal(decoded.iss, "barberos@proyecto.iam.gserviceaccount.com");
  assert.equal(decoded.scope, "https://www.googleapis.com/auth/calendar.events");

  const [put, post] = calls.filter((call) => call.url.includes("/calendar/v3/"));
  assert.equal(put.method, "PUT");
  assert.match(put.url, /calendars\/donsegundobarberia%40gmail\.com\/events\/abc12345$/);
  assert.equal(post.method, "POST");
  assert.equal(JSON.parse(post.body).id, "abc12345");
});

test("actualiza si ya existe y reutiliza el token", async () => {
  responses = [{ status: 200, body: {} }];
  assert.equal(await calendar.upsertCalendarEvent("abc12345", { summary: "x" }), "updated");
  assert.equal(calls.filter((call) => call.url.includes("oauth2")).length, 0);
});

test("borrar un evento que ya no existe no es un error", async () => {
  responses = [{ status: 410 }];
  assert.equal(await calendar.deleteCalendarEvent("abc12345"), "deleted");
});

test("un error de Google se informa", async () => {
  responses = [{ status: 403, body: { error: "forbidden" } }];
  await assert.rejects(() => calendar.upsertCalendarEvent("abc12345", {}), /403/);
});

test("la private_key se acepta aunque se haya pegado con defectos comunes", async () => {
  const { createPrivateKey } = await import("node:crypto");
  const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const oneLine = pem.replace(/\n/g, "\\n");
  const variants = {
    "con \\n como texto": oneLine,
    "con saltos reales": pem,
    "con comillas de más": `"${oneLine}"`,
    "con doble comilla": `""${oneLine}""`,
    "con saltos de Windows": pem.replace(/\n/g, "\r\n"),
    "con espacios en vez de saltos": pem.replace(/\n/g, " "),
    "con la coma del JSON": `"${oneLine}",`,
  };
  for (const [label, raw] of Object.entries(variants)) {
    const fixed = calendar.normalizePrivateKey(raw);
    assert.ok(fixed, `no se pudo leer la clave ${label}`);
    assert.doesNotThrow(() => createPrivateKey(fixed!), `clave inválida ${label}`);
  }
  assert.equal(calendar.normalizePrivateKey("cualquier cosa"), null);
});

test("el diagnóstico avisa si la private_key está incompleta", () => {
  const saved = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADAN\\n-----END PRIVATE KEY-----\\n";
  const result = calendar.checkCalendarConfig();
  assert.equal(result.ok, false);
  assert.match(result.hint, /incompleta/);
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = saved;
  assert.equal(calendar.checkCalendarConfig().ok, true);
});
