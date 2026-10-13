"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  Lock,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import DateTimeField from "@/components/admin/ui/DateTimeField";

type DaySchedule = {
  id?: string;
  day_of_week: number;
  day_name: string;
  is_open: boolean;
  open_time: string;
  close_time: string;
  has_break: boolean;
  break_start: string;
  break_end: string;
};

type BlockedPeriod = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  reason: string | null;
};

const DAYS = [
  { day_of_week: 1, name: "Lunes" },
  { day_of_week: 2, name: "Martes" },
  { day_of_week: 3, name: "Miércoles" },
  { day_of_week: 4, name: "Jueves" },
  { day_of_week: 5, name: "Viernes" },
  { day_of_week: 6, name: "Sábado" },
  { day_of_week: 0, name: "Domingo" },
];

const DEFAULT_SCHEDULES: DaySchedule[] = [
  {
    day_of_week: 1,
    day_name: "Lunes",
    is_open: true,
    open_time: "09:00",
    close_time: "18:00",
    has_break: false,
    break_start: "13:00",
    break_end: "14:00",
  },
  {
    day_of_week: 2,
    day_name: "Martes",
    is_open: true,
    open_time: "09:00",
    close_time: "18:00",
    has_break: false,
    break_start: "13:00",
    break_end: "14:00",
  },
  {
    day_of_week: 3,
    day_name: "Miércoles",
    is_open: true,
    open_time: "09:00",
    close_time: "18:00",
    has_break: false,
    break_start: "13:00",
    break_end: "14:00",
  },
  {
    day_of_week: 4,
    day_name: "Jueves",
    is_open: true,
    open_time: "09:00",
    close_time: "18:00",
    has_break: false,
    break_start: "13:00",
    break_end: "14:00",
  },
  {
    day_of_week: 5,
    day_name: "Viernes",
    is_open: true,
    open_time: "09:00",
    close_time: "18:00",
    has_break: false,
    break_start: "13:00",
    break_end: "14:00",
  },
  {
    day_of_week: 6,
    day_name: "Sábado",
    is_open: false,
    open_time: "09:00",
    close_time: "18:00",
    has_break: false,
    break_start: "13:00",
    break_end: "14:00",
  },
  {
    day_of_week: 0,
    day_name: "Domingo",
    is_open: false,
    open_time: "09:00",
    close_time: "18:00",
    has_break: false,
    break_start: "13:00",
    break_end: "14:00",
  },
];

