"use client";

import KpiCard from "@/components/admin/ui/KpiCard";
import { formatMoney } from "@/components/admin/format";
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
  Pencil,
} from "lucide-react";
import { manrope, sora, dataFont } from "@/components/admin/fonts";
import { createClient } from "@/lib/supabase/client";
import DateTimeField from "@/components/admin/ui/DateTimeField";


type Appointment = {
  id: string;
  customer_id: string | null;
  service_id: string | null;
  barber_id: string | null;
  start_at: string;
  end_at: string;
  status: string;
  notes: string | null;
  reservation_code: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancelled_by_email?: string | null;
  no_show_at?: string | null;
  customer: { full_name: string; phone: string } | null;
  service: { name: string; price: number } | null;
  barber: { name: string } | null;
};

type CustomerOption = { id: string; full_name: string; phone: string | null };
type ServiceOption = { id: string; name: string; price: number; duration_minutes?: number | null };
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

const HOUR_HEIGHT = 104; // px por hora en la línea de tiempo (30 min = 52px)
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 20;
const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function getStatus(status: string) {
  return STATUS[status?.toLowerCase()] ?? STATUS.confirmed;
}

/* Turno que ya terminó y sigue como confirmado/pendiente: falta marcar
   si se atendió o si el cliente no vino. */
function isUnregistered(appointment: { status: string; end_at: string }) {
  return (
    ["confirmed", "pending"].includes(appointment.status) &&
    new Date(appointment.end_at).getTime() < Date.now()
  );
}

const UNREGISTERED: StatusMeta = {
  label: "Sin registrar",
  dot: "bg-amber-300",
  badge: "border-amber-300/25 bg-amber-300/[0.10] text-amber-200",
};

function displayStatus(appointment: { status: string; end_at: string }) {
  return isUnregistered(appointment) ? UNREGISTERED : getStatus(appointment.status);
}

