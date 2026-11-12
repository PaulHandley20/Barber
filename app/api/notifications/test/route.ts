import { currentAdminEmail } from "@/lib/notifications/auth";
import { isMailConfigured, sendEmail } from "@/lib/notifications/mailer";
import { siteUrl } from "@/lib/notifications/processor";
import { buildAppointmentEmail, type NotificationPayload } from "@/lib/notifications/templates";
import { createClient } from "@/lib/supabase/server";

/* Manda un email de prueba (una confirmación de ejemplo) al admin. */
export async function POST(request: Request) {
  const adminEmail = await currentAdminEmail();
  if (adminEmail === null) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!isMailConfigured()) {
    return Response.json(
      { error: "Falta configurar GMAIL_USER y GMAIL_APP_PASSWORD en el servidor." },
      { status: 400 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { to?: string };
  const to = (body.to || adminEmail || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
    return Response.json({ error: "Ingresá un email válido." }, { status: 400 });
  }

  // Datos reales de la barbería (configuración, un servicio y un barbero)
  // para que la prueba se vea como un email de verdad.
  const supabase = await createClient();
  const [{ data: settings }, { data: service }, { data: barber }] = await Promise.all([
    supabase.from("barbershop_settings").select("*").limit(1).maybeSingle(),
    supabase.from("services").select("name, duration_minutes, price").eq("active", true).order("price").limit(1).maybeSingle(),
    supabase.from("barbers").select("name").order("name").limit(1).maybeSingle(),
  ]);

  const start = new Date(Date.now() + 2 * 24 * 3600 * 1000);
  start.setUTCHours(14, 0, 0, 0); // 11:00 en Argentina
  const payload: NotificationPayload = {
    appointment: {
      id: "00000000-0000-0000-0000-000000000000",
      reservation_code: "DS-PRUEBA1",
      start_at: start.toISOString(),
      end_at: new Date(start.getTime() + Number(service?.duration_minutes ?? 30) * 60000).toISOString(),
      status: "confirmed",
      notes: null,
      cancelled_by: null,
      source: "web",
    },
    customer: { full_name: "Cliente", phone: null, email: to },
    service: {
      name: service?.name ?? "Corte clásico",
      duration_minutes: Number(service?.duration_minutes ?? 30),
      price: service ? Number(service.price) : 15000,
    },
    barber: { name: barber?.name ?? "Manu" },
    settings: {
      name: settings?.name ?? "Don Segundo",
      address: settings?.address ?? null,
      phone: settings?.phone ?? null,
      instagram: settings?.instagram ?? null,
      notifications_enabled: true,
      appointment_confirmation_enabled: true,
      appointment_reminder_enabled: true,
      reminder_hours_before: settings?.reminder_hours_before ?? 24,
      calendar_sync_enabled: false,
      cancellation_notice_hours: settings?.cancellation_notice_hours ?? 0,
    },
  };

  try {
    const email = buildAppointmentEmail("confirmation", payload, siteUrl(), {
      notice: "Email de prueba: el turno es de ejemplo, así se ve una confirmación.",
    });
    await sendEmail({
      ...email,
      subject: `[Prueba] ${email.subject}`,
      to,
      fromName: payload.settings?.name ?? "Don Segundo",
    });
    return Response.json({ ok: true, to });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo enviar." },
      { status: 502 }
    );
  }
}
