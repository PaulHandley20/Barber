import { isCalendarConfigured } from "@/lib/notifications/google-calendar";
import { currentAdminEmail } from "@/lib/notifications/auth";
import { isMailConfigured, mailSender } from "@/lib/notifications/mailer";
import { siteUrl } from "@/lib/notifications/processor";
import { checkServiceKey } from "@/lib/supabase/service";

/* Qué está configurado en el servidor (para Configuración → Notificaciones). */
export async function GET() {
  if ((await currentAdminEmail()) === null) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  const key = await checkServiceKey();

  return Response.json({
    mail: isMailConfigured(),
    sender: mailSender(),
    dryRun: process.env.NOTIFICATIONS_DRY_RUN === "1",
    calendar: isCalendarConfigured(),
    calendarId: process.env.GOOGLE_CALENDAR_ID?.trim() || null,
    serviceKey: key.ok,
    serviceKeyHint: key.hint,
    cronSecret: Boolean(process.env.NOTIFICATIONS_CRON_SECRET?.trim()),
    siteUrl: siteUrl(),
  });
}
