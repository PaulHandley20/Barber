"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  Gift,
  Loader2,
  RefreshCw,
  Scissors,
  Target,
  TrendingUp,
  Users,
  Wallet,
  X,
  Award,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import DateTimeField from "@/components/admin/ui/DateTimeField";
import BarChart, { compactNumber } from "@/components/admin/ui/BarChart";
type RangeKey = "7D" | "30D" | "12M" | "CUSTOM";

type Service = {
  id: string;
  name: string;
  price: number | string | null;
  duration_minutes: number | null;
  active: boolean;
  currency?: string | null;
};

type Barber = {
  id: string;
  name: string;
  active: boolean;
};

type Customer = {
  id: string;
  full_name: string;
  phone?: string | null;
  email?: string | null;
  created_at: string;
  deleted_at?: string | null;
};

type Appointment = {
  id: string;
  customer_id: string | null;
  barber_id: string | null;
  service_id: string | null;
  start_at: string;
  end_at: string | null;
  status: unknown;
  service: Service | Service[] | null;
  customer: { full_name: string } | { full_name: string }[] | null;
  barber: { name: string } | { name: string }[] | null;
};

type LoyaltyAccount = {
  id: string;
  customer_id: string;
  loyalty_program_id: string;
  points_balance: number | null;
  visits: number | null;
  rewards_earned: number | null;
  rewards_redeemed: number | null;
};

type LoyaltyReward = {
  id: string;
  loyalty_program_id: string;
  name: string;
  description: string | null;
  points_required: number;
  active: boolean;
};

type LoyaltyTransaction = {
  id: string;
  loyalty_account_id: string;
  appointment_id: string | null;
  reward_id: string | null;
  transaction_type: string | null;
  points_delta: number;
  description: string | null;
  created_at: string;
};

type ServiceMetric = {
  id: string;
  name: string;
  appointments: number;
  completed: number;
  cancelled: number;
  revenue: number;
  share: number;
  averagePrice: number;
};

type TeamMetric = {
  id: string;
  name: string;
  appointments: number;
  completed: number;
  cancelled: number;
  revenue: number;
  averageTicket: number;
  completionRate: number;
};

type ChartPoint = {
  label: string;
  revenue: number;
  appointments: number;
  axisLabel?: string;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const formatNumber = (value: number) =>
  new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

const formatPercent = (value: number) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

function normalizeStatus(status: unknown) {
  if (typeof status !== "string") return "";
  return status.trim().toLowerCase().replaceAll("-", "_").replaceAll(" ", "_");
}

function isCompleted(status: unknown) {
  return ["completed", "complete", "completado"].includes(normalizeStatus(status));
}

function isCancelled(status: unknown) {
  return ["cancelled", "canceled", "cancelado"].includes(normalizeStatus(status));
}

function isNoShow(status: unknown) {
  return ["no_show", "noshow", "no_showed"].includes(normalizeStatus(status));
}

function isBookable(status: unknown) {
  return !isCancelled(status) && !isNoShow(status);
}

function getService(appointment: Appointment) {
  return Array.isArray(appointment.service)
    ? appointment.service[0] ?? null
    : appointment.service;
}

function getBarber(appointment: Appointment) {
  return Array.isArray(appointment.barber)
    ? appointment.barber[0] ?? null
    : appointment.barber;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function addMonths(date: Date, amount: number) {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + amount);
  return copy;
}

function getRangeDates(range: RangeKey, now = new Date()) {
  if (range === "7D") {
    return { start: startOfDay(addDays(now, -6)), end: endOfDay(now) };
  }

  if (range === "30D") {
    return { start: startOfDay(addDays(now, -29)), end: endOfDay(now) };
  }

  if (range === "12M") {
    return {
      start: startOfDay(new Date(now.getFullYear(), now.getMonth() - 11, 1)),
      end: endOfDay(now),
    };
  }

  return { start: startOfDay(addDays(now, -29)), end: endOfDay(now) };
}

function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(value);
}

function formatMonth(value: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "short",
  }).format(value).replace(".", "");
}

