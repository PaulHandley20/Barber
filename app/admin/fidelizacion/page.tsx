 "use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Gift,
  History,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DM_Mono, Manrope, Sora } from "next/font/google";

const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-barberos-ui" });
const spaceGrotesk = Sora({ subsets: ["latin"], display: "swap", variable: "--font-barberos-display" });
const dmMono = DM_Mono({ subsets: ["latin"], display: "swap", weight: ["400", "500"], variable: "--font-barberos-data" });


type Customer = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  created_at: string;
};

type Appointment = {
  id: string;
  customer_id: string;
  status: string;
  start_at: string;
  service:
    | { name: string; price: number }
    | { name: string; price: number }[]
    | null;
};

type LoyaltyProgram = {
  id: string;
  name: string;
  description: string | null;
  visits_required: number;
  reward: string;
  active: boolean;
};

type LoyaltyAccount = {
  id: string;
  customer_id: string;
  loyalty_program_id: string;
  visits: number;
  rewards_earned: number;
  rewards_redeemed: number;
};

type LoyaltyCustomer = {
  customer: Customer;
  account: LoyaltyAccount | null;
  program: LoyaltyProgram;
  visits: number;
  rewardsAvailable: number;
  progress: number;
  currentCycleVisits: number;
  remaining: number;
};

type Filter = "todos" | "progreso" | "recompensa" | "cerca";

