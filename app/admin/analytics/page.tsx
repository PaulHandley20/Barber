"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Clock3,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  Scissors,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type RangeKey = "7D" | "30D" | "90D" | "12M" | "CUSTOM";

type Appointment = {
  id: string;
  customer_id: string | null;
  barber_id: string | null;
  service_id: string | null;
  start_at: string;
  end_at: string | null;
  status: string | null;
  service:
    | { name: string; price: number | null }
    | { name: string; price: number | null }[]
    | null;
  customer:
    | { full_name: string | null }
    | { full_name: string | null }[]
    | null;
};

type Customer = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
};

type Barber = {
  id: string;
  name: string;
  active: boolean;
};

type Service = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  active: boolean;
};

type ChartPoint = {
  label: string;
  revenue: number;
  appointments: number;
};

type TeamMetric = {
  id: string;
  name: string;
  appointments: number;
  completed: number;
  revenue: number;
  averageTicket: number;
  completionRate: number;
};

type ServiceMetric = {
  id: string;
  name: string;
  appointments: number;
  completed: number;
  revenue: number;
  share: number;
  averagePrice: number;
};

type CustomerSegment = {
  label: string;
  value: number;
  description: string;
};

const ORANGE = "#FF5A00";
const GREEN = "#22C55E";
const RED = "#EF4444";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value);

const formatPercent = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

const getService = (appointment: Appointment) =>
  Array.isArray(appointment.service)
    ? appointment.service[0] ?? null
    : appointment.service;

const getCustomer = (appointment: Appointment) =>
  Array.isArray(appointment.customer)
    ? appointment.customer[0] ?? null
    : appointment.customer;

const normalizeStatus = (status: string | null) =>
  (status ?? "").toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");

const isCompleted = (status: string | null) =>
  ["completed", "complete", "completado", "confirmed", "confirmado"].includes(
    normalizeStatus(status)
  );

const isCancelled = (status: string | null) =>
  ["cancelled", "canceled", "cancelado"].includes(normalizeStatus(status));

const isNoShow = (status: string | null) =>
  ["no_show", "noshow", "no_showed"].includes(normalizeStatus(status));

const isBookable = (status: string | null) =>
  !isCancelled(status) && !isNoShow(status);

function dateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function getRangeDates(range: RangeKey, now = new Date()) {
  const end = endOfDay(now);
  if (range === "7D") return { start: startOfDay(addDays(now, -6)), end };
  if (range === "30D") return { start: startOfDay(addDays(now, -29)), end };
  if (range === "90D") return { start: startOfDay(addDays(now, -89)), end };
  return { start: startOfDay(addMonths(now, -11)), end };
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "short",
  })
    .format(date)
    .replace(".", "");
}

function buildChart(
  appointments: Appointment[],
  start: Date,
  end: Date,
  range: RangeKey
): ChartPoint[] {
  const points: ChartPoint[] = [];

  if (range === "12M") {
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);

    while (cursor <= last) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth();
      const rows = appointments.filter((appointment) => {
        const date = new Date(appointment.start_at);
        return date.getFullYear() === year && date.getMonth() === month;
      });

      points.push({
        label: formatMonth(cursor),
        revenue: rows.filter(isBookable).reduce((sum, row) => {
          const service = getService(row);
          return sum + Number(service?.price ?? 0);
        }, 0),
        appointments: rows.filter(isBookable).length,
      });

      cursor = addMonths(cursor, 1);
    }

    return points;
  }

  const totalDays = Math.max(
    1,
    Math.ceil((dateOnly(end).getTime() - dateOnly(start).getTime()) / 86400000) + 1
  );

  if (range === "7D" || range === "30D" || range === "90D") {
    for (let i = 0; i < totalDays; i++) {
      const day = startOfDay(addDays(start, i));
      const next = endOfDay(day);
      const rows = appointments.filter((appointment) => {
        const date = new Date(appointment.start_at);
        return date >= day && date <= next;
      });

      points.push({
        label: formatShortDate(day),
        revenue: rows.filter(isBookable).reduce((sum, row) => {
          const service = getService(row);
          return sum + Number(service?.price ?? 0);
        }, 0),
        appointments: rows.filter(isBookable).length,
      });
    }
  }

  return points;
}

