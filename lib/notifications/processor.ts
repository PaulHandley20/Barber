import type { SupabaseClient } from "@supabase/supabase-js";
import { isCalendarConfigured, upsertCalendarEvent, deleteCalendarEvent } from "./google-calendar";
import { isMailConfigured, sendEmail } from "./mailer";
import {
  buildAppointmentEmail,
  buildCalendarEvent,
  calendarEventId,
  type EmailKind,
  type NotificationPayload,
} from "./templates";

/*
  Procesa la cola de envíos (notification_jobs) y los recordatorios.
  Lo llama /api/notifications/process.
*/

type Job = {
  id: number;
  appointment_id: string;
  kind: "confirmation" | "updated" | "cancelled" | "calendar_sync";
  attempts: number;
};

type Outcome = { status: "sent" | "skipped" | "failed"; detail?: string; error?: string };

export type ProcessSummary = {
  jobs: number;
  sent: number;
  skipped: number;
  failed: number;
  reminders: number;
  errors: string[];
};

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

const ACTIVE = new Set(["confirmed", "pending"]);
const CANCELLED = new Set(["cancelled", "canceled"]);

function shopName(payload: NotificationPayload) {
  return payload.settings?.name?.trim() || "Don Segundo";
}

async function sendAppointmentEmail(kind: EmailKind, payload: NotificationPayload): Promise<Outcome> {
  const to = payload.customer.email?.trim();
  if (!to) return { status: "skipped", detail: "el cliente no tiene email" };
  if (!isMailConfigured()) return { status: "skipped", detail: "Gmail no está configurado" };

  const email = buildAppointmentEmail(kind, payload, siteUrl());
  await sendEmail({ ...email, to, fromName: shopName(payload) });
  return { status: "sent", detail: `email a ${to}` };
}

async function handleJob(job: Job, payload: NotificationPayload | null): Promise<Outcome> {
  if (!payload) return { status: "skipped", detail: "el turno ya no existe" };

  const settings = payload.settings;
  const status = payload.appointment.status;
  const future = new Date(payload.appointment.start_at).getTime() > Date.now();

  if (job.kind === "calendar_sync") {
    if (!settings?.calendar_sync_enabled) return { status: "skipped", detail: "calendario apagado" };
    if (!isCalendarConfigured()) return { status: "skipped", detail: "Google Calendar no está configurado" };

    const eventId = calendarEventId(payload.appointment.id);
    if (CANCELLED.has(status)) {
      await deleteCalendarEvent(eventId);
      return { status: "sent", detail: "evento borrado" };
    }
    const result = await upsertCalendarEvent(eventId, buildCalendarEvent(payload, siteUrl()));
    return { status: "sent", detail: result === "created" ? "evento creado" : "evento actualizado" };
  }

  if (!settings?.notifications_enabled || !settings.appointment_confirmation_enabled) {
    return { status: "skipped", detail: "emails de turnos apagados" };
  }

  if (job.kind === "cancelled") {
    if (!CANCELLED.has(status)) return { status: "skipped", detail: "el turno ya no está cancelado" };
    return sendAppointmentEmail("cancelled", payload);
  }

  // confirmation / updated: el turno tiene que seguir activo y por venir
  if (!ACTIVE.has(status) || !future) {
    return { status: "skipped", detail: "el turno ya no está activo" };
  }
  return sendAppointmentEmail(job.kind, payload);
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function processNotifications(
  supabase: SupabaseClient,
  options: { limit?: number; maxAgeMinutes?: number; reminders?: boolean } = {}
): Promise<ProcessSummary> {
  const summary: ProcessSummary = { jobs: 0, sent: 0, skipped: 0, failed: 0, reminders: 0, errors: [] };

  const { data: jobs, error } = await supabase.rpc("claim_notification_jobs", {
    p_limit: options.limit ?? 20,
    p_max_age: options.maxAgeMinutes ? `${options.maxAgeMinutes} minutes` : null,
  });

  if (error) throw new Error(`No se pudo leer la cola: ${error.message}`);

  for (const job of (jobs ?? []) as Job[]) {
    summary.jobs += 1;
    let outcome: Outcome;

    try {
      const { data: payload, error: payloadError } = await supabase.rpc("notification_payload", {
        p_appointment_id: job.appointment_id,
      });
      if (payloadError) throw new Error(payloadError.message);
      outcome = await handleJob(job, (payload as NotificationPayload | null) ?? null);
    } catch (jobError) {
      outcome = { status: "failed", error: errorText(jobError) };
    }

    summary[outcome.status] += 1;
    if (outcome.error) summary.errors.push(`${job.kind}: ${outcome.error}`);

    await supabase.rpc("finish_notification_job", {
      p_id: job.id,
      p_status: outcome.status,
      p_detail: outcome.detail ?? null,
      p_error: outcome.error ?? null,
    });
  }

  if (options.reminders !== false && isMailConfigured()) {
    const { data: due, error: dueError } = await supabase.rpc("claim_due_reminders", {
      p_limit: options.limit ?? 20,
    });
    if (dueError) throw new Error(`No se pudieron leer los recordatorios: ${dueError.message}`);

    for (const row of (due ?? []) as { appointment_id: string; payload: NotificationPayload }[]) {
      try {
        const outcome = await sendAppointmentEmail("reminder", row.payload);
        if (outcome.status === "sent") summary.reminders += 1;
      } catch (reminderError) {
        summary.errors.push(`recordatorio: ${errorText(reminderError)}`);
        await supabase.rpc("release_reminder", { p_appointment_id: row.appointment_id });
      }
    }
  }

  return summary;
}