function formatAuditDate(value: string | null | undefined) {
  if (!value) return "";

  return new Date(value).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

/* Quién canceló / cuándo se marcó la ausencia. */
function auditText(appointment: {
  status: string;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancelled_by_email?: string | null;
  no_show_at?: string | null;
}) {
  if (appointment.status === "cancelled" || appointment.status === "canceled") {
    const when = appointment.cancelled_at ? ` · ${formatAuditDate(appointment.cancelled_at)}` : "";

    if (appointment.cancelled_by === "cliente") return `Lo canceló el cliente desde la web${when}`;
    if (appointment.cancelled_by === "admin") {
      return `Cancelado desde el panel${appointment.cancelled_by_email ? ` (${appointment.cancelled_by_email})` : ""}${when}`;
    }

    return "Turno cancelado";
  }

  if (appointment.status === "no_show") {
    return `El cliente no asistió${appointment.no_show_at ? ` · registrado ${formatAuditDate(appointment.no_show_at)}` : ""}`;
  }

  return "";
}

function shortAudit(appointment: { status: string; cancelled_by?: string | null }) {
  if (appointment.status === "cancelled" || appointment.status === "canceled") {
    if (appointment.cancelled_by === "cliente") return "Canceló el cliente";
    if (appointment.cancelled_by === "admin") return "Cancelado por el panel";
  }

  return "";
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

function appointmentTop(startAt: string, dayStartHour: number) {
  const date = new Date(startAt);
  return ((date.getHours() - dayStartHour) * 60 + date.getMinutes()) / 60 * HOUR_HEIGHT + 2;
}

function appointmentHeight(startAt: string, endAt: string) {
  const diff = Math.max(30, (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000);
  return (diff / 60) * HOUR_HEIGHT - 4;
}

/* Turnos que se superponen en el horario (ej. uno cancelado y otro nuevo
   a la misma hora) se reparten en columnas, uno al lado del otro, en vez
   de dibujarse encima. Los activos van primero; los cancelados después. */
function layoutLanes(items: { id: string; start_at: string; end_at: string; status: string }[]) {
  const isInactive = (status: string) => ["cancelled", "canceled", "no_show"].includes(status);
  const sorted = [...items].sort(
    (a, b) =>
      new Date(a.start_at).getTime() - new Date(b.start_at).getTime() ||
      Number(isInactive(a.status)) - Number(isInactive(b.status))
  );

  const result = new Map<string, { lane: number; lanes: number }>();
  let cluster: { id: string; end: number; lane: number }[] = [];
  let clusterEnd = -Infinity;

  const closeCluster = () => {
    const lanes = cluster.reduce((max, item) => Math.max(max, item.lane + 1), 1);
    for (const item of cluster) result.set(item.id, { lane: item.lane, lanes });
    cluster = [];
  };

  for (const item of sorted) {
    const start = new Date(item.start_at).getTime();
    const end = Math.max(new Date(item.end_at).getTime(), start + 30 * 60000);

    if (start >= clusterEnd) {
      closeCluster();
      clusterEnd = -Infinity;
    }

    // Primera columna libre dentro del grupo.
    const busy = new Set(cluster.filter((other) => other.end > start).map((other) => other.lane));
    let lane = 0;
    while (busy.has(lane)) lane += 1;

    cluster.push({ id: item.id, end, lane });
    clusterEnd = Math.max(clusterEnd, end);
  }

  closeCluster();

  return result;
}

/* Rango de horas visible: 08 a 20 por defecto, ampliado si hay turnos
   antes o después (ej. un turno cargado a las 21:00). */
function getVisibleHours(items: { start_at: string; end_at: string }[]) {
  let start = DEFAULT_START_HOUR;
  let end = DEFAULT_END_HOUR;

  items.forEach((item) => {
    start = Math.min(start, new Date(item.start_at).getHours());
    const finish = new Date(item.end_at);
    end = Math.max(end, finish.getHours() + (finish.getMinutes() > 0 ? 1 : 0));
  });

  return Array.from({ length: end - start }, (_, index) => start + index);
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
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [barberOptions, setBarberOptions] = useState<BarberOption[]>([]);
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newServiceId, setNewServiceId] = useState("");
  const [newBarberId, setNewBarberId] = useState("");
  const [newStartAt, setNewStartAt] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newAttended, setNewAttended] = useState(false);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  async function loadAppointments(showRefresh = false) {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    const baseColumns = `
        id,
        customer_id,
        service_id,
        barber_id,
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
        )`;

    // Registro de cancelaciones / ausencias (migración 12). Si todavía no
    // se corrió, se vuelve a pedir sin esas columnas.
    const withAudit = await supabase
      .from("appointments")
      .select(`${baseColumns}, cancelled_at, cancelled_by, cancelled_by_email, no_show_at`)
      .order("start_at", { ascending: true });

    let data: unknown[] | null = withAudit.data;
    let queryError = withAudit.error;

    if (queryError) {
      const basic = await supabase
        .from("appointments")
        .select(baseColumns)
        .order("start_at", { ascending: true });

      data = basic.data;
      queryError = basic.error;
    }

    let list: Appointment[] = [];

    if (queryError) {
      console.error("Error loading appointments:", queryError);
      setError("No se pudieron cargar los turnos.");
      setAppointments([]);
    } else {
      list = (data ?? []) as unknown as Appointment[];
      setAppointments(list);
    }

    setLoading(false);
    setRefreshing(false);

    return list;
  }

  async function loadFormOptions() {
    const [customersResult, servicesResult, barbersResult] = await Promise.all([
      supabase.from("customers").select("id, full_name, phone").order("full_name"),
      supabase.from("services").select("id, name, price, duration_minutes").order("name"),
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

  const visibleHours = useMemo(() => getVisibleHours(dayAppointments), [dayAppointments]);

  // Columnas para turnos superpuestos en la línea de tiempo.
  const dayLanes = useMemo(() => layoutLanes(dayAppointments), [dayAppointments]);

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
  setError("");

  try {
    console.log("=== BARBEROS · ACTUALIZANDO TURNO ===");
    console.log("appointment_id:", appointment.id);
    console.log("nuevo status:", status);

    const { error: updateError } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", appointment.id);

    if (updateError) {
      console.error("=== BARBEROS · ERROR REAL DE SUPABASE ===");
      console.error("appointment_id:", appointment.id);
      console.error("requested_status:", status);
      console.error("message:", updateError.message);
      console.error("details:", updateError.details);
      console.error("hint:", updateError.hint);
      console.error("code:", updateError.code);
      console.error("========================================");

      setError(
        updateError.message ||
          "Supabase rechazó la actualización del estado del turno."
      );

      return;
    }

    console.log("=== BARBEROS · UPDATE ENVIADO CORRECTAMENTE ===");

    // Actualizamos la interfaz inmediatamente
    setAppointments((current) =>
      current.map((item) =>
        item.id === appointment.id
          ? { ...item, status }
          : item
      )
    );

    setSelectedAppointment((current) =>
      current?.id === appointment.id
        ? { ...current, status }
        : current
    );

    // Volvemos a consultar Supabase para comprobar que realmente quedó guardado.
    await loadAppointments(true);

    console.log("=== BARBEROS · AGENDA RECARGADA DESDE SUPABASE ===");
  } catch (unexpectedError) {
    console.error(
      "=== BARBEROS · ERROR INESPERADO ===",
      unexpectedError
    );

    setError(
      unexpectedError instanceof Error
        ? unexpectedError.message
        : "Ocurrió un error inesperado al actualizar el turno."
    );
  } finally {
    setActionLoading("");
  }
}

  function openNewAppointment() {
    const base = new Date(selectedDate);
    base.setHours(10, 0, 0, 0);
    setNewStartAt(toDateTimeLocal(base));
    setNewCustomerId("");
    setNewServiceId("");
    setNewBarberId("");
    setNewNotes("");
    setNewAttended(false);
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
    const duration = Math.max(5, Number(selectedService?.duration_minutes ?? 30));
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

    const { data: created, error: insertError } = await supabase
      .from("appointments")
      .insert(payload)
      .select("id")
      .single();

    if (insertError || !created) {
      console.error(
        "Error creating appointment:",
        insertError?.code,
        insertError?.message,
        insertError?.details,
        insertError?.hint
      );
      setCreateError(
        insertError?.code === "42501"
          ? `La base rechazó el turno por permisos (${insertError.message}). Revisá que estén aplicadas las migraciones de Supabase.`
          : `No se pudo crear el turno: ${insertError?.message ?? "error desconocido"}`
      );
      setCreating(false);
      return;
    }

    /*
      Turno que ya ocurrió (ej. el cliente vino sin reservar): se crea
      confirmado y se marca como completado en un segundo paso, igual que
      cuando Manu toca "Completar". Así se dispara la misma lógica de la
      base que suma la visita y los puntos de fidelización.
    */
    if (newAttended) {
      const { error: completeError } = await supabase
        .from("appointments")
        .update({ status: "completed" })
        .eq("id", created.id);

      if (completeError) {
        console.error("Error completing appointment:", completeError?.code, completeError?.message, completeError?.details);
        setCreateError("El turno se creó, pero no se pudo marcar como atendido. Marcalo con \"Completar\" desde la agenda.");
        setCreating(false);
        await loadAppointments(true);
        return;
      }
    }

    setCreating(false);
    setShowNewAppointment(false);
    setSelectedDate(start);
    await loadAppointments(true);
  }

  function selectAppointment(appointment: Appointment) {
    setSelectedAppointment(appointment);

    // En celular/tablet el detalle está debajo de la agenda: lo mostramos.
    if (window.innerWidth < 1536) {
      window.setTimeout(() => {
        document.getElementById("appointment-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    }
  }

  async function saveAppointmentEdit(changes: AppointmentChanges): Promise<string | null> {
    if (!editingAppointment) return "No hay turno seleccionado.";

    const { error: updateError } = await supabase
      .from("appointments")
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq("id", editingAppointment.id);

    if (updateError) {
      console.error("Error editing appointment:", updateError.code, updateError.message, updateError.details);
      return `No se pudo guardar: ${updateError.message}`;
    }

    const fresh = await loadAppointments(true);
    const updated = fresh.find((item) => item.id === editingAppointment.id) ?? null;

    setSelectedAppointment(updated);
    if (changes.start_at) setSelectedDate(new Date(changes.start_at));
    setEditingAppointment(null);

    return null;
  }

  return (
    <div className={`${manrope.variable} ${sora.variable} ${dataFont.variable} min-h-screen text-[#f5f5f4] selection:bg-[#ff5a00]/30`}>
      <style jsx global>{`
        .agenda-shell {
          --ink: #070707; --surface: #0b0b0b; --surface-2: #0f0f0f;
          --line: rgba(255,255,255,.075); --line-soft: rgba(255,255,255,.05);
          --orange: #ff5a00; --orange-bright: #ff7a22;
          font-family: var(--font-barberos-ui), Manrope, sans-serif;
          background: radial-gradient(720px 360px at 88% -8%, rgba(255,90,0,.045), transparent 70%), radial-gradient(520px 320px at 8% 14%, rgba(255,255,255,.010), transparent 74%), transparent;
        }
        .agenda-display { font-family: var(--font-barberos-display), Sora, sans-serif; }
        .agenda-data { font-family: var(--font-barberos-data), Sora, sans-serif; font-variant-numeric: tabular-nums; }
        .panel {
          position: relative; overflow: hidden; border: 1px solid var(--line); border-radius: 16px;
          background: linear-gradient(180deg, rgba(255,255,255,.018), transparent 30%), rgba(11,11,11,.88);
          box-shadow: 0 20px 60px rgba(0,0,0,.18), inset 0 1px 0 rgba(255,255,255,.018);
        }
        .panel::before { content: ""; position:absolute; inset:0; pointer-events:none; background:radial-gradient(360px circle at 70% -10%, rgba(255,90,0,.045), transparent 65%); opacity:.55; }
        .hairline { border-color: var(--line-soft); }
        .appointment-card { transition: transform .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease; }
        .appointment-card:hover { transform: translateY(-1px); border-color: rgba(255,90,0,.28); background: rgba(255,255,255,.045); box-shadow: 0 12px 30px rgba(0,0,0,.18); }
        .grid-line { border-color: rgba(255,255,255,.035); }
        .scrollbar { scrollbar-width: none; }
        .scrollbar::-webkit-scrollbar { display:none; }
        .agenda-control { border:1px solid rgba(255,255,255,.07); background:rgba(255,255,255,.025); transition:all .18s ease; }
        .agenda-control:hover { border-color:rgba(255,255,255,.13); background:rgba(255,255,255,.045); }
        .agenda-control:focus { outline:none; border-color:rgba(255,90,0,.4); box-shadow:0 0 0 3px rgba(255,90,0,.07); }
        .agenda-primary { background:#ff5a00; box-shadow:0 10px 28px rgba(255,90,0,.12); transition:all .18s ease; }
        .agenda-primary:hover { background:#ff6a18; transform:translateY(-1px); box-shadow:0 14px 34px rgba(255,90,0,.2); }
      `}</style>

      <div className="agenda-shell min-h-screen">
        <div className="relative mx-auto max-w-[1680px] px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
          <header className="mb-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/82">BarberOS</span>
                <span className="text-white/10">/</span>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff6a18]">Inteligencia de turnos</span>
                <span className="ml-1 hidden h-px w-10 bg-gradient-to-r from-orange-500/55 to-transparent sm:block" />
              </div>
              <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                <h1 className="agenda-display text-[34px] font-semibold leading-[.91] tracking-[-0.075em] text-white sm:text-[42px]">Agenda</h1>
              </div>
              <p className="mt-2 max-w-xl text-[14px] leading-5 text-white/64">Organizá la jornada, controlá los turnos y gestioná cada atención desde un solo lugar.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex h-10 rounded-[11px] border border-white/[0.07] bg-white/[0.025] p-1">
                {(["day", "week"] as ViewMode[]).map((mode) => (
                  <button key={mode} type="button" onClick={() => { setViewMode(mode); setSelectedAppointment(null); }} className={`rounded-[8px] px-4 text-[13px] font-semibold transition ${viewMode === mode ? "bg-white/[0.09] text-white" : "text-white/55 hover:text-white/80"}`}>
                    {mode === "day" ? "Día" : "Semana"}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => loadAppointments(true)} aria-label="Actualizar agenda" className="agenda-control flex h-10 w-10 items-center justify-center rounded-[11px] text-white/62"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /></button>
              <button type="button" onClick={openNewAppointment} className="agenda-primary flex h-10 items-center gap-2 rounded-[11px] px-4 text-[12px] font-semibold text-white"><Plus size={14} />Nuevo turno</button>
            </div>
          </div>
          </header>

          <main className="pb-10">
          <section className="panel mb-5 rounded-[16px] p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => navigatePeriod(-1)} className="agenda-control flex h-10 w-10 items-center justify-center rounded-[10px] text-white/62"><ChevronLeft size={17} /></button>
                <button type="button" onClick={goToday} className={`agenda-control h-10 rounded-[10px] px-4 text-[12px] font-semibold ${isToday ? "border-[#ff5a00]/35 bg-[#ff5a00]/10 text-[#ff7a22]" : "text-white/68"}`}>Hoy</button>
                <button type="button" onClick={() => navigatePeriod(1)} className="agenda-control flex h-10 w-10 items-center justify-center rounded-[10px] text-white/62"><ChevronRight size={17} /></button>
                <div className="ml-2 hidden h-7 w-px bg-white/[0.07] sm:block" />
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-white/90 first-letter:uppercase">{viewMode === "day" ? formatDateLong(selectedDate) : `Semana del ${formatDateShort(weekDays[0])}`}</p>
                  <p className="mt-0.5 text-[13px] text-white/55">Don Segundo · Operación diaria</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative min-w-[250px]">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/48" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente, servicio..." className="agenda-control h-10 w-full rounded-[10px] pl-9 pr-3 text-[12px] text-white/86 placeholder:text-white/42" />
                </div>
                <div className="relative">
                  <select value={selectedBarber} onChange={(e) => setSelectedBarber(e.target.value)} className="agenda-control h-10 min-w-[154px] appearance-none rounded-[10px] px-3 pr-8 text-[12px] text-white/68 outline-none">
                    <option value="all">Todos los barberos</option>
                    {barbers.map((barber) => <option key={barber} value={barber}>{barber}</option>)}
                  </select>
                  <UserRound size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/42" />
                </div>
              </div>
            </div>
          </section>

          <section className="admin-kpis mb-6 grid grid-cols-2 gap-3 xl:grid-cols-5">
            <Metric label="Turnos" value={stats.total.toString()} detail={viewMode === "day" ? "en el día" : "en la semana"} icon={<CalendarDays size={15} />} />
            <Metric label="Confirmados" value={stats.confirmed.toString()} detail={`${stats.pending} pendientes`} icon={<CircleCheck size={15} />} accent />
            <Metric label="Completados" value={stats.completed.toString()} detail="atendidos" icon={<Check size={15} />} />
            <Metric label="Ingresos estimados" value={formatMoney(stats.revenue)} detail={`${formatMoney(stats.completedRevenue)} realizados`} icon={<Scissors size={15} />} />
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
                    <div className="eyebrow mb-2 uppercase text-[#ff6a18]">Agenda del día</div>
                    <h2 className="agenda-display text-[20px] font-semibold tracking-[-.035em] text-white">Timeline operativo</h2>
                    <p className="mt-1 text-[13px] leading-5 text-white/60">{String(visibleHours[0]).padStart(2, "0")}:00 — {String(visibleHours[visibleHours.length - 1] + 1).padStart(2, "0")}:00 · {dayAppointments.length} {dayAppointments.length === 1 ? "turno" : "turnos"}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[14px] text-white/58">
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
                    <div className="relative min-w-0">
                      {visibleHours.map((hour) => (
                        <div key={hour} className="grid grid-cols-[82px_1fr]" style={{ height: HOUR_HEIGHT }}>
                          <div className="border-r grid-line px-5 pt-2 text-[13px] font-medium tabular-nums text-white/60">{String(hour).padStart(2, "0")}:00</div>
                          <div className="relative border-b grid-line">
                            <div className="absolute left-0 right-0 border-t border-dashed border-white/[0.04]" style={{ top: HOUR_HEIGHT / 2 }} />
                          </div>
                        </div>
                      ))}
                      <div className="absolute inset-y-0 left-[82px] right-0">
                        {dayAppointments.map((appointment) => {
                          const status = displayStatus(appointment);
                          const cardHeight = appointmentHeight(appointment.start_at, appointment.end_at);
                          const compact = cardHeight < 80;
                          const { lane, lanes } = dayLanes.get(appointment.id) ?? { lane: 0, lanes: 1 };
                          const narrow = lanes > 1;
                          const isSelected = selectedAppointment?.id === appointment.id;
                          return (
                            <button
                              type="button"
                              key={appointment.id}
                              onClick={() => selectAppointment(appointment)}
                              aria-pressed={isSelected}
                              className={`appointment-card absolute overflow-hidden rounded-xl border bg-[#151717] text-left ${narrow ? "px-3" : "px-4"} ${compact ? "py-2" : "py-2.5"} ${isSelected ? "border-[#ff6a18]/60 ring-1 ring-[#ff6a18]/30" : "border-white/[0.09]"} ${appointment.status === "cancelled" && !isSelected ? "opacity-60 hover:opacity-100" : ""}`}
                              style={{
                                top: appointmentTop(appointment.start_at, visibleHours[0]),
                                height: cardHeight,
                                // 12px de margen a la izquierda, 20px a la derecha y 6px entre columnas.
                                left: `calc(12px + (100% - 32px) * ${lane} / ${lanes})`,
                                width: `calc((100% - 32px) / ${lanes} - ${narrow ? 6 : 0}px)`,
                              }}
                            >
                              <div className={`absolute inset-y-0 left-0 w-[3px] ${status.dot}`} />
                              {narrow && (
                                // Celular con turnos superpuestos: columnas angostas,
                                // solo hora, nombre y un punto con el estado.
                                <div className="flex h-full min-w-0 flex-col justify-center pl-1 pr-3 sm:hidden">
                                  <span className={`absolute right-2 top-2 h-2 w-2 rounded-full ${status.dot}`} title={status.label} />
                                  <span className="text-[12px] font-semibold leading-4 tabular-nums text-white">{formatTime(appointment.start_at)}</span>
                                  <span className="truncate text-[12px] leading-4 text-white/75">{(appointment.customer?.full_name ?? "Cliente").split(" ")[0]}</span>
                                </div>
                              )}
                              <div className={narrow ? "hidden h-full sm:block" : "h-full"}>
                              {compact ? (
                                <div className="flex h-full items-center justify-between gap-3 pl-1">
                                  <div className="flex min-w-0 items-center gap-3">
                                    <span className="shrink-0 text-[14px] font-semibold tabular-nums text-white">{formatTime(appointment.start_at)}</span>
                                    <span className="truncate text-[14px] font-semibold text-white/92">{appointment.customer?.full_name ?? "Cliente sin nombre"}</span>
                                    {!narrow && <span className="hidden shrink-0 items-center gap-1 text-[12px] text-white/60 md:flex"><Scissors size={11} />{appointment.service?.name ?? "Servicio"}</span>}
                                    {!narrow && shortAudit(appointment) && <span className="hidden shrink-0 text-[12px] text-red-200/70 lg:inline">· {shortAudit(appointment)}</span>}
                                  </div>
                                  <span title={status.label} className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${status.badge}`}><span className={`inline-block h-1.5 w-1.5 rounded-full ${status.dot} ${narrow ? "sm:mr-1.5" : "mr-1.5"}`} /><span className={narrow ? "hidden sm:inline" : ""}>{status.label}</span></span>
                                </div>
                              ) : (
                              <div className="flex items-start justify-between gap-3 pl-1">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[14px] font-semibold tabular-nums text-white">{formatTime(appointment.start_at)}</span>
                                    <span className="text-[12px] text-white/48">→ {formatTime(appointment.end_at)}</span>
                                  </div>
                                  <p className="mt-1 truncate text-sm font-semibold text-white/92">{appointment.customer?.full_name ?? "Cliente sin nombre"}</p>
                                  <div className="mt-1 flex items-center gap-3 truncate text-[12px] text-white/60">
                                    <span className="flex items-center gap-1"><Scissors size={10} />{appointment.service?.name ?? "Servicio"}</span>
                                    {!narrow && appointment.barber?.name && <span className="flex items-center gap-1"><UserRound size={10} />{appointment.barber.name}</span>}
                                    {!narrow && shortAudit(appointment) && <span className="text-red-200/70">{shortAudit(appointment)}</span>}
                                  </div>
                                </div>
                                <span title={status.label} className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium ${status.badge}`}><span className={`inline-block h-1.5 w-1.5 rounded-full ${status.dot} ${narrow ? "sm:mr-1.5" : "mr-1.5"}`} /><span className={narrow ? "hidden sm:inline" : ""}>{status.label}</span></span>
                              </div>
                              )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <DetailPanel appointment={selectedAppointment} onClose={() => setSelectedAppointment(null)} onStatus={updateStatus} onEdit={setEditingAppointment} actionLoading={actionLoading} />
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
                          <span className={`text-[12px] font-semibold uppercase tracking-[.16em] ${active ? "text-[#ff7b3b]" : "text-white/55"}`}>{WEEKDAYS[index]}</span>
                          {today && <span className="h-1.5 w-1.5 rounded-full bg-[#ff5a00] shadow-[0_0_10px_rgba(255,90,0,.65)]" />}
                        </div>
                        <div className="mt-2 flex items-end justify-between">
                          <span className={`text-2xl font-semibold tracking-[-.04em] ${active ? "text-white" : "text-white/84"}`}>{day.getDate()}</span>
                          <span className="text-[12px] text-white/48">{count} turnos</span>
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
                              <div className="flex min-h-[480px] items-center justify-center text-[12px] text-white/30">Libre</div>
                            ) : (
                              <div className="space-y-2">
                                {items.map((appointment) => {
                                  const status = displayStatus(appointment);
                                  return (
                                    <button key={appointment.id} type="button" onClick={() => selectAppointment(appointment)} className="appointment-card w-full rounded-lg border border-white/[0.065] bg-[#111313] p-3 text-left">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[13px] font-semibold tabular-nums text-white">{formatTime(appointment.start_at)}</span>
                                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                                      </div>
                                      <p className="mt-2 truncate text-xs font-semibold text-white/90">{appointment.customer?.full_name ?? "Sin nombre"}</p>
                                      <p className="mt-1 truncate text-[14px] text-white/58">{appointment.service?.name ?? "Servicio"}</p>
                                      {appointment.barber?.name && <p className="mt-1 truncate text-[12px] text-white/45">{appointment.barber.name}</p>}
                                      {(shortAudit(appointment) || isUnregistered(appointment)) && <p className={`mt-1 truncate text-[12px] ${isUnregistered(appointment) ? "text-amber-200/80" : "text-red-200/70"}`}>{isUnregistered(appointment) ? "Sin registrar" : shortAudit(appointment)}</p>}
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
              <DetailPanel appointment={selectedAppointment} onClose={() => setSelectedAppointment(null)} onStatus={updateStatus} onEdit={setEditingAppointment} actionLoading={actionLoading} />
            </div>
          )}
          </main>
        </div>
      </div>

      {editingAppointment && (
        <EditAppointmentModal
          appointment={editingAppointment}
          customers={customers}
          services={services}
          barbers={barberOptions}
          onClose={() => setEditingAppointment(null)}
          onSave={saveAppointmentEdit}
        />
      )}

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
          attended={newAttended}
          setAttended={setNewAttended}
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
  return <KpiCard label={label} value={value} detail={detail} icon={icon} accent={accent} className={className} />;
}

function SkeletonTimeline() {
  return <div className="space-y-0 p-5">{Array.from({ length: 7 }, (_, i) => <div key={i} className="h-16 animate-pulse border-b border-white/[0.035] bg-white/[0.012]" />)}</div>;
}

function EmptyAgenda({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex min-h-[650px] flex-col items-center justify-center px-6 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.025]">
        <CalendarDays size={23} className="text-white/48" />
        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#ff5a00] shadow-[0_0_14px_rgba(255,90,0,.55)]" />
      </div>
      <h3 className="mt-5 text-sm font-semibold text-white/88">Agenda libre</h3>
      <p className="mt-2 max-w-sm text-xs leading-5 text-white/55">No hay turnos registrados para este día con los filtros actuales.</p>
      <button type="button" onClick={onCreate} className="mt-5 flex items-center gap-2 rounded-xl bg-[#ff5a00] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#ff6a18]"><Plus size={14} />Crear turno</button>
    </div>
  );
}

function DetailPanel({ appointment, onClose, onStatus, onEdit, actionLoading }: { appointment: Appointment | null; onClose: () => void; onStatus: (appointment: Appointment, status: string) => void; onEdit: (appointment: Appointment) => void; actionLoading: string }) {
  if (!appointment) {
    return (
      <aside className="panel hidden h-fit overflow-hidden rounded-[16px] 2xl:block">
        <div className="border-b hairline px-5 py-4"><div className="eyebrow mb-2 uppercase text-[#ff6a18]">Turno seleccionado</div><h2 className="agenda-display text-[20px] font-semibold tracking-[-.035em] text-white">Detalle</h2><p className="mt-1 text-[13px] leading-5 text-white/60">Seleccioná un turno para abrir la información del cliente y gestionar el turno.</p></div>
        <div className="flex min-h-[420px] flex-col items-center justify-center px-8 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025]"><Clock3 size={18} className="text-white/42" /></div><p className="mt-4 text-xs font-medium text-white/68">Sin selección</p><p className="mt-1 max-w-[220px] text-[12px] leading-5 text-white/42">Elegí un turno de la agenda para gestionar su estado y consultar la información del cliente.</p></div>
      </aside>
    );
  }

  const status = displayStatus(appointment);
  const completed = appointment.status === "completed";
  const cancelled = appointment.status === "cancelled";

  return (
    <aside id="appointment-detail" className="panel h-fit scroll-mt-20 overflow-hidden rounded-[16px] 2xl:sticky 2xl:top-[118px]">
      <div className="flex items-start justify-between border-b hairline px-5 py-4">
        <div><div className="eyebrow mb-2 uppercase text-[#ff6a18]">Turno seleccionado</div><h2 className="agenda-display text-[20px] font-semibold tracking-[-.035em] text-white">Detalle del turno</h2><p className="mt-1 text-[13px] leading-5 text-white/60">Información de la atención</p></div>
        <button type="button" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-white/48 hover:bg-white/[0.04] hover:text-white"><X size={14} /></button>
      </div>

      <div className="p-5">
        <div className="rounded-xl border border-white/[0.065] bg-white/[0.018] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/48">Cliente</p><p className="mt-2 truncate text-lg font-semibold tracking-[-.025em] text-white">{appointment.customer?.full_name ?? "Cliente sin nombre"}</p></div>
            <span className={`shrink-0 rounded-full border px-2 py-1 text-[11px] ${status.badge}`}><span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}</span>
          </div>
          {appointment.customer?.phone && <p className="mt-2 flex items-center gap-1.5 text-xs text-white/60"><Phone size={11} />{appointment.customer.phone}</p>}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Info label="Horario" value={`${formatTime(appointment.start_at)} — ${formatTime(appointment.end_at)}`} icon={<Clock3 size={12} />} />
          <Info label="Servicio" value={appointment.service?.name ?? "Servicio"} icon={<Scissors size={12} />} />
          <Info label="Barbero" value={appointment.barber?.name ?? "Sin asignar"} icon={<UserRound size={12} />} />
          <Info label="Importe" value={formatMoney(Number(appointment.service?.price ?? 0))} icon={<span className="text-[13px]">$</span>} />
        </div>

        {auditText(appointment) && (
          <div className={`mt-4 rounded-xl border px-3.5 py-3 text-[12px] leading-5 ${appointment.status === "no_show" ? "border-orange-300/15 bg-orange-300/[0.05] text-orange-100/85" : "border-red-300/15 bg-red-300/[0.05] text-red-100/85"}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[.14em] opacity-70">Registro</p>
            <p className="mt-1">{auditText(appointment)}</p>
          </div>
        )}

        {isUnregistered(appointment) && (
          <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] px-3.5 py-3 text-[12px] leading-5 text-amber-100/90">
            <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-amber-200/80">Sin registrar</p>
            <p className="mt-1">El horario ya pasó. Marcá si el cliente se atendió o si no asistió, así queda registrado.</p>
          </div>
        )}

        {appointment.notes && <div className="mt-4"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/48">Observaciones</p><p className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.018] p-3 text-xs leading-5 text-white/64">{appointment.notes}</p></div>}

        {appointment.reservation_code && <div className="mt-4 flex items-center justify-between border-t hairline pt-4"><span className="text-[11px] font-semibold uppercase tracking-[.15em] text-white/45">Reserva</span><span className="font-mono text-[12px] text-white/60">{appointment.reservation_code}</span></div>}

        <div className="mt-5 border-t hairline pt-5">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[.16em] text-white/48">Acciones</p>
          <button type="button" disabled={!!actionLoading} onClick={() => onEdit(appointment)} className="mb-2 flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.03] px-3 py-2.5 text-[12px] font-semibold text-white/85 transition hover:border-[#ff5a00]/30 hover:bg-white/[0.05] disabled:opacity-40"><Pencil size={13} />Editar turno</button>
          <div className="grid grid-cols-2 gap-2">
            {!completed && !cancelled && <button type="button" disabled={!!actionLoading} onClick={() => onStatus(appointment, "completed")} className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.06] px-3 py-2.5 text-[12px] font-semibold text-emerald-200 transition hover:bg-emerald-300/[0.10] disabled:opacity-40"><Check size={13} />{actionLoading === `${appointment.id}:completed` ? "Guardando..." : "Completar"}</button>}
            {!completed && !cancelled && <button type="button" disabled={!!actionLoading} onClick={() => { if (window.confirm("¿Confirmás que el cliente no asistió a este turno?")) onStatus(appointment, "no_show"); }} className="flex items-center justify-center gap-2 rounded-xl border border-orange-300/15 bg-orange-300/[0.05] px-3 py-2.5 text-[12px] font-semibold text-orange-200 transition hover:bg-orange-300/[0.09] disabled:opacity-40"><CircleX size={13} />No asistió</button>}
            {!completed && !cancelled && <button type="button" disabled={!!actionLoading} onClick={() => { if (window.confirm("¿Confirmás la cancelación de este turno?")) onStatus(appointment, "cancelled"); }} className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-red-300/10 bg-red-300/[0.035] px-3 py-2.5 text-[12px] font-semibold text-red-200/80 transition hover:bg-red-300/[0.07] disabled:opacity-40"><X size={13} />Cancelar turno</button>}
            {completed && <div className="col-span-2 rounded-xl border border-sky-300/15 bg-sky-300/[0.05] px-3 py-2.5 text-center text-[12px] font-semibold text-sky-200">Turno completado correctamente</div>}
            {cancelled && <div className="col-span-2 rounded-xl border border-red-300/15 bg-red-300/[0.05] px-3 py-2.5 text-center text-[12px] font-semibold text-red-200">Turno cancelado</div>}
          </div>
        </div>
      </div>
    </aside>
  );
}

function Info({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-white/[0.055] bg-white/[0.014] p-3"><p className="flex items-center gap-1.5 text-[11px] uppercase tracking-[.12em] text-white/45">{icon}{label}</p><p className="mt-2 truncate text-xs font-medium text-white/82">{value}</p></div>;
}

function NewAppointmentModal({ customers, services, barbers, customerId, serviceId, barberId, startAt, notes, attended, error, creating, setCustomerId, setServiceId, setBarberId, setStartAt, setNotes, setAttended, onClose, onCreate }: {
  customers: CustomerOption[]; services: ServiceOption[]; barbers: BarberOption[]; customerId: string; serviceId: string; barberId: string; startAt: string; notes: string; attended: boolean; error: string; creating: boolean;
  setCustomerId: (v: string) => void; setServiceId: (v: string) => void; setBarberId: (v: string) => void; setStartAt: (v: string) => void; setNotes: (v: string) => void; setAttended: (v: boolean) => void; onClose: () => void; onCreate: () => void;
}) {
  const selectedService = services.find((service) => service.id === serviceId);
  const [openedAt] = useState(() => Date.now());
  const isPast = Boolean(startAt) && new Date(startAt).getTime() < openedAt;
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 px-3 py-6 backdrop-blur-md sm:items-center sm:p-4" style={{ fontFamily: "var(--font-barberos-ui), Manrope, sans-serif" }}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.09] bg-[#101111] shadow-[0_35px_100px_rgba(0,0,0,.55)]">
        <div className="flex items-start justify-between border-b hairline px-6 py-5"><div><div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#ff6a18]"><Plus size={12} />Nueva atención</div><h2 className="text-lg font-semibold tracking-[-.035em] text-white">Crear turno</h2><p className="mt-1 text-[13px] text-white/55">Agregá una reserva o registrá un turno que ya se hizo.</p></div><button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/48 hover:bg-white/[0.04] hover:text-white"><X size={15} /></button></div>
        <div className="space-y-4 p-6">
          <Field label="Cliente" icon={<UserRound size={12} />}><select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="field"><option value="">Seleccionar cliente...</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}</select></Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label="Servicio" icon={<Scissors size={12} />}><select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="field"><option value="">Seleccionar servicio...</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} · {formatMoney(Number(service.price))}</option>)}</select></Field><Field label="Barbero" icon={<UserRound size={12} />}><select value={barberId} onChange={(e) => setBarberId(e.target.value)} className="field"><option value="">Sin asignar</option>{barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}</select></Field></div>
          <Field label="Fecha y hora" icon={<CalendarDays size={12} />}><DateTimeField mode="datetime" value={startAt} onChange={(value) => { setStartAt(value); if (value && new Date(value).getTime() < Date.now()) setAttended(true); }} /></Field>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.075] bg-white/[0.015] px-3 py-3">
            <input type="checkbox" checked={attended} onChange={(e) => setAttended(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#ff5a00]" />
            <span className="text-[12px] leading-5 text-white/70">
              <span className="font-semibold text-white/85">Ya fue atendido</span>
              <span className="block text-white/50">Para registrar un corte que ya se hizo (por ejemplo, alguien que vino sin reservar). Queda como completado y suma la visita y los puntos.</span>
            </span>
          </label>
          {isPast && !attended && <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2.5 text-[12px] text-amber-200">Este horario ya pasó. Si el cliente ya se atendió, marcá &quot;Ya fue atendido&quot;.</div>}
          <Field label="Observaciones" icon={<MoreHorizontal size={12} />}><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notas para el equipo..." className="field resize-none" /></Field>
          {selectedService && <div className="rounded-xl border border-[#ff5a00]/15 bg-[#ff5a00]/[0.045] px-3 py-2.5 text-[12px] text-white/64">Duración estimada: <span className="font-semibold text-white/80">{Number(selectedService.duration_minutes ?? 30)} min</span> · Estado: <span className="font-semibold text-emerald-200">{attended ? "Completado" : "Confirmado"}</span></div>}
          {error && <div className="flex items-center gap-2 rounded-xl border border-red-300/15 bg-red-300/[0.05] px-3 py-2.5 text-[12px] text-red-200"><AlertCircle size={13} />{error}</div>}
        </div>
        <div className="flex items-center justify-end gap-2 border-t hairline bg-white/[0.012] px-6 py-4"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-medium text-white/62 transition hover:text-white">Cancelar</button><button type="button" disabled={creating} onClick={onCreate} className="flex items-center gap-2 rounded-xl bg-[#ff5a00] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#ff6a18] disabled:cursor-not-allowed disabled:opacity-50">{creating ? <><RefreshCw size={13} className="animate-spin" />Creando...</> : <><Plus size={13} />Crear turno</>}</button></div>
      </div>
      <style jsx>{`.field{width:100%;border:1px solid rgba(255,255,255,.075);border-radius:12px;background:#0b0c0c;color:rgba(255,255,255,.78);padding:10px 12px;font-size:12px;outline:none}.field:focus{border-color:rgba(255,90,0,.4)}.field::placeholder{color:rgba(255,255,255,.22)}`}</style>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[.14em] text-white/55">{icon}{label}</span>{children}</label>;
}

type AppointmentChanges = {
  customer_id?: string;
  service_id?: string;
  barber_id?: string;
  start_at?: string;
  end_at?: string;
  status?: string;
  notes?: string | null;
};

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function EditAppointmentModal({ appointment, customers, services, barbers, onClose, onSave }: {
  appointment: Appointment; customers: CustomerOption[]; services: ServiceOption[]; barbers: BarberOption[];
  onClose: () => void; onSave: (changes: AppointmentChanges) => Promise<string | null>;
}) {
  const [customerId, setCustomerId] = useState(appointment.customer_id ?? "");
  const [serviceId, setServiceId] = useState(appointment.service_id ?? "");
  const [barberId, setBarberId] = useState(appointment.barber_id ?? "");
  const [startAt, setStartAt] = useState(toLocalInputValue(appointment.start_at));
  const [status, setStatus] = useState(appointment.status);
  const [notes, setNotes] = useState(appointment.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedService = services.find((service) => service.id === serviceId);
  const wasCompleted = appointment.status === "completed";

  async function handleSave() {
    if (!customerId || !serviceId || !startAt) {
      setError("Completá cliente, servicio y horario.");
      return;
    }

    const start = new Date(startAt);
    const duration = Math.max(5, Number(selectedService?.duration_minutes ?? 30));

    const changes: AppointmentChanges = {
      customer_id: customerId,
      service_id: serviceId,
      start_at: start.toISOString(),
      end_at: new Date(start.getTime() + duration * 60000).toISOString(),
      status,
      notes: notes.trim() || null,
    };
    if (barberId) changes.barber_id = barberId;

    setSaving(true);
    setError("");
    const result = await onSave(changes);
    setSaving(false);

    if (result) setError(result);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/70 px-3 py-6 backdrop-blur-md sm:items-center sm:p-4" style={{ fontFamily: "var(--font-barberos-ui), Manrope, sans-serif" }}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.09] bg-[#101111] shadow-[0_35px_100px_rgba(0,0,0,.55)]">
        <div className="flex items-start justify-between border-b border-white/[0.06] px-6 py-5">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.18em] text-[#ff6a18]"><Pencil size={12} />Editar atención</div>
            <h2 className="text-lg font-semibold tracking-[-.035em] text-white">Editar turno</h2>
            <p className="mt-1 text-[13px] text-white/55">Corregí horario, servicio, cliente o estado.{appointment.reservation_code ? ` Reserva ${appointment.reservation_code}.` : ""}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-white/48 hover:bg-white/[0.04] hover:text-white"><X size={15} /></button>
        </div>

        <div className="space-y-4 p-6">
          <Field label="Cliente" icon={<UserRound size={12} />}>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="field">
              <option value="">Seleccionar cliente...</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name}{customer.phone ? ` · ${customer.phone}` : ""}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Servicio" icon={<Scissors size={12} />}>
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className="field">
                <option value="">Seleccionar servicio...</option>
                {services.map((service) => <option key={service.id} value={service.id}>{service.name} · {formatMoney(Number(service.price))}</option>)}
              </select>
            </Field>
            <Field label="Barbero" icon={<UserRound size={12} />}>
              <select value={barberId} onChange={(e) => setBarberId(e.target.value)} className="field">
                {!barberId && <option value="">Sin asignar</option>}
                {barbers.map((barber) => <option key={barber.id} value={barber.id}>{barber.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Fecha y hora" icon={<CalendarDays size={12} />}>
              <DateTimeField mode="datetime" value={startAt} onChange={setStartAt} />
            </Field>
            <Field label="Estado" icon={<Check size={12} />}>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="field">
                <option value="confirmed">Confirmado</option>
                <option value="pending">Pendiente</option>
                <option value="completed">Completado</option>
                <option value="no_show">No asistió</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </Field>
          </div>

          <Field label="Observaciones" icon={<MoreHorizontal size={12} />}>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Notas para el equipo..." className="field resize-none" />
          </Field>

          {selectedService && <div className="rounded-xl border border-[#ff5a00]/15 bg-[#ff5a00]/[0.045] px-3 py-2.5 text-[12px] text-white/64">Duración: <span className="font-semibold text-white/80">{Number(selectedService.duration_minutes ?? 30)} min</span> · el horario de fin se recalcula solo.</div>}

          {wasCompleted && status !== "completed" && <div className="rounded-xl border border-amber-300/15 bg-amber-300/[0.05] px-3 py-2.5 text-[12px] text-amber-200">Este turno ya estaba completado: los puntos de fidelización que sumó no se descuentan solos. Si hace falta, ajustalos desde Fidelización.</div>}

          {!wasCompleted && status === "completed" && <div className="rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] px-3 py-2.5 text-[12px] text-emerald-200">Al guardarlo como completado suma la visita y los puntos del cliente.</div>}

          {error && <div className="flex items-center gap-2 rounded-xl border border-red-300/15 bg-red-300/[0.05] px-3 py-2.5 text-[12px] text-red-200"><AlertCircle size={13} />{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/[0.06] bg-white/[0.012] px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-xs font-medium text-white/62 transition hover:text-white">Cancelar</button>
          <button type="button" disabled={saving} onClick={handleSave} className="flex items-center gap-2 rounded-xl bg-[#ff5a00] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#ff6a18] disabled:opacity-50">
            {saving ? <><RefreshCw size={13} className="animate-spin" />Guardando...</> : <><Check size={13} />Guardar cambios</>}
          </button>
        </div>
      </div>
      <style jsx>{`.field{width:100%;border:1px solid rgba(255,255,255,.075);border-radius:12px;background:#0b0c0c;color:rgba(255,255,255,.78);padding:10px 12px;font-size:12px;outline:none}.field:focus{border-color:rgba(255,90,0,.4)}.field::placeholder{color:rgba(255,255,255,.22)}`}</style>
    </div>
  );
}
