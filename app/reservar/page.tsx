"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
};

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

const inputClass =
  "w-full border border-white/10 bg-[#141412] px-5 py-4 text-[#F4EEE5] outline-none transition-all duration-300 placeholder:text-[#5f5b55] hover:border-white/20 focus:border-[#b08a5a] focus:bg-[#181715] focus:ring-1 focus:ring-[#b08a5a]/20";

const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 border border-white/10 px-6 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#aaa198] transition-all duration-300 hover:border-[#b08a5a]/70 hover:bg-white/[0.03] hover:text-[#F4EEE5]";

export default function ReservarPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");

  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const [confirmedAppointment, setConfirmedAppointment] =
    useState<AppointmentResult | null>(null);

  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirmingAppointment, setConfirmingAppointment] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const customerFormRef = useRef<HTMLElement | null>(null);
  const reviewRef = useRef<HTMLElement | null>(null);
  const successRef = useRef<HTMLElement | null>(null);

  const today = useMemo(() => {
    const date = new Date();

    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
  }, []);

  const maxDate = useMemo(() => {
    const date = new Date(today);

    date.setDate(date.getDate() + 30);

    return date;
  }, [today]);

  const [calendarDate, setCalendarDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const canReview =
    Boolean(selectedService) &&
    Boolean(selectedDate) &&
    Boolean(selectedSlot) &&
    Boolean(customerName.trim()) &&
    Boolean(customerPhone.trim()) &&
    Boolean(customerEmail.trim());

  const currentStep = confirmedAppointment
    ? 6
    : showReview
      ? 5
      : showCustomerForm
        ? 4
        : selectedSlot
          ? 3
          : selectedDate
            ? 3
            : selectedService
              ? 2
              : 1;

  useEffect(() => {
    async function loadServices() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("services")
        .select(
          "id, name, description, duration_minutes, price, active"
        )
        .eq("active", true)
        .order("price", { ascending: true });

      if (error) {
        console.error(error);

        setError(error.message);
        setLoadingServices(false);

        return;
      }

      setServices(data ?? []);
      setLoadingServices(false);
    }

    loadServices();
  }, []);

  async function loadSlots(service: Service, date: string) {
    setLoadingSlots(true);
    setError(null);
    setSelectedSlot(null);
    setSlots([]);

    const supabase = createClient();

    const { data, error } = await supabase.rpc(
      "get_available_slots",
      {
        p_date: date,
        p_service_id: service.id,
      }
    );

    if (error) {
      console.error(error);

      setError(error.message);
      setLoadingSlots(false);

      return;
    }

    setSlots(data ?? []);
    setLoadingSlots(false);
  }

  function handleServiceSelect(service: Service) {
    setSelectedService(service);

    setSelectedDate(null);
    setSelectedSlot(null);
    setSlots([]);

    setShowCustomerForm(false);
    setShowReview(false);
    setConfirmedAppointment(null);

    setError(null);
  }

  function handleDateSelect(date: Date) {
    if (!selectedService) return;

    if (date < today || date > maxDate) return;

    const day = date.getDay();

    if (day === 0 || day === 6) return;

    const dateString = formatDateForSupabase(date);

    setSelectedDate(dateString);
    setShowCustomerForm(false);
    setShowReview(false);
    setConfirmedAppointment(null);

    loadSlots(selectedService, dateString);
  }

  function openCustomerForm() {
    if (!selectedService || !selectedDate || !selectedSlot) {
      return;
    }

    setShowReview(false);
    setConfirmedAppointment(null);
    setShowCustomerForm(true);

    window.setTimeout(() => {
      customerFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }

  function backToSchedule() {
    setShowCustomerForm(false);

    window.setTimeout(() => {
      document.getElementById("step-03")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  }

  function openReview() {
    if (!canReview) return;

    setShowReview(true);
    setShowCustomerForm(false);
    setConfirmedAppointment(null);

    window.setTimeout(() => {
      reviewRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }

  function backToCustomerForm() {
    setShowReview(false);
    setShowCustomerForm(true);

    window.setTimeout(() => {
      customerFormRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  }

  async function confirmAppointment() {
    if (
      !selectedService ||
      !selectedDate ||
      !selectedSlot ||
      !customerName.trim() ||
      !customerPhone.trim() ||
      !customerEmail.trim()
    ) {
      return;
    }

    setConfirmingAppointment(true);
    setError(null);

    const supabase = createClient();

    /*
      DON SEGUNDO
      VERSION 8.3

      RPC:

      create_web_appointment(
        p_full_name text,
        p_phone text,
        p_email text,
        p_service_id uuid,
        p_start_at timestamp with time zone,
        p_notes text
      )
    */

    const { data, error } = await supabase.rpc(
      "create_web_appointment",
      {
        p_full_name: customerName.trim(),
        p_phone: customerPhone.trim(),
        p_email: customerEmail.trim(),
        p_service_id: selectedService.id,
        p_start_at: selectedSlot.slot_start,
        p_notes: customerNotes.trim() || null,
      }
    );

    if (error) {
      console.error("Error creando reserva:", error);

      setError(
        error.message ||
          "No pudimos confirmar el turno. El horario puede haber sido tomado por otra persona."
      );

      await loadSlots(selectedService, selectedDate);

      setShowReview(false);
      setShowCustomerForm(false);
      setConfirmingAppointment(false);

      window.setTimeout(() => {
        document.getElementById("step-03")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);

      return;
    }

    /*
      Normalizamos la respuesta de Supabase.

      Dependiendo de cómo esté definida la función SQL,
      puede llegar como:

      { id: "..." }

      o:

      { appointment_id: "..." }

      o incluso como un array.
    */

    const appointmentData = Array.isArray(data)
      ? data[0]
      : data;

    const appointmentResult: AppointmentResult = {
      id: appointmentData?.id,
      appointment_id: appointmentData?.appointment_id,
    };

    console.log(
      "Reserva creada correctamente:",
      appointmentResult
    );

    setConfirmedAppointment(appointmentResult);

    setShowReview(false);
    setShowCustomerForm(false);
    setConfirmingAppointment(false);

    window.setTimeout(() => {
      successRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function getAppointmentId() {
    if (confirmedAppointment?.id) {
      return `DS-${confirmedAppointment.id
        .replace(/-/g, "")
        .slice(0, 8)
        .toUpperCase()}`;
    }

    if (confirmedAppointment?.appointment_id) {
      return `DS-${confirmedAppointment.appointment_id
        .replace(/-/g, "")
        .slice(0, 8)
        .toUpperCase()}`;
    }

    return "DS-CONFIRMADA";
  }

  function getCalendarDays() {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDay = new Date(year, month, 1);

    const startingDay =
      firstDay.getDay() === 0
        ? 6
        : firstDay.getDay() - 1;

    const daysInMonth = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }

  function canGoPreviousMonth() {
    const currentMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    return calendarDate > currentMonth;
  }

  function canGoNextMonth() {
    const nextMonth = new Date(
      calendarDate.getFullYear(),
      calendarDate.getMonth() + 1,
      1
    );

    return (
      nextMonth <=
      new Date(
        maxDate.getFullYear(),
        maxDate.getMonth(),
        1
      )
    );
  }

  function previousMonth() {
    if (!canGoPreviousMonth()) return;

    setCalendarDate(
      new Date(
        calendarDate.getFullYear(),
        calendarDate.getMonth() - 1,
        1
      )
    );
  }

  function nextMonth() {
    if (!canGoNextMonth()) return;

    setCalendarDate(
      new Date(
        calendarDate.getFullYear(),
        calendarDate.getMonth() + 1,
        1
      )
    );
  }

  function formatDateForSupabase(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function formatArgentinaDate(dateString: string) {
    const [year, month, day] = dateString
      .split("-")
      .map(Number);

    const date = new Date(year, month - 1, day);

    return new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(date);
  }

  function formatArgentinaTime(dateString: string) {
    return new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(dateString));
  }

  function isDateSelected(date: Date) {
    if (!selectedDate) return false;

    return (
      formatDateForSupabase(date) === selectedDate
    );
  }

  function isDateDisabled(date: Date) {
    const day = date.getDay();

    if (day === 0 || day === 6) return true;
    if (date < today) return true;
    if (date > maxDate) return true;

    return false;
  }

  function getStepStatus(
    step: number
  ): "complete" | "current" | "locked" {
    if (step === 1) {
      return selectedService ? "complete" : "current";
    }

    if (step === 2) {
      return selectedDate
        ? "complete"
        : selectedService
          ? "current"
          : "locked";
    }

    if (step === 3) {
      return selectedSlot
        ? "complete"
        : selectedDate
          ? "current"
          : "locked";
    }

    if (step === 4) {
      return showReview || confirmedAppointment
        ? "complete"
        : showCustomerForm
          ? "current"
          : "locked";
    }

    if (step === 5) {
      return confirmedAppointment
        ? "complete"
        : showReview
          ? "current"
          : "locked";
    }

    return "locked";
  }

  /*
    ============================================================
    PANTALLA DE CONFIRMACIÓN
    ============================================================
  */

  if (
    confirmedAppointment &&
    selectedService &&
    selectedDate &&
    selectedSlot
  ) {
    return (
      <main className="min-h-screen bg-[#11110f] text-[#F4EEE5]">
        <section className="relative overflow-hidden border-b border-white/10 px-6 py-14 md:px-10 md:py-20">
          <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[#b08a5a]/[0.045] blur-3xl" />

          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-8 h-px w-20 bg-[#b08a5a]" />

            <p className="text-xs uppercase tracking-[0.38em] text-[#9b8465]">
              Don Segundo · Reserva confirmada
            </p>

            <h1 className="mt-5 font-serif text-5xl leading-tight md:text-7xl">
              Tu turno está confirmado.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-[#aaa198] md:text-base">
              Gracias,{" "}
              {customerName.split(" ")[0] || "por elegirnos"}.
              Guardamos tu turno correctamente.
            </p>

            <div className="mt-8 inline-flex items-center gap-3 border border-[#b08a5a]/30 bg-[#b08a5a]/[0.05] px-5 py-3">
              <span className="text-[9px] uppercase tracking-[0.25em] text-[#777169]">
                Reserva
              </span>

              <span className="font-mono text-sm tracking-[0.15em] text-[#b08a5a]">
                {getAppointmentId()}
              </span>
            </div>
          </div>
        </section>

        <section
          ref={successRef}
          className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20"
        >
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden border border-[#b08a5a]/40 bg-[#181715] shadow-[0_30px_100px_rgba(0,0,0,.25)]"
          >
            <div className="border-b border-white/10 p-8 text-center md:p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#b08a5a]/50 bg-[#b08a5a]/10 text-[#b08a5a]">
                <CheckCircle2 size={30} />
              </div>

              <p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-[#9b8465]">
                Reserva confirmada
              </p>

              <h2 className="mt-3 font-serif text-3xl md:text-4xl">
                Te esperamos en Don Segundo
              </h2>

              <div className="mt-6 inline-flex flex-col items-center border border-white/10 bg-[#141412] px-6 py-4">
                <span className="text-[9px] uppercase tracking-[0.28em] text-[#625e58]">
                  Número de reserva
                </span>

                <span className="mt-2 font-mono text-lg tracking-[0.18em] text-[#b08a5a]">
                  {getAppointmentId()}
                </span>
              </div>
            </div>

            <div className="grid gap-px bg-white/10 md:grid-cols-2">
              <ReviewItem
                label="Servicio"
                value={selectedService.name}
              />

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
                )} → ${formatArgentinaTime(
                  selectedSlot.slot_end
                )}`}
              />

              <ReviewItem
                label="Barbero"
                value="Manu"
              />

              <ReviewItem
                label="Total"
                value={`$${selectedService.price.toLocaleString(
                  "es-AR"
                )}`}
                highlight
              />
            </div>

            <div className="border-t border-white/10 p-7 md:p-9">
              <div className="flex items-start gap-4">
                <Mail
                  size={18}
                  className="mt-1 shrink-0 text-[#b08a5a]"
                />

                <div>
                  <p className="text-xs font-medium text-[#ddd6cc]">
                    Confirmación enviada
                  </p>

                  <p className="mt-2 text-sm leading-7 text-[#777169]">
                    Recibimos tu email y lo utilizaremos para la
                    confirmación de la reserva y futuras
                    comunicaciones relacionadas con tu turno.
                  </p>

                  <p className="mt-3 text-sm text-[#b08a5a]">
                    {customerEmail}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 p-7 md:p-9">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="border border-white/10 bg-[#141412] p-5">
                  <p className="text-[9px] uppercase tracking-[0.28em] text-[#777169]">
                    Cliente
                  </p>

                  <p className="mt-2 text-sm text-[#ddd6cc]">
                    {customerName}
                  </p>

                  <p className="mt-1 text-sm text-[#777169]">
                    {customerPhone}
                  </p>
                </div>

                <div className="border border-white/10 bg-[#141412] p-5">
                  <p className="text-[9px] uppercase tracking-[0.28em] text-[#777169]">
                    Estado
                  </p>

                  <p className="mt-2 flex items-center gap-2 text-sm text-[#b08a5a]">
                    <span className="h-2 w-2 rounded-full rounded-full bg-[#b08a5a]" />
                    Confirmado
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-[#141412] p-7 md:p-9">
              <p className="text-[9px] uppercase tracking-[0.28em] text-[#625e58]">
                Datos registrados
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <ReviewItem
                  label="Nombre"
                  value={customerName}
                />

                <ReviewItem
                  label="Teléfono"
                  value={customerPhone}
                />

                <ReviewItem
                  label="Email"
                  value={customerEmail}
                />

                <ReviewItem
                  label="Observaciones"
                  value={
                    customerNotes.trim() ||
                    "Sin observaciones"
                  }
                />
              </div>
            </div>
          </motion.div>
        </section>
      </main>
    );
  }

  /*
    ============================================================
    PANTALLA PRINCIPAL DE RESERVA
    ============================================================
  */

  return (
    <main className="min-h-screen bg-[#11110f] text-[#F4EEE5]">
      <section className="relative overflow-hidden border-b border-white/10 px-6 py-14 md:px-10 md:py-20">
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[#b08a5a]/[0.035] blur-3xl" />

        <div className="relative mx-auto max-w-7xl">
          <div className="mb-7 h-px w-20 bg-[#b08a5a]" />

          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.38em] text-[#9b8465]">
                Don Segundo · Reservas
              </p>

              <h1 className="mt-4 font-serif text-4xl leading-tight md:text-6xl">
                Reservá tu momento.
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#aaa198] md:text-base">
                Elegí tu servicio, encontrá el día y horario
                que mejor te quede y completá tus datos para
                confirmar.
              </p>
            </div>

            <div className="hidden lg:block">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((step, index) => {
                  const status = getStepStatus(step);

                  return (
                    <div
                      key={step}
                      className="flex items-center gap-2"
                    >
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] transition-all duration-300 ${
                          status === "complete"
                            ? "border-[#b08a5a] bg-[#b08a5a] text-[#171512]"
                            : status === "current"
                              ? "border-[#b08a5a] text-[#b08a5a]"
                              : "border-white/10 text-[#625e58]"
                        }`}
                      >
                        {status === "complete" ? (
                          <Check size={13} />
                        ) : (
                          String(step).padStart(2, "0")
                        )}
                      </div>

                      {index < 4 && (
                        <div
                          className={`h-px w-7 ${
                            status === "complete"
                              ? "bg-[#b08a5a]/60"
                              : "bg-white/10"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 text-right text-[10px] uppercase tracking-[0.28em] text-[#625e58]">
                Paso{" "}
                {String(Math.min(currentStep, 5)).padStart(
                  2,
                  "0"
                )}{" "}
                de 05
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_370px]">
          <div className="space-y-7">
            {/* ================================================= */}
            {/* STEP 01 */}
            {/* ================================================= */}

            <motion.section
              id="step-01"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="overflow-hidden border border-[#8a7152]/25 bg-[#181715]/75"
            >
              <SectionHeader
                number="01"
                eyebrow="Primer paso"
                title="Elegí tu servicio"
                status={getStepStatus(1)}
              />

              <div className="p-6 md:p-10">
                {loadingServices ? (
                  <LoadingState label="Cargando servicios..." />
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {services.map((service) => {
                      const selected =
                        selectedService?.id === service.id;

                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() =>
                            handleServiceSelect(service)
                          }
                          aria-pressed={selected}
                          className={`group relative min-h-[235px] overflow-hidden border p-6 text-left transition-all duration-300 ${
                            selected
                              ? "border-[#b08a5a] bg-[#29271f] shadow-[0_20px_60px_rgba(0,0,0,.18)]"
                              : "border-white/10 bg-[#141412] hover:-translate-y-1 hover:border-[#8a7152] hover:bg-[#1c1b18]"
                          }`}
                        >
                          <div
                            className={`absolute left-0 top-0 h-full w-[2px] transition-all duration-300 ${
                              selected
                                ? "bg-[#b08a5a]"
                                : "bg-transparent group-hover:bg-[#7a6447]"
                            }`}
                          />

                          <div className="flex items-start justify-between gap-4">
                            <div className="h-px w-10 bg-[#7a6447]" />

                            {selected && (
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#b08a5a] text-[#171512]">
                                <Check size={15} />
                              </div>
                            )}
                          </div>

                          <h3 className="mt-7 font-serif text-2xl">
                            {service.name}
                          </h3>

                          <p className="mt-3 min-h-[72px] text-sm leading-7 text-[#bdb5aa]">
                            {service.description}
                          </p>

                          <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-5">
                            <div>
                              <span className="text-[10px] uppercase tracking-[0.25em] text-[#9b8465]">
                                Duración
                              </span>

                              <p className="mt-1 text-sm text-[#ddd6cc]">
                                {service.duration_minutes} min
                              </p>
                            </div>

                            <span className="font-serif text-xl">
                              $
                              {service.price.toLocaleString(
                                "es-AR"
                              )}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.section>

            {/* ================================================= */}
            {/* STEP 02 */}
            {/* ================================================= */}

            <motion.section
              id="step-02"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`overflow-hidden border bg-[#181715]/75 transition-all duration-500 ${
                selectedService
                  ? "border-[#8a7152]/25 opacity-100"
                  : "border-white/5 opacity-45"
              }`}
            >
              <SectionHeader
                number="02"
                eyebrow="Segundo paso"
                title="Elegí el día"
                status={getStepStatus(2)}
              />

              <div className="p-6 md:p-10">
                {!selectedService ? (
                  <LockedMessage>
                    Primero seleccioná un servicio para ver los
                    días disponibles.
                  </LockedMessage>
                ) : (
                  <>
                    <div className="mb-7 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={previousMonth}
                        disabled={!canGoPreviousMonth()}
                        aria-label="Mes anterior"
                        className="flex h-11 w-11 items-center justify-center border border-white/10 transition-all duration-300 hover:border-[#b08a5a] hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-20"
                      >
                        <ArrowLeft size={17} />
                      </button>

                      <div className="text-center">
                        <p className="text-[9px] uppercase tracking-[0.3em] text-[#625e58]">
                          Seleccioná una fecha
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
                        className="flex h-11 w-11 items-center justify-center border border-white/10 transition-all duration-300 hover:border-[#b08a5a] hover:bg-white/[0.03] disabled:cursor-not-allowed disabled:opacity-20"
                      >
                        <ArrowRight size={17} />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5 md:gap-2">
                      {DAYS.map((day) => (
                        <div
                          key={day}
                          className="py-2 text-center text-[10px] uppercase tracking-[0.22em] text-[#625e58]"
                        >
                          {day}
                        </div>
                      ))}

                      {getCalendarDays().map(
                        (date, index) => {
                          if (!date) {
                            return (
                              <div
                                key={`empty-${index}`}
                                className="aspect-square"
                              />
                            );
                          }

                          const disabled =
                            isDateDisabled(date);

                          const selected =
                            isDateSelected(date);

                          return (
                            <button
                              key={date.toISOString()}
                              type="button"
                              disabled={disabled}
                              onClick={() =>
                                handleDateSelect(date)
                              }
                              className={`group relative aspect-square border text-sm transition-all duration-200 ${
                                selected
                                  ? "border-[#b08a5a] bg-[#b08a5a] text-[#171512] shadow-[0_10px_30px_rgba(176,138,90,.12)]"
                                  : disabled
                                    ? "cursor-not-allowed border-transparent text-[#3f3c38]"
                                    : "border-white/5 text-[#ddd6cc] hover:-translate-y-0.5 hover:border-[#b08a5a]/70 hover:bg-[#24211d] hover:text-[#c09a6c]"
                              }`}
                            >
                              <span className="relative z-10">
                                {date.getDate()}
                              </span>

                              {!disabled &&
                                !selected && (
                                  <span className="absolute bottom-2 left-1/2 h-px w-0 -translate-x-1/2 bg-[#b08a5a] transition-all group-hover:w-3" />
                                )}
                            </button>
                          );
                        }
                      )}
                    </div>

                    <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-[10px] uppercase tracking-[0.18em] text-[#625e58]">
                      <span>● Lunes a viernes</span>
                      <span>● Hasta 30 días</span>
                    </div>
                  </>
                )}
              </div>
            </motion.section>

            {/* ================================================= */}
            {/* STEP 03 */}
            {/* ================================================= */}

            <motion.section
              id="step-03"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`overflow-hidden border bg-[#181715]/75 transition-all duration-500 ${
                selectedDate
                  ? "border-[#8a7152]/25 opacity-100"
                  : "border-white/5 opacity-45"
              }`}
            >
              <SectionHeader
                number="03"
                eyebrow="Tercer paso"
                title="Elegí el horario"
                status={getStepStatus(3)}
              />

              <div className="p-6 md:p-10">
                {!selectedDate ? (
                  <LockedMessage>
                    Primero seleccioná una fecha.
                  </LockedMessage>
                ) : loadingSlots ? (
                  <LoadingState label="Buscando horarios disponibles..." />
                ) : slots.length === 0 ? (
                  <div className="border border-white/10 bg-[#141412] p-7">
                    <p className="font-serif text-xl">
                      No hay horarios disponibles.
                    </p>

                    <p className="mt-2 text-sm leading-7 text-[#8d877e]">
                      Probá seleccionando otro día.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-[#625e58]">
                          Horarios disponibles
                        </p>

                        <p className="mt-2 capitalize text-[#bdb5aa]">
                          {formatArgentinaDate(
                            selectedDate
                          )}
                        </p>
                      </div>

                      <p className="text-xs text-[#625e58]">
                        Turnos cada 30 minutos
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {slots.map((slot) => {
                        const selected =
                          selectedSlot?.slot_start ===
                          slot.slot_start;

                        return (
                          <button
                            key={slot.slot_start}
                            type="button"
                            onClick={() =>
                              setSelectedSlot(slot)
                            }
                            aria-pressed={selected}
                            className={`group relative flex min-h-[60px] items-center justify-center gap-2 border px-4 py-4 text-sm tracking-[0.12em] transition-all duration-300 ${
                              selected
                                ? "border-[#b08a5a] bg-[#b08a5a] font-semibold text-[#171512] shadow-[0_12px_35px_rgba(176,138,90,.14)]"
                                : "border-white/10 bg-[#141412] text-[#ddd6cc] hover:-translate-y-0.5 hover:border-[#b08a5a] hover:bg-[#211f1a] hover:text-[#c09a6c]"
                            }`}
                          >
                            {selected && (
                              <Check size={14} />
                            )}

                            {formatArgentinaTime(
                              slot.slot_start
                            )}

                            {!selected && (
                              <ArrowRight
                                size={14}
                                className="absolute right-3 opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100"
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {selectedSlot && (
                      <motion.div
                        initial={{
                          opacity: 0,
                          y: 10,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        className="mt-7 border border-[#b08a5a]/25 bg-[#b08a5a]/[0.05] p-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.25em] text-[#9b8465]">
                              Horario elegido
                            </p>

                            <p className="mt-1 font-serif text-2xl">
                              {formatArgentinaTime(
                                selectedSlot.slot_start
                              )}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={openCustomerForm}
                            className="inline-flex items-center justify-center gap-3 bg-[#b08a5a] px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#171512] transition-all duration-300 hover:bg-[#c09a6c] hover:shadow-[0_12px_35px_rgba(176,138,90,.15)] active:scale-[0.98]"
                          >
                            Continuar
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
              </div>
            </motion.section>

            {/* ================================================= */}
            {/* STEP 04 */}
            {/* ================================================= */}

            {showCustomerForm && (
              <motion.section
                ref={customerFormRef}
                id="step-04"
                initial={{
                  opacity: 0,
                  y: 35,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.55,
                  ease: "easeOut",
                }}
                className="scroll-mt-8 overflow-hidden border border-[#b08a5a]/35 bg-[#181715]/90 shadow-[0_25px_90px_rgba(0,0,0,.22)]"
              >
                <SectionHeader
                  number="04"
                  eyebrow="Cuarto paso"
                  title="Tus datos"
                  status="current"
                />

                <div className="p-6 md:p-10">
                  <div className="mb-9 max-w-2xl">
                    <p className="text-sm leading-7 text-[#aaa198]">
                      Necesitamos estos datos para confirmar
                      tu turno y enviarte la información de la
                      reserva.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <InfoPill
                        icon={<UserRound size={13} />}
                        label="Datos personales"
                      />

                      <InfoPill
                        icon={<Phone size={13} />}
                        label="Contacto"
                      />

                      <InfoPill
                        icon={<Mail size={13} />}
                        label="Confirmación"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label
                        htmlFor="customer-name"
                        className="mb-2.5 block text-[10px] uppercase tracking-[0.25em] text-[#9b8465]"
                      >
                        Nombre completo *
                      </label>

                      <input
                        id="customer-name"
                        type="text"
                        value={customerName}
                        onChange={(e) =>
                          setCustomerName(
                            e.target.value
                          )
                        }
                        placeholder="Juan Pérez"
                        required
                        autoComplete="name"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="customer-phone"
                        className="mb-2.5 block text-[10px] uppercase tracking-[0.25em] text-[#9b8465]"
                      >
                        Teléfono *
                      </label>

                      <input
                        id="customer-phone"
                        type="tel"
                        value={customerPhone}
                        onChange={(e) =>
                          setCustomerPhone(
                            e.target.value
                          )
                        }
                        placeholder="+54 9 11 1234 5678"
                        required
                        autoComplete="tel"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="customer-email"
                        className="mb-2.5 block text-[10px] uppercase tracking-[0.25em] text-[#9b8465]"
                      >
                        Email *
                      </label>

                      <input
                        id="customer-email"
                        type="email"
                        value={customerEmail}
                        onChange={(e) =>
                          setCustomerEmail(
                            e.target.value
                          )
                        }
                        placeholder="juan@email.com"
                        required
                        autoComplete="email"
                        className={inputClass}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label
                        htmlFor="customer-notes"
                        className="mb-2.5 block text-[10px] uppercase tracking-[0.25em] text-[#9b8465]"
                      >
                        Observaciones{" "}
                        <span className="ml-2 normal-case tracking-normal text-[#625e58]">
                          (opcional)
                        </span>
                      </label>

                      <textarea
                        id="customer-notes"
                        value={customerNotes}
                        onChange={(e) =>
                          setCustomerNotes(
                            e.target.value
                          )
                        }
                        placeholder="¿Querés dejarnos alguna indicación?"
                        rows={4}
                        className={`${inputClass} resize-none`}
                      />
                    </div>
                  </div>

                  <div className="mt-9 flex flex-col gap-3 border-t border-white/10 pt-7 sm:flex-row">
                    <button
                      type="button"
                      onClick={backToSchedule}
                      className={`${secondaryButtonClass} sm:min-w-[130px]`}
                    >
                      <ArrowLeft size={15} />
                      Volver
                    </button>

                    <button
                      type="button"
                      disabled={!canReview}
                      onClick={openReview}
                      className="group flex flex-1 items-center justify-center gap-3 bg-[#b08a5a] px-6 py-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#171512] transition-all duration-300 hover:bg-[#c09a6c] hover:shadow-[0_15px_45px_rgba(176,138,90,.14)] disabled:cursor-not-allowed disabled:bg-[#51493e] disabled:text-[#9b9388] disabled:opacity-60"
                    >
                      Revisar reserva

                      <ArrowRight
                        size={15}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </button>
                  </div>

                  <p className="mt-5 text-[10px] leading-6 text-[#625e58]">
                    * Campos obligatorios. Tu turno todavía
                    no está confirmado.
                  </p>
                </div>
              </motion.section>
            )}

            {/* ================================================= */}
            {/* STEP 05 */}
            {/* ================================================= */}

            {showReview &&
              selectedService &&
              selectedDate &&
              selectedSlot && (
                <motion.section
                  ref={reviewRef}
                  id="step-05"
                  initial={{
                    opacity: 0,
                    y: 35,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.55,
                    ease: "easeOut",
                  }}
                  className="scroll-mt-8 overflow-hidden border border-[#b08a5a]/45 bg-[#181715]/95 shadow-[0_25px_90px_rgba(0,0,0,.28)]"
                >
                  <SectionHeader
                    number="05"
                    eyebrow="Último paso"
                    title="Revisá tu reserva"
                    status="current"
                  />

                  <div className="p-6 md:p-10">
                    <div className="border border-[#b08a5a]/25 bg-[#b08a5a]/[0.045] p-5 md:p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#b08a5a]/50 bg-[#b08a5a]/10 text-[#b08a5a]">
                          <Check size={17} />
                        </div>

                        <div>
                          <p className="text-[10px] uppercase tracking-[0.25em] text-[#9b8465]">
                            Todo listo para confirmar
                          </p>

                          <p className="mt-2 text-sm leading-7 text-[#aaa198]">
                            Revisá los datos de tu turno.
                            Todavía no se creó ninguna
                            reserva.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-2">
                      <ReviewItem
                        label="Servicio"
                        value={selectedService.name}
                      />

                      <ReviewItem
                        label="Duración"
                        value={`${selectedService.duration_minutes} minutos`}
                      />

                      <ReviewItem
                        label="Fecha"
                        value={formatArgentinaDate(
                          selectedDate
                        )}
                      />

                      <ReviewItem
                        label="Horario"
                        value={`${formatArgentinaTime(
                          selectedSlot.slot_start
                        )} → ${formatArgentinaTime(
                          selectedSlot.slot_end
                        )}`}
                      />

                      <ReviewItem
                        label="Barbero"
                        value="Manu"
                      />

                      <ReviewItem
                        label="Total"
                        value={`$${selectedService.price.toLocaleString(
                          "es-AR"
                        )}`}
                        highlight
                      />
                    </div>

                    <div className="mt-4 border border-white/10 bg-[#141412] p-6">
                      <p className="mb-5 text-[10px] uppercase tracking-[0.28em] text-[#9b8465]">
                        Tus datos
                      </p>

                      <div className="grid gap-5 md:grid-cols-2">
                        <ReviewItem
                          label="Nombre"
                          value={customerName}
                        />

                        <ReviewItem
                          label="Teléfono"
                          value={customerPhone}
                        />

                        <ReviewItem
                          label="Email"
                          value={customerEmail}
                        />

                        <ReviewItem
                          label="Observaciones"
                          value={
                            customerNotes.trim() ||
                            "Sin observaciones"
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={backToCustomerForm}
                        disabled={confirmingAppointment}
                        className={secondaryButtonClass}
                      >
                        <ArrowLeft size={15} />
                        Volver a editar
                      </button>

                      <button
                        type="button"
                        disabled={confirmingAppointment}
                        onClick={confirmAppointment}
                        className="group inline-flex items-center justify-center gap-3 bg-[#b08a5a] px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#171512] transition-all duration-300 hover:bg-[#c09a6c] hover:shadow-[0_15px_45px_rgba(176,138,90,.18)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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

                    <p className="mt-5 text-center text-[10px] leading-6 text-[#625e58]">
                      Al confirmar, vamos a crear tu turno
                      en Don Segundo.
                    </p>
                  </div>
                </motion.section>
              )}
          </div>

          {/* ================================================= */}
          {/* SIDEBAR */}
          {/* ================================================= */}

          <aside className="xl:sticky xl:top-8 xl:self-start">
            <div className="relative overflow-hidden border border-[#8a7152]/35 bg-[#181715] p-7 shadow-[0_25px_80px_rgba(0,0,0,.16)] md:p-8">
              <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-[#b08a5a]/[0.04] blur-3xl" />

              <div className="relative">
                <div className="mb-7 h-px w-12 bg-[#b08a5a]" />

                <p className="text-[10px] uppercase tracking-[0.3em] text-[#9b8465]">
                  Tu reserva
                </p>

                <div className="mt-2 flex items-end justify-between gap-4">
                  <h2 className="font-serif text-3xl">
                    Resumen
                  </h2>

                  <span className="text-[9px] uppercase tracking-[0.2em] text-[#625e58]">
                    Manu
                  </span>
                </div>

                <div className="my-7 h-px bg-white/10" />

                {selectedService ? (
                  <div>
                    <SummaryLabel>
                      Servicio
                    </SummaryLabel>

                    <p className="mt-2 font-serif text-2xl">
                      {selectedService.name}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-sm text-[#aaa198]">
                      <span>
                        {selectedService.duration_minutes}{" "}
                        min
                      </span>

                      <span>
                        $
                        {selectedService.price.toLocaleString(
                          "es-AR"
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <EmptySummary
                    step="01"
                    text="Seleccioná un servicio para comenzar."
                  />
                )}

                {selectedDate && (
                  <div className="mt-8">
                    <SummaryLabel>
                      Fecha
                    </SummaryLabel>

                    <p className="mt-2 capitalize text-[#ddd6cc]">
                      {formatArgentinaDate(selectedDate)}
                    </p>
                  </div>
                )}

                {selectedSlot && (
                  <div className="mt-8">
                    <SummaryLabel>
                      Horario
                    </SummaryLabel>

                    <p className="mt-2 font-serif text-3xl text-[#b08a5a]">
                      {formatArgentinaTime(
                        selectedSlot.slot_start
                      )}
                    </p>
                  </div>
                )}

                {!selectedDate &&
                  selectedService && (
                    <SummaryHint>
                      Elegí un día en el calendario para
                      continuar.
                    </SummaryHint>
                  )}

                {selectedDate &&
                  !selectedSlot && (
                    <SummaryHint>
                      Elegí un horario disponible para
                      continuar.
                    </SummaryHint>
                  )}

                <div className="my-7 h-px bg-white/10" />

                <div className="flex items-end justify-between gap-4">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-[#777169]">
                    Total
                  </span>

                  <span className="font-serif text-2xl md:text-3xl">
                    {selectedService
                      ? `$${selectedService.price.toLocaleString(
                          "es-AR"
                        )}`
                      : "$0"}
                  </span>
                </div>

                {!showCustomerForm &&
                !showReview ? (
                  <button
                    type="button"
                    disabled={
                      !selectedService ||
                      !selectedDate ||
                      !selectedSlot
                    }
                    onClick={openCustomerForm}
                    className="group mt-7 flex w-full items-center justify-center gap-3 bg-[#b08a5a] px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#171512] transition-all duration-300 hover:bg-[#c09a6c] hover:shadow-[0_15px_45px_rgba(176,138,90,.15)] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#403b34] disabled:text-[#777169]"
                  >
                    Continuar

                    <ArrowRight
                      size={15}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </button>
                ) : (
                  <div className="mt-7 border border-[#b08a5a]/25 bg-[#b08a5a]/[0.05] p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        size={17}
                        className="mt-0.5 shrink-0 text-[#b08a5a]"
                      />

                      <div>
                        <p className="text-xs font-medium text-[#ddd6cc]">
                          {showReview
                            ? "Reserva lista para confirmar"
                            : "Reserva seleccionada"}
                        </p>

                        <p className="mt-1 text-[10px] leading-5 text-[#777169]">
                          {showReview
                            ? "Revisá toda la información antes de confirmar."
                            : "Completá tus datos para revisar y confirmar el turno."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <p className="mt-5 text-center text-[10px] leading-6 text-[#625e58]">
                  El turno todavía no está confirmado.
                </p>
              </div>
            </div>

            <div className="mt-3 border border-white/5 bg-[#141412] p-5">
              <div className="flex items-start gap-3">
                <Clock3
                  size={15}
                  className="mt-0.5 shrink-0 text-[#8d7655]"
                />

                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[#9b8465]">
                    Horarios
                  </p>

                  <p className="mt-1 text-xs leading-6 text-[#625e58]">
                    Lunes a viernes · 09:00 a 18:00
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {error && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="mt-8 border border-red-900/50 bg-red-950/20 p-5 text-sm leading-7 text-red-300"
          >
            <p className="font-medium">
              No pudimos completar la operación.
            </p>

            <p className="mt-1 text-red-300/80">
              {error}
            </p>
          </motion.div>
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

function SectionHeader({
  number,
  eyebrow,
  title,
  status,
}: {
  number: string;
  eyebrow: string;
  title: string;
  status: "complete" | "current" | "locked";
}) {
  return (
    <div className="border-b border-white/10 px-6 py-7 md:px-10">
      <div className="flex items-center gap-4">
        <StepBadge
          number={number}
          status={status}
        />

        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-[#9b8465]">
            {eyebrow}
          </p>

          <h2 className="mt-1 font-serif text-3xl md:text-4xl">
            {title}
          </h2>
        </div>
      </div>
    </div>
  );
}

function StepBadge({
  number,
  status,
}: {
  number: string;
  status: "complete" | "current" | "locked";
}) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[11px] transition-all duration-300 ${
        status === "complete"
          ? "border-[#b08a5a] bg-[#b08a5a] text-[#171512]"
          : status === "current"
            ? "border-[#b08a5a] text-[#b08a5a]"
            : "border-white/10 text-[#625e58]"
      }`}
    >
      {status === "complete" ? (
        <Check size={14} />
      ) : (
        number
      )}
    </div>
  );
}

function ReviewItem({
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

function SummaryLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="text-[9px] uppercase tracking-[0.28em] text-[#777169]">
      {children}
    </p>
  );
}

function SummaryHint({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mt-7 border-l border-[#7a6447] pl-4">
      <p className="text-[10px] leading-5 text-[#777169]">
        {children}
      </p>
    </div>
  );
}

function EmptySummary({
  step,
  text,
}: {
  step: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="text-[10px] tracking-[0.2em] text-[#625e58]">
        {step}
      </span>

      <p className="text-sm leading-6 text-[#777169]">
        {text}
      </p>
    </div>
  );
}

function LockedMessage({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="border border-white/5 bg-[#141412] p-6">
      <p className="text-sm leading-7 text-[#777169]">
        {children}
      </p>
    </div>
  );
}

function LoadingState({
  label,
}: {
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 border border-white/5 bg-[#141412] p-6 text-sm text-[#aaa198]">
      <span className="h-4 w-4 animate-spin rounded-full border border-[#7a6447] border-t-[#b08a5a]" />

      {label}
    </div>
  );
}

function InfoPill({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 border border-white/5 bg-[#141412] px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-[#777169]">
      <span className="text-[#9b8465]">
        {icon}
      </span>

      {label}
    </div>
  );
}