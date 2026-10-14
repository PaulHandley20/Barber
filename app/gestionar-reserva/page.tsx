"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  KeyRound,
  Mail,
  MapPin,
  MessageCircle,
  Search,
  UserRound,
  XCircle,
} from "lucide-react";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import {
  BOOKING_BG,
  BookingHero,
  BookingTicket,
  BookingTopBar,
  TimeSlotGroups,
  bookingCardClass,
  bookingDangerButtonClass,
  bookingInputClass,
  bookingLabelClass,
  bookingPrimaryButtonClass,
  bookingSecondaryButtonClass,
  type TicketTone,
} from "@/components/booking/kit";
import { createClient } from "@/lib/supabase/client";
import { BARBERSHOP, getWhatsappUrl } from "@/lib/barbershop";
import {
  isBlockedDate,
  isOpenOnDay,
  usePublicBookingConfig,
} from "@/lib/public-config";

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

type ReservationMatch = {
  reservation_code: string;
  service_name: string | null;
  start_at: string;
  status: string;
};

type AvailableSlot = {
  slot_start: string;
  slot_end: string;
};

type SearchMode = "code" | "contact";

const TIME_ZONE = "America/Argentina/Buenos_Aires";

const primaryButtonClass = `${bookingPrimaryButtonClass} w-full`;

const inputClass = bookingInputClass;

