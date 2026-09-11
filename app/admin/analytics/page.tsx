/* app/admin/analytics/page.tsx */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DM_Mono, Manrope, Sora } from "next/font/google";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
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
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-barberos-ui",
});
const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-barberos-display",
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-barberos-data",
});

type RangeKey = "7D" | "30D" | "12M" | "CUSTOM";

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

type ServiceMetric = {
  id: string;
  name: string;
  appointments: number;
  completed: number;
  revenue: number;
  share: number;
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

const getService = (appointment: Appointment) =>
  Array.isArray(appointment.service)
    ? appointment.service[0] ?? null
    : appointment.service;

const normalizeStatus = (status: unknown) =>
  String(status ?? "")
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

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

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  );
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
  return { start: startOfDay(addMonths(now, -11)), end };
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(date).replace(".", "");
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "short",
  }).format(date).replace(".", "");
}

function buildRevenuePoints(
  appointments: Appointment[],
  start: Date,
  end: Date,
  range: RangeKey
) {
  const points: { label: string; revenue: number; appointments: number }[] = [];

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
        revenue: rows.filter(isBookable).reduce(
          (sum, row) => sum + Number(getService(row)?.price ?? 0),
          0
        ),
        appointments: rows.filter(isBookable).length,
      });

      cursor = addMonths(cursor, 1);
    }

    return points;
  }

  const days =
    Math.ceil((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000) +
    1;

  for (let index = 0; index < Math.max(1, days); index++) {
    const day = startOfDay(addDays(start, index));
    const next = endOfDay(day);
    const rows = appointments.filter((appointment) => {
      const date = new Date(appointment.start_at);
      return date >= day && date <= next;
    });

    points.push({
      label: formatDay(day),
      revenue: rows.filter(isBookable).reduce(
        (sum, row) => sum + Number(getService(row)?.price ?? 0),
        0
      ),
      appointments: rows.filter(isBookable).length,
    });
  }

  return points;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="section-label text-[#ff6a18]">{children}</div>;
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  accent = "orange",
  index = "01",
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Wallet;
  accent?: "orange" | "green" | "neutral";
  index?: string;
}) {
  const accentOn = accent === "orange";
  return (
    <div className="panel relative min-h-[150px] p-5">
      {accentOn && (
        <div className="absolute left-0 top-0 h-px w-1/2 bg-gradient-to-r from-[#ff5a00]/75 to-transparent" />
      )}

      <div className="flex items-start justify-between gap-3">
        <span className="data flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.16em] text-white/64">
          <span className={accentOn ? "text-[#ff6a18]" : "text-white/30"}>
            <Icon size={15} />
          </span>
          {label}
        </span>
        <span className="data text-[7px] uppercase tracking-[.12em] text-white/27">
          {index}
        </span>
      </div>

      <div className="display mt-7 truncate text-[30px] font-semibold leading-none tracking-[-.065em] text-white">
        {value}
      </div>

      <div className="mt-3 truncate text-[13px] text-white/74">
        {helper}
      </div>
    </div>
  );
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
              .select("id,name,price,duration_minutes,active")
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

  const filteredAppointments = useMemo(
    () =>
      appointments.filter((appointment) => {
        if (
          serviceFilter !== "all" &&
          appointment.service_id !== serviceFilter
        )
          return false;
        if (barberFilter !== "all" && appointment.barber_id !== barberFilter)
          return false;

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

        return true;
      }),
    [appointments, serviceFilter, barberFilter, statusFilter]
  );

  const bookedAppointments = useMemo(
    () => filteredAppointments.filter(isBookable),
    [filteredAppointments]
  );
  const completedAppointments = useMemo(
    () =>
      filteredAppointments.filter((appointment) =>
        isCompleted(appointment.status)
      ),
    [filteredAppointments]
  );
  const cancelledAppointments = useMemo(
    () =>
      filteredAppointments.filter((appointment) =>
        isCancelled(appointment.status)
      ),
    [filteredAppointments]
  );
  const noShowAppointments = useMemo(
    () =>
      filteredAppointments.filter((appointment) =>
        isNoShow(appointment.status)
      ),
    [filteredAppointments]
  );

  const periodRevenue = useMemo(
    () =>
      bookedAppointments.reduce(
        (sum, appointment) =>
          sum + Number(getService(appointment)?.price ?? 0),
        0
      ),
    [bookedAppointments]
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

  const newCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        const created = new Date(customer.created_at);
        return created >= dates.start && created <= dates.end;
      }),
    [customers, dates]
  );

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

  const serviceMetrics = useMemo<ServiceMetric[]>(() => {
    const map = new Map<string, ServiceMetric>();

    filteredAppointments.forEach((appointment) => {
      const service = getService(appointment);
      const id =
        appointment.service_id ?? `unknown-${service?.name ?? "service"}`;

      if (!map.has(id)) {
        map.set(id, {
          id,
          name: service?.name ?? "Servicio sin nombre",
          appointments: 0,
          completed: 0,
          revenue: 0,
          share: 0,
        });
      }

      const metric = map.get(id)!;
      metric.appointments += 1;
      if (isCompleted(appointment.status)) metric.completed += 1;
      if (isBookable(appointment.status)) {
        metric.revenue += Number(service?.price ?? 0);
      }
    });

    const totalRevenue = [...map.values()].reduce(
      (sum, item) => sum + item.revenue,
      0
    );

    return [...map.values()]
      .map((item) => ({
        ...item,
        share: totalRevenue ? (item.revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredAppointments]);

  const teamMetrics = useMemo<TeamMetric[]>(() => {
    const map = new Map<string, TeamMetric>();

    filteredAppointments.forEach((appointment) => {
      const id = appointment.barber_id ?? "unassigned";
      const barber = barbers.find(
        (item) => item.id === appointment.barber_id
      );

      if (!map.has(id)) {
        map.set(id, {
          id,
          name: barber?.name ?? "Sin asignar",
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

  const revenuePoints = useMemo(
    () =>
      buildRevenuePoints(
        filteredAppointments,
        dates.start,
        dates.end,
        range
      ),
    [filteredAppointments, dates, range]
  );

  const revenueMax = Math.max(
    ...revenuePoints.map((point) => point.revenue),
    1
  );

  const revenueSvgPoints = useMemo(() => {
    if (!revenuePoints.length) return [];
    const width = 1000;
    const chartHeight = 230;
    const horizontalPad = 18;
    const usableWidth = width - horizontalPad * 2;

    return revenuePoints.map((point, index) => {
      const x =
        revenuePoints.length === 1
          ? width / 2
          : horizontalPad + (index / (revenuePoints.length - 1)) * usableWidth;
      const y =
        chartHeight -
        18 -
        (point.revenue / revenueMax) * (chartHeight - 44);

      return {
        ...point,
        x,
        y,
      };
    });
  }, [revenuePoints, revenueMax]);

  const revenueTrend = useMemo(() => {
    if (revenuePoints.length < 2) return null;
    const midpoint = Math.max(1, Math.floor(revenuePoints.length / 2));
    const first = revenuePoints
      .slice(0, midpoint)
      .reduce((sum, point) => sum + point.revenue, 0);
    const second = revenuePoints
      .slice(midpoint)
      .reduce((sum, point) => sum + point.revenue, 0);
    if (!first) return second ? 100 : 0;
    return ((second - first) / first) * 100;
  }, [revenuePoints]);

  const weekdayMetrics = useMemo(() => {
    const names = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const values = Array.from({ length: 7 }, () => 0);

    bookedAppointments.forEach((appointment) => {
      values[new Date(appointment.start_at).getDay()] += 1;
    });

    const max = Math.max(...values, 1);
    return names.map((name, index) => ({
      name,
      value: values[index],
      height: (values[index] / max) * 100,
    }));
  }, [bookedAppointments]);

  const peakHours = useMemo(() => {
    const buckets = new Map<number, number>();

    bookedAppointments.forEach((appointment) => {
      const hour = new Date(appointment.start_at).getHours();
      buckets.set(hour, (buckets.get(hour) ?? 0) + 1);
    });

    return [...buckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([hour, count]) => ({
        label: `${String(hour).padStart(2, "0")}:00`,
        count,
      }));
  }, [bookedAppointments]);

  const customerSegments = useMemo(() => {
    const visits = new Map<string, number>();

    bookedAppointments.forEach((appointment) => {
      if (!appointment.customer_id) return;
      visits.set(
        appointment.customer_id,
        (visits.get(appointment.customer_id) ?? 0) + 1
      );
    });

    const total = visits.size || 1;
    const vip = [...visits.values()].filter((value) => value >= 6).length;
    const recurrent = [...visits.values()].filter(
      (value) => value >= 2 && value < 6
    ).length;
    const first = [...visits.values()].filter((value) => value === 1).length;

    return [
      {
        label: "VIP",
        value: Math.round((vip / total) * 100),
        detail: "6+ visitas",
      },
      {
        label: "Recurrentes",
        value: Math.round((recurrent / total) * 100),
        detail: "2–5 visitas",
      },
      {
        label: "Primera visita",
        value: Math.round((first / total) * 100),
        detail: "1 visita",
      },
    ];
  }, [bookedAppointments]);

  const monthlyComparison = useMemo(() => {
    const rows: { label: string; revenue: number; appointments: number }[] = [];
    const now = new Date();

    for (let index = 5; index >= 0; index--) {
      const month = new Date(
        now.getFullYear(),
        now.getMonth() - index,
        1
      );
      const next = new Date(
        now.getFullYear(),
        now.getMonth() - index + 1,
        0,
        23,
        59,
        59
      );

      const rowsInMonth = appointments.filter((appointment) => {
        const date = new Date(appointment.start_at);
        return (
          date >= month &&
          date <= next &&
          isBookable(appointment.status)
        );
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

  const monthMax = Math.max(
    ...monthlyComparison.map((month) => month.revenue),
    1
  );

  const periodLabel = useMemo(() => {
    if (range === "7D") return "Últimos 7 días";
    if (range === "30D") return "Últimos 30 días";
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
      .map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
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
      <main
        className={`${manrope.variable} ${sora.variable} ${dmMono.variable} barberos-dashboard min-h-screen text-white`}
      >
        <div className="flex min-h-screen items-center justify-center">
          <div className="panel-surface flex items-center gap-3 rounded-2xl px-6 py-4 text-sm text-white/65">
            <Loader2 className="h-4 w-4 animate-spin text-[#FF6A18]" />
            Cargando inteligencia de negocio...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`${manrope.variable} ${sora.variable} ${dmMono.variable} barberos-dashboard min-h-screen text-white`}
    >
      <style jsx>{`
        .barberos-dashboard {
          --ink: #070707;
          --surface: #0b0b0b;
          --surface-2: #111111;
          --line: rgba(255, 255, 255, 0.075);
          --line-soft: rgba(255, 255, 255, 0.045);
          --muted: rgba(255, 255, 255, 0.58);
          --quiet: rgba(255, 255, 255, 0.38);
          --orange: #ff5a00;
          --orange-bright: #ff7a22;
          font-family: var(--font-barberos-ui), Manrope, sans-serif;
          font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          letter-spacing: -0.014em;
          background:
            radial-gradient(
              720px 360px at 88% -8%,
              rgba(255, 90, 0, 0.045),
              transparent 70%
            ),
            radial-gradient(
              520px 320px at 8% 14%,
              rgba(255, 255, 255, 0.01),
              transparent 74%
            ),
            #070707;
        }

        .barberos-dashboard h1,
        .barberos-dashboard h2,
        .barberos-dashboard h3 {
          font-family: var(--font-barberos-display), Sora, sans-serif;
          font-feature-settings: "kern" 1, "liga" 1;
          text-wrap: balance;
        }

        .display {
          font-family: var(--font-barberos-display), Sora, sans-serif;
        }

        .data {
          font-family: var(--font-barberos-data), monospace;
        }

        .data-number {
          font-family: var(--font-barberos-display), Sora, sans-serif;
          font-variant-numeric: tabular-nums lining-nums;
          font-feature-settings: "tnum" 1, "lnum" 1, "zero" 1, "kern" 1;
          letter-spacing: -.065em;
        }

        .section-label {
          display: block;
          min-height: 11px;
          color: #ff6a18 !important;
          font-family: var(--font-barberos-ui), Manrope, sans-serif;
          font-size: 9px;
          line-height: 1.15;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-feature-settings: "kern" 1, "liga" 1;
        }

        .meta-label {
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-size: 9px;
          line-height: 1;
          font-weight: 650;
        }

        .caption {
          font-size: 11px;
          line-height: 1.45;
          font-weight: 520;
        }

        .panel-surface {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.028),
              rgba(255, 255, 255, 0.01) 52%,
              rgba(255, 90, 0, 0.012)
            ),
            rgba(10, 10, 10, 0.96);
          border: 1px solid var(--line) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.022),
            0 18px 58px rgba(0, 0, 0, 0.15);
          transition:
            transform 240ms cubic-bezier(0.22, 0.61, 0.36, 1),
            border-color 240ms ease,
            box-shadow 240ms ease;
        }

        .panel-surface::before {
          content: "";
          position: absolute;
          pointer-events: none;
          width: 340px;
          height: 180px;
          right: -190px;
          top: -150px;
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(255, 90, 0, 0.075),
            transparent 68%
          );
          z-index: -1;
        }

        .panel-surface::after {
          content: "";
          position: absolute;
          pointer-events: none;
          inset: 0;
          border-top: 1px solid rgba(255, 255, 255, 0.022);
          border-radius: inherit;
        }

        .panel-surface:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 90, 0, 0.14) !important;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.032),
            0 24px 70px rgba(0, 0, 0, 0.22),
            0 0 0 1px rgba(255, 90, 0, 0.018);
        }

        .chart-grid {
          background-image:
            linear-gradient(
              to bottom,
              rgba(255, 255, 255, 0.055) 1px,
              transparent 1px
            ),
            linear-gradient(
              to right,
              rgba(255, 255, 255, 0.018) 1px,
              transparent 1px
            );
          background-size: 100% 25%, 12.5% 100%;
        }

        .bar {
          background: linear-gradient(
            180deg,
            rgba(255, 122, 34, 0.92),
            rgba(255, 90, 0, 0.58)
          );
          box-shadow: 0 0 28px rgba(255, 90, 0, 0.08);
        }

        .soft-card {
          border: 1px solid rgba(255, 255, 255, 0.065);
          background: rgba(255, 255, 255, 0.018);
        }

        .primary {\n          background: linear-gradient(135deg,#ff6a18 0%,#ff5a00 52%,#e84b00 100%);\n          box-shadow: 0 12px 30px rgba(255,90,0,.14), inset 0 1px 0 rgba(255,255,255,.26);\n        }\n\n        .primary-action {
          background: linear-gradient(
            135deg,
            #ff6a18 0%,
            #ff5a00 52%,
            #e84b00 100%
          );
          box-shadow:
            0 12px 30px rgba(255, 90, 0, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.26);
        }

        .control {
          border: 1px solid rgba(255, 255, 255, 0.075);
          background: rgba(255, 255, 255, 0.022);
          color: rgba(255, 255, 255, 0.72);
          transition:
            border-color 180ms ease,
            background 180ms ease,
            color 180ms ease;
        }

        .control:hover {
          border-color: rgba(255, 255, 255, 0.13);
          background: rgba(255, 255, 255, 0.045);
          color: #fff;
        }

        .range-active {
          background: rgba(255, 90, 0, 0.12);
          border-color: rgba(255, 90, 0, 0.24);
          color: #ff8a52;
        }

        @media (max-width: 640px) {
          .metric-card {
            min-height: 150px;
          }

          .metric-card__value {
            font-size: 24px;
          }
        }
      `}</style>

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_82%_0%,rgba(255,90,0,0.045),transparent_26%)]" />

      <div className="relative mx-auto max-w-[1680px] px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
        {/* HEADER — MASTER BARBEROS */}
        <header className="mb-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="data text-[9px] font-extrabold uppercase tracking-[.18em] text-white/82">
                  BARBEROS
                </span>
                <span className="text-white/10">/</span>
                <span className="data text-[9px] font-extrabold uppercase tracking-[.18em] text-[#ff6a18]">
                  INTELIGENCIA DEL NEGOCIO
                </span>
                <span className="ml-1 hidden h-px w-10 bg-gradient-to-r from-orange-500/55 to-transparent sm:block" />
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <h1 className="display text-[34px] font-semibold leading-[.91] tracking-[-.075em] text-white sm:text-[42px]">
                  Analytics
                </h1>
              </div>

              <p className="mt-2 max-w-xl text-[14px] leading-6 text-white/72">
                Convertí la operación de BarberOS en decisiones: ingresos, demanda,
                equipo, clientes y oportunidades de crecimiento.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchAnalytics(true)}
                aria-label="Actualizar analytics"
                className="control flex h-10 w-10 items-center justify-center rounded-[11px] text-white/72"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              </button>

              <button
                type="button"
                onClick={exportCSV}
                className="primary flex h-10 items-center gap-2 rounded-[11px] px-4 text-[11px] font-semibold text-white"
              >
                <Download size={14} />
                Exportar reporte
              </button>
            </div>
          </div>
        </header>

        {/* PERIOD / FILTER BAR */}
        <section className="panel-surface mb-5 rounded-2xl p-3.5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-1 rounded-xl border border-white/[0.045] bg-black/30 p-1">
              {(["7D", "30D", "12M"] as RangeKey[]).map((item) => (
                <button
                  key={item}
                  onClick={() => setRange(item)}
                  className={`rounded-lg px-3.5 py-2 text-[11px] font-semibold transition ${
                    range === item
                      ? "bg-[#FF5A00] text-white shadow-[0_6px_20px_rgba(255,90,0,.12)]"
                      : "text-white/48 hover:bg-white/[0.04] hover:text-white/80"
                  }`}
                >
                  {item === "7D"
                    ? "7 días"
                    : item === "30D"
                    ? "30 días"
                    : "12 meses"}
                </button>
              ))}

              <button
                onClick={() => setRange("CUSTOM")}
                className={`rounded-lg px-3.5 py-2 text-[11px] font-semibold transition ${
                  range === "CUSTOM"
                    ? "bg-white text-black"
                    : "text-white/48 hover:bg-white/[0.04] hover:text-white/80"
                }`}
              >
                Personalizado
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {range === "CUSTOM" ? (
                <>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(event) => setCustomStart(event.target.value)}
                    className="h-9 rounded-lg border border-white/10 bg-black/30 px-3 text-[11px] text-white/72 outline-none"
                  />
                  <span className="text-[13px] text-white/74">→</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(event) => setCustomEnd(event.target.value)}
                    className="h-9 rounded-lg border border-white/10 bg-black/30 px-3 text-[11px] text-white/72 outline-none"
                  />
                </>
              ) : null}

              <button
                onClick={() => setShowFilters((value) => !value)}
                className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[11px] font-semibold transition ${
                  showFilters ||
                  serviceFilter !== "all" ||
                  barberFilter !== "all" ||
                  statusFilter !== "all"
                    ? "border-[#FF5A00]/35 bg-[#FF5A00]/10 text-[#FF8A52]"
                    : "border-white/10 bg-white/[0.02] text-white/72"
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                Filtros
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    showFilters ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>
          </div>

          {showFilters ? (
            <div className="mt-3 grid gap-3 border-t border-white/[0.06] pt-3 md:grid-cols-3">
              {[
                {
                  label: "Servicio",
                  value: serviceFilter,
                  setter: setServiceFilter,
                  options: [
                    ["all", "Todos los servicios"],
                    ...services.map((service) => [service.id, service.name]),
                  ],
                },
                {
                  label: "Profesional",
                  value: barberFilter,
                  setter: setBarberFilter,
                  options: [
                    ["all", "Todo el equipo"],
                    ...barbers.map((barber) => [barber.id, barber.name]),
                  ],
                },
                {
                  label: "Estado",
                  value: statusFilter,
                  setter: setStatusFilter,
                  options: [
                    ["all", "Todos"],
                    ["completed", "Completados"],
                    ["scheduled", "Programados"],
                    ["cancelled", "Cancelados"],
                    ["no_show", "No-show"],
                  ],
                },
              ].map((filter) => (
                <label key={filter.label} className="space-y-1.5">
                  <span className="meta-label text-white/58">{filter.label}</span>
                  <div className="relative">
                    <select
                      value={filter.value}
                      onChange={(event) => filter.setter(event.target.value)}
                      className="h-10 w-full appearance-none rounded-lg border border-white/10 bg-black/30 px-3 pr-9 text-[12px] text-white/75 outline-none"
                    >
                      {filter.options.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 text-white/42" />
                  </div>
                </label>
              ))}

              {(serviceFilter !== "all" ||
                barberFilter !== "all" ||
                statusFilter !== "all") && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-2 text-left text-[11px] font-semibold text-[#FF6A18] md:col-span-3"
                >
                  <X className="h-3.5 w-3.5" />
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : null}
        </section>

        {error ? (
          <section className="panel-surface mb-5 rounded-2xl border-red-500/20 bg-red-500/[0.04] p-5">
            <div className="text-[13px] font-semibold text-red-200">
              No pudimos cargar Analytics
            </div>
            <div className="mt-1 text-[12px] text-red-200/60">{error}</div>
            <button
              onClick={() => fetchAnalytics()}
              className="mt-4 rounded-lg border border-red-400/20 px-3 py-2 text-[11px] font-semibold text-red-200"
            >
              Reintentar
            </button>
          </section>
        ) : null}

        {/* KPI STRIP */}
        <section className="mb-7 grid gap-0 border-y border-white/[0.055] sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Ingresos",
              value: formatMoney(periodRevenue),
              helper: periodLabel,
              icon: Wallet,
              accent: "orange",
            },
            {
              label: "Turnos",
              value: formatNumber(bookedAppointments.length),
              helper: `${formatNumber(completedAppointments.length)} completados`,
              icon: CalendarDays,
              accent: "green",
            },
            {
              label: "Ticket promedio",
              value: formatMoney(averageTicket),
              helper: "por turno reservado",
              icon: Target,
              accent: "neutral",
            },
            {
              label: "Clientes activos",
              value: formatNumber(activeCustomers),
              helper: `${formatNumber(newCustomers.length)} nuevos en el período`,
              icon: Users,
              accent: "neutral",
            },
          ].map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.label}
                className={`group relative px-2 py-5 sm:px-5 xl:px-6 ${
                  index > 0 ? "border-t border-white/[0.055] sm:border-l sm:border-t-0" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`metric-icon metric-icon--${metric.accent}`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="meta-label text-white/78">{metric.label}</span>
                  </div>
                  <span className="data text-[9px] tracking-[0.14em] text-white/40">
                    DATA
                  </span>
                </div>

                <div className={`display mt-4 text-[29px] font-semibold leading-none tracking-[-0.065em] sm:text-[31px] ${metric.label === "Ingresos" ? "text-[#FF7A22]" : "text-white"}`}>
                  {metric.value}
                </div>
                <div className="mt-2 text-[12px] leading-5 text-white/72">
                  {metric.helper}
                </div>
              </div>
            );
          })}
        </section>

        {/* REVENUE + SALUD OPERATIVA */}
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.72fr)_minmax(330px,.78fr)]">
          <article className="panel-surface rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <SectionLabel>INGRESOS</SectionLabel>
                <h2 className="display mt-2 text-[20px] font-semibold tracking-[-.04em] text-white">
                  Evolución de ingresos
                </h2>
                <p className="caption mt-1 text-white/72">
                  {periodLabel} · {formatNumber(filteredAppointments.length)} eventos analizados
                </p>
              </div>

              <div className="rounded-xl border border-[#FF5A00]/18 bg-[#FF5A00]/[0.055] px-3.5 py-2.5">
                <div className="meta-label text-[#FF8A52]">Revenue</div>
                <div className="data-number mt-1 text-[16px] font-semibold text-white">
                  {formatMoney(periodRevenue)}
                </div>
              </div>
            </div>

            <div className="mt-7">
              <div className="chart-grid relative h-[300px] overflow-hidden rounded-xl border border-white/[0.045] bg-black/15 px-2 pt-3">
                <div className="absolute inset-x-0 top-3 flex justify-between px-3 text-[10px] text-white/60">
                  <span>{formatMoney(revenueMax)}</span>
                  <span>0</span>
                </div>

                {revenueSvgPoints.length ? (
                  <>
                    <svg
                      viewBox="0 0 1000 230"
                      preserveAspectRatio="none"
                      className="absolute inset-x-3 bottom-9 top-9 h-[220px] w-[calc(100%-24px)] overflow-visible"
                      aria-label="Evolución de ingresos"
                    >
                      <defs>
                        <linearGradient id="analyticsRevenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(255,106,24,0.24)" />
                          <stop offset="100%" stopColor="rgba(255,90,0,0)" />
                        </linearGradient>
                      </defs>

                      <polygon
                        points={`18,212 ${revenueSvgPoints
                          .map((point) => `${point.x},${point.y}`)
                          .join(" ")} ${revenueSvgPoints[revenueSvgPoints.length - 1].x},212`}
                        fill="url(#analyticsRevenueFill)"
                      />

                      <polyline
                        points={revenueSvgPoints
                          .map((point) => `${point.x},${point.y}`)
                          .join(" ")}
                        fill="none"
                        stroke="#FF6A18"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />

                      {revenueSvgPoints.map((point, index) => (
                        <g key={`${point.label}-${index}`} className="group">
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="4.5"
                            fill="#0B0B0B"
                            stroke="#FF6A18"
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                          />
                          <circle
                            cx={point.x}
                            cy={point.y}
                            r="10"
                            fill="transparent"
                          />
                          <title>
                            {point.label}: {formatMoney(point.revenue)} · {point.appointments} turnos
                          </title>
                        </g>
                      ))}
                    </svg>

                    <div className="absolute inset-x-3 bottom-2 flex justify-between gap-2">
                      {revenueSvgPoints.map((point, index) => (
                        <span
                          key={`${point.label}-${index}`}
                          className="min-w-0 flex-1 truncate text-center text-[10px] font-medium text-white/42"
                        >
                          {point.label}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[12px] text-white/42">
                    No hay datos para este período.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="soft-card rounded-xl p-3.5">
                <div className="meta-label text-white/58">Completados</div>
                <div className="data-number mt-2 text-[19px] font-semibold text-white">
                  {formatNumber(completedAppointments.length)}
                </div>
              </div>
              <div className="soft-card rounded-xl p-3.5">
                <div className="meta-label text-white/58">Ticket</div>
                <div className="data-number mt-2 text-[19px] font-semibold text-white">
                  {formatMoney(averageTicket)}
                </div>
              </div>
              <div className="soft-card rounded-xl p-3.5">
                <div className="meta-label text-white/58">Tendencia</div>
                <div
                  className={`mt-2 flex items-center gap-1.5 data text-[19px] ${
                    revenueTrend !== null && revenueTrend >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {revenueTrend !== null && revenueTrend >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {revenueTrend === null ? "—" : `${revenueTrend >= 0 ? "+" : ""}${revenueTrend.toFixed(1)}%`}
                </div>
              </div>
            </div>
          </article>

          <article className="panel-surface rounded-2xl p-5 sm:p-6">
            <SectionLabel>SALUD OPERATIVA</SectionLabel>
            <h2 className="display mt-2 text-[20px] font-semibold tracking-[-.04em] text-white">
              Calidad de agenda
            </h2>

            <div className="mt-7 space-y-6">
              {[
                {
                  label: "Completados",
                  value: completionRate,
                  color: GREEN,
                  icon: CheckCircle2,
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
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[12px] font-semibold text-white/62">
                        <Icon className="h-3.5 w-3.5" style={{ color: metric.color }} />
                        {metric.label}
                      </span>
                      <span className="data-number text-[13px] font-semibold text-white/82">
                        {metric.value.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.055]">
                      <div
                        className="h-full rounded-full transition-all"
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

            <div className="mt-8 border-t border-white/[0.055] pt-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="soft-card rounded-xl p-3.5">
                  <div className="meta-label text-white/58">Eventos</div>
                  <div className="display mt-2 text-[22px] font-semibold tracking-[-0.04em] text-white">{formatNumber(filteredAppointments.length)}</div>
                </div>
                <div className="soft-card rounded-xl p-3.5">
                  <div className="meta-label text-white/58">Ingresos / turno</div>
                  <div className="data-number mt-2 text-[18px] font-semibold text-white">{formatMoney(averageTicket)}</div>
                </div>
              </div>
            </div>
          </article>
        </section>

        {/* SERVICES + TEAM */}
        <section className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="panel-surface rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <SectionLabel>SERVICIOS</SectionLabel>
                <h2 className="display mt-2 text-[20px] font-semibold tracking-[-.04em] text-white">
                  Servicios que generan negocio
                </h2>
                <p className="caption mt-1 text-white/72">
                  Revenue y volumen por servicio.
                </p>
              </div>
              <Scissors className="h-5 w-5 text-white/20" />
            </div>

            <div className="mt-6 space-y-4">
              {serviceMetrics.slice(0, 6).map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedService(item)}
                  className="group block w-full text-left"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="data flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.025] text-[13px] text-white/74">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate text-[14px] font-semibold text-white/82 transition group-hover:text-white">
                        {item.name}
                      </span>
                    </div>
                    <span className="data shrink-0 text-[14px] font-semibold text-white">
                      {formatMoney(item.revenue)}
                    </span>
                  </div>

                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full bg-[#FF5A00] transition-all group-hover:bg-[#FF7A22]"
                      style={{
                        width: `${Math.max(
                          4,
                          (item.revenue /
                            Math.max(serviceMetrics[0]?.revenue ?? 1, 1)) *
                            100
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="mt-1.5 flex justify-between text-[13px] text-white/74">
                    <span>{item.appointments} turnos · {item.completed} completados</span>
                    <span>{item.share.toFixed(1)}% del revenue</span>
                  </div>
                </button>
              ))}

              {!serviceMetrics.length ? (
                <div className="py-10 text-center text-[12px] text-white/38">
                  Sin servicios registrados en el período.
                </div>
              ) : null}
            </div>
          </article>

          <article className="panel-surface rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <SectionLabel>EQUIPO</SectionLabel>
                <h2 className="display mt-2 text-[20px] font-semibold tracking-[-.04em] text-white">
                  Performance del equipo
                </h2>
                <p className="caption mt-1 text-white/72">
                  Productividad, revenue y cumplimiento.
                </p>
              </div>
              <Users className="h-5 w-5 text-white/20" />
            </div>

            <div className="mt-6 space-y-2.5">
              {teamMetrics.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedTeam(item)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.055] bg-white/[0.018] p-3.5 text-left transition hover:border-[#FF5A00]/15 hover:bg-white/[0.032]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#FF5A00]/15 bg-[#FF5A00]/[0.07] text-[11px] font-bold text-[#FF7A3D]">
                    {item.name
                      .split(" ")
                      .map((word) => word[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold text-white/90 group-hover:text-white">
                      {item.name}
                    </div>
                    <div className="mt-1 text-[13px] text-white/74">
                      {item.completed}/{item.appointments} completados ·{" "}
                      {item.completionRate.toFixed(0)}%
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="data-number text-[14px] font-semibold text-white">
                      {formatMoney(item.revenue)}
                    </div>
                    <div className="mt-1 text-[13px] text-white/74">
                      {formatMoney(item.averageTicket)} ticket
                    </div>
                  </div>
                </button>
              ))}

              {!teamMetrics.length ? (
                <div className="py-10 text-center text-[12px] text-white/38">
                  Sin datos de equipo en el período.
                </div>
              ) : null}
            </div>
          </article>
        </section>

        {/* CUSTOMER + DEMAND + SIGNAL */}
        <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_.82fr]">
          <article className="panel-surface rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <SectionLabel>CLIENTES</SectionLabel>
                <h2 className="display mt-2 text-[20px] font-semibold tracking-[-.04em] text-white">
                  Composición de clientes
                </h2>
              </div>
              <Sparkles className="h-5 w-5 text-[#FF5A00]" />
            </div>

            <div className="mt-7 flex items-center gap-6">
              <div
                className="relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full"
                style={{
                  background:
                    "conic-gradient(#FF5A00 0deg 138deg, #777 138deg 250deg, #333 250deg 360deg)",
                }}
              >
                <div className="flex h-[72px] w-[72px] flex-col items-center justify-center rounded-full bg-[#0c0c0c]">
                  <span className="data-number text-[21px] font-semibold text-white">{activeCustomers}</span>
                  <span className="meta-label mt-1 text-[8px] text-white/42">
                    activos
                  </span>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-4">
                {customerSegments.map((segment, index) => (
                  <div key={segment.label}>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-white/76">
                        {segment.label}
                      </span>
                      <span className="data text-[13px] font-medium text-white/88">
                        {segment.value}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${segment.value}%`,
                          background:
                            index === 0
                              ? "#FF5A00"
                              : index === 1
                              ? "#8A8A8A"
                              : "#444",
                        }}
                      />
                    </div>
                    <div className="mt-1 text-[12px] text-white/64">
                      {segment.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="soft-card rounded-xl p-3.5">
                <div className="meta-label text-white/58">Recurrentes</div>
                <div className="display mt-2 text-[22px] font-semibold tracking-[-0.04em] text-white">{returningCustomers}</div>
              </div>
              <div className="soft-card rounded-xl p-3.5">
                <div className="meta-label text-white/58">Nuevos</div>
                <div className="display mt-2 text-[22px] font-semibold tracking-[-0.04em] text-white">{newCustomers.length}</div>
              </div>
            </div>
          </article>

          <article className="panel-surface rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <SectionLabel>DEMANDA</SectionLabel>
                <h2 className="display mt-2 text-[20px] font-semibold tracking-[-.04em] text-white">
                  Cuándo trabaja mejor el negocio
                </h2>
              </div>
              <Clock3 className="h-5 w-5 text-white/20" />
            </div>

            <div className="mt-7 flex h-32 items-end gap-2">
              {weekdayMetrics.map((day) => (
                <div key={day.name} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                  <div className="mb-1 text-center data text-[10px] font-medium text-white/72">
                    {day.value}
                  </div>
                  <div
                    className="w-full rounded-t-[5px] bg-white/[0.14] transition-all hover:bg-[#FF5A00]"
                    style={{ height: `${Math.max(5, day.height)}%` }}
                    title={`${day.value} turnos`}
                  />
                  <div className="mt-2 text-center text-[11px] font-semibold text-white/60">
                    {day.name}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 border-t border-white/[0.055] pt-5">
              <div className="meta-label text-white/58">Horarios pico</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {peakHours.map((item) => (
                  <div
                    key={item.label}
                    className="soft-card rounded-lg px-3 py-2"
                  >
                    <span className="data text-[13px] text-white/88">
                      {item.label}
                    </span>
                    <span className="ml-2 text-[13px] text-white/74">
                      {item.count} turnos
                    </span>
                  </div>
                ))}
                {!peakHours.length ? (
                  <span className="text-[13px] text-white/72">
                    Sin suficiente actividad.
                  </span>
                ) : null}
              </div>
            </div>
          </article>

          <article className="panel-surface rounded-2xl border-[#FF5A00]/15 bg-[#FF5A00]/[0.035] p-5 sm:p-6">
            <SectionLabel>CRECIMIENTO</SectionLabel>
            <h2 className="display mt-2 text-[20px] font-semibold tracking-[-.04em] text-white">
              Dónde mirar primero
            </h2>
            <p className="caption mt-2 text-white/60">
              Las señales más útiles del período seleccionado.
            </p>

            <div className="mt-6 space-y-2.5">
              {serviceMetrics[0] ? (
                <div className="soft-card rounded-xl p-3.5">
                  <div className="text-[13px] font-semibold text-white/88">
                    Servicio líder
                  </div>
                  <div className="mt-1 text-[12px] leading-5 text-white/66">
                    {serviceMetrics[0].name} concentra{" "}
                    <span className="font-semibold text-[#FF8A52]">
                      {serviceMetrics[0].share.toFixed(1)}%
                    </span>{" "}
                    del revenue.
                  </div>
                </div>
              ) : null}

              {teamMetrics[0] ? (
                <div className="soft-card rounded-xl p-3.5">
                  <div className="text-[13px] font-semibold text-white/88">
                    Top performer
                  </div>
                  <div className="mt-1 text-[12px] leading-5 text-white/66">
                    {teamMetrics[0].name} lidera con{" "}
                    <span className="font-semibold text-[#FF8A52]">
                      {formatMoney(teamMetrics[0].revenue)}
                    </span>
                    .
                  </div>
                </div>
              ) : null}

              <div className="soft-card rounded-xl p-3.5">
                <div className="text-[13px] font-semibold text-white/88">
                  Retención
                </div>
                <div className="mt-1 text-[12px] leading-5 text-white/66">
                  {returningCustomers} clientes registraron 2+ visitas durante
                  el período.
                </div>
              </div>
            </div>
          </article>
        </section>

        {/* HISTORY */}
        <section className="panel-surface mt-4 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionLabel>HISTÓRICO</SectionLabel>
              <h2 className="display mt-2 text-[20px] font-semibold tracking-[-.04em] text-white">
                Comparación mensual
              </h2>
            </div>
            <span className="text-[13px] text-white/72">
              Últimos 6 meses · revenue y volumen
            </span>
          </div>

          <div className="mt-7 grid grid-cols-6 gap-2 sm:gap-4">
            {monthlyComparison.map((month) => (
              <div key={month.label} className="min-w-0">
                <div className="flex h-36 items-end justify-center rounded-xl border border-white/[0.035] bg-white/[0.012] p-2">
                  <div
                    className="bar w-full max-w-12 rounded-t-[5px] opacity-75 transition hover:opacity-100"
                    style={{
                      height: `${Math.max(
                        5,
                        (month.revenue / monthMax) * 100
                      )}%`,
                    }}
                    title={`${month.label}: ${formatMoney(month.revenue)}`}
                  />
                </div>
                <div className="mt-2 truncate text-center text-[11px] font-semibold text-white/68">
                  {month.label}
                </div>
                <div className="data mt-1 text-center text-[13px] font-medium text-white">
                  {formatMoney(month.revenue)}
                </div>
                <div className="mt-0.5 text-center text-[11px] text-white/62">
                  {month.appointments} turnos
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-5 flex flex-col gap-2 border-t border-white/[0.055] pt-5 text-[11px] text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <span>BarberOS Analytics · datos operativos del workspace</span>
          <span>
            {formatNumber(filteredAppointments.length)} eventos ·{" "}
            {formatNumber(activeCustomers)} clientes activos
          </span>
        </footer>
      </div>

      {/* TEAM DRAWER */}
      {selectedTeam ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm">
          <button
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedTeam(null)}
            aria-label="Cerrar"
          />
          <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#090909] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <SectionLabel>EQUIPO 360</SectionLabel>
                <h3 className="display mt-2 text-[22px] font-semibold tracking-[-.04em] text-white">
                  {selectedTeam.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="rounded-lg p-2 text-white/35 transition hover:bg-white/[0.05] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              {[
                ["Revenue", formatMoney(selectedTeam.revenue)],
                ["Ticket", formatMoney(selectedTeam.averageTicket)],
                ["Turnos", selectedTeam.appointments],
                ["Completados", selectedTeam.completed],
              ].map(([label, value]) => (
                <div key={label} className="soft-card rounded-xl p-4">
                  <div className="meta-label text-white/56">{label}</div>
                  <div className="display mt-2 text-[22px] font-semibold tracking-[-0.04em] text-white text-white">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="panel-surface mt-5 rounded-2xl p-5">
              <div className="meta-label text-white/58">Performance</div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-[#FF5A00]"
                  style={{
                    width: `${Math.min(
                      100,
                      selectedTeam.completionRate
                    )}%`,
                  }}
                />
              </div>
              <div className="mt-2 flex justify-between text-[11px]">
                <span className="text-white/42">Tasa de completado</span>
                <span className="data text-white/80">
                  {selectedTeam.completionRate.toFixed(1)}%
                </span>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {/* SERVICE DRAWER */}
      {selectedService ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm">
          <button
            className="absolute inset-0 cursor-default"
            onClick={() => setSelectedService(null)}
            aria-label="Cerrar"
          />
          <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#090909] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <SectionLabel>SERVICIO 360</SectionLabel>
                <h3 className="display mt-2 text-[22px] font-semibold tracking-[-.04em] text-white">
                  {selectedService.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedService(null)}
                className="rounded-lg p-2 text-white/35 transition hover:bg-white/[0.05] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-7 rounded-2xl border border-[#FF5A00]/15 bg-[#FF5A00]/[0.04] p-5">
              <div className="meta-label text-white/58">Revenue atribuible</div>
              <div className="data-number mt-2 text-[30px] font-semibold tracking-[-.065em] text-white">
                {formatMoney(selectedService.revenue)}
              </div>
              <div className="mt-2 text-[13px] text-white/74">
                {selectedService.share.toFixed(1)}% del revenue del período.
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="soft-card rounded-xl p-4">
                <div className="meta-label text-white/56">Turnos</div>
                <div className="display mt-2 text-[22px] font-semibold tracking-[-0.04em] text-white">
                  {selectedService.appointments}
                </div>
              </div>
              <div className="soft-card rounded-xl p-4">
                <div className="meta-label text-white/56">Completados</div>
                <div className="display mt-2 text-[22px] font-semibold tracking-[-0.04em] text-white">
                  {selectedService.completed}
                </div>
              </div>
            </div>

            <div className="panel-surface mt-4 rounded-2xl p-5">
              <div className="meta-label text-white/56">
                Participación del catálogo
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-[#FF5A00]"
                  style={{
                    width: `${Math.min(100, selectedService.share)}%`,
                  }}
                />
              </div>
              <div className="mt-2 text-[13px] text-white/74">
                {selectedService.share.toFixed(1)}% del revenue analizado.
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[60] rounded-xl border border-white/10 bg-[#111] px-4 py-3 text-[12px] text-white/78 shadow-2xl">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
