import { isCalendarConfigured } from "@/lib/notifications/google-calendar";
import { currentAdminEmail } from "@/lib/notifications/auth";
import { isMailConfigured, mailSender } from "@/lib/notifications/mailer";
import { siteUrl } from "@/lib/notifications/processor";

/* Qué está configurado en el servidor (para Configuración → Notificaciones). */
export async function GET() {
  if ((await currentAdminEmail()) === null) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  return Response.json({
    mail: isMailConfigured(),
    sender: mailSender(),
    dryRun: process.env.NOTIFICATIONS_DRY_RUN === "1",
    calendar: isCalendarConfigured(),
    calendarId: process.env.GOOGLE_CALENDAR_ID?.trim() || null,
    serviceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    cronSecret: Boolean(process.env.NOTIFICATIONS_CRON_SECRET?.trim()),
    siteUrl: siteUrl(),
  });
}