function formatReservationCode(value: string) {
  return value.toUpperCase().replace(/\s/g, "");
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getDateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function formatMonthTitle(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatArgentinaDate(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Fecha no disponible";

  const label = new Intl.DateTimeFormat("es-AR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatArgentinaTime(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "--:--";

  return new Intl.DateTimeFormat("es-AR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getTicketTone(status: string): TicketTone {
  if (status === "confirmed" || status === "pending") return "confirmed";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  return "neutral";
}

function getStatusLabel(status: string) {
  const statuses: Record<string, string> = {
    confirmed: "Confirmada",
    cancelled: "Cancelada",
    completed: "Completada",
    pending: "Pendiente",
    no_show: "No asistió",
  };

  return statuses[status] || status;
}

/* Mostramos los datos de contacto enmascarados: la reserva puede verla
   cualquiera que tenga el código, así que no exponemos todo. */
function maskEmail(email: string | null | undefined) {
  if (!email) return "—";

  const [user, domain] = email.split("@");

  if (!domain) return email;

  return `${user.slice(0, 2)}${"•".repeat(Math.max(user.length - 2, 3))}@${domain}`;
}

function maskPhone(phone: string | null | undefined) {
  if (!phone) return "—";

  const digits = phone.replace(/\D/g, "");

  return digits.length > 4 ? `•••• ${digits.slice(-4)}` : phone;
}

function getFriendlyError(
  error: { code?: string; message?: string } | null,
  fallback: string
) {
  if (error?.code === "P0001" && error.message) return error.message;

  return fallback;
}

function getCalendarDays(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const startingDay = new Date(year, monthIndex, 1).getDay();

  return Array.from(
    { length: 42 },
    (_, i) => new Date(year, monthIndex, i - startingDay + 1)
  );
}

export default function GestionarReservaPage() {
  const { config } = usePublicBookingConfig();

  const [mode, setMode] = useState<SearchMode>("code");

  const [reservationCode, setReservationCode] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [matches, setMatches] = useState<ReservationMatch[] | null>(null);

  const [reservation, setReservation] = useState<Reservation | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [editingReservation, setEditingReservation] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const [newStartAt, setNewStartAt] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const todayKey = getTodayDateKey();

  const lastBookableKey = useMemo(() => {
    const date = getDateFromKey(todayKey);

    date.setDate(date.getDate() + config.maxBookingDaysAhead);

    return formatDateKey(date);
  }, [todayKey, config.maxBookingDaysAhead]);

  const reservationIsActive =
    reservation !== null &&
    ["confirmed", "pending"].includes(reservation.status) &&
    new Date(reservation.start_at).getTime() > Date.now();

  const hoursUntilReservation = reservation
    ? (new Date(reservation.start_at).getTime() - Date.now()) / 36e5
    : 0;

  /* Cancelar: en cualquier momento antes del turno.
     Cambiar día u horario: hasta X horas antes (Configuración). */
  const withinNoticeWindow =
    reservationIsActive &&
    hoursUntilReservation < config.cancellationNoticeHours;

  const canReschedule = reservationIsActive && !withinNoticeWindow;
  const canCancel = reservationIsActive;

  /* Permite llegar con /gestionar-reserva?codigo=DS-XXXX */
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("codigo");

    if (code) loadReservationByCode(code);
    // Solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetManagement() {
    setEditingReservation(false);
    setConfirmingCancel(false);
    setAvailableSlots([]);
    setSelectedDate("");
    setNewStartAt("");
  }

  function scrollToResult() {
    window.setTimeout(() => {
      document
        .getElementById("reservation-result")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }

  async function loadReservationByCode(rawCode: string) {
    const code = formatReservationCode(rawCode);

    if (!code) {
      setError("Ingresá tu código de reserva.");
      return;
    }

    setReservationCode(code);
    setLoading(true);
    setError(null);
    setNotice(null);
    setReservation(null);
    resetManagement();

    const supabase = createClient();

    const { data, error } = await supabase.rpc("get_reservation_by_code", {
      p_reservation_code: code,
    });

    setLoading(false);

    if (error) {
      console.error("Error buscando reserva:", error);
      setError(
        getFriendlyError(
          error,
          "No pudimos buscar la reserva en este momento. Intentá de nuevo en unos minutos."
        )
      );
      return;
    }

    const reservationData = Array.isArray(data) ? data[0] : data;

    if (!reservationData) {
      setError(
        "No encontramos ninguna reserva con ese código. Revisá que esté bien escrito (por ejemplo DS-AB12CD34)."
      );
      return;
    }

    setReservation(reservationData);
    setReservationCode(reservationData.reservation_code);
    scrollToResult();
  }

  async function searchByContact() {
    const email = contactEmail.trim().toLowerCase();
    const phoneDigits = contactPhone.replace(/\D/g, "");

    if (!email.includes("@") || phoneDigits.length < 8) {
      setError("Ingresá el email y el teléfono con los que hiciste la reserva.");
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);
    setMatches(null);
    setReservation(null);
    resetManagement();

    const supabase = createClient();

    const { data, error } = await supabase.rpc("find_reservations_by_contact", {
      p_email: email,
      p_phone: contactPhone,
    });

    setLoading(false);

    if (error) {
      console.error("Error buscando reservas por contacto:", error);
      setError(
        "La búsqueda sin código no está disponible en este momento. Usá tu código de reserva o escribinos."
      );
      return;
    }

    const list = (data ?? []) as ReservationMatch[];

    if (list.length === 0) {
      setError(
        "No encontramos turnos próximos con ese email y teléfono. Revisá los datos o escribinos y te ayudamos."
      );
      return;
    }

    if (list.length === 1) {
      loadReservationByCode(list[0].reservation_code);
      return;
    }

    setMatches(list);
  }

  async function fetchAvailableSlots(date: string) {
    if (!reservation?.service_id) return;

    setLoadingSlots(true);
    setError(null);

    const supabase = createClient();

    const { data, error } = await supabase.rpc("get_available_slots", {
      p_date: date,
      p_service_id: reservation.service_id,
    });

    setLoadingSlots(false);

    if (error) {
      console.error("Error obteniendo horarios:", error);
      setError("No pudimos cargar los horarios disponibles.");
      setAvailableSlots([]);
      return;
    }

    setAvailableSlots((data || []) as AvailableSlot[]);
  }

  function isDateAvailable(date: Date) {
    const dateKey = formatDateKey(date);

    return (
      dateKey >= todayKey &&
      dateKey <= lastBookableKey &&
      isOpenOnDay(config, date.getDay()) &&
      !isBlockedDate(config, dateKey)
    );
  }

  function openEditReservation() {
    if (!reservation) return;

    const reservationDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(reservation.start_at));

    setConfirmingCancel(false);
    setEditingReservation(true);
    setSelectedDate(reservationDate);
    setNewStartAt("");
    setError(null);
    setNotice(null);
    setCurrentMonth(getDateFromKey(reservationDate));

    fetchAvailableSlots(reservationDate);
  }

  async function confirmReschedule() {
    if (!reservation || !newStartAt) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data, error } = await supabase.rpc("reschedule_reservation", {
      p_reservation_code: reservation.reservation_code,
      p_new_start_at: newStartAt,
    });

    setLoading(false);

    if (error) {
      console.error("Error reprogramando reserva:", error);
      setError(
        getFriendlyError(
          error,
          "No pudimos modificar tu reserva. Es posible que ese horario ya no esté disponible: elegí otro."
        )
      );

      if (selectedDate) fetchAvailableSlots(selectedDate);

      return;
    }

    const updatedReservation = Array.isArray(data) ? data[0] : data;

    if (!updatedReservation) {
      setError("No pudimos actualizar tu reserva.");
      return;
    }

    setReservation((current) =>
      current
        ? {
            ...current,
            start_at: updatedReservation.start_at ?? newStartAt,
            end_at: updatedReservation.end_at ?? current.end_at,
          }
        : current
    );

    resetManagement();
    setNotice(
      `Listo. Tu turno quedó para el ${formatArgentinaDate(
        updatedReservation.start_at ?? newStartAt
      ).toLowerCase()} a las ${formatArgentinaTime(
        updatedReservation.start_at ?? newStartAt
      )} hs.`
    );
  }

  async function cancelReservation() {
    if (!reservation) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { error } = await supabase.rpc("cancel_reservation", {
      p_reservation_code: reservation.reservation_code,
    });

    setLoading(false);

    if (error) {
      console.error("Error cancelando reserva:", error);
      setError(
        getFriendlyError(
          error,
          "No pudimos cancelar tu reserva. Intentá de nuevo o escribinos."
        )
      );
      return;
    }

    setReservation((current) =>
      current ? { ...current, status: "cancelled" } : current
    );
    resetManagement();
    setNotice(
      "Tu reserva fue cancelada. ¡Gracias por avisar! Cuando quieras, podés sacar un nuevo turno."
    );
  }

  return (
    <main className="min-h-screen bg-[#100f0d] text-[#F4EEE5]">
      <BookingTopBar current="mi-reserva" />

      <BookingHero
        image="/images/cta.jpg"
        eyebrow={`${BARBERSHOP.name} · Mi reserva`}
        title="Tu turno, a mano."
        subtitle="Consultá tu reserva, cambiá el día u horario o cancelala si no podés venir."
      />

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          {/* BUSCADOR */}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`${bookingCardClass} overflow-hidden`}
          >
            <div className="flex items-center gap-4 border-b border-[#EADFCB]/[0.07] px-5 py-5 md:px-7 md:py-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EADFCB] text-[#1b1915]">
                <Search size={17} />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#a88d68]">
                  Buscar reserva
                </p>
                <h2 className="mt-1 font-serif text-[26px] leading-tight md:text-[30px]">
                  Encontrá tu turno
                </h2>
              </div>
            </div>

            <div className="p-5 md:p-7">
              {/* Modo de búsqueda */}
              <div
                role="tablist"
                aria-label="Forma de búsqueda"
                className="grid grid-cols-2 gap-1 rounded-full border border-[#EADFCB]/[0.1] bg-[#0f0e0c] p-1"
              >
                <ModeTab
                  active={mode === "code"}
                  onClick={() => {
                    setMode("code");
                    setError(null);
                  }}
                  icon={<KeyRound size={14} />}
                  label="Tengo el código"
                />
                <ModeTab
                  active={mode === "contact"}
                  onClick={() => {
                    setMode("contact");
                    setError(null);
                  }}
                  icon={<UserRound size={14} />}
                  label="No tengo el código"
                />
              </div>

              {mode === "code" ? (
                <form
                  className="mt-6"
                  onSubmit={(event) => {
                    event.preventDefault();
                    loadReservationByCode(reservationCode);
                  }}
                >
                  <p className="text-[15px] leading-7 text-[#b5ada1]">
                    Ingresá el código que te mostramos al confirmar el turno.
                  </p>

                  <label htmlFor="reservation-code" className={`${bookingLabelClass} mt-5`}>
                    Código de reserva
                  </label>

                  <input
                    id="reservation-code"
                    type="text"
                    value={reservationCode}
                    onChange={(e) => {
                      setReservationCode(formatReservationCode(e.target.value));
                      setError(null);
                    }}
                    placeholder="DS-XXXXXXXX"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className={`${inputClass} font-mono tracking-[0.14em]`}
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className={`${primaryButtonClass} mt-5`}
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border border-[#1b1915]/30 border-t-[#1b1915]" />
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
                </form>
              ) : (
                <form
                  className="mt-6"
                  onSubmit={(event) => {
                    event.preventDefault();
                    searchByContact();
                  }}
                >
                  <p className="text-[15px] leading-7 text-[#b5ada1]">
                    Ingresá el email y el teléfono que usaste al reservar.
                    Por seguridad, tienen que coincidir los dos.
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="contact-email" className={bookingLabelClass}>
                        Email
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={contactEmail}
                        onChange={(e) => {
                          setContactEmail(e.target.value);
                          setError(null);
                        }}
                        placeholder="juan@email.com"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-phone" className={bookingLabelClass}>
                        Teléfono
                      </label>
                      <input
                        id="contact-phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={contactPhone}
                        onChange={(e) => {
                          setContactPhone(e.target.value);
                          setError(null);
                        }}
                        placeholder="3442 123456"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className={`${primaryButtonClass} mt-5`}
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border border-[#1b1915]/30 border-t-[#1b1915]" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        Buscar mis turnos
                        <ArrowRight
                          size={15}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </>
                    )}
                  </button>
                </form>
              )}

              {error && !reservation && (
                <div
                  role="alert"
                  className="mt-6 rounded-[16px] border border-red-400/25 bg-red-500/[0.07] p-4"
                >
                  <p className="text-[14px] leading-6 text-red-200">{error}</p>
                </div>
              )}

              {/* Varios turnos encontrados */}
              {matches && matches.length > 1 && !reservation && (
                <div className="mt-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#a88d68]">
                    Encontramos {matches.length} turnos
                  </p>

                  <ul className="mt-3 space-y-2">
                    {matches.map((match) => (
                      <li key={match.reservation_code}>
                        <button
                          type="button"
                          onClick={() =>
                            loadReservationByCode(match.reservation_code)
                          }
                          className="flex w-full items-center justify-between gap-4 rounded-[16px] border border-[#EADFCB]/[0.1] bg-[#0f0e0c] p-4 text-left transition hover:border-[#b08a5a]/70"
                        >
                          <span>
                            <span className="block text-[15px] text-[#F4EEE5] first-letter:uppercase">
                              {formatArgentinaDate(match.start_at)} ·{" "}
                              {formatArgentinaTime(match.start_at)} hs
                            </span>
                            <span className="mt-1 block text-[13px] text-[#8d877e]">
                              {match.service_name ?? "Servicio"} ·{" "}
                              {getStatusLabel(match.status)}
                            </span>
                          </span>
                          <ArrowRight size={15} className="shrink-0 text-[#e3c591]" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>

          {/* AYUDA / CONTACTO */}

          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`${bookingCardClass} h-fit p-6 md:p-7 ${
              reservation ? "hidden lg:block" : ""
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#a88d68]">
              ¿No encontrás tu turno?
            </p>

            <h2 className="mt-2 font-serif text-[28px] leading-tight">Escribinos.</h2>

            <p className="mt-2 text-[14px] leading-6 text-[#8d877e]">
              Te ayudamos a encontrarlo, cambiarlo o cancelarlo.
            </p>

            <ContactLinks />
          </motion.aside>
        </div>

        {/* RESULTADO */}

        <AnimatePresence>
          {reservation && (
            <motion.section
              id="reservation-result"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-8 scroll-mt-24"
            >
              {notice && (
                <div
                  role="status"
                  className="mb-5 flex items-start gap-3 rounded-[18px] border border-[#EADFCB]/20 bg-[#EADFCB]/[0.05] p-4 text-[14px] leading-6 text-[#ddd6cc]"
                >
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[#e3c591]" />
                  {notice}
                </div>
              )}

              <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
                <BookingTicket
                  tone={getTicketTone(reservation.status)}
                  statusLabel={getStatusLabel(reservation.status)}
                  startAt={reservation.start_at}
                  endAt={reservation.end_at}
                  serviceName={reservation.service_name}
                  durationMinutes={reservation.service_duration_minutes}
                  price={reservation.service_price}
                  barber={reservation.barber_name || BARBERSHOP.barber}
                  code={reservation.reservation_code}
                  notchColor={BOOKING_BG}
                  footer={
                    reservation.customer_name ? (
                      <div className="grid gap-2 text-[13px] text-[#a39a8e] sm:grid-cols-3">
                        <span className="truncate">
                          <span className="text-[#7d756a]">Cliente · </span>
                          {reservation.customer_name}
                        </span>
                        <span className="truncate">
                          <span className="text-[#7d756a]">Tel · </span>
                          {maskPhone(reservation.customer_phone)}
                        </span>
                        <span className="truncate">
                          <span className="text-[#7d756a]">Email · </span>
                          {maskEmail(reservation.customer_email)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3 text-[13px] leading-6 text-[#a39a8e]">
                        <MapPin size={16} className="mt-0.5 shrink-0 text-[#c9a46e]" />
                        <p>
                          <span className="text-[#F4EEE5]">
                            {BARBERSHOP.address}, {BARBERSHOP.city}.
                          </span>{" "}
                          <a
                            href={BARBERSHOP.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#e3c591] underline-offset-4 hover:underline"
                          >
                            Cómo llegar
                          </a>
                        </p>
                      </div>
                    )
                  }
                />

                {/* ACCIONES */}

                <div className={`${bookingCardClass} h-fit p-6 md:p-7`}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#a88d68]">
                    Gestionar
                  </p>
                  <h2 className="mt-2 font-serif text-[26px] leading-tight">
                    {reservationIsActive ? "¿Necesitás un cambio?" : "Reserva cerrada"}
                  </h2>

                  {!reservationIsActive ? (
                    <div className="mt-4">
                      <p className="text-[14px] leading-6 text-[#8d877e]">
                        {reservation.status === "cancelled"
                          ? "Esta reserva está cancelada."
                          : "Esta reserva ya no se puede modificar."}
                      </p>
                      <Link
                        href="/reservar"
                        className={`${bookingPrimaryButtonClass} mt-5 w-full`}
                      >
                        Reservar un nuevo turno
                        <ArrowRight size={15} />
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="mt-5 grid gap-3">
                        <button
                          type="button"
                          onClick={openEditReservation}
                          disabled={loading || !canReschedule}
                          title={
                            canReschedule
                              ? undefined
                              : `Solo se puede cambiar hasta ${config.cancellationNoticeHours} h antes`
                          }
                          className={bookingSecondaryButtonClass}
                        >
                          <CalendarDays size={15} />
                          Cambiar día u horario
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingReservation(false);
                            setConfirmingCancel(true);
                            setNotice(null);
                          }}
                          disabled={loading || !canCancel}
                          className={bookingDangerButtonClass}
                        >
                          <XCircle size={15} />
                          Cancelar reserva
                        </button>
                      </div>

                      {confirmingCancel && (
                        <div className="mt-5 rounded-[18px] border border-red-400/25 bg-red-500/[0.06] p-5">
                          <p className="font-serif text-[20px] text-[#F4EEE5]">
                            ¿Seguro que querés cancelar?
                          </p>
                          <p className="mt-2 text-[14px] leading-6 text-[#b5ada1]">
                            El horario va a quedar libre para otra persona.
                            Esta acción no se puede deshacer.
                          </p>
                          <div className="mt-5 grid gap-2">
                            <button
                              type="button"
                              onClick={cancelReservation}
                              disabled={loading}
                              className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-red-500/80 px-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-red-500 disabled:opacity-60"
                            >
                              {loading ? "Cancelando..." : "Sí, cancelar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingCancel(false)}
                              disabled={loading}
                              className={bookingSecondaryButtonClass}
                            >
                              No, mantener turno
                            </button>
                          </div>
                        </div>
                      )}

                      {!editingReservation && !confirmingCancel && (
                        withinNoticeWindow ? (
                          <div className="mt-5 border-t border-[#EADFCB]/[0.08] pt-5">
                            <p className="text-[13px] leading-6 text-[#8d877e]">
                              Faltan menos de {config.cancellationNoticeHours}{" "}
                              {config.cancellationNoticeHours === 1 ? "hora" : "horas"} para
                              tu turno: ya no se puede cambiar el horario online,
                              pero todavía podés cancelarlo. Si necesitás
                              cambiarlo, escribinos.
                            </p>
                            <ContactLinks />
                          </div>
                        ) : (
                          <p className="mt-5 border-t border-[#EADFCB]/[0.08] pt-5 text-[13px] leading-6 text-[#7d756a]">
                            Podés cancelar en cualquier momento antes del turno
                            y cambiar el día u horario hasta{" "}
                            {config.cancellationNoticeHours}{" "}
                            {config.cancellationNoticeHours === 1 ? "hora" : "horas"} antes.
                          </p>
                        )
                      )}
                    </>
                  )}

                  {error && reservation && (
                    <div
                      role="alert"
                      className="mt-5 rounded-[16px] border border-red-400/25 bg-red-500/[0.07] p-4"
                    >
                      <p className="text-[14px] text-red-200">{error}</p>
                    </div>
                  )}
                </div>
              </div>

              {reservationIsActive && editingReservation && (
                <RescheduleCalendar
                  currentMonth={currentMonth}
                  setCurrentMonth={setCurrentMonth}
                  todayKey={todayKey}
                  lastBookableKey={lastBookableKey}
                  selectedDate={selectedDate}
                  isDateAvailable={isDateAvailable}
                  onSelectDate={(dateKey) => {
                    setSelectedDate(dateKey);
                    setNewStartAt("");
                    fetchAvailableSlots(dateKey);
                  }}
                  loadingSlots={loadingSlots}
                  availableSlots={availableSlots}
                  newStartAt={newStartAt}
                  onSelectSlot={setNewStartAt}
                  serviceName={reservation.service_name}
                  loading={loading}
                  onCancel={() => {
                    resetManagement();
                    setError(null);
                  }}
                  onConfirm={confirmReschedule}
                />
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}

function RescheduleCalendar({
  currentMonth,
  setCurrentMonth,
  todayKey,
  lastBookableKey,
  selectedDate,
  isDateAvailable,
  onSelectDate,
  loadingSlots,
  availableSlots,
  newStartAt,
  onSelectSlot,
  serviceName,
  loading,
  onCancel,
  onConfirm,
}: {
  currentMonth: Date;
  setCurrentMonth: (updater: (current: Date) => Date) => void;
  todayKey: string;
  lastBookableKey: string;
  selectedDate: string;
  isDateAvailable: (date: Date) => boolean;
  onSelectDate: (dateKey: string) => void;
  loadingSlots: boolean;
  availableSlots: AvailableSlot[];
  newStartAt: string;
  onSelectSlot: (slot: string) => void;
  serviceName: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const firstMonth = getDateFromKey(todayKey);
  const lastMonth = getDateFromKey(lastBookableKey);

  const canGoBack =
    currentMonth.getFullYear() * 12 + currentMonth.getMonth() >
    firstMonth.getFullYear() * 12 + firstMonth.getMonth();

  const canGoForward =
    currentMonth.getFullYear() * 12 + currentMonth.getMonth() <
    lastMonth.getFullYear() * 12 + lastMonth.getMonth();

  return (
    <div className={`${bookingCardClass} mt-6 p-5 md:p-7`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#a88d68]">
        Cambiar turno
      </p>

      <h3 className="mt-2 font-serif text-[26px] text-[#F4EEE5] md:text-[30px]">
        Elegí un nuevo horario
      </h3>

      <p className="mt-2 max-w-xl text-[14px] leading-6 text-[#8d877e]">
        Primero el día y después uno de los horarios disponibles.
      </p>

      <div className="mx-auto mt-6 max-w-[620px]">
        <div className="flex items-center justify-between pb-4">
          <button
            type="button"
            disabled={!canGoBack}
            onClick={() =>
              setCurrentMonth(
                (current) =>
                  new Date(current.getFullYear(), current.getMonth() - 1, 1)
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EADFCB]/15 text-[#ddd6cc] transition hover:border-[#EADFCB]/50 disabled:opacity-20"
            aria-label="Mes anterior"
          >
            <ArrowLeft size={14} />
          </button>

          <p className="font-serif text-[22px] text-[#F4EEE5] first-letter:uppercase">
            {formatMonthTitle(currentMonth)}
          </p>

          <button
            type="button"
            disabled={!canGoForward}
            onClick={() =>
              setCurrentMonth(
                (current) =>
                  new Date(current.getFullYear(), current.getMonth() + 1, 1)
              )
            }
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#EADFCB]/15 text-[#ddd6cc] transition hover:border-[#EADFCB]/50 disabled:opacity-20"
            aria-label="Mes siguiente"
          >
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-7">
          {["D", "L", "M", "X", "J", "V", "S"].map((day) => (
            <div
              key={day}
              className="pb-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d756a]"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {getCalendarDays(currentMonth)
            // Sin semanas que sean enteras del mes siguiente.
            .filter((_, index, all) =>
              all
                .slice(index - (index % 7), index - (index % 7) + 7)
                .some((day) => day.getMonth() === currentMonth.getMonth())
            )
            .map((date) => {
            const dateKey = formatDateKey(date);
            const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
            const isToday = dateKey === todayKey;
            const isSelected = selectedDate === dateKey;
            const isAvailable = isCurrentMonth && isDateAvailable(date);

            return (
              <button
                key={dateKey}
                type="button"
                disabled={!isAvailable}
                onClick={() => onSelectDate(dateKey)}
                aria-pressed={isSelected}
                className={[
                  "relative mx-auto flex aspect-square w-full max-w-[64px] items-center justify-center rounded-full text-[15px] tabular-nums transition",
                  !isCurrentMonth ? "invisible" : "",
                  isSelected
                    ? "bg-[#EADFCB] font-semibold text-[#1b1915]"
                    : isAvailable
                      ? "border border-[#EADFCB]/[0.1] text-[#ddd6cc] hover:border-[#b08a5a]"
                      : "text-[#3d3a35]",
                ].join(" ")}
              >
                {date.getDate()}
                {isToday && !isSelected && (
                  <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#c9a46e]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="font-serif text-[20px] text-[#F4EEE5] first-letter:uppercase">
              {new Intl.DateTimeFormat("es-AR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              }).format(getDateFromKey(selectedDate))}
            </p>

            {loadingSlots && (
              <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-[#777169]">
                <span className="h-3 w-3 animate-spin rounded-full border border-[#777169]/30 border-t-[#b08a5a]" />
                Cargando
              </span>
            )}
          </div>

          {!loadingSlots && availableSlots.length === 0 && (
            <div className="mt-4 rounded-[16px] border border-[#EADFCB]/[0.08] bg-[#0f0e0c] p-6 text-center">
              <Clock3 size={18} className="mx-auto text-[#625e58]" />
              <p className="mt-3 text-xs text-[#777169]">
                No hay horarios disponibles para este día.
              </p>
            </div>
          )}

          {!loadingSlots && availableSlots.length > 0 && (
            <div className="mt-4">
              <TimeSlotGroups
                slots={availableSlots}
                isSelected={(slot) => newStartAt === slot.slot_start}
                onSelect={(slot) => onSelectSlot(slot.slot_start)}
                formatTime={formatArgentinaTime}
              />
            </div>
          )}
        </div>
      )}

      {newStartAt && (
        <div className="mt-6 rounded-[18px] border border-[#EADFCB]/20 bg-[#EADFCB]/[0.04] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#a88d68]">
            Nuevo horario
          </p>
          <p className="mt-1 font-serif text-[22px] text-[#F4EEE5] first-letter:uppercase">
            {formatArgentinaDate(newStartAt)}
          </p>
          <p className="mt-1 text-[14px] text-[#e3c591]">
            {formatArgentinaTime(newStartAt)} hs · {serviceName}
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className={`${bookingSecondaryButtonClass} flex-1`}
        >
          Volver
        </button>

        <button
          type="button"
          disabled={!newStartAt || loading}
          onClick={onConfirm}
          className={`${bookingPrimaryButtonClass} flex-1`}
        >
          {loading ? "Guardando..." : "Confirmar cambio"}
        </button>
      </div>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex min-h-[42px] items-center justify-center gap-2 rounded-full px-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition sm:tracking-[0.18em] ${
        active
          ? "bg-[#EADFCB] text-[#1b1915]"
          : "text-[#8d877e] hover:text-[#ddd6cc]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function ContactLinks() {
  const whatsappUrl = getWhatsappUrl(
    "Hola! Necesito ayuda con mi reserva."
  );

  const items = [
    whatsappUrl && {
      href: whatsappUrl,
      icon: <MessageCircle size={16} />,
      title: "WhatsApp",
      text: "Respuesta más rápida",
      external: true,
    },
    {
      href: BARBERSHOP.instagramUrl,
      icon: <InstagramIcon size={16} />,
      title: "Instagram",
      text: `@${BARBERSHOP.instagramHandle}`,
      external: true,
    },
    {
      href: `mailto:${BARBERSHOP.email}`,
      icon: <Mail size={16} />,
      title: "Email",
      text: BARBERSHOP.email,
      external: false,
    },
    {
      href: BARBERSHOP.mapsUrl,
      icon: <MapPin size={16} />,
      title: "Dirección",
      text: `${BARBERSHOP.address}, ${BARBERSHOP.city}`,
      external: true,
    },
  ].filter(Boolean) as {
    href: string;
    icon: ReactNode;
    title: string;
    text: string;
    external: boolean;
  }[];

  return (
    <ul className="mt-6 space-y-2">
      {items.map((item) => (
        <li key={item.title}>
          <a
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
            className="flex items-center gap-4 rounded-[16px] border border-[#EADFCB]/[0.08] bg-[#0f0e0c] p-3 transition hover:border-[#b08a5a]/60"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#EADFCB]/[0.12] text-[#e3c591]">
              {item.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-medium text-[#F4EEE5]">
                {item.title}
              </span>
              <span className="mt-0.5 block truncate text-[12px] text-[#8d877e]">
                {item.text}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
