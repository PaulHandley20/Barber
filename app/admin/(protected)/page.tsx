// app/admin/page.tsx
"use client";

import KpiCard, { KpiDelta } from "@/components/admin/ui/KpiCard";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { manrope, sora, dataFont } from "@/components/admin/fonts";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Gift,
  Loader2,
  RefreshCw,
  Scissors,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import BarChart, { compactNumber } from "@/components/admin/ui/BarChart";




type RangeKey = "DAY" | "WEEK" | "MONTH" | "YEAR";

type Customer = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  created_at: string;
  deleted_at: string | null;
};

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  active: boolean;
  currency: string;
};

type Barber = {
  id: string;
  name: string;
  active: boolean;
};

type Appointment = {
  id: string;
  customer_id: string;
  service_id: string;
  barber_id: string;
  start_at: string;
  end_at: string;
  status: unknown;
  notes: string | null;
  customer: { full_name: string; phone: string } | null;
  service: { id?: string; name: string; price: number } | null;
  barber: { name: string } | null;
};

type LoyaltyAccount = {
  id: string;
  customer_id: string;
  loyalty_program_id: string;
  visits: number;
  rewards_earned: number;
  rewards_redeemed: number;
  points_balance: number;
};

type LoyaltyProgram = {
  id: string;
  name: string;
  description: string | null;
  visits_required: number;
  reward: string;
  active: boolean;
};

type LoyaltyReward = {
  id: string;
  loyalty_program_id: string;
  name: string;
  description: string | null;
  points_required: number;
  active: boolean;
};

type PointTransaction = {
  id: string;
  loyalty_account_id: string;
  appointment_id: string | null;
  reward_id: string | null;
  transaction_type: string;
  points_delta: number;
  created_at: string;
};

type Settings = {
  name: string;
  online_booking_enabled: boolean;
  loyalty_enabled: boolean;
};

const CANCELLED = new Set(["cancelled", "canceled", "rejected"]);
const NO_SHOW = new Set(["no_show", "noshow"]);
const COMPLETED = new Set(["completed", "complete", "done", "finished"]);
const PENDING = new Set(["pending", "requested"]);
const CONFIRMED = new Set(["confirmed", "booked", "scheduled"]);

