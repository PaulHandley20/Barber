"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { InstagramIcon } from "@/components/icons/InstagramIcon";
import {
  BOOKING_BG,
  BookingHero,
  BookingTicket,
  BookingTopBar,
  TimeSlotGroups,
  bookingCardClass,
  bookingInputClass,
  bookingLabelClass,
  bookingPrimaryButtonClass,
  bookingSecondaryButtonClass,
} from "@/components/booking/kit";
import { createClient } from "@/lib/supabase/client";
import {
  BARBERSHOP,
  LEGAL_VERSION,
  getWhatsappUrl,
  summarizeHours,
} from "@/lib/barbershop";
import {
  isBlockedDate,
  isOpenOnDay,
  usePublicBookingConfig,
} from "@/lib/public-config";

type Service = {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  active: boolean;
};

type Slot = {
  slot_start: string;
  slot_end: string;
};

type AppointmentResult = {
  id?: string;
  appointment_id?: string;
  reservation_code?: string;
};

type StepStatus = "complete" | "current" | "locked";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const DAYS = ["L", "M", "X", "J", "V", "S", "D"];

const inputClass = bookingInputClass;
const secondaryButtonClass = bookingSecondaryButtonClass;
const primaryButtonClass = bookingPrimaryButtonClass;

const CONFIRMED_RESERVATION_STORAGE_KEY = "don-segundo-reserva-confirmada";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function getFieldErrors(values: {
  name: string;
  phone: string;
  email: string;
}) {
  const errors: { name?: string; phone?: string; email?: string } = {};

  if (values.name.trim().length < 3) {
    errors.name = "Ingresá tu nombre y apellido.";
  }

  if (values.phone.replace(/\D/g, "").length < 8) {
    errors.phone = "Ingresá un teléfono válido, con característica.";
  }

  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Ingresá un email válido.";
  }

  return errors;
}

/*
  Si la función SQL lanzó un mensaje propio (RAISE EXCEPTION, código
  P0001) lo mostramos tal cual: está pensado para el cliente. Cualquier
  otro error técnico se reemplaza por un mensaje claro.
*/
function getFriendlyError(
  error: { code?: string; message?: string } | null,
  fallback: string
) {
  if (error?.code === "P0001" && error.message) return error.message;

  const message = (error?.message ?? "").toLowerCase();

  if (message.includes("fetch") || message.includes("network")) {
    return "No pudimos conectarnos. Revisá tu conexión a internet e intentá de nuevo.";
  }

  return fallback;
}

function formatDateForSupabase(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatArgentinaDate(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);

  const label = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, day));

  // "martes, 13 de octubre" → "Martes, 13 de octubre"
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatArgentinaTime(dateString: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateString));
}

function formatPrice(price: number) {
  return `$${price.toLocaleString("es-AR")}`;
}

function toCalendarStamp(dateString: string) {
  return new Date(dateString)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function getGoogleCalendarUrl(
  service: Service,
  slot: Slot,
  code: string
) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${service.name} · ${BARBERSHOP.name}`,
    dates: `${toCalendarStamp(slot.slot_start)}/${toCalendarStamp(
      slot.slot_end
    )}`,
    details: `Código de reserva: ${code}\nModificá o cancelá tu turno en la web de ${BARBERSHOP.name}, sección "Mi reserva".`,
    location: `${BARBERSHOP.address}, ${BARBERSHOP.city}, ${BARBERSHOP.province}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function scrollToId(id: string, delay = 120) {
  window.setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, delay);
}

