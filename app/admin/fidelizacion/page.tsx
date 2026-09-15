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
  Pencil,
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
  deleted_at?: string | null;
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

type Appointment = {
  id: string;
  customer_id: string;
  service_id: string | null;
  status: string;
  start_at: string;
  service:
    | { id?: string; name: string; price: number }
    | { id?: string; name: string; price: number }[]
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
  points_balance: number;
};

type LoyaltyServiceRule = {
  id: string;
  loyalty_program_id: string;
  service_id: string;
  points: number;
  active: boolean;
};

type LoyaltyReward = {
  id: string;
  loyalty_program_id: string;
  name: string;
  description: string | null;
  points_required: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type LoyaltyTransaction = {
  id: string;
  loyalty_account_id: string;
  appointment_id: string | null;
  reward_id: string | null;
  transaction_type: string;
  points_delta: number;
  description: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type LoyaltyCustomer = {
  customer: Customer;
  account: LoyaltyAccount | null;
  points: number;
  visits: number;
  availableRewards: number;
  nextReward: LoyaltyReward | null;
  pointsToNextReward: number | null;
  progress: number;
};

type Filter = "todos" | "activos" | "cerca" | "beneficio";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
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

function normalizeService(
  service: Appointment["service"]
): { name: string; price: number } | null {
  return Array.isArray(service) ? service[0] || null : service;
}

function MetricCard({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="metric-card panel">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
            accent
              ? "border-[#ff5a00]/25 bg-[#ff5a00]/[0.08] text-[#ff6a18]"
              : "border-white/[0.08] bg-white/[0.035] text-white/55"
          }`}
        >
          {icon}
        </div>

        <p
          className={`meta-label ${
            accent ? "text-[#ff6a18]" : "text-white/62"
          }`}
        >
          {label}
        </p>
      </div>

      <p className="page-number mt-7 text-[32px] font-semibold leading-none tracking-[-.06em] text-white">
        {value.toLocaleString("es-AR")}
      </p>
    </div>
  );
}

export default function FidelizacionPage() {
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [programs, setPrograms] = useState<LoyaltyProgram[]>([]);
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [rules, setRules] = useState<LoyaltyServiceRule[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function loadData(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);

    const [c, s, a, p, ac, r, rw, tx] = await Promise.all([
      supabase
        .from("customers")
        .select("id,full_name,phone,email,created_at,deleted_at")
        .is("deleted_at", null)
        .order("full_name", { ascending: true }),
      supabase
        .from("services")
        .select("id,name,description,duration_minutes,price,active,currency")
        .eq("active", true)
        .order("name", { ascending: true }),
      supabase
        .from("appointments")
        .select(`
          id,
          customer_id,
          service_id,
          status,
          start_at,
          service:services(id,name,price)
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
          "id,customer_id,loyalty_program_id,visits,rewards_earned,rewards_redeemed,points_balance"
        ),
      supabase
        .from("loyalty_service_rules")
        .select("id,loyalty_program_id,service_id,points,active"),
      supabase
        .from("loyalty_rewards")
        .select(
          "id,loyalty_program_id,name,description,points_required,active,created_at,updated_at"
        )
        .order("points_required", { ascending: true }),
      supabase
        .from("loyalty_point_transactions")
        .select(
          "id,loyalty_account_id,appointment_id,reward_id,transaction_type,points_delta,description,metadata,created_at"
        )
        .order("created_at", { ascending: false })
        .limit(150),
    ]);

    const errors = [c.error, s.error, a.error, p.error, ac.error, r.error, rw.error, tx.error].filter(Boolean);

    if (errors.length) {
      console.error("Fidelización load errors", errors);
      setToast("No se pudieron cargar todos los datos de fidelización.");
    }

    setCustomers(c.data || []);
    setServices(s.data || []);
    setAppointments(a.data || []);
    setPrograms(p.data || []);
    setAccounts(ac.data || []);
    setRules(r.data || []);
    setRewards(rw.data || []);
    setTransactions(tx.data || []);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeProgram = programs[0] || null;

  const activeRules = useMemo(
    () =>
      activeProgram
        ? rules.filter(
            (rule) =>
              rule.loyalty_program_id === activeProgram.id && rule.active
          )
        : [],
    [rules, activeProgram]
  );

  const activeRewards = useMemo(
    () =>
      activeProgram
        ? rewards
            .filter(
              (reward) =>
                reward.loyalty_program_id === activeProgram.id && reward.active
            )
            .sort((a, b) => a.points_required - b.points_required)
        : [],
    [rewards, activeProgram]
  );

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

      const points = Math.max(0, account?.points_balance ?? 0);
      const availableRewards = activeRewards.filter(
        (reward) => points >= reward.points_required
      ).length;

      const nextReward =
        activeRewards.find((reward) => reward.points_required > points) ||
        null;

      const pointsToNextReward = nextReward
        ? Math.max(nextReward.points_required - points, 0)
        : null;

      const progress = nextReward
        ? Math.min(
            100,
            Math.round((points / Math.max(nextReward.points_required, 1)) * 100)
          )
        : activeRewards.length > 0
          ? 100
          : 0;

      return {
        customer,
        account,
        points,
        visits,
        availableRewards,
        nextReward,
        pointsToNextReward,
        progress,
      };
    });
  }, [customers, accounts, appointments, activeProgram, activeRewards]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return loyaltyCustomers.filter((item) => {
      const matchesSearch =
        !q ||
        item.customer.full_name.toLowerCase().includes(q) ||
        item.customer.phone.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filter === "activos") return item.points > 0;
      if (filter === "beneficio") return item.availableRewards > 0;
      if (filter === "cerca") {
        return (
          item.availableRewards === 0 &&
          item.pointsToNextReward !== null &&
          item.pointsToNextReward <= 20
        );
      }

      return true;
    });
  }, [loyaltyCustomers, search, filter]);

  const stats = useMemo(() => {
    const activeCustomers = loyaltyCustomers.filter((x) => x.points > 0).length;
    const points = loyaltyCustomers.reduce((sum, x) => sum + x.points, 0);
    const available = loyaltyCustomers.reduce(
      (sum, x) => sum + x.availableRewards,
      0
    );
    const close = loyaltyCustomers.filter(
      (x) =>
        x.availableRewards === 0 &&
        x.pointsToNextReward !== null &&
        x.pointsToNextReward <= 20
    ).length;
    const redeemed = accounts
      .filter((x) => x.loyalty_program_id === activeProgram?.id)
      .reduce((sum, x) => sum + (x.rewards_redeemed || 0), 0);

    const completedVisits = appointments.filter(
      (x) => x.status === "completed"
    ).length;

    return {
      customers: loyaltyCustomers.length,
      activeCustomers,
      points,
      available,
      close,
      redeemed,
      completedVisits,
    };
  }, [loyaltyCustomers, accounts, appointments, activeProgram]);

  const filterCounts = useMemo(
    () => ({
      todos: loyaltyCustomers.length,
      activos: loyaltyCustomers.filter((x) => x.points > 0).length,
      cerca: loyaltyCustomers.filter(
        (x) =>
          x.availableRewards === 0 &&
          x.pointsToNextReward !== null &&
          x.pointsToNextReward <= 20
      ).length,
      beneficio: loyaltyCustomers.filter((x) => x.availableRewards > 0).length,
    }),
    [loyaltyCustomers]
  );

  const serviceMix = useMemo(() => {
    const map = new Map<string, number>();

    appointments
      .filter((x) => x.status === "completed")
      .forEach((x) => {
        const service = normalizeService(x.service);
        if (!service) return;
        map.set(service.name, (map.get(service.name) || 0) + 1);
      });

    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [appointments]);

  const selected = loyaltyCustomers.find(
    (x) => x.customer.id === selectedId
  );

  const serviceRulesCount = activeRules.length;
  const servicesWithoutRules = services.filter(
    (service) => !activeRules.some((rule) => rule.service_id === service.id)
  ).length;

  return (
    <main
      className={`${manrope.variable} ${sora.variable} ${dmMono.variable} barberos-dashboard min-h-screen bg-[#070707] text-[#f5f5f4] selection:bg-[#ff5a00]/30`}
    >
      <style jsx>{`
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
          font-family:var(--font-barberos-ui),Manrope,sans-serif;
          font-feature-settings:"kern" 1,"liga" 1,"calt" 1;
          text-rendering:optimizeLegibility;
          -webkit-font-smoothing:antialiased;
          -moz-osx-font-smoothing:grayscale;
          letter-spacing:-.014em;
          background:
            radial-gradient(720px 360px at 88% -8%,rgba(255,90,0,.045),transparent 70%),
            radial-gradient(520px 320px at 8% 14%,rgba(255,255,255,.010),transparent 74%),
            #070707;
        }
        .barberos-dashboard h1,.barberos-dashboard h2,.barberos-dashboard h3,.barberos-dashboard h4,.barberos-dashboard .display{
          font-family:var(--font-barberos-display),Sora,sans-serif;
          font-feature-settings:"kern" 1,"liga" 1;
          text-wrap:balance;
        }
        .barberos-dashboard .data{
          font-family:var(--font-barberos-data),DM Mono,monospace;
          font-variant-numeric:tabular-nums lining-nums;
        }
        .barberos-dashboard .page-display{
          font-family:var(--font-barberos-display),Sora,sans-serif;
          font-size:clamp(34px,4vw,48px);
          line-height:.91;
          letter-spacing:-.075em;
          font-weight:620;
        }
        .barberos-dashboard .page-number{
          font-family:var(--font-barberos-display),Sora,sans-serif;
          font-variant-numeric:tabular-nums lining-nums;
          font-feature-settings:"tnum" 1,"zero" 1,"kern" 1;
        }
        .barberos-dashboard .meta-label{
          font-family:var(--font-barberos-ui),Manrope,sans-serif;
          font-size:9px;
          line-height:1;
          font-weight:750;
          text-transform:uppercase;
          letter-spacing:.17em;
        }
        .barberos-dashboard .panel{
          position:relative;
          isolation:isolate;
          overflow:hidden;
          border:1px solid var(--line);
          border-radius:16px;
          background:
            linear-gradient(145deg,rgba(255,255,255,.028),rgba(255,255,255,.010) 52%,rgba(255,90,0,.012)),
            rgba(10,10,10,.96);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.022),0 18px 58px rgba(0,0,0,.15);
          transition:transform 240ms cubic-bezier(.22,.61,.36,1),border-color 240ms ease,box-shadow 240ms ease;
        }
        .barberos-dashboard .panel::before{
          content:"";
          position:absolute;
          inset:0;
          pointer-events:none;
          background:radial-gradient(420px 220px at 90% -10%,rgba(255,90,0,.045),transparent 70%);
        }
        .barberos-dashboard .panel::after{
          content:"";
          position:absolute;
          top:0;
          left:7%;
          right:7%;
          height:1px;
          pointer-events:none;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),rgba(255,90,0,.20),rgba(255,255,255,.08),transparent);
          opacity:.20;
        }
        .barberos-dashboard .panel-hover:hover{
          transform:translateY(-1px);
          border-color:rgba(255,90,0,.14);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.03),0 24px 70px rgba(0,0,0,.22);
        }
        .barberos-dashboard .hairline{border-color:rgba(255,255,255,.06);}
        .barberos-dashboard .control{
          border:1px solid rgba(255,255,255,.075);
          background:rgba(255,255,255,.025);
          box-shadow:inset 0 1px 0 rgba(255,255,255,.018);
          transition:border-color 180ms ease,background 180ms ease,color 180ms ease;
        }
        .barberos-dashboard .control:hover{
          border-color:rgba(255,255,255,.13);
          background:rgba(255,255,255,.045);
        }
        .barberos-dashboard .primary{
          position:relative;
          overflow:hidden;
          background:linear-gradient(135deg,#ff6a18 0%,#ff5a00 52%,#e84b00 100%);
          box-shadow:0 12px 30px rgba(255,90,0,.14),inset 0 1px 0 rgba(255,255,255,.26);
        }
        .barberos-dashboard .primary::before{
          content:"";
          position:absolute;
          inset:0;
          background:linear-gradient(108deg,transparent 20%,rgba(255,255,255,.30) 47%,transparent 72%);
          transform:translateX(-140%);
          transition:transform 650ms cubic-bezier(.22,.61,.36,1);
        }
        .barberos-dashboard .primary:hover::before{transform:translateX(140%);}
        .barberos-dashboard .metric-card{min-height:148px;padding:18px;}
        .barberos-dashboard .metric-card:hover{transform:translateY(-1px);border-color:rgba(255,90,0,.13);}
        .barberos-dashboard .customer-row{
          position:relative;
          border-bottom:1px solid rgba(255,255,255,.055);
          transition:background 180ms ease,border-color 180ms ease;
        }
        .barberos-dashboard .customer-row:last-child{border-bottom:0;}
        .barberos-dashboard .customer-row:hover{background:rgba(255,90,0,.025);}
        .barberos-dashboard .customer-row::before{
          content:"";
          position:absolute;
          left:0;
          top:18px;
          bottom:18px;
          width:2px;
          border-radius:999px;
          background:transparent;
          transition:background 180ms ease;
        }
        .barberos-dashboard .customer-row:hover::before{background:#ff5a00;}
        .barberos-dashboard .progress-track{background:rgba(255,255,255,.055);}
        .barberos-dashboard .progress-fill{background:linear-gradient(90deg,#e84b00,#ff6a18);}
        .barberos-dashboard .filter-active{
          background:rgba(255,255,255,.085);
          color:#fff;
          box-shadow:inset 0 0 0 1px rgba(255,255,255,.055);
        }
        .barberos-dashboard input::placeholder{color:rgba(255,255,255,.42);}
        .barberos-dashboard input,.barberos-dashboard textarea{
          font-family:var(--font-barberos-ui),Manrope,sans-serif;
        }
        @media (max-width:1100px){.barberos-dashboard .metric-card{min-height:138px;}}
        @media (max-width:900px){.barberos-dashboard .metric-card{min-height:132px;}}
        @media (prefers-reduced-motion:reduce){
          .barberos-dashboard *,.barberos-dashboard *::before,.barberos-dashboard *::after{
            animation-duration:.01ms!important;
            animation-iteration-count:1!important;
            scroll-behavior:auto!important;
            transition-duration:.01ms!important;
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
                Convertí visitas en puntos, configurá beneficios y seguí el
                valor de cada cliente desde un solo lugar.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => loadData(true)}
                className="control flex h-10 items-center rounded-[11px] px-4 text-[11px] font-semibold text-white/78"
              >
                {refreshing ? "Actualizando..." : "Actualizar"}
              </button>

              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="primary flex h-10 items-center gap-2 rounded-[11px] px-4 text-[11px] font-semibold text-white"
              >
                <Settings2 size={14} />
                Configurar fidelización
              </button>
            </div>
          </div>
        </header>

        {!activeProgram ? (
          <EmptyProgram
            onConfigure={() => setSettingsOpen(true)}
          />
        ) : (
          <main className="pb-10">
            <section className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <MetricCard
                icon={<Users size={16} />}
                label="Clientes"
                value={stats.customers}
              />

              <MetricCard
                icon={<TrendingUp size={16} />}
                label="Clientes con puntos"
                value={stats.activeCustomers}
              />

              <MetricCard
                icon={<Sparkles size={16} />}
                label="Puntos en circulación"
                value={stats.points}
                accent
              />

              <MetricCard
                icon={<Gift size={16} />}
                label="Beneficios disponibles"
                value={stats.available}
                accent
              />
            </section>

            <section className="mb-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,.85fr)]">
              <div className="panel panel-hover p-5 sm:p-6">
                <div className="relative flex flex-col gap-5">
                  <div className="flex items-start justify-between gap-4">
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
                        Los puntos se definen por servicio y los beneficios por
                        cantidad de puntos.
                      </p>
                    </div>
                    <Gift size={17} className="text-[#ff6a18]" />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <InfoBlock label="Reglas">
                      <strong className="page-number text-[30px] font-semibold tracking-[-.055em] text-white">
                        {serviceRulesCount}
                      </strong>
                      <span className="mt-1 block text-[13px] text-white/62">
                        servicios configurados
                      </span>
                    </InfoBlock>

                    <InfoBlock label="Beneficios">
                      <strong className="page-number text-[30px] font-semibold tracking-[-.055em] text-white">
                        {activeRewards.length}
                      </strong>
                      <span className="mt-1 block text-[13px] text-white/62">
                        beneficios activos
                      </span>
                    </InfoBlock>

                    <InfoBlock label="Cobertura">
                      <strong className="page-number text-[30px] font-semibold tracking-[-.055em] text-white">
                        {services.length === 0
                          ? 0
                          : Math.round(
                              (serviceRulesCount / services.length) * 100
                            )}
                        %
                      </strong>
                      <span className="mt-1 block text-[13px] text-white/62">
                        servicios con puntos
                      </span>
                    </InfoBlock>
                  </div>

                  {servicesWithoutRules > 0 && (
                    <div className="rounded-xl border border-[#ff5a00]/15 bg-[#ff5a00]/[.035] px-4 py-3">
                      <p className="text-[12px] leading-5 text-white/68">
                        Hay{" "}
                        <span className="font-semibold text-[#ff9a66]">
                          {servicesWithoutRules}
                        </span>{" "}
                        {servicesWithoutRules === 1 ? "servicio" : "servicios"}{" "}
                        activo{servicesWithoutRules === 1 ? "" : "s"} sin regla
                        de puntos.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="panel panel-hover p-5 sm:p-6">
                <div className="relative mb-5 flex items-start justify-between gap-4">
                  <div>
                    <div className="meta-label mb-2 text-[#ff6a18]">
                      Próximo beneficio
                    </div>
                    <h2 className="display text-[22px] font-semibold tracking-[-.04em] text-white">
                      Escalera de recompensas
                    </h2>
                    <p className="mt-1 text-[14px] text-white/70">
                      Beneficios ordenados por puntos requeridos.
                    </p>
                  </div>
                  <Award size={17} className="text-[#ff6a18]" />
                </div>

                {activeRewards.length === 0 ? (
                  <EmptyInline
                    icon={<Gift size={17} />}
                    title="Todavía no hay beneficios"
                    text="Creá el primero desde la configuración."
                  />
                ) : (
                  <div className="space-y-2.5">
                    {activeRewards.slice(0, 4).map((reward) => (
                      <div
                        key={reward.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-white/[.06] bg-white/[.018] px-3.5 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-white/86">
                            {reward.name}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-white/50">
                            {reward.description || "Beneficio configurado"}
                          </p>
                        </div>
                        <span className="data shrink-0 text-[12px] font-semibold text-[#ff8b4a]">
                          {reward.points_required} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="panel mb-5 overflow-hidden">
              <div className="border-b hairline px-5 py-5 sm:px-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div>
                    <div className="meta-label text-[#ff6a18]">
                      Seguimiento de clientes
                    </div>
                    <h2 className="display mt-2 text-[22px] font-semibold tracking-[-.04em] text-white">
                      Puntos y progreso
                    </h2>
                    <p className="mt-1 text-[14px] text-white/68">
                      Saldo real, beneficios alcanzables y próxima oportunidad
                      de retorno.
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
                        active={filter === "activos"}
                        count={filterCounts.activos}
                        onClick={() => setFilter("activos")}
                      >
                        Con puntos
                      </FilterButton>
                      <FilterButton
                        active={filter === "cerca"}
                        count={filterCounts.cerca}
                        onClick={() => setFilter("cerca")}
                      >
                        Cerca
                      </FilterButton>
                      <FilterButton
                        active={filter === "beneficio"}
                        count={filterCounts.beneficio}
                        onClick={() => setFilter("beneficio")}
                      >
                        Beneficio
                      </FilterButton>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden grid-cols-[minmax(260px,1.4fr)_minmax(180px,1fr)_110px_145px_24px] gap-5 border-b hairline px-5 py-3 sm:grid sm:px-6">
                <span className="meta-label text-white/48">Cliente</span>
                <span className="meta-label text-white/48">Próximo beneficio</span>
                <span className="meta-label text-white/48">Puntos</span>
                <span className="meta-label text-white/48">Estado</span>
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
                    const hasReward = item.availableRewards > 0;
                    const close =
                      !hasReward &&
                      item.pointsToNextReward !== null &&
                      item.pointsToNextReward <= 20;

                    return (
                      <button
                        key={item.customer.id}
                        type="button"
                        onClick={() => setSelectedId(item.customer.id)}
                        className="customer-row group grid w-full grid-cols-1 gap-4 px-5 py-5 text-left sm:grid-cols-[minmax(260px,1.4fr)_minmax(180px,1fr)_110px_145px_24px] sm:items-center sm:gap-5 sm:px-6"
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
                          {item.nextReward ? (
                            <>
                              <div className="mb-2 flex items-center justify-between gap-3">
                                <span className="truncate text-[12px] font-medium text-white/76">
                                  {item.nextReward.name}
                                </span>
                                <span className="data text-[10px] text-white/54">
                                  {item.progress}%
                                </span>
                              </div>
                              <div className="progress-track h-1.5 overflow-hidden rounded-full">
                                <div
                                  className="progress-fill h-full rounded-full transition-all duration-500"
                                  style={{ width: `${item.progress}%` }}
                                />
                              </div>
                              <p className="mt-2 text-[11px] text-white/52">
                                Faltan {item.pointsToNextReward} pts
                              </p>
                            </>
                          ) : activeRewards.length > 0 ? (
                            <p className="text-[12px] font-medium text-[#ff9a66]">
                              Alcanzó todos los beneficios activos
                            </p>
                          ) : (
                            <p className="text-[12px] text-white/48">
                              Configurá beneficios para mostrar progreso
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between sm:block">
                          <span className="meta-label text-white/45">Saldo</span>
                          <p className="page-number mt-1 text-[20px] font-semibold tracking-[-.045em] text-white sm:mt-2">
                            {item.points}
                            <span className="ml-1 text-[10px] text-white/38">
                              pts
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:block">
                          <span className="meta-label text-white/45">Estado</span>
                          <div className="mt-1 flex items-center gap-2 sm:mt-2">
                            {hasReward ? (
                              <>
                                <Gift size={13} className="text-[#ff6a18]" />
                                <span className="data text-[11px] font-semibold text-[#ff9a66]">
                                  {item.availableRewards} disponible
                                  {item.availableRewards === 1 ? "" : "s"}
                                </span>
                              </>
                            ) : close ? (
                              <span className="data text-[11px] font-semibold text-[#ff9a66]">
                                Cerca
                              </span>
                            ) : (
                              <span className="data text-[11px] text-white/54">
                                {item.points > 0 ? "Activo" : "Sin puntos"}
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

            <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(300px,.75fr)]">
              <div className="panel panel-hover p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="meta-label mb-2 text-[#ff6a18]">
                      Configuración
                    </div>
                    <h2 className="display text-[22px] font-semibold tracking-[-.04em] text-white">
                      Puntos por servicio
                    </h2>
                    <p className="mt-1 text-[14px] text-white/70">
                      Reglas que determinan cuántos puntos genera cada servicio.
                    </p>
                  </div>
                  <Settings2 size={16} className="text-white/42" />
                </div>

                <div className="mt-6 space-y-3">
                  {services.length === 0 ? (
                    <p className="text-[13px] text-white/58">
                      No hay servicios activos.
                    </p>
                  ) : (
                    services.slice(0, 5).map((service) => {
                      const rule = activeRules.find(
                        (x) => x.service_id === service.id
                      );

                      return (
                        <div
                          key={service.id}
                          className="flex items-center justify-between gap-4 rounded-xl border border-white/[.06] bg-white/[.018] px-3.5 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-semibold text-white/84">
                              {service.name}
                            </p>
                            <p className="mt-1 text-[11px] text-white/48">
                              {rule
                                ? "Regla activa"
                                : "Sin puntos configurados"}
                            </p>
                          </div>
                          <span
                            className={`data shrink-0 text-[13px] font-semibold ${
                              rule ? "text-[#ff8b4a]" : "text-white/35"
                            }`}
                          >
                            {rule ? `${rule.points} pts` : "—"}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setSettingsOpen(true)}
                  className="control mt-5 flex w-full items-center justify-center gap-2 rounded-[11px] py-2.5 text-[12px] font-semibold text-white/72"
                >
                  <Settings2 size={14} />
                  Editar reglas
                </button>
              </div>

              <div className="panel panel-hover p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="meta-label mb-2 text-[#ff6a18]">
                      Beneficios
                    </div>
                    <h2 className="display text-[22px] font-semibold tracking-[-.04em] text-white">
                      Catálogo de recompensas
                    </h2>
                    <p className="mt-1 text-[14px] text-white/70">
                      Beneficios que Manu puede crear y modificar.
                    </p>
                  </div>
                  <Gift size={16} className="text-[#ff6a18]" />
                </div>

                <div className="mt-6 space-y-3">
                  {activeRewards.length === 0 ? (
                    <EmptyInline
                      icon={<Gift size={17} />}
                      title="Sin beneficios"
                      text="Creá uno para empezar a definir la escalera."
                    />
                  ) : (
                    activeRewards.slice(0, 4).map((reward) => (
                      <button
                        key={reward.id}
                        type="button"
                        onClick={() => {
                          setEditingReward(reward);
                          setRewardOpen(true);
                        }}
                        className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/[.06] bg-white/[.018] px-3.5 py-3 text-left transition hover:border-[#ff5a00]/20 hover:bg-white/[.03]"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-white/84">
                            {reward.name}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-white/48">
                            {reward.description || "Sin descripción"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="data text-[12px] font-semibold text-[#ff8b4a]">
                            {reward.points_required} pts
                          </p>
                          <Pencil size={12} className="ml-auto mt-1 text-white/30" />
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setEditingReward(null);
                    setRewardOpen(true);
                  }}
                  className="primary mt-5 flex w-full items-center justify-center gap-2 rounded-[11px] py-2.5 text-[12px] font-semibold text-white"
                >
                  <Plus size={14} />
                  Crear beneficio
                </button>
              </div>

              <div className="panel panel-hover p-5 sm:p-6">
                <div className="meta-label mb-2 text-[#ff6a18]">
                  Actividad
                </div>
                <h2 className="display text-[22px] font-semibold tracking-[-.04em] text-white">
                  Movimiento reciente
                </h2>
                <p className="mt-1 text-[14px] text-white/70">
                  Últimos movimientos registrados en el sistema.
                </p>

                <div className="mt-6 space-y-3">
                  {transactions.length === 0 ? (
                    <p className="text-[13px] leading-6 text-white/58">
                      Todavía no hay movimientos. Cuando existan turnos
                      completados y movimientos de puntos, aparecerán acá.
                    </p>
                  ) : (
                    transactions.slice(0, 5).map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-start justify-between gap-3 border-b border-white/[.055] pb-3 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-white/78">
                            {tx.description || transactionLabel(tx.transaction_type)}
                          </p>
                          <p className="mt-1 text-[10px] text-white/42">
                            {formatDateTime(tx.created_at)}
                          </p>
                        </div>
                        <span
                          className={`data shrink-0 text-[11px] font-semibold ${
                            tx.points_delta >= 0
                              ? "text-[#ff9a66]"
                              : "text-white/58"
                          }`}
                        >
                          {tx.points_delta >= 0 ? "+" : ""}
                          {tx.points_delta} pts
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </main>
        )}
      </div>

      {selected && (
        <CustomerDrawer
          item={selected}
          rewards={activeRewards}
          transactions={transactions}
          onClose={() => setSelectedId(null)}
        />
      )}

      {settingsOpen && (
        <LoyaltySettingsModal
          program={activeProgram}
          services={services}
          rules={rules}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            setSettingsOpen(false);
            setToast("Configuración de fidelización actualizada.");
            loadData(true);
          }}
          supabase={supabase}
        />
      )}

      {rewardOpen && activeProgram && (
        <RewardModal
          program={activeProgram}
          reward={editingReward}
          onClose={() => {
            setRewardOpen(false);
            setEditingReward(null);
          }}
          onSaved={() => {
            setRewardOpen(false);
            setEditingReward(null);
            setToast(
              editingReward
                ? "Beneficio actualizado."
                : "Beneficio creado."
            );
            loadData(true);
          }}
          supabase={supabase}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] max-w-[360px] rounded-xl border border-white/[0.09] bg-[#141414] px-4 py-3 text-[13px] font-medium text-white/82 shadow-2xl">
          {toast}
        </div>
      )}
    </main>
  );
}

function transactionLabel(type: string) {
  const value = type.toLowerCase();
  if (value.includes("earn") || value.includes("credit")) return "Puntos ganados";
  if (value.includes("redeem") || value.includes("debit")) return "Canje de beneficio";
  if (value.includes("adjust")) return "Ajuste de puntos";
  return "Movimiento de puntos";
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

function EmptyInline({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-white/[.06] bg-white/[.018] p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[.07] bg-white/[.025] text-white/42">
          {icon}
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white/80">{title}</p>
          <p className="mt-1 text-[11px] leading-5 text-white/48">{text}</p>
        </div>
      </div>
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
  rewards,
  transactions,
  onClose,
}: {
  item: LoyaltyCustomer;
  rewards: LoyaltyReward[];
  transactions: LoyaltyTransaction[];
  onClose: () => void;
}) {
  const customerTransactions = transactions
    .filter((tx) => tx.loyalty_account_id === item.account?.id)
    .slice(0, 12);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-[470px] overflow-y-auto border-l border-white/[.08] bg-[#0b0b0b] shadow-2xl"
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

          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Saldo" value={item.points} accent />
            <MiniStat label="Visitas" value={item.visits} />
            <MiniStat
              label="Beneficios"
              value={item.availableRewards}
              accent
            />
            <MiniStat
              label="Canjeados"
              value={item.account?.rewards_redeemed || 0}
            />
          </div>

          <div className="panel p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="meta-label text-[#ff6a18]">Próximo beneficio</p>
                {item.nextReward ? (
                  <>
                    <p className="mt-2 text-[17px] font-semibold text-white/90">
                      {item.nextReward.name}
                    </p>
                    <p className="mt-1 text-[12px] text-white/54">
                      {item.nextReward.points_required} puntos requeridos
                    </p>
                  </>
                ) : rewards.length > 0 ? (
                  <p className="mt-2 text-[14px] font-semibold text-[#ff9a66]">
                    Todos los beneficios activos alcanzados
                  </p>
                ) : (
                  <p className="mt-2 text-[14px] text-white/54">
                    No hay beneficios configurados.
                  </p>
                )}
              </div>

              {item.pointsToNextReward !== null && (
                <div className="text-right">
                  <p className="text-[12px] text-white/58">Faltan</p>
                  <p className="page-number mt-1 text-[22px] font-semibold text-[#ff6a18]">
                    {item.pointsToNextReward}
                    <span className="ml-1 text-[10px] text-white/42">pts</span>
                  </p>
                </div>
              )}
            </div>

            {item.nextReward && (
              <>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#202020]">
                  <div
                    className="h-full rounded-full bg-[#ff5a00]"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="data text-[10px] text-white/45">
                    {item.points} pts
                  </span>
                  <span className="data text-[10px] text-white/45">
                    {item.nextReward.points_required} pts
                  </span>
                </div>
              </>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="meta-label text-[#ff6a18]">Historial</p>
                <p className="mt-1 text-[13px] text-white/62">
                  Movimientos de puntos de este cliente.
                </p>
              </div>
              <History size={15} className="text-white/35" />
            </div>

            <div className="rounded-[16px] border border-white/[.07] bg-[#111] p-4">
              {customerTransactions.length === 0 ? (
                <p className="text-[12px] leading-6 text-white/50">
                  Todavía no hay movimientos registrados para este cliente.
                </p>
              ) : (
                <div className="space-y-3">
                  {customerTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-start justify-between gap-3 border-b border-white/[.055] pb-3 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-white/78">
                          {tx.description || transactionLabel(tx.transaction_type)}
                        </p>
                        <p className="mt-1 text-[10px] text-white/42">
                          {formatDateTime(tx.created_at)}
                        </p>
                      </div>
                      <span
                        className={`data shrink-0 text-[11px] font-semibold ${
                          tx.points_delta >= 0
                            ? "text-[#ff9a66]"
                            : "text-white/58"
                        }`}
                      >
                        {tx.points_delta >= 0 ? "+" : ""}
                        {tx.points_delta} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
        {value.toLocaleString("es-AR")}
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

        <h2 className="display mt-6 text-[24px] font-semibold tracking-[-.04em] text-white">
          Activá tu programa de fidelización
        </h2>

        <p className="mt-3 text-[14px] leading-6 text-white/64">
          Creá el programa, definí los puntos por servicio y después agregá los
          beneficios que quieras. No necesitás decidir ahora los valores
          definitivos.
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

function LoyaltySettingsModal({
  program,
  services,
  rules,
  onClose,
  onSaved,
  supabase,
}: {
  program: LoyaltyProgram | null;
  services: Service[];
  rules: LoyaltyServiceRule[];
  onClose: () => void;
  onSaved: () => void;
  supabase: ReturnType<typeof createClient>;
}) {
  const [name, setName] = useState(program?.name || "Programa de Fidelización");
  const [description, setDescription] = useState(program?.description || "");
  const [points, setPoints] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const next: Record<string, string> = {};
    services.forEach((service) => {
      const rule = rules.find((x) => x.service_id === service.id);
      next[service.id] = rule ? String(rule.points) : "";
    });
    setPoints(next);
  }, [services, rules]);

  async function save() {
    setError("");

    if (!name.trim()) {
      setError("El nombre del programa es obligatorio.");
      return;
    }

    if (!program) {
      setError(
        "No hay un programa activo. Creá primero el programa base desde Supabase."
      );
      return;
    }

    setSaving(true);

    const { error: programError } = await supabase
      .from("loyalty_programs")
      .update({
        name: name.trim(),
        description: description.trim() || null,
      })
      .eq("id", program.id);

    if (programError) {
      console.error(programError);
      setError(programError.message || "No se pudo actualizar el programa.");
      setSaving(false);
      return;
    }

    for (const service of services) {
      const raw = points[service.id]?.trim() || "";
      if (!raw) {
        const existing = rules.find((x) => x.service_id === service.id);
        if (existing) {
          const { error: deactivateError } = await supabase
            .from("loyalty_service_rules")
            .update({ active: false })
            .eq("id", existing.id);

          if (deactivateError) {
            console.error(deactivateError);
            setError("No se pudo actualizar una regla de puntos.");
            setSaving(false);
            return;
          }
        }
        continue;
      }

      const numeric = Number(raw);

      if (!Number.isInteger(numeric) || numeric < 0) {
        setError(`Los puntos de "${service.name}" deben ser un entero igual o mayor a 0.`);
        setSaving(false);
        return;
      }

      const existing = rules.find((x) => x.service_id === service.id);

      if (existing) {
        const { error: updateError } = await supabase
          .from("loyalty_service_rules")
          .update({
            points: numeric,
            active: true,
          })
          .eq("id", existing.id);

        if (updateError) {
          console.error(updateError);
          setError(`No se pudo actualizar "${service.name}".`);
          setSaving(false);
          return;
        }
      } else {
        const { error: insertError } = await supabase
          .from("loyalty_service_rules")
          .insert({
            loyalty_program_id: program.id,
            service_id: service.id,
            points: numeric,
            active: true,
          });

        if (insertError) {
          console.error(insertError);
          setError(`No se pudo crear la regla para "${service.name}".`);
          setSaving(false);
          return;
        }
      }
    }

    setSaving(false);
    onSaved();
  }

  const inputClass =
    "control h-11 w-full rounded-[11px] px-3 text-[13px] text-white outline-none focus:border-[#ff5a00]/35";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4 sm:p-6 backdrop-blur-[4px]">
      <div className="w-full max-w-[700px] max-h-[90vh] overflow-y-auto rounded-[16px] border border-white/[.08] bg-[#0d0d0d] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[.06] bg-[#0d0d0d]/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="meta-label text-[#ff6a18]">Fidelización</p>
            <h2 className="display mt-2 text-[20px] font-semibold text-white">
              Configurar programa
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

        <div className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre del programa">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Ej. Don Segundo Rewards"
              />
            </Field>

            <Field label="Descripción">
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputClass}
                placeholder="Ej. Sumá puntos en cada visita"
              />
            </Field>
          </div>

          <div>
            <div className="mb-4">
              <p className="meta-label text-[#ff6a18]">Reglas por servicio</p>
              <p className="mt-2 text-[13px] leading-6 text-white/60">
                Definí cuántos puntos suma cada servicio. Dejá vacío un servicio
                si todavía no querés asignarle puntos.
              </p>
            </div>

            <div className="overflow-hidden rounded-[14px] border border-white/[.07]">
              {services.length === 0 ? (
                <div className="p-5 text-[13px] text-white/55">
                  No hay servicios activos para configurar.
                </div>
              ) : (
                services.map((service, index) => (
                  <div
                    key={service.id}
                    className={`grid grid-cols-[minmax(0,1fr)_120px] items-center gap-4 px-4 py-4 ${
                      index > 0 ? "border-t border-white/[.055]" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-white/84">
                        {service.name}
                      </p>
                      <p className="mt-1 text-[11px] text-white/45">
                        {service.duration_minutes} min ·{" "}
                        {service.price.toLocaleString("es-AR")}{" "}
                        {service.currency || "ARS"}
                      </p>
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={points[service.id] || ""}
                        onChange={(e) =>
                          setPoints((current) => ({
                            ...current,
                            [service.id]: e.target.value,
                          }))
                        }
                        className={`${inputClass} pr-12 text-right data`}
                        placeholder="0"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 data text-[9px] text-white/35">
                        PTS
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/[.06] bg-white/[.018] px-4 py-3">
            <p className="text-[12px] leading-5 text-white/58">
              Los cambios de puntos afectan las reglas para nuevos movimientos.
              El historial de puntos ya registrado debe conservar el valor que
              tenía cuando se generó.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-300/10 bg-red-300/[.04] px-4 py-3 text-[12px] leading-5 text-red-200/80">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
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
              {saving ? "Guardando..." : "Guardar configuración"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RewardModal({
  program,
  reward,
  onClose,
  onSaved,
  supabase,
}: {
  program: LoyaltyProgram;
  reward: LoyaltyReward | null;
  onClose: () => void;
  onSaved: () => void;
  supabase: ReturnType<typeof createClient>;
}) {
  const [name, setName] = useState(reward?.name || "");
  const [description, setDescription] = useState(reward?.description || "");
  const [points, setPoints] = useState(
    String(reward?.points_required ?? 100)
  );
  const [active, setActive] = useState(reward?.active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");

    const numeric = Number(points);

    if (!name.trim()) {
      setError("El nombre del beneficio es obligatorio.");
      return;
    }

    if (!Number.isInteger(numeric) || numeric <= 0) {
      setError("Los puntos requeridos deben ser un entero mayor a 0.");
      return;
    }

    setSaving(true);

    const payload = {
      loyalty_program_id: program.id,
      name: name.trim(),
      description: description.trim() || null,
      points_required: numeric,
      active,
    };

    const result = reward
      ? await supabase
          .from("loyalty_rewards")
          .update(payload)
          .eq("id", reward.id)
      : await supabase.from("loyalty_rewards").insert(payload);

    if (result.error) {
      console.error(result.error);
      setError(result.error.message || "No se pudo guardar el beneficio.");
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
  }

  const inputClass =
    "control h-11 w-full rounded-[11px] px-3 text-[13px] text-white outline-none focus:border-[#ff5a00]/35";

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/75 p-4 sm:p-6 backdrop-blur-[4px]">
      <div className="w-full max-w-[520px] overflow-hidden rounded-[16px] border border-white/[.08] bg-[#0d0d0d] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[.06] px-6 py-5">
          <div>
            <p className="meta-label text-[#ff6a18]">Beneficios</p>
            <h2 className="display mt-2 text-[20px] font-semibold text-white">
              {reward ? "Editar beneficio" : "Nuevo beneficio"}
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
          <Field label="Nombre">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Ej. Corte gratis"
            />
          </Field>

          <Field label="Descripción">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} h-24 resize-none py-3`}
              placeholder="Ej. Canjeable por un corte clásico"
            />
          </Field>

          <Field label="Puntos requeridos">
            <div className="relative">
              <input
                type="number"
                min={1}
                step={1}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className={`${inputClass} pr-14 data`}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 data text-[9px] text-white/35">
                PTS
              </span>
            </div>
          </Field>

          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-white/[.07] bg-white/[.018] px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold text-white/80">
                Beneficio activo
              </p>
              <p className="mt-1 text-[11px] text-white/45">
                Los beneficios inactivos no aparecen en el progreso.
              </p>
            </div>

            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 accent-[#ff5a00]"
            />
          </label>

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
              {saving ? "Guardando..." : "Guardar beneficio"}
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
