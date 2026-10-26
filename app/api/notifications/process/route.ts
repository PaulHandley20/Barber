import { createServiceClient } from "@/lib/supabase/service";
import { currentAdminEmail, hasCronSecret } from "@/lib/notifications/auth";
import { processNotifications } from "@/lib/notifications/processor";

/*
  Procesa la cola de emails / calendario y los recordatorios.

  - Cron de Supabase (cada 5 min) con "Authorization: Bearer <secreto>":
    procesa todo, incluidos los recordatorios.
  - Admin del panel ("Procesar ahora" y después de cada cambio en la
    Agenda): procesa todo.
  - Sin credenciales (la web, apenas alguien reserva, reprograma o
    cancela): solo despacha las tareas recién creadas, para que el email
    llegue al instante. No devuelve datos.
*/
export async function POST(request: Request) {
  const supabase = createServiceClient();
  if (!supabase) {
    return Response.json(
      { ok: false, error: "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor." },
      { status: 503 }
    );
  }

  const trusted = hasCronSecret(request) || (await currentAdminEmail()) !== null;

  try {
    const summary = trusted
      ? await processNotifications(supabase, { limit: 25 })
      : await processNotifications(supabase, { limit: 5, maxAgeMinutes: 15, reminders: false });

    return trusted ? Response.json({ ok: true, ...summary }) : Response.json({ ok: true });
  } catch (error) {
    console.error("[notificaciones]", error);
    return Response.json(
      { ok: false, error: trusted && error instanceof Error ? error.message : "Error procesando la cola." },
      { status: 500 }
    );
  }
}