function periodLabel(range: RangeKey, start: Date, end: Date) {
  if (range === "7D") return "Últimos 7 días";
  if (range === "30D") return "Últimos 30 días";
  if (range === "12M") return "Últimos 12 meses";
  return `${start.toLocaleDateString("es-AR")} → ${end.toLocaleDateString("es-AR")}`;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="data text-[9px] font-extrabold uppercase tracking-[.18em] text-[#ff6a18]">
      {children}
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Wallet;
  accent?: boolean;
}) {
  return (
    <article className={`panel-surface rounded-2xl p-5 ${accent ? "border-[#ff5a00]/15" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`text-[11px] font-semibold ${accent ? "text-[#ff6a18]" : "text-white/72"}`}>
          {label}
        </div>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
          accent
            ? "border-[#ff5a00]/20 bg-[#ff5a00]/[0.07] text-[#ff6a18]"
            : "border-white/[0.07] bg-white/[0.025] text-white/42"
        }`}>
          <Icon size={15} strokeWidth={1.7} />
        </div>
      </div>
      <div className="display mt-7 text-[30px] font-semibold leading-none tracking-[-.055em] text-white">
        {value}
      </div>
      <div className="mt-3 text-[12px] text-white/58">{helper}</div>
    </article>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="flex min-h-[190px] items-center justify-center text-center text-[13px] text-white/38">
      {text}
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
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [serviceFilter, setServiceFilter] = useState("all");
  const [barberFilter, setBarberFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const [selectedService, setSelectedService] = useState<ServiceMetric | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamMetric | null>(null);

  const dates = useMemo(() => {
    if (range === "CUSTOM" && customStart && customEnd) {
      const start = new Date(`${customStart}T00:00:00`);
      const end = new Date(`${customEnd}T00:00:00`);
      if (start <= end) return { start, end: endOfDay(end) };
    }
    return getRangeDates(range);
  }, [range, customStart, customEnd]);

  const fetchAnalytics = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const [
        appointmentsRes,
        customersRes,
        barbersRes,
        servicesRes,
        accountsRes,
        rewardsRes,
        transactionsRes,
      ] = await Promise.all([
        supabase
          .from("appointments")
          .select(`
            id,
            customer_id,
            barber_id,
            service_id,
            start_at,
            end_at,
            status,
            service:services(id,name,price,duration_minutes,active,currency),
            customer:customers(full_name),
            barber:barbers(name)
          `)
          .order("start_at", { ascending: true })
          .limit(10000),

        supabase
          .from("customers")
          .select("id,full_name,phone,email,created_at,deleted_at")
          .order("created_at", { ascending: false })
          .limit(10000),

        supabase
          .from("barbers")
          .select("id,name,active")
          .order("name", { ascending: true }),

        supabase
          .from("services")
          .select("id,name,price,duration_minutes,active,currency")
          .order("name", { ascending: true }),

        supabase
          .from("loyalty_accounts")
          .select("id,customer_id,loyalty_program_id,points_balance,visits,rewards_earned,rewards_redeemed"),

        supabase
          .from("loyalty_rewards")
          .select("id,loyalty_program_id,name,description,points_required,active"),

        supabase
          .from("loyalty_point_transactions")
          .select("id,loyalty_account_id,appointment_id,reward_id,transaction_type,points_delta,description,created_at")
          .order("created_at", { ascending: false })
          .limit(10000),
      ]);

      const failures = [
        ["appointments", appointmentsRes.error],
        ["customers", customersRes.error],
        ["barbers", barbersRes.error],
        ["services", servicesRes.error],
        ["loyalty_accounts", accountsRes.error],
        ["loyalty_rewards", rewardsRes.error],
        ["loyalty_point_transactions", transactionsRes.error],
      ].filter(([, value]) => value);

      if (failures.length) {
        console.error("Analytics data load errors:", failures);
        setError(
          `No se pudieron cargar ${failures.length} fuente${failures.length === 1 ? "" : "s"} de datos. Revisá la consola para ver el detalle.`
        );
      }

      setAppointments((appointmentsRes.data ?? []) as unknown as Appointment[]);
      setCustomers((customersRes.data ?? []) as Customer[]);
      setBarbers((barbersRes.data ?? []) as Barber[]);
      setServices((servicesRes.data ?? []) as Service[]);
      setAccounts((accountsRes.data ?? []) as LoyaltyAccount[]);
      setRewards((rewardsRes.data ?? []) as LoyaltyReward[]);
      setTransactions((transactionsRes.data ?? []) as LoyaltyTransaction[]);

      if (silent) setToast("Analytics actualizado.");
    } catch (caught) {
      console.error("Analytics unexpected error:", caught);
      setError("Ocurrió un error inesperado al cargar Analytics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const date = new Date(appointment.start_at);
      if (date < dates.start || date > dates.end) return false;

      if (serviceFilter !== "all" && appointment.service_id !== serviceFilter) return false;
      if (barberFilter !== "all" && appointment.barber_id !== barberFilter) return false;

      if (statusFilter === "completed" && !isCompleted(appointment.status)) return false;
      if (statusFilter === "cancelled" && !isCancelled(appointment.status)) return false;
      if (statusFilter === "no_show" && !isNoShow(appointment.status)) return false;
      if (statusFilter === "scheduled" && !isBookable(appointment.status)) return false;

      return true;
    });
  }, [appointments, dates, serviceFilter, barberFilter, statusFilter]);

  const completedAppointments = useMemo(
    () => filteredAppointments.filter((item) => isCompleted(item.status)),
    [filteredAppointments]
  );

  const cancelledAppointments = useMemo(
    () => filteredAppointments.filter((item) => isCancelled(item.status)),
    [filteredAppointments]
  );

  const noShowAppointments = useMemo(
    () => filteredAppointments.filter((item) => isNoShow(item.status)),
    [filteredAppointments]
  );

  const bookableAppointments = useMemo(
    () => filteredAppointments.filter((item) => isBookable(item.status)),
    [filteredAppointments]
  );

  const periodRevenue = useMemo(
    () =>
      completedAppointments.reduce(
        (sum, appointment) => sum + Number(getService(appointment)?.price ?? 0),
        0
      ),
    [completedAppointments]
  );

  const scheduledRevenue = useMemo(
    () =>
      bookableAppointments.reduce(
        (sum, appointment) => sum + Number(getService(appointment)?.price ?? 0),
        0
      ),
    [bookableAppointments]
  );

  const averageTicket = completedAppointments.length
    ? periodRevenue / completedAppointments.length
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

  const activeCustomers = useMemo(
    () => customers.filter((customer) => !customer.deleted_at).length,
    [customers]
  );

  const periodNewCustomers = useMemo(
    () =>
      customers.filter((customer) => {
        if (customer.deleted_at) return false;
        const created = new Date(customer.created_at);
        return created >= dates.start && created <= dates.end;
      }),
    [customers, dates]
  );

  const periodCustomerIds = useMemo(
    () =>
      new Set(
        bookableAppointments
          .map((appointment) => appointment.customer_id)
          .filter((id): id is string => Boolean(id))
      ),
    [bookableAppointments]
  );

  const returningCustomers = useMemo(() => {
    const counts = new Map<string, number>();
    completedAppointments.forEach((appointment) => {
      if (!appointment.customer_id) return;
      counts.set(
        appointment.customer_id,
        (counts.get(appointment.customer_id) ?? 0) + 1
      );
    });
    return [...counts.values()].filter((count) => count >= 2).length;
  }, [completedAppointments]);

  const serviceMetrics = useMemo<ServiceMetric[]>(() => {
    const map = new Map<string, ServiceMetric>();

    filteredAppointments.forEach((appointment) => {
      const service = getService(appointment);
      const id = appointment.service_id ?? `unknown-${service?.name ?? "service"}`;

      if (!map.has(id)) {
        map.set(id, {
          id,
          name: service?.name ?? "Servicio sin nombre",
          appointments: 0,
          completed: 0,
          cancelled: 0,
          revenue: 0,
          share: 0,
          averagePrice: Number(service?.price ?? 0),
        });
      }

      const metric = map.get(id)!;
      metric.appointments += isBookable(appointment.status) ? 1 : 0;
      metric.completed += isCompleted(appointment.status) ? 1 : 0;
      metric.cancelled += isCancelled(appointment.status) ? 1 : 0;

      if (isCompleted(appointment.status)) {
        metric.revenue += Number(service?.price ?? 0);
      }
    });

    const total = [...map.values()].reduce((sum, item) => sum + item.revenue, 0);

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
      const barber = getBarber(appointment);
      const id = appointment.barber_id ?? "unassigned";

      if (!map.has(id)) {
        map.set(id, {
          id,
          name: barber?.name ?? "Sin asignar",
          appointments: 0,
          completed: 0,
          cancelled: 0,
          revenue: 0,
          averageTicket: 0,
          completionRate: 0,
        });
      }

      const metric = map.get(id)!;
      metric.appointments += isBookable(appointment.status) ? 1 : 0;
      metric.completed += isCompleted(appointment.status) ? 1 : 0;
      metric.cancelled += isCancelled(appointment.status) ? 1 : 0;

      if (isCompleted(appointment.status)) {
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

  const revenueChart = useMemo<ChartPoint[]>(() => {
    const points: ChartPoint[] = [];

    if (range === "12M") {
      let cursor = new Date(dates.start.getFullYear(), dates.start.getMonth(), 1);
      const last = new Date(dates.end.getFullYear(), dates.end.getMonth(), 1);

      while (cursor <= last) {
        const year = cursor.getFullYear();
        const month = cursor.getMonth();

        const rows = completedAppointments.filter((appointment) => {
          const date = new Date(appointment.start_at);
          return date.getFullYear() === year && date.getMonth() === month;
        });

        points.push({
          label: `${formatMonth(cursor)} ${String(year).slice(-2)}`,
          revenue: rows.reduce(
            (sum, row) => sum + Number(getService(row)?.price ?? 0),
            0
          ),
          appointments: rows.length,
        });

        cursor = addMonths(cursor, 1);
      }

      return points;
    }

    const totalDays =
      Math.ceil(
        (startOfDay(dates.end).getTime() - startOfDay(dates.start).getTime()) /
          86400000
      ) + 1;

    for (let i = 0; i < totalDays; i += 1) {
      const day = startOfDay(addDays(dates.start, i));
      const next = endOfDay(day);
      const rows = completedAppointments.filter((appointment) => {
        const date = new Date(appointment.start_at);
        return date >= day && date <= next;
      });

      points.push({
        label: formatShortDate(day),
        axisLabel: `${day.getDate()}/${day.getMonth() + 1}`,
        revenue: rows.reduce(
          (sum, row) => sum + Number(getService(row)?.price ?? 0),
          0
        ),
        appointments: rows.length,
      });
    }

    return points;
  }, [completedAppointments, dates, range]);


  const peakHours = useMemo(() => {
    const buckets = new Map<number, number>();

    bookableAppointments.forEach((appointment) => {
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
  }, [bookableAppointments]);

  const weekdayMetrics = useMemo(() => {
    const labels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const values = Array.from({ length: 7 }, () => 0);

    bookableAppointments.forEach((appointment) => {
      values[new Date(appointment.start_at).getDay()] += 1;
    });

    const max = Math.max(...values, 1);

    return labels.map((label, index) => ({
      label,
      value: values[index],
      height: (values[index] / max) * 100,
    }));
  }, [bookableAppointments]);

  const customerSegments = useMemo(() => {
    const counts = new Map<string, number>();

    completedAppointments.forEach((appointment) => {
      if (!appointment.customer_id) return;
      counts.set(
        appointment.customer_id,
        (counts.get(appointment.customer_id) ?? 0) + 1
      );
    });

    const values = [...counts.values()];
    const total = values.length || 1;

    return [
      {
        label: "Frecuentes",
        value: Math.round((values.filter((value) => value >= 6).length / total) * 100),
        detail: "6+ visitas",
      },
      {
        label: "Recurrentes",
        value: Math.round(
          (values.filter((value) => value >= 2 && value < 6).length / total) * 100
        ),
        detail: "2–5 visitas",
      },
      {
        label: "Primera visita",
        value: Math.round((values.filter((value) => value === 1).length / total) * 100),
        detail: "1 visita",
      },
    ];
  }, [completedAppointments]);

  const loyaltyStats = useMemo(() => {
    const balance = accounts.reduce(
      (sum, account) => sum + Number(account.points_balance ?? 0),
      0
    );

    const customersWithPoints = accounts.filter(
      (account) => Number(account.points_balance ?? 0) > 0
    ).length;

    const periodEarned = transactions
      .filter((transaction) => {
        const created = new Date(transaction.created_at);
        return (
          created >= dates.start &&
          created <= dates.end &&
          Number(transaction.points_delta) > 0
        );
      })
      .reduce((sum, transaction) => sum + Number(transaction.points_delta || 0), 0);

    const periodRedeemed = transactions
      .filter((transaction) => {
        const created = new Date(transaction.created_at);
        return (
          created >= dates.start &&
          created <= dates.end &&
          (transaction.transaction_type ?? "").toLowerCase().includes("redeem")
        );
      })
      .reduce(
        (sum, transaction) => sum + Math.abs(Number(transaction.points_delta || 0)),
        0
      );

    const availableRewards = rewards.filter((reward) => reward.active).length;

    return {
      balance,
      customersWithPoints,
      periodEarned,
      periodRedeemed,
      availableRewards,
    };
  }, [accounts, rewards, transactions, dates]);

  const loyaltyTrend = useMemo(() => {
    const earned = loyaltyStats.periodEarned;
    const redeemed = loyaltyStats.periodRedeemed;

    return {
      earned,
      redeemed,
      net: earned - redeemed,
    };
  }, [loyaltyStats]);

  const revenueTrend = useMemo(() => {
    if (revenueChart.length < 2) return null;

    const midpoint = Math.max(1, Math.floor(revenueChart.length / 2));
    const first = revenueChart
      .slice(0, midpoint)
      .reduce((sum, point) => sum + point.revenue, 0);
    const second = revenueChart
      .slice(midpoint)
      .reduce((sum, point) => sum + point.revenue, 0);

    if (!first) return second ? 100 : 0;
    return ((second - first) / first) * 100;
  }, [revenueChart]);

  const selectedServiceDetail = selectedService
    ? services.find((service) => service.id === selectedService.id)
    : null;

  const exportCSV = () => {
    const rows = [
      ["Métrica", "Valor"],
      ["Período", periodLabel(range, dates.start, dates.end)],
      ["Ingresos", periodRevenue],
      ["Turnos", bookableAppointments.length],
      ["Completados", completedAppointments.length],
      ["Cancelados", cancelledAppointments.length],
      ["No-show", noShowAppointments.length],
      ["Ticket promedio", averageTicket],
      ["Clientes activos", activeCustomers],
      ["Clientes nuevos", periodNewCustomers.length],
      ["Clientes recurrentes", returningCustomers],
      ["Puntos generados", loyaltyTrend.earned],
      ["Puntos canjeados", loyaltyTrend.redeemed],
      ["Puntos en circulación", loyaltyStats.balance],
      [],
      ["Servicio", "Turnos", "Completados", "Ingresos", "Participación"],
      ...serviceMetrics.map((item) => [
        item.name,
        item.appointments,
        item.completed,
        item.revenue,
        `${item.share.toFixed(1)}%`,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")
      )
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
      <main className="barberos-dashboard min-h-screen text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="panel-surface flex items-center gap-3 rounded-2xl px-6 py-4 text-sm text-white/65">
            <Loader2 className="h-4 w-4 animate-spin text-[#ff6a18]" />
            Cargando inteligencia de negocio...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="barberos-dashboard min-h-screen text-white">
      <style jsx global>{`
        .barberos-dashboard {
          --ink:#070707;
          --surface:#0b0b0b;
          --surface-2:#111111;
          --line:rgba(255,255,255,.075);
          --line-soft:rgba(255,255,255,.045);
          --muted:rgba(255,255,255,.46);
          --quiet:rgba(255,255,255,.30);
          --orange:#ff5a00;
          --orange-bright:#ff7a22;
          font-family:Manrope,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
          font-feature-settings:"kern" 1,"liga" 1,"calt" 1;
          text-rendering:optimizeLegibility;
          -webkit-font-smoothing:antialiased;
          -moz-osx-font-smoothing:grayscale;
          letter-spacing:-.014em;
          background:
            radial-gradient(720px 360px at 88% -8%,rgba(255,90,0,.045),transparent 70%),
            radial-gradient(520px 320px at 8% 14%,rgba(255,255,255,.010),transparent 74%),
            transparent;
        }

        .barberos-dashboard h1,
        .barberos-dashboard h2,
        .barberos-dashboard h3,
        .barberos-dashboard h4 {
          font-family:Sora,Manrope,ui-sans-serif,system-ui,sans-serif;
          font-feature-settings:"kern" 1,"liga" 1;
        }

        .barberos-dashboard .data {
          font-family:"DM Mono",ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
          font-variant-numeric:tabular-nums;
        }

        .barberos-dashboard .display {
          font-family:Sora,Manrope,ui-sans-serif,system-ui,sans-serif;
        }

        .barberos-dashboard .panel-surface {
          position:relative;
          isolation:isolate;
          overflow:hidden;
          background:
            linear-gradient(145deg,rgba(255,255,255,.028),rgba(255,255,255,.010) 52%,rgba(255,90,0,.012)),
            rgba(10,10,10,.96);
          border:1px solid var(--line);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.022),0 18px 58px rgba(0,0,0,.15);
          transition:border-color 220ms ease,box-shadow 220ms ease,transform 220ms ease;
        }

        .barberos-dashboard .panel-surface:hover {
          border-color:rgba(255,255,255,.10);
        }

        @media (prefers-reduced-motion: reduce) {
          .barberos-dashboard * {
            transition-duration:.01ms !important;
            animation-duration:.01ms !important;
            animation-iteration-count:1 !important;
          }
        }
      `}</style>

      <div className="relative mx-auto max-w-[1680px] px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
        <header className="mb-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/82">BarberOS</span>
                <span className="text-white/10">/</span>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff6a18]">Inteligencia del negocio</span>
              </div>

              <h1 className="display text-[34px] font-semibold leading-[.91] tracking-[-.075em] text-white sm:text-[42px]">
                Analytics
              </h1>

              <p className="mt-2 max-w-xl text-[14px] leading-6 text-white/72">
                Toda la operación de BarberOS en una sola vista: ingresos,
                turnos, clientes, servicios, equipo y fidelización.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fetchAnalytics(true)}
                aria-label="Actualizar Analytics"
                className="flex h-10 w-10 items-center justify-center rounded-[11px] border border-white/[.075] bg-white/[.025] text-white/70 transition hover:bg-white/[.05] hover:text-white"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              </button>

              <button
                type="button"
                onClick={exportCSV}
                className="flex h-10 items-center gap-2 rounded-[11px] bg-[#ff5a00] px-4 text-[11px] font-semibold text-white shadow-[0_10px_35px_rgba(255,90,0,.16)] transition hover:bg-[#ff6a18]"
              >
                <Download size={14} />
                Exportar reporte
              </button>
            </div>
          </div>
        </header>

        <section className="panel-surface mb-5 rounded-2xl p-3.5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-1 rounded-xl border border-white/[.045] bg-black/30 p-1">
              {(["7D", "30D", "12M"] as RangeKey[]).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRange(item)}
                  className={`rounded-lg px-3.5 py-2 text-[11px] font-semibold transition ${
                    range === item
                      ? "bg-[#ff5a00] text-white shadow-[0_6px_20px_rgba(255,90,0,.12)]"
                      : "text-white/48 hover:bg-white/[.04] hover:text-white/80"
                  }`}
                >
                  {item === "7D" ? "7 días" : item === "30D" ? "30 días" : "12 meses"}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setRange("CUSTOM")}
                className={`rounded-lg px-3.5 py-2 text-[11px] font-semibold transition ${
                  range === "CUSTOM"
                    ? "bg-white text-black"
                    : "text-white/48 hover:bg-white/[.04] hover:text-white/80"
                }`}
              >
                Personalizado
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {range === "CUSTOM" ? (
                <>
                  <div className="w-[190px]">
                    <DateTimeField mode="date" value={customStart} onChange={setCustomStart} />
                  </div>
                  <span className="text-white/25">→</span>
                  <div className="w-[190px]">
                    <DateTimeField mode="date" value={customEnd} onChange={setCustomEnd} />
                  </div>
                </>
              ) : null}

              <button
                type="button"
                onClick={() => setShowFilters((value) => !value)}
                className="flex h-9 items-center gap-2 rounded-lg border border-white/[.075] bg-white/[.025] px-3 text-[11px] font-semibold text-white/65 transition hover:bg-white/[.05] hover:text-white"
              >
                Filtros
                <ChevronDown size={13} className={showFilters ? "rotate-180" : ""} />
              </button>

              <span className="data text-[10px] text-white/35">
                {periodLabel(range, dates.start, dates.end)}
              </span>
            </div>
          </div>

          {showFilters ? (
            <div className="mt-3 grid gap-2 border-t border-white/[.05] pt-3 md:grid-cols-3">
              <label className="relative">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.12em] text-white/38">
                  Servicio
                </span>
                <select
                  value={serviceFilter}
                  onChange={(event) => setServiceFilter(event.target.value)}
                  className="h-10 w-full appearance-none rounded-lg border border-white/[.075] bg-white/[.025] px-3 pr-9 text-[12px] text-white/72 outline-none"
                >
                  <option value="all">Todos los servicios</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 bottom-3 h-4 w-4 text-white/30" />
              </label>

              <label className="relative">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.12em] text-white/38">
                  Equipo
                </span>
                <select
                  value={barberFilter}
                  onChange={(event) => setBarberFilter(event.target.value)}
                  className="h-10 w-full appearance-none rounded-lg border border-white/[.075] bg-white/[.025] px-3 pr-9 text-[12px] text-white/72 outline-none"
                >
                  <option value="all">Todo el equipo</option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 bottom-3 h-4 w-4 text-white/30" />
              </label>

              <label className="relative">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[.12em] text-white/38">
                  Estado
                </span>
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="h-10 w-full appearance-none rounded-lg border border-white/[.075] bg-white/[.025] px-3 pr-9 text-[12px] text-white/72 outline-none"
                >
                  <option value="all">Todos los estados</option>
                  <option value="completed">Completados</option>
                  <option value="scheduled">Programados</option>
                  <option value="cancelled">Cancelados</option>
                  <option value="no_show">No-show</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 bottom-3 h-4 w-4 text-white/30" />
              </label>

              {(serviceFilter !== "all" || barberFilter !== "all" || statusFilter !== "all") ? (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="md:col-span-3 inline-flex items-center gap-2 text-[11px] font-semibold text-[#ff6a18]"
                >
                  <X size={13} />
                  Limpiar filtros
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        {error ? (
          <section className="mb-5 rounded-2xl border border-red-400/15 bg-red-400/[.045] p-4 text-[12px] text-red-200/80">
            <div className="font-semibold text-red-200">Analytics cargó con observaciones</div>
            <div className="mt-1 text-red-200/60">{error}</div>
          </section>
        ) : null}

        <section className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricCard
            label="Ingresos"
            value={formatMoney(periodRevenue)}
            helper={`${completedAppointments.length} turnos completados`}
            icon={Wallet}
            accent
          />
          <MetricCard
            label="Turnos"
            value={formatNumber(bookableAppointments.length)}
            helper={`${completedAppointments.length} completados · ${cancelledAppointments.length} cancelados`}
            icon={CalendarDays}
          />
          <MetricCard
            label="Ticket promedio"
            value={formatMoney(averageTicket)}
            helper="sobre turnos completados"
            icon={Target}
          />
          <MetricCard
            label="Clientes activos"
            value={formatNumber(activeCustomers)}
            helper={`${periodNewCustomers.length} nuevos en el período`}
            icon={Users}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.55fr_.85fr]">
          <article className="panel-surface rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SectionLabel>INGRESOS</SectionLabel>
                <h2 className="display mt-2 text-[20px] font-semibold tracking-[-.04em] text-white">
                  Evolución de facturación
                </h2>
                <p className="mt-1 text-[13px] text-white/60">
                  Ingresos reales calculados sobre turnos completados.
                </p>
              </div>

              {revenueTrend !== null ? (
                <div className={`flex items-center gap-1 text-[11px] font-semibold ${
                  revenueTrend >= 0 ? "text-emerald-300" : "text-red-300"
                }`}>
                  <TrendingUp size={13} />
                  {formatPercent(revenueTrend)}
                </div>
              ) : null}
            </div>

            <div className="mt-7">
              {revenueChart.length ? (
                <>
                  <BarChart
                    height={250}
                    seriesLabel="Facturación"
                    formatValue={formatMoney}
                    formatAxis={(value) => `$${compactNumber(value)}`}
                    maxXLabels={range === "12M" ? 12 : 8}
                    ariaLabel="Evolución de facturación"
                    data={revenueChart.map((point, index) => ({
                      key: `${point.label}-${index}`,
                      label: point.axisLabel ?? point.label,
                      fullLabel: point.label,
                      value: point.revenue,
                      detail: `${point.appointments} ${point.appointments === 1 ? "turno completado" : "turnos completados"}`,
                    }))}
                  />

                  <div className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-[12px] text-white/55">
                    <span>
                      Facturación: <strong className="text-white/82">{formatMoney(periodRevenue)}</strong>
                    </span>
                    <span>
                      Proyectado en agenda: <strong className="text-white/82">{formatMoney(scheduledRevenue)}</strong>
                    </span>
                  </div>
                </>
              ) : (
                <EmptyBlock text="Todavía no hay movimientos para mostrar en este período." />
              )}
            </div>
          </article>

          <article className="panel-surface rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <SectionLabel>SALUD OPERATIVA</SectionLabel>
                <h2 className="display mt-2 text-[20px] font-semibold tracking-[-.04em] text-white">
                  Rendimiento del período
                </h2>
              </div>
              <BarChart3 size={18} className="text-white/20" />
            </div>

            <div className="mt-7 space-y-5">
              {[
                ["Completado", completionRate, "text-emerald-300", "bg-emerald-400"],
                ["Cancelación", cancellationRate, "text-red-300", "bg-red-400"],
                ["No-show", noShowRate, "text-amber-300", "bg-amber-400"],
              ].map(([label, value, text, bar]) => (
                <div key={String(label)}>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-white/62">{label}</span>
                    <span className={`data ${text}`}>{Number(value).toFixed(1)}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.05]">
                    <div
                      className={`h-full rounded-full ${bar}`}
                      style={{ width: `${Math.min(100, Number(value))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[.055] bg-white/[.018] p-4">
                <div className="text-[10px] uppercase tracking-[.13em] text-white/38">Completados</div>
                <div className="display mt-2 text-[23px] font-semibold text-white">
                  {formatNumber(completedAppointments.length)}
                </div>
              </div>
              <div className="rounded-xl border border-white/[.055] bg-white/[.018] p-4">
                <div className="text-[10px] uppercase tracking-[.13em] text-white/38">Recurrentes</div>
                <div className="display mt-2 text-[23px] font-semibold text-white">
                  {formatNumber(returningCustomers)}
                </div>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <article className="panel-surface rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <SectionLabel>SERVICIOS</SectionLabel>
                <h2 className="display mt-2 text-[20px] font-semibold tracking-[-.04em] text-white">
                  Rendimiento por servicio
                </h2>
                <p className="mt-1 text-[13px] text-white/60">
                  La información se toma directamente de la tabla central de servicios.
                </p>
              </div>
              <Scissors size={18} className="text-white/20" />
            </div>

            <div className="mt-6 space-y-2">
              {serviceMetrics.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedService(item)}
                  className="group w-full rounded-xl border border-white/[.05] bg-white/[.015] p-3.5 text-left transition hover:border-[#ff5a00]/15 hover:bg-white/[.03]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-semibold text-white/88 group-hover:text-white">
                        {item.name}
                      </div>
                      <div className="mt-1 text-[12px] text-white/50">
                        {item.completed} completados · {item.appointments} turnos
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="data text-[13px] font-semibold text-white">
                        {formatMoney(item.revenue)}
                      </div>
                      <div className="mt-1 text-[11px] text-white/42">
                        {item.share.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[.05]">
                    <div
                      className="h-full rounded-full bg-[#ff5a00]"
                      style={{ width: `${Math.max(item.revenue ? 4 : 0, item.share)}%` }}
                    />
                  </div>
                </button>
              ))}

              {!serviceMetrics.length ? (
                <EmptyBlock text="No hay servicios utilizados en el período." />
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
                <p className="mt-1 text-[13px] text-white/60">
                  Productividad, ingresos y cumplimiento por profesional.
                </p>
              </div>
              <Users size={18} className="text-white/20" />
            </div>

            <div className="mt-6 space-y-2">
              {teamMetrics.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedTeam(item)}
                  className="group flex w-full items-center gap-3 rounded-xl border border-white/[.05] bg-white/[.015] p-3.5 text-left transition hover:border-[#ff5a00]/15 hover:bg-white/[.03]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#ff5a00]/15 bg-[#ff5a00]/[.07] text-[11px] font-bold text-[#ff7a3d]">
                    {item.name.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold text-white/88 group-hover:text-white">
                      {item.name}
                    </div>
                    <div className="mt-1 text-[12px] text-white/52">
                      {item.completed} completados · {item.completionRate.toFixed(0)}% cumplimiento
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="data text-[13px] font-semibold text-white">
                      {formatMoney(item.revenue)}
                    </div>
                    <div className="mt-1 text-[11px] text-white/45">
                      {formatMoney(item.averageTicket)} ticket
                    </div>
                  </div>
                  <ChevronRight size={14} className="shrink-0 text-white/20" />
                </button>
              ))}

              {!teamMetrics.length ? (
                <EmptyBlock text="No hay datos de equipo en el período." />
              ) : null}
            </div>
          </article>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_.9fr]">
          <article className="panel-surface rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <SectionLabel>CLIENTES</SectionLabel>
                <h2 className="display mt-2 text-[20px] font-semibold tracking-[-.04em] text-white">
                  Comportamiento
                </h2>
              </div>
              <Users size={18} className="text-white/20" />
            </div>

            <div className="mt-7 grid grid-cols-3 gap-2">
              {customerSegments.map((segment) => (
                <div key={segment.label} className="rounded-xl border border-white/[.05] bg-white/[.015] p-3">
                  <div className="display text-[22px] font-semibold leading-none text-white">
                    {segment.value}%
                  </div>
                  <div className="mt-3 text-[13px] font-medium leading-tight text-white/78">
                    {segment.label}
                  </div>
                  <div className="mt-1.5 text-[12px] leading-tight text-white/50">{segment.detail}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3.5 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-white/62">Clientes nuevos</span>
                <span className="data text-[13px] font-semibold text-white/88">{formatNumber(periodNewCustomers.length)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/62">Clientes con actividad</span>
                <span className="data text-[13px] font-semibold text-white/88">{formatNumber(periodCustomerIds.size)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/62">Clientes recurrentes</span>
                <span className="data text-[13px] font-semibold text-white/88">{formatNumber(returningCustomers)}</span>
              </div>
            </div>
          </article>

          <article className="panel-surface rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <SectionLabel>DEMANDA</SectionLabel>
                <h2 className="display mt-2 text-[20px] font-semibold tracking-[-.04em] text-white">
                  Días y horarios
                </h2>
              </div>
              <Clock3 size={18} className="text-white/20" />
            </div>

            <div className="mt-6">
              <BarChart
                height={130}
                seriesLabel="Turnos"
                formatValue={(value) => `${formatNumber(value)} ${value === 1 ? "turno" : "turnos"}`}
                ariaLabel="Turnos por día de la semana"
                data={[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
                  const day = weekdayMetrics[dayIndex];

                  return { key: day.label, label: day.label, value: day.value };
                })}
              />

              <div className="mt-6 border-t border-white/[.05] pt-5">
                <div className="text-[11px] font-semibold uppercase tracking-[.14em] text-white/48">
                  Horarios con más demanda
                </div>

                <div className="mt-3 space-y-2">
                  {peakHours.map((hour, index) => (
                    <div key={hour.label} className="flex items-center gap-3">
                      <span className="data w-12 text-[12px] font-medium text-white/72">{hour.label}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[.05]">
                        <div
                          className="h-full rounded-full bg-white/55"
                          style={{
                            width: `${Math.max(
                              5,
                              (hour.count / Math.max(peakHours[0]?.count ?? 1, 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="data w-8 text-right text-[11px] text-white/52">
                        {hour.count}
                      </span>
                      {index === 0 ? <span className="text-[10px] font-semibold text-[#ff6a18]">PICO</span> : null}
                    </div>
                  ))}

                  {!peakHours.length ? (
                    <div className="py-5 text-[13px] text-white/42">
                      Sin turnos para analizar todavía.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </article>

          <article className="panel-surface rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <SectionLabel>FIDELIZACIÓN</SectionLabel>
                <h2 className="display mt-2 text-[20px] font-semibold tracking-[-.04em] text-white">
                  Puntos y beneficios
                </h2>
                <p className="mt-1 text-[12px] text-white/55">
                  Conectado a la base de fidelización.
                </p>
              </div>
              <Award size={18} className="text-white/20" />
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-[#ff5a00]/10 bg-[#ff5a00]/[.035] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[.13em] text-[#ff6a18]">
                  Puntos en circulación
                </div>
                <div className="display mt-2 text-[28px] font-semibold tracking-[-.05em] text-white">
                  {formatNumber(loyaltyStats.balance)}
                </div>
                <div className="mt-2 text-[12px] text-white/58">
                  {formatNumber(loyaltyStats.customersWithPoints)} clientes con saldo
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/[.05] bg-white/[.015] p-3.5">
                  <div className="text-[12px] font-medium text-white/62">Generados</div>
                  <div className="display mt-2 text-[20px] font-semibold leading-none text-white">
                    +{formatNumber(loyaltyTrend.earned)}
                  </div>
                </div>
                <div className="rounded-xl border border-white/[.05] bg-white/[.015] p-3.5">
                  <div className="text-[12px] font-medium text-white/62">Canjeados</div>
                  <div className="display mt-2 text-[20px] font-semibold leading-none text-white">
                    {formatNumber(loyaltyTrend.redeemed)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-white/[.05] pt-4 text-[13px]">
                <span className="text-white/52">Beneficios activos</span>
                <span className="data text-[13px] font-semibold text-white/88">{formatNumber(loyaltyStats.availableRewards)}</span>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <article className="panel-surface rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <SectionLabel>RESUMEN</SectionLabel>
                <h2 className="display mt-2 text-[20px] font-semibold tracking-[-.04em] text-white">
                  Lectura ejecutiva
                </h2>
              </div>
              <Sparkles size={18} className="text-[#ff6a18]" />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[.05] bg-white/[.015] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[.13em] text-white/55">Facturación real</div>
                <div className="display mt-2 text-[25px] font-semibold leading-none text-white">{formatMoney(periodRevenue)}</div>
                <div className="mt-2 text-[12px] text-white/58">
                  {completedAppointments.length} servicios completados
                </div>
              </div>

              <div className="rounded-xl border border-white/[.05] bg-white/[.015] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[.13em] text-white/55">Ticket</div>
                <div className="display mt-2 text-[25px] font-semibold leading-none text-white">{formatMoney(averageTicket)}</div>
                <div className="mt-2 text-[12px] text-white/58">promedio por servicio completado</div>
              </div>

              <div className="rounded-xl border border-white/[.05] bg-white/[.015] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[.13em] text-white/55">Clientes nuevos</div>
                <div className="display mt-2 text-[25px] font-semibold leading-none text-white">{formatNumber(periodNewCustomers.length)}</div>
                <div className="mt-2 text-[12px] text-white/58">creados dentro del período</div>
              </div>

              <div className="rounded-xl border border-white/[.05] bg-white/[.015] p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[.13em] text-white/55">Puntos netos</div>
                <div className="display mt-2 text-[25px] font-semibold leading-none text-white">{formatNumber(loyaltyTrend.net)}</div>
                <div className="mt-2 text-[12px] text-white/58">generados menos canjeados</div>
              </div>
            </div>
          </article>

          <article className="panel-surface rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <SectionLabel>COMPARACIÓN</SectionLabel>
                <h2 className="display mt-2 text-[20px] font-semibold tracking-[-.04em] text-white">
                  Últimos 6 meses
                </h2>
                <p className="mt-1 text-[12px] text-white/55">
                  Facturación real y volumen de servicios completados.
                </p>
              </div>
              <TrendingUp size={18} className="text-white/20" />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {(() => {
                const months = [];
                const now = new Date();

                for (let index = 5; index >= 0; index -= 1) {
                  const monthStart = new Date(now.getFullYear(), now.getMonth() - index, 1);
                  const monthEnd = new Date(
                    now.getFullYear(),
                    now.getMonth() - index + 1,
                    0,
                    23,
                    59,
                    59,
                    999
                  );

                  const rows = completedAppointments.filter((appointment) => {
                    const date = new Date(appointment.start_at);
                    return date >= monthStart && date <= monthEnd;
                  });

                  const revenue = rows.reduce(
                    (sum, appointment) => sum + Number(getService(appointment)?.price ?? 0),
                    0
                  );

                  months.push({
                    label: formatMonth(monthStart),
                    revenue,
                    count: rows.length,
                  });
                }

                const max = Math.max(...months.map((month) => month.revenue), 1);

                return months.map((month) => (
                  <div key={month.label} className="min-w-0 text-center">
                    <div className="flex h-28 items-end justify-center rounded-xl border border-white/[.035] bg-white/[.012] p-2">
                      <div
                        className="w-full max-w-12 rounded-t-[5px] bg-[#ff5a00]/70"
                        style={{
                          height: `${Math.max(
                            month.revenue ? 6 : 2,
                            (month.revenue / max) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="mt-2 truncate text-[13px] font-medium text-white/72">
                      {month.label}
                    </div>
                    <div className="display mt-1 text-[13px] font-semibold text-white/88">
                      {formatMoney(month.revenue)}
                    </div>
                    <div className="mt-1 text-[12px] text-white/52">
                      {month.count} completados
                    </div>
                  </div>
                ));
              })()}
            </div>
          </article>
        </section>

        <footer className="mt-5 flex flex-col gap-2 border-t border-white/[.055] pt-5 text-[11px] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <span>BarberOS Analytics · datos operativos del workspace</span>
          <span>
            {formatNumber(bookableAppointments.length)} turnos · {formatNumber(activeCustomers)} clientes · {formatNumber(loyaltyStats.balance)} puntos
          </span>
        </footer>
      </div>

      {selectedTeam ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm">
          <button
            type="button"
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
                type="button"
                onClick={() => setSelectedTeam(null)}
                className="rounded-lg p-2 text-white/35 transition hover:bg-white/[.05] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              {[
                ["Ingresos", formatMoney(selectedTeam.revenue)],
                ["Ticket", formatMoney(selectedTeam.averageTicket)],
                ["Turnos", selectedTeam.appointments],
                ["Completados", selectedTeam.completed],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-white/[.05] bg-white/[.018] p-4">
                  <div className="text-[10px] uppercase tracking-[.13em] text-white/38">{label}</div>
                  <div className="display mt-2 text-[22px] font-semibold tracking-[-.04em] text-white">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="panel-surface mt-5 rounded-2xl p-5">
              <div className="text-[10px] uppercase tracking-[.13em] text-white/38">Performance</div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[.05]">
                <div
                  className="h-full rounded-full bg-[#ff5a00]"
                  style={{ width: `${Math.min(100, selectedTeam.completionRate)}%` }}
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

      {selectedService ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm">
          <button
            type="button"
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
                type="button"
                onClick={() => setSelectedService(null)}
                className="rounded-lg p-2 text-white/35 transition hover:bg-white/[.05] hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-7 rounded-2xl border border-[#ff5a00]/15 bg-[#ff5a00]/[.04] p-5">
              <div className="text-[10px] uppercase tracking-[.13em] text-white/42">Ingresos</div>
              <div className="data mt-2 text-[30px] font-semibold tracking-[-.06em] text-white">
                {formatMoney(selectedService.revenue)}
              </div>
              <div className="mt-2 text-[12px] text-white/55">
                {selectedService.share.toFixed(1)}% de la facturación del período.
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/[.05] bg-white/[.018] p-4">
                <div className="text-[10px] uppercase tracking-[.13em] text-white/38">Completados</div>
                <div className="display mt-2 text-[22px] font-semibold text-white">{selectedService.completed}</div>
              </div>
              <div className="rounded-xl border border-white/[.05] bg-white/[.018] p-4">
                <div className="text-[10px] uppercase tracking-[.13em] text-white/38">Precio actual</div>
                <div className="display mt-2 text-[22px] font-semibold text-white">
                  {formatMoney(Number(selectedServiceDetail?.price ?? selectedService.averagePrice))}
                </div>
              </div>
            </div>

            <div className="panel-surface mt-4 rounded-2xl p-5">
              <div className="text-[10px] uppercase tracking-[.13em] text-white/38">Servicio en catálogo</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-[13px] text-white/68">
                  {selectedServiceDetail?.active ? "Activo para reservas" : "Inactivo"}
                </span>
                <span className="inline-flex items-center gap-2 text-[12px] text-white/55">
                  <Clock3 size={13} />
                  {selectedServiceDetail?.duration_minutes ?? "—"} min
                </span>
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
