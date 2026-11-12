import { timingSafeEqual } from "node:crypto";
import { isAllowedAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

/* El cron de Supabase se identifica con NOTIFICATIONS_CRON_SECRET. */
export function hasCronSecret(request: Request) {
  const secret = process.env.NOTIFICATIONS_CRON_SECRET?.trim();
  const header = request.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!secret || !given) return false;

  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* Admin logueado en el panel (misma regla que el proxy de /admin). */
export async function currentAdminEmail() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email ?? null;
    return data.user && isAllowedAdmin(email) ? email ?? "" : null;
  } catch {
    return null;
  }
}