function statusValue(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isCancelled(a: Appointment) {
  return CANCELLED.has(statusValue(a.status));
}

function isNoShow(a: Appointment) {
  return NO_SHOW.has(statusValue(a.status));
}

function isCompleted(a: Appointment) {
  return COMPLETED.has(statusValue(a.status));
}

function isPending(a: Appointment) {
  return PENDING.has(statusValue(a.status));
}

function isConfirmed(a: Appointment) {
  return CONFIRMED.has(statusValue(a.status));
}

function isActiveAppointment(a: Appointment) {
  return !isCancelled(a) && !isNoShow(a);
}

function customerKey(a: Appointment) {
  return a.customer_id || a.customer?.phone || a.customer?.full_name || a.id;
}

function isSameCalendarSlot(date: Date, range: string) {
  const now = new Date();

  if (range === "DAY") {
    return date.getHours() <= now.getHours() && now.getHours() < date.getHours() + 2;
  }

  if (range === "YEAR") {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  return date.toDateString() === now.toDateString();
}

function formatSlotLabel(date: Date, range: string) {
  if (range === "DAY") {
    const end = String(date.getHours() + 2).padStart(2, "0");

    return `${String(date.getHours()).padStart(2, "0")}:00 a ${end}:00`;
  }

  if (range === "YEAR") {
    return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(date);
  }

  return new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" }).format(date);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, amount: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function shiftPeriod(date: Date, range: RangeKey, offset: number) {
  const d = new Date(date);

  if (range === "DAY") d.setDate(d.getDate() + offset);
  if (range === "WEEK") d.setDate(d.getDate() + offset * 7);
  if (range === "MONTH") d.setMonth(d.getMonth() + offset);
  if (range === "YEAR") d.setFullYear(d.getFullYear() + offset);

  return d;
}

function periodBounds(anchor: Date, range: RangeKey) {
  if (range === "DAY") {
    return { start: startOfDay(anchor), end: endOfDay(anchor) };
  }

  if (range === "WEEK") {
    const start = startOfWeek(anchor);
    return { start, end: endOfDay(addDays(start, 6)) };
  }

  if (range === "MONTH") {
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return { start: startOfDay(start), end: endOfDay(end) };
  }

  const start = new Date(anchor.getFullYear(), 0, 1);
  const end = new Date(anchor.getFullYear(), 11, 31);
  return { start: startOfDay(start), end: endOfDay(end) };
}

function periodLabel(anchor: Date, range: RangeKey) {
  if (range === "DAY") return formatDate(anchor);

  if (range === "WEEK") {
    const start = startOfWeek(anchor);
    const end = addDays(start, 6);
    return `${formatShortDate(start.toISOString())} — ${formatShortDate(end.toISOString())}`;
  }

  if (range === "MONTH") {
    return new Intl.DateTimeFormat("es-AR", {
      month: "long",
      year: "numeric",
    }).format(anchor);
  }

  return String(anchor.getFullYear());
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function getStatusLabel(status: unknown) {
  const value = statusValue(status);
  if (isCompleted({ status } as Appointment)) return "Completado";
  if (isCancelled({ status } as Appointment)) return "Cancelado";
  if (isNoShow({ status } as Appointment)) return "No asistió";
  if (isPending({ status } as Appointment)) return "Pendiente";
  if (isConfirmed({ status } as Appointment)) return "Confirmado";
  return value ? value.replaceAll("_", " ") : "Sin estado";
}

function getStatusClass(status: unknown) {
  const value = statusValue(status);
  if (COMPLETED.has(value))
    return "border-[#ff5a00]/20 bg-[#ff5a00]/[.07] text-[#ff9a66]";
  if (CANCELLED.has(value) || NO_SHOW.has(value))
    return "border-red-400/15 bg-red-400/[.04] text-red-300/80";
  if (PENDING.has(value))
    return "border-amber-300/15 bg-amber-300/[.04] text-amber-200/80";
  return "border-emerald-300/15 bg-emerald-300/[.04] text-emerald-200/80";
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="meta-label text-[#ff6a18]">{eyebrow}</div>
        <h2 className="display mt-2 text-[20px] font-semibold tracking-[-.035em] text-white">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-[13px] leading-5 text-white/65">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`panel-surface ${className}`}>{children}</section>;
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  delta,
  accent = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  delta?: number;
  accent?: boolean;
}) {
  return (
    <KpiCard
      icon={icon}
      label={label}
      value={value}
      detail={detail}
      accent={accent}
      trend={typeof delta === "number" ? <KpiDelta value={delta} /> : null}
    />
  );
}

type DonutSegment = { value: number; color: string };

function Donut({ segments }: { segments: DonutSegment[] }) {
  const totalRaw = segments.reduce((sum, segment) => sum + segment.value, 0);
  const total = totalRaw || 1;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const arcs = segments.map((segment, index) => {
    const length = (segment.value / total) * circumference;
    const start = segments
      .slice(0, index)
      .reduce((sum, previous) => sum + (previous.value / total) * circumference, 0);
    return { ...segment, length, start };
  });

  return (
    <div className="relative h-40 w-40 shrink-0">
      <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,.055)"
          strokeWidth="10"
        />
        {arcs.map((arc, index) =>
          arc.value > 0 ? (
            <circle
              key={index}
              cx="55"
              cy="55"
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth="10"
              strokeDasharray={`${arc.length} ${circumference}`}
              strokeDashoffset={-arc.start}
            />
          ) : null
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="page-number text-[30px] font-semibold text-white">
          {totalRaw}
        </span>
        <span className="text-[9px] uppercase tracking-[.18em] text-white/45">
          turnos
        </span>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const supabase = createClient();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [range, setRange] = useState<RangeKey>("MONTH");
  const [periodOffset, setPeriodOffset] = useState(0);

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError("");

      const [
        appointmentsResponse,
        customersResponse,
        servicesResponse,
        barbersResponse,
        accountsResponse,
        programsResponse,
        rewardsResponse,
        transactionsResponse,
        settingsResponse,
      ] = await Promise.all([
        supabase
          .from("appointments")
          .select(`
            id,
            customer_id,
            service_id,
            barber_id,
            start_at,
            end_at,
            status,
            notes,
            customer:customers (full_name, phone),
            service:services (id, name, price),
            barber:barbers (name)
          `)
          .order("start_at", { ascending: true }),
        supabase
          .from("customers")
          .select("id,full_name,phone,email,created_at,deleted_at")
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("services")
          .select("id,name,description,duration_minutes,price,active,currency")
          .order("active", { ascending: false })
          .order("name", { ascending: true }),
        supabase
          .from("barbers")
          .select("id,name,active")
          .order("name", { ascending: true }),
        supabase
          .from("loyalty_accounts")
          .select("id,customer_id,loyalty_program_id,visits,rewards_earned,rewards_redeemed,points_balance"),
        supabase
          .from("loyalty_programs")
          .select("id,name,description,visits_required,reward,active")
          .order("created_at", { ascending: false }),
        supabase
          .from("loyalty_rewards")
          .select("id,loyalty_program_id,name,description,points_required,active")
          .order("points_required", { ascending: true }),
        supabase
          .from("loyalty_point_transactions")
          .select("id,loyalty_account_id,appointment_id,reward_id,transaction_type,points_delta,created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("barbershop_settings")
          .select("name,online_booking_enabled,loyalty_enabled")
          .limit(1)
          .maybeSingle(),
      ]);

      const firstError =
        appointmentsResponse.error ||
        customersResponse.error ||
        servicesResponse.error ||
        barbersResponse.error ||
        accountsResponse.error ||
        programsResponse.error ||
        rewardsResponse.error ||
        transactionsResponse.error ||
        settingsResponse.error;

      if (firstError) {
        console.error("Dashboard data error:", firstError);
        setError("Algunos datos no pudieron cargarse. Revisá la conexión con Supabase.");
      }

      setAppointments((appointmentsResponse.data ?? []) as unknown as Appointment[]);
      setCustomers((customersResponse.data ?? []) as Customer[]);
      setServices(
        (servicesResponse.data ?? []).map((x) => ({
          ...x,
          price: Number(x.price),
          duration_minutes: Number(x.duration_minutes),
        })) as Service[]
      );
      setBarbers((barbersResponse.data ?? []) as Barber[]);
      setAccounts(
        (accountsResponse.data ?? []).map((x) => ({
          ...x,
          visits: Number(x.visits ?? 0),
          rewards_earned: Number(x.rewards_earned ?? 0),
          rewards_redeemed: Number(x.rewards_redeemed ?? 0),
          points_balance: Number(x.points_balance ?? 0),
        })) as LoyaltyAccount[]
      );
      setPrograms((programsResponse.data ?? []) as LoyaltyProgram[]);
      setRewards(
        (rewardsResponse.data ?? []).map((x) => ({
          ...x,
          points_required: Number(x.points_required ?? 0),
        })) as LoyaltyReward[]
      );
      setTransactions(
        (transactionsResponse.data ?? []).map((x) => ({
          ...x,
          points_delta: Number(x.points_delta ?? 0),
        })) as PointTransaction[]
      );
      setSettings((settingsResponse.data ?? null) as Settings | null);

      if (silent) setRefreshing(false);
      else setLoading(false);
    },
    [supabase]
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const refresh = () => void loadDashboard(true);
    const channel = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "services" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "loyalty_accounts" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "loyalty_rewards" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "loyalty_point_transactions" }, refresh)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadDashboard, supabase]);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const anchorDate = useMemo(
    () => shiftPeriod(now, range, periodOffset),
    [range, periodOffset]
  );

  const currentBounds = useMemo(
    () => periodBounds(anchorDate, range),
    [anchorDate, range]
  );

  const previousAnchor = useMemo(
    () => shiftPeriod(anchorDate, range, -1),
    [anchorDate, range]
  );

  const previousBounds = useMemo(
    () => periodBounds(previousAnchor, range),
    [previousAnchor, range]
  );

  const validAppointments = useMemo(
    () => appointments.filter(isActiveAppointment),
    [appointments]
  );

  const todayAppointments = useMemo(
    () =>
      appointments.filter((appointment) => {
        const date = new Date(appointment.start_at);
        return date >= todayStart && date <= todayEnd;
      }),
    [appointments, todayStart, todayEnd]
  );

  const activeTodayAppointments = useMemo(
    () => todayAppointments.filter(isActiveAppointment),
    [todayAppointments]
  );

  const periodAppointments = useMemo(
    () =>
      validAppointments.filter((appointment) => {
        const date = new Date(appointment.start_at);
        return date >= currentBounds.start && date <= currentBounds.end;
      }),
    [validAppointments, currentBounds]
  );

  const previousPeriodAppointments = useMemo(
    () =>
      validAppointments.filter((appointment) => {
        const date = new Date(appointment.start_at);
        return date >= previousBounds.start && date <= previousBounds.end;
      }),
    [validAppointments, previousBounds]
  );

  const completedPeriodAppointments = useMemo(
    () => periodAppointments.filter(isCompleted),
    [periodAppointments]
  );

  const previousCompletedAppointments = useMemo(
    () => previousPeriodAppointments.filter(isCompleted),
    [previousPeriodAppointments]
  );

  const periodRevenue = useMemo(
    () =>
      completedPeriodAppointments.reduce(
        (sum, appointment) => sum + Number(appointment.service?.price ?? 0),
        0
      ),
    [completedPeriodAppointments]
  );

  const previousPeriodRevenue = useMemo(
    () =>
      previousCompletedAppointments.reduce(
        (sum, appointment) => sum + Number(appointment.service?.price ?? 0),
        0
      ),
    [previousCompletedAppointments]
  );

  const revenueDelta = percentChange(periodRevenue, previousPeriodRevenue);

  const periodVisitsDelta = percentChange(
    completedPeriodAppointments.length,
    previousCompletedAppointments.length
  );

  const uniquePeriodClients = useMemo(
    () => new Set(periodAppointments.map(customerKey)).size,
    [periodAppointments]
  );

  const previousUniqueClients = useMemo(
    () => new Set(previousPeriodAppointments.map(customerKey)).size,
    [previousPeriodAppointments]
  );

  const clientDelta = percentChange(uniquePeriodClients, previousUniqueClients);

  const averageTicket =
    completedPeriodAppointments.length > 0
      ? periodRevenue / completedPeriodAppointments.length
      : 0;

  const todayRevenue = useMemo(
    () =>
      activeTodayAppointments
        .filter(isCompleted)
        .reduce(
          (sum, appointment) => sum + Number(appointment.service?.price ?? 0),
          0
        ),
    [activeTodayAppointments]
  );

  const nextAppointment = useMemo(
    () =>
      validAppointments.find(
        (appointment) =>
          new Date(appointment.start_at).getTime() >= now.getTime()
      ) ?? null,
    [validAppointments, now]
  );

  const upcomingAppointments = useMemo(
    () =>
      validAppointments
        .filter(
          (appointment) =>
            new Date(appointment.start_at).getTime() >= now.getTime()
        )
        .sort(
          (a, b) =>
            new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
        )
        .slice(0, 6),
    [validAppointments, now]
  );

  const serviceStats = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; count: number; revenue: number }
    >();

    periodAppointments.forEach((appointment) => {
      const id =
        appointment.service_id ||
        appointment.service?.id ||
        appointment.service?.name ||
        appointment.id;
      const name = appointment.service?.name ?? "Sin servicio";
      const current = map.get(id);

      if (current) {
        current.count += 1;
        if (isCompleted(appointment)) {
          current.revenue += Number(appointment.service?.price ?? 0);
        }
      } else {
        map.set(id, {
          id,
          name,
          count: 1,
          revenue: isCompleted(appointment)
            ? Number(appointment.service?.price ?? 0)
            : 0,
        });
      }
    });

    return [...map.values()].sort(
      (a, b) => b.revenue - a.revenue || b.count - a.count
    );
  }, [periodAppointments]);

  const topService = serviceStats[0] ?? null;

  const customerRanking = useMemo(() => {
    const map = new Map<
      string,
      { name: string; phone: string; visits: number; revenue: number }
    >();

    completedPeriodAppointments.forEach((appointment) => {
      const key = customerKey(appointment);
      const revenue = Number(appointment.service?.price ?? 0);
      const current = map.get(key);

      if (current) {
        current.visits += 1;
        current.revenue += revenue;
      } else {
        map.set(key, {
          name: appointment.customer?.full_name ?? "Cliente",
          phone: appointment.customer?.phone ?? "",
          visits: 1,
          revenue,
        });
      }
    });

    return [...map.values()].sort((a, b) => b.revenue - a.revenue);
  }, [completedPeriodAppointments]);

  const recurringClients = useMemo(() => {
    const map = new Map<string, number>();
    periodAppointments.forEach((appointment) => {
      const key = customerKey(appointment);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return [...map.values()].filter((count) => count > 1).length;
  }, [periodAppointments]);

  const newCustomersPeriod = useMemo(() => {
    return customers.filter((customer) => {
      const created = new Date(customer.created_at);
      return created >= currentBounds.start && created <= currentBounds.end;
    }).length;
  }, [customers, currentBounds]);

  const inactiveCustomers = useMemo(() => {
    const cutoff = addDays(now, -45).getTime();

    return customers.filter((customer) => {
      const history = validAppointments
        .filter((appointment) => customerKey(appointment) === customer.id)
        .sort(
          (a, b) =>
            new Date(b.start_at).getTime() - new Date(a.start_at).getTime()
        );

      if (history.length === 0) {
        return new Date(customer.created_at).getTime() < cutoff;
      }

      return new Date(history[0].start_at).getTime() < cutoff;
    });
  }, [customers, validAppointments, now]);

  const loyalty = useMemo(() => {
    const activeProgram = programs.find((program) => program.active) ?? null;
    const programAccounts = activeProgram
      ? accounts.filter((account) => account.loyalty_program_id === activeProgram.id)
      : accounts;

    const points = programAccounts.reduce(
      (sum, account) => sum + Number(account.points_balance ?? 0),
      0
    );

    const clientsWithPoints = programAccounts.filter(
      (account) => Number(account.points_balance ?? 0) > 0
    ).length;

    const availableRewards = programAccounts.reduce((sum, account) => {
      if (!activeProgram) return sum;
      return (
        sum +
        Math.floor(
          Number(account.points_balance ?? 0) /
            Math.max(Number(activeProgram.visits_required ?? 1), 1)
        )
      );
    }, 0);

    return {
      activeProgram,
      accounts: programAccounts,
      points,
      clientsWithPoints,
      availableRewards,
      activeRewards: rewards.filter(
        (reward) =>
          reward.active &&
          (!activeProgram || reward.loyalty_program_id === activeProgram.id)
      ).length,
    };
  }, [accounts, programs, rewards]);

  const closeToReward = useMemo(() => {
    if (!loyalty.activeProgram) return 0;

    const required = Math.max(loyalty.activeProgram.visits_required, 1);

    return loyalty.accounts.filter((account) => {
      const visits = Number(account.visits ?? 0);
      const current = visits % required;
      return current > 0 && required - current <= 2;
    }).length;
  }, [loyalty]);

  const statusCounts = useMemo(() => {
    const inPeriod = appointments.filter((appointment) => {
      const date = new Date(appointment.start_at);
      return date >= currentBounds.start && date <= currentBounds.end;
    });

    return {
      completed: inPeriod.filter(isCompleted).length,
      confirmed: inPeriod.filter(isConfirmed).length,
      pending: inPeriod.filter(isPending).length,
      noShow: inPeriod.filter(isNoShow).length,
      cancelled: inPeriod.filter(isCancelled).length,
    };
  }, [appointments, currentBounds]);

  /* Sobre los turnos ya cerrados: completados vs. no asistió / cancelados. */
  const operationalCompletion = useMemo(() => {
    const closed =
      statusCounts.completed + statusCounts.noShow + statusCounts.cancelled;
    return closed > 0 ? (statusCounts.completed / closed) * 100 : 0;
  }, [statusCounts]);

  const statusRows: [string, number, string, string][] = [
    ["Completados", statusCounts.completed, "bg-[#ff5a00]", "#ff5a00"],
    ["Confirmados", statusCounts.confirmed, "bg-emerald-300", "#6ee7b7"],
    ["Pendientes", statusCounts.pending, "bg-amber-300", "#fcd34d"],
    ["No asistió", statusCounts.noShow, "bg-red-400", "#f87171"],
    ["Cancelados", statusCounts.cancelled, "bg-[#666]", "#666666"],
  ];

  const busyDays = useMemo(() => {
    const map = new Map<string, number>();

    periodAppointments.forEach((appointment) => {
      const date = new Date(appointment.start_at);
      const key = date.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    });

    return [...map.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.count - a.count);
  }, [periodAppointments]);

  const busiestDay = busyDays[0] ?? null;

  const periodDays = useMemo(() => {
    const result: { date: Date; label: string; count: number; revenue: number }[] = [];
    const start = currentBounds.start;

    if (range === "DAY") {
      for (let i = 0; i < 12; i += 1) {
        const date = new Date(start);
        date.setHours(i * 2, 0, 0, 0);
        const end = new Date(date);
        end.setHours(date.getHours() + 2);

        const items = completedPeriodAppointments.filter((appointment) => {
          const t = new Date(appointment.start_at).getTime();
          return t >= date.getTime() && t < end.getTime();
        });

        result.push({
          date,
          label: `${String(date.getHours()).padStart(2, "0")}h`,
          count: items.length,
          revenue: items.reduce(
            (sum, item) => sum + Number(item.service?.price ?? 0),
            0
          ),
        });
      }
      return result;
    }

    const count = range === "WEEK" ? 7 : range === "MONTH" ? 30 : 12;

    for (let i = 0; i < count; i += 1) {
      const date = new Date(start);

      if (range === "YEAR") {
        date.setMonth(i, 1);
      } else {
        date.setDate(date.getDate() + i);
      }

      const next = new Date(date);
      if (range === "YEAR") next.setMonth(next.getMonth() + 1);
      else next.setDate(next.getDate() + 1);

      const items = completedPeriodAppointments.filter((appointment) => {
        const t = new Date(appointment.start_at).getTime();
        return t >= date.getTime() && t < next.getTime();
      });

      result.push({
        date,
        label:
          range === "YEAR"
            ? new Intl.DateTimeFormat("es-AR", { month: "short" }).format(date)
            : String(date.getDate()),
        count: items.length,
        revenue: items.reduce(
          (sum, item) => sum + Number(item.service?.price ?? 0),
          0
        ),
      });
    }

    return result;
  }, [range, currentBounds.start, completedPeriodAppointments]);


  const capacitySignal = useMemo(() => {
    const active = activeTodayAppointments.length;
    if (active >= 8) return "Agenda exigida";
    if (active >= 4) return "Agenda saludable";
    if (active > 0) return "Agenda liviana";
    return "Sin turnos";
  }, [activeTodayAppointments]);

  const systemSummary = useMemo(() => {
    const parts = [];

    if (settings?.online_booking_enabled) parts.push("reservas online");
    if (settings?.loyalty_enabled) parts.push("fidelización");
    if (services.filter((x) => x.active).length > 0) parts.push("catálogo");

    return parts.length > 0
      ? parts.join(" · ")
      : "Configuración pendiente";
  }, [settings, services]);

  if (loading) {
    return (
      <main
        className={`${manrope.variable} ${sora.variable} ${dataFont.variable} barberos-dashboard min-h-screen text-white`}
      >
        <div className="flex min-h-screen items-center justify-center">
          <div className="panel-surface flex items-center gap-3 rounded-2xl px-6 py-4 text-[13px] text-white/70">
            <Loader2 className="h-4 w-4 animate-spin text-[#ff6a18]" />
            Cargando dashboard...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`${manrope.variable} ${sora.variable} ${dataFont.variable} barberos-dashboard min-h-screen text-[#f5f5f4] selection:bg-[#ff5a00]/30`}
    >
      <style jsx global>{`
        .barberos-dashboard {
          --ink: #070707;
          --surface: #0b0b0b;
          --surface-2: #111111;
          --line: rgba(255,255,255,.075);
          --line-soft: rgba(255,255,255,.045);
          --muted: rgba(255,255,255,.48);
          --quiet: rgba(255,255,255,.30);
          --orange: #ff5a00;
          --orange-bright: #ff7a22;
          font-family: var(--font-barberos-ui), Manrope, sans-serif;
          font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          letter-spacing: -.014em;
          background:
            radial-gradient(720px 360px at 88% -8%,rgba(255,90,0,.045),transparent 70%),
            radial-gradient(520px 320px at 8% 14%,rgba(255,255,255,.010),transparent 74%),
            transparent;
        }

        .barberos-dashboard h1,
        .barberos-dashboard h2,
        .barberos-dashboard h3,
        .barberos-dashboard h4,
        .barberos-dashboard .display {
          font-family: var(--font-barberos-display), Sora, sans-serif;
          font-feature-settings: "kern" 1, "liga" 1;
          text-wrap: balance;
        }

        .barberos-dashboard .data {
          font-family: var(--font-barberos-data), Sora, sans-serif;
          font-variant-numeric: tabular-nums lining-nums;
        }

        .barberos-dashboard .page-number {
          font-family: var(--font-barberos-display), Sora, sans-serif;
          font-variant-numeric: tabular-nums lining-nums;
        }

        .barberos-dashboard .page-display {
          font-family: var(--font-barberos-display), Sora, sans-serif;
          font-size: clamp(34px, 4vw, 48px);
          line-height: .91;
          letter-spacing: -.075em;
          font-weight: 620;
        }

        .barberos-dashboard .meta-label {
          font-family: var(--font-barberos-ui), Manrope, sans-serif;
          font-size: 9px;
          line-height: 1;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: .17em;
        }

        .barberos-dashboard .panel-surface,
        .barberos-dashboard .panel {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 16px;
          background:
            linear-gradient(145deg,rgba(255,255,255,.028),rgba(255,255,255,.010) 52%,rgba(255,90,0,.012)),
            #0b0b0b;
          box-shadow:
            0 20px 60px rgba(0,0,0,.18),
            inset 0 1px 0 rgba(255,255,255,.018);
        }

        .barberos-dashboard .panel::after,
        .barberos-dashboard .panel-surface::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0;
          background: radial-gradient(
            240px circle at var(--spot-x, 50%) var(--spot-y, 50%),
            rgba(255,90,0,.065),
            transparent 65%
          );
          transition: opacity .2s ease;
        }

        .barberos-dashboard .panel:hover::after,
        .barberos-dashboard .panel-surface:hover::after {
          opacity: 1;
        }

        .barberos-dashboard .metric-card {
          min-height: 154px;
          padding: 20px;
          transition:
            transform .2s ease,
            border-color .2s ease,
            background .2s ease;
        }

        .barberos-dashboard .metric-card:hover {
          transform: translateY(-1px);
          border-color: rgba(255,255,255,.105);
        }

        .barberos-dashboard .metric-accent {
          border-color: rgba(255,90,0,.14);
        }

        .barberos-dashboard .interactive-row {
          transition:
            background .18s ease,
            border-color .18s ease,
            transform .18s ease;
        }

        .barberos-dashboard .interactive-row:hover {
          background: rgba(255,255,255,.025);
          border-color: rgba(255,255,255,.06);
        }

        .barberos-dashboard .control {
          border: 1px solid rgba(255,255,255,.075);
          background: rgba(255,255,255,.018);
        }

        .barberos-dashboard .period-control {
          background: rgba(255,255,255,.022);
        }

        .barberos-dashboard .period-control button[data-active="true"] {
          color: white;
          background: rgba(255,90,0,.12);
          box-shadow: inset 0 0 0 1px rgba(255,90,0,.16);
        }

        .barberos-dashboard .system-strip {
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.018);
        }

        .barberos-dashboard .grid-line {
          border-color: rgba(255,255,255,.045);
        }

        .barberos-dashboard .hairline {
          border-color: rgba(255,255,255,.06);
        }

        .barberos-dashboard .bar-fill {
          transform-origin: left center;
          transition: width .55s cubic-bezier(.2,.7,.2,1);
        }

        .barberos-dashboard .focus-ring:focus-visible {
          outline: 2px solid rgba(255,90,0,.55);
          outline-offset: 2px;
        }
      `}</style>

      <div className="mx-auto max-w-[1680px] px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
        <header className="mb-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/82">BarberOS</span>
              <span className="text-white/10">/</span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff6a18]">Centro de mando</span>
              <span className="ml-1 hidden h-px w-10 bg-gradient-to-r from-orange-500/55 to-transparent sm:block" />
            </div>
            <h1 className="page-display text-white">Dashboard</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-[13px] text-white/72 first-letter:uppercase">
                {formatDate(now)}
              </p>
              <span className="hidden h-1 w-1 rounded-full bg-white/15 sm:block" />
              <p className="text-[12px] text-white/56">
                Operación, clientes y negocio en una sola vista.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-2.5 sm:items-end">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => void loadDashboard(true)}
                disabled={refreshing}
                className="control focus-ring inline-flex h-10 items-center gap-2 rounded-[11px] px-3 text-[11px] font-semibold text-white/72 transition hover:text-white disabled:opacity-50"
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                Actualizar
              </button>

              <div className="control flex items-center gap-1 rounded-[11px] p-1">
                <button
                  type="button"
                  aria-label="Período anterior"
                  onClick={() => setPeriodOffset((value) => value - 1)}
                  className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-white/55 hover:bg-white/[.06] hover:text-white"
                >
                  <ArrowLeft size={14} />
                </button>

                <div className="period-control flex rounded-[9px] p-0.5">
                  {(["DAY", "WEEK", "MONTH", "YEAR"] as RangeKey[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      data-active={range === item}
                      onClick={() => {
                        setRange(item);
                        setPeriodOffset(0);
                      }}
                      className="focus-ring rounded-lg px-2.5 py-2 text-[10px] font-semibold uppercase tracking-[.08em] text-white/48 transition hover:text-white"
                    >
                      {item === "DAY"
                        ? "Día"
                        : item === "WEEK"
                          ? "Semana"
                          : item === "MONTH"
                            ? "Mes"
                            : "Año"}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  aria-label="Período siguiente"
                  onClick={() => setPeriodOffset((value) => value + 1)}
                  className="focus-ring flex h-8 w-8 items-center justify-center rounded-lg text-white/55 hover:bg-white/[.06] hover:text-white"
                >
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 text-[10px] text-white/48">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Sistema conectado
              <span className="text-white/15">·</span>
              <span className="inline-block first-letter:uppercase">{periodLabel(anchorDate, range)}</span>
            </div>
          </div>
        </header>

        {error ? (
          <div className="system-strip mb-5 flex items-center justify-between gap-4 rounded-[14px] px-4 py-3">
            <div className="flex items-center gap-2 text-[12px] text-white/68">
              <XCircle size={15} className="text-amber-400" />
              {error}
            </div>
            <button
              type="button"
              onClick={() => void loadDashboard(true)}
              className="text-[11px] font-semibold text-[#ff6a18] hover:text-[#ff8a3d]"
            >
              Reintentar
            </button>
          </div>
        ) : null}

        {/* CORE BUSINESS KPIs */}
        <section className="admin-kpis mb-5 grid grid-cols-2 gap-3 xl:grid-cols-5">
          <MetricCard
            icon={<Wallet size={16} />}
            label="Ingresos"
            value={formatMoney(periodRevenue)}
            detail={`${formatMoney(todayRevenue)} facturados hoy`}
            delta={revenueDelta}
            accent
          />
          <MetricCard
            icon={<CalendarDays size={16} />}
            label="Turnos realizados"
            value={formatNumber(completedPeriodAppointments.length)}
            detail={`${formatNumber(periodAppointments.length)} turnos no cancelados`}
            delta={periodVisitsDelta}
          />
          <MetricCard
            icon={<Users size={16} />}
            label="Clientes atendidos"
            value={formatNumber(uniquePeriodClients)}
            detail={`${formatNumber(newCustomersPeriod)} clientes nuevos`}
            delta={clientDelta}
          />
          <MetricCard
            icon={<Scissors size={16} />}
            label="Ticket promedio"
            value={formatMoney(averageTicket)}
            detail={topService ? `Lidera ${topService.name}` : "Sin actividad"}
          />
          <MetricCard
            icon={<Clock3 size={16} />}
            label="Estado de hoy"
            value={capacitySignal}
            detail={`${activeTodayAppointments.length} turnos activos en agenda`}
            accent={activeTodayAppointments.length > 0}
          />
        </section>

        {/* TODAY + NEXT APPOINTMENTS */}
        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(390px,.85fr)]">
          <Panel>
            <div className="border-b hairline px-5 py-5 sm:px-6">
              <SectionHeader
                eyebrow="OPERACIÓN DE HOY"
                title="Agenda inmediata"
                description="Lo que está pasando ahora y lo próximo que necesita atención."
                action={
                  <Link
                    href="/admin/turnos"
                    className="focus-ring hidden items-center gap-1 text-[11px] font-semibold text-[#ff6a18] hover:text-[#ff8a3d] sm:inline-flex"
                  >
                    Ver agenda
                    <ArrowUpRight size={13} />
                  </Link>
                }
              />
            </div>

            <div className="p-4 sm:p-5">
              {activeTodayAppointments.length === 0 ? (
                <div className="flex min-h-[260px] items-center justify-center rounded-[14px] border border-dashed border-white/[.07] bg-white/[.012] text-center">
                  <div>
                    <CalendarDays className="mx-auto h-7 w-7 text-white/18" />
                    <p className="mt-4 text-[14px] text-white/65">
                      No hay turnos activos para hoy.
                    </p>
                    <p className="mt-1 text-[12px] text-white/38">
                      Los nuevos turnos aparecerán automáticamente acá.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {activeTodayAppointments.slice(0, 7).map((appointment, index) => (
                    <Link
                      key={appointment.id}
                      href="/admin/turnos"
                      className="interactive-row focus-ring grid grid-cols-[62px_minmax(0,1fr)_auto] items-center gap-3 rounded-[12px] border border-transparent px-3 py-3.5 sm:grid-cols-[72px_minmax(0,1fr)_112px]"
                    >
                      <div>
                        <p className="data text-[14px] font-medium text-white">
                          {formatTime(appointment.start_at)}
                        </p>
                        <p className="mt-1 text-[9px] uppercase tracking-[.13em] text-white/38">
                          {index === 0 ? "Próximo" : "Turno"}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-white/90">
                          {appointment.customer?.full_name ?? "Cliente"}
                        </p>
                        <div className="mt-1 flex min-w-0 items-center gap-2 text-[11px] text-white/55">
                          <Scissors size={11} />
                          <span className="truncate">
                            {appointment.service?.name ?? "Servicio"}
                          </span>
                          <span>·</span>
                          <span>{formatMoney(Number(appointment.service?.price ?? 0))}</span>
                        </div>
                      </div>

                      <span
                        className={`hidden justify-self-end rounded-full border px-2.5 py-1 text-[9px] font-semibold sm:inline-flex ${getStatusClass(appointment.status)}`}
                      >
                        {getStatusLabel(appointment.status)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {activeTodayAppointments.length > 7 ? (
                <div className="mt-3 border-t hairline pt-3 text-center text-[10px] text-white/42">
                  + {activeTodayAppointments.length - 7} turnos más en la agenda
                </div>
              ) : null}

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-[12px] border border-white/[.055] bg-white/[.012] p-4">
                  <div className="meta-label text-white/55">Hoy</div>
                  <div className="display mt-2 text-[19px] font-semibold text-white">
                    {formatMoney(todayRevenue)}
                  </div>
                  <div className="mt-1 text-[11px] text-white/42">facturado</div>
                </div>

                <div className="rounded-[12px] border border-white/[.055] bg-white/[.012] p-4">
                  <div className="meta-label text-white/55">Próximo</div>
                  <div className="display mt-2 text-[19px] font-semibold text-white">
                    {nextAppointment ? formatTime(nextAppointment.start_at) : "—"}
                  </div>
                  <div className="mt-1 truncate text-[11px] text-white/42">
                    {nextAppointment?.customer?.full_name ?? "Sin próximos turnos"}
                  </div>
                </div>

                <div className="rounded-[12px] border border-white/[.055] bg-white/[.012] p-4">
                  <div className="meta-label text-white/55">Completados</div>
                  <div className="display mt-2 text-[19px] font-semibold text-white">
                    {todayAppointments.filter(isCompleted).length}
                  </div>
                  <div className="mt-1 text-[11px] text-white/42">
                    de {todayAppointments.length} turnos
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="border-b hairline px-5 py-5 sm:px-6">
              <SectionHeader
                eyebrow="PULSO DEL NEGOCIO"
                title="Qué está pasando"
                description="Señales que ayudan a decidir dónde poner el foco."
              />
            </div>

            <div className="grid grid-cols-1 divide-y divide-white/[.045]">
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="meta-label text-[#ff6a18]">Retención</div>
                    <div className="display mt-2 text-[28px] font-semibold text-white">
                      {recurringClients}
                    </div>
                    <p className="mt-1 text-[12px] leading-5 text-white/48">
                      clientes que volvieron durante el período.
                    </p>
                  </div>
                  <CheckCircle2 size={18} className="text-emerald-300/70" />
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="meta-label text-[#ff6a18]">Recuperación</div>
                    <div className="display mt-2 text-[28px] font-semibold text-white">
                      {inactiveCustomers.length}
                    </div>
                    <p className="mt-1 text-[12px] leading-5 text-white/48">
                      clientes sin visita reciente.
                    </p>
                  </div>
                  <Target size={18} className="text-[#ff6a18]" />
                </div>
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="meta-label text-[#ff6a18]">Demanda</div>
                    <div className="display mt-2 text-[28px] font-semibold text-white">
                      {busiestDay ? formatNumber(busiestDay.count) : "0"}
                    </div>
                    <p className="mt-1 text-[12px] leading-5 text-white/48">
                      turnos en el día de mayor actividad.
                    </p>
                  </div>
                  <TrendingUp size={18} className="text-white/50" />
                </div>
              </div>
            </div>
          </Panel>
        </section>

        {/* PERFORMANCE CHART */}
        <Panel className="mb-5">
          <div className="border-b hairline px-5 py-5 sm:px-6">
            <SectionHeader
              eyebrow="RITMO DEL NEGOCIO"
              title="Ingresos y actividad"
              description="Evolución de los servicios completados dentro del período seleccionado."
              action={
                <div className="hidden items-center gap-2 text-[12px] text-white/60 sm:flex">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-[#ff5a00]/80" />
                  Ingresos
                </div>
              }
            />
          </div>

          <div className="p-5 sm:p-6">
            {periodDays.every((item) => item.revenue === 0 && item.count === 0) ? (
              <div className="flex min-h-[280px] items-center justify-center rounded-[14px] border border-dashed border-white/[.07] bg-white/[.012] text-center">
                <div>
                  <TrendingUp className="mx-auto h-7 w-7 text-white/16" />
                  <p className="mt-4 text-[14px] text-white/62">
                    Todavía no hay actividad para graficar.
                  </p>
                  <p className="mt-1 text-[12px] text-white/38">
                    Cuando existan servicios completados, la evolución aparecerá acá.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <BarChart
                  height={260}
                  seriesLabel="Ingresos"
                  formatValue={formatMoney}
                  formatAxis={(value) => `$${compactNumber(value)}`}
                  maxXLabels={range === "MONTH" ? 10 : 12}
                  highlightKey={periodDays.find((item) => isSameCalendarSlot(item.date, range))?.label}
                  ariaLabel="Ingresos por período"
                  data={periodDays.map((item) => ({
                    key: item.label,
                    label: item.label,
                    value: item.revenue,
                    fullLabel: formatSlotLabel(item.date, range),
                    detail: `${item.count} ${item.count === 1 ? "turno completado" : "turnos completados"}`,
                  }))}
                />

                <div className="mt-5 grid grid-cols-1 gap-3 border-t hairline pt-5 sm:grid-cols-3">
                  <div>
                    <div className="meta-label text-white/45">Facturación</div>
                    <div className="display mt-2 text-[20px] font-semibold text-white">
                      {formatMoney(periodRevenue)}
                    </div>
                  </div>
                  <div>
                    <div className="meta-label text-white/45">Ticket</div>
                    <div className="display mt-2 text-[20px] font-semibold text-white">
                      {formatMoney(averageTicket)}
                    </div>
                  </div>
                  <div>
                    <div className="meta-label text-white/45">Variación</div>
                    <div
                      className={`display mt-2 text-[20px] font-semibold ${
                        revenueDelta >= 0 ? "text-emerald-300" : "text-red-300"
                      }`}
                    >
                      {revenueDelta >= 0 ? "+" : ""}
                      {revenueDelta.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* SERVICES + OPERATIONS */}
        <section className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Panel className="lg:col-span-5">
            <div className="border-b hairline px-5 py-5 sm:px-6">
              <SectionHeader
                eyebrow="CATÁLOGO"
                title="Servicios que mueven el negocio"
                description="Volumen y facturación del período."
                action={
                  <Link
                    href="/admin/servicios"
                    className="focus-ring hidden items-center gap-1 text-[11px] font-semibold text-[#ff6a18] sm:inline-flex"
                  >
                    Gestionar
                    <ArrowUpRight size={13} />
                  </Link>
                }
              />
            </div>

            <div className="p-5 sm:p-6">
              {serviceStats.length === 0 ? (
                <div className="rounded-[13px] border border-dashed border-white/[.07] p-5 text-center text-[12px] text-white/45">
                  Todavía no hay actividad por servicio.
                </div>
              ) : (
                <div className="space-y-5">
                  {serviceStats.slice(0, 5).map((service, index) => {
                    const share =
                      serviceStats[0]?.count > 0
                        ? (service.count / serviceStats[0].count) * 100
                        : 0;

                    return (
                      <div key={service.id}>
                        <div className="mb-2 flex items-center gap-3">
                          <span className="data w-5 text-[10px] text-white/28">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/82">
                            {service.name}
                          </span>
                          <span className="data text-[11px] text-white/52">
                            {service.count}
                          </span>
                          <span className="data text-[11px] font-medium text-[#ff6a18]">
                            {formatMoney(service.revenue)}
                          </span>
                        </div>
                        <div className="ml-8 h-1.5 overflow-hidden rounded-full bg-white/[.045]">
                          <div
                            className="bar-fill h-full rounded-full bg-[#ff5a00]"
                            style={{ width: `${Math.min(100, share)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {topService ? (
                <div className="mt-7 rounded-[13px] border border-[#ff5a00]/10 bg-[#ff5a00]/[.035] p-4">
                  <div className="meta-label text-[#ff6a18]">Lectura</div>
                  <p className="mt-2 text-[12px] leading-5 text-white/60">
                    <span className="font-semibold text-white/80">{topService.name}</span>{" "}
                    es el servicio con mayor peso en la actividad del período.
                  </p>
                </div>
              ) : null}
            </div>
          </Panel>

          <Panel className="lg:col-span-4">
            <div className="border-b hairline px-5 py-5 sm:px-6">
              <SectionHeader
                eyebrow="PULSO OPERATIVO"
                title="Estado de la operación"
                description="Cómo terminó el período seleccionado."
              />
            </div>

            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
              <Donut
                segments={statusRows.map(([, value, , color]) => ({ value, color }))}
              />

              <div className="flex-1 space-y-3.5">
                {statusRows.map(([label, value, dot]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="flex items-center gap-2 text-[12px] text-white/72">
                      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                      {label}
                    </span>
                    <span className="data text-[13px] font-medium text-white/82">
                      {value}
                    </span>
                  </div>
                ))}

                <div className="border-t hairline pt-4">
                  <div className="meta-label text-white/42" title="Completados sobre turnos cerrados (completados, no asistió y cancelados)">
                    Tasa de completado
                  </div>
                  <div className="display mt-2 text-[24px] font-semibold text-white">
                    {operationalCompletion.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="lg:col-span-3">
            <div className="border-b hairline px-5 py-5">
              <SectionHeader
                eyebrow="SISTEMA"
                title="Estado general"
                description="Módulos conectados."
              />
            </div>

            <div className="space-y-3 p-5">
              {[
                ["Reservas online", settings?.online_booking_enabled ?? false],
                ["Fidelización", settings?.loyalty_enabled ?? false],
                ["Servicios", services.some((service) => service.active)],
                ["Equipo", barbers.some((barber) => barber.active)],
              ].map(([label, active]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between rounded-[11px] border border-white/[.055] bg-white/[.012] p-3.5"
                >
                  <span className="text-[12px] font-medium text-white/65">
                    {label}
                  </span>
                  <span className="flex items-center gap-2 text-[10px] text-white/45">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        active ? "bg-emerald-400" : "bg-white/20"
                      }`}
                    />
                    {active ? "Activo" : "Inactivo"}
                  </span>
                </div>
              ))}

              <div className="border-t hairline pt-4">
                <div className="text-[10px] leading-5 text-white/35">
                  {settings?.name ?? "Don Segundo"} · {systemSummary}
                </div>
              </div>
            </div>
          </Panel>
        </section>

        {/* CUSTOMERS + LOYALTY */}
        <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
          <Panel>
            <div className="border-b hairline px-5 py-5 sm:px-6">
              <SectionHeader
                eyebrow="CLIENTES DE VALOR"
                title="Clientes con mayor facturación"
                description="Ranking calculado exclusivamente sobre servicios completados."
                action={
                  <Link
                    href="/admin/clientes"
                    className="focus-ring hidden items-center gap-1 text-[11px] font-semibold text-[#ff6a18] sm:inline-flex"
                  >
                    Directorio
                    <ArrowUpRight size={13} />
                  </Link>
                }
              />
            </div>

            <div className="p-5 sm:p-6">
              {customerRanking.length === 0 ? (
                <div className="rounded-[13px] border border-dashed border-white/[.07] p-5 text-center text-[12px] text-white/45">
                  Todavía no hay clientes con servicios completados.
                </div>
              ) : (
                <div className="space-y-1">
                  {customerRanking.slice(0, 5).map((customer, index) => (
                    <Link
                      key={`${customer.name}-${index}`}
                      href="/admin/clientes"
                      className="interactive-row focus-ring flex items-center gap-3 rounded-[12px] border border-transparent px-3 py-3"
                    >
                      <span className="data w-5 text-[10px] text-white/25">
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[.05] text-[10px] font-semibold text-white/60">
                        {customer.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold text-white/84">
                          {customer.name}
                        </div>
                        <div className="mt-0.5 text-[10px] text-white/38">
                          {customer.visits} {customer.visits === 1 ? "visita" : "visitas"}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="data text-[12px] font-medium text-[#ff6a18]">
                          {formatMoney(customer.revenue)}
                        </div>
                        <div className="mt-0.5 text-[9px] text-white/30">valor</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-[12px] border border-white/[.055] bg-white/[.012] p-4">
                  <div className="meta-label text-white/45">Nuevos</div>
                  <div className="display mt-2 text-[21px] font-semibold text-white">
                    {newCustomersPeriod}
                  </div>
                  <div className="mt-1 text-[10px] text-white/35">
                    en el período
                  </div>
                </div>

                <div className="rounded-[12px] border border-white/[.055] bg-white/[.012] p-4">
                  <div className="meta-label text-white/45">Recurrentes</div>
                  <div className="display mt-2 text-[21px] font-semibold text-white">
                    {recurringClients}
                  </div>
                  <div className="mt-1 text-[10px] text-white/35">
                    volvieron
                  </div>
                </div>

                <div className="rounded-[12px] border border-white/[.055] bg-white/[.012] p-4">
                  <div className="meta-label text-[#ff6a18]">Recuperación</div>
                  <div className="display mt-2 text-[21px] font-semibold text-white">
                    {inactiveCustomers.length}
                  </div>
                  <div className="mt-1 text-[10px] text-white/35">
                    para contactar
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="border-b hairline px-5 py-5 sm:px-6">
              <SectionHeader
                eyebrow="FIDELIZACIÓN"
                title="Potencial de retorno"
                description="Lectura rápida del programa activo y sus oportunidades."
                action={
                  <Link
                    href="/admin/fidelizacion"
                    className="focus-ring hidden items-center gap-1 text-[11px] font-semibold text-[#ff6a18] sm:inline-flex"
                  >
                    Administrar
                    <ArrowUpRight size={13} />
                  </Link>
                }
              />
            </div>

            <div className="p-5 sm:p-6">
              {!settings?.loyalty_enabled ? (
                <div className="flex min-h-[250px] items-center justify-center rounded-[13px] border border-dashed border-white/[.07] bg-white/[.012] text-center">
                  <div>
                    <Gift className="mx-auto h-7 w-7 text-white/18" />
                    <p className="mt-4 text-[13px] text-white/58">
                      Fidelización está desactivada.
                    </p>
                    <Link
                      href="/admin/configuracion"
                      className="mt-2 inline-flex text-[11px] font-semibold text-[#ff6a18]"
                    >
                      Configurar
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-[13px] border border-[#ff5a00]/15 bg-[#ff5a00]/[.035] p-5">
                    <div className="meta-label text-[#ff6a18]">PUNTOS EN CIRCULACIÓN</div>
                    <div className="display mt-3 text-[31px] font-semibold text-white">
                      {formatNumber(loyalty.points)}
                    </div>
                    <div className="mt-1 text-[11px] text-white/40">
                      {loyalty.clientsWithPoints} clientes con saldo
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="rounded-[12px] border border-white/[.055] bg-white/[.012] p-4">
                      <div className="meta-label text-white/45">Beneficios</div>
                      <div className="display mt-2 text-[22px] font-semibold text-white">
                        {loyalty.availableRewards}
                      </div>
                      <div className="mt-1 text-[10px] text-white/35">
                        potenciales
                      </div>
                    </div>

                    <div className="rounded-[12px] border border-white/[.055] bg-white/[.012] p-4">
                      <div className="meta-label text-[#ff6a18]">Cerca</div>
                      <div className="display mt-2 text-[22px] font-semibold text-white">
                        {closeToReward}
                      </div>
                      <div className="mt-1 text-[10px] text-white/35">
                        a máximo 2 visitas
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t hairline pt-4">
                    <Sparkles size={14} className="text-[#ff6a18]" />
                    <span className="truncate text-[11px] text-white/42">
                      {loyalty.activeProgram?.name ?? "Programa activo"}
                    </span>
                    <span className="ml-auto text-[10px] text-white/30">
                      {loyalty.activeRewards} beneficios activos
                    </span>
                  </div>
                </>
              )}
            </div>
          </Panel>
        </section>

        {/* DECISION SUPPORT */}
        <section className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          <Panel className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="meta-label text-[#ff6a18]">PRÓXIMA ACCIÓN</div>
                <h2 className="display mt-2 text-[20px] font-semibold text-white">
                  Recuperar clientes
                </h2>
              </div>
              <UserPlus size={17} className="text-white/40" />
            </div>
            <p className="mt-4 text-[13px] leading-6 text-white/55">
              {inactiveCustomers.length > 0
                ? `${inactiveCustomers.length} clientes llevan más de 45 días sin una visita.`
                : "No hay una cartera evidente de clientes inactivos en este momento."}
            </p>
            <Link
              href="/admin/clientes"
              className="mt-5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#ff6a18]"
            >
              Revisar clientes
              <ChevronRight size={13} />
            </Link>
          </Panel>

          <Panel className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="meta-label text-[#ff6a18]">DEMANDA</div>
                <h2 className="display mt-2 text-[20px] font-semibold text-white">
                  Día de mayor carga
                </h2>
              </div>
              <CalendarDays size={17} className="text-white/40" />
            </div>
            <p className="mt-4 text-[13px] leading-6 text-white/55">
              {busiestDay
                ? `${new Intl.DateTimeFormat("es-AR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }).format(new Date(`${busiestDay.date}T12:00:00`))} concentró ${busiestDay.count} turnos.`
                : "Todavía no hay suficiente actividad para detectar un patrón."}
            </p>
            <Link
              href="/admin/analytics"
              className="mt-5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#ff6a18]"
            >
              Analizar demanda
              <ChevronRight size={13} />
            </Link>
          </Panel>

          <Panel className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="meta-label text-[#ff6a18]">FIDELIZACIÓN</div>
                <h2 className="display mt-2 text-[20px] font-semibold text-white">
                  Oportunidad de retorno
                </h2>
              </div>
              <Target size={17} className="text-white/40" />
            </div>
            <p className="mt-4 text-[13px] leading-6 text-white/55">
              {closeToReward > 0
                ? `${closeToReward} clientes están cerca de alcanzar un beneficio.`
                : loyalty.activeProgram
                  ? "Todavía no hay clientes dentro de la ventana de proximidad al beneficio."
                  : "Configurá un programa para activar esta oportunidad."}
            </p>
            <Link
              href="/admin/fidelizacion"
              className="mt-5 inline-flex items-center gap-1 text-[11px] font-semibold text-[#ff6a18]"
            >
              Ver fidelización
              <ChevronRight size={13} />
            </Link>
          </Panel>
        </section>

        <footer className="flex flex-col gap-2 border-t border-white/[.055] pt-5 text-[10px] text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <span>BarberOS · centro de mando operativo</span>
          <span>
            {formatNumber(appointments.length)} eventos ·{" "}
            {formatNumber(customers.length)} clientes ·{" "}
            {formatNumber(services.filter((service) => service.active).length)} servicios activos
          </span>
        </footer>
      </div>
    </main>
  );
}
