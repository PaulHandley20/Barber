// app/admin/fidelizacion/page.tsx
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  accent = false,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className="metric-card panel">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
            accent
              ? "border-[#ff5a00]/25 bg-[#ff5a00]/[0.08] text-[#ff6a18]"
              : "border-white/[0.08] bg-white/[0.035] text-white/55"
          }`}
        >
          {icon}
        </div>
        <span className="data text-[8px] font-medium uppercase tracking-[.16em] text-white/28">
          KPI
        </span>
      </div>

      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <p
            className={`meta-label ${
              accent ? "text-[#ff6a18]" : "text-white/60"
            }`}
          >
            {label}
          </p>
          <p className="page-number mt-2 text-[30px] font-semibold leading-none tracking-[-.06em] text-white">
            {value}
          </p>
        </div>
        <p className="pb-0.5 text-right text-[11px] leading-5 text-white/58">
          {detail}
        </p>
      </div>
    </div>
  );
}

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
        .select(
          "id,customer_id,loyalty_program_id,visits,rewards_earned,rewards_redeemed"
        ),
    ]);

    if (c.error || a.error || p.error || ac.error) {
      console.error(
        "Fidelización load error",
        c.error,
        a.error,
        p.error,
        ac.error
      );
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

      const required = Math.max(activeProgram.visits_required, 1);
      const earnedByVisits = Math.floor(visits / required);
      const earned = account?.rewards_earned ?? earnedByVisits;
      const redeemed = account?.rewards_redeemed ?? 0;
      const rewardsAvailable = Math.max(0, earned - redeemed);
      const currentCycleVisits = visits % required;
      const progress = Math.round((currentCycleVisits / required) * 100);
      const remaining =
        currentCycleVisits === 0 && visits > 0
          ? required
          : Math.max(required - currentCycleVisits, 0);

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
    const customersInProgram = loyaltyCustomers.filter(
      (x) => x.visits > 0
    ).length;

    const totalVisits = loyaltyCustomers.reduce((s, x) => s + x.visits, 0);

    const rewards = loyaltyCustomers.reduce(
      (s, x) => s + x.rewardsAvailable,
      0
    );

    const closeToReward = loyaltyCustomers.filter(
      (x) =>
        x.rewardsAvailable === 0 &&
        x.remaining > 0 &&
        x.remaining <= 2
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

  const selected = loyaltyCustomers.find(
    (x) => x.customer.id === selectedId
  );

  const serviceMix = useMemo(() => {
    const map = new Map<string, number>();

    appointments
      .filter((x) => x.status === "completed")
      .forEach((x) => {
        const service = Array.isArray(x.service) ? x.service[0] : x.service;
        if (!service) return;
        map.set(service.name, (map.get(service.name) || 0) + 1);
      });

    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [appointments]);

  const filterCounts = useMemo(
    () => ({
      todos: loyaltyCustomers.length,
      progreso: loyaltyCustomers.filter(
        (x) => x.visits > 0 && x.rewardsAvailable === 0
      ).length,
      cerca: loyaltyCustomers.filter(
        (x) =>
          x.rewardsAvailable === 0 &&
          x.remaining > 0 &&
          x.remaining <= 2
      ).length,
      recompensa: loyaltyCustomers.filter(
        (x) => x.rewardsAvailable > 0
      ).length,
    }),
    [loyaltyCustomers]
  );

  return (
    <main
      className={`${manrope.variable} ${sora.variable} ${dmMono.variable} barberos-dashboard min-h-screen bg-[#070707] text-[#f5f5f4] selection:bg-[#ff5a00]/30`}
    >
      <style jsx>{`
        .barberos-dashboard {
          --ink: #070707;
          --surface: #0b0b0b;
          --surface-2: #111111;
          --line: rgba(255,255,255,.075);
          --line-soft: rgba(255,255,255,.045);
          --muted: rgba(255,255,255,.46);
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
            #070707;
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
          font-family: var(--font-barberos-data), DM Mono, monospace;
          font-variant-numeric: tabular-nums lining-nums;
        }

        .barberos-dashboard .page-display {
          font-family: var(--font-barberos-display), Sora, sans-serif;
          font-size: clamp(34px, 4vw, 48px);
          line-height: .91;
          letter-spacing: -.075em;
          font-weight: 620;
        }

        .barberos-dashboard .page-number {
          font-family: var(--font-barberos-display), Sora, sans-serif;
          font-variant-numeric: tabular-nums lining-nums;
          font-feature-settings: "tnum" 1, "zero" 1, "kern" 1;
        }

        .barberos-dashboard .meta-label {
          font-family: var(--font-barberos-ui), Manrope, sans-serif;
          font-size: 9px;
          line-height: 1;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: .17em;
        }

        .barberos-dashboard .panel {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 16px;
          background:
            linear-gradient(145deg,rgba(255,255,255,.028),rgba(255,255,255,.010) 52%,rgba(255,90,0,.012)),
            rgba(10,10,10,.96);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.022),
            0 18px 58px rgba(0,0,0,.15);
          transition:
            transform 240ms cubic-bezier(.22,.61,.36,1),
            border-color 240ms ease,
            box-shadow 240ms ease;
        }

        .barberos-dashboard .panel::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(420px 220px at 90% -10%,rgba(255,90,0,.045),transparent 70%);
        }

        .barberos-dashboard .panel::after {
          content: "";
          position: absolute;
          top: 0;
          left: 7%;
          right: 7%;
          height: 1px;
          pointer-events: none;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(255,255,255,.12),
              rgba(255,90,0,.20),
              rgba(255,255,255,.08),
              transparent
            );
          opacity: .20;
        }

        .barberos-dashboard .panel-hover:hover {
          transform: translateY(-1px);
          border-color: rgba(255,90,0,.14);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.03),
            0 24px 70px rgba(0,0,0,.22);
        }

        .barberos-dashboard .hairline {
          border-color: rgba(255,255,255,.06);
        }

        .barberos-dashboard .control {
          border: 1px solid rgba(255,255,255,.075);
          background: rgba(255,255,255,.025);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.018);
          transition: border-color 180ms ease, background 180ms ease, color 180ms ease;
        }

        .barberos-dashboard .control:hover {
          border-color: rgba(255,255,255,.13);
          background: rgba(255,255,255,.045);
        }

        .barberos-dashboard .primary {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg,#ff6a18 0%,#ff5a00 52%,#e84b00 100%);
          box-shadow:
            0 12px 30px rgba(255,90,0,.14),
            inset 0 1px 0 rgba(255,255,255,.26);
        }

        .barberos-dashboard .primary::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(108deg,transparent 20%,rgba(255,255,255,.30) 47%,transparent 72%);
          transform: translateX(-140%);
          transition: transform 650ms cubic-bezier(.22,.61,.36,1);
        }

        .barberos-dashboard .primary:hover::before {
          transform: translateX(140%);
        }

        .barberos-dashboard .metric-card {
          min-height: 148px;
          padding: 18px;
        }

        .barberos-dashboard .metric-card:hover {
          transform: translateY(-1px);
          border-color: rgba(255,90,0,.13);
        }

        .barberos-dashboard .customer-row {
          position: relative;
          border-bottom: 1px solid rgba(255,255,255,.055);
          transition: background 180ms ease, border-color 180ms ease;
        }

        .barberos-dashboard .customer-row:last-child {
          border-bottom: 0;
        }

        .barberos-dashboard .customer-row:hover {
          background: rgba(255,90,0,.025);
        }

        .barberos-dashboard .customer-row::before {
          content: "";
          position: absolute;
          left: 0;
          top: 18px;
          bottom: 18px;
          width: 2px;
          border-radius: 999px;
          background: transparent;
          transition: background 180ms ease;
        }

        .barberos-dashboard .customer-row:hover::before {
          background: #ff5a00;
        }

        .barberos-dashboard .progress-track {
          background: rgba(255,255,255,.055);
        }

        .barberos-dashboard .progress-fill {
          background: linear-gradient(90deg,#e84b00,#ff6a18);
        }

        .barberos-dashboard .filter-active {
          background: rgba(255,255,255,.085);
          color: #fff;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.055);
        }

        .barberos-dashboard input::placeholder {
          color: rgba(255,255,255,.42);
        }

        .barberos-dashboard input,
        .barberos-dashboard textarea {
          font-family: var(--font-barberos-ui), Manrope, sans-serif;
        }

        @media (max-width: 1100px) {
          .barberos-dashboard .metric-card {
            min-height: 138px;
          }
        }

        @media (max-width: 900px) {
          .barberos-dashboard .metric-card {
            min-height: 132px;
          }
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

      <div className="relative mx-auto max-w-[1680px] px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
        <header className="mb-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[.18em] text-white/82">
                  BARBEROS
                </span>
                <span className="text-white/10">/</span>
                <span className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#ff6a18]">
                  INTELIGENCIA DE FIDELIZACIÓN
                </span>
                <span className="ml-1 hidden h-px w-10 bg-gradient-to-r from-orange-500/55 to-transparent sm:block" />
              </div>

              <h1 className="page-display text-white">Fidelización</h1>

              <p className="mt-2 max-w-xl text-[14px] leading-6 text-white/72">
                Convertí visitas en recurrencia, controlá el progreso y detectá
                oportunidades de retorno desde un solo lugar.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadData(true)}
                className="control flex h-10 items-center rounded-[11px] px-4 text-[11px] font-semibold text-white/78"
              >
                {refreshing ? "Actualizando..." : "Actualizar"}
              </button>

              <button
                type="button"
                onClick={() => setProgramOpen(true)}
                className="primary flex h-10 items-center gap-2 rounded-[11px] px-4 text-[11px] font-semibold text-white"
              >
                <Settings2 size={14} />
                Configurar programa
              </button>
            </div>
          </div>
        </header>

        {!activeProgram ? (
          <EmptyProgram onConfigure={() => setProgramOpen(true)} />
        ) : (
          <main className="pb-10">
            <section className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-6">
              <MetricCard
                icon={<Users size={16} />}
                label="Clientes"
                value={stats.customers}
                detail="base total"
              />
              <MetricCard
                icon={<TrendingUp size={16} />}
                label="Activos"
                value={stats.customersInProgram}
                detail={`${stats.penetration}% de penetración`}
              />
              <MetricCard
                icon={<CheckCircle2 size={16} />}
                label="Visitas"
                value={stats.totalVisits}
                detail="completadas"
              />
              <MetricCard
                icon={<Gift size={16} />}
                label="Disponibles"
                value={stats.rewards}
                detail="beneficios"
                accent
              />
              <MetricCard
                icon={<Target size={16} />}
                label="Oportunidades"
                value={stats.closeToReward}
                detail="a ≤ 2 visitas"
              />
              <MetricCard
                icon={<History size={16} />}
                label="Canjeadas"
                value={stats.redeemed}
                detail="históricas"
              />
            </section>

            <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,.75fr)]">
              <div className="panel panel-hover p-5 sm:p-6">
                <div className="relative mb-6 flex items-start justify-between gap-4">
                  <div>
                    <div className="meta-label mb-2 text-[#ff6a18]">
                      Programa activo
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="display text-[22px] font-semibold tracking-[-.04em] text-white">
                        {activeProgram.name}
                      </h2>

                      <span className="rounded-full border border-[#ff5a00]/25 bg-[#ff5a00]/[0.08] px-2.5 py-1 data text-[9px] font-bold uppercase tracking-[.12em] text-[#ff7a36]">
                        Activo
                      </span>
                    </div>

                    <p className="mt-1 text-[14px] text-white/70">
                      Regla, recompensa y condiciones del ciclo de fidelización.
                    </p>
                  </div>

                  <Gift size={17} className="text-[#ff6a18]" />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  <InfoBlock label="Objetivo">
                    <strong className="page-number text-[32px] font-semibold tracking-[-.055em] text-white">
                      {activeProgram.visits_required}
                    </strong>
                    <span className="mt-1 block text-[13px] text-white/62">
                      visitas
                    </span>
                  </InfoBlock>

                  <InfoBlock label="Recompensa">
                    <strong className="text-[15px] leading-6 text-white/90">
                      {activeProgram.reward}
                    </strong>
                    <span className="mt-1 block text-[13px] text-white/62">
                      al completar el ciclo
                    </span>
                  </InfoBlock>

                  <InfoBlock label="Descripción">
                    <p className="text-[14px] leading-6 text-white/70">
                      {activeProgram.description ||
                        "Programa de fidelización activo."}
                    </p>
                  </InfoBlock>
                </div>
              </div>

              <div className="panel panel-hover p-5 sm:p-6">
                <div className="relative mb-6 flex items-start justify-between gap-4">
                  <div>
                    <div className="meta-label mb-2 text-[#ff6a18]">
                      Radar de crecimiento
                    </div>
                    <h2 className="display text-[22px] font-semibold tracking-[-.04em] text-white">
                      Clientes cerca del beneficio
                    </h2>
                    <p className="mt-1 text-[14px] text-white/70">
                      Oportunidad de retorno y comunicación personalizada.
                    </p>
                  </div>

                  <Sparkles size={17} className="text-[#ff6a18]" />
                </div>

                <div className="flex items-end gap-3">
                  <span className="page-number text-[48px] font-semibold leading-none tracking-[-.065em] text-white">
                    {stats.closeToReward}
                  </span>
                  <span className="pb-1 text-[13px] leading-5 text-white/62">
                    clientes a
                    <br />
                    máximo 2 visitas
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

                <p className="mt-3 text-[13px] leading-6 text-white/68">
                  Ideal para campañas de retorno y comunicación personalizada.
                </p>
              </div>
            </section>

            {/* NUEVO CUSTOMER BOARD */}
            <section className="panel mb-5 overflow-hidden">
              <div className="border-b hairline px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <div className="meta-label text-[#ff6a18]">
                      Seguimiento de clientes
                    </div>
                    <h2 className="display mt-2 text-[22px] font-semibold tracking-[-.04em] text-white">
                      Progreso de fidelización
                    </h2>
                    <p className="mt-1 text-[14px] text-white/68">
                      Seguimiento individual del ciclo, beneficios y próximas
                      oportunidades.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative w-full sm:w-[300px]">
                      <Search
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-white/42"
                      />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar cliente o teléfono..."
                        className="control h-10 w-full rounded-[11px] pl-9 pr-3 text-[12px] text-white outline-none focus:border-[#ff5a00]/35"
                      />
                    </div>

                    <div className="flex w-fit overflow-x-auto rounded-[11px] border border-white/[.06] bg-white/[.012] p-1">
                      <FilterButton
                        active={filter === "todos"}
                        count={filterCounts.todos}
                        onClick={() => setFilter("todos")}
                      >
                        Todos
                      </FilterButton>

                      <FilterButton
                        active={filter === "progreso"}
                        count={filterCounts.progreso}
                        onClick={() => setFilter("progreso")}
                      >
                        En progreso
                      </FilterButton>

                      <FilterButton
                        active={filter === "cerca"}
                        count={filterCounts.cerca}
                        onClick={() => setFilter("cerca")}
                      >
                        Cerca
                      </FilterButton>

                      <FilterButton
                        active={filter === "recompensa"}
                        count={filterCounts.recompensa}
                        onClick={() => setFilter("recompensa")}
                      >
                        Recompensa
                      </FilterButton>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden grid-cols-[minmax(260px,1.5fr)_minmax(170px,1fr)_110px_130px_24px] gap-5 border-b hairline px-5 py-3 sm:grid sm:px-6">
                <span className="meta-label text-white/48">Cliente</span>
                <span className="meta-label text-white/48">Progreso</span>
                <span className="meta-label text-white/48">Visitas</span>
                <span className="meta-label text-white/48">Beneficio</span>
                <span />
              </div>

              {loading ? (
                <div className="space-y-px">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-[102px] animate-pulse border-b border-white/[.045] bg-white/[.008]"
                    />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex min-h-[260px] items-center justify-center px-6 text-center">
                  <div>
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-white/[.08] bg-white/[.025] text-white/35">
                      <Users size={18} />
                    </div>
                    <h3 className="display mt-4 text-[16px] font-semibold text-white">
                      No hay clientes para mostrar
                    </h3>
                    <p className="mt-1 text-[13px] text-white/58">
                      Probá con otra búsqueda o cambiá el filtro.
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  {filtered.map((item) => {
                    const hasReward = item.rewardsAvailable > 0;
                    const isClose = !hasReward && item.remaining > 0 && item.remaining <= 2;

                    return (
                      <button
                        key={item.customer.id}
                        type="button"
                        onClick={() => setSelectedId(item.customer.id)}
                        className="customer-row group grid w-full grid-cols-1 gap-4 px-5 py-5 text-left sm:grid-cols-[minmax(260px,1.5fr)_minmax(170px,1fr)_110px_130px_24px] sm:items-center sm:gap-5 sm:px-6"
                      >
                        <div className="flex min-w-0 items-center gap-3.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ff5a00]/20 bg-[#ff5a00]/[0.07] text-[11px] font-semibold text-[#ff9a66]">
                            {initials(item.customer.full_name)}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-[14px] font-semibold text-white/90 group-hover:text-white">
                              {item.customer.full_name}
                            </p>
                            <p className="mt-1 truncate text-[12px] text-white/58">
                              {item.customer.phone}
                            </p>
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="data text-[11px] font-medium text-white/76">
                              {item.currentCycleVisits} / {item.program.visits_required}
                            </span>
                            <span className="data text-[10px] text-white/54">
                              {item.progress}%
                            </span>
                          </div>

                          <div className="progress-track h-1.5 overflow-hidden rounded-full">
                            <div
                              className="progress-fill h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, item.progress)}%`,
                              }}
                            />
                          </div>

                          <p className="mt-2 text-[11px] text-white/52">
                            {isClose
                              ? `${item.remaining} ${
                                  item.remaining === 1 ? "visita" : "visitas"
                                } para alcanzar el beneficio`
                              : hasReward
                                ? "Beneficio disponible para canjear"
                                : `${item.remaining} ${
                                    item.remaining === 1 ? "visita" : "visitas"
                                  } restantes`}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:block">
                          <span className="meta-label text-white/45">Visitas</span>
                          <p className="page-number mt-1 text-[20px] font-semibold tracking-[-.045em] text-white sm:mt-2">
                            {item.visits}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:block">
                          <span className="meta-label text-white/45">Estado</span>

                          <div className="mt-1 flex items-center gap-2 sm:mt-2">
                            {hasReward ? (
                              <>
                                <Gift size={13} className="text-[#ff6a18]" />
                                <span className="data text-[11px] font-semibold text-[#ff9a66]">
                                  {item.rewardsAvailable} disponible
                                  {item.rewardsAvailable === 1 ? "" : "s"}
                                </span>
                              </>
                            ) : isClose ? (
                              <span className="data text-[11px] font-semibold text-[#ff9a66]">
                                Cerca
                              </span>
                            ) : (
                              <span className="data text-[11px] text-white/54">
                                En progreso
                              </span>
                            )}
                          </div>
                        </div>

                        <ChevronRight
                          size={15}
                          className="hidden text-white/25 transition group-hover:translate-x-0.5 group-hover:text-white/55 sm:block"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(330px,.75fr)]">
              <div className="panel panel-hover p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="meta-label mb-2 text-[#ff6a18]">
                      Actividad
                    </div>
                    <h2 className="display text-[22px] font-semibold tracking-[-.04em] text-white">
                      Servicios usados
                    </h2>
                    <p className="mt-1 text-[14px] text-white/70">
                      Mix de servicios entre visitas completadas.
                    </p>
                  </div>

                  <Clock3 size={16} className="text-white/42" />
                </div>

                <div className="mt-7 space-y-5">
                  {serviceMix.length === 0 ? (
                    <p className="text-[13px] text-white/58">
                      Todavía no hay visitas completadas.
                    </p>
                  ) : (
                    serviceMix.map(([name, count], index) => {
                      const max = serviceMix[0][1] || 1;

                      return (
                        <div key={name}>
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <span className="truncate text-[13px] text-white/76">
                              {index + 1}. {name}
                            </span>
                            <span className="data text-[12px] font-semibold text-white/84">
                              {count}
                            </span>
                          </div>

                          <div className="h-1.5 overflow-hidden rounded-full bg-white/[.045]">
                            <div
                              className="h-full rounded-full bg-[#ff5a00]"
                              style={{ width: `${(count / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-8 border-t hairline pt-5">
                  <div className="meta-label text-[#ff6a18]">Insight</div>
                  <p className="mt-2 text-[13px] leading-6 text-white/68">
                    Los clientes próximos a completar el ciclo son la audiencia
                    con mayor potencial de retorno.
                  </p>
                </div>
              </div>

              <div className="panel panel-hover p-5 sm:p-6">
                <div className="meta-label mb-2 text-[#ff6a18]">
                  Resumen operativo
                </div>
                <h2 className="display text-[22px] font-semibold tracking-[-.04em] text-white">
                  Estado del programa
                </h2>
                <p className="mt-1 text-[14px] text-white/70">
                  Una lectura rápida de la actividad actual.
                </p>

                <div className="mt-7 space-y-4">
                  <SummaryRow
                    label="Penetración"
                    value={`${stats.penetration}%`}
                    detail={`${stats.customersInProgram} clientes con visitas`}
                  />
                  <SummaryRow
                    label="Beneficios disponibles"
                    value={String(stats.rewards)}
                    detail="pendientes de canje"
                    accent
                  />
                  <SummaryRow
                    label="Beneficios canjeados"
                    value={String(stats.redeemed)}
                    detail="histórico registrado"
                  />
                  <SummaryRow
                    label="Oportunidades"
                    value={String(stats.closeToReward)}
                    detail="a máximo 2 visitas"
                    accent={stats.closeToReward > 0}
                  />
                </div>
              </div>
            </section>
          </main>
        )}
      </div>

      {selected && (
        <CustomerDrawer
          item={selected}
          onClose={() => setSelectedId(null)}
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
        <div className="fixed bottom-6 right-6 z-[70] rounded-xl border border-white/[0.09] bg-[#141414] px-4 py-3 text-[13px] font-medium text-white/82 shadow-2xl">
          {toast}
        </div>
      )}
    </main>
  );
}

function InfoBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="meta-label mb-2 text-[#ff6a18]">{label}</p>
      {children}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  detail,
  accent = false,
}: {
  label: string;
  value: string;
  detail: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[.055] pb-4 last:border-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-white/80">{label}</p>
        <p className="mt-1 text-[12px] text-white/54">{detail}</p>
      </div>
      <p
        className={`page-number shrink-0 text-[22px] font-semibold tracking-[-.05em] ${
          accent ? "text-[#ff6a18]" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function FilterButton({
  active,
  children,
  count,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
        active
          ? "filter-active"
          : "text-white/48 hover:bg-white/[.035] hover:text-white/78"
      }`}
    >
      {children}
      <span className="data text-[9px] text-white/38">{count}</span>
    </button>
  );
}

function CustomerDrawer({
  item,
  onClose,
}: {
  item: LoyaltyCustomer;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-[450px] overflow-y-auto border-l border-white/[.08] bg-[#0b0b0b] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[.06] bg-[#0b0b0b]/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="meta-label text-[#ff6a18]">Cliente 360</p>
            <h2 className="display mt-2 text-[20px] font-semibold tracking-[-.04em] text-white">
              {item.customer.full_name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[.07] text-white/42 transition hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-7 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[16px] border border-[#ff5a00]/20 bg-[#ff5a00]/[.07] text-sm font-bold text-[#ff6a18]">
              {initials(item.customer.full_name)}
            </div>

            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-white">
                {item.customer.full_name}
              </p>
              <p className="mt-1 text-[13px] text-white/58">
                {item.customer.phone}
              </p>
              {item.customer.email && (
                <p className="mt-1 truncate text-[12px] text-white/50">
                  {item.customer.email}
                </p>
              )}
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="meta-label text-[#ff6a18]">Progreso actual</p>
                <p className="page-number mt-2 text-[38px] font-semibold leading-none tracking-[-.06em] text-white">
                  {item.currentCycleVisits}
                  <span className="text-[16px] text-white/38">
                    {" "}
                    / {item.program.visits_required}
                  </span>
                </p>
              </div>

              <div className="text-right">
                <p className="text-[12px] text-white/58">Faltan</p>
                <p className="page-number mt-1 text-[20px] font-semibold text-[#ff6a18]">
                  {item.remaining}
                </p>
              </div>
            </div>

            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#202020]">
              <div
                className="h-full rounded-full bg-[#ff5a00]"
                style={{ width: `${item.progress}%` }}
              />
            </div>

            <p className="mt-3 text-[13px] leading-6 text-white/64">
              {item.rewardsAvailable > 0
                ? `Tiene ${item.rewardsAvailable} beneficio(s) disponible(s) para canjear.`
                : `Al completar ${item.remaining} visita(s), alcanza el beneficio.`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Visitas totales" value={item.visits} />
            <MiniStat
              label="Disponibles"
              value={item.rewardsAvailable}
              accent
            />
            <MiniStat
              label="Canjeadas"
              value={item.account?.rewards_redeemed || 0}
            />
            <MiniStat
              label="Ganadas"
              value={
                item.account?.rewards_earned ||
                Math.floor(item.visits / Math.max(item.program.visits_required, 1))
              }
            />
          </div>

          <div>
            <p className="meta-label mb-3 text-[#ff6a18]">Programa</p>
            <div className="rounded-[16px] border border-white/[.07] bg-[#111] p-4">
              <div className="flex items-start gap-3">
                <Gift size={16} className="mt-0.5 text-[#ff6a18]" />
                <div>
                  <p className="text-[14px] font-semibold text-white/88">
                    {item.program.name}
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-white/64">
                    {item.program.reward}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="meta-label mb-3 text-[#ff6a18]">Cliente desde</p>
            <p className="text-[13px] text-white/58">
              {formatDate(item.customer.created_at)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              window.location.href = `/admin/turnos?customer=${item.customer.id}`;
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[.08] bg-[#111] py-3 text-[12px] font-semibold text-white/78 transition hover:border-[#ff5a00]/30 hover:bg-[#151515] hover:text-white"
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
    <div className="rounded-xl border border-white/[.07] bg-[#111] p-4">
      <p className="text-[12px] text-white/58">{label}</p>
      <p
        className={`page-number mt-2 text-[22px] font-semibold tracking-[-.05em] ${
          accent ? "text-[#ff6a18]" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function EmptyProgram({
  onConfigure,
}: {
  onConfigure: () => void;
}) {
  return (
    <div className="panel flex min-h-[540px] items-center justify-center">
      <div className="max-w-lg px-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[16px] border border-[#ff5a00]/20 bg-[#ff5a00]/[.07] text-[#ff6a18]">
          <Award size={27} />
        </div>

        <h2 className="display mt-6 text-[24px] font-semibold tracking-[-.04em]">
          Activá tu programa de fidelización
        </h2>

        <p className="mt-3 text-[14px] leading-6 text-white/64">
          Definí cuántas visitas necesita un cliente y qué beneficio recibe.
          BarberOS se encarga de calcular el progreso sobre las visitas
          completadas.
        </p>

        <button
          type="button"
          onClick={onConfigure}
          className="primary mt-7 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[12px] font-semibold text-white"
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
  const [visits, setVisits] = useState(
    String(program?.visits_required || 5)
  );
  const [reward, setReward] = useState(program?.reward || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");

    const numericVisits = Number(visits);

    if (!name.trim() || !reward.trim() || numericVisits < 1) {
      setError(
        "Completá nombre, beneficio y una cantidad de visitas válida."
      );
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

  const inputClass =
    "control h-11 w-full rounded-[11px] px-3 text-[13px] text-white outline-none focus:border-[#ff5a00]/35";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-6 backdrop-blur-[4px]">
      <div className="w-full max-w-[560px] overflow-hidden rounded-[16px] border border-white/[.08] bg-[#0d0d0d] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[.06] px-6 py-5">
          <div>
            <p className="meta-label text-[#ff6a18]">Fidelización</p>
            <h2 className="display mt-2 text-[20px] font-semibold text-white">
              {program ? "Editar programa" : "Nuevo programa"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-white/35 transition hover:text-white"
          >
            <X size={17} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <Field label="Nombre del programa">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Ej. BarberOS Rewards"
            />
          </Field>

          <Field label="Descripción">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} h-24 resize-none py-3`}
              placeholder="Descripción del beneficio..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Visitas requeridas">
              <input
                type="number"
                min={1}
                value={visits}
                onChange={(e) => setVisits(e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Beneficio">
              <input
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                className={inputClass}
                placeholder="Ej. 1 corte gratis"
              />
            </Field>
          </div>

          {error && (
            <div className="rounded-xl border border-red-300/10 bg-red-300/[.04] px-4 py-3 text-[12px] leading-5 text-red-200/80">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="control rounded-[11px] px-4 py-2.5 text-[12px] font-semibold text-white/70"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="primary rounded-[11px] px-4 py-2.5 text-[12px] font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar programa"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="meta-label mb-2 block text-white/58">{label}</span>
      {children}
    </label>
  );
}
