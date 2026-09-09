"use client";

/**
 * BarberOS Command Center — V6
 * Visual direction: premium dark SaaS, Space Grotesk + Manrope + DM Mono,
 * futuristic minimal system with subtle spotlight/glass/border-glow motion.
 * Data layer intentionally remains on the proven Supabase schema.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { DM_Mono, Manrope, Sora } from "next/font/google";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  DollarSign,
  Layers3,
  Scissors,
  TrendingUp,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Appointment = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  notes: string | null;
  customer: {
    full_name: string;
    phone: string;
  } | null;
  service: {
    name: string;
    price: number;
  } | null;
};

type RangeKey = "DAY" | "WEEK" | "MONTH" | "YEAR";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-barberos-ui",
});

const spaceGrotesk = Sora({
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

const ORANGE = "#ff5a00";
const ORANGE_SOFT = "#ff6a18";
const BG = "#070707";
const PANEL = "#0d0d0d";
const PANEL_2 = "#111111";
const BORDER = "rgba(255,255,255,0.075)";

function formatCurrency(value: number) {
  return `$${Math.round(value).toLocaleString("es-AR")}`;
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function shortDate(date: string) {
  return new Date(date).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });
}

function getStatusLabel(status: string) {
  switch (status?.toLowerCase()) {
    case "confirmed":
      return "Confirmado";
    case "completed":
      return "Completado";
    case "cancelled":
      return "Cancelado";
    case "pending":
      return "Pendiente";
    case "no_show":
    case "no-show":
      return "No asistió";
    default:
      return status || "Sin estado";
  }
}

function getStatusClass(status: string) {
  switch (status?.toLowerCase()) {
    case "confirmed":
      return "border-orange-500/20 bg-orange-500/[0.08] text-orange-300";
    case "completed":
      return "border-emerald-500/20 bg-emerald-500/[0.08] text-emerald-300";
    case "cancelled":
      return "border-red-500/20 bg-red-500/[0.08] text-red-300";
    case "pending":
      return "border-amber-500/20 bg-amber-500/[0.08] text-amber-300";
    case "no_show":
    case "no-show":
      return "border-white/10 bg-white/[0.04] text-white/81";
    default:
      return "border-white/10 bg-white/[0.04] text-white/50";
  }
}

function isCancelled(appointment: Appointment) {
  return ["cancelled", "cancelado"].includes(
    appointment.status?.toLowerCase()
  );
}

function isCompleted(appointment: Appointment) {
  return ["completed", "completado"].includes(
    appointment.status?.toLowerCase()
  );
}

function customerKey(appointment: Appointment) {
  const name = appointment.customer?.full_name?.trim().toLowerCase() || "";
  const phone = appointment.customer?.phone?.trim() || "";
  return phone || name || appointment.id;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfWeek(date: Date) {
  const result = startOfDay(date);
  const day = result.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + mondayOffset);
  return result;
}

function endOfWeek(date: Date) {
  return endOfDay(addDays(startOfWeek(date), 6));
}

function startOfMonth(date: Date) {
  const result = startOfDay(date);
  result.setDate(1);
  return result;
}

function endOfMonth(date: Date) {
  const result = startOfMonth(date);
  result.setMonth(result.getMonth() + 1);
  result.setDate(0);
  return endOfDay(result);
}

function startOfYear(date: Date) {
  const result = startOfDay(date);
  result.setMonth(0, 1);
  return result;
}

function endOfYear(date: Date) {
  const result = startOfYear(date);
  result.setFullYear(result.getFullYear() + 1);
  result.setDate(0);
  return endOfDay(result);
}

function shiftPeriod(date: Date, range: RangeKey, offset: number) {
  const result = new Date(date);
  if (range === "DAY") result.setDate(result.getDate() + offset);
  if (range === "WEEK") result.setDate(result.getDate() + offset * 7);
  if (range === "MONTH") result.setMonth(result.getMonth() + offset);
  if (range === "YEAR") result.setFullYear(result.getFullYear() + offset);
  return result;
}

function periodBounds(anchor: Date, range: RangeKey) {
  if (range === "DAY") return { start: startOfDay(anchor), end: endOfDay(anchor) };
  if (range === "WEEK") return { start: startOfWeek(anchor), end: endOfWeek(anchor) };
  if (range === "MONTH") return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
  return { start: startOfYear(anchor), end: endOfYear(anchor) };
}

function periodTitle(anchor: Date, range: RangeKey) {
  if (range === "DAY") {
    return anchor.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
  }
  if (range === "WEEK") {
    const start = startOfWeek(anchor);
    const end = endOfWeek(anchor);
    return `${start.toLocaleDateString("es-AR", { day: "numeric", month: "short" })} — ${end.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`;
  }
  if (range === "MONTH") {
    return anchor.toLocaleDateString("es-AR", { month: "long", year: "numeric" });
  }
  return anchor.toLocaleDateString("es-AR", { year: "numeric" });
}

function periodShortLabel(anchor: Date, range: RangeKey) {
  if (range === "DAY") return anchor.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
  if (range === "WEEK") return `Sem. ${anchor.toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}`;
  if (range === "MONTH") return anchor.toLocaleDateString("es-AR", { month: "short", year: "numeric" });
  return anchor.toLocaleDateString("es-AR", { year: "numeric" });
}

function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 650;
    const from = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className="data-number">
      {prefix}
      {display.toLocaleString("es-AR", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="eyebrow mb-1 text-[#ff6a18]">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="display-font text-[15px] font-[560] tracking-[-0.035em] text-white">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-xs text-white/70">{description}</p>
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
  return (
    <section
      className={`panel-surface overflow-hidden rounded-[20px] border ${className}`}
      style={{ borderColor: BORDER }}
    >
      {children}
    </section>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const width = 150;
  const height = 40;
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * (height - 5) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-10 w-[150px]">
      <polyline
        points={points}
        fill="none"
        stroke={ORANGE}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IngresosChart({
  values,
  labels,
}: {
  values: number[];
  labels: string[];
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const width = 900;
  const height = 280;
  const padding = { top: 24, right: 24, bottom: 42, left: 58 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(...values, 1);
  const step = innerW / Math.max(values.length - 1, 1);
  const points = values.map((value, index) => ({
    x: padding.left + index * step,
    y: padding.top + innerH - (value / max) * innerH,
    value,
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${padding.left},${padding.top + innerH} ${line} ${padding.left + innerW},${padding.top + innerH}`;

  return (
    <div className="chart-shell relative h-[300px] w-full overflow-hidden rounded-[18px] border border-white/[0.07] bg-[#090909]">
      <div className="pointer-events-none absolute inset-0 chart-vignette" />
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="revenueAreaV6" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff6a18" stopOpacity="0.18" />
            <stop offset="65%" stopColor="#ff5a00" stopOpacity="0.055" />
            <stop offset="100%" stopColor="#ff5a00" stopOpacity="0" />
          </linearGradient>
          <filter id="revenueGlowV6" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((fraction) => {
          const y = padding.top + innerH - fraction * innerH;
          return (
            <g key={fraction}>
              <line x1={padding.left} x2={padding.left + innerW} y1={y} y2={y} stroke="rgba(255,255,255,0.065)" strokeWidth="1" />
              <text x="10" y={y + 4} fill="rgba(255,255,255,0.46)" fontSize="10">
                {formatCurrency(max * fraction)}
              </text>
            </g>
          );
        })}

        <polygon points={area} fill="url(#revenueAreaV6)" />
        <polyline points={line} fill="none" stroke={ORANGE} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" filter="url(#revenueGlowV6)" />

        {points.map((point, index) => (
          <g key={`${labels[index]}-${index}`}>
            <circle cx={point.x} cy={point.y} r={hovered === index ? 5.5 : 3} fill={BG} stroke={ORANGE_SOFT} strokeWidth={hovered === index ? 2.5 : 1.7} />
            <rect
              x={Math.max(0, point.x - Math.max(step * 0.45, 18))}
              y={padding.top}
              width={Math.min(width, Math.max(step * 0.9, 36))}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHovered(index)}
              onMouseLeave={() => setHovered(null)}
            />
          </g>
        ))}

        {labels.map((label, index) => (
          <text key={label + index} x={padding.left + index * step} y={height - 12} textAnchor="middle" fill="rgba(255,255,255,0.46)" fontSize="10">
            {label}
          </text>
        ))}

        {hovered !== null ? (
          <g pointerEvents="none">
            <line x1={points[hovered].x} x2={points[hovered].x} y1={padding.top} y2={padding.top + innerH} stroke="rgba(255,255,255,0.16)" strokeDasharray="3 4" />
          </g>
        ) : null}
      </svg>

      {hovered !== null ? (
        <div
          className="pointer-events-none absolute z-10 min-w-[128px] rounded-xl border border-white/10 bg-[#111]/95 px-3 py-2 shadow-2xl backdrop-blur-xl"
          style={{
            left: `${Math.min(Math.max((points[hovered].x / width) * 100, 9), 83)}%`,
            top: 18,
            transform: "translateX(-50%)",
          }}
        >
          <p className="text-[9px] uppercase tracking-[0.14em] text-white/50">{labels[hovered]}</p>
          <p className="mt-1 text-sm font-semibold tracking-[-0.02em] text-white">{formatCurrency(points[hovered].value)}</p>
        </div>
      ) : null}
    </div>
  );
}

function MiniBarChart({
  values,
  labels,
}: {
  values: number[];
  labels: string[];
}) {
  const max = Math.max(...values, 1);

  return (
    <div className="flex h-40 items-end gap-2">
      {values.map((value, index) => {
        const height = Math.max(8, (value / max) * 100);
        return (
          <div key={labels[index] + index} className="flex h-full flex-1 flex-col justify-end">
            <div className="mb-2 text-center text-[9px] text-white/70">
              {value}
            </div>
            <div className="relative h-[100px] overflow-hidden rounded-md bg-white/[0.035]">
              <div
                className="absolute inset-x-0 bottom-0 rounded-md bg-gradient-to-t from-[#b83d00] to-[#ff5a00] transition-all duration-700"
                style={{ height: `${height}%` }}
              />
            </div>
            <p className="mt-2 text-center text-[9px] uppercase tracking-wider text-white/70">
              {labels[index]}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyComparisonChart({
  values,
  labels,
}: {
  values: number[];
  labels: string[];
}) {
  const max = Math.max(...values, 1);
  return (
    <div className="grid h-[168px] grid-cols-6 items-end gap-3">
      {values.map((value, index) => {
        const height = value > 0 ? Math.max(12, (value / max) * 100) : 4;
        const current = index === values.length - 1;
        return (
          <div key={`${labels[index]}-${index}`} className="flex h-full min-w-0 flex-col justify-end">
            <div className="mb-2 text-center text-[9px] font-medium text-white/70">{formatCurrency(value)}</div>
            <div className="relative h-[96px] overflow-hidden rounded-[7px] bg-white/[0.035]">
              <div
                className={`absolute inset-x-0 bottom-0 rounded-[7px] ${current ? "bg-[#ff5a00]" : "bg-white/[0.18]"}`}
                style={{ height: `${height}%` }}
              />
            </div>
            <p className={`mt-2 truncate text-center text-[9px] font-medium uppercase tracking-[0.08em] ${current ? "text-white/90" : "text-white/48"}`}>
              {labels[index]}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function Donut({
  completed,
  cancelled,
  pending,
}: {
  completed: number;
  cancelled: number;
  pending: number;
}) {
  const total = completed + cancelled + pending || 1;
  const completedPct = completed / total;
  const cancelledPct = cancelled / total;
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const completedLength = completedPct * circumference;
  const cancelledLength = cancelledPct * circumference;

  return (
    <div className="relative h-44 w-44 shrink-0">
      <svg viewBox="0 0 110 110" className="h-full w-full -rotate-90">
        <circle cx="55" cy="55" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke={ORANGE}
          strokeWidth="10"
          strokeDasharray={`${completedLength} ${circumference}`}
          strokeLinecap="round"
        />
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke="#666666"
          strokeWidth="10"
          strokeDasharray={`${cancelledLength} ${circumference}`}
          strokeDashoffset={-completedLength}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-white numeric-value">{total}</span>
        <span className="text-[9px] uppercase tracking-[0.18em] text-white/72">turnos</span>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {

  useEffect(() => {
    const surfaces = document.querySelectorAll<HTMLElement>(
      ".barberos-dashboard .metric-card, .barberos-dashboard .panel-surface"
    );

    const handlers = new Map<HTMLElement, (event: PointerEvent) => void>();

    surfaces.forEach((element) => {
      const handler = (event: PointerEvent) => {
        const rect = element.getBoundingClientRect();
        element.style.setProperty(
          "--spot-x",
          `${((event.clientX - rect.left) / rect.width) * 100}%`
        );
        element.style.setProperty(
          "--spot-y",
          `${((event.clientY - rect.top) / rect.height) * 100}%`
        );
      };

      handlers.set(element, handler);
      element.addEventListener("pointermove", handler);
    });

    return () => {
      handlers.forEach((handler, element) => {
        element.removeEventListener("pointermove", handler);
      });
    };
  }, []);
  const supabase = createClient();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState<RangeKey>("MONTH");
  const [periodOffset, setPeriodOffset] = useState(0);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");

      const { data, error: queryError } = await supabase
        .from("appointments")
        .select(`
          id,
          start_at,
          end_at,
          status,
          notes,
          customer:customers (
            full_name,
            phone
          ),
          service:services (
            name,
            price
          )
        `)
        .order("start_at", { ascending: true });

      if (queryError) {
        console.error("Dashboard error:", queryError);
        setError("No pudimos cargar los datos del dashboard.");
        setLoading(false);
        return;
      }

      setAppointments((data ?? []) as unknown as Appointment[]);
      setLoading(false);
    }

    loadDashboard();
  }, []);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const anchorDate = useMemo(() => shiftPeriod(now, range, periodOffset), [range, periodOffset]);
  const currentBounds = useMemo(() => periodBounds(anchorDate, range), [anchorDate, range]);
  const previousAnchor = useMemo(() => shiftPeriod(anchorDate, range, -1), [anchorDate, range]);
  const previousBounds = useMemo(() => periodBounds(previousAnchor, range), [previousAnchor, range]);
  const rangeStart = currentBounds.start;

  const validAppointments = useMemo(
    () => appointments.filter((appointment) => !isCancelled(appointment)),
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
    () => todayAppointments.filter((appointment) => !isCancelled(appointment)),
    [todayAppointments]
  );

  const periodAppointments = useMemo(
    () =>
      validAppointments.filter((appointment) => {
        const date = new Date(appointment.start_at);
        return date >= currentBounds.start && date <= currentBounds.end;
      }),
    [validAppointments, currentBounds.start, currentBounds.end]
  );

  const completedPeriodAppointments = useMemo(
    () => periodAppointments.filter(isCompleted),
    [periodAppointments]
  );

  const previousPeriodAppointments = useMemo(
    () =>
      validAppointments.filter((appointment) => {
        const date = new Date(appointment.start_at);
        return date >= previousBounds.start && date <= previousBounds.end;
      }),
    [validAppointments, previousBounds.start, previousBounds.end]
  );

  const previousCompletedAppointments = useMemo(
    () => previousPeriodAppointments.filter(isCompleted),
    [previousPeriodAppointments]
  );

  const previousPeriodIngresos = useMemo(
    () => previousCompletedAppointments.reduce((total, appointment) => total + Number(appointment.service?.price ?? 0), 0),
    [previousCompletedAppointments]
  );

  const periodIngresos = useMemo(
    () =>
      completedPeriodAppointments.reduce(
        (total, appointment) => total + Number(appointment.service?.price ?? 0),
        0
      ),
    [completedPeriodAppointments]
  );

  const periodDelta = previousPeriodIngresos
    ? ((periodIngresos - previousPeriodIngresos) / previousPeriodIngresos) * 100
    : periodIngresos > 0
      ? 100
      : 0;

  const todayIngresos = useMemo(
    () =>
      activeTodayAppointments.reduce(
        (total, appointment) => total + Number(appointment.service?.price ?? 0),
        0
      ),
    [activeTodayAppointments]
  );

  const averageTicket = completedPeriodAppointments.length
    ? periodIngresos / completedPeriodAppointments.length
    : 0;

  const uniqueTodayClients = useMemo(
    () => new Set(activeTodayAppointments.map(customerKey)).size,
    [activeTodayAppointments]
  );

  const uniquePeriodClients = useMemo(
    () => new Set(periodAppointments.map(customerKey)).size,
    [periodAppointments]
  );

  const recurringClients = useMemo(() => {
    const counts = new Map<string, number>();
    periodAppointments.forEach((appointment) => {
      const key = customerKey(appointment);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.values()).filter((count) => count > 1).length;
  }, [periodAppointments]);

  const newOrSingleVisitClients = Math.max(uniquePeriodClients - recurringClients, 0);

  const nextAppointment = useMemo(() => {
    return validAppointments.find((appointment) => {
      const start = new Date(appointment.start_at);
      return start >= now;
    });
  }, [validAppointments, now]);

  const upcomingAppointments = useMemo(() => {
    return validAppointments
      .filter((appointment) => new Date(appointment.start_at) >= now)
      .slice(0, 6);
  }, [validAppointments, now]);

  const serviceStats = useMemo(() => {
    const stats = new Map<string, { name: string; count: number; revenue: number }>();

    periodAppointments.forEach((appointment) => {
      const name = appointment.service?.name ?? "Sin servicio";
      const current = stats.get(name);
      if (current) {
        current.count += 1;
        current.revenue += Number(appointment.service?.price ?? 0);
      } else {
        stats.set(name, {
          name,
          count: 1,
          revenue: Number(appointment.service?.price ?? 0),
        });
      }
    });

    return Array.from(stats.values()).sort((a, b) => b.count - a.count);
  }, [periodAppointments]);

  const customerRows = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        phone: string;
        visits: number;
        revenue: number;
        lastVisit: string;
      }
    >();

    periodAppointments.forEach((appointment) => {
      const key = customerKey(appointment);
      const existing = map.get(key);
      const revenue = Number(appointment.service?.price ?? 0);
      if (!existing) {
        map.set(key, {
          name: appointment.customer?.full_name ?? "Cliente",
          phone: appointment.customer?.phone ?? "",
          visits: 1,
          revenue,
          lastVisit: appointment.start_at,
        });
      } else {
        existing.visits += 1;
        existing.revenue += revenue;
        if (new Date(appointment.start_at) > new Date(existing.lastVisit)) {
          existing.lastVisit = appointment.start_at;
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [periodAppointments]);

  const atRiskCustomers = useMemo(() => {
    const map = new Map<string, { name: string; phone: string; lastVisit: string }>();

    validAppointments.forEach((appointment) => {
      const key = customerKey(appointment);
      const current = map.get(key);
      if (!current || new Date(appointment.start_at) > new Date(current.lastVisit)) {
        map.set(key, {
          name: appointment.customer?.full_name ?? "Cliente",
          phone: appointment.customer?.phone ?? "",
          lastVisit: appointment.start_at,
        });
      }
    });

    return Array.from(map.values())
      .filter((client) => new Date(client.lastVisit) < daysAgo(35))
      .sort((a, b) => new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime())
      .slice(0, 4);
  }, [validAppointments]);

  const revenueSeries = useMemo(() => {
    const buckets: { label: string; start: Date; end: Date }[] = [];

    if (range === "DAY") {
      for (let hour = 0; hour < 24; hour += 1) {
        const start = new Date(currentBounds.start);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start);
        end.setHours(hour + 1, 0, 0, 0);
        buckets.push({ label: `${String(hour).padStart(2, "0")}h`, start, end });
      }
    }

    if (range === "WEEK") {
      for (let i = 0; i < 7; i += 1) {
        const start = addDays(currentBounds.start, i);
        buckets.push({
          label: start.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", ""),
          start,
          end: addDays(start, 1),
        });
      }
    }

    if (range === "MONTH") {
      const monthStart = currentBounds.start;
      for (let i = 0; i < 5; i += 1) {
        const start = addDays(monthStart, i * 7);
        if (start > currentBounds.end) break;
        const end = new Date(start);
        end.setDate(end.getDate() + 7);
        buckets.push({
          label: `Sem ${i + 1}`,
          start,
          end: end > currentBounds.end ? addDays(currentBounds.end, 1) : end,
        });
      }
    }

    if (range === "YEAR") {
      for (let month = 0; month < 12; month += 1) {
        const start = new Date(currentBounds.start);
        start.setMonth(month, 1);
        const end = new Date(start);
        end.setMonth(month + 1, 1);
        buckets.push({
          label: start.toLocaleDateString("es-AR", { month: "short" }).replace(".", ""),
          start,
          end,
        });
      }
    }

    return buckets.map(({ label, start, end }) => ({
      label,
      value: completedPeriodAppointments
        .filter((appointment) => {
          const date = new Date(appointment.start_at);
          return date >= start && date < end;
        })
        .reduce((total, appointment) => total + Number(appointment.service?.price ?? 0), 0),
    }));
  }, [completedPeriodAppointments, currentBounds.start, currentBounds.end, range]);

  const weekDays = useMemo(() => {
    const buckets: { label: string; start: Date; end: Date }[] = [];

    if (range === "DAY") {
      buckets.push({ label: "Hoy", start: currentBounds.start, end: currentBounds.end });
    } else if (range === "WEEK") {
      for (let i = 0; i < 7; i += 1) {
        const start = addDays(currentBounds.start, i);
        buckets.push({ label: start.toLocaleDateString("es-AR", { weekday: "narrow" }), start, end: addDays(start, 1) });
      }
    } else if (range === "MONTH") {
      for (let i = 0; i < 5; i += 1) {
        const start = addDays(currentBounds.start, i * 7);
        if (start > currentBounds.end) break;
        buckets.push({ label: `S${i + 1}`, start, end: addDays(start, 7) });
      }
    } else {
      for (let i = 0; i < 12; i += 1) {
        const start = new Date(currentBounds.start);
        start.setMonth(i, 1);
        const end = new Date(start);
        end.setMonth(i + 1, 1);
        buckets.push({ label: start.toLocaleDateString("es-AR", { month: "narrow" }), start, end });
      }
    }

    return buckets.map(({ label, start, end }) => ({
      label,
      count: periodAppointments.filter((appointment) => {
        const appointmentDate = new Date(appointment.start_at);
        return appointmentDate >= start && appointmentDate < end;
      }).length,
    }));
  }, [periodAppointments, currentBounds.start, currentBounds.end, range]);


  const monthlyComparison = useMemo(() => {
    const values: number[] = [];
    const labels: string[] = [];

    for (let offset = -5; offset <= 0; offset += 1) {
      const date = new Date(now);
      date.setMonth(date.getMonth() + offset, 1);
      const start = startOfMonth(date);
      const end = endOfMonth(date);
      const value = appointments
        .filter((appointment) => isCompleted(appointment))
        .filter((appointment) => {
          const appointmentDate = new Date(appointment.start_at);
          return appointmentDate >= start && appointmentDate <= end;
        })
        .reduce((total, appointment) => total + Number(appointment.service?.price ?? 0), 0);

      values.push(value);
      labels.push(date.toLocaleDateString("es-AR", { month: "short" }).replace(".", ""));
    }

    return { values, labels };
  }, [appointments, now]);

  const busiestDay = [...weekDays].sort((a, b) => b.count - a.count)[0];
  const completedToday = activeTodayAppointments.filter(isCompleted).length;
  const pendingToday = activeTodayAppointments.filter(
    (appointment) => appointment.status?.toLowerCase() === "pending"
  ).length;
  const cancelledToday = todayAppointments.filter(isCancelled).length;

  const statusCounts = useMemo(() => {
    return {
      completed: periodAppointments.filter(isCompleted).length,
      cancelled: appointments.filter((appointment) => {
        const date = new Date(appointment.start_at);
        return date >= currentBounds.start && date <= currentBounds.end && isCancelled(appointment);
      }).length,
      pending: periodAppointments.filter(
        (appointment) => appointment.status?.toLowerCase() === "pending"
      ).length,
    };
  }, [appointments, periodAppointments, currentBounds.start, currentBounds.end]);

  const topService = serviceStats[0];
  const topCustomer = customerRows[0];

  const dateLabel = periodTitle(anchorDate, range);

  return (
    <main className={`${manrope.variable} ${spaceGrotesk.variable} ${dmMono.variable} barberos-dashboard min-h-screen bg-[#070707] text-white`}>
      <style jsx>{`
        /*
          BARBEROS V7 — FUTURE MINIMAL
          UI: Manrope
          Display + data: Sora
          Accent data: DM Mono
        */
        .barberos-dashboard {
          --ink: #070707;
          --surface: #0b0b0b;
          --surface-2: #0f0f0f;
          --line: rgba(255,255,255,.075);
          --line-soft: rgba(255,255,255,.05);
          --muted: rgba(255,255,255,.46);
          --quiet: rgba(255,255,255,.30);
          --orange: #ff5a00;
          --orange-bright: #ff7a22;
          font-family: var(--font-barberos-ui), ui-sans-serif, system-ui, sans-serif;
          font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          letter-spacing: -0.014em;
          background:
            radial-gradient(720px 360px at 88% -8%, rgba(255,90,0,.045), transparent 70%),
            radial-gradient(520px 320px at 8% 14%, rgba(255,255,255,.010), transparent 74%),
            #070707;
        }

        .barberos-dashboard h1,
        .barberos-dashboard h2,
        .barberos-dashboard h3,
        .barberos-dashboard h4,
        .barberos-dashboard .display-font {
          font-family: var(--font-barberos-display), sans-serif;
          font-feature-settings: "kern" 1, "liga" 1;
          text-wrap: balance;
        }

        .barberos-dashboard .display-title {
          font-family: var(--font-barberos-display), sans-serif;
          font-size: clamp(34px, 4vw, 48px);
          line-height: .91;
          letter-spacing: -.075em;
          font-weight: 620;
        }

        .barberos-dashboard .data-number,
        .barberos-dashboard .numeric-value,
        .barberos-dashboard .kpi-value,
        .barberos-dashboard .data-emphasis {
          font-family: var(--font-barberos-display), sans-serif;
          font-variant-numeric: tabular-nums lining-nums;
          font-feature-settings: "tnum" 1, "zero" 1, "kern" 1;
          letter-spacing: -.065em;
        }

        .barberos-dashboard .data-emphasis {
          font-family: var(--font-barberos-display), sans-serif;
          letter-spacing: -.045em;
        }

        .barberos-dashboard .eyebrow,
        .barberos-dashboard .meta-label {
          font-family: var(--font-barberos-ui), sans-serif;
          text-transform: uppercase;
          letter-spacing: .18em;
        }

        .barberos-dashboard .eyebrow {
          font-size: 8px;
          line-height: 1;
          font-weight: 800;
        }

        .barberos-dashboard .meta-label {
          font-size: 9px;
          font-weight: 650;
        }

        .barberos-dashboard .micro-copy {
          font-size: 10px;
          line-height: 1.55;
        }

        .barberos-dashboard .kpi-value {
          font-size: 30px;
          line-height: .96;
          font-weight: 570;
          font-feature-settings: "tnum" 1, "lnum" 1, "kern" 1;
        }

        .barberos-dashboard .caption {
          font-size: 9px;
          line-height: 1.45;
          font-weight: 520;
        }

        /* The same premium treatment now reaches every lower panel. */
        .barberos-dashboard .panel-surface {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          background:
            linear-gradient(145deg, rgba(255,255,255,.028), rgba(255,255,255,.010) 52%, rgba(255,90,0,.012)),
            rgba(10,10,10,.96);
          border-color: var(--line) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.022),
            0 18px 58px rgba(0,0,0,.15);
          transition:
            transform 240ms cubic-bezier(.22,.61,.36,1),
            border-color 240ms ease,
            box-shadow 240ms ease;
        }

        .barberos-dashboard .panel-surface::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background:
            radial-gradient(
              480px circle at 82% -8%,
              rgba(255,90,0,.052),
              rgba(255,90,0,.012) 32%,
              transparent 68%
            );
          opacity: .34;
          transition: opacity 260ms ease;
        }

        .barberos-dashboard .panel-surface::after {
          content: "";
          position: absolute;
          top: 0;
          left: 7%;
          right: 7%;
          height: 1px;
          pointer-events: none;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,.12),
            rgba(255,90,0,.20),
            rgba(255,255,255,.08),
            transparent
          );
          opacity: .20;
        }

        .barberos-dashboard .panel-surface:hover {
          transform: translateY(-1px);
          border-color: rgba(255,90,0,.14) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.032),
            0 24px 70px rgba(0,0,0,.22),
            0 0 0 1px rgba(255,90,0,.018);
        }

        .barberos-dashboard .panel-surface:hover::before {
          opacity: .50;
        }

        .barberos-dashboard .metric-card {
          min-height: 138px;
        }

        .barberos-dashboard .metric-card::after {
          content: "";
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,90,0,.78), transparent);
          transform: scaleX(.16);
          transform-origin: center;
          opacity: .60;
          transition: transform 260ms ease, opacity 260ms ease;
        }

        .barberos-dashboard .metric-card:hover::after {
          transform: scaleX(1);
          opacity: 1;
        }

        .barberos-dashboard .metric-index {
          font-family: var(--font-barberos-data), monospace;
          font-size: 8px;
          letter-spacing: .04em;
          color: rgba(255,255,255,.20);
        }

        .barberos-dashboard .glass-control {
          border: 1px solid rgba(255,255,255,.08);
          background:
            linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.018));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.03),
            0 10px 30px rgba(0,0,0,.16);
          backdrop-filter: blur(18px);
        }

        .barberos-dashboard .primary-action {
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(135deg, #ff6a18 0%, #ff5a00 52%, #e84b00 100%);
          box-shadow:
            0 12px 30px rgba(255,90,0,.14),
            inset 0 1px 0 rgba(255,255,255,.26);
        }

        .barberos-dashboard .primary-action::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            108deg,
            transparent 20%,
            rgba(255,255,255,.30) 47%,
            transparent 72%
          );
          transform: translateX(-140%);
          transition: transform 650ms cubic-bezier(.22,.61,.36,1);
        }

        .barberos-dashboard .primary-action:hover::before {
          transform: translateX(140%);
        }

        .barberos-dashboard .system-strip {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.065);
          background:
            linear-gradient(90deg, rgba(255,90,0,.045), rgba(255,255,255,.012) 35%, rgba(255,255,255,.008));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.025),
            0 12px 40px rgba(0,0,0,.12);
        }

        .barberos-dashboard .system-strip::before {
          content: "";
          position: absolute;
          inset-y: 0;
          width: 180px;
          left: -200px;
          background: linear-gradient(90deg, transparent, rgba(255,90,0,.075), transparent);
          animation: barberos-scan 9s linear infinite;
          pointer-events: none;
        }

        .barberos-dashboard .status-led {
          box-shadow: 0 0 14px currentColor;
        }

        .barberos-dashboard .pulse-dot {
          animation: none;
        }

        .barberos-dashboard .chart-shell {
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.018),
            inset 0 0 70px rgba(255,90,0,.015);
        }

        .barberos-dashboard .interactive-row {
          position: relative;
          transition:
            background 180ms ease,
            transform 180ms cubic-bezier(.22,.61,.36,1);
        }

        .barberos-dashboard .interactive-row:hover {
          background:
            linear-gradient(90deg, rgba(255,90,0,.035), rgba(255,255,255,.018) 52%, transparent);
          transform: translateX(3px);
        }

        .barberos-dashboard .accent-line {
          position: relative;
        }

        .barberos-dashboard .accent-line::before {
          content: "";
          position: absolute;
          left: 0;
          top: 18%;
          bottom: 18%;
          width: 2px;
          border-radius: 999px;
          background: linear-gradient(to bottom, #ff7a22, #ff5a00 55%, transparent);
          box-shadow: 0 0 20px rgba(255,90,0,.32);
        }

        .barberos-dashboard .dashboard-grid-bg {
          background-image:
            linear-gradient(rgba(255,255,255,.013) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.013) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,.86), transparent 72%);
        }

        .barberos-dashboard .dashboard-fade {
          background:
            radial-gradient(circle at 84% 0%, rgba(255,90,0,.035), transparent 24%),
            radial-gradient(circle at 12% 18%, rgba(255,255,255,.010), transparent 18%);
        }

        .barberos-dashboard .dashboard-noise {
          opacity: .035;
          background-image:
            repeating-radial-gradient(circle at 0 0, rgba(255,255,255,.08) 0 .35px, transparent .5px 3.6px);
          mix-blend-mode: soft-light;
        }

        .barberos-dashboard .orange-orb { width: 0; height: 0; opacity: 0; }

        .barberos-dashboard .focus-ring:focus-visible {
          outline: 2px solid rgba(255,90,0,.72);
          outline-offset: 3px;
        }

        @keyframes barberos-scan {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(100vw + 420px)); }
        }

        @keyframes ambient-drift {
          from { transform: translate3d(0,0,0) scale(1); }
          to { transform: translate3d(-1.2%,1%,0) scale(1.025); }
        }

        @media (max-width: 900px) {
          .barberos-dashboard .display-title {
            font-size: 34px;
          }
        }



        .barberos-dashboard .metric-card,
        .barberos-dashboard .panel-surface {
          position: relative;
          isolation: isolate;
        }

        .barberos-dashboard .metric-card::after,
        .barberos-dashboard .panel-surface::after {
          content: "";
          pointer-events: none;
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background:
            radial-gradient(
              420px circle at var(--spot-x, 50%) var(--spot-y, -10%),
              rgba(255, 90, 0, 0.055),
              transparent 42%
            );
          opacity: 0;
          transition: opacity 260ms ease;
          z-index: -1;
        }

        .barberos-dashboard .metric-card:hover::after,
        .barberos-dashboard .panel-surface:hover::after {
          opacity: 1;
        }

        .barberos-dashboard .metric-card:hover {
          border-color: rgba(255,255,255,0.105) !important;
          transform: translateY(-1px);
        }

        .barberos-dashboard .metric-card,
        .barberos-dashboard .panel-surface {
          transition:
            border-color 220ms ease,
            transform 220ms cubic-bezier(.22,1,.36,1);
        }

        .barberos-dashboard .executive-label {
          color: rgba(255,255,255,.42);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .barberos-dashboard .executive-value {
          color: rgba(255,255,255,.92);
          font-size: 11px;
          font-weight: 600;
        }

        .barberos-dashboard .hero-title-accent {
          display: inline-block;
          width: 30px;
          height: 1px;
          margin-left: 2px;
          vertical-align: middle;
          background: linear-gradient(90deg, rgba(255,90,0,.75), transparent);
        }

        .barberos-dashboard .period-control button {
          min-width: 78px;
        }
        .barberos-dashboard .period-control button[data-active="true"] {
          background: rgba(255,255,255,0.09);
          color: #fff;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
        }
        .barberos-dashboard .period-nav {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.025);
          box-shadow: 0 10px 35px rgba(0,0,0,0.18);
        }
        .barberos-dashboard .chart-vignette {
          background:
            linear-gradient(180deg, rgba(255,90,0,0.025), transparent 30%),
            radial-gradient(circle at 70% 0%, rgba(255,90,0,0.035), transparent 30%);
        }
        .barberos-dashboard .numeric-value,
        .barberos-dashboard .data-number {
          font-family: var(--font-barberos-display), sans-serif;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.045em;
        }
        .barberos-dashboard .data-emphasis {
          font-variant-numeric: tabular-nums;
        }
        @media (prefers-reduced-motion: reduce) {
          .barberos-dashboard *,
          .barberos-dashboard *::before,
          .barberos-dashboard *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 dashboard-grid-bg opacity-20" />
        <div className="pointer-events-none absolute inset-0 dashboard-fade" />
        <div className="pointer-events-none absolute inset-0 dashboard-noise" />
        <div className="orange-orb pointer-events-none absolute -right-20 top-10" />

        <div className="relative mx-auto max-w-[1680px] px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
          <header className="mb-7 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="eyebrow text-white/72">BarberOS</span>
                <span className="text-white/10">/</span>
                <span className="eyebrow text-[#ff6a18]">Inteligencia operativa</span>
                <span className="hero-title-accent hidden sm:inline-block" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="display-title text-[34px] text-white sm:text-[42px]">
                  Dashboard
                </h1>
                <span className="inline-flex items-center gap-2 border-l border-white/10 pl-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/74">
                  <span className="status-led h-1.5 w-1.5 rounded-full bg-emerald-400 text-emerald-400" />
                  En línea
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="text-[12px] capitalize text-white/72">{dateLabel}</p>
                <span className="hidden h-1 w-1 rounded-full bg-white/15 sm:block" />
                <p className="text-[11px] text-white/72">Operación, clientes e ingresos en una sola vista.</p>
              </div>
            </div>

            <div className="flex flex-col items-stretch gap-2.5 sm:items-end">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="period-nav flex items-center rounded-[14px] p-1">
                  <button
                    type="button"
                    aria-label="Período anterior"
                    onClick={() => setPeriodOffset((value) => value - 1)}
                    className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg text-white/72 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <div className="period-control glass-control flex rounded-[11px] p-1">
                    {(["DAY", "WEEK", "MONTH", "YEAR"] as RangeKey[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        data-active={range === item}
                        onClick={() => { setRange(item); setPeriodOffset(0); }}
                        className="focus-ring rounded-lg px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/62 transition hover:text-white"
                      >
                        {item === "DAY" ? "Día" : item === "WEEK" ? "Semana" : item === "MONTH" ? "Mes" : "Año"}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    aria-label="Período siguiente"
                    onClick={() => setPeriodOffset((value) => value + 1)}
                    className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg text-white/72 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
                {periodOffset !== 0 ? (
                  <button
                    type="button"
                    onClick={() => setPeriodOffset(0)}
                    className="focus-ring rounded-[12px] border border-white/[0.08] px-3 py-2.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/65 transition hover:border-white/15 hover:text-white"
                  >
                    Hoy
                  </button>
                ) : null}
                <Link
                  href="/admin/turnos"
                  className="primary-action focus-ring group inline-flex items-center gap-2 rounded-[13px] px-4 py-2.5 text-[11px] font-semibold text-white transition"
                >
                  <CalendarDays size={15} strokeWidth={2} />
                  Nuevo turno
                  <ArrowUpRight size={13} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
              </div>
              <p className="text-right text-[10px] font-medium text-white/72">
                {periodShortLabel(anchorDate, range)} · {periodOffset === 0 ? "Período actual" : periodOffset < 0 ? "Histórico" : "Proyección"}
              </p>
            </div>
          </header>

          <section className="system-strip mb-5 grid overflow-hidden rounded-[16px] sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.055] px-4 py-3 sm:border-r xl:border-b-0">
              <div className="flex items-center gap-2.5">
                <span className={`status-led h-1.5 w-1.5 rounded-full ${error ? "bg-red-400 text-red-400" : "bg-emerald-400 text-emerald-400"}`} />
                <span className="text-[10px] font-medium text-white/79">Sincronización</span>
              </div>
              <span className="data-emphasis text-[10px] text-white/74">{error ? "ERROR" : loading ? "SINCRONIZANDO" : "EN LÍNEA"}</span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-white/[0.055] px-4 py-3 sm:border-b-0 xl:border-r">
              <span className="text-[10px] font-medium text-white/72">Operación hoy</span>
              <span className="data-emphasis text-[10px] text-white/79">{activeTodayAppointments.length} TURNOS</span>
            </div>

            <div className="flex items-center justify-between gap-4 border-b border-white/[0.055] px-4 py-3 sm:border-r sm:border-b-0">
              <span className="text-[10px] font-medium text-white/72">Clientes · {range === "DAY" ? "día" : range === "WEEK" ? "semana" : range === "MONTH" ? "mes" : "año"}</span>
              <span className="data-emphasis text-[10px] text-white/79">{uniquePeriodClients} ÚNICOS</span>
            </div>

            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="text-[10px] font-medium text-white/72">Ingresos · {range === "DAY" ? "día" : range === "WEEK" ? "semana" : range === "MONTH" ? "mes" : "año"}</span>
              <span className="data-emphasis text-[10px] text-[#ff7a26]">{formatCurrency(periodIngresos)}</span>
            </div>
          </section>

          {error ? (
            <div className="mb-6 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-xs text-red-300">
              <span>{error}</span>
              <button type="button" onClick={() => window.location.reload()} className="text-red-200 underline underline-offset-4">
                Reintentar
              </button>
            </div>
          ) : null}

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="metric-card panel-surface rounded-[20px] border bg-white/[0.018] p-5" style={{ borderColor: BORDER }}>
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-orange-500/15 bg-orange-500/[0.07]">
                  <DollarSign size={17} className="text-[#ff5a00]" strokeWidth={1.8} />
                </div>
                <div className="flex items-center gap-2"><span className="metric-index">01</span><span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/70">{range === "DAY" ? "Día" : range === "WEEK" ? "Semana" : range === "MONTH" ? "Mes" : "Año"}</span></div>
              </div>
              <div className="mt-7 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[27px] font-semibold tracking-[-0.035em] text-white numeric-value">
                    {loading ? "—" : <AnimatedNumber value={periodIngresos} prefix="$" />}
                  </p>
                  <p className="mt-1 text-xs text-white/70">Ingresos completados</p>
                </div>
                <div className="hidden sm:block">
                  <Sparkline values={revenueSeries.map((item) => item.value)} />
                </div>
              </div>
            </div>

            <div className="metric-card panel-surface rounded-[20px] border bg-white/[0.018] p-5" style={{ borderColor: BORDER }}>
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035]">
                  <CalendarDays size={17} className="text-white/81" strokeWidth={1.7} />
                </div>
                <div className="flex items-center gap-2"><span className="metric-index">02</span><span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/70">Hoy</span></div>
              </div>
              <p className="mt-7 text-[27px] font-semibold tracking-[-0.035em] text-white numeric-value">
                {loading ? "—" : <AnimatedNumber value={activeTodayAppointments.length} />}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-xs text-white/70">Turnos activos</p>
                {pendingToday > 0 ? <span className="text-[9px] text-amber-300">{pendingToday} pendientes</span> : null}
              </div>
            </div>

            <div className="metric-card panel-surface rounded-[20px] border bg-white/[0.018] p-5" style={{ borderColor: BORDER }}>
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035]">
                  <Users size={17} className="text-white/81" strokeWidth={1.7} />
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/70">{range === "DAY" ? "Día" : range === "WEEK" ? "Semana" : range === "MONTH" ? "Mes" : "Año"}</span>
              </div>
              <p className="mt-7 text-[27px] font-semibold tracking-[-0.035em] text-white numeric-value">
                {loading ? "—" : <AnimatedNumber value={uniquePeriodClients} />}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-xs text-white/70">Clientes únicos</p>
                <span className="text-[9px] text-[#ff6a18]">{recurringClients} recurrentes</span>
              </div>
            </div>

            <div className="metric-card panel-surface rounded-[20px] border bg-white/[0.018] p-5" style={{ borderColor: BORDER }}>
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035]">
                  <TrendingUp size={17} className="text-white/81" strokeWidth={1.7} />
                </div>
                <div className="flex items-center gap-2"><span className="metric-index">04</span><span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/70">Ticket</span></div>
              </div>
              <p className="mt-7 text-[27px] font-semibold tracking-[-0.035em] text-white numeric-value">
                {loading ? "—" : <AnimatedNumber value={averageTicket} prefix="$" />}
              </p>
              <p className="mt-1 text-xs text-white/70">Ticket promedio</p>
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(340px,0.8fr)]">
            <Panel>
              <div className="flex flex-col gap-4 border-b border-white/[0.06] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <SectionHeader
                  eyebrow="Rendimiento del negocio"
                  title="Evolución de ingresos"
                  description={`Ingresos completados · ${periodTitle(anchorDate, range)}`}
                />
                <div className="flex items-center gap-4 text-[10px] text-white/70">
                  <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-[#ff5a00]" />Ingresos</span>
                  <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-white/20" />Actividad</span>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                <div className="mb-4 flex items-end justify-between">
                  <div>
                    <p className="text-[24px] font-semibold tracking-[-0.03em] text-white numeric-value">{formatCurrency(periodIngresos)}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="meta-label text-white/72">Ingresos actuales</p>
                      <span className={`text-[9px] font-semibold ${periodDelta >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                        {periodDelta >= 0 ? "+" : ""}{Math.round(periodDelta)}% vs anterior
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-2 py-1 text-[9px] font-semibold text-white/72">
                    {range === "YEAR" ? "12 meses" : range === "MONTH" ? "5 semanas" : range === "WEEK" ? "7 días" : "24 horas"}
                  </span>
                </div>
                <IngresosChart values={revenueSeries.map((item) => item.value)} labels={revenueSeries.map((item) => item.label)} />
              </div>
            </Panel>

            <Panel>
              <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
                <SectionHeader eyebrow="Ahora" title="Próximo turno" description="La próxima atención de la agenda" />
              </div>
              <div className="p-5 sm:p-6">
                {nextAppointment ? (
                  <div>
                    <div className="relative flex items-center justify-between overflow-hidden rounded-[16px] border border-orange-500/18 bg-gradient-to-br from-orange-500/[0.09] via-orange-500/[0.035] to-transparent p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <div className="pointer-events-none absolute right-[-30px] top-[-50px] h-32 w-32 rounded-full bg-orange-500/[0.08] blur-3xl" />
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#ff5a00] text-black">
                          <Clock3 size={19} strokeWidth={2} />
                        </div>
                        <div>
                          <p className="text-[22px] font-semibold tracking-[-0.03em] text-white numeric-value">{formatTime(nextAppointment.start_at)}</p>
                          <p className="text-[10px] uppercase tracking-[0.15em] text-white/72">Siguiente</p>
                        </div>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider ${getStatusClass(nextAppointment.status)}`}>
                        {getStatusLabel(nextAppointment.status)}
                      </span>
                    </div>

                    <div className="mt-5">
                      <p className="text-lg font-medium text-white">{nextAppointment.customer?.full_name ?? "Cliente"}</p>
                      <p className="mt-1 text-xs text-white/70">{nextAppointment.customer?.phone ?? "Sin teléfono"}</p>
                    </div>

                    <div className="mt-5 space-y-2 border-t border-white/[0.06] pt-5">
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-white/72">Servicio</span>
                        <span className="truncate text-white/81">{nextAppointment.service?.name ?? "Sin servicio"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-white/72">Valor</span>
                        <span className="font-medium text-[#ff6a18]">{formatCurrency(Number(nextAppointment.service?.price ?? 0))}</span>
                      </div>
                    </div>

                    <Link href="/admin/turnos" className="mt-6 flex w-full items-center justify-center gap-2 rounded-[14px] border border-white/[0.08] bg-white/[0.025] py-2.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-white/72 transition hover:border-orange-500/20 hover:text-white">
                      Abrir agenda
                      <ChevronRight size={13} />
                    </Link>
                  </div>
                ) : (
                  <div className="flex min-h-[310px] flex-col items-center justify-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.035]"><Clock3 size={21} className="text-white/70" /></div>
                    <p className="mt-4 text-sm text-white/81">No hay próximos turnos.</p>
                    <Link href="/admin/turnos" className="mt-4 text-xs text-[#ff6a18]">Ir a la agenda</Link>
                  </div>
                )}
              </div>
            </Panel>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-12">
            <Panel className="lg:col-span-7">
              <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
                <SectionHeader eyebrow="Operación" title="Agenda de hoy" description={`${activeTodayAppointments.length} turnos activos · ${completedToday} completados · ${cancelledToday} cancelados`} action={<Link href="/admin/turnos" className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#ff6a18]">Ver agenda <ChevronRight size={13} /></Link>} />
              </div>
              <div>
                {loading ? (
                  <div className="px-6 py-14 text-center text-xs text-white/70">Cargando operación...</div>
                ) : activeTodayAppointments.length === 0 ? (
                  <div className="px-6 py-14 text-center">
                    <CalendarDays size={25} className="mx-auto text-white/15" />
                    <p className="mt-4 text-sm text-white/70">No hay turnos activos para hoy.</p>
                  </div>
                ) : (
                  activeTodayAppointments.slice(0, 7).map((appointment, index) => (
                    <div key={appointment.id} className={`interactive-row grid grid-cols-[62px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 sm:grid-cols-[72px_minmax(0,1fr)_110px] sm:px-6 ${index < Math.min(activeTodayAppointments.length, 7) - 1 ? "border-b border-white/[0.045]" : ""}`}>
                      <div>
                        <p className="text-sm font-semibold text-white/85">{formatTime(appointment.start_at)}</p>
                        <p className="mt-1 text-[9px] uppercase tracking-wider text-white/70">{index === 0 ? "Ahora" : "Turno"}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white/90">{appointment.customer?.full_name ?? "Cliente sin nombre"}</p>
                        <div className="mt-1 flex min-w-0 items-center gap-2 text-[10px] text-white/72">
                          <Scissors size={11} />
                          <span className="truncate">{appointment.service?.name ?? "Servicio"}</span>
                          <span>·</span>
                          <span>{formatCurrency(Number(appointment.service?.price ?? 0))}</span>
                        </div>
                      </div>
                      <span className={`hidden justify-self-end rounded-full border px-2.5 py-1 text-[9px] font-semibold sm:inline-flex ${getStatusClass(appointment.status)}`}>
                        {getStatusLabel(appointment.status)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              {activeTodayAppointments.length > 7 ? <div className="border-t border-white/[0.06] px-6 py-3 text-center text-[10px] text-white/70">+ {activeTodayAppointments.length - 7} turnos más en la agenda</div> : null}
            </Panel>

            <Panel className="lg:col-span-5">
              <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
                <SectionHeader eyebrow="Pulso operativo" title="Estado de la operación" description="Distribución del período seleccionado" />
              </div>
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
                <Donut completed={statusCounts.completed} cancelled={statusCounts.cancelled} pending={statusCounts.pending} />
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs text-white/81"><span className="h-2 w-2 rounded-full bg-[#ff5a00]" />Completados</span><span className="text-sm font-medium text-white/85">{statusCounts.completed}</span></div>
                  <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs text-white/81"><span className="h-2 w-2 rounded-full bg-[#666]" />Cancelados</span><span className="text-sm font-medium text-white/85">{statusCounts.cancelled}</span></div>
                  <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs text-white/81"><span className="h-2 w-2 rounded-full bg-[#333]" />Pendientes</span><span className="text-sm font-medium text-white/85">{statusCounts.pending}</span></div>
                  <div className="border-t border-white/[0.06] pt-4"><p className="text-[9px] uppercase tracking-[0.16em] text-white/70">Conversión</p><p className="mt-1 text-xl font-semibold text-white numeric-value">{statusCounts.completed + statusCounts.cancelled + statusCounts.pending ? Math.round((statusCounts.completed / (statusCounts.completed + statusCounts.cancelled + statusCounts.pending)) * 100) : 0}%</p></div>
                </div>
              </div>
            </Panel>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-12">
            <Panel className="lg:col-span-5">
              <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
                <SectionHeader eyebrow="Rendimiento del catálogo" title="Servicios más solicitados" description="Volumen y facturación del período" action={<Link href="/admin/servicios" className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#ff6a18]">Gestionar</Link>} />
              </div>
              <div className="p-5 sm:p-6">
                {serviceStats.length === 0 ? <p className="py-8 text-center text-xs text-white/70">Todavía no hay servicios registrados.</p> : <div className="space-y-5">
                  {serviceStats.slice(0, 5).map((service, index) => {
                    const percentage = serviceStats[0]?.count ? Math.round((service.count / serviceStats[0].count) * 100) : 0;
                    return <div key={service.name}>
                      <div className="mb-2 flex items-center gap-3">
                        <span className="w-5 text-[10px] font-semibold text-white/70">0{index + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-xs font-medium text-white/77">{service.name}</span>
                        <span className="text-[10px] text-white/72">{service.count}</span>
                        <span className="text-[10px] font-medium text-[#ff6a18]">{formatCurrency(service.revenue)}</span>
                      </div>
                      <div className="ml-8 h-1 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-[#ff5a00] transition-all duration-700" style={{ width: `${percentage}%` }} /></div>
                    </div>;
                  })}
                </div>}
              </div>
            </Panel>

            <Panel className="lg:col-span-4">
              <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
                <SectionHeader eyebrow="Salud de clientes" title="Señales del CRM" description="Oportunidades detectadas en la base" />
              </div>
              <div className="divide-y divide-white/[0.045]">
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.15em] text-white/70">Recurrentes</p><p className="mt-2 text-2xl font-semibold text-white numeric-value">{recurringClients}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/[0.06] text-emerald-300"><Check size={17} /></div></div>
                  <p className="mt-2 text-[10px] text-white/72">Clientes con más de una visita en el período.</p>
                </div>
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.15em] text-white/70">Oportunidades</p><p className="mt-2 text-2xl font-semibold text-white numeric-value">{atRiskCustomers.length}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/[0.07] text-[#ff6a18]"><TrendingUp size={17} /></div></div>
                  <p className="mt-2 text-[10px] text-white/72">Clientes sin visita reciente que pueden reactivarse.</p>
                </div>
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.15em] text-white/70">Nuevos / únicos</p><p className="mt-2 text-2xl font-semibold text-white numeric-value">{newOrSingleVisitClients}</p></div><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-white/55"><Users size={17} /></div></div>
                  <p className="mt-2 text-[10px] text-white/72">Clientes con una sola visita durante el período.</p>
                </div>
              </div>
            </Panel>

            <Panel className="lg:col-span-3">
              <div className="border-b border-white/[0.06] px-5 py-5">
                <SectionHeader eyebrow="Resumen del negocio" title="Indicadores clave" />
              </div>
              <div className="space-y-5 p-5">
                <div><p className="text-[9px] uppercase tracking-[0.16em] text-white/70">Servicio líder</p><p className="mt-1 truncate text-sm font-medium text-white/81">{topService?.name ?? "—"}</p><p className="mt-1 text-[10px] text-[#ff6a18]">{topService ? `${topService.count} reservas` : "Sin datos"}</p></div>
                <div className="border-t border-white/[0.06] pt-5"><p className="text-[9px] uppercase tracking-[0.16em] text-white/70">Cliente de mayor valor</p><p className="mt-1 truncate text-sm font-medium text-white/81">{topCustomer?.name ?? "—"}</p><p className="mt-1 text-[10px] text-[#ff6a18]">{topCustomer ? formatCurrency(topCustomer.revenue) : "Sin datos"}</p></div>
                <div className="border-t border-white/[0.06] pt-5"><p className="text-[9px] uppercase tracking-[0.16em] text-white/70">Día más activo</p><p className="mt-1 text-sm font-medium capitalize text-white/81">{busiestDay?.label ?? "—"}</p><p className="mt-1 text-[10px] text-[#ff6a18]">{busiestDay ? `${busiestDay.count} turnos` : "Sin datos"}</p></div>
              </div>
            </Panel>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
            <Panel>
              <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
                <SectionHeader eyebrow="Próximos" title="Próximos turnos" description="La agenda inmediata del negocio" action={<Link href="/admin/turnos" className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#ff6a18]">Ver todo <ChevronRight size={13} /></Link>} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <thead><tr className="border-b border-white/[0.045] text-[9px] uppercase tracking-[0.15em] text-white/70"><th className="px-5 py-3 font-semibold sm:px-6">Fecha</th><th className="px-5 py-3 font-semibold">Cliente</th><th className="px-5 py-3 font-semibold">Servicio</th><th className="px-5 py-3 text-right font-semibold sm:px-6">Estado</th></tr></thead>
                  <tbody>{upcomingAppointments.map((appointment) => <tr key={appointment.id} className="interactive-row border-b border-white/[0.04] last:border-0"><td className="px-5 py-4 sm:px-6"><p className="text-xs font-medium text-white/77">{shortDate(appointment.start_at)}</p><p className="mt-1 text-[10px] text-[#ff6a18]">{formatTime(appointment.start_at)}</p></td><td className="px-5 py-4"><p className="max-w-[190px] truncate text-xs font-medium text-white/81">{appointment.customer?.full_name ?? "Cliente"}</p><p className="mt-1 text-[10px] text-white/70">{appointment.customer?.phone ?? "Sin teléfono"}</p></td><td className="px-5 py-4"><p className="max-w-[180px] truncate text-xs text-white/81">{appointment.service?.name ?? "Servicio"}</p></td><td className="px-5 py-4 text-right sm:px-6"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-semibold ${getStatusClass(appointment.status)}`}>{getStatusLabel(appointment.status)}</span></td></tr>)}</tbody>
                </table>
                {upcomingAppointments.length === 0 ? <div className="px-6 py-12 text-center text-xs text-white/70">No hay próximos turnos.</div> : null}
              </div>
            </Panel>

            <Panel>
              <div className="border-b border-white/[0.06] px-5 py-5">
                <SectionHeader
                  eyebrow="Comparación mensual"
                  title="Comparación mensual"
                  description="Ingresos de los últimos 6 meses"
                />
              </div>
              <div className="p-5">
                <MonthlyComparisonChart values={monthlyComparison.values} labels={monthlyComparison.labels} />
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-[14px] border border-white/[0.055] bg-white/[0.02] p-3">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-white/72">Período</p>
                    <p className="mt-1 truncate text-sm font-semibold text-white">{formatCurrency(periodIngresos)}</p>
                  </div>
                  <div className="rounded-[14px] border border-white/[0.055] bg-white/[0.02] p-3">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-white/72">Anterior</p>
                    <p className="mt-1 truncate text-sm font-semibold text-white/82">{formatCurrency(previousPeriodIngresos)}</p>
                  </div>
                </div>
              </div>
            </Panel>
          </section>

          <section className="mt-5 grid gap-5 lg:grid-cols-2">
            <Panel>
              <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
                <SectionHeader eyebrow="Retención" title="Clientes a reactivar" description="Señales de inactividad para acciones comerciales" action={<Link href="/admin/clientes" className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#ff6a18]">Abrir CRM</Link>} />
              </div>
              <div className="divide-y divide-white/[0.045]">
                {atRiskCustomers.length === 0 ? <div className="px-6 py-10 text-center text-xs text-white/70">No detectamos clientes en riesgo con los datos actuales.</div> : atRiskCustomers.map((client) => <div key={client.phone || client.name} className="interactive-row flex items-center justify-between gap-4 px-5 py-4 sm:px-6"><div className="min-w-0"><p className="truncate text-xs font-medium text-white/81">{client.name}</p><p className="mt-1 text-[10px] text-white/70">Última visita · {shortDate(client.lastVisit)}</p></div><span className="rounded-full border border-orange-500/15 bg-orange-500/[0.05] px-2.5 py-1 text-[9px] font-semibold text-[#ff6a18]">Reactivar</span></div>) }
              </div>
            </Panel>

            <Panel>
              <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
                <SectionHeader eyebrow="Valor de clientes" title="Clientes de mayor valor" description={`Ranking por facturación · ${range === "DAY" ? "día" : range === "WEEK" ? "semana" : range === "MONTH" ? "mes" : "año"}`} action={<Link href="/admin/clientes" className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#ff6a18]">Cliente 360</Link>} />
              </div>
              <div className="divide-y divide-white/[0.045]">
                {customerRows.slice(0, 4).map((client, index) => <div key={client.phone || client.name} className="interactive-row grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 sm:px-6"><span className="text-[10px] font-semibold text-white/70">0{index + 1}</span><div className="min-w-0"><p className="truncate text-xs font-medium text-white/81">{client.name}</p><p className="mt-1 text-[10px] text-white/70">{client.visits} visitas · {shortDate(client.lastVisit)}</p></div><p className="text-xs font-semibold text-[#ff6a18]">{formatCurrency(client.revenue)}</p></div>)}
                {customerRows.length === 0 ? <div className="px-6 py-10 text-center text-xs text-white/70">Sin datos de clientes.</div> : null}
              </div>
            </Panel>
          </section>

          <div className="mb-3 flex items-center gap-3 px-1">
            <span className="eyebrow text-white/42">Accesos rápidos</span>
            <span className="h-px w-8 bg-gradient-to-r from-orange-500/50 to-transparent" />
            <span className="text-[9px] text-white/24">Acciones directas</span>
          </div>
          <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/admin/turnos" className="metric-card group panel-surface rounded-[20px] border bg-white/[0.018] p-5" style={{ borderColor: BORDER }}>
              <CalendarDays size={18} className="text-[#ff5a00]" />
              <p className="mt-4 text-xs font-semibold text-white/77">Gestionar agenda</p>
              <p className="mt-1 text-[10px] text-white/70">Turnos, estados y operación diaria.</p>
              <div className="mt-4 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-white/70 group-hover:text-[#ff6a18]">Abrir <ArrowUpRight size={11} /></div>
            </Link>
            <Link href="/admin/clientes" className="metric-card group panel-surface rounded-[20px] border bg-white/[0.018] p-5" style={{ borderColor: BORDER }}>
              <Users size={18} className="text-[#ff5a00]" />
              <p className="mt-4 text-xs font-semibold text-white/77">Cliente 360</p>
              <p className="mt-1 text-[10px] text-white/70">Clientes, historial y oportunidades CRM.</p>
              <div className="mt-4 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-white/70 group-hover:text-[#ff6a18]">Abrir <ArrowUpRight size={11} /></div>
            </Link>
            <Link href="/admin/servicios" className="metric-card group panel-surface rounded-[20px] border bg-white/[0.018] p-5" style={{ borderColor: BORDER }}>
              <Scissors size={18} className="text-[#ff5a00]" />
              <p className="mt-4 text-xs font-semibold text-white/77">Servicios</p>
              <p className="mt-1 text-[10px] text-white/70">Catálogo, precios y performance.</p>
              <div className="mt-4 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-white/70 group-hover:text-[#ff6a18]">Abrir <ArrowUpRight size={11} /></div>
            </Link>
            <Link href="/admin/analytics" className="metric-card group panel-surface rounded-[20px] border bg-white/[0.018] p-5" style={{ borderColor: BORDER }}>
              <TrendingUp size={18} className="text-[#ff5a00]" />
              <p className="mt-4 text-xs font-semibold text-white/77">Analytics</p>
              <p className="mt-1 text-[10px] text-white/70">Inteligencia de negocio y tendencias.</p>
              <div className="mt-4 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.13em] text-white/70 group-hover:text-[#ff6a18]">Abrir <ArrowUpRight size={11} /></div>
            </Link>
          </section>

          <footer className="flex flex-col gap-2 border-t border-white/[0.05] py-7 text-[9px] uppercase tracking-[0.16em] text-white/15 sm:flex-row sm:items-center sm:justify-between">
            <span>barberOS · sistema operativo para barberías</span>
            <span>{formatCurrency(todayIngresos)} · {activeTodayAppointments.length} turnos · {uniqueTodayClients} clientes hoy</span>
          </footer>
        </div>
      </div>
    </main>
  );
}
