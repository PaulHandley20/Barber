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

const primaryButtonClass =
  "group flex w-full items-center justify-center gap-3 bg-[#b08a5a] px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#171512] transition-all duration-300 hover:bg-[#c09a6c] hover:shadow-[0_15px_45px_rgba(176,138,90,.15)] active:scale-[0.99] disabled:opacity-60";

const inputClass =
  "w-full border border-white/10 bg-[#141412] px-5 py-4 text-sm text-[#F4EEE5] outline-none transition-all duration-300 placeholder:text-[#514d47] hover:border-white/20 focus:border-[#b08a5a] focus:bg-[#181715] focus:ring-1 focus:ring-[#b08a5a]/20";

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

  const withinNoticeWindow =
    reservationIsActive &&
    hoursUntilReservation < config.cancellationNoticeHours;

  const canManage = reservationIsActive && !withinNoticeWindow;

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
    <main className="min-h-screen bg-[#11110f] text-[#F4EEE5]">
      {/* HEADER */}

      <section className="relative overflow-hidden border-b border-white/10 px-5 py-10 md:px-10 md:py-20">
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#b08a5a]/[0.04] blur-3xl" />

        <div className="relative mx-auto max-w-5xl">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#777169] transition-all duration-300 hover:text-[#b08a5a]"
          >
            <ArrowLeft size={14} />
            Volver al inicio
          </Link>

          <div className="mb-7 h-px w-20 bg-[#b08a5a]" />

          <p className="text-xs uppercase tracking-[0.38em] text-[#9b8465]">
            {BARBERSHOP.name} · Reservas
          </p>

          <h1 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">
            Gestioná tu reserva.
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#aaa198] md:text-base">
            Consultá tu turno, cambiá el día u horario o cancelalo si no
            podés venir.
          </p>
        </div>
      </section>

      {/* CONTENIDO */}

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-5 md:px-8 md:py-16">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
          {/* BUSCADOR */}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden border border-[#8a7152]/30 bg-[#181715]"
          >
            <div className="border-b border-white/10 px-5 py-6 md:px-9">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#b08a5a]/40 bg-[#b08a5a]/10 text-[#b08a5a]">
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

            <div className="p-5 md:p-9">
              {/* Modo de búsqueda */}
              <div
                role="tablist"
                aria-label="Forma de búsqueda"
                className="grid grid-cols-2 border border-white/10 bg-[#141412] p-1"
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
                  <p className="text-sm leading-7 text-[#aaa198]">
                    Ingresá el código que te mostramos al confirmar el turno.
                  </p>

                  <label
                    htmlFor="reservation-code"
                    className="mb-2.5 mt-5 block text-[10px] uppercase tracking-[0.25em] text-[#9b8465]"
                  >
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
                    className={`${inputClass} font-mono tracking-[0.12em]`}
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className={`${primaryButtonClass} mt-5`}
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
                </form>
              ) : (
                <form
                  className="mt-6"
                  onSubmit={(event) => {
                    event.preventDefault();
                    searchByContact();
                  }}
                >
                  <p className="text-sm leading-7 text-[#aaa198]">
                    Ingresá el email y el teléfono que usaste al reservar.
                    Por seguridad, tienen que coincidir los dos.
                  </p>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="contact-email"
                        className="mb-2.5 block text-[10px] uppercase tracking-[0.25em] text-[#9b8465]"
                      >
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
                      <label
                        htmlFor="contact-phone"
                        className="mb-2.5 block text-[10px] uppercase tracking-[0.25em] text-[#9b8465]"
                      >
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
                        <span className="h-4 w-4 animate-spin rounded-full border border-[#171512]/30 border-t-[#171512]" />
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

              {error && (
                <div
                  role="alert"
                  className="mt-6 border border-red-900/50 bg-red-950/20 p-4"
                >
                  <p className="text-sm leading-6 text-red-300">{error}</p>
                </div>
              )}

              {/* Varios turnos encontrados */}
              {matches && matches.length > 1 && !reservation && (
                <div className="mt-6">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#9b8465]">
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
                          className="flex w-full items-center justify-between gap-4 border border-white/10 bg-[#141412] p-4 text-left transition-all hover:border-[#b08a5a]/60 hover:bg-[#1d1c19]"
                        >
                          <span>
                            <span className="block text-sm text-[#ddd6cc]">
                              {formatArgentinaDate(match.start_at)} ·{" "}
                              {formatArgentinaTime(match.start_at)} hs
                            </span>
                            <span className="mt-1 block text-xs text-[#777169]">
                              {match.service_name ?? "Servicio"} ·{" "}
                              {getStatusLabel(match.status)}
                            </span>
                          </span>
                          <ArrowRight size={15} className="shrink-0 text-[#b08a5a]" />
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
            className={`h-fit border border-white/5 bg-[#141412] p-6 md:p-8 ${
              reservation ? "hidden lg:block" : ""
            }`}
          >
            <div className="mb-6 h-px w-12 bg-[#b08a5a]" />

            <p className="text-[10px] uppercase tracking-[0.3em] text-[#9b8465]">
              ¿No encontrás tu turno?
            </p>

            <h2 className="mt-2 font-serif text-3xl">Escribinos.</h2>

            <p className="mt-3 text-sm leading-6 text-[#777169]">
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
              className="mt-8 scroll-mt-4 overflow-hidden border border-[#b08a5a]/40 bg-[#181715]"
            >
              <div className="border-b border-white/10 p-6 text-center md:p-10">
                <div
                  className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full border ${
                    reservation.status === "cancelled"
                      ? "border-red-900/60 bg-red-950/30 text-red-300"
                      : "border-[#b08a5a]/50 bg-[#b08a5a]/10 text-[#b08a5a]"
                  }`}
                >
                  {reservation.status === "cancelled" ? (
                    <XCircle size={26} />
                  ) : (
                    <CheckCircle2 size={26} />
                  )}
                </div>

                <p className="mt-5 text-[10px] uppercase tracking-[0.3em] text-[#9b8465]">
                  Reserva {getStatusLabel(reservation.status).toLowerCase()}
                </p>

                <h2 className="mt-3 font-serif text-3xl md:text-4xl">
                  Tu turno en {BARBERSHOP.name}
                </h2>

                <div className="mt-5 inline-flex flex-col items-center border border-white/10 bg-[#141412] px-6 py-3">
                  <span className="text-[9px] uppercase tracking-[0.28em] text-[#625e58]">
                    Código de reserva
                  </span>
                  <span className="mt-1 font-mono text-lg tracking-[0.18em] text-[#b08a5a]">
                    {reservation.reservation_code}
                  </span>
                </div>
              </div>

              {notice && (
                <div
                  role="status"
                  className="border-b border-white/10 bg-[#b08a5a]/[0.06] p-5 text-center text-sm leading-6 text-[#ddd6cc]"
                >
                  {notice}
                </div>
              )}

              <div className="grid gap-px bg-white/10 sm:grid-cols-2">
                <ReservationItem label="Servicio" value={reservation.service_name} />
                <ReservationItem
                  label="Duración"
                  value={`${reservation.service_duration_minutes} minutos`}
                />
                <ReservationItem
                  label="Fecha"
                  value={formatArgentinaDate(reservation.start_at)}
                />
                <ReservationItem
                  label="Horario"
                  value={`${formatArgentinaTime(
                    reservation.start_at
                  )} → ${formatArgentinaTime(reservation.end_at)}`}
                />
                <ReservationItem
                  label="Barbero"
                  value={reservation.barber_name || BARBERSHOP.barber}
                />
                <ReservationItem
                  label="Estado"
                  value={getStatusLabel(reservation.status)}
                  highlight
                />
              </div>

              {/* La base no devuelve datos personales al buscar por código
                  (por privacidad). Si algún día los devuelve, se muestran
                  enmascarados. */}
              {reservation.customer_name && (
              <div className="border-t border-white/10 p-5 md:p-9">
                <p className="text-[9px] uppercase tracking-[0.28em] text-[#625e58]">
                  Datos de contacto
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-3 md:gap-4">
                  <ReservationItem label="Cliente" value={reservation.customer_name} />
                  <ReservationItem
                    label="Teléfono"
                    value={maskPhone(reservation.customer_phone)}
                  />
                  <ReservationItem
                    label="Email"
                    value={maskEmail(reservation.customer_email)}
                  />
                </div>
              </div>
              )}

              {/* ACCIONES */}

              <div className="border-t border-white/10 bg-[#141412] p-5 md:p-9">
                {!reservationIsActive ? (
                  <div className="text-center">
                    <p className="text-sm leading-7 text-[#8d877e]">
                      {reservation.status === "cancelled"
                        ? "Esta reserva está cancelada."
                        : "Esta reserva ya no se puede modificar."}
                    </p>
                    <Link
                      href="/reservar"
                      className="mt-4 inline-flex items-center gap-2 bg-[#b08a5a] px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#171512] transition-all hover:bg-[#c09a6c]"
                    >
                      Reservar un nuevo turno
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                ) : withinNoticeWindow ? (
                  <>
                    <p className="text-center text-sm leading-7 text-[#8d877e]">
                      Faltan menos de {config.cancellationNoticeHours} horas
                      para tu turno, así que ya no se puede modificar online.
                      Si necesitás cambiarlo o no podés venir, escribinos lo
                      antes posible.
                    </p>
                    <div className="mx-auto mt-2 max-w-md">
                      <ContactLinks />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={openEditReservation}
                        disabled={loading || !canManage}
                        className="flex flex-1 items-center justify-center gap-3 border border-white/10 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ddd6cc] transition-all hover:border-[#b08a5a]/60 hover:bg-white/[0.03] disabled:opacity-50"
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
                        disabled={loading || !canManage}
                        className="flex flex-1 items-center justify-center gap-3 border border-red-900/50 bg-red-950/20 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-red-300 transition-all hover:border-red-500/60 hover:bg-red-950/35 disabled:opacity-50"
                      >
                        <XCircle size={15} />
                        Cancelar reserva
                      </button>
                    </div>

                    {confirmingCancel && (
                      <div className="mt-5 border border-red-900/40 bg-red-950/15 p-5 md:p-6">
                        <p className="font-serif text-xl text-[#F4EEE5]">
                          ¿Seguro que querés cancelar?
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#aaa198]">
                          El horario va a quedar libre para otra persona. Esta
                          acción no se puede deshacer.
                        </p>
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            onClick={() => setConfirmingCancel(false)}
                            disabled={loading}
                            className="flex-1 border border-white/10 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#aaa198] transition-all hover:border-white/20 hover:bg-white/[0.03] disabled:opacity-50"
                          >
                            No, mantener turno
                          </button>
                          <button
                            type="button"
                            onClick={cancelReservation}
                            disabled={loading}
                            className="flex-1 bg-red-800/80 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-red-50 transition-all hover:bg-red-700 disabled:opacity-60"
                          >
                            {loading ? "Cancelando..." : "Sí, cancelar"}
                          </button>
                        </div>
                      </div>
                    )}

                    {editingReservation && (
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

                    {!editingReservation && !confirmingCancel && (
                      <p className="mt-5 text-center text-[10px] leading-6 text-[#625e58]">
                        Podés modificar o cancelar hasta{" "}
                        {config.cancellationNoticeHours} horas antes del turno.
                      </p>
                    )}
                  </>
                )}

                {error && reservation && (
                  <div
                    role="alert"
                    className="mt-5 border border-red-900/50 bg-red-950/20 p-4"
                  >
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}
              </div>
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
    <div className="mt-6 border border-[#b08a5a]/20 bg-[#181715] p-4 md:p-8">
      <p className="text-[9px] uppercase tracking-[0.28em] text-[#9b8465]">
        Modificar reserva
      </p>

      <h3 className="mt-2 font-serif text-2xl text-[#F4EEE5] md:text-3xl">
        Elegí un nuevo horario
      </h3>

      <p className="mt-2 max-w-xl text-xs leading-6 text-[#777169]">
        Primero el día y después uno de los horarios disponibles.
      </p>

      <div className="mt-6 border border-white/10 bg-[#141412]">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 md:px-7">
          <button
            type="button"
            disabled={!canGoBack}
            onClick={() =>
              setCurrentMonth(
                (current) =>
                  new Date(current.getFullYear(), current.getMonth() - 1, 1)
              )
            }
            className="flex h-9 w-9 items-center justify-center border border-white/10 text-[#aaa198] transition-all hover:border-[#b08a5a]/50 hover:text-[#b08a5a] disabled:opacity-20"
            aria-label="Mes anterior"
          >
            <ArrowLeft size={14} />
          </button>

          <p className="font-serif text-xl text-[#F4EEE5] first-letter:uppercase">
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
            className="flex h-9 w-9 items-center justify-center border border-white/10 text-[#aaa198] transition-all hover:border-[#b08a5a]/50 hover:text-[#b08a5a] disabled:opacity-20"
            aria-label="Mes siguiente"
          >
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-7 border-b border-white/10">
          {["D", "L", "M", "X", "J", "V", "S"].map((day) => (
            <div
              key={day}
              className="py-3 text-center text-[9px] font-semibold uppercase tracking-[0.2em] text-[#625e58]"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-white/10">
          {getCalendarDays(currentMonth).map((date) => {
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
                  "relative min-h-[48px] bg-[#141412] px-1 py-2 text-center transition-all md:min-h-[58px]",
                  !isCurrentMonth ? "text-[#292825]" : "",
                  isCurrentMonth && !isAvailable ? "text-[#393632]" : "",
                  isAvailable ? "hover:bg-[#1d1c19]" : "",
                  isSelected
                    ? "bg-[#b08a5a]/15 text-[#b08a5a] ring-1 ring-inset ring-[#b08a5a]/50"
                    : "",
                ].join(" ")}
              >
                <span
                  className={[
                    "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm",
                    isToday ? "border border-[#b08a5a]/50" : "",
                    isSelected ? "bg-[#b08a5a] font-semibold text-[#171512]" : "",
                  ].join(" ")}
                >
                  {date.getDate()}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="font-serif text-xl text-[#F4EEE5] first-letter:uppercase">
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
            <div className="mt-4 border border-white/10 bg-[#141412] p-6 text-center">
              <Clock3 size={18} className="mx-auto text-[#625e58]" />
              <p className="mt-3 text-xs text-[#777169]">
                No hay horarios disponibles para este día.
              </p>
            </div>
          )}

          {!loadingSlots && availableSlots.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {availableSlots.map((slot) => {
                const isSelectedSlot = newStartAt === slot.slot_start;

                return (
                  <button
                    key={slot.slot_start}
                    type="button"
                    onClick={() => onSelectSlot(slot.slot_start)}
                    aria-pressed={isSelectedSlot}
                    className={[
                      "border px-2 py-3 text-center text-sm font-medium transition-all",
                      isSelectedSlot
                        ? "border-[#b08a5a] bg-[#b08a5a] text-[#171512]"
                        : "border-white/10 bg-[#141412] text-[#ddd6cc] hover:border-[#b08a5a]/60 hover:bg-[#1d1c19] hover:text-[#b08a5a]",
                    ].join(" ")}
                  >
                    {formatArgentinaTime(slot.slot_start)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {newStartAt && (
        <div className="mt-6 border border-[#b08a5a]/20 bg-[#141412] p-5">
          <p className="text-[9px] uppercase tracking-[0.25em] text-[#625e58]">
            Nuevo horario
          </p>
          <p className="mt-1 font-serif text-xl text-[#F4EEE5]">
            {formatArgentinaDate(newStartAt)}
          </p>
          <p className="mt-1 text-sm text-[#b08a5a]">
            {formatArgentinaTime(newStartAt)} hs · {serviceName}
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 border border-white/10 px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#aaa198] transition-all hover:border-white/20 hover:bg-white/[0.03] disabled:opacity-50"
        >
          Volver
        </button>

        <button
          type="button"
          disabled={!newStartAt || loading}
          onClick={onConfirm}
          className="flex-1 bg-[#b08a5a] px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#171512] transition-all hover:bg-[#c09a6c] disabled:opacity-50"
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
      className={`flex items-center justify-center gap-2 px-2 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] transition-all sm:tracking-[0.2em] ${
        active
          ? "bg-[#b08a5a] text-[#171512]"
          : "text-[#8d877e] hover:bg-white/[0.04] hover:text-[#ddd6cc]"
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
            className="flex items-center gap-4 border border-white/5 bg-[#181715] p-3 transition-all hover:border-[#b08a5a]/50 hover:bg-[#1d1c19]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/10 text-[#b08a5a]">
              {item.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-medium text-[#ddd6cc]">
                {item.title}
              </span>
              <span className="mt-0.5 block truncate text-[11px] text-[#777169]">
                {item.text}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function ReservationItem({
  label,
  value,
  highlight = false,
  capitalize = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div className="border border-white/10 bg-[#141412] p-4 md:p-5">
      <p className="text-[9px] uppercase tracking-[0.28em] text-[#777169]">
        {label}
      </p>

      <p
        className={`mt-2 break-words ${capitalize ? "capitalize" : ""} ${
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