export default function AnalyticsPage() {
  const supabase = createClient();

  const [range, setRange] = useState<RangeKey>("30D");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [barberFilter, setBarberFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamMetric | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceMetric | null>(
    null
  );
  const [toast, setToast] = useState("");

  const dates = useMemo(() => {
    if (range === "CUSTOM" && customStart && customEnd) {
      return {
        start: startOfDay(new Date(`${customStart}T00:00:00`)),
        end: endOfDay(new Date(`${customEnd}T00:00:00`)),
      };
    }
    return getRangeDates(range);
  }, [range, customStart, customEnd]);

  const fetchAnalytics = useCallback(
    async (silent = false) => {
      try {
        if (silent) setRefreshing(true);
        else setLoading(true);
        setError("");

        const [appointmentsRes, customersRes, barbersRes, servicesRes] =
          await Promise.all([
            supabase
              .from("appointments")
              .select(
                `
                id,
                customer_id,
                barber_id,
                service_id,
                start_at,
                end_at,
                status,
                service:services(name,price),
                customer:customers(full_name)
              `
              )
              .gte("start_at", dates.start.toISOString())
              .lte("start_at", dates.end.toISOString())
              .order("start_at", { ascending: true })
              .limit(10000),
            supabase
              .from("customers")
              .select("id,full_name,phone,email,created_at")
              .order("created_at", { ascending: false })
              .limit(10000),
            supabase
              .from("barbers")
              .select("id,name,active")
              .order("name", { ascending: true }),
            supabase
              .from("services")
              .select(
                "id,name,price,duration_minutes,active"
              )
              .order("name", { ascending: true }),
          ]);

        if (appointmentsRes.error) throw appointmentsRes.error;
        if (customersRes.error) throw customersRes.error;
        if (barbersRes.error) throw barbersRes.error;
        if (servicesRes.error) throw servicesRes.error;

        setAppointments((appointmentsRes.data ?? []) as Appointment[]);
        setCustomers((customersRes.data ?? []) as Customer[]);
        setBarbers((barbersRes.data ?? []) as Barber[]);
        setServices((servicesRes.data ?? []) as Service[]);
      } catch (err: any) {
        setError(err?.message ?? "No se pudieron cargar los datos.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dates, supabase]
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      if (serviceFilter !== "all" && appointment.service_id !== serviceFilter)
        return false;
      if (barberFilter !== "all" && appointment.barber_id !== barberFilter)
        return false;
      if (statusFilter !== "all") {
        if (statusFilter === "completed" && !isCompleted(appointment.status))
          return false;
        if (statusFilter === "cancelled" && !isCancelled(appointment.status))
          return false;
        if (statusFilter === "no_show" && !isNoShow(appointment.status))
          return false;
        if (
          statusFilter === "scheduled" &&
          (isCompleted(appointment.status) ||
            isCancelled(appointment.status) ||
            isNoShow(appointment.status))
        )
          return false;
      }
      return true;
    });
  }, [appointments, serviceFilter, barberFilter, statusFilter]);

  const periodRevenue = useMemo(
    () =>
      filteredAppointments.filter(isBookable).reduce((sum, appointment) => {
        return sum + Number(getService(appointment)?.price ?? 0);
      }, 0),
    [filteredAppointments]
  );

  const completedAppointments = useMemo(
    () => filteredAppointments.filter((appointment) => isCompleted(appointment.status)),
    [filteredAppointments]
  );

  const bookedAppointments = useMemo(
    () => filteredAppointments.filter(isBookable),
    [filteredAppointments]
  );

  const cancelledAppointments = useMemo(
    () => filteredAppointments.filter((appointment) => isCancelled(appointment.status)),
    [filteredAppointments]
  );

  const noShowAppointments = useMemo(
    () => filteredAppointments.filter((appointment) => isNoShow(appointment.status)),
    [filteredAppointments]
  );

  const averageTicket = bookedAppointments.length
    ? periodRevenue / bookedAppointments.length
    : 0;

  const completionRate = filteredAppointments.length
    ? (completedAppointments.length / filteredAppointments.length) * 100
    : 0;

  const cancellationRate = filteredAppointments.length
    ? (cancelledAppointments.length / filteredAppointments.length) * 100
    : 0;

  const noShowRate = filteredAppointments.length
    ? (noShowAppointments.length / filteredAppointments.length) * 100
    : 0;

  const newCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const created = new Date(customer.created_at);
      return created >= dates.start && created <= dates.end;
    });
  }, [customers, dates]);

  const activeCustomers = useMemo(() => {
    const ids = new Set(
      bookedAppointments
        .map((appointment) => appointment.customer_id)
        .filter(Boolean)
    );
    return ids.size;
  }, [bookedAppointments]);

  const returningCustomers = useMemo(() => {
    const visits = new Map<string, number>();
    bookedAppointments.forEach((appointment) => {
      if (!appointment.customer_id) return;
      visits.set(
        appointment.customer_id,
        (visits.get(appointment.customer_id) ?? 0) + 1
      );
    });
    return [...visits.values()].filter((count) => count >= 2).length;
  }, [bookedAppointments]);

  const customerSegments = useMemo<CustomerSegment[]>(() => {
    const visits = new Map<string, number>();
    bookedAppointments.forEach((appointment) => {
      if (!appointment.customer_id) return;
      visits.set(
        appointment.customer_id,
        (visits.get(appointment.customer_id) ?? 0) + 1
      );
    });

    const vip = [...visits.values()].filter((v) => v >= 6).length;
    const recurrent = [...visits.values()].filter((v) => v >= 2 && v < 6).length;
    const single = [...visits.values()].filter((v) => v === 1).length;
    const total = visits.size || 1;

    return [
      {
        label: "VIP",
        value: vip,
        description: "6+ visitas en el período",
      },
      {
        label: "Recurrentes",
        value: recurrent,
        description: "2 a 5 visitas",
      },
      {
        label: "Primera visita",
        value: single,
        description: "1 visita registrada",
      },
    ].map((segment) => ({
      ...segment,
      value: Math.round((segment.value / total) * 100),
    }));
  }, [bookedAppointments]);

  const serviceMetrics = useMemo<ServiceMetric[]>(() => {
    const map = new Map<string, ServiceMetric>();

    filteredAppointments.forEach((appointment) => {
      const service = getService(appointment);
      const id = appointment.service_id ?? `unknown-${service?.name ?? "service"}`;
      const name = service?.name ?? "Servicio sin nombre";

      if (!map.has(id)) {
        map.set(id, {
          id,
          name,
          appointments: 0,
          completed: 0,
          revenue: 0,
          share: 0,
          averagePrice: Number(service?.price ?? 0),
        });
      }

      const metric = map.get(id)!;
      metric.appointments += 1;
      if (isCompleted(appointment.status)) metric.completed += 1;
      if (isBookable(appointment.status)) {
        metric.revenue += Number(service?.price ?? 0);
      }
    });

    const total = map.size
      ? [...map.values()].reduce((sum, item) => sum + item.revenue, 0)
      : 0;

    return [...map.values()]
      .map((item) => ({
        ...item,
        share: total ? (item.revenue / total) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredAppointments]);

  const teamMetrics = useMemo<TeamMetric[]>(() => {
    const map = new Map<string, TeamMetric>();

    filteredAppointments.forEach((appointment) => {
      const id = appointment.barber_id ?? "unassigned";
      const barber = barbers.find((item) => item.id === appointment.barber_id);
      const name = barber?.name ?? "Sin asignar";

      if (!map.has(id)) {
        map.set(id, {
          id,
          name,
          appointments: 0,
          completed: 0,
          revenue: 0,
          averageTicket: 0,
          completionRate: 0,
        });
      }

      const metric = map.get(id)!;
      metric.appointments += 1;
      if (isCompleted(appointment.status)) metric.completed += 1;
      if (isBookable(appointment.status)) {
        metric.revenue += Number(getService(appointment)?.price ?? 0);
      }
    });

    return [...map.values()]
      .map((item) => ({
        ...item,
        averageTicket: item.completed ? item.revenue / item.completed : 0,
        completionRate: item.appointments
          ? (item.completed / item.appointments) * 100
          : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [barbers, filteredAppointments]);

  const chart = useMemo(
    () => buildChart(filteredAppointments, dates.start, dates.end, range),
    [filteredAppointments, dates, range]
  );

  const chartMax = Math.max(...chart.map((point) => point.revenue), 1);

  const peakHours = useMemo(() => {
    const buckets = new Map<number, number>();
    filteredAppointments.filter(isBookable).forEach((appointment) => {
      const hour = new Date(appointment.start_at).getHours();
      buckets.set(hour, (buckets.get(hour) ?? 0) + 1);
    });

    return [...buckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hour, count]) => ({
        label: `${String(hour).padStart(2, "0")}:00`,
        count,
      }));
  }, [filteredAppointments]);

  const weekdayMetrics = useMemo(() => {
    const names = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const values = Array.from({ length: 7 }, () => 0);

    filteredAppointments.filter(isBookable).forEach((appointment) => {
      values[new Date(appointment.start_at).getDay()] += 1;
    });

    const max = Math.max(...values, 1);
    return names.map((name, index) => ({
      name,
      value: values[index],
      height: (values[index] / max) * 100,
    }));
  }, [filteredAppointments]);

  const monthlyComparison = useMemo(() => {
    const rows: { label: string; revenue: number; appointments: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const rowsInMonth = appointments.filter((appointment) => {
        const date = new Date(appointment.start_at);
        return date >= month && date <= next && isBookable(appointment.status);
      });

      rows.push({
        label: `${formatMonth(month)} ${String(month.getFullYear()).slice(-2)}`,
        revenue: rowsInMonth.reduce(
          (sum, appointment) =>
            sum + Number(getService(appointment)?.price ?? 0),
          0
        ),
        appointments: rowsInMonth.length,
      });
    }

    return rows;
  }, [appointments]);

  const monthMax = Math.max(...monthlyComparison.map((row) => row.revenue), 1);

  const periodLabel = useMemo(() => {
    if (range === "7D") return "Últimos 7 días";
    if (range === "30D") return "Últimos 30 días";
    if (range === "90D") return "Últimos 90 días";
    if (range === "12M") return "Últimos 12 meses";
    return `${customStart || "inicio"} → ${customEnd || "fin"}`;
  }, [range, customStart, customEnd]);

  const exportCSV = () => {
    const header = [
      "Servicio",
      "Turnos",
      "Completados",
      "Ingresos",
      "Participacion",
    ];

    const rows = serviceMetrics.map((item) => [
      item.name,
      item.appointments,
      item.completed,
      item.revenue,
      `${item.share.toFixed(1)}%`,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `barberOS-analytics-${range.toLowerCase()}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("Reporte exportado correctamente.");
  };

  const resetFilters = () => {
    setServiceFilter("all");
    setBarberFilter("all");
    setStatusFilter("all");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070707] text-[#F5F5F4]">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-4 text-sm text-zinc-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando inteligencia de negocio...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] text-[#F5F5F4]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_78%_0%,rgba(255,90,0,0.08),transparent_28%),radial-gradient(circle_at_10%_80%,rgba(255,255,255,0.025),transparent_25%)]" />

      <div className="relative mx-auto max-w-[1700px] px-5 py-6 sm:px-8 lg:px-10">
        <header className="mb-6 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FF6A18]">
              <BarChart3 className="h-4 w-4" />
              Business Intelligence
            </div>

            <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Analytics
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Convertí la operación de BarberOS en decisiones: ingresos,
              demanda, equipo, clientes y oportunidades de crecimiento.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchAnalytics(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 text-sm font-medium text-zinc-200 transition hover:bg-white/[0.07]"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Actualizar
            </button>

            <button
              onClick={exportCSV}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#FF5A00] px-4 text-sm font-semibold text-white shadow-[0_10px_35px_rgba(255,90,0,0.18)] transition hover:bg-[#FF6A18]"
            >
              <Download className="h-4 w-4" />
              Exportar
            </button>
          </div>
        </header>

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#0D0D0D]/90 p-3 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-1 rounded-xl bg-black/40 p-1">
              {(["7D", "30D", "90D", "12M"] as RangeKey[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setRange(item)}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    range === item
                      ? "bg-[#FF5A00] text-white"
                      : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200"
                  }`}
                >
                  {item === "7D"
                    ? "7 días"
                    : item === "30D"
                    ? "30 días"
                    : item === "90D"
                    ? "90 días"
                    : "12 meses"}
                </button>
              ))}
              <button
                onClick={() => setRange("CUSTOM")}
                className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  range === "CUSTOM"
                    ? "bg-white text-black"
                    : "text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-200"
                }`}
              >
                Personalizado
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {range === "CUSTOM" && (
                <>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(event) => setCustomStart(event.target.value)}
                    className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-zinc-200 outline-none"
                  />
                  <span className="text-xs text-zinc-600">→</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(event) => setCustomEnd(event.target.value)}
                    className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-xs text-zinc-200 outline-none"
                  />
                </>
              )}

              <button
                onClick={() => setShowFilters((value) => !value)}
                className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm transition ${
                  showFilters || serviceFilter !== "all" || barberFilter !== "all" || statusFilter !== "all"
                    ? "border-[#FF5A00]/40 bg-[#FF5A00]/10 text-[#FF8A52]"
                    : "border-white/10 bg-white/[0.025] text-zinc-300"
                }`}
              >
                <Filter className="h-4 w-4" />
                Filtros
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-3 grid gap-3 border-t border-white/8 pt-3 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Servicio
                </span>
                <div className="relative">
                  <select
                    value={serviceFilter}
                    onChange={(event) => setServiceFilter(event.target.value)}
                    className="h-10 w-full appearance-none rounded-xl border border-white/10 bg-black/40 px-3 pr-9 text-sm text-zinc-200 outline-none"
                  >
                    <option value="all">Todos los servicios</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-zinc-600" />
                </div>
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Profesional
                </span>
                <div className="relative">
                  <select
                    value={barberFilter}
                    onChange={(event) => setBarberFilter(event.target.value)}
                    className="h-10 w-full appearance-none rounded-xl border border-white/10 bg-black/40 px-3 pr-9 text-sm text-zinc-200 outline-none"
                  >
                    <option value="all">Todo el equipo</option>
                    {barbers.map((barber) => (
                      <option key={barber.id} value={barber.id}>
                        {barber.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-zinc-600" />
                </div>
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Estado
                </span>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="h-10 w-full appearance-none rounded-xl border border-white/10 bg-black/40 px-3 pr-9 text-sm text-zinc-200 outline-none"
                  >
                    <option value="all">Todos</option>
                    <option value="completed">Completados</option>
                    <option value="scheduled">Programados</option>
                    <option value="cancelled">Cancelados</option>
                    <option value="no_show">No-show</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-zinc-600" />
                </div>
              </label>

              {(serviceFilter !== "all" ||
                barberFilter !== "all" ||
                statusFilter !== "all") && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-[#FF6A18] md:col-span-3"
                >
                  <X className="h-3.5 w-3.5" />
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </section>

        {error ? (
          <section className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-5 text-sm text-red-300">
            <div className="font-semibold">No pudimos cargar Analytics</div>
            <div className="mt-1 text-red-300/70">{error}</div>
            <button
              onClick={() => fetchAnalytics()}
              className="mt-4 rounded-lg border border-red-400/20 px-3 py-2 text-xs font-semibold"
            >
              Reintentar
            </button>
          </section>
        ) : null}

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Ingresos",
              value: formatMoney(periodRevenue),
              icon: Wallet,
              helper: periodLabel,
              accent: ORANGE,
            },
            {
              label: "Turnos",
              value: formatNumber(bookedAppointments.length),
              icon: CalendarDays,
              helper: `${completedAppointments.length} completados`,
              accent: GREEN,
            },
            {
              label: "Ticket promedio",
              value: formatMoney(averageTicket),
              icon: Target,
              helper: "por turno reservado",
              accent: "#F5F5F4",
            },
            {
              label: "Clientes activos",
              value: formatNumber(activeCustomers),
              icon: Users,
              helper: `${newCustomers.length} nuevos`,
              accent: "#F5F5F4",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <article
                key={card.label}
                className="group rounded-2xl border border-white/10 bg-[#0D0D0D] p-5 transition hover:border-white/15"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/[0.035]">
                    <Icon className="h-4.5 w-4.5" style={{ color: card.accent }} />
                  </div>
                  <Activity className="h-4 w-4 text-zinc-800 transition group-hover:text-zinc-600" />
                </div>
                <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  {card.label}
                </div>
                <div className="mt-1 text-2xl font-semibold tracking-[-0.035em]">
                  {card.value}
                </div>
                <div className="mt-2 text-xs text-zinc-600">{card.helper}</div>
              </article>
            );
          })}
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
          <article className="rounded-2xl border border-white/10 bg-[#0D0D0D] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Revenue intelligence
                </div>
                <h2 className="mt-1 text-lg font-semibold tracking-[-0.025em]">
                  Evolución de ingresos
                </h2>
                <p className="mt-1 text-xs text-zinc-600">
                  {periodLabel} · {formatNumber(filteredAppointments.length)} eventos analizados
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-[#FF5A00]/20 bg-[#FF5A00]/[0.06] px-3 py-2">
                <TrendingUp className="h-4 w-4 text-[#FF6A18]" />
                <span className="text-xs font-semibold text-[#FF8A52]">
                  {formatMoney(periodRevenue)}
                </span>
              </div>
            </div>

            <div className="mt-8 h-[300px]">
              {chart.length ? (
                <div className="flex h-full items-end gap-1.5 sm:gap-2">
                  {chart.map((point, index) => (
                    <div
                      key={`${point.label}-${index}`}
                      className="group relative flex h-full flex-1 flex-col justify-end"
                    >
                      <div
                        className="mx-auto w-full max-w-[46px] rounded-t-md bg-[#FF5A00]/70 transition group-hover:bg-[#FF6A18]"
                        style={{
                          height: `${Math.max(5, (point.revenue / chartMax) * 88)}%`,
                        }}
                      />
                      <div className="mt-2 truncate text-center text-[9px] text-zinc-700 sm:text-[10px]">
                        {point.label}
                      </div>
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-[#111] px-3 py-2 text-xs shadow-xl group-hover:block">
                        <div className="font-semibold text-white">
                          {formatMoney(point.revenue)}
                        </div>
                        <div className="mt-0.5 text-zinc-500">
                          {point.appointments} turnos
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-600">
                  No hay datos para este período.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#0D0D0D] p-5 sm:p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Operational health
            </div>
            <h2 className="mt-1 text-lg font-semibold">Calidad de agenda</h2>

            <div className="mt-6 space-y-5">
              {[
                {
                  label: "Completados",
                  value: completionRate,
                  color: GREEN,
                  icon: ArrowUpRight,
                },
                {
                  label: "Cancelaciones",
                  value: cancellationRate,
                  color: RED,
                  icon: ArrowDownRight,
                },
                {
                  label: "No-show",
                  value: noShowRate,
                  color: "#F59E0B",
                  icon: Clock3,
                },
              ].map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 text-zinc-400">
                        <Icon className="h-3.5 w-3.5" style={{ color: metric.color }} />
                        {metric.label}
                      </span>
                      <span className="font-semibold text-zinc-200">
                        {metric.value.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, metric.value)}%`,
                          background: metric.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
                <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Turnos
                </div>
                <div className="mt-1 text-xl font-semibold">
                  {formatNumber(filteredAppointments.length)}
                </div>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
                <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Ingresos / turno
                </div>
                <div className="mt-1 text-xl font-semibold">
                  {formatMoney(averageTicket)}
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-[#0D0D0D] p-5 sm:p-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Catalog intelligence
                </div>
                <h2 className="mt-1 text-lg font-semibold">Servicios que generan negocio</h2>
              </div>
              <Scissors className="h-5 w-5 text-zinc-700" />
            </div>

            <div className="mt-6 space-y-4">
              {serviceMetrics.slice(0, 6).map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedService(item)}
                  className="group w-full text-left"
                >
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.035] text-[10px] font-bold text-zinc-600">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate font-medium text-zinc-300 group-hover:text-white">
                        {item.name}
                      </span>
                    </div>
                    <span className="shrink-0 font-semibold text-zinc-200">
                      {formatMoney(item.revenue)}
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-[#FF5A00] transition-all group-hover:bg-[#FF6A18]"
                      style={{
                        width: `${Math.max(4, (item.revenue / Math.max(serviceMetrics[0]?.revenue ?? 1, 1)) * 100)}%`,
                      }}
                    />
                  </div>

                  <div className="mt-1.5 flex justify-between text-[10px] text-zinc-600">
                    <span>{item.appointments} turnos</span>
                    <span>{item.share.toFixed(1)}% del revenue</span>
                  </div>
                </button>
              ))}

              {!serviceMetrics.length && (
                <div className="py-10 text-center text-sm text-zinc-600">
                  Sin servicios registrados en el período.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#0D0D0D] p-5 sm:p-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Team intelligence
                </div>
                <h2 className="mt-1 text-lg font-semibold">Performance del equipo</h2>
              </div>
              <Users className="h-5 w-5 text-zinc-700" />
            </div>

            <div className="mt-6 space-y-3">
              {teamMetrics.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedTeam(item)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-left transition hover:border-white/15 hover:bg-white/[0.04]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF5A00]/10 text-xs font-bold text-[#FF7A3D]">
                    {item.name
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-zinc-200">
                      {item.name}
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-600">
                      {item.completed}/{item.appointments} completados ·{" "}
                      {item.completionRate.toFixed(0)}%
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold text-white">
                      {formatMoney(item.revenue)}
                    </div>
                    <div className="mt-1 text-[10px] text-zinc-600">
                      {formatMoney(item.averageTicket)} ticket
                    </div>
                  </div>
                </button>
              ))}

              {!teamMetrics.length && (
                <div className="py-10 text-center text-sm text-zinc-600">
                  Sin datos de equipo en el período.
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr_0.8fr]">
          <article className="rounded-2xl border border-white/10 bg-[#0D0D0D] p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Customer intelligence
                </div>
                <h2 className="mt-1 text-lg font-semibold">Composición de clientes</h2>
              </div>
              <Sparkles className="h-5 w-5 text-[#FF5A00]" />
            </div>

            <div className="mt-6 flex items-center gap-7">
              <div
                className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full"
                style={{
                  background:
                    "conic-gradient(#FF5A00 0deg 140deg, #8A8A8A 140deg 250deg, #333 250deg 360deg)",
                }}
              >
                <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full bg-[#0D0D0D]">
                  <span className="text-2xl font-semibold">{activeCustomers}</span>
                  <span className="text-[9px] uppercase tracking-wider text-zinc-600">
                    activos
                  </span>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-4">
                {customerSegments.map((segment, index) => (
                  <div key={segment.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">{segment.label}</span>
                      <span className="font-semibold text-zinc-200">{segment.value}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${segment.value}%`,
                          background:
                            index === 0 ? "#FF5A00" : index === 1 ? "#8A8A8A" : "#444",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Recurrentes
                </div>
                <div className="mt-1 text-xl font-semibold">{returningCustomers}</div>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3">
                <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                  Nuevos
                </div>
                <div className="mt-1 text-xl font-semibold">{newCustomers.length}</div>
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-[#0D0D0D] p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Demand intelligence
                </div>
                <h2 className="mt-1 text-lg font-semibold">Cuándo trabaja mejor el negocio</h2>
              </div>
              <Clock3 className="h-5 w-5 text-zinc-700" />
            </div>

            <div className="mt-7 flex h-32 items-end gap-2">
              {weekdayMetrics.map((day) => (
                <div key={day.name} className="flex h-full flex-1 flex-col justify-end">
                  <div
                    className="w-full rounded-t-md bg-white/[0.12] transition hover:bg-[#FF5A00]"
                    style={{ height: `${Math.max(5, day.height)}%` }}
                    title={`${day.value} turnos`}
                  />
                  <div className="mt-2 text-center text-[10px] text-zinc-600">
                    {day.name}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 border-t border-white/8 pt-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Horarios pico
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {peakHours.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2"
                  >
                    <span className="text-xs font-semibold text-zinc-200">{item.label}</span>
                    <span className="ml-2 text-[10px] text-zinc-600">{item.count} turnos</span>
                  </div>
                ))}
                {!peakHours.length && (
                  <span className="text-xs text-zinc-600">Sin suficiente actividad.</span>
                )}
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-[#FF5A00]/15 bg-[#FF5A00]/[0.035] p-5 sm:p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF5A00]/10">
              <Target className="h-5 w-5 text-[#FF6A18]" />
            </div>

            <div className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FF7A3D]">
              Growth signal
            </div>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em]">
              Dónde mirar primero
            </h2>

            <div className="mt-5 space-y-3 text-xs leading-5 text-zinc-400">
              {serviceMetrics[0] ? (
                <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                  <div className="font-semibold text-zinc-200">Servicio líder</div>
                  <div className="mt-1">
                    {serviceMetrics[0].name} concentra{" "}
                    {serviceMetrics[0].share.toFixed(1)}% del revenue analizado.
                  </div>
                </div>
              ) : null}

              {teamMetrics[0] ? (
                <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                  <div className="font-semibold text-zinc-200">Top performer</div>
                  <div className="mt-1">
                    {teamMetrics[0].name} lidera con {formatMoney(teamMetrics[0].revenue)}.
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                <div className="font-semibold text-zinc-200">Retención</div>
                <div className="mt-1">
                  {returningCustomers} clientes registraron 2+ visitas durante el período.
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-5 rounded-2xl border border-white/10 bg-[#0D0D0D] p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Historical performance
              </div>
              <h2 className="mt-1 text-lg font-semibold">Comparación mensual</h2>
            </div>
            <span className="text-xs text-zinc-600">
              Últimos 6 meses · comparación de revenue y volumen
            </span>
          </div>

          <div className="mt-7 grid grid-cols-6 gap-2 sm:gap-4">
            {monthlyComparison.map((month) => (
              <div key={month.label} className="min-w-0">
                <div className="flex h-36 items-end justify-center rounded-xl bg-white/[0.018] p-2">
                  <div
                    className="w-full max-w-12 rounded-t-md bg-[#FF5A00]/70 transition hover:bg-[#FF6A18]"
                    style={{
                      height: `${Math.max(5, (month.revenue / monthMax) * 100)}%`,
                    }}
                    title={`${month.label}: ${formatMoney(month.revenue)}`}
                  />
                </div>
                <div className="mt-2 truncate text-center text-[10px] text-zinc-500">
                  {month.label}
                </div>
                <div className="mt-1 text-center text-[10px] font-semibold text-zinc-300">
                  {formatMoney(month.revenue)}
                </div>
                <div className="mt-0.5 text-center text-[9px] text-zinc-700">
                  {month.appointments} turnos
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-5 flex flex-col gap-3 border-t border-white/8 pt-5 text-[10px] text-zinc-700 sm:flex-row sm:items-center sm:justify-between">
          <span>BarberOS Analytics · datos operativos del workspace</span>
          <span>
            {formatNumber(filteredAppointments.length)} eventos · {formatNumber(activeCustomers)} clientes activos
          </span>
        </footer>
      </div>

      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <button
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedTeam(null)}
            aria-label="Cerrar"
          />
          <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#0A0A0A] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FF6A18]">
                  Team 360
                </div>
                <h3 className="mt-1 text-xl font-semibold">{selectedTeam.name}</h3>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-white/[0.05] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
                <div className="text-[10px] uppercase tracking-wider text-zinc-600">Revenue</div>
                <div className="mt-1 text-xl font-semibold">{formatMoney(selectedTeam.revenue)}</div>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
                <div className="text-[10px] uppercase tracking-wider text-zinc-600">Ticket</div>
                <div className="mt-1 text-xl font-semibold">
                  {formatMoney(selectedTeam.averageTicket)}
                </div>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
                <div className="text-[10px] uppercase tracking-wider text-zinc-600">Turnos</div>
                <div className="mt-1 text-xl font-semibold">{selectedTeam.appointments}</div>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
                <div className="text-[10px] uppercase tracking-wider text-zinc-600">Completados</div>
                <div className="mt-1 text-xl font-semibold">{selectedTeam.completed}</div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Performance
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-[#FF5A00]"
                  style={{ width: `${Math.min(100, selectedTeam.completionRate)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs">
                <span className="text-zinc-500">Tasa de completado</span>
                <span className="font-semibold">{selectedTeam.completionRate.toFixed(1)}%</span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {selectedService && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <button
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedService(null)}
            aria-label="Cerrar"
          />
          <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#0A0A0A] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FF6A18]">
                  Service 360
                </div>
                <h3 className="mt-1 text-xl font-semibold">{selectedService.name}</h3>
              </div>
              <button
                onClick={() => setSelectedService(null)}
                className="rounded-lg p-2 text-zinc-500 hover:bg-white/[0.05] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-7 rounded-2xl border border-[#FF5A00]/15 bg-[#FF5A00]/[0.04] p-5">
              <div className="text-xs text-zinc-500">Revenue atribuible</div>
              <div className="mt-1 text-3xl font-semibold">{formatMoney(selectedService.revenue)}</div>
              <div className="mt-2 text-xs text-zinc-600">
                {selectedService.share.toFixed(1)}% del revenue del período.
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
                <div className="text-[10px] uppercase tracking-wider text-zinc-600">Turnos</div>
                <div className="mt-1 text-xl font-semibold">{selectedService.appointments}</div>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
                <div className="text-[10px] uppercase tracking-wider text-zinc-600">Completados</div>
                <div className="mt-1 text-xl font-semibold">{selectedService.completed}</div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <div className="text-[10px] uppercase tracking-wider text-zinc-600">
                Participación del catálogo
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-[#FF5A00]"
                  style={{ width: `${Math.min(100, selectedService.share)}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                {selectedService.share.toFixed(1)}% del revenue analizado.
              </div>
            </div>
          </aside>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-[60] rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-zinc-200 shadow-2xl">
          {toast}
        </div>
      )}
    </main>
  );
}