export default function ReservarPage() {
  const { config, loaded: configLoaded } = usePublicBookingConfig();

  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  const [acceptLegal, setAcceptLegal] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [triedReview, setTriedReview] = useState(false);

  /*
    Pasos 1 y 2: al completarse se contraen mostrando lo elegido.
    reopenStep permite volver a abrir uno con "Cambiar".
  */
  const [reopenStep, setReopenStep] = useState<1 | 2 | null>(null);

  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const [confirmedAppointment, setConfirmedAppointment] =
    useState<AppointmentResult | null>(null);

  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirmingAppointment, setConfirmingAppointment] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const successRef = useRef<HTMLElement | null>(null);

  const today = useMemo(() => {
    const date = new Date();

    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }, []);

  const maxDate = useMemo(() => {
    const date = new Date(today);

    date.setDate(date.getDate() + config.maxBookingDaysAhead);

    return date;
  }, [today, config.maxBookingDaysAhead]);

  const [calendarDate, setCalendarDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const hoursSummary = useMemo(
    () => summarizeHours(config.hours),
    [config.hours]
  );

  const fieldErrors = getFieldErrors({
    name: customerName,
    phone: customerPhone,
    email: customerEmail,
  });

  const formIsValid = Object.keys(fieldErrors).length === 0 && acceptLegal;

  const step1Collapsed = Boolean(selectedService) && reopenStep !== 1;
  const step2Collapsed = Boolean(selectedDate) && reopenStep !== 2;
  const step3Collapsed =
    Boolean(selectedSlot) && (showCustomerForm || showReview);

  const currentStep = showReview
    ? 5
    : showCustomerForm
      ? 4
      : selectedDate
        ? 3
        : selectedService
          ? 2
          : 1;

  /*
    ============================================================
    DETECTAR F5 / RELOAD DESPUÉS DE UNA RESERVA CONFIRMADA
    ============================================================
  */

  useEffect(() => {
    const navigationEntry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;

    const isReload = navigationEntry?.type === "reload";

    const reservationWasConfirmed =
      sessionStorage.getItem(CONFIRMED_RESERVATION_STORAGE_KEY) === "true";

    if (isReload && reservationWasConfirmed) {
      sessionStorage.removeItem(CONFIRMED_RESERVATION_STORAGE_KEY);

      window.location.replace("/");
    }
  }, []);

  /*
    ============================================================
    CARGAR SERVICIOS (y preseleccionar ?servicio=ID desde la landing)
    ============================================================
  */

  useEffect(() => {
    async function loadServices() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("services")
        .select("id, name, description, duration_minutes, price, active")
        .eq("active", true)
        .order("price", { ascending: true });

      if (error) {
        console.error(error);

        setError(
          "No pudimos cargar los servicios. Actualizá la página o intentá en unos minutos."
        );
        setLoadingServices(false);

        return;
      }

      const list = data ?? [];

      setServices(list);
      setLoadingServices(false);

      const preselectedId = new URLSearchParams(window.location.search).get(
        "servicio"
      );
      const preselected = list.find((service) => service.id === preselectedId);

      if (preselected) {
        setSelectedService(preselected);
        scrollToId("step-02", 300);
      }
    }

    loadServices();
  }, []);

  async function loadSlots(service: Service, date: string) {
    setLoadingSlots(true);
    setError(null);
    setSelectedSlot(null);
    setSlots([]);

    const supabase = createClient();

    const { data, error } = await supabase.rpc("get_available_slots", {
      p_date: date,
      p_service_id: service.id,
    });

    if (error) {
      console.error(error);

      setError(
        getFriendlyError(
          error,
          "No pudimos cargar los horarios de ese día. Probá de nuevo."
        )
      );
      setLoadingSlots(false);

      return;
    }

    setSlots(data ?? []);
    setLoadingSlots(false);
  }

  function handleServiceSelect(service: Service) {
    setReopenStep(null);
    setError(null);

    // Volver a tocar el mismo servicio solo cierra el paso.
    if (selectedService?.id === service.id) {
      scrollToId(selectedDate ? "step-03" : "step-02");
      return;
    }

    setSelectedService(service);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSlots([]);
    setShowCustomerForm(false);
    setShowReview(false);

    scrollToId("step-02");
  }

  function handleDateSelect(date: Date) {
    if (!selectedService || isDateDisabled(date)) return;

    const dateString = formatDateForSupabase(date);

    setReopenStep(null);
    setSelectedDate(dateString);
    setShowCustomerForm(false);
    setShowReview(false);

    loadSlots(selectedService, dateString);
    scrollToId("step-03");
  }

  function reopen(step: 1 | 2 | 3 | 4) {
    setError(null);

    if (step === 1 || step === 2) {
      setReopenStep(step);
      setShowCustomerForm(false);
      setShowReview(false);
      scrollToId(`step-0${step}`, 60);
      return;
    }

    if (step === 3) {
      setShowCustomerForm(false);
      setShowReview(false);
      scrollToId("step-03", 60);
      return;
    }

    setShowReview(false);
    setShowCustomerForm(true);
    scrollToId("step-04", 60);
  }

  function openCustomerForm() {
    if (!selectedService || !selectedDate || !selectedSlot) return;

    setShowReview(false);
    setShowCustomerForm(true);
    scrollToId("step-04", 80);
  }

  function openReview() {
    setTriedReview(true);

    if (!formIsValid) return;

    setShowReview(true);
    setShowCustomerForm(false);
    scrollToId("step-05", 80);
  }

  async function confirmAppointment() {
    if (!selectedService || !selectedDate || !selectedSlot || !formIsValid) {
      return;
    }

    setConfirmingAppointment(true);
    setError(null);

    const supabase = createClient();

    const email = customerEmail.trim().toLowerCase();

    const { data, error } = await supabase.rpc("create_web_appointment", {
      p_full_name: customerName.trim().replace(/\s+/g, " "),
      p_phone: customerPhone.trim(),
      p_email: email,
      p_service_id: selectedService.id,
      p_start_at: selectedSlot.slot_start,
      p_notes: customerNotes.trim() || null,
    });

    if (error) {
      console.error("Error creando reserva:", error);

      setError(
        getFriendlyError(
          error,
          "No pudimos confirmar el turno. Es posible que ese horario lo haya tomado otra persona: elegí otro y volvé a intentar."
        )
      );

      await loadSlots(selectedService, selectedDate);

      setShowReview(false);
      setShowCustomerForm(false);
      setConfirmingAppointment(false);

      scrollToId("step-03", 100);

      return;
    }

    /*
      La función SQL puede devolver { id }, { appointment_id } o un
      array con ese objeto. Normalizamos.
    */
    const appointmentData = Array.isArray(data) ? data[0] : data;

    const appointmentResult: AppointmentResult = {
      id: appointmentData?.id,
      appointment_id: appointmentData?.appointment_id,
      reservation_code: appointmentData?.reservation_code,
    };

    /*
      Registro del consentimiento (privacidad/términos obligatorio y
      marketing opcional, por separado). Si la función todavía no está
      instalada en Supabase, la reserva igual queda confirmada.
    */
    if (appointmentResult.reservation_code) {
      const { error: consentError } = await supabase.rpc(
        "record_booking_consent",
        {
          p_reservation_code: appointmentResult.reservation_code,
          p_email: email,
          p_policy_version: LEGAL_VERSION,
          p_marketing_opt_in: marketingOptIn,
        }
      );

      if (consentError) {
        console.warn("No se pudo registrar el consentimiento:", consentError);
      }
    }

    // Marca sin datos personales: si recarga la página, vuelve al inicio.
    sessionStorage.setItem(CONFIRMED_RESERVATION_STORAGE_KEY, "true");

    setConfirmedAppointment(appointmentResult);
    setShowReview(false);
    setShowCustomerForm(false);
    setConfirmingAppointment(false);

    window.setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
  }

  function getReservationCode() {
    return confirmedAppointment?.reservation_code || "";
  }

  async function copyCode() {
    const code = getReservationCode();

    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      setCodeCopied(true);
      window.setTimeout(() => setCodeCopied(false), 2500);
    } catch {
      setCodeCopied(false);
    }
  }

  function getCalendarDays() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }

  function canGoPreviousMonth() {
    return (
      calendarDate > new Date(today.getFullYear(), today.getMonth(), 1)
    );
  }

  function canGoNextMonth() {
    const nextMonth = new Date(
      calendarDate.getFullYear(),
      calendarDate.getMonth() + 1,
      1
    );

    return (
      nextMonth <= new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)
    );
  }

  function previousMonth() {
    if (!canGoPreviousMonth()) return;

    setCalendarDate(
      new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1)
    );
  }

  function nextMonth() {
    if (!canGoNextMonth()) return;

    setCalendarDate(
      new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1)
    );
  }

  function isDateSelected(date: Date) {
    return selectedDate === formatDateForSupabase(date);
  }

  function isDateDisabled(date: Date) {
    if (!isOpenOnDay(config, date.getDay())) return true;
    if (isBlockedDate(config, formatDateForSupabase(date))) return true;
    if (date < today) return true;
    if (date > maxDate) return true;

    return false;
  }

  function getStepStatus(step: number): StepStatus {
    if (step === 1) return selectedService ? "complete" : "current";

    if (step === 2) {
      return selectedDate
        ? "complete"
        : selectedService
          ? "current"
          : "locked";
    }

    if (step === 3) {
      return step3Collapsed
        ? "complete"
        : selectedDate
          ? "current"
          : "locked";
    }

    if (step === 4) {
      return showReview ? "complete" : showCustomerForm ? "current" : "locked";
    }

    if (step === 5) return showReview ? "current" : "locked";

    return "locked";
  }

  const showError = (field: "name" | "phone" | "email") =>
    (touched[field] || triedReview) && fieldErrors[field];

  /*
    ============================================================
    PANTALLA DE CONFIRMACIÓN
    ============================================================
  */

  if (confirmedAppointment && selectedService && selectedDate && selectedSlot) {
    const code = getReservationCode();
    const whatsappUrl = getWhatsappUrl(
      `Hola! Reservé un turno por la web (código ${code}).`
    );

    const clearConfirmedFlag = () =>
      sessionStorage.removeItem(CONFIRMED_RESERVATION_STORAGE_KEY);

    return (
      <main className="min-h-screen bg-[#100f0d] text-[#F4EEE5]">
        <BookingTopBar current="reservar" />

        <BookingHero
          image="/images/hero.jpg"
          eyebrow="Reserva confirmada"
          align="center"
          title={
            <>
              <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[#c9a46e]/50 bg-[#b08a5a]/[0.12] text-[#e3c591]">
                <CheckCircle2 size={30} />
              </span>
              ¡Listo, {customerName.trim().split(" ")[0]}! Tu turno está confirmado.
            </>
          }
          subtitle={
            <>
              Te esperamos el{" "}
              <span className="text-[#F4EEE5]">{formatArgentinaDate(selectedDate)}</span> a las{" "}
              <span className="text-[#F4EEE5]">{formatArgentinaTime(selectedSlot.slot_start)} hs</span>.
            </>
          }
        />

        <section
          ref={successRef}
          className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-10 sm:px-6 md:py-14 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8"
        >
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <BookingTicket
              tone="confirmed"
              startAt={selectedSlot.slot_start}
              endAt={selectedSlot.slot_end}
              serviceName={selectedService.name}
              durationMinutes={selectedService.duration_minutes}
              price={selectedService.price}
              barber={BARBERSHOP.barber}
              code={code || null}
              codeAction={
                code ? (
                  <button
                    type="button"
                    onClick={copyCode}
                    aria-label="Copiar código"
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#EADFCB]/20 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#ddd6cc] transition hover:border-[#EADFCB]/60"
                  >
                    {codeCopied ? <Check size={12} /> : <Copy size={12} />}
                    {codeCopied ? "Copiado" : "Copiar"}
                  </button>
                ) : null
              }
              footer={
                <div className="flex items-start gap-3 text-[13px] leading-6 text-[#a39a8e]">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-[#c9a46e]" />
                  <p>
                    <span className="text-[#F4EEE5]">
                      {BARBERSHOP.address}, {BARBERSHOP.city}.
                    </span>{" "}
                    Te pedimos llegar unos minutos antes.{" "}
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
              }
            />

            <p className="mt-5 text-center text-[13px] leading-6 text-[#8d877e]">
              Guardá el código (una captura alcanza). Con él, o con tu email y
              teléfono, podés cambiar o cancelar el turno desde{" "}
              <span className="text-[#ddd6cc]">Mi reserva</span>.
            </p>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className={`${bookingCardClass} h-fit p-6`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#a88d68]">
              Próximos pasos
            </p>
            <h2 className="mt-2 font-serif text-[26px] leading-tight">
              Dejalo agendado
            </h2>

            <div className="mt-6 grid gap-3">
              {code && (
                <a
                  href={getGoogleCalendarUrl(selectedService, selectedSlot, code)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={primaryButtonClass}
                >
                  <CalendarPlus size={15} />
                  Agregar al calendario
                </a>
              )}

              <Link
                href={
                  code
                    ? `/gestionar-reserva?codigo=${encodeURIComponent(code)}`
                    : "/gestionar-reserva"
                }
                onClick={clearConfirmedFlag}
                className={secondaryButtonClass}
              >
                <Pencil size={15} />
                Ver mi reserva
              </Link>

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={secondaryButtonClass}
                >
                  <MessageCircle size={15} />
                  Escribir por WhatsApp
                </a>
              )}

              <Link href="/" onClick={clearConfirmedFlag} className={secondaryButtonClass}>
                <Home size={15} />
                Volver al inicio
              </Link>
            </div>

            <p className="mt-6 border-t border-[#EADFCB]/[0.08] pt-5 text-[12px] leading-6 text-[#7d756a]">
              ¿No podés venir? Cancelá desde Mi reserva en cualquier momento
              antes del turno, así lo liberamos para otra persona.
            </p>
          </motion.aside>
        </section>
      </main>
    );
  }

  /*
    ============================================================
    PANTALLA PRINCIPAL DE RESERVA
    ============================================================
  */

  const STEP_LABELS = ["Servicio", "Día", "Horario", "Tus datos", "Confirmar"];

  return (
    <main className="min-h-screen bg-[#100f0d] text-[#F4EEE5]">
      <BookingTopBar current="reservar" />

      <BookingHero
        image="/images/services.jpg"
        eyebrow={`${BARBERSHOP.name} · Reservas online`}
        title="Reservá tu turno."
        subtitle="Elegí el servicio, el día y el horario que te quede mejor. Te lleva menos de un minuto."
        hoursLabel={hoursSummary.map((item) => `${item.days} · ${item.hours}`).join(" · ")}
      >
        {/* Progreso: escritorio */}
        <ol className="mt-9 hidden items-center gap-2 lg:flex" aria-label="Pasos de la reserva">
          {STEP_LABELS.map((label, index) => {
            const step = index + 1;
            const status = getStepStatus(step);

            return (
              <li key={label} className="flex items-center gap-2">
                <span
                  className={`flex items-center gap-2.5 rounded-full border py-1.5 pl-1.5 pr-4 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                    status === "current"
                      ? "border-[#EADFCB]/60 bg-[#EADFCB]/[0.08] text-[#F4EEE5]"
                      : status === "complete"
                        ? "border-[#b08a5a]/40 text-[#e3c591]"
                        : "border-[#EADFCB]/[0.08] text-[#6f685e]"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] ${
                      status === "complete"
                        ? "bg-[#b08a5a] text-[#1b1915]"
                        : status === "current"
                          ? "bg-[#EADFCB] text-[#1b1915]"
                          : "border border-[#EADFCB]/15"
                    }`}
                  >
                    {status === "complete" ? <Check size={12} /> : step}
                  </span>
                  {label}
                </span>
                {index < STEP_LABELS.length - 1 && (
                  <span
                    className={`h-px w-6 ${
                      status === "complete" ? "bg-[#b08a5a]/60" : "bg-[#EADFCB]/10"
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>

        {/* Progreso: celular y tablet */}
        <div className="mt-8 lg:hidden">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em]">
            <span className="text-[#8d877e]">
              Paso {currentStep} de {STEP_LABELS.length}
            </span>
            <span className="text-[#e3c591]">{STEP_LABELS[currentStep - 1]}</span>
          </div>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-[#EADFCB]/10">
            <div
              className="h-full rounded-full bg-[#EADFCB] transition-all duration-500"
              style={{ width: `${(currentStep / STEP_LABELS.length) * 100}%` }}
            />
          </div>
        </div>
      </BookingHero>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-12 lg:px-8">
        {configLoaded && !config.onlineBookingEnabled ? (
          <BookingPaused />
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_370px] xl:gap-8">
            <div className="min-w-0 space-y-4 md:space-y-5">
              {/* ================= PASO 01 · SERVICIO ================= */}

              <StepCard
                id="step-01"
                number="01"
                eyebrow="Primer paso"
                title="Elegí tu servicio"
                status={getStepStatus(1)}
                collapsed={step1Collapsed}
                summary={
                  selectedService && (
                    <>
                      <span className="text-[#F4EEE5]">
                        {selectedService.name}
                      </span>
                      <span className="text-[#777169]">
                        {" "}
                        · {selectedService.duration_minutes} min ·{" "}
                        {formatPrice(selectedService.price)}
                      </span>
                    </>
                  )
                }
                onEdit={() => reopen(1)}
              >
                {loadingServices ? (
                  <LoadingState label="Cargando servicios..." />
                ) : services.length === 0 ? (
                  <LockedMessage>
                    Todavía no hay servicios disponibles para reservar
                    online. Escribinos y te damos un turno.
                  </LockedMessage>
                ) : (
                  <>
                    <p className="mb-5 text-[13px] leading-6 text-[#8d877e]">
                      Tocá un servicio para elegirlo.
                    </p>

                    <div
                      role="radiogroup"
                      aria-label="Servicios"
                      className="grid gap-3 md:grid-cols-2 md:gap-4"
                    >
                      {services.map((service, index) => {
                        const selected = selectedService?.id === service.id;

                        return (
                          <button
                            key={service.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => handleServiceSelect(service)}
                            className={`group relative flex flex-col overflow-hidden rounded-[18px] border p-5 text-left transition duration-300 md:min-h-[210px] md:p-6 ${
                              selected
                                ? "border-[#EADFCB]/70 bg-[#211f1a] shadow-[0_20px_60px_rgba(0,0,0,.25)]"
                                : "border-[#EADFCB]/[0.1] bg-[#0f0e0c] hover:border-[#b08a5a]/70 hover:bg-[#1a1815]"
                            }`}
                          >
                            <div className="relative flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <span className="flex items-center gap-2.5 text-[11px] font-semibold tracking-[0.2em] text-[#a88d68]">
                                  <span className="h-px w-7 bg-[#b08a5a]" />
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                                <h3 className="mt-3 font-serif text-[24px] leading-tight text-[#F4EEE5]">
                                  {service.name}
                                </h3>
                              </div>

                              <SelectionIndicator selected={selected} />
                            </div>

                            {service.description && (
                              <p className="relative mt-3 text-[14px] leading-6 text-[#b5ada1]">
                                {service.description}
                              </p>
                            )}

                            <div className="relative mt-auto flex items-center justify-between gap-3 pt-5">
                              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#EADFCB]/[0.1] px-3 py-1.5 text-[12px] text-[#c2b9ac]">
                                <Clock3 size={12} className="text-[#c9a46e]" />
                                {service.duration_minutes} min
                              </span>

                              <span className="font-serif text-[24px] text-[#F4EEE5]">
                                {formatPrice(service.price)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </StepCard>

              {/* ================= PASO 02 · DÍA ================= */}

              <StepCard
                id="step-02"
                number="02"
                eyebrow="Segundo paso"
                title="Elegí el día"
                status={getStepStatus(2)}
                collapsed={step2Collapsed}
                lockedHint="Primero elegí un servicio."
                summary={
                  selectedDate && (
                    <span className="text-[#F4EEE5]">
                      {formatArgentinaDate(selectedDate)}
                    </span>
                  )
                }
                onEdit={() => reopen(2)}
              >
                <div className="mb-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={previousMonth}
                    disabled={!canGoPreviousMonth()}
                    aria-label="Mes anterior"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#EADFCB]/15 text-[#ddd6cc] transition hover:border-[#EADFCB]/50 disabled:opacity-20"
                  >
                    <ArrowLeft size={17} />
                  </button>

                  <div className="text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#a88d68]">
                      Elegí una fecha
                    </p>

                    <h3 className="mt-2 font-serif text-2xl md:text-3xl">
                      {MONTHS[calendarDate.getMonth()]}{" "}
                      {calendarDate.getFullYear()}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={nextMonth}
                    disabled={!canGoNextMonth()}
                    aria-label="Mes siguiente"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-[#EADFCB]/15 text-[#ddd6cc] transition hover:border-[#EADFCB]/50 disabled:opacity-20"
                  >
                    <ArrowRight size={17} />
                  </button>
                </div>

                <div className="mx-auto grid max-w-[560px] grid-cols-7 gap-1 sm:gap-2">
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="pb-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7d756a]"
                    >
                      {day}
                    </div>
                  ))}

                  {getCalendarDays().map((date, index) => {
                    if (!date) {
                      return (
                        <div key={`empty-${index}`} className="aspect-square" />
                      );
                    }

                    const disabled = isDateDisabled(date);
                    const selected = isDateSelected(date);
                    const isToday = date.getTime() === today.getTime();

                    return (
                      <button
                        key={date.toISOString()}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleDateSelect(date)}
                        aria-pressed={selected}
                        aria-label={new Intl.DateTimeFormat("es-AR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        }).format(date)}
                        className={`relative mx-auto flex aspect-square w-full max-w-[64px] items-center justify-center rounded-full text-[15px] tabular-nums transition ${
                          selected
                            ? "bg-[#EADFCB] font-semibold text-[#1b1915] shadow-[0_10px_30px_rgba(234,223,203,.14)]"
                            : disabled
                              ? "text-[#3d3a35]"
                              : "border border-[#EADFCB]/[0.1] text-[#ddd6cc] hover:border-[#b08a5a] hover:text-[#F4EEE5]"
                        }`}
                      >
                        {date.getDate()}
                        {isToday && !selected && (
                          <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#c9a46e]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-center gap-2 border-t border-[#EADFCB]/[0.07] pt-5 text-[12px] text-[#8d877e]">
                  {hoursSummary.map((item) => (
                    <span key={item.days} className="rounded-full border border-[#EADFCB]/[0.08] px-3 py-1.5">
                      {item.days} · {item.hours}
                    </span>
                  ))}
                  <span className="rounded-full border border-[#EADFCB]/[0.08] px-3 py-1.5">
                    Reservas hasta {config.maxBookingDaysAhead} días
                  </span>
                </div>
              </StepCard>

              {/* ================= PASO 03 · HORARIO ================= */}

              <StepCard
                id="step-03"
                number="03"
                eyebrow="Tercer paso"
                title="Elegí el horario"
                status={getStepStatus(3)}
                collapsed={step3Collapsed}
                lockedHint="Primero elegí un día."
                summary={
                  selectedSlot && (
                    <span className="text-[#F4EEE5]">
                      {formatArgentinaTime(selectedSlot.slot_start)} →{" "}
                      {formatArgentinaTime(selectedSlot.slot_end)} hs
                    </span>
                  )
                }
                onEdit={() => reopen(3)}
              >
                {!selectedDate ? null : loadingSlots ? (
                  <LoadingState label="Buscando horarios disponibles..." />
                ) : slots.length === 0 ? (
                  <div className="rounded-[18px] border border-[#EADFCB]/[0.1] bg-[#0f0e0c] p-6">
                    <p className="font-serif text-xl">
                      No hay horarios disponibles ese día.
                    </p>

                    <p className="mt-2 text-sm leading-7 text-[#8d877e]">
                      Probá con otro día.
                    </p>

                    <button
                      type="button"
                      onClick={() => reopen(2)}
                      className={`${secondaryButtonClass} mt-5`}
                    >
                      <ArrowLeft size={15} />
                      Elegir otro día
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="mb-5 font-serif text-[20px] text-[#F4EEE5] first-letter:uppercase">
                      {formatArgentinaDate(selectedDate)}
                    </p>

                    <TimeSlotGroups
                      slots={slots}
                      isSelected={(slot) => selectedSlot?.slot_start === slot.slot_start}
                      onSelect={(slot) => setSelectedSlot(slot)}
                      formatTime={formatArgentinaTime}
                    />

                    <AnimatePresence>
                      {selectedSlot && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-6 rounded-[18px] border border-[#EADFCB]/20 bg-[#EADFCB]/[0.04] p-5"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#a88d68]">
                                Horario elegido
                              </p>

                              <p className="mt-1 font-serif text-2xl">
                                {formatArgentinaTime(selectedSlot.slot_start)}{" "}
                                hs
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={openCustomerForm}
                              className={primaryButtonClass}
                            >
                              Continuar
                              <ArrowRight
                                size={15}
                                className="transition-transform group-hover:translate-x-1"
                              />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </StepCard>

              {/* ================= PASO 04 · DATOS ================= */}

              <StepCard
                id="step-04"
                number="04"
                eyebrow="Cuarto paso"
                title="Tus datos"
                status={getStepStatus(4)}
                collapsed={showReview}
                lockedHint="Primero elegí un horario."
                summary={
                  <>
                    <span className="text-[#F4EEE5]">{customerName}</span>
                    <span className="text-[#777169]"> · {customerEmail}</span>
                  </>
                }
                onEdit={() => reopen(4)}
              >
                {showCustomerForm && (
                  <form
                    noValidate
                    onSubmit={(event) => {
                      event.preventDefault();
                      openReview();
                    }}
                  >
                    <div className="mb-7 max-w-2xl">
                      <p className="text-[15px] leading-7 text-[#b5ada1]">
                        Necesitamos estos datos para confirmar tu turno y
                        avisarte si hay algún cambio.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <InfoPill
                          icon={<UserRound size={13} />}
                          label="Datos personales"
                        />
                        <InfoPill icon={<Phone size={13} />} label="Contacto" />
                        <InfoPill
                          icon={<ShieldCheck size={13} />}
                          label="Datos protegidos"
                        />
                      </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2 md:gap-6">
                      <Field
                        id="customer-name"
                        label="Nombre y apellido *"
                        error={showError("name")}
                      >
                        <input
                          id="customer-name"
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          onBlur={() =>
                            setTouched((t) => ({ ...t, name: true }))
                          }
                          placeholder="Juan Pérez"
                          autoComplete="name"
                          aria-invalid={Boolean(showError("name"))}
                          className={`${inputClass} ${
                            showError("name")
                              ? "!border-red-400/60"
                              : ""
                          }`}
                        />
                      </Field>

                      <Field
                        id="customer-phone"
                        label="Teléfono / WhatsApp *"
                        error={showError("phone")}
                      >
                        <input
                          id="customer-phone"
                          type="tel"
                          inputMode="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          onBlur={() =>
                            setTouched((t) => ({ ...t, phone: true }))
                          }
                          placeholder="3442 123456"
                          autoComplete="tel"
                          aria-invalid={Boolean(showError("phone"))}
                          className={`${inputClass} ${
                            showError("phone")
                              ? "!border-red-400/60"
                              : ""
                          }`}
                        />
                      </Field>

                      <Field
                        id="customer-email"
                        label="Email *"
                        error={showError("email")}
                      >
                        <input
                          id="customer-email"
                          type="email"
                          inputMode="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          onBlur={() =>
                            setTouched((t) => ({ ...t, email: true }))
                          }
                          placeholder="juan@email.com"
                          autoComplete="email"
                          aria-invalid={Boolean(showError("email"))}
                          className={`${inputClass} ${
                            showError("email")
                              ? "!border-red-400/60"
                              : ""
                          }`}
                        />
                      </Field>

                      <div className="md:col-span-2">
                        <label
                          htmlFor="customer-notes"
                          className={bookingLabelClass}
                        >
                          Observaciones{" "}
                          <span className="ml-2 normal-case tracking-normal text-[#625e58]">
                            (opcional)
                          </span>
                        </label>

                        <textarea
                          id="customer-notes"
                          value={customerNotes}
                          onChange={(e) => setCustomerNotes(e.target.value)}
                          placeholder="¿Querés dejarnos alguna indicación?"
                          rows={3}
                          maxLength={500}
                          className={`${inputClass} resize-none`}
                        />
                      </div>
                    </div>

                    {/* CONSENTIMIENTO */}

                    <div className="mt-7 space-y-3 rounded-[18px] border border-[#EADFCB]/[0.08] bg-[#0f0e0c] p-5">
                      <ConsentCheckbox
                        id="accept-legal"
                        checked={acceptLegal}
                        onChange={setAcceptLegal}
                        invalid={triedReview && !acceptLegal}
                      >
                        Leí y acepto la{" "}
                        <Link
                          href="/privacidad"
                          target="_blank"
                          className="text-[#c09a6c] underline underline-offset-4"
                        >
                          Política de privacidad
                        </Link>{" "}
                        y los{" "}
                        <Link
                          href="/terminos"
                          target="_blank"
                          className="text-[#c09a6c] underline underline-offset-4"
                        >
                          Términos y condiciones
                        </Link>
                        . *
                      </ConsentCheckbox>

                      {triedReview && !acceptLegal && (
                        <p className="pl-8 text-xs text-red-300">
                          Para reservar necesitamos que aceptes la política y
                          los términos.
                        </p>
                      )}

                      <ConsentCheckbox
                        id="marketing-opt-in"
                        checked={marketingOptIn}
                        onChange={setMarketingOptIn}
                      >
                        Quiero recibir novedades, beneficios y promociones de{" "}
                        {BARBERSHOP.name}.{" "}
                        <span className="text-[#625e58]">
                          (Opcional. No es necesario para reservar y podés
                          darte de baja cuando quieras.)
                        </span>
                      </ConsentCheckbox>
                    </div>

                    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => reopen(3)}
                        className={`${secondaryButtonClass} sm:min-w-[130px]`}
                      >
                        <ArrowLeft size={15} />
                        Volver
                      </button>

                      <button
                        type="submit"
                        className={`${primaryButtonClass} flex-1`}
                      >
                        Revisar reserva
                        <ArrowRight
                          size={15}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </button>
                    </div>

                    <p className="mt-4 text-[12px] leading-6 text-[#7d756a]">
                      * Campos obligatorios. Tu turno todavía no está
                      confirmado.
                    </p>
                  </form>
                )}
              </StepCard>

              {/* ================= PASO 05 · REVISIÓN ================= */}

              <StepCard
                id="step-05"
                number="05"
                eyebrow="Último paso"
                title="Revisá y confirmá"
                status={getStepStatus(5)}
                collapsed={false}
                lockedHint="Completá tus datos para revisar la reserva."
              >
                {showReview && selectedService && selectedDate && selectedSlot && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                      <ReviewItem label="Servicio" value={selectedService.name} />
                      <ReviewItem
                        label="Duración"
                        value={`${selectedService.duration_minutes} minutos`}
                      />
                      <ReviewItem
                        label="Fecha"
                        value={formatArgentinaDate(selectedDate)}
                        
                      />
                      <ReviewItem
                        label="Horario"
                        value={`${formatArgentinaTime(
                          selectedSlot.slot_start
                        )} → ${formatArgentinaTime(selectedSlot.slot_end)}`}
                      />
                      <ReviewItem label="Nombre" value={customerName} />
                      <ReviewItem label="Teléfono" value={customerPhone} />
                      <ReviewItem label="Email" value={customerEmail} />
                      <ReviewItem
                        label="Total"
                        value={formatPrice(selectedService.price)}
                        highlight
                      />
                    </div>

                    {customerNotes.trim() && (
                      <div className="mt-3 sm:mt-4">
                        <ReviewItem
                          label="Observaciones"
                          value={customerNotes.trim()}
                        />
                      </div>
                    )}

                    <p className="mt-5 text-[13px] leading-6 text-[#8d877e]">
                      Aceptaste la política de privacidad y los términos ·
                      Novedades y promociones:{" "}
                      <span className="text-[#ddd6cc]">
                        {marketingOptIn ? "sí" : "no"}
                      </span>
                    </p>

                    <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => reopen(4)}
                        disabled={confirmingAppointment}
                        className={secondaryButtonClass}
                      >
                        <ArrowLeft size={15} />
                        Editar datos
                      </button>

                      <button
                        type="button"
                        disabled={confirmingAppointment}
                        onClick={confirmAppointment}
                        className={primaryButtonClass}
                      >
                        {confirmingAppointment ? (
                          <>
                            <span className="h-4 w-4 animate-spin rounded-full border border-[#171512]/30 border-t-[#171512]" />
                            Confirmando...
                          </>
                        ) : (
                          <>
                            Confirmar turno
                            <ArrowRight
                              size={15}
                              className="transition-transform group-hover:translate-x-1"
                            />
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </StepCard>

              {error && (
                <motion.div
                  role="alert"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-[18px] border border-red-400/25 bg-red-500/[0.07] p-5 text-sm leading-7 text-red-200"
                >
                  <p className="font-medium">
                    No pudimos completar la operación.
                  </p>
                  <p className="mt-1 text-red-300/80">{error}</p>
                </motion.div>
              )}
            </div>

            {/* ================= RESUMEN ================= */}

            <aside className="xl:sticky xl:top-24 xl:self-start">
              <p className="mb-3 px-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#a88d68]">
                Tu reserva
              </p>

              <BookingTicket
                compact
                tone="draft"
                statusLabel={showReview ? "Revisá y confirmá" : "Sin confirmar"}
                startAt={selectedSlot?.slot_start ?? (selectedDate ? `${selectedDate}T12:00:00-03:00` : null)}
                endAt={selectedSlot?.slot_end ?? null}
                serviceName={selectedService?.name ?? null}
                durationMinutes={selectedService?.duration_minutes ?? null}
                price={selectedService?.price ?? null}
                barber={BARBERSHOP.barber}
                notchColor={BOOKING_BG}
                timeKnown={Boolean(selectedSlot)}
              />

              <div className={`${bookingCardClass} mt-3 p-5`}>
                <div className="flex items-start gap-3">
                  <Clock3 size={15} className="mt-0.5 shrink-0 text-[#c9a46e]" />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#a88d68]">
                      Horarios
                    </p>
                    {hoursSummary.map((item) => (
                      <p
                        key={item.days}
                        className="mt-1 text-[13px] leading-6 text-[#a39a8e]"
                      >
                        {item.days} · {item.hours}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`${bookingCardClass} mt-3 p-5 text-[13px] leading-6 text-[#a39a8e]`}>
                ¿Dudas? Escribinos por{" "}
                <a
                  href={BARBERSHOP.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#b08a5a] hover:underline"
                >
                  Instagram
                </a>{" "}
                o a{" "}
                <a
                  href={`mailto:${BARBERSHOP.email}`}
                  className="break-all text-[#b08a5a] hover:underline"
                >
                  {BARBERSHOP.email}
                </a>
                .
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

/*
============================================================
COMPONENTES
============================================================
*/

function StepCard({
  id,
  number,
  eyebrow,
  title,
  status,
  collapsed,
  summary,
  lockedHint,
  onEdit,
  children,
}: {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  status: StepStatus;
  collapsed: boolean;
  summary?: React.ReactNode;
  lockedHint?: string;
  onEdit?: () => void;
  children?: React.ReactNode;
}) {
  const locked = status === "locked";
  const showBody = !locked && !collapsed;

  return (
    <section
      id={id}
      className={`scroll-mt-24 overflow-hidden rounded-[22px] border transition-colors duration-500 ${
        locked
          ? "border-[#EADFCB]/[0.05] bg-[#141311]/60"
          : collapsed
            ? "border-[#EADFCB]/[0.09] bg-[#171613]"
            : "border-[#EADFCB]/[0.16] bg-[#171613] shadow-[0_25px_80px_rgba(0,0,0,.28)]"
      }`}
    >
      <div
        className={`flex items-center gap-4 px-5 md:px-7 ${
          showBody ? "border-b border-[#EADFCB]/[0.07] py-5 md:py-6" : "py-4 md:py-5"
        }`}
      >
        <StepBadge number={number} status={status} />

        <div className="min-w-0 flex-1">
          <p
            className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${
              locked ? "text-[#4f4b46]" : "text-[#a88d68]"
            }`}
          >
            {eyebrow}
          </p>

          <h2
            className={`mt-1 font-serif leading-tight ${
              locked
                ? "text-[20px] text-[#5f5a52]"
                : collapsed
                  ? "text-[20px] text-[#F4EEE5] md:text-[22px]"
                  : "text-[26px] text-[#F4EEE5] md:text-[32px]"
            }`}
          >
            {title}
          </h2>

          {collapsed && summary && (
            <p className="mt-1 truncate text-[14px]">{summary}</p>
          )}

          {locked && lockedHint && (
            <p className="mt-1 text-[12px] text-[#5f5a52]">{lockedHint}</p>
          )}
        </div>

        {collapsed && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="shrink-0 rounded-full border border-[#EADFCB]/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#ddd6cc] transition hover:border-[#EADFCB]/60 hover:text-[#F4EEE5]"
          >
            Cambiar
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {showBody && (
          <motion.div
            key="body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className="p-5 md:p-7">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function StepBadge({ number, status }: { number: string; status: StepStatus }) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-all duration-300 ${
        status === "complete"
          ? "bg-[#b08a5a] text-[#1b1915]"
          : status === "current"
            ? "bg-[#EADFCB] text-[#1b1915]"
            : "border border-[#EADFCB]/10 text-[#5f5a52]"
      }`}
    >
      {status === "complete" ? <Check size={15} /> : Number(number)}
    </div>
  );
}

/*
  Círculo de selección siempre visible (vacío → lleno con check),
  para que se entienda de un vistazo que la tarjeta es seleccionable.
*/
function SelectionIndicator({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ${
        selected
          ? "border-[#EADFCB] bg-[#EADFCB] text-[#1b1915]"
          : "border-[#EADFCB]/25 text-transparent group-hover:border-[#b08a5a]"
      }`}
    >
      <Check size={14} />
    </span>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string | false;
  children: React.ReactNode;
}) {
  return (
    <div className={id === "customer-name" ? "md:col-span-2" : undefined}>
      <label htmlFor={id} className={bookingLabelClass}>
        {label}
      </label>
      {children}
      {error && <p className="mt-2 text-[12px] text-red-300">{error}</p>}
    </div>
  );
}

function ConsentCheckbox({
  id,
  checked,
  onChange,
  invalid = false,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={invalid}
        className={`mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded accent-[#c9a46e] ${
          invalid ? "outline outline-1 outline-red-500" : ""
        }`}
      />
      <label htmlFor={id} className="cursor-pointer text-[14px] leading-6 text-[#b5ada1]">
        {children}
      </label>
    </div>
  );
}

function ReviewItem({
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
    <div className="rounded-[16px] border border-[#EADFCB]/[0.08] bg-[#0f0e0c] p-4 md:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7d756a]">
        {label}
      </p>

      <p
        className={`mt-2 break-words ${capitalize ? "capitalize" : ""} ${
          highlight
            ? "font-serif text-[26px] leading-none text-[#e3c591]"
            : "text-[15px] leading-6 text-[#F4EEE5]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function LockedMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[18px] border border-[#EADFCB]/[0.08] bg-[#0f0e0c] p-6">
      <p className="text-[14px] leading-7 text-[#8d877e]">{children}</p>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-[18px] border border-[#EADFCB]/[0.08] bg-[#0f0e0c] p-6 text-[14px] text-[#b5ada1]">
      <span className="h-4 w-4 animate-spin rounded-full border border-[#7a6447] border-t-[#e3c591]" />
      {label}
    </div>
  );
}

function InfoPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[#EADFCB]/[0.1] px-3 py-1.5 text-[11px] text-[#a39a8e]">
      <span className="text-[#c9a46e]">{icon}</span>
      {label}
    </div>
  );
}

function BookingPaused() {
  const whatsappUrl = getWhatsappUrl("Hola! Quería sacar un turno.");

  return (
    <div className={`${bookingCardClass} mx-auto max-w-2xl p-8 text-center md:p-12`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#a88d68]">
        Reservas online pausadas
      </p>
      <h2 className="mt-3 font-serif text-3xl md:text-4xl">
        Por ahora tomamos turnos por mensaje.
      </h2>
      <p className="mt-4 text-[15px] leading-7 text-[#b5ada1]">
        Escribinos y te damos el próximo horario disponible.
      </p>
      <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
        <a
          href={BARBERSHOP.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={secondaryButtonClass}
        >
          <InstagramIcon size={15} />
          Instagram
        </a>
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={secondaryButtonClass}
          >
            <MessageCircle size={15} />
            WhatsApp
          </a>
        )}
        <a href={`mailto:${BARBERSHOP.email}`} className={secondaryButtonClass}>
          <Mail size={15} />
          Email
        </a>
      </div>
    </div>
  );
}
