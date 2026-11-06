import { createClient } from "@supabase/supabase-js";

/*
  Cliente con la clave de servicio (service_role o "secret key"). SOLO
  para código de servidor (rutas /api): saltea las políticas RLS. Nunca
  importarlo desde un componente "use client".

  Variable de entorno (solo servidor, sin NEXT_PUBLIC_):
    SUPABASE_SERVICE_ROLE_KEY   sb_secret_... (nueva) o la service_role (legacy)
*/

/* Tolera espacios o comillas alrededor, un error común al pegarla. */
export function serviceRoleKey() {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim().replace(/^["']|["']$/g, "").trim();
}

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = serviceRoleKey();

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function projectRef(url: string | undefined) {
  return url?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1]?.toLowerCase() ?? null;
}

/*
  Diagnóstico de la clave para Configuración → Notificaciones. Nunca
  devuelve la clave: solo qué tipo es y qué le pasa.
*/
export async function checkServiceKey(): Promise<{ ok: boolean; hint: string }> {
  const raw = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const key = serviceRoleKey();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!key) return { ok: false, hint: "Falta SUPABASE_SERVICE_ROLE_KEY en .env.local: sin ella no sale nada." };
  if (/[•*…]/.test(key)) {
    return { ok: false, hint: "La clave está tapada con puntitos: en Supabase tocá el botón de copiar (o el ojo) y pegala completa." };
  }
  if (key.startsWith("sb_publishable_")) {
    return { ok: false, hint: "Pegaste la clave publicable (sb_publishable_...). Hace falta la secreta: sb_secret_..." };
  }

  let kind = "secret key nueva";
  if (!key.startsWith("sb_secret_")) {
    const parts = key.split(".");
    if (parts.length !== 3) {
      return { ok: false, hint: "No tiene el formato de una clave de Supabase (sb_secret_... o una service_role que empieza con eyJ...)." };
    }
    try {
      const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString()) as { role?: string; ref?: string };
      if (claims.role && claims.role !== "service_role") {
        return { ok: false, hint: `Es la clave legacy "${claims.role}", no la "service_role". En Legacy API Keys copiá la de service_role.` };
      }
      const urlRef = projectRef(url);
      if (claims.ref && urlRef && claims.ref.toLowerCase() !== urlRef) {
        return { ok: false, hint: `La clave es de otro proyecto de Supabase (${claims.ref}); la URL del sitio es del proyecto ${urlRef}.` };
      }
      kind = "service_role legacy";
    } catch {
      return { ok: false, hint: "No tiene el formato de una clave de Supabase." };
    }
  }

  const client = createServiceClient();
  if (!client) return { ok: false, hint: "Falta NEXT_PUBLIC_SUPABASE_URL." };

  const { error } = await client.from("notification_jobs").select("id", { count: "exact", head: true });
  const notes = raw !== key ? " (tenía espacios o comillas de más: se ignoraron)" : "";

  if (!error) return { ok: true, hint: `Configurada y aceptada por Supabase (${kind})${notes}.` };
  if (/invalid api key|jwt|unauthorized/i.test(error.message)) {
    return {
      ok: false,
      hint: `Supabase rechaza la clave (${kind}, ${key.length} caracteres). Revisá que esté completa y sea de este proyecto${projectRef(url) ? ` (${projectRef(url)})` : ""}; si es la nueva, probá con la service_role de Legacy API Keys.`,
    };
  }
  return { ok: true, hint: `Clave aceptada (${kind}), pero la consulta falló: ${error.message}. ¿Corriste la migración 14?` };
}
