"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, Mail, RefreshCw, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/*
  Estado de los envíos automáticos (Configuración → Notificaciones):
  qué está configurado en el servidor, cuántos emails/eventos salieron y
  si hubo errores. Permite mandar un email de prueba y procesar la cola.
*/

type ServerStatus = {
  mail: boolean;
  sender: string | null;
  dryRun: boolean;
  calendar: boolean;
  calendarId: string | null;
  calendarHint: string;
  serviceKey: boolean;
  serviceKeyHint: string;
  cronSecret: boolean;
  siteUrl: string;
};

type JobRow = {
  kind: string;
  status: string;
  detail: string | null;
  last_error: string | null;
  processed_at: string | null;
  created_at: string;
};

const KIND_LABEL: Record<string, string> = {
  confirmation: "Confirmación",
  updated: "Cambio de turno",
  cancelled: "Cancelación",
  calendar_sync: "Calendario",
};

function formatWhen(iso: string | null) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

function Check({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[12px] border border-white/[0.065] bg-white/[0.018] p-4">
      <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${ok ? "bg-emerald-400" : "bg-amber-300"}`} />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-white/86">{label}</p>
        <p className="mt-0.5 break-words text-[12px] leading-5 text-white/55">{hint}</p>
      </div>
    </div>
  );
}

export default function NotificationsStatus({ calendarEnabled }: { calendarEnabled: boolean }) {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [testTo, setTestTo] = useState("");
  const [busy, setBusy] = useState<"" | "test" | "process">("");
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/status", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setStatus((await response.json()) as ServerStatus);
      setStatusError("");
    } catch {
      setStatusError("No se pudo consultar el servidor.");
    }

    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const { data, error } = await createClient()
      .from("notification_jobs")
      .select("kind, status, detail, last_error, processed_at, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);

    // Sin la migración 14 la tabla no existe: no se muestra el resumen.
    setJobs(error ? null : ((data ?? []) as JobRow[]));
  }, []);

  useEffect(() => {
    // Primera carga al abrir Configuración.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function sendTest() {
    setBusy("test");
    setFeedback(null);
    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo.trim() || undefined }),
      });
      const body = (await response.json()) as { ok?: boolean; to?: string; error?: string };
      setFeedback(
        response.ok
          ? { type: "ok", text: `Email de prueba enviado a ${body.to}. Revisá la bandeja (y Spam).` }
          : { type: "error", text: body.error ?? "No se pudo enviar." }
      );
    } catch {
      setFeedback({ type: "error", text: "No se pudo conectar con el servidor." });
    }
    setBusy("");
  }

  async function processNow() {
    setBusy("process");
    setFeedback(null);
    try {
      const response = await fetch("/api/notifications/process?retry=1", { method: "POST" });
      const body = (await response.json()) as {
        ok: boolean;
        jobs?: number;
        sent?: number;
        skipped?: number;
        failed?: number;
        reminders?: number;
        errors?: string[];
        error?: string;
      };
      if (!response.ok || !body.ok) {
        setFeedback({ type: "error", text: body.error ?? "No se pudo procesar la cola." });
      } else {
        const parts = [
          `${body.sent ?? 0} enviados`,
          `${body.reminders ?? 0} recordatorios`,
          body.skipped ? `${body.skipped} sin enviar (ver detalle)` : null,
          body.failed ? `${body.failed} con error` : null,
        ].filter(Boolean);
        const firstError = body.errors?.[0];
        setFeedback({
          type: body.failed || firstError ? "error" : "ok",
          text:
            (body.jobs || body.reminders ? parts.join(" · ") : "No había nada pendiente.") +
            (firstError ? ` — Error: ${firstError}` : ""),
        });
      }
    } catch {
      setFeedback({ type: "error", text: "No se pudo conectar con el servidor." });
    }
    await load();
    setBusy("");
  }

  const emailJobs = jobs?.filter((job) => job.kind !== "calendar_sync") ?? [];
  const sentEmails = emailJobs.filter((job) => job.status === "sent").length;
  const calendarSynced = jobs?.filter((job) => job.kind === "calendar_sync" && job.status === "sent").length ?? 0;
  const pending = jobs?.filter((job) => job.status === "pending" || job.status === "processing").length ?? 0;
  const failed = jobs?.filter((job) => job.status === "failed") ?? [];
  // Lo procesado y lo que se está reintentando (con el motivo del error).
  const recent = (jobs ?? [])
    .filter((job) => job.status !== "pending" || job.last_error)
    .slice(0, 5);

  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Check
          ok={Boolean(status?.mail)}
          label={status?.dryRun ? "Emails en modo prueba" : "Envío por Gmail"}
          hint={
            status?.dryRun
              ? "NOTIFICATIONS_DRY_RUN=1: los emails se muestran en la consola del servidor y no se envían."
              : status?.mail
                ? `Se envían desde ${status.sender}.`
                : statusError || "Falta configurar GMAIL_USER y GMAIL_APP_PASSWORD (ver docs/LANZAMIENTO.md)."
          }
        />
        <Check
          ok={Boolean(status?.calendar) || !calendarEnabled}
          label="Google Calendar"
          hint={
            status?.calendar
              ? `Calendario: ${status.calendarId}.`
              : status?.calendarHint
                ? status.calendarHint
                : calendarEnabled
                  ? "Falta configurar la cuenta de servicio de Google (ver docs/LANZAMIENTO.md)."
                  : "Apagado."
          }
        />
        <Check
          ok={Boolean(status?.serviceKey)}
          label="Clave de servicio de Supabase"
          hint={status?.serviceKeyHint ?? statusError ?? ""}
        />
        <Check
          ok={Boolean(status?.cronSecret)}
          label="Recordatorios automáticos (cron)"
          hint={
            status?.cronSecret
              ? "Secreto configurado. Falta programar el cron en Supabase si todavía no lo hiciste."
              : "Falta NOTIFICATIONS_CRON_SECRET y programar el cron en Supabase."
          }
        />
      </div>

      {jobs ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Emails enviados · 7 días", value: sentEmails, icon: <Mail size={14} /> },
            { label: "Eventos de calendario · 7 días", value: calendarSynced, icon: <CalendarDays size={14} /> },
            { label: "Pendientes", value: pending, icon: <RefreshCw size={14} /> },
          ].map((item) => (
            <div key={item.label} className="rounded-[12px] border border-white/[0.065] bg-white/[0.018] p-4">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-white/62">
                <span className="text-[#FF6A18]">{item.icon}</span>
                {item.label}
              </div>
              <div className="display mt-2 text-[24px] font-semibold tracking-[-.04em] text-white">{item.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-[12px] border border-amber-300/15 bg-amber-300/[0.04] px-4 py-3 text-[12px] leading-5 text-amber-100/80">
          Corré la migración 14 en Supabase para activar la cola de envíos.
        </p>
      )}

      {failed.length > 0 && (
        <div className="rounded-[12px] border border-red-300/15 bg-red-300/[0.04] px-4 py-3 text-[12px] leading-5 text-red-100/85">
          <p className="flex items-center gap-2 font-semibold">
            <AlertCircle size={13} />
            {failed.length} {failed.length === 1 ? "envío falló" : "envíos fallaron"} después de varios intentos
          </p>
          <p className="mt-1 break-words text-red-100/65">Último error: {failed[0].last_error}</p>
        </div>
      )}

      {recent.length > 0 && (
        <div className="rounded-[12px] border border-white/[0.065]">
          <p className="border-b border-white/[0.065] px-4 py-3 text-[11px] font-bold uppercase tracking-[.14em] text-white/55">
            Últimos movimientos
          </p>
          {recent.map((job, index) => (
            <div key={index} className="flex items-center justify-between gap-3 border-b border-white/[0.045] px-4 py-2.5 last:border-b-0">
              <span className="min-w-0 text-[12px] text-white/72">
                <span className="font-semibold text-white/86">{KIND_LABEL[job.kind] ?? job.kind}</span>
                {job.status === "failed" || job.status === "pending" ? (
                  <span className="block break-words text-red-200/75">{job.last_error}</span>
                ) : job.detail ? (
                  ` · ${job.detail}`
                ) : (
                  ""
                )}
              </span>
              <span className={`shrink-0 text-[11px] font-semibold ${job.status === "sent" ? "text-emerald-300/85" : job.status === "failed" ? "text-red-300/85" : job.status === "pending" ? "text-amber-200/85" : "text-white/45"}`}>
                {job.status === "sent" ? "Enviado" : job.status === "failed" ? "Error" : job.status === "pending" ? "Reintentando" : "Omitido"} · {formatWhen(job.processed_at ?? job.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-[12px] border border-white/[0.065] bg-white/[0.012] p-4 lg:flex-row lg:items-center">
        <input
          type="email"
          value={testTo}
          onChange={(event) => setTestTo(event.target.value)}
          placeholder="Email para la prueba (por defecto, el tuyo)"
          className="h-10 min-w-0 flex-1 rounded-[10px] border border-white/[0.08] bg-[#080808] px-3.5 text-[13px] text-white outline-none placeholder:text-white/35 focus:border-[#ff5a00]/40"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={sendTest}
            disabled={busy !== ""}
            className="flex h-10 items-center gap-2 rounded-[10px] border border-white/[0.09] px-4 text-[12px] font-semibold text-white/80 transition hover:bg-white/[0.04] disabled:opacity-50"
          >
            <Send size={13} />
            {busy === "test" ? "Enviando..." : "Enviar email de prueba"}
          </button>
          <button
            type="button"
            onClick={processNow}
            disabled={busy !== ""}
            className="flex h-10 items-center gap-2 rounded-[10px] bg-[#FF5A00] px-4 text-[12px] font-semibold text-white transition hover:bg-[#FF6A18] disabled:opacity-50"
          >
            <RefreshCw size={13} className={busy === "process" ? "animate-spin" : ""} />
            {busy === "process" ? "Procesando..." : "Procesar pendientes"}
          </button>
        </div>
      </div>

      {feedback && (
        <p
          className={`flex items-start gap-2 rounded-[12px] px-4 py-3 text-[12px] leading-5 ${
            feedback.type === "ok"
              ? "border border-emerald-300/15 bg-emerald-300/[0.05] text-emerald-100/90"
              : "border border-red-300/15 bg-red-300/[0.05] text-red-100/90"
          }`}
        >
          {feedback.type === "ok" ? <CheckCircle2 size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
          {feedback.text}
        </p>
      )}
    </div>
  );
}