export default function HorariosPage() {
  const supabase = createClient();

  const [schedules, setSchedules] =
    useState<DaySchedule[]>(DEFAULT_SCHEDULES);

  const [blockedPeriods, setBlockedPeriods] = useState<BlockedPeriod[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);

  const [showBlockedForm, setShowBlockedForm] = useState(false);

  const [blockTitle, setBlockTitle] = useState("");
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockAllDay, setBlockAllDay] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setMessage(null);

    const { data: hoursData, error: hoursError } = await supabase
      .from("barbershop_hours")
      .select("*")
      .order("day_of_week", { ascending: true });

    if (hoursError) {
      console.error(hoursError);
    }

    if (hoursData && hoursData.length > 0) {
      const mappedSchedules = DAYS.map((day) => {
        const existing = hoursData.find(
          (item) => item.day_of_week === day.day_of_week
        );

        if (!existing) {
          const fallback = DEFAULT_SCHEDULES.find(
            (item) => item.day_of_week === day.day_of_week
          );

          return fallback!;
        }

        return {
          id: existing.id,
          day_of_week: existing.day_of_week,
          day_name: day.name,
          is_open: existing.is_open,
          open_time: existing.open_time?.slice(0, 5) || "09:00",
          close_time: existing.close_time?.slice(0, 5) || "18:00",
          has_break: existing.has_break ?? false,
          break_start: existing.break_start?.slice(0, 5) || "13:00",
          break_end: existing.break_end?.slice(0, 5) || "14:00",
        };
      });

      setSchedules(mappedSchedules);
    }

    const { data: blockedData, error: blockedError } = await supabase
      .from("barbershop_blocked_periods")
      .select("*")
      .order("starts_at", { ascending: true });

    if (blockedError) {
      console.error(blockedError);
    }

    if (blockedData) {
      setBlockedPeriods(blockedData);
    }

    setLoading(false);
  }

  function updateSchedule(
    dayOfWeek: number,
    field: keyof DaySchedule,
    value: string | boolean
  ) {
    setSchedules((current) =>
      current.map((schedule) =>
        schedule.day_of_week === dayOfWeek
          ? {
              ...schedule,
              [field]: value,
            }
          : schedule
      )
    );
  }

  async function saveSchedules() {
    setSaving(true);
    setMessage(null);

    try {
      for (const schedule of schedules) {
        const payload = {
          day_of_week: schedule.day_of_week,
          is_open: schedule.is_open,
          open_time: schedule.open_time,
          close_time: schedule.close_time,
          has_break: schedule.has_break,
          break_start: schedule.has_break
            ? schedule.break_start
            : null,
          break_end: schedule.has_break
            ? schedule.break_end
            : null,
        };

        if (schedule.id) {
          const { error } = await supabase
            .from("barbershop_hours")
            .update(payload)
            .eq("id", schedule.id);

          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from("barbershop_hours")
            .insert(payload)
            .select()
            .single();

          if (error) throw error;

          if (data) {
            setSchedules((current) =>
              current.map((item) =>
                item.day_of_week === schedule.day_of_week
                  ? {
                      ...item,
                      id: data.id,
                    }
                  : item
              )
            );
          }
        }
      }

      setMessage({
        type: "success",
        text: "Horarios guardados correctamente.",
      });
    } catch (error) {
      console.error(error);

      setMessage({
        type: "error",
        text: "No se pudieron guardar los horarios.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function createBlockedPeriod() {
    if (!blockTitle.trim()) {
      setMessage({
        type: "error",
        text: "Ingresá un título para el período bloqueado.",
      });
      return;
    }

    if (!blockStart) {
      setMessage({
        type: "error",
        text: "Seleccioná el inicio del período bloqueado.",
      });
      return;
    }

    if (!blockAllDay && !blockEnd) {
      setMessage({
        type: "error",
        text: "Seleccioná el final del período bloqueado.",
      });
      return;
    }

    setSavingBlock(true);
    setMessage(null);

    try {
      const startDate = new Date(blockStart);

      const endDate = blockAllDay
        ? new Date(startDate)
        : new Date(blockEnd);

      if (blockAllDay) {
        endDate.setHours(23, 59, 59, 999);
      }

      if (endDate <= startDate) {
        throw new Error(
          "El final debe ser posterior al inicio."
        );
      }

      const { data, error } = await supabase
        .from("barbershop_blocked_periods")
        .insert({
          title: blockTitle.trim(),
          starts_at: startDate.toISOString(),
          ends_at: endDate.toISOString(),
          all_day: blockAllDay,
          reason: blockReason.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setBlockedPeriods((current) =>
          [...current, data].sort(
            (a, b) =>
              new Date(a.starts_at).getTime() -
              new Date(b.starts_at).getTime()
          )
        );
      }

      setBlockTitle("");
      setBlockStart("");
      setBlockEnd("");
      setBlockAllDay(false);
      setBlockReason("");
      setShowBlockedForm(false);

      setMessage({
        type: "success",
        text: "Período bloqueado creado correctamente.",
      });
    } catch (error) {
      console.error(error);

      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "No se pudo crear el período bloqueado.",
      });
    } finally {
      setSavingBlock(false);
    }
  }

  async function deleteBlockedPeriod(id: string) {
    const confirmed = window.confirm(
      "¿Querés eliminar este período bloqueado?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("barbershop_blocked_periods")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);

      setMessage({
        type: "error",
        text: "No se pudo eliminar el período.",
      });

      return;
    }

    setBlockedPeriods((current) =>
      current.filter((period) => period.id !== id)
    );

    setMessage({
      type: "success",
      text: "Período bloqueado eliminado.",
    });
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  }

  return (
    <main className="min-h-screen text-[#f5f5f5]">
      <div className="mx-auto max-w-[1680px] px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
        {/* HEADER */}
        <header className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/82">BarberOS</span>
              <span className="text-white/10">/</span>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#ff6a18]">Disponibilidad</span>
              <CalendarDays size={14} className="ml-1 text-[#ff6a18]" />
            </div>

            <h1 className="font-[family:var(--font-barberos-display)] text-[34px] font-semibold leading-[.91] tracking-[-0.075em] text-white sm:text-[42px]">
              Horarios
            </h1>

            <p className="mt-3 max-w-2xl text-[14px] leading-6 text-white/64">
              Configurá los días y horarios en los que la barbería
              recibe reservas. Estos horarios determinan la
              disponibilidad del sistema.
            </p>
          </div>

          <button
            onClick={saveSchedules}
            disabled={saving || loading}
            className="flex h-10 items-center gap-2 rounded-[11px] bg-[#ff5a00] px-4 text-[13px] font-semibold text-white shadow-[0_10px_28px_rgba(255,90,0,.18)] transition hover:bg-[#ff6a18] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={15} />

            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </header>

        {/* MESSAGE */}
        {message && (
          <div
            className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
              message.type === "success"
                ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                : "border-red-400/20 bg-red-400/10 text-red-300"
            }`}
          >
            {message.type === "success" ? (
              <Check size={17} />
            ) : (
              <X size={17} />
            )}

            {message.text}
          </div>
        )}

        {/* WEEKLY SCHEDULE */}
        <section className="admin-panel mb-6 overflow-hidden">
          <div className="border-b border-white/[0.08] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06]">
                <Clock3 size={17} className="text-white/70" />
              </div>

              <div>
                <h2 className="font-medium">
                  Horario semanal
                </h2>

                <p className="mt-1 text-xs text-white/35">
                  Configuración habitual de la barbería
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {loading ? (
              <div className="px-6 py-12 text-center text-sm text-white/40">
                Cargando horarios...
              </div>
            ) : (
              schedules.map((schedule) => (
                <div
                  key={schedule.day_of_week}
                  className="px-6 py-5"
                >
                  <div className="grid gap-5 lg:grid-cols-[180px_130px_1fr] lg:items-center">
                    {/* DAY */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          updateSchedule(
                            schedule.day_of_week,
                            "is_open",
                            !schedule.is_open
                          )
                        }
                        className={`relative h-6 w-11 rounded-full transition ${
                          schedule.is_open
                            ? "bg-white"
                            : "bg-white/10"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-4 w-4 rounded-full transition ${
                            schedule.is_open
                              ? "left-6 bg-black"
                              : "left-1 bg-white/40"
                          }`}
                        />
                      </button>

                      <div>
                        <p className="text-sm font-medium">
                          {schedule.day_name}
                        </p>

                        <p className="mt-0.5 text-xs text-white/35">
                          {schedule.is_open
                            ? "Abierto"
                            : "Cerrado"}
                        </p>
                      </div>
                    </div>

                    {/* STATUS */}
                    <div>
                      <span
                        className={`inline-flex rounded-lg border px-3 py-1.5 text-xs ${
                          schedule.is_open
                            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                            : "border-white/10 bg-white/[0.03] text-white/35"
                        }`}
                      >
                        {schedule.is_open
                          ? "Horario activo"
                          : "Día cerrado"}
                      </span>
                    </div>

                    {/* TIMES */}
                    {schedule.is_open ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <div>
                          <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-white/30">
                            Primer turno
                          </label>

                          <div className="w-[132px]">
                            <DateTimeField
                              mode="time"
                              minuteStep={30}
                              value={schedule.open_time ?? ""}
                              onChange={(value) => updateSchedule(schedule.day_of_week, "open_time", value)}
                            />
                          </div>
                        </div>

                        <span className="mt-5 text-white/20">
                          —
                        </span>

                        <div>
                          <label className="mb-1.5 block text-[11px] uppercase tracking-wider text-white/30">
                            Último turno
                          </label>

                          <div className="w-[132px]">
                            <DateTimeField
                              mode="time"
                              minuteStep={30}
                              value={schedule.close_time ?? ""}
                              onChange={(value) => updateSchedule(schedule.day_of_week, "close_time", value)}
                            />
                          </div>
                        </div>

                        <div className="ml-0 flex items-center gap-2 lg:ml-5">
                          <button
                            onClick={() =>
                              updateSchedule(
                                schedule.day_of_week,
                                "has_break",
                                !schedule.has_break
                              )
                            }
                            className={`relative h-5 w-9 rounded-full transition ${
                              schedule.has_break
                                ? "bg-white"
                                : "bg-white/10"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 h-4 w-4 rounded-full transition ${
                                schedule.has_break
                                  ? "left-4.5 bg-black"
                                  : "left-0.5 bg-white/40"
                              }`}
                            />
                          </button>

                          <span className="text-xs text-white/40">
                            Descanso
                          </span>
                        </div>

                        {schedule.has_break && (
                          <>
                            <div className="w-[132px]">
                            <DateTimeField
                              mode="time"
                              minuteStep={30}
                              value={schedule.break_start ?? ""}
                              onChange={(value) => updateSchedule(schedule.day_of_week, "break_start", value)}
                            />
                          </div>

                            <span className="text-white/20">
                              —
                            </span>

                            <div className="w-[132px]">
                            <DateTimeField
                              mode="time"
                              minuteStep={30}
                              value={schedule.break_end ?? ""}
                              onChange={(value) => updateSchedule(schedule.day_of_week, "break_end", value)}
                            />
                          </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-white/25">
                        No se aceptan reservas este día.
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* BLOCKED PERIODS */}
        <section className="admin-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06]">
                <Lock size={17} className="text-white/70" />
              </div>

              <div>
                <h2 className="font-medium">
                  Períodos bloqueados
                </h2>

                <p className="mt-1 text-xs text-white/35">
                  Vacaciones, feriados, eventos o cierres
                  especiales.
                </p>
              </div>
            </div>

            <button
              onClick={() =>
                setShowBlockedForm((current) => !current)
              }
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm transition hover:bg-white/[0.07]"
            >
              {showBlockedForm ? (
                <>
                  <X size={15} />
                  Cancelar
                </>
              ) : (
                <>
                  <Plus size={15} />
                  Agregar bloqueo
                </>
              )}
            </button>
          </div>

          {/* FORM */}
          {showBlockedForm && (
            <div className="border-b border-white/[0.08] bg-white/[0.015] p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs text-white/40">
                    Título
                  </label>

                  <input
                    type="text"
                    value={blockTitle}
                    onChange={(event) =>
                      setBlockTitle(event.target.value)
                    }
                    placeholder="Ej. Vacaciones"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-white/20 focus:border-white/25"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs text-white/40">
                    Motivo
                  </label>

                  <input
                    type="text"
                    value={blockReason}
                    onChange={(event) =>
                      setBlockReason(event.target.value)
                    }
                    placeholder="Ej. Cierre por vacaciones"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none placeholder:text-white/20 focus:border-white/25"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs text-white/40">
                    Inicio
                  </label>

                  {blockAllDay ? (
                    <DateTimeField
                      mode="date"
                      value={blockStart.slice(0, 10)}
                      onChange={(value) => setBlockStart(`${value}T00:00`)}
                    />
                  ) : (
                    <DateTimeField
                      mode="datetime"
                      minuteStep={30}
                      value={blockStart}
                      onChange={setBlockStart}
                    />
                  )}
                </div>

                {!blockAllDay && (
                  <div>
                    <label className="mb-2 block text-xs text-white/40">
                      Fin
                    </label>

                    <DateTimeField
                      mode="datetime"
                      minuteStep={30}
                      value={blockEnd}
                      onChange={setBlockEnd}
                    />
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={() =>
                    setBlockAllDay((current) => !current)
                  }
                  className="flex items-center gap-3 text-sm text-white/55"
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                      blockAllDay
                        ? "border-[#ff5a00] bg-[#ff5a00]/15 text-white"
                        : "border-white/20 bg-transparent"
                    }`}
                  >
                    {blockAllDay && <Check size={13} />}
                  </span>

                  Todo el día
                </button>

                <button
                  onClick={createBlockedPeriod}
                  disabled={savingBlock}
                  className="flex items-center gap-2 rounded-[11px] bg-[#ff5a00] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff6a18] disabled:opacity-50"
                >
                  <Plus size={15} />

                  {savingBlock
                    ? "Creando..."
                    : "Crear bloqueo"}
                </button>
              </div>
            </div>
          )}

          {/* LIST */}
          {blockedPeriods.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Lock
                size={22}
                className="mx-auto text-white/20"
              />

              <p className="mt-3 text-sm text-white/35">
                No hay períodos bloqueados.
              </p>

              <p className="mt-1 text-xs text-white/20">
                Cuando necesites cerrar la barbería por un
                período especial, podés agregarlo acá.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {blockedPeriods.map((period) => (
                <div
                  key={period.id}
                  className="flex items-center justify-between gap-5 px-6 py-5"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="truncate text-sm font-medium">
                        {period.title}
                      </h3>

                      {period.all_day && (
                        <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] uppercase tracking-wider text-white/35">
                          Todo el día
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-white/40">
                      {formatDate(period.starts_at)}
                      {" → "}
                      {formatDate(period.ends_at)}
                    </p>

                    {period.reason && (
                      <p className="mt-1 text-xs text-white/25">
                        {period.reason}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() =>
                      deleteBlockedPeriod(period.id)
                    }
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/35 transition hover:border-red-400/20 hover:bg-red-400/10 hover:text-red-300"
                    title="Eliminar bloqueo"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* INFO */}
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4">
          <ChevronDown
            size={16}
            className="mt-0.5 rotate-[-90deg] text-white/25"
          />

          <p className="text-xs leading-5 text-white/30">
            Los horarios configurados acá serán utilizados
            posteriormente por el sistema de reservas para
            determinar automáticamente qué días y horarios están
            disponibles para los clientes.
          </p>
        </div>
      </div>
    </main>
  );
}