"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Search,
} from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

type Reservation = {
  id: string;
  reservation_code: string;
  service_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  service_name: string;
  service_duration_minutes: number;
  service_price: number;
  barber_name: string;
  start_at: string;
  end_at: string;
  status: string;
  notes: string | null;
};

type AvailableSlot = {
  slot_start: string;
  slot_end: string;
};

export default function GestionarReservaPage() {
  const [reservationCode, setReservationCode] = useState("");
  const [reservation, setReservation] =
    useState<Reservation | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] =
    useState<string | null>(null);

  const [editingReservation, setEditingReservation] =
    useState(false);

  const [newStartAt, setNewStartAt] =
    useState("");

  const [selectedDate, setSelectedDate] =
    useState("");

  const [availableSlots, setAvailableSlots] =
    useState<AvailableSlot[]>([]);

  const [loadingSlots, setLoadingSlots] =
    useState(false);

  const [currentMonth, setCurrentMonth] =
    useState(() => new Date());

  function formatReservationCode(value: string) {
    return value
      .toUpperCase()
      .replace(/\s/g, "");
  }

  async function fetchAvailableSlots(date: string) {
    if (!reservation?.service_id) return;

    setLoadingSlots(true);
    setError(null);

    const supabase = createClient();

    const { data, error } =
      await supabase.rpc(
        "get_available_slots",
        {
          p_date: date,
          p_service_id:
            reservation.service_id,
        },
      );

    if (error) {
      console.error(
        "Error obteniendo horarios:",
        error,
      );

      setError(
        "No pudimos cargar los horarios disponibles.",
      );

      setAvailableSlots([]);
      setLoadingSlots(false);

      return;
    }

    console.log(
      "HORARIOS DISPONIBLES:",
      data,
    );

    setAvailableSlots(
      (data || []) as AvailableSlot[],
    );

    setLoadingSlots(false);
  }

  function formatSlotTime(
    dateString: string,
  ) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "--:--";
    }

    return new Intl.DateTimeFormat(
      "es-AR",
      {
        timeZone:
          "America/Argentina/Buenos_Aires",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
    ).format(date);
  }

  function formatDateKey(date: Date) {
    const year =
      date.getFullYear();

    const month = String(
      date.getMonth() + 1,
    ).padStart(2, "0");

    const day = String(
      date.getDate(),
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getTodayDateKey() {
    const formatter =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "America/Argentina/Buenos_Aires",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        },
      );

    return formatter.format(
      new Date(),
    );
  }

  function getDateFromKey(
    dateKey: string,
  ) {
    const [
      year,
      month,
      day,
    ] = dateKey
      .split("-")
      .map(Number);

    return new Date(
      year,
      month - 1,
      day,
    );
  }

  function isDateBeforeToday(
    dateKey: string,
  ) {
    return (
      dateKey <
      getTodayDateKey()
    );
  }

  function isSunday(date: Date) {
    return date.getDay() === 0;
  }

  function isDateWithinBookingWindow(
    dateKey: string,
  ) {
    const todayKey =
      getTodayDateKey();

    const today =
      getDateFromKey(
        todayKey,
      );

    const target =
      getDateFromKey(
        dateKey,
      );

    const diff =
      (target.getTime() -
        today.getTime()) /
      (1000 * 60 * 60 * 24);

    return (
      diff >= 0 &&
      diff <= 30
    );
  }

  function isDateAvailable(
    date: Date,
  ) {
    const dateKey =
      formatDateKey(date);

    return (
      !isDateBeforeToday(
        dateKey,
      ) &&
      !isSunday(date) &&
      isDateWithinBookingWindow(
        dateKey,
      )
    );
  }

  function getCalendarDays(
    month: Date,
  ) {
    const year =
      month.getFullYear();

    const monthIndex =
      month.getMonth();

    const firstDay =
      new Date(
        year,
        monthIndex,
        1,
      );

    const startingDay =
      firstDay.getDay();

    const days: Date[] = [];

    for (
      let i = 0;
      i < 42;
      i++
    ) {
      days.push(
        new Date(
          year,
          monthIndex,
          i -
            startingDay +
            1,
        ),
      );
    }

    return days;
  }

  function formatMonthTitle(
    date: Date,
  ) {
    return new Intl.DateTimeFormat(
      "es-AR",
      {
        month: "long",
        year: "numeric",
      },
    ).format(date);
  }

  function formatArgentinaDate(
    dateString: string,
  ) {
    const date =
      new Date(dateString);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return "Fecha no disponible";
    }

    return new Intl.DateTimeFormat(
      "es-AR",
      {
        timeZone:
          "America/Argentina/Buenos_Aires",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    ).format(date);
  }

  function formatArgentinaTime(
    dateString: string,
  ) {
    const date =
      new Date(dateString);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return "--:--";
    }

    return new Intl.DateTimeFormat(
      "es-AR",
      {
        timeZone:
          "America/Argentina/Buenos_Aires",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      },
    ).format(date);
  }

  function getStatusLabel(
    status: string,
  ) {
    const statuses: Record<
      string,
      string
    > = {
      confirmed: "Confirmada",
      cancelled: "Cancelada",
      completed: "Completada",
      pending: "Pendiente",
    };

    return (
      statuses[status] ||
      status
    );
  }

  async function searchReservation() {
    const code =
      formatReservationCode(
        reservationCode,
      );

    if (!code) {
      setError(
        "Ingresá tu código de reserva.",
      );

      setReservation(null);

      return;
    }

    setLoading(true);
    setError(null);
    setReservation(null);
    setEditingReservation(
      false,
    );
    setAvailableSlots([]);
    setSelectedDate("");
    setNewStartAt("");

    const supabase =
      createClient();

    const { data, error } =
      await supabase.rpc(
        "get_reservation_by_code",
        {
          p_reservation_code:
            code,
        },
      );

    if (error) {
      console.error(
        "Error buscando reserva:",
        error,
      );

      setError(
        error.message ||
          "No pudimos encontrar la reserva.",
      );

      setLoading(false);

      return;
    }

    const reservationData =
      Array.isArray(data)
        ? data[0]
        : data;

    if (!reservationData) {
      setError(
        "No encontramos ninguna reserva con ese código.",
      );

      setLoading(false);

      return;
    }

    setReservation(
      reservationData,
    );

    setReservationCode(
      reservationData.reservation_code,
    );

    setLoading(false);

    window.setTimeout(
      () => {
        document
          .getElementById(
            "reservation-result",
          )
          ?.scrollIntoView({
            behavior:
              "smooth",
            block: "start",
          });
      },
      100,
    );
  }

  function openEditReservation() {
    if (!reservation)
      return;

    const reservationDate =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            "America/Argentina/Buenos_Aires",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        },
      ).format(
        new Date(
          reservation.start_at,
        ),
      );

    const reservationDateObject =
      getDateFromKey(
        reservationDate,
      );

    setEditingReservation(
      true,
    );

    setSelectedDate(
      reservationDate,
    );

    setNewStartAt("");

    setError(null);

    setCurrentMonth(
      reservationDateObject,
    );

    fetchAvailableSlots(
      reservationDate,
    );
  }

  async function confirmReschedule() {
    if (
      !reservation ||
      !newStartAt
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    const supabase =
      createClient();

    const { data, error } =
      await supabase.rpc(
        "reschedule_reservation",
        {
          p_reservation_code:
            reservation.reservation_code,
          p_new_start_at:
            newStartAt,
        },
      );

    if (error) {
      console.error(
        "Error reprogramando reserva:",
        error,
      );

      setError(
        error.message ||
          "No pudimos modificar tu reserva.",
      );

      setLoading(false);

      return;
    }

    const updatedReservation =
      Array.isArray(data)
        ? data[0]
        : data;

    if (
      !updatedReservation
    ) {
      setError(
        "No pudimos actualizar tu reserva.",
      );

      setLoading(false);

      return;
    }

    setReservation(
      (current) =>
        current
          ? {
              ...current,
              start_at:
                updatedReservation.start_at,
              end_at:
                updatedReservation.end_at,
            }
          : current,
    );

    setEditingReservation(
      false,
    );

    setAvailableSlots([]);
    setSelectedDate("");
    setNewStartAt("");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#11110f] text-[#F4EEE5]">

      {/* HEADER */}

      <section className="relative overflow-hidden border-b border-white/10 px-6 py-14 md:px-10 md:py-20">

        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#b08a5a]/[0.04] blur-3xl" />

        <div className="relative mx-auto max-w-5xl">

          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#777169] transition-all duration-300 hover:text-[#b08a5a]"
          >
            <ArrowLeft size={14} />
            Volver a la pagina principal
          </Link>

          <div className="mb-7 h-px w-20 bg-[#b08a5a]" />

          <p className="text-xs uppercase tracking-[0.38em] text-[#9b8465]">
            Don Segundo · Reservas
          </p>

          <h1 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">
            Gestioná tu reserva.
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#aaa198] md:text-base">
            Consultá el estado de tu turno,
            revisá los datos de tu reserva y
            gestioná tu visita a Don Segundo.
          </p>

        </div>

      </section>

      {/* CONTENIDO */}

      <section className="mx-auto max-w-5xl px-5 py-12 md:px-8 md:py-20">

        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">

          {/* BUSCADOR */}

          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
            }}
            className="overflow-hidden border border-[#8a7152]/30 bg-[#181715]"
          >

            <div className="border-b border-white/10 px-6 py-7 md:px-9">

              <div className="flex items-center gap-4">

                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#b08a5a]/40 bg-[#b08a5a]/10 text-[#b08a5a]">
                  <Search size={17} />
                </div>

                <div>

                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#9b8465]">
                    Gestionar reserva
                  </p>

                  <h2 className="mt-1 font-serif text-3xl">
                    Encontrá tu turno
                  </h2>

                </div>

              </div>

            </div>

            <div className="p-6 md:p-9">

              <p className="max-w-xl text-sm leading-7 text-[#aaa198]">
                Ingresá el código de reserva que
                recibiste al confirmar tu turno.
              </p>

              <div className="mt-7">

                <label
                  htmlFor="reservation-code"
                  className="mb-2.5 block text-[10px] uppercase tracking-[0.25em] text-[#9b8465]"
                >
                  Código de reserva
                </label>

                <input
                  id="reservation-code"
                  type="text"
                  value={
                    reservationCode
                  }
                  onChange={(e) => {
                    setReservationCode(
                      formatReservationCode(
                        e.target.value,
                      ),
                    );

                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key ===
                      "Enter"
                    ) {
                      searchReservation();
                    }
                  }}
                  placeholder="DS-XXXXXXXX"
                  className="w-full border border-white/10 bg-[#141412] px-5 py-4 font-mono text-sm tracking-[0.12em] text-[#F4EEE5] outline-none transition-all duration-300 placeholder:text-[#514d47] hover:border-white/20 focus:border-[#b08a5a] focus:bg-[#181715] focus:ring-1 focus:ring-[#b08a5a]/20"
                />

              </div>

              <button
                type="button"
                disabled={loading}
                onClick={
                  searchReservation
                }
                className="group mt-5 flex w-full items-center justify-center gap-3 bg-[#b08a5a] px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#171512] transition-all duration-300 hover:bg-[#c09a6c] hover:shadow-[0_15px_45px_rgba(176,138,90,.15)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >

                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border border-[#171512]/30 border-t-[#171512]" />
                    Buscando...
                  </>
                ) : (
                  <>
                    Buscar mi reserva

                    <ArrowRight
                      size={15}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}

              </button>

              <p className="mt-5 text-[10px] leading-6 text-[#625e58]">
                El código aparece en la pantalla de
                confirmación de tu reserva.
              </p>

              {error && (
                <div className="mt-6 border border-red-900/50 bg-red-950/20 p-4">
                  <p className="text-sm text-red-300">
                    {error}
                  </p>
                </div>
              )}

            </div>

          </motion.div>

          {/* INFORMACIÓN */}

          <motion.aside
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
              delay: 0.1,
            }}
            className="h-fit border border-white/5 bg-[#141412] p-7 md:p-8"
          >

            <div className="mb-7 h-px w-12 bg-[#b08a5a]" />

            <p className="text-[10px] uppercase tracking-[0.3em] text-[#9b8465]">
              Tu reserva
            </p>

            <h2 className="mt-2 font-serif text-3xl">
              Todo en un solo lugar.
            </h2>

            <div className="mt-7 space-y-5">

              <InfoItem
                icon={
                  <CalendarDays size={16} />
                }
                title="Consultá tu turno"
                text="Fecha, horario y servicio reservado."
              />

              <InfoItem
                icon={
                  <CheckCircle2 size={16} />
                }
                title="Estado"
                text="Comprobá si tu reserva está confirmada."
              />

              <InfoItem
                icon={
                  <ArrowRight size={16} />
                }
                title="Gestioná tu visita"
                text="Modificá o cancelá tu reserva."
              />

            </div>

          </motion.aside>

        </div>

        {/* RESULTADO */}

        {reservation && (
          <motion.section
            id="reservation-result"
            initial={{
              opacity: 0,
              y: 30,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
            }}
            className="mt-8 overflow-hidden border border-[#b08a5a]/40 bg-[#181715]"
          >

            <div className="border-b border-white/10 p-7 text-center md:p-10">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#b08a5a]/50 bg-[#b08a5a]/10 text-[#b08a5a]">
                <CheckCircle2 size={30} />
              </div>

              <p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-[#9b8465]">
                Reserva encontrada
              </p>

              <h2 className="mt-3 font-serif text-3xl md:text-4xl">
                Tu turno en Don Segundo
              </h2>

              <div className="mt-6 inline-flex flex-col items-center border border-white/10 bg-[#141412] px-6 py-4">

                <span className="text-[9px] uppercase tracking-[0.28em] text-[#625e58]">
                  Código de reserva
                </span>

                <span className="mt-2 font-mono text-lg tracking-[0.18em] text-[#b08a5a]">
                  {
                    reservation.reservation_code
                  }
                </span>

              </div>

            </div>

            {/* DATOS RESERVA */}

            <div className="grid gap-px bg-white/10 md:grid-cols-2">

              <ReservationItem
                label="Servicio"
                value={
                  reservation.service_name
                }
              />

              <ReservationItem
                label="Duración"
                value={`${reservation.service_duration_minutes} minutos`}
              />

              <ReservationItem
                label="Fecha"
                value={formatArgentinaDate(
                  reservation.start_at,
                )}
              />

              <ReservationItem
                label="Horario"
                value={`${formatArgentinaTime(
                  reservation.start_at,
                )} → ${formatArgentinaTime(
                  reservation.end_at,
                )}`}
              />

              <ReservationItem
                label="Barbero"
                value={
                  reservation.barber_name
                }
              />

              <ReservationItem
                label="Estado"
                value={getStatusLabel(
                  reservation.status,
                )}
                highlight
              />

            </div>

            {/* CONTACTO */}

            <div className="border-t border-white/10 p-7 md:p-9">

              <p className="text-[9px] uppercase tracking-[0.28em] text-[#625e58]">
                Datos de contacto
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-3">

                <ReservationItem
                  label="Cliente"
                  value={
                    reservation.customer_name
                  }
                />

                <ReservationItem
                  label="Teléfono"
                  value={
                    reservation.customer_phone
                  }
                />

                <ReservationItem
                  label="Email"
                  value={
                    reservation.customer_email
                  }
                />

              </div>

              {reservation.notes && (
                <div className="mt-4">

                  <ReservationItem
                    label="Observaciones"
                    value={
                      reservation.notes
                    }
                  />

                </div>
              )}

            </div>

            {/* ACCIONES */}

            <div className="border-t border-white/10 bg-[#141412] p-7 md:p-9">

              <div className="flex flex-col gap-3 sm:flex-row">

                <button
                  type="button"
                  onClick={
                    openEditReservation
                  }
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-3 border border-white/10 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ddd6cc] transition-all hover:border-[#b08a5a]/60 hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CalendarDays size={15} />
                  Modificar reserva
                </button>

                <button
                  type="button"
                  onClick={async () => {

                    const confirmed =
                      window.confirm(
                        "¿Estás seguro de que querés cancelar esta reserva?",
                      );

                    if (!confirmed)
                      return;

                    setLoading(true);
                    setError(null);

                    const supabase =
                      createClient();

                    const { error } =
                      await supabase.rpc(
                        "cancel_reservation",
                        {
                          p_reservation_code:
                            reservation.reservation_code,
                        },
                      );

                    if (error) {
                      console.error(
                        "Error cancelando reserva:",
                        error,
                      );

                      setError(
                        error.message ||
                          "No pudimos cancelar tu reserva.",
                      );

                      setLoading(false);

                      return;
                    }

                    setReservation(
                      null,
                    );

                    setReservationCode(
                      "",
                    );

                    setEditingReservation(
                      false,
                    );

                    setSelectedDate(
                      "",
                    );

                    setNewStartAt(
                      "",
                    );

                    setAvailableSlots(
                      [],
                    );

                    setLoading(false);

                    window.alert(
                      "Tu reserva fue cancelada correctamente.",
                    );

                  }}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-3 border border-red-900/50 bg-red-950/20 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-red-300 transition-all hover:border-red-500/60 hover:bg-red-950/35 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {loading
                    ? "Cancelando..."
                    : "Cancelar reserva"}

                </button>

              </div>

              {/* MODIFICAR */}

              {editingReservation && (
                <div className="mt-6 border border-[#b08a5a]/20 bg-[#181715] p-6 md:p-8">

                  <p className="text-[9px] uppercase tracking-[0.28em] text-[#9b8465]">
                    Modificar reserva
                  </p>

                  <h3 className="mt-2 font-serif text-2xl text-[#F4EEE5] md:text-3xl">
                    Elegí un nuevo horario
                  </h3>

                  <p className="mt-2 max-w-xl text-xs leading-6 text-[#777169]">
                    Seleccioná primero el día y
                    después uno de los horarios
                    disponibles para tu servicio.
                  </p>

                  {/* CALENDARIO */}

                  <div className="mt-8 border border-white/10 bg-[#141412]">

                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-5 md:px-7">

                      <button
                        type="button"
                        onClick={() => {
                          setCurrentMonth(
                            (current) =>
                              new Date(
                                current.getFullYear(),
                                current.getMonth() - 1,
                                1,
                              ),
                          );
                        }}
                        className="flex h-9 w-9 items-center justify-center border border-white/10 text-[#aaa198] transition-all hover:border-[#b08a5a]/50 hover:text-[#b08a5a]"
                        aria-label="Mes anterior"
                      >
                        <ArrowLeft size={14} />
                      </button>

                      <div className="text-center">

                        <p className="text-[9px] uppercase tracking-[0.28em] text-[#625e58]">
                          Seleccioná una fecha
                        </p>

                        <p className="mt-1 font-serif text-xl capitalize text-[#F4EEE5]">
                          {formatMonthTitle(
                            currentMonth,
                          )}
                        </p>

                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setCurrentMonth(
                            (current) =>
                              new Date(
                                current.getFullYear(),
                                current.getMonth() + 1,
                                1,
                              ),
                          );
                        }}
                        className="flex h-9 w-9 items-center justify-center border border-white/10 text-[#aaa198] transition-all hover:border-[#b08a5a]/50 hover:text-[#b08a5a]"
                        aria-label="Mes siguiente"
                      >
                        <ArrowRight size={14} />
                      </button>

                    </div>

                    <div className="grid grid-cols-7 border-b border-white/10">

                      {[
                        "D",
                        "L",
                        "M",
                        "M",
                        "J",
                        "V",
                        "S",
                      ].map(
                        (
                          day,
                          index,
                        ) => (
                          <div
                            key={`${day}-${index}`}
                            className="py-3 text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-[#625e58]"
                          >
                            {day}
                          </div>
                        ),
                      )}

                    </div>

                    <div className="grid grid-cols-7 gap-px bg-white/10">

                      {getCalendarDays(
                        currentMonth,
                      ).map(
                        (date) => {

                          const dateKey =
                            formatDateKey(
                              date,
                            );

                          const currentMonthIndex =
                            currentMonth.getMonth();

                          const isCurrentMonth =
                            date.getMonth() ===
                              currentMonthIndex &&
                            date.getFullYear() ===
                              currentMonth.getFullYear();

                          const isToday =
                            dateKey ===
                            getTodayDateKey();

                          const isSelected =
                            selectedDate ===
                            dateKey;

                          const isAvailable =
                            isDateAvailable(
                              date,
                            );

                          return (
                            <button
                              key={dateKey}
                              type="button"
                              disabled={
                                !isCurrentMonth ||
                                !isAvailable
                              }
                              onClick={() => {

                                if (
                                  !isAvailable
                                )
                                  return;

                                setSelectedDate(
                                  dateKey,
                                );

                                setNewStartAt(
                                  "",
                                );

                                fetchAvailableSlots(
                                  dateKey,
                                );

                              }}
                              className={[
                                "relative min-h-[58px] bg-[#141412] px-2 py-3 text-center transition-all",
                                !isCurrentMonth
                                  ? "text-[#292825]"
                                  : "",
                                isCurrentMonth &&
                                !isAvailable
                                  ? "cursor-not-allowed text-[#393632]"
                                  : "",
                                isAvailable
                                  ? "cursor-pointer hover:bg-[#1d1c19]"
                                  : "",
                                isSelected
                                  ? "bg-[#b08a5a]/15 text-[#b08a5a] ring-1 ring-inset ring-[#b08a5a]/50"
                                  : "",
                              ].join(
                                " ",
                              )}
                            >

                              <span
                                className={[
                                  "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm",
                                  isToday
                                    ? "border border-[#b08a5a]/50"
                                    : "",
                                  isSelected
                                    ? "bg-[#b08a5a] font-semibold text-[#171512]"
                                    : "",
                                ].join(
                                  " ",
                                )}
                              >
                                {date.getDate()}
                              </span>

                              {isToday &&
                                !isSelected && (
                                  <span className="absolute bottom-2 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#b08a5a]" />
                                )}

                            </button>
                          );
                        },
                      )}

                    </div>

                  </div>

                  {/* HORARIOS */}

                  {selectedDate && (
                    <div className="mt-7">

                      <div className="flex items-center justify-between">

                        <div>

                          <p className="text-[9px] uppercase tracking-[0.28em] text-[#625e58]">
                            Horarios disponibles
                          </p>

                          <p className="mt-1 font-serif text-xl capitalize text-[#F4EEE5]">
                            {new Intl.DateTimeFormat(
                              "es-AR",
                              {
                                weekday:
                                  "long",
                                day: "numeric",
                                month: "long",
                              },
                            ).format(
                              getDateFromKey(
                                selectedDate,
                              ),
                            )}
                          </p>

                        </div>

                        {loadingSlots && (
                          <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-[#777169]">

                            <span className="h-3 w-3 animate-spin rounded-full border border-[#777169]/30 border-t-[#b08a5a]" />

                            Cargando

                          </span>
                        )}

                      </div>

                      {!loadingSlots &&
                        availableSlots.length ===
                          0 && (
                          <div className="mt-5 border border-white/10 bg-[#141412] p-6 text-center">

                            <Clock3
                              size={18}
                              className="mx-auto text-[#625e58]"
                            />

                            <p className="mt-3 text-xs text-[#777169]">
                              No hay horarios
                              disponibles para
                              este día.
                            </p>

                          </div>
                        )}

                      {!loadingSlots &&
                        availableSlots.length >
                          0 && (
                          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">

                            {availableSlots.map(
                              (slot) => {

                                const isSelectedSlot =
                                  newStartAt ===
                                  slot.slot_start;

                                return (
                                  <button
                                    key={
                                      slot.slot_start
                                    }
                                    type="button"
                                    onClick={() =>
                                      setNewStartAt(
                                        slot.slot_start,
                                      )
                                    }
                                    className={[
                                      "border px-4 py-4 text-center text-sm font-medium transition-all",
                                      isSelectedSlot
                                        ? "border-[#b08a5a] bg-[#b08a5a] text-[#171512]"
                                        : "border-white/10 bg-[#141412] text-[#ddd6cc] hover:border-[#b08a5a]/60 hover:bg-[#1d1c19] hover:text-[#b08a5a]",
                                    ].join(
                                      " ",
                                    )}
                                  >
                                    {formatSlotTime(
                                      slot.slot_start,
                                    )}
                                  </button>
                                );
                              },
                            )}

                          </div>
                        )}

                    </div>
                  )}

                  {/* RESUMEN NUEVO HORARIO */}

                  {newStartAt && (
                    <div className="mt-7 border border-[#b08a5a]/20 bg-[#141412] p-5">

                      <div className="flex items-start gap-4">

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-[#b08a5a]/30 bg-[#b08a5a]/10 text-[#b08a5a]">
                          <Clock3
                            size={17}
                          />
                        </div>

                        <div>

                          <p className="text-[9px] uppercase tracking-[0.25em] text-[#625e58]">
                            Nuevo horario
                          </p>

                          <p className="mt-1 font-serif text-xl text-[#F4EEE5]">
                            {formatArgentinaDate(
                              newStartAt,
                            )}
                          </p>

                          <p className="mt-1 text-sm text-[#b08a5a]">

                            {formatSlotTime(
                              newStartAt,
                            )}

                            {" · "}

                            {
                              reservation.service_name
                            }

                          </p>

                        </div>

                      </div>

                    </div>
                  )}

                  {/* BOTONES */}

                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">

                    <button
                      type="button"
                      onClick={() => {

                        setEditingReservation(
                          false,
                        );

                        setSelectedDate(
                          "",
                        );

                        setNewStartAt(
                          "",
                        );

                        setAvailableSlots(
                          [],
                        );

                        setError(null);

                      }}
                      disabled={loading}
                      className="flex-1 border border-white/10 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#aaa198] transition-all hover:border-white/20 hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      disabled={
                        !newStartAt ||
                        loading
                      }
                      onClick={
                        confirmReschedule
                      }
                      className="flex-1 bg-[#b08a5a] px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#171512] transition-all hover:bg-[#c09a6c] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading
                        ? "Guardando..."
                        : "Confirmar cambio"}
                    </button>

                  </div>

                </div>
              )}

              {!editingReservation && (
                <p className="mt-5 text-center text-[10px] leading-6 text-[#625e58]">
                  Podés modificar el día y horario
                  de tu reserva.
                </p>
              )}

            </div>

          </motion.section>
        )}

      </section>

    </main>
  );
}

function ReservationItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="border border-white/10 bg-[#141412] p-5">

      <p className="text-[9px] uppercase tracking-[0.28em] text-[#777169]">
        {label}
      </p>

      <p
        className={`mt-2 ${
          highlight
            ? "font-serif text-2xl text-[#b08a5a]"
            : "text-sm leading-6 text-[#ddd6cc]"
        }`}
      >
        {value}
      </p>

    </div>
  );
}

function InfoItem({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-4">

      <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/10 bg-[#181715] text-[#b08a5a]">
        {icon}
      </div>

      <div>

        <p className="text-xs font-medium text-[#ddd6cc]">
          {title}
        </p>

        <p className="mt-1 text-[11px] leading-5 text-[#625e58]">
          {text}
        </p>

      </div>

    </div>
  );
}