"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Scissors,
  Search,
  UserRound,
  X,
  Phone,
  CircleCheck,
  CircleX,
  UserPlus,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Appointment = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  notes: string | null;
  reservation_code: string | null;
  customer: { full_name: string; phone: string } | null;
  service: { name: string; price: number } | null;
  barber: { name: string } | null;
};

type CustomerOption = { id: string; full_name: string; phone: string | null };
type ServiceOption = { id: string; name: string; price: number };
type BarberOption = { id: string; name: string };

type ViewMode = "day" | "week";

type StatusMeta = {
  label: string;
  dot: string;
  badge: string;
};

const STATUS: Record<string, StatusMeta> = {
  pending: {
    label: "Pendiente",
    dot: "bg-amber-300",
    badge: "border-amber-300/20 bg-amber-300/[0.08] text-amber-200",
  },
  confirmed: {
    label: "Confirmado",
    dot: "bg-emerald-300",
    badge: "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-200",
  },
  completed: {
    label: "Completado",
    dot: "bg-sky-300",
    badge: "border-sky-300/20 bg-sky-300/[0.08] text-sky-200",
  },
  cancelled: {
    label: "Cancelado",
    dot: "bg-red-300",
    badge: "border-red-300/20 bg-red-300/[0.08] text-red-200",
  },
  no_show: {
    label: "No asistió",
    dot: "bg-orange-300",
    badge: "border-orange-300/20 bg-orange-300/[0.08] text-orange-200",
  },
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 9); // 09:00 — 21:00
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getStatus(status: string) {
  return STATUS[status?.toLowerCase()] ?? STATUS.confirmed;
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatDateLong(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateShort(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfWeek(date: Date) {
  const value = new Date(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, amount: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + amount);
  return value;
}

function isSameDay(a: Date, b: Date) {
  return dateKey(a) === dateKey(b);
}

function toDateTimeLocal(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function appointmentTop(startAt: string, dayStartHour = 9) {
  const date = new Date(startAt);
  return ((date.getHours() - dayStartHour) * 60 + date.getMinutes()) / 60 * 72;
}

function appointmentHeight(startAt: string, endAt: string) {
  const diff = Math.max(30, (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000);
  return Math.max(46, (diff / 60) * 72 - 4);
}

export default function TurnosPage() {
  const supabase = createClient();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBarber, setSelectedBarber] = useState("all");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [showNewAppointment, setShowNewAppointment] = useState(false);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [barberOptions, setBarberOptions] = useState<BarberOption[]>([]);
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newServiceId, setNewServiceId] = useState("");
  const [newBarberId, setNewBarberId] = useState("");
  const [newStartAt, setNewStartAt] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadAppointments(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    const { data, error: queryError } = await supabase
      .from("appointments")
      .select(`
        id,
        start_at,
        end_at,
        status,
        notes,
        reservation_code,
        customer:customers (
          full_name,
          phone
        ),
        service:services (
          name,
          price
        ),
        barber:barbers (
          name
        )
      `)
      .order("start_at", { ascending: true });

    if (queryError) {
      console.error("Error loading appointments:", queryError);
      setError("No se pudieron cargar los turnos.");
      setAppointments([]);
    } else {
      setAppointments((data ?? []) as unknown as Appointment[]);
    }

    setLoading(false);
    setRefreshing(false);
  }

  async function loadFormOptions() {
    const [customersResult, servicesResult, barbersResult] = await Promise.all([
      supabase.from("customers").select("id, full_name, phone").order("full_name"),
      supabase.from("services").select("id, name, price").order("name"),
      supabase.from("barbers").select("id, name").order("name"),
    ]);

    if (!customersResult.error) setCustomers((customersResult.data ?? []) as CustomerOption[]);
    if (!servicesResult.error) setServices((servicesResult.data ?? []) as ServiceOption[]);
    if (!barbersResult.error) setBarberOptions((barbersResult.data ?? []) as BarberOption[]);
  }

  useEffect(() => {
    loadAppointments();
    loadFormOptions();
    // The Supabase browser client is stable for this project.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const barbers = useMemo(() => {
    const names = appointments.map((a) => a.barber?.name).filter(Boolean) as string[];
    return Array.from(new Set(names));
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return appointments.filter((appointment) => {
      const matchesBarber = selectedBarber === "all" || appointment.barber?.name === selectedBarber;
      if (!matchesBarber) return false;
      if (!term) return true;
      return (
        appointment.customer?.full_name?.toLowerCase().includes(term) ||
        appointment.customer?.phone?.toLowerCase().includes(term) ||
        appointment.service?.name?.toLowerCase().includes(term) ||
        appointment.barber?.name?.toLowerCase().includes(term)
      );
    });
  }, [appointments, search, selectedBarber]);

  const dayAppointments = useMemo(() => {
    return filteredAppointments.filter((a) => isSameDay(new Date(a.start_at), selectedDate));
  }, [filteredAppointments, selectedDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [selectedDate]);

  const weekAppointments = useMemo(() => {
    const keys = new Set(weekDays.map(dateKey));
    return filteredAppointments.filter((a) => keys.has(dateKey(new Date(a.start_at))));
  }, [filteredAppointments, weekDays]);

  const visibleAppointments = viewMode === "day" ? dayAppointments : weekAppointments;

  const stats = useMemo(() => {
    const source = visibleAppointments;
    const active = source.filter((a) => !["cancelled", "no_show"].includes(a.status));
    const completed = source.filter((a) => a.status === "completed");
    const confirmed = source.filter((a) => a.status === "confirmed");
    const pending = source.filter((a) => a.status === "pending");
    const revenue = active.reduce((sum, a) => sum + Number(a.service?.price ?? 0), 0);
    const completedRevenue = completed.reduce((sum, a) => sum + Number(a.service?.price ?? 0), 0);
    return { total: source.length, active: active.length, completed: completed.length, confirmed: confirmed.length, pending: pending.length, revenue, completedRevenue };
  }, [visibleAppointments]);

  const periodLabel = useMemo(() => {
    if (viewMode === "day") return formatDateLong(selectedDate);
    const start = weekDays[0];
    const end = weekDays[6];
    const sameMonth = start.getMonth() === end.getMonth();
    const startText = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: sameMonth ? undefined : "short" }).format(start);
    const endText = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" }).format(end);
    return `${startText} — ${endText}`;
  }, [selectedDate, viewMode, weekDays]);

  const isToday = isSameDay(selectedDate, new Date());

  function navigatePeriod(amount: number) {
    const next = addDays(selectedDate, viewMode === "day" ? amount : amount * 7);
    setSelectedDate(next);
    setSelectedAppointment(null);
  }

  function goToday() {
    setSelectedDate(new Date());
    setSelectedAppointment(null);
  }

  async function updateStatus(appointment: Appointment, status: string) {
    setActionLoading(`${appointment.id}:${status}`);
    const { error: updateError } = await supabase.from("appointments").update({ status }).eq("id", appointment.id);

    if (updateError) {
      console.error("Error updating appointment:", updateError);
      setError("No se pudo actualizar el estado del turno.");
    } else {
      setAppointments((current) => current.map((item) => item.id === appointment.id ? { ...item, status } : item));
      setSelectedAppointment((current) => current?.id === appointment.id ? { ...current, status } : current);
    }
    setActionLoading("");
  }

  function openNewAppointment() {
    const base = new Date(selectedDate);
    base.setHours(10, 0, 0, 0);
    setNewStartAt(toDateTimeLocal(base));
    setNewCustomerId("");
    setNewServiceId("");
    setNewBarberId("");
    setNewNotes("");
    setCreateError("");
    setShowNewAppointment(true);
  }

  async function createAppointment() {
    setCreateError("");
    if (!newCustomerId || !newServiceId || !newStartAt) {
      setCreateError("Completá cliente, servicio y horario.");
      return;
    }

    const selectedService = services.find((service) => service.id === newServiceId);
    const start = new Date(newStartAt);
    const duration = 30;
    const end = new Date(start.getTime() + duration * 60000);

    setCreating(true);
    const payload: Record<string, unknown> = {
      customer_id: newCustomerId,
      service_id: newServiceId,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: "confirmed",
      notes: newNotes.trim() || null,
    };
    if (newBarberId) payload.barber_id = newBarberId;

    const { error: insertError } = await supabase.from("appointments").insert(payload);

    if (insertError) {
      console.error("Error creating appointment:", insertError);
      setCreateError("No se pudo crear el turno. Revisá los datos e intentá nuevamente.");
      setCreating(false);
      return;
    }

    setCreating(false);
    setShowNewAppointment(false);
    await loadAppointments(true);
  }

  return (
    <div className="min-h-screen bg-[#080909] text-[#f4f4f2] selection:bg-[#ff5a00]/30">
      <style jsx>{`
        .agenda-shell {
          background:
            radial-gradient(circle at 76% -10%, rgba(255,90,0,.075), transparent 28%),
            linear-gradient(180deg, rgba(255,255,255,.012), transparent 18%);
        }
        .panel {
          background: rgba(15,16,16,.82);
          border: 1px solid rgba(255,255,255,.075);
          box-shadow: 0 18px 55px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.018);
          backdrop-filter: blur(16px);
        }
        .hairline { border-color: rgba(255,255,255,.065); }
        .soft-text { color: rgba(245,245,244,.68); }
        .muted-text { color: rgba(245,245,244,.43); }
        .tiny-label { color: rgba(245,245,244,.38); letter-spacing: .14em; }
        .orange-line { box-shadow: inset 2px 0 0 #ff5a00; }
        .appointment-card { transition: transform .18s ease, border-color .18s ease, background .18s ease; }
        .appointment-card:hover { transform: translateY(-1px); border-color: rgba(255,90,0,.30); background: rgba(255,255,255,.045); }
        .grid-line { border-color: rgba(255,255,255,.045); }
        .scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,.10); border-radius: 999px; }
      `}</style>

      <div className="agenda-shell min-h-screen">
        <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#080909]/90 backdrop-blur-xl">
          <div className="mx-auto max-w-[1800px] px-6 py-5 xl:px-8">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.20em] text-[#ff6a18]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ff5a00] shadow-[0_0_12px_rgba(255,90,0,.55)]" />
                  Operations / Schedule
                </div>
                <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                  <h1 className="text-[30px] font-semibold tracking-[-0.04em] text-white sm:text-[34px]">Agenda</h1>
                  <span className="mb-1 text-sm text-white/35">{periodLabel}</span>
                </div>
                <p className="mt-1 text-sm text-white/55">Control operativo de turnos, disponibilidad y atención.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-xl border border-white/[0.08] bg-white/[0.025] p-1">
                  {(["day", "week"] as ViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => { setViewMode(mode); setSelectedAppointment(null); }}
                      className={`rounded-lg px-3 py-2 text-xs font-medium transition ${viewMode === mode ? "bg-white/[0.09] text-white" : "text-white/45 hover:text-white/75"}`}
                    >
                      {mode === "day" ? "Día" : "Semana"}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => loadAppointments(true)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] text-white/55 transition hover:border-white/15 hover:text-white" aria-label="Actualizar agenda">
                  <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
                </button>
                <button type="button" onClick={openNewAppointment} className="group flex items-center gap-2 rounded-xl bg-[#ff5a00] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(255,90,0,.14)] transition hover:bg-[#ff6a18] hover:shadow-[0_12px_35px_rgba(255,90,0,.22)]">
                  <Plus size={16} className="transition group-hover:rotate-90" />
                  Nuevo turno
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1800px] px-6 py-6 xl:px-8 xl:py-8">
          <section className="panel mb-5 rounded-2xl p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => navigatePeriod(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-white/55 transition hover:border-white/15 hover:text-white"><ChevronLeft size={17} /></button>
                <button type="button" onClick={goToday} className={`h-10 rounded-xl border px-4 text-xs font-semibold transition ${isToday ? "border-[#ff5a00]/35 bg-[#ff5a00]/10 text-[#ff8a52]" : "border-white/[0.07] bg-white/[0.025] text-white/65 hover:border-white/15 hover:text-white"}`}>Hoy</button>
                <button type="button" onClick={() => navigatePeriod(1)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-white/55 transition hover:border-white/15 hover:text-white"><ChevronRight size={17} /></button>
                <div className="ml-2 hidden h-7 w-px bg-white/[0.07] sm:block" />
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold capitalize text-white/85">{viewMode === "day" ? formatDateLong(selectedDate) : `Semana del ${formatDateShort(weekDays[0])}`}</p>
                  <p className="mt-0.5 text-[11px] text-white/35">Don Segundo · Operación diaria</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-[230px]">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente, servicio..." className="h-10 w-full rounded-xl border border-white/[0.07] bg-white/[0.025] pl-9 pr-3 text-xs text-white outline-none placeholder:text-white/25 focus:border-[#ff5a00]/35" />
                </div>
                <div className="relative">
                  <select value={selectedBarber} onChange={(e) => setSelectedBarber(e.target.value)} className="h-10 min-w-[150px] appearance-none rounded-xl border border-white/[0.07] bg-[#0d0e0e] px-3 pr-8 text-xs text-white/65 outline-none focus:border-[#ff5a00]/35">
                    <option value="all">Todos los barberos</option>
                    {barbers.map((barber) => <option key={barber} value={barber}>{barber}</option>)}
                  </select>
                  <UserRound size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/25" />
                </div>
              </div>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-5">
            <Metric label="Turnos" value={stats.total.toString()} detail={viewMode === "day" ? "en el día" : "en la semana"} icon={<CalendarDays size={15} />} />
            <Metric label="Confirmados" value={stats.confirmed.toString()} detail={`${stats.pending} pendientes`} icon={<CircleCheck size={15} />} accent />
            <Metric label="Completados" value={stats.completed.toString()} detail="atendidos" icon={<Check size={15} />} />
            <Metric label="Ingresos estimados" value={`$${stats.revenue.toLocaleString("es-AR")}`} detail={`$${stats.completedRevenue.toLocaleString("es-AR")} realizados`} icon={<Scissors size={15} />} />
            <Metric label="Estado operativo" value={loading ? "—" : stats.total > 0 ? "Activo" : "Libre"} detail={stats.total > 0 ? "hay actividad" : "sin reservas"} icon={<Sparkles size={15} />} accent className="col-span-2 xl:col-span-1" />
          </section>

          {error && (
            <div className="mb-5 flex items-center justify-between rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-3 text-xs text-red-200">
              <span>{error}</span>
              <button type="button" onClick={() => setError("")} className="text-red-200/60 hover:text-red-100"><X size={15} /></button>
            </div>
          )}

          {viewMode === "day" ? (
            <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_390px]">
              <section className="panel overflow-hidden rounded-2xl">
                <div className="flex items-center justify-between border-b hairline px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold text-white">Timeline operativo</p>
                    <p className="mt-0.5 text-[11px] text-white/38">09:00 — 21:00 · {dayAppointments.length} turnos visibles</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-white/38">
                    <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-emerald-300" />Confirmado</span>
                    <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-amber-300" />Pendiente</span>
                  </div>
                </div>

                {loading ? (
                  <SkeletonTimeline />
                ) : dayAppointments.length === 0 ? (
                  <EmptyAgenda onCreate={openNewAppointment} />
                ) : (
                  <div className="scrollbar overflow-x-auto">
                    <div className="relative min-w-[760px]">
                      {HOURS.map((hour) => (
                        <div key={hour} className="grid grid-cols-[82px_1fr]" style={{ height: 72 }}>
                          <div className="border-r grid-line px-5 pt-2 text-[10px] font-medium tabular-nums text-white/28">{String(hour).padStart(2, "0")}:00</div>
                          <div className="relative border-b grid-line">
                            <div className="absolute left-0 right-0 top-[35px] border-t border-dashed border-white/[0.025]" />
                          </div>
                        </div>
                      ))}
                      <div className="absolute inset-y-0 left-[82px] right-0">
                        {dayAppointments.map((appointment) => {
                          const status = getStatus(appointment.status);
                          return (
                            <button
                              type="button"
                              key={appointment.id}
                              onClick={() => setSelectedAppointment(appointment)}
                              className={`appointment-card absolute left-3 right-5 overflow-hidden rounded-xl border border-white/[0.09] bg-[#151717] px-4 py-2.5 text-left ${appointment.status === "cancelled" ? "opacity-55" : ""}`}
                              style={{ top: appointmentTop(appointment.start_at), height: appointmentHeight(appointment.start_at, appointment.end_at) }}
                            >
                              <div className={`absolute inset-y-0 left-0 w-[2px] ${status.dot}`} />
                              <div className="flex items-start justify-between gap-3 pl-1">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[12px] font-semibold tabular-nums text-white">{formatTime(appointment.start_at)}</span>
                                    <span className="text-[10px] text-white/30">→ {formatTime(appointment.end_at)}</span>
                                  </div>
                                  <p className="mt-1 truncate text-sm font-semibold text-white/90">{appointment.customer?.full_name ?? "Cliente sin nombre"}</p>
                                  <div className="mt-1 flex items-center gap-3 truncate text-[10px] text-white/42">
                                    <span className="flex items-center gap-1"><Scissors size={10} />{appointment.service?.name ?? "Servicio"}</span>
                                    {appointment.barber?.name && <span className="flex items-center gap-1"><UserRound size={10} />{appointment.barber.name}</span>}
                                  </div>
                                </div>
                                <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-medium ${status.badge}`}><span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <DetailPanel appointment={selectedAppointment} onClose={() => setSelectedAppointment(null)} onStatus={updateStatus} actionLoading={actionLoading} />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              <section className="panel overflow-hidden rounded-2xl">
                <div className="grid grid-cols-7 border-b hairline">
                  {weekDays.map((day, index) => {
                    const count = weekAppointments.filter((a) => isSameDay(new Date(a.start_at), day)).length;
                    const active = isSameDay(day, selectedDate);
                    const today = isSameDay(day, new Date());
                    return (
                      <button key={dateKey(day)} type="button" onClick={() => { setSelectedDate(day); setViewMode("day"); }} className={`group border-r hairline px-3 py-4 text-left transition last:border-r-0 hover:bg-white/[0.025] ${active ? "bg-[#ff5a00]/[0.035]" : ""}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-semibold uppercase tracking-[.16em] ${active ? "text-[#ff7b3b]" : "text-white/35"}`}>{WEEKDAYS[index]}</span>
                          {today && <span className="h-1.5 w-1.5 rounded-full bg-[#ff5a00] shadow-[0_0_10px_rgba(255,90,0,.65)]" />}
                        </div>
                        <div className="mt-2 flex items-end justify-between">
                          <span className={`text-2xl font-semibold tracking-[-.04em] ${active ? "text-white" : "text-white/75"}`}>{day.getDate()}</span>
                          <span className="text-[10px] text-white/30">{count} turnos</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="scrollbar overflow-x-auto">
                  <div className="min-w-[1000px] p-4">
                    <div className="grid grid-cols-7 gap-2">
                      {weekDays.map((day) => {
                        const items = weekAppointments.filter((a) => isSameDay(new Date(a.start_at), day));
                        return (
                          <div key={dateKey(day)} className="min-h-[500px] rounded-xl border border-white/[0.055] bg-white/[0.012] p-2">
                            {items.length === 0 ? (
                              <div className="flex min-h-[480px] items-center justify-center text-[10px] text-white/18">Libre</div>
                            ) : (
                              <div className="space-y-2">
                                {items.map((appointment) => {
                                  const status = getStatus(appointment.status);
                                  return (
                                    <button key={appointment.id} type="button" onClick={() => setSelectedAppointment(appointment)} className="appointment-card w-full rounded-lg border border-white/[0.065] bg-[#111313] p-3 text-left">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-semibold tabular-nums text-white">{formatTime(appointment.start_at)}</span>
                                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                                      </div>
                                      <p className="mt-2 truncate text-xs font-semibold text-white/85">{appointment.customer?.full_name ?? "Sin nombre"}</p>
                                      <p className="mt-1 truncate text-[10px] text-white/38">{appointment.service?.name ?? "Servicio"}</p>
                                      {appointment.barber?.name && <p className="mt-1 truncate text-[10px] text-white/28">{appointment.barber.name}</p>}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
              <DetailPanel appointment={selectedAppointment} onClose={() => setSelectedAppointment(null)} onStatus={updateStatus} actionLoading={actionLoading} />
            </div>
          )}
        </main>
      </div>

      {showNewAppointment && (
        <NewAppointmentModal
          customers={customers}
          services={services}
          barbers={barberOptions}
          customerId={newCustomerId}
          serviceId={newServiceId}
          barberId={newBarberId}
          startAt={newStartAt}
          notes={newNotes}
          error={createError}
          creating={creating}
          setCustomerId={setNewCustomerId}
          setServiceId={setNewServiceId}
          setBarberId={setNewBarberId}
          setStartAt={setNewStartAt}
          setNotes={setNewNotes}
          onClose={() => setShowNewAppointment(false)}
          onCreate={createAppointment}
        />
      )}
    </div>
  );
}

function Metric({ label, value, detail, icon, accent = false, className = "" }: { label: string; value: string; detail: string; icon: React.ReactNode; accent?: boolean; className?: string }) {
  return (
    <div className={`panel relative overflow-hidden rounded-2xl p-4 ${className}`}>
      {accent && <div className="absolute left-0 top-0 h-px w-1/2 bg-gradient-to-r from-[#ff5a00]/70 to-transparent" />}
      <div className="flex items-center justify-between">
        <span className={`flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.16em] ${accent ? "text-white/52" : "text-white/38"}`}>{icon}{label}</span>
        <span className="text-[9px] text-white/22">LIVE</span>
      </div>
      <p className="mt-3 text-[25px] font-semibold tracking-[-.04em] tabular-nums text-white">{value}</p>
      <p className="mt-1 text-[10px] text-white/32">{detail}</p>
    </div>
  );
}

function SkeletonTimeline() {
  return <div className="space-y-0 p-5">{Array.from({ length: 7 }, (_, i) => <div key={i} className="h-16 animate-pulse border-b border-white/[0.035] bg-white/[0.012]" />)}</div>;
}

function EmptyAgenda({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[650px] flex-col items-center justify-center px-6 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.025]">
        <CalendarDays size={23} className="text-white/30" />
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#ff5a00] shadow-[0_0_14px_rgba(255,90,0,.55)]" />
      </div>
      <h3 className="mt-5 text-sm font-semibold text-white/80">Agenda libre</h3>
      <p className="mt-2 max-w-sm text-xs leading-5 text-white/35">No hay turnos registrados para este día con los filtros actuales.</p>
      <button type="button" onClick={onCreate} className="mt-5 flex items-center gap-2 rounded-xl bg-[#ff5a00] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#ff6a18]"><Plus size={14} />Crear turno</button>
    </div>
  );
}

function DetailPanel({ appointment, onClose, onStatus, actionLoading }: { appointment: Appointment | null; onClose: () => void; onStatus: (appointment: Appointment, status: string) => void; actionLoading: string }) {
  if (!appointment) {
    return (
      <aside className="panel h-fit overflow-hidden rounded-2xl">
        <div className="border-b hairline px-5 py-4"><p className="text-sm font-semibold text-white">Detalle</p><p className="mt-0.5 text-[11px] text-white/35">Seleccioná un turno para abrir Customer + Appointment 360.</p></div>
        <div className="flex min-h-[420px] flex-col items-center justify-center px-8 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025]"><Clock3 size={18} className="text-white/25" /></div><p className="mt-4 text-xs font-medium text-white/55">Sin selección</p><p className="mt-1 max-w-[220px] text-[10px] leading-5 text-white/25">Elegí un turno de la agenda para gestionar su estado y consultar la información del cliente.</p></div>
      </aside>
    );
  }

  const status = getStatus(appointment.status);
  const completed = appointment.status === "completed";
  const cancelled = appointment.status === "cancelled";

  return (
    <aside className="panel h-fit overflow-hidden rounded-2xl 2xl:sticky 2xl:top-[118px]">
      <div className="flex items-start justify-between border-b hairline px-5 py-4">
        <div><p className="text-sm font-semibold text-white">Detalle del turno</p><p className="mt-0.5 text-[10px] text-white/35">Appointment 360</p></div>
        <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-white/30 hover:bg-white/[0.04] hover:text-white"><X size={14} /></button>
      </div>

      <div className="p-5">
        <div className="rounded-xl border border-white/[0.065] bg-white/[0.018] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-white/30">Cliente</p><p className="mt-2 truncate text-lg font-semibold tracking-[-.025em] text-white">{appointment.customer?.full_name ?? "Cliente sin nombre"}</p></div>
            <span className={`shrink-0 rounded-full border px-2 py-1 text-[9px] ${status.badge}`}><span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</span>
          </div>
          {appointment.customer?.phone && <p className="mt-2 flex items-center gap-1.5 text-xs text-white/40"><Phone size={11} />{appointment.customer.phone}</p>}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Info label="Horario" value={`${formatTime(appointment.start_at)} — ${formatTime(appointment.end_at)}`} icon={<Clock3 size={12} />} />
          <Info label="Servicio" value={appointment.service?.name ?? "Servicio"} icon={<Scissors size={12} />} />
          <Info label="Barbero" value={appointment.barber?.name ?? "Sin asignar"} icon={<UserRound size={12} />} />
          <Info label="Importe" value={`$${Number(appointment.service?.price ?? 0).toLocaleString("es-AR")}`} icon={<span className="text-[11px]">$</span>} />
        </div>

        {appointment.notes && <div className="mt-4"><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-white/30">Observaciones</p><p className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.018] p-3 text-xs leading-5 text-white/48">{appointment.notes}</p></div>}

        {appointment.reservation_code && <div className="mt-4 flex items-center justify-between border-t hairline pt-4"><span className="text-[9px] font-semibold uppercase tracking-[.15em] text-white/28">Reserva</span><span className="font-mono text-[10px] text-white/42">{appointment.reservation_code}</span></div>}

        <div className="mt-5 border-t hairline pt-5">
          <p className="mb-3 text-[9px] font-semibold uppercase tracking-[.16em] text-white/30">Acciones</p>
          <div className="grid grid-cols-2 gap-2">
            {!completed && !cancelled && <button type="button" disabled={!!actionLoading} onClick={() => onStatus(appointment, "completed")} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2.5 text-[10px] font-semibold text-emerald-200 transition hover:bg-emerald-300/[0.10] disabled:opacity-40"><Check size={13} />{actionLoading === `${appointment.id}:completed` ? "Guardando..." : "Completar"}</button>}
            {!completed && !cancelled && <button type="button" disabled={!!actionLoading} onClick={() => onStatus(appointment, "no_show")} className="flex items-center justify-center gap-2 rounded-xl border border-orange-300/15 bg-orange-300/[0.05] px-3 py-2.5 text-[10px] font-semibold text-orange-200 transition hover:bg-orange-300/[0.09] disabled:opacity-40"><CircleX size={13} />No asistió</button>}
            {!completed && !cancelled && <button type="button" disabled={!!actionLoading} onClick={() => onStatus(appointment, "cancelled")} className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-red-300/10 bg-red-300/[0.035] px-3 py-2.5 text-[10px] font-semibold text-red-200/80 transition hover:bg-red-300/[0.07] disabled:opacity-40"><X size={13} />Cancelar turno</button>}
            {completed && <div className="col-span-2 rounded-xl border border-sky-300/15 bg-sky-300/[0.05] px-3 py-2.5 text-center text-[10px] font-semibold text-sky-200">Turno completado correctamente</div>}
            {cancelled && <div className="col-span-2 rounded-xl border border-red-300/15 bg-red-300/[0.05] px-3 py-2.5 text-center text-[10px] font-semibold text-red-200">Turno cancelado</div>}
          </div>
        </div>
      </div>
    </aside>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-white/[0.055] bg-white/[0.014] p-3"><p className="flex items-center gap-1.5 text-[9px] uppercase tracking-[.12em] text-white/28">{icon}{label}</p><p className="mt-2 truncate text-xs font-medium text-white/72">{value}</p></div>;
}

function NewAppointmentModal({ customers, services, barbers, customerId, serviceId, barberId, startAt, notes, error, creating, setCustomerId, setServiceId, setBarberId, setStartAt, setNotes, onClose, onCreate }: {
  customers: CustomerOption[]; services: ServiceOption[]; barbers: BarberOption[]; customerId: string; serviceId: string; barberId: string; startAt: string; notes: string; error: string; creating: boolean;
  setCustomerId: (v: string) => void; setServiceId: (v: string) => void; setBarberId: (v: string) => void; setStartAt: (v: string) => void; setNotes: (v: string) => void; onClose: () => void; onCreate: () => void;
}) {
  const selectedService = services.find((service) => service.id === serviceId);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.09] bg-[#101111] shadow-[0_35px_100px_rgba(0,0,0,.55)]">
        <div className="flex items-start justify-between border-b hairline px-6 py-5"><div><div className="mb-1 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[.18em] text-[#ff6a18]"><Plus size={12} />Nueva operación</div><h2 className="text-lg font-semibold tracking-[-.025em] text-white">Crear turno</h2><p className="mt-1 text-[11px] text-white/35">Agregá una nueva reserva a la agenda.</p></div><button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:bg-white/[0.04] hover:text-white"><X size={15} /></button></div>
        <div className="space-y-4 p-6">
          <Field label="Cliente" icon={<UserRound size={12} />}><select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="field"><option value="">Seleccionar cliente...</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}</select></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label="Servicio" icon={<Scissors size={12} />}><select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="field"><option value="">Seleccionar servicio...</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} · ${Number(service.price).toLocaleString("es-AR")}</option>)}</select></Field><Field label="Barbero" icon={<UserRound size={12} />}><select value={barberId} onChange={(e) => setBarberId(e.target.value)} className="field"><option value="">Sin asignar</option>{barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}</select></Field></div>
          <Field label="Fecha y hora" icon={<CalendarDays size={12} />}><input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="field" /></Field>
          <Field label="Observaciones" icon={<MoreHorizontal size={12} />}><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notas para el equipo..." className="field resize-none" /></Field>
          {selectedService && <div className="rounded-xl border border-[#ff5a00]/15 bg-[#ff5a00]/[0.045] px-3 py-2.5 text-[10px] text-white/48">Duración estimada: <span className="font-semibold text-white/70">30 min</span> · Estado inicial: <span className="font-semibold text-emerald-200">Confirmado</span></div>}
          {error && <div className="flex items-center gap-2 rounded-xl border border-red-300/15 bg-red-300/[0.05] px-3 py-2.5 text-[10px] text-red-200"><AlertCircle size={13} />{error}</div>}
        </div>
        <div className="flex items-center justify-end gap-2 border-t hairline bg-white/[0.012] px-6 py-4"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-medium text-white/45 transition hover:text-white">Cancelar</button><button type="button" disabled={creating} onClick={onCreate} className="flex items-center gap-2 rounded-xl bg-[#ff5a00] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#ff6a18] disabled:cursor-not-allowed disabled:opacity-50">{creating ? <><RefreshCw size={13} className="animate-spin" />Creando...</> : <><Plus size={13} />Crear turno</>}</button></div>
      </div>
      <style jsx>{`.field{width:100%;border:1px solid rgba(255,255,255,.075);border-radius:12px;background:#0b0c0c;color:rgba(255,255,255,.78);padding:10px 12px;font-size:12px;outline:none}.field:focus{border-color:rgba(255,90,0,.4)}.field::placeholder{color:rgba(255,255,255,.22)}`}</style>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[.14em] text-white/34">{icon}{label}</span>{children}</label>;
}