export default function FidelizacionPage() {
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [programOpen, setProgramOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function loadData(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);

    const [c, a, p, ac] = await Promise.all([
      supabase
        .from("customers")
        .select("id, full_name, phone, email, created_at")
        .order("full_name", { ascending: true }),
      supabase
        .from("appointments")
        .select(`
          id,
          customer_id,
          status,
          start_at,
          service:services(name,price)
        `)
        .order("start_at", { ascending: false }),
      supabase
        .from("loyalty_programs")
        .select("id,name,description,visits_required,reward,active")
        .eq("active", true)
        .order("created_at", { ascending: true }),
      supabase
        .from("loyalty_accounts")
        .select("id,customer_id,loyalty_program_id,visits,rewards_earned,rewards_redeemed"),
    ]);

    if (c.error || a.error || p.error || ac.error) {
      console.error("Fidelización load error", c.error, a.error, p.error, ac.error);
      setToast("No se pudieron cargar todos los datos.");
    }

    setCustomers(c.data || []);
    setAppointments(a.data || []);
    setPrograms(p.data || []);
    setAccounts(ac.data || []);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeProgram = programs[0] || null;

  const loyaltyCustomers = useMemo<LoyaltyCustomer[]>(() => {
    if (!activeProgram) return [];

    return customers.map((customer) => {
      const account =
        accounts.find(
          (x) =>
            x.customer_id === customer.id &&
            x.loyalty_program_id === activeProgram.id
        ) || null;

      const visits = appointments.filter(
        (x) => x.customer_id === customer.id && x.status === "completed"
      ).length;

      const earnedByVisits = Math.floor(
        visits / Math.max(activeProgram.visits_required, 1)
      );
      const earned = account?.rewards_earned ?? earnedByVisits;
      const redeemed = account?.rewards_redeemed ?? 0;
      const rewardsAvailable = Math.max(0, earned - redeemed);
      const currentCycleVisits =
        visits % Math.max(activeProgram.visits_required, 1);
      const progress = Math.round(
        (currentCycleVisits / Math.max(activeProgram.visits_required, 1)) * 100
      );
      const remaining =
        currentCycleVisits === 0 && visits > 0
          ? activeProgram.visits_required
          : Math.max(activeProgram.visits_required - currentCycleVisits, 0);

      return {
        customer,
        account,
        program: activeProgram,
        visits,
        rewardsAvailable,
        progress,
        currentCycleVisits,
        remaining,
      };
    });
  }, [customers, appointments, accounts, activeProgram]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return loyaltyCustomers.filter((item) => {
      const matchesSearch =
        !q ||
        item.customer.full_name.toLowerCase().includes(q) ||
        item.customer.phone.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filter === "progreso") {
        return item.visits > 0 && item.rewardsAvailable === 0;
      }

      if (filter === "recompensa") {
        return item.rewardsAvailable > 0;
      }

      if (filter === "cerca") {
        return (
          item.rewardsAvailable === 0 &&
          item.remaining > 0 &&
          item.remaining <= 2
        );
      }

      return true;
    });
  }, [loyaltyCustomers, search, filter]);

  const stats = useMemo(() => {
    const customersInProgram = loyaltyCustomers.filter((x) => x.visits > 0).length;
    const totalVisits = loyaltyCustomers.reduce((s, x) => s + x.visits, 0);
    const rewards = loyaltyCustomers.reduce((s, x) => s + x.rewardsAvailable, 0);
    const closeToReward = loyaltyCustomers.filter(
      (x) => x.rewardsAvailable === 0 && x.remaining > 0 && x.remaining <= 2
    ).length;
    const redeemed = loyaltyCustomers.reduce(
      (s, x) => s + (x.account?.rewards_redeemed || 0),
      0
    );
    const penetration =
      loyaltyCustomers.length > 0
        ? Math.round((customersInProgram / loyaltyCustomers.length) * 100)
        : 0;

    return {
      customers: loyaltyCustomers.length,
      customersInProgram,
      totalVisits,
      rewards,
      closeToReward,
      redeemed,
      penetration,
    };
  }, [loyaltyCustomers]);

  const selected = loyaltyCustomers.find((x) => x.customer.id === selectedId);

  const serviceMix = useMemo(() => {
    const map = new Map<string, number>();
    appointments
      .filter((x) => x.status === "completed")
      .forEach((x) => {
        const service = Array.isArray(x.service) ? x.service[0] : x.service;
        if (!service) return;
        map.set(service.name, (map.get(service.name) || 0) + 1);
      });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [appointments]);

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));

  const initials = (name: string) =>
    name
      .split(" ")
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070707] px-5 py-6 sm:px-7 lg:px-9 lg:py-8 text-[#f5f5f4]">
        <div className="flex min-h-[75vh] items-center justify-center">
          <div className="w-[320px] space-y-3">
            <div className="h-2 w-20 animate-pulse rounded bg-[#ff5a00]/50" />
            <div className="h-7 w-64 animate-pulse rounded bg-[#171717]" />
            <div className="h-4 w-80 animate-pulse rounded bg-[#111]" />
            <div className="mt-8 h-28 rounded-[16px] border border-white/[0.06] bg-[#101010]" />
          </div>
        </div>
      </div>
    );
  }

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
      <div className="mx-auto max-w-[1680px]">
        <header className="mb-7 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6a18]">
              <Award size={14} />
              Fidelización
            </div>
            <h1 className="display-title text-[34px] text-white sm:text-[42px]">
              Fidelización
            </h1>
            <p className="mt-2 max-w-2xl text-[11px] leading-6 text-white/72">
              Convertí visitas en recurrencia. Controlá el progreso, detectá
              oportunidades y medí el impacto del programa de beneficios.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData(true)}
              className="rounded-xl border border-white/[0.08] bg-[#101010] px-4 py-2.5 text-xs font-medium text-[#c9c9c9] transition hover:border-white/[0.14] hover:bg-[#151515]"
            >
              {refreshing ? "Actualizando..." : "Actualizar"}
            </button>
            <button
              onClick={() => setProgramOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-[#ff5a00] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_0_24px_rgba(255,90,0,0.14)] transition hover:bg-[#ff6815]"
            >
              <Settings2 size={15} />
              Configurar programa
            </button>
          </div>
        </header>

        {!activeProgram ? (
          <EmptyProgram onConfigure={() => setProgramOpen(true)} />
        ) : (
          <>
            <section className="mb-5 grid grid-cols-6 gap-3">
              <MetricCard icon={<Users size={16} />} label="Clientes" value={stats.customers} detail="base total" />
              <MetricCard icon={<TrendingUp size={16} />} label="Activos" value={stats.customersInProgram} detail={`${stats.penetration}% de penetración`} />
              <MetricCard icon={<CheckCircle2 size={16} />} label="Visitas" value={stats.totalVisits} detail="completadas" />
              <MetricCard icon={<Gift size={16} />} label="Disponibles" value={stats.rewards} detail="beneficios" accent />
              <MetricCard icon={<Target size={16} />} label="Oportunidades" value={stats.closeToReward} detail="a ≤ 2 visitas" />
              <MetricCard icon={<History size={16} />} label="Canjeadas" value={stats.redeemed} detail="históricas" />
            </section>

            <section className="mb-5 grid grid-cols-[1.45fr_0.8fr] gap-4">
              <div className="overflow-hidden rounded-[16px] border border-white/[0.07] bg-[#0d0d0d]">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#666]">
                      Programa activo
                    </p>
                    <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">
                      {activeProgram.name}
                    </h2>
                  </div>
                  <span className="rounded-full border border-[#ff5a00]/25 bg-[#ff5a00]/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ff7a36]">
                    Activo
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-6 p-6">
                  <InfoBlock label="Objetivo">
                    <strong className="font-[var(--font-barberos-display)] text-3xl tracking-[-0.04em]">
                      {activeProgram.visits_required}
                    </strong>
                    <span className="mt-1 block text-xs text-[#666]">
                      visitas
                    </span>
                  </InfoBlock>
                  <InfoBlock label="Recompensa">
                    <strong className="text-sm leading-6 text-[#dedede]">
                      {activeProgram.reward}
                    </strong>
                    <span className="mt-1 block text-xs text-[#666]">
                      al completar el ciclo
                    </span>
                  </InfoBlock>
                  <InfoBlock label="Descripción">
                    <p className="text-sm leading-6 text-[#8c8c8c]">
                      {activeProgram.description || "Programa de fidelización activo."}
                    </p>
                  </InfoBlock>
                </div>
              </div>

              <div className="rounded-[16px] border border-white/[0.07] bg-[#0d0d0d] p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#666]">
                      Radar de crecimiento
                    </p>
                    <h3 className="mt-2 text-base font-semibold">
                      Clientes cerca del beneficio
                    </h3>
                  </div>
                  <Sparkles size={17} className="text-[#ff5a00]" />
                </div>
                <div className="mt-6 flex items-end gap-3">
                  <span className="text-5xl font-semibold tracking-[-0.06em]">
                    {stats.closeToReward}
                  </span>
                  <span className="pb-1 text-xs leading-5 text-[#777]">
                    clientes a<br />máximo 2 visitas
                  </span>
                </div>
                <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-[#1d1d1d]">
                  <div
                    className="h-full rounded-full bg-[#ff5a00]"
                    style={{
                      width: `${Math.min(
                        100,
                        stats.customers
                          ? (stats.closeToReward / stats.customers) * 100
                          : 0
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-3 text-xs leading-5 text-[#666]">
                  Ideal para campañas de retorno y comunicación personalizada.
                </p>
              </div>
            </section>

            <section className="mb-5 grid grid-cols-[1fr_330px] gap-4">
              <div className="overflow-hidden rounded-[16px] border border-white/[0.07] bg-[#0d0d0d]">
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-4">
                  <div className="relative w-[360px] max-w-full">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]"
                    />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar cliente por nombre o teléfono..."
                      className="h-10 w-full rounded-xl border border-white/[0.07] bg-[#111] pl-9 pr-3 text-xs text-[#eee] outline-none transition placeholder:text-[#555] focus:border-[#ff5a00]/40"
                    />
                  </div>

                  <div className="flex rounded-xl border border-white/[0.06] bg-[#111] p-1">
                    <FilterButton active={filter === "todos"} onClick={() => setFilter("todos")}>Todos</FilterButton>
                    <FilterButton active={filter === "progreso"} onClick={() => setFilter("progreso")}>En progreso</FilterButton>
                    <FilterButton active={filter === "cerca"} onClick={() => setFilter("cerca")}>Cerca</FilterButton>
                    <FilterButton active={filter === "recompensa"} onClick={() => setFilter("recompensa")}>Recompensa</FilterButton>
                  </div>
                </div>

                <div className="grid grid-cols-[1.5fr_0.7fr_1.25fr_0.8fr_24px] border-b border-white/[0.05] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#555]">
                  <span>Cliente</span>
                  <span>Visitas</span>
                  <span>Progreso</span>
                  <span>Beneficio</span>
                  <span />
                </div>

                {filtered.length === 0 ? (
                  <div className="px-6 py-16 text-center">
                    <Users size={25} className="mx-auto mb-3 text-[#3f3f3f]" />
                    <p className="text-sm font-medium text-[#aaa]">No encontramos clientes</p>
                    <p className="mt-1 text-xs text-[#555]">Probá otro filtro o término de búsqueda.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.05]">
                    {filtered.map((item) => (
                      <button
                        key={item.customer.id}
                        onClick={() => setSelectedId(item.customer.id)}
                        className="grid w-full grid-cols-[1.5fr_0.7fr_1.25fr_0.8fr_24px] items-center px-5 py-4 text-left transition hover:bg-white/[0.025]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-[#151515] text-[10px] font-bold text-[#aaa]">
                            {initials(item.customer.full_name)}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-[#e9e9e9]">{item.customer.full_name}</p>
                            <p className="mt-0.5 text-[10px] text-[#5d5d5d]">{item.customer.phone}</p>
                          </div>
                        </div>

                        <div>
                          <p className="text-sm font-semibold">{item.visits}</p>
                          <p className="text-[10px] text-[#555]">completadas</p>
                        </div>

                        <div className="pr-8">
                          <div className="mb-2 flex items-center justify-between text-[10px]">
                            <span className="text-[#777]">
                              {item.currentCycleVisits}/{item.program.visits_required}
                            </span>
                            {item.rewardsAvailable > 0 ? (
                              <span className="font-semibold text-[#ff6a18]">Listo</span>
                            ) : (
                              <span className="text-[#555]">{item.remaining} restantes</span>
                            )}
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[#202020]">
                            <div
                              className="h-full rounded-full bg-[#ff5a00]"
                              style={{ width: `${Math.min(100, item.progress)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          {item.rewardsAvailable > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#ff5a00]/20 bg-[#ff5a00]/[0.07] px-2 py-1 text-[10px] font-semibold text-[#ff7a36]">
                              <Gift size={12} />
                              {item.rewardsAvailable}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#555]">Sin beneficio</span>
                          )}
                        </div>

                        <ChevronRight size={15} className="text-[#444]" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-[16px] border border-white/[0.07] bg-[#0d0d0d] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#666]">
                      Actividad
                    </p>
                    <h3 className="mt-1 text-sm font-semibold">Servicios usados</h3>
                  </div>
                  <Clock3 size={16} className="text-[#555]" />
                </div>

                <div className="mt-6 space-y-4">
                  {serviceMix.length === 0 ? (
                    <p className="text-xs text-[#555]">Todavía no hay visitas completadas.</p>
                  ) : (
                    serviceMix.map(([name, count], index) => {
                      const max = serviceMix[0][1] || 1;
                      return (
                        <div key={name}>
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="truncate text-xs text-[#aaa]">{index + 1}. {name}</span>
                            <span className="text-[10px] font-semibold text-[#666]">{count}</span>
                          </div>
                          <div className="h-1 overflow-hidden rounded-full bg-[#1c1c1c]">
                            <div
                              className="h-full rounded-full bg-[#444]"
                              style={{ width: `${(count / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-7 border-t border-white/[0.06] pt-5">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#555]">Insight</p>
                  <p className="mt-2 text-xs leading-5 text-[#888]">
                    Los clientes próximos a completar el ciclo son la audiencia
                    con mayor potencial de retorno.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {selected && (
        <CustomerDrawer
          item={selected}
          onClose={() => setSelectedId(null)}
          formatDate={formatDate}
        />
      )}

      {programOpen && (
        <ProgramModal
          program={activeProgram}
          onClose={() => setProgramOpen(false)}
          onSaved={() => {
            setProgramOpen(false);
            setToast("Programa actualizado.");
            loadData(true);
          }}
          supabase={supabase}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] rounded-xl border border-white/[0.09] bg-[#141414] px-4 py-3 text-xs font-medium text-[#ddd] shadow-2xl">
          {toast}
        </div>
      )}
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[16px] border border-white/[0.07] bg-[#0d0d0d] p-4">
      <div className="flex items-center justify-between">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
          accent
            ? "border-[#ff5a00]/20 bg-[#ff5a00]/[0.07] text-[#ff6a18]"
            : "border-white/[0.07] bg-[#151515] text-[#777]"
        }`}>
          {icon}
        </div>
        {accent && <Sparkles size={13} className="text-[#4b4b4b]" />}
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#555]">{label}</p>
      <p className="mt-1 text-[25px] font-semibold tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-[10px] text-[#666]">{detail}</p>
    </div>
  );
}

function InfoBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#555]">{label}</p>
      {children}
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-[10px] font-semibold transition ${
        active ? "bg-[#222] text-[#eee]" : "text-[#666] hover:text-[#aaa]"
      }`}
    >
      {children}
    </button>
  );
}

function CustomerDrawer({
  item,
  onClose,
  formatDate,
}: {
  item: LoyaltyCustomer;
  onClose: () => void;
  formatDate: (x: string) => string;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[3px]" onClick={onClose}>
      <aside
        className="absolute right-0 top-0 h-full w-[450px] overflow-y-auto border-l border-white/[0.08] bg-[#0b0b0b] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.06] bg-[#0b0b0b]/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#555]">Cliente 360</p>
            <h2 className="mt-1 text-lg font-semibold">{item.customer.full_name}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] text-[#666] transition hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-7 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[16px] border border-[#ff5a00]/20 bg-[#ff5a00]/[0.07] text-sm font-bold text-[#ff6a18]">
              {initials(item.customer.full_name)}
            </div>
            <div>
              <p className="text-sm font-semibold">{item.customer.full_name}</p>
              <p className="mt-1 text-xs text-[#666]">{item.customer.phone}</p>
              {item.customer.email && <p className="mt-1 text-xs text-[#666]">{item.customer.email}</p>}
            </div>
          </div>

          <div className="rounded-[16px] border border-white/[0.07] bg-[#111] p-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#555]">Progreso actual</p>
                <p className="mt-2 text-4xl font-semibold tracking-[-0.06em]">
                  {item.currentCycleVisits}
                  <span className="text-base text-[#555]"> / {item.program.visits_required}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-[#555]">Faltan</p>
                <p className="mt-1 text-lg font-semibold text-[#ff6a18]">{item.remaining}</p>
              </div>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#202020]">
              <div className="h-full rounded-full bg-[#ff5a00]" style={{ width: `${item.progress}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#666]">
              {item.rewardsAvailable > 0
                ? `Tiene ${item.rewardsAvailable} beneficio(s) disponible(s) para canjear.`
                : `Al completar ${item.remaining} visita(s), alcanza el beneficio.`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Visitas totales" value={item.visits} />
            <MiniStat label="Disponibles" value={item.rewardsAvailable} accent />
            <MiniStat label="Canjeadas" value={item.account?.rewards_redeemed || 0} />
            <MiniStat label="Ganadas" value={item.account?.rewards_earned || Math.floor(item.visits / item.program.visits_required)} />
          </div>

          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#555]">Programa</p>
            <div className="rounded-[16px] border border-white/[0.07] bg-[#111] p-4">
              <div className="flex items-start gap-3">
                <Gift size={16} className="mt-0.5 text-[#ff6a18]" />
                <div>
                  <p className="text-sm font-semibold">{item.program.name}</p>
                  <p className="mt-1 text-xs leading-5 text-[#666]">{item.program.reward}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#555]">Cliente desde</p>
            <p className="text-xs text-[#888]">{formatDate(item.customer.created_at)}</p>
          </div>

          <button
            onClick={() => {
              window.location.href = `/admin/turnos?customer=${item.customer.id}`;
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-[#111] py-3 text-xs font-semibold text-[#ccc] transition hover:border-[#ff5a00]/30 hover:text-white"
          >
            Ver agenda del cliente
            <ChevronRight size={14} />
          </button>
        </div>
      </aside>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#111] p-4">
      <p className="text-[10px] text-[#555]">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${accent ? "text-[#ff6a18]" : "text-[#eee]"}`}>{value}</p>
    </div>
  );
}

function EmptyProgram({ onConfigure }: { onConfigure: () => void }) {
  return (
    <div className="flex min-h-[540px] items-center justify-center rounded-[20px] border border-white/[0.07] bg-[#0d0d0d]">
      <div className="max-w-lg text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[16px] border border-[#ff5a00]/20 bg-[#ff5a00]/[0.07] text-[#ff6a18]">
          <Award size={27} />
        </div>
        <h2 className="mt-6 text-2xl font-semibold tracking-[-0.03em]">Activá tu programa de fidelización</h2>
        <p className="mt-3 text-sm leading-6 text-[#666]">
          Definí cuántas visitas necesita un cliente y qué beneficio recibe.
          BarberOS se encarga de calcular el progreso sobre las visitas completadas.
        </p>
        <button
          onClick={onConfigure}
          className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#ff5a00] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#ff6815]"
        >
          <Plus size={15} />
          Configurar programa
        </button>
      </div>
    </div>
  );
}

function ProgramModal({
  program,
  onClose,
  onSaved,
  supabase,
}: {
  program: LoyaltyProgram | null;
  onClose: () => void;
  onSaved: () => void;
  supabase: ReturnType<typeof createClient>;
}) {
  const [name, setName] = useState(program?.name || "BarberOS Rewards");
  const [description, setDescription] = useState(program?.description || "");
  const [visits, setVisits] = useState(String(program?.visits_required || 5));
  const [reward, setReward] = useState(program?.reward || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    const numericVisits = Number(visits);

    if (!name.trim() || !reward.trim() || numericVisits < 1) {
      setError("Completá nombre, beneficio y una cantidad de visitas válida.");
      return;
    }

    setSaving(true);

    if (program) {
      const { error: updateError } = await supabase
        .from("loyalty_programs")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          visits_required: numericVisits,
          reward: reward.trim(),
        })
        .eq("id", program.id);

      if (updateError) {
        console.error(updateError);
        setError("No se pudo actualizar el programa.");
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("loyalty_programs")
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          visits_required: numericVisits,
          reward: reward.trim(),
          active: true,
        });

      if (insertError) {
        console.error(insertError);
        setError("No se pudo crear el programa.");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-6 backdrop-blur-[4px]">
      <div className="w-full max-w-[560px] rounded-[20px] border border-white/[0.08] bg-[#0d0d0d] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#555]">Fidelización</p>
            <h2 className="mt-1 text-lg font-semibold">{program ? "Editar programa" : "Nuevo programa"}</h2>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white"><X size={17} /></button>
        </div>

        <div className="space-y-5 p-6">
          <Field label="Nombre del programa">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Ej. Don Segundo Rewards" />
          </Field>
          <Field label="Descripción">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputClass} h-auto py-3`} placeholder="Cómo funciona el beneficio..." />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Visitas requeridas">
              <input type="number" min={1} value={visits} onChange={(e) => setVisits(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Recompensa">
              <input value={reward} onChange={(e) => setReward(e.target.value)} className={inputClass} placeholder="Ej. Corte gratis" />
            </Field>
          </div>

          {error && <p className="rounded-xl border border-red-500/20 bg-red-500/[0.05] px-3 py-2 text-xs text-red-300">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-xs font-medium text-[#888] hover:text-white">Cancelar</button>
            <button disabled={saving} onClick={save} className="rounded-xl bg-[#ff5a00] px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar programa"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#555]">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "h-10 w-full rounded-xl border border-white/[0.08] bg-[#111] px-3 text-xs text-[#eee] outline-none placeholder:text-[#4f4f4f] focus:border-[#ff5a00]/40";

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((x) => x[0]).join("").toUpperCase();
}
