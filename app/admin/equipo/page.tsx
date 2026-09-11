// app/admin/equipo/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DM_Mono, Manrope, Sora } from "next/font/google";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheck,
  CircleX,
  DollarSign,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  Scissors,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-barberos-ui" });
const sora = Sora({ subsets: ["latin"], display: "swap", variable: "--font-barberos-display" });
const dmMono = DM_Mono({ subsets: ["latin"], display: "swap", weight: ["400", "500"], variable: "--font-barberos-data" });

type Barber = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

type Appointment = {
  id: string;
  barber_id: string;
  start_at: string;
  end_at: string;
  status: string;
  service: { name: string; price: number } | null;
};

type BarberStats = Barber & {
  appointmentsCount: number;
  completedAppointments: number;
  revenue: number;
  averageTicket: number;
  lastAppointment: string | null;
  recentAppointments: number;
  recentRevenue: number;
  previousRecentAppointments: number;
  previousRecentRevenue: number;
  growth: number;
  revenueShare: number;
  services: string[];
};

type Filter = "all" | "active" | "inactive";

function money(value: number) {
  return `$${value.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function dateTime(value: string | null) {
  if (!value) return "Sin actividad";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function dateOnly(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function percentage(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export default function EquipoPage() {
  const supabase = createClient();

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selected, setSelected] = useState<BarberStats | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadTeam(refresh = false) {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError("");

    const [{ data: barberData, error: barberError }, { data: appointmentData, error: appointmentError }] =
      await Promise.all([
        supabase.from("barbers").select("id, name, active, created_at").order("name", { ascending: true }),
        supabase.from("appointments").select(`
          id,
          barber_id,
          start_at,
          end_at,
          status,
          service:services ( name, price )
        `).order("start_at", { ascending: false }),
      ]);

    if (barberError || appointmentError) {
      console.error("Error loading team", { barberError, appointmentError });
      setError("No se pudo cargar la información del equipo.");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setBarbers((barberData ?? []) as Barber[]);
    setAppointments((appointmentData ?? []) as unknown as Appointment[]);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadTeam();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const team = useMemo<BarberStats[]>(() => {
    const now = new Date();
    const currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - 30);
    const previousStart = new Date(now);
    previousStart.setDate(previousStart.getDate() - 60);

    const valid = appointments.filter((item) => item.status !== "cancelled");
    const totalRevenue = valid
      .filter((item) => item.status === "completed")
      .reduce((sum, item) => sum + Number(item.service?.price ?? 0), 0);

    return barbers.map((barber) => {
      const own = valid.filter((item) => item.barber_id === barber.id);
      const completed = own.filter((item) => item.status === "completed");
      const revenue = completed.reduce((sum, item) => sum + Number(item.service?.price ?? 0), 0);
      const recent = own.filter((item) => new Date(item.start_at) >= currentStart);
      const previous = own.filter((item) => {
        const date = new Date(item.start_at);
        return date >= previousStart && date < currentStart;
      });
      const recentRevenue = recent
        .filter((item) => item.status === "completed")
        .reduce((sum, item) => sum + Number(item.service?.price ?? 0), 0);
      const previousRevenue = previous
        .filter((item) => item.status === "completed")
        .reduce((sum, item) => sum + Number(item.service?.price ?? 0), 0);
      const services = Array.from(
        new Set(own.map((item) => item.service?.name).filter((name): name is string => Boolean(name)))
      );

      return {
        ...barber,
        appointmentsCount: own.length,
        completedAppointments: completed.length,
        revenue,
        averageTicket: completed.length ? revenue / completed.length : 0,
        lastAppointment: own[0]?.start_at ?? null,
        recentAppointments: recent.length,
        recentRevenue,
        previousRecentAppointments: previous.length,
        previousRecentRevenue: previousRevenue,
        growth: percentage(recentRevenue, previousRevenue),
        revenueShare: totalRevenue ? (revenue / totalRevenue) * 100 : 0,
        services,
      };
    });
  }, [barbers, appointments]);

  const ranked = useMemo(() => [...team].sort((a, b) => b.revenue - a.revenue), [team]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return team.filter((barber) => {
      const searchMatch = !term || barber.name.toLowerCase().includes(term);
      const filterMatch =
        filter === "all" ||
        (filter === "active" && barber.active) ||
        (filter === "inactive" && !barber.active);
      return searchMatch && filterMatch;
    });
  }, [team, search, filter]);

  const activeCount = team.filter((item) => item.active).length;
  const inactiveCount = team.length - activeCount;
  const totalAppointments = team.reduce((sum, item) => sum + item.appointmentsCount, 0);
  const completedAppointments = team.reduce((sum, item) => sum + item.completedAppointments, 0);
  const totalRevenue = team.reduce((sum, item) => sum + item.revenue, 0);
  const averageTicket = completedAppointments ? totalRevenue / completedAppointments : 0;
  const top = ranked[0] ?? null;

  async function createBarber() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);

    const { data, error: insertError } = await supabase
      .from("barbers")
      .insert({ name, active: true })
      .select("id, name, active, created_at")
      .single();

    if (insertError) {
      console.error(insertError);
      setToast("No se pudo crear el profesional.");
      setSaving(false);
      return;
    }

    setBarbers((current) => [...current, data as Barber].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName("");
    setCreateOpen(false);
    setToast("Profesional creado correctamente.");
    setSaving(false);
  }

  async function updateBarber() {
    if (!selected) return;
    const name = editName.trim();
    if (!name) return;
    setSaving(true);

    const { data, error: updateError } = await supabase
      .from("barbers")
      .update({ name })
      .eq("id", selected.id)
      .select("id, name, active, created_at")
      .single();

    if (updateError) {
      console.error(updateError);
      setToast("No se pudo actualizar el profesional.");
      setSaving(false);
      return;
    }

    setBarbers((current) => current.map((item) => item.id === selected.id ? (data as Barber) : item));
    setSelected((current) => current ? { ...current, name: data.name } : current);
    setEditOpen(false);
    setToast("Perfil actualizado.");
    setSaving(false);
  }

  async function toggleBarber() {
    if (!selected) return;
    const nextActive = !selected.active;

    const { data, error: updateError } = await supabase
      .from("barbers")
      .update({ active: nextActive })
      .eq("id", selected.id)
      .select("id, name, active, created_at")
      .single();

    if (updateError) {
      console.error(updateError);
      setToast("No se pudo actualizar el estado.");
      return;
    }

    setBarbers((current) => current.map((item) => item.id === selected.id ? (data as Barber) : item));
    setSelected((current) => current ? { ...current, active: data.active } : current);
    setToast(data.active ? "Profesional activado." : "Profesional desactivado.");
  }

  return (
    <div className={`${manrope.variable} ${sora.variable} ${dmMono.variable} barberos-page min-h-screen bg-[#070707] text-[#f5f5f4]`}>
      <style jsx>{`
        .barberos-page {
          --line: rgba(255,255,255,.075);
          --line-soft: rgba(255,255,255,.045);
          --orange: #ff5a00;
          --orange-bright: #ff7a22;
          font-family: var(--font-barberos-ui), Manrope, sans-serif;
          font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          letter-spacing: -.014em;
        }
        .display { font-family: var(--font-barberos-display), Sora, sans-serif; }
        .data {
          font-family: var(--font-barberos-data), DM Mono, monospace;
          font-variant-numeric: tabular-nums lining-nums;
        }
        .panel {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 16px;
          background:
            linear-gradient(145deg,rgba(255,255,255,.028),rgba(255,255,255,.010) 52%,rgba(255,90,0,.012)),
            rgba(10,10,10,.96);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.022), 0 18px 58px rgba(0,0,0,.15);
          transition: transform 240ms cubic-bezier(.22,.61,.36,1), border-color 240ms ease, box-shadow 240ms ease;
        }
        .panel::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: radial-gradient(420px 220px at 90% -10%, rgba(255,90,0,.045), transparent 70%);
        }
        .panel-hover:hover {
          transform: translateY(-1px);
          border-color: rgba(255,90,0,.14);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.03), 0 24px 70px rgba(0,0,0,.22);
        }
        .control {
          border: 1px solid rgba(255,255,255,.07);
          background: rgba(255,255,255,.025);
          transition: all .18s ease;
        }
        .control:hover { border-color: rgba(255,255,255,.13); background: rgba(255,255,255,.045); }
        .control:focus { outline: none; border-color: rgba(255,90,0,.4); box-shadow: 0 0 0 3px rgba(255,90,0,.07); }
        .primary { background: #ff5a00; box-shadow: 0 10px 28px rgba(255,90,0,.12); transition: all .18s ease; }
        .primary:hover { background: #ff6a18; transform: translateY(-1px); box-shadow: 0 14px 34px rgba(255,90,0,.2); }
        .hairline { border-color: var(--line-soft); }
        .row-hover { transition: background .18s ease; }
        .row-hover:hover { background: rgba(255,255,255,.018); }
        .bar-track { background: rgba(255,255,255,.045); }
        .bar-fill { background: linear-gradient(90deg,#ff5a00,#ff7a22); }
      `}</style>

      <div className="relative mx-auto max-w-[1680px] px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
        <header className="mb-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/82">BarberOS</span>
                <span className="text-white/10">/</span>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff6a18]">Inteligencia de Equipo</span>
                <span className="ml-1 hidden h-px w-10 bg-gradient-to-r from-orange-500/55 to-transparent sm:block" />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <h1 className="display text-[34px] font-semibold leading-[.91] tracking-[-.075em] text-white sm:text-[42px]">Equipo</h1>
              </div>
              <p className="mt-2 max-w-xl text-[14px] leading-6 text-white/72">
                Controlá profesionales, capacidad, rendimiento y estado operativo desde un solo lugar.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => loadTeam(true)} aria-label="Actualizar equipo" className="control flex h-10 w-10 items-center justify-center rounded-[11px] text-white/58">
                <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              </button>
              <button type="button" onClick={() => setCreateOpen(true)} className="primary flex h-10 items-center gap-2 rounded-[11px] px-4 text-[11px] font-semibold text-white">
                <Plus size={14} />Nuevo profesional
              </button>
            </div>
          </div>
        </header>

        <main className="pb-10">
          <section className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Metric label="Profesionales" value={team.length.toString()} detail={`${activeCount} activos · ${inactiveCount} inactivos`} icon={<Users size={15} />} />
            <Metric label="Turnos realizados" value={completedAppointments.toString()} detail={`${totalAppointments} registrados en total`} icon={<CalendarDays size={15} />} />
            <Metric label="Ingresos generados" value={money(totalRevenue)} detail="Según turnos completados" icon={<DollarSign size={15} />} accent />
            <Metric label="Ticket promedio" value={money(averageTicket)} detail={top ? `Mejor rendimiento: ${top.name}` : "Sin datos todavía"} icon={<TrendingUp size={15} />} />
          </section>

          {error && (
            <div className="mb-5 flex items-center justify-between rounded-[12px] border border-red-400/15 bg-red-400/[.05] px-4 py-3 text-[11px] text-red-200">
              <span>{error}</span>
              <button type="button" onClick={() => setError("")}><X size={14} /></button>
            </div>
          )}

          <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,.75fr)]">
            <div className="panel p-5 sm:p-6">
              <div className="relative mb-6 flex items-end justify-between gap-4">
                <div>
                  <div className="data mb-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#ff6a18]">Performance</div>
                  <h2 className="display text-[22px] font-semibold tracking-[-.04em] text-white">Rendimiento del equipo</h2>
                  <p className="mt-1 text-[14px] text-white/70">Ingresos y volumen de trabajo por profesional.</p>
                </div>
                <div className="hidden items-center gap-2 data text-[10px] uppercase tracking-[.12em] text-white/60 sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ff5a00]" />Revenue
                </div>
              </div>

              <div className="relative">
                {ranked.length === 0 ? (
                  <div className="flex h-[250px] items-center justify-center rounded-[12px] border border-dashed border-white/[.07] text-[11px] text-white/64">No hay profesionales registrados.</div>
                ) : (
                  ranked.map((barber, index) => {
                    const max = ranked[0]?.revenue || 1;
                    const width = barber.revenue ? Math.max(5, barber.revenue / max * 100) : 2;
                    return (
                      <button key={barber.id} type="button" onClick={() => setSelected(barber)} className="row-hover group w-full rounded-[12px] p-3 text-left">
                        <div className="flex items-center gap-3">
                          <span className="data w-6 text-[11px] text-white/54">{String(index + 1).padStart(2, "0")}</span>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] border border-[#ff5a00]/15 bg-[#ff5a00]/[.045] text-[12px] font-semibold text-[#ff7a22]">{initials(barber.name)}</div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-[15px] font-semibold text-white/90">{barber.name}</div>
                                <div className="mt-1 flex items-center gap-2 text-[13px] text-white/72">
                                  <span>{barber.completedAppointments} completados</span><span className="h-0.5 w-0.5 rounded-full bg-white/15" /><span>{barber.recentAppointments} últimos 30d</span>
                                </div>
                              </div>
                              <div className="shrink-0 text-right">
                                <div className="data text-[14px] text-white/88">{money(barber.revenue)}</div>
                                <div className="data mt-1 text-[10px] text-white/54">{barber.revenueShare.toFixed(1)}% share</div>
                              </div>
                            </div>
                            <div className="bar-track h-1.5 overflow-hidden rounded-full"><div className="bar-fill h-full rounded-full transition-all duration-500" style={{ width: `${width}%` }} /></div>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="panel p-5 sm:p-6">
              <div className="relative mb-6">
                <div className="data mb-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#ff6a18]">Indicadores</div>
                <h2 className="display text-[22px] font-semibold tracking-[-.04em] text-white">Estado operativo</h2>
                <p className="mt-1 text-[14px] text-white/70">Lectura rápida de capacidad y evolución.</p>
              </div>

              <div className="relative space-y-3">
                <Operational label="Equipo activo" value={`${activeCount}/${team.length}`} percent={team.length ? activeCount / team.length * 100 : 0} />
                <Operational label="Turnos completados" value={`${completedAppointments}/${totalAppointments}`} percent={totalAppointments ? completedAppointments / totalAppointments * 100 : 0} />
                <Operational label="Participación del top" value={top ? `${top.revenueShare.toFixed(1)}%` : "—"} percent={top?.revenueShare ?? 0} />
              </div>

              <div className="relative mt-6 border-t hairline pt-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[11px] border border-white/[.05] bg-white/[.012] p-4">
                    <div className="data text-[9px] uppercase tracking-[.14em] text-white/50">Top performer</div>
                    <div className="display mt-2 truncate text-[18px] font-semibold text-white">{top?.name ?? "—"}</div>
                    <div className="data mt-1 text-[10px] text-[#ff6a18]">{top ? money(top.revenue) : "Sin datos"}</div>
                  </div>
                  <div className="rounded-[11px] border border-white/[.05] bg-white/[.012] p-4">
                    <div className="data text-[9px] uppercase tracking-[.14em] text-white/50">Crecimiento</div>
                    <div className={`display mt-2 text-[24px] font-semibold ${top && top.growth >= 0 ? "text-emerald-200" : "text-white"}`}>{top ? `${top.growth >= 0 ? "+" : ""}${top.growth.toFixed(1)}%` : "—"}</div>
                    <div className="mt-1 text-[10px] text-white/48">últimos 30 días</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="relative border-b hairline p-5 sm:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <div className="data mb-2 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#ff6a18]">Directorio</div>
                  <h2 className="display text-[22px] font-semibold tracking-[-.04em] text-white">Profesionales</h2>
                  <p className="mt-1 text-[14px] text-white/70">Accedé al perfil, rendimiento y acciones de cada miembro.</p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative min-w-[250px]">
                    <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/36" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar profesional..." className="control h-11 w-full rounded-[10px] pl-9 pr-3 text-[12px] text-white/75 placeholder:text-white/34" />
                  </div>
                  <div className="control flex h-11 rounded-[10px] p-1">
                    {(["all", "active", "inactive"] as Filter[]).map((item) => (
                      <button key={item} type="button" onClick={() => setFilter(item)} className={`rounded-[8px] px-3 data text-[9px] font-semibold uppercase tracking-[.12em] ${filter === item ? "bg-white/[.08] text-white" : "text-white/40 hover:text-white/60"}`}>
                        {item === "all" ? "Todos" : item === "active" ? "Activos" : "Inactivos"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((item) => <div key={item} className="h-[225px] animate-pulse rounded-[14px] border border-white/[.05] bg-white/[.015]" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-5 sm:p-6">
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[13px] border border-dashed border-white/[.07] text-center">
                  <Users size={19} className="text-white/32" />
                  <p className="mt-4 text-[12px] font-semibold text-white/60">No encontramos profesionales</p>
                  <p className="mt-1 text-[11px] text-white/72">Modificá la búsqueda o el filtro para ver otros resultados.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((barber) => (
                  <button key={barber.id} type="button" onClick={() => setSelected(barber)} className="panel panel-hover group text-left">
                    <div className="relative p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-[#ff5a00]/15 bg-[#ff5a00]/[.045] text-[12px] font-semibold text-[#ff7a22]">
                            {initials(barber.name)}
                            <span className={`absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-[#0a0a0a] ${barber.active ? "bg-emerald-400" : "bg-white/20"}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="display truncate text-[18px] font-semibold text-white">{barber.name}</div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="data text-[9px] uppercase tracking-[.11em] text-white/48">PROFESIONAL</span>
                              <span className="h-0.5 w-0.5 rounded-full bg-white/15" />
                              <span className={`data text-[7px] uppercase tracking-[.11em] ${barber.active ? "text-emerald-300/75" : "text-white/36"}`}>{barber.active ? "ACTIVO" : "INACTIVO"}</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={14} className="mt-1 shrink-0 text-white/30 transition group-hover:text-[#ff6a18]" />
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <MiniStat label="Turnos" value={String(barber.completedAppointments)} />
                        <MiniStat label="Revenue" value={money(barber.revenue)} />
                        <MiniStat label="Ticket" value={money(barber.averageTicket)} />
                        <MiniStat label="Share" value={`${barber.revenueShare.toFixed(1)}%`} />
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t hairline pt-4">
                        <div>
                          <div className="data text-[10px] uppercase tracking-[.13em] text-white/60">Última actividad</div>
                          <div className="mt-1 text-[11px] text-white/56">{dateTime(barber.lastAppointment)}</div>
                        </div>
                        <div className={`flex items-center gap-1 data text-[10px] ${barber.growth >= 0 ? "text-emerald-300/65" : "text-red-300/60"}`}>
                          {barber.growth >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                          {Math.abs(barber.growth).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/72 backdrop-blur-[3px]">
          <button type="button" aria-label="Cerrar" onClick={() => setSelected(null)} className="absolute inset-0 h-full w-full" />
          <aside className="relative ml-auto h-full w-full max-w-[520px] overflow-y-auto border-l border-white/[.07] bg-[#090909] shadow-2xl">
            <div className="sticky top-0 z-10 border-b hairline bg-[#090909]/95 px-5 py-5 backdrop-blur-xl sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="data text-[8px] font-bold uppercase tracking-[.18em] text-[#ff6a18]">TEAM 360</div>
                  <h2 className="display mt-2 text-[22px] font-semibold tracking-[-.05em] text-white">{selected.name}</h2>
                  <p className="mt-1 text-[11px] text-white/64">Perfil operativo y rendimiento del profesional.</p>
                </div>
                <button type="button" onClick={() => setSelected(null)} className="control flex h-9 w-9 items-center justify-center rounded-[10px] text-white/48"><X size={15} /></button>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="panel p-5">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-[15px] border border-[#ff5a00]/18 bg-[#ff5a00]/[.05] text-[15px] font-semibold text-[#ff7a22]">
                    {initials(selected.name)}
                    <span className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-[#090909] ${selected.active ? "bg-emerald-400" : "bg-white/20"}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="display truncate text-[18px] font-semibold text-white">{selected.name}</div>
                    <div className="mt-1 text-[10px] text-white/64">Profesional del equipo · Alta {dateOnly(selected.created_at)}</div>
                    <div className={`mt-3 flex items-center gap-1.5 data text-[7px] uppercase tracking-[.12em] ${selected.active ? "text-emerald-300/75" : "text-white/36"}`}>
                      {selected.active ? <CircleCheck size={11} /> : <CircleX size={11} />}
                      {selected.active ? "ACTIVO" : "INACTIVO"}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="data mb-3 text-[9px] font-bold uppercase tracking-[.18em] text-[#ff6a18]">Indicadores</div>
                <div className="grid grid-cols-2 gap-3">
                  <DetailStat label="Turnos" value={String(selected.appointmentsCount)} icon={<CalendarDays size={13} />} />
                  <DetailStat label="Completados" value={String(selected.completedAppointments)} icon={<Check size={13} />} />
                  <DetailStat label="Revenue" value={money(selected.revenue)} icon={<DollarSign size={13} />} />
                  <DetailStat label="Ticket promedio" value={money(selected.averageTicket)} icon={<TrendingUp size={13} />} />
                </div>
              </div>

              <div className="panel p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="data text-[9px] font-bold uppercase tracking-[.18em] text-[#ff6a18]">Últimos 30 días</div>
                    <p className="mt-1 text-[10px] text-white/64">Evolución frente a los 30 días anteriores.</p>
                  </div>
                  <span className={`flex items-center gap-1 rounded-full border px-2 py-1 data text-[7px] ${selected.growth >= 0 ? "border-emerald-300/15 bg-emerald-300/[.05] text-emerald-300/75" : "border-red-300/15 bg-red-300/[.05] text-red-300/70"}`}>
                    {selected.growth >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {Math.abs(selected.growth).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-5">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="data text-[7px] uppercase tracking-[.14em] text-white/30">Revenue</div>
                      <div className="display mt-1 text-[25px] font-semibold text-white">{money(selected.recentRevenue)}</div>
                    </div>
                    <div className="text-right">
                      <div className="data text-[7px] uppercase tracking-[.14em] text-white/30">Participación</div>
                      <div className="display mt-1 text-[17px] font-semibold text-white/65">{selected.revenueShare.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="bar-track mt-4 h-1.5 overflow-hidden rounded-full"><div className="bar-fill h-full rounded-full" style={{ width: `${Math.min(100, selected.revenueShare)}%` }} /></div>
                </div>
              </div>

              <div>
                <div className="data mb-3 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.18em] text-[#ff6a18]"><Scissors size={12} />Servicios realizados</div>
                <div className="panel p-4">
                  {selected.services.length ? (
                    <div className="flex flex-wrap gap-2">
                      {selected.services.map((service) => <span key={service} className="rounded-[8px] border border-white/[.06] bg-white/[.025] px-2.5 py-1.5 text-[8px] text-white/60">{service}</span>)}
                    </div>
                  ) : (
                    <p className="text-[9px] text-white/36">No hay servicios registrados.</p>
                  )}
                </div>
              </div>

              <div className="pb-4">
                <div className="data mb-3 text-[9px] font-bold uppercase tracking-[.18em] text-[#ff6a18]">Acciones</div>
                <div className="space-y-2">
                  <button type="button" onClick={() => { setEditName(selected.name); setEditOpen(true); }} className="control flex w-full items-center justify-between rounded-[11px] px-4 py-3.5 text-[10px] font-semibold text-white/70 hover:text-white"><span className="flex items-center gap-2.5"><Pencil size={14} />Editar perfil</span><ChevronRight size={14} /></button>
                  <button type="button" onClick={() => { window.location.href = `/admin/turnos?barber=${selected.id}`; }} className="control flex w-full items-center justify-between rounded-[11px] px-4 py-3.5 text-[10px] font-semibold text-white/70 hover:text-white"><span className="flex items-center gap-2.5"><CalendarDays size={14} />Ver agenda</span><ChevronRight size={14} /></button>
                  <button type="button" onClick={toggleBarber} className={`flex w-full items-center justify-between rounded-[11px] border px-4 py-3.5 text-[10px] font-semibold ${selected.active ? "border-red-400/10 bg-red-400/[.035] text-red-300/75" : "border-emerald-400/10 bg-emerald-400/[.035] text-emerald-300/75"}`}><span className="flex items-center gap-2.5"><Power size={14} />{selected.active ? "Desactivar profesional" : "Activar profesional"}</span><ChevronRight size={14} /></button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {createOpen && (
        <Modal title="Nuevo profesional" eyebrow="Equipo" description="Agregá un profesional al equipo." onClose={() => setCreateOpen(false)}>
          <label className="block">
            <span className="data mb-2 block text-[9px] font-bold uppercase tracking-[.16em] text-white/64">Nombre completo</span>
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createBarber()} placeholder="Ej. Manuel Cladera" className="control h-11 w-full rounded-[11px] px-4 text-[11px] text-white outline-none placeholder:text-white/32" />
          </label>
          <div className="mt-6 flex justify-end gap-2 border-t hairline pt-5">
            <button type="button" onClick={() => setCreateOpen(false)} className="control h-10 rounded-[10px] px-4 text-[9px] font-semibold text-white/60">Cancelar</button>
            <button type="button" disabled={saving || !newName.trim()} onClick={createBarber} className="primary h-10 rounded-[10px] px-4 text-[9px] font-semibold text-white disabled:opacity-35">{saving ? "Guardando..." : "Crear profesional"}</button>
          </div>
        </Modal>
      )}

      {editOpen && selected && (
        <Modal title="Editar perfil" eyebrow="Team 360" description="Actualizá los datos básicos del profesional." onClose={() => setEditOpen(false)}>
          <label className="block">
            <span className="data mb-2 block text-[9px] font-bold uppercase tracking-[.16em] text-white/64">Nombre completo</span>
            <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && updateBarber()} className="control h-11 w-full rounded-[11px] px-4 text-[11px] text-white outline-none" />
          </label>
          <div className="mt-6 flex justify-end gap-2 border-t hairline pt-5">
            <button type="button" onClick={() => setEditOpen(false)} className="control h-10 rounded-[10px] px-4 text-[9px] font-semibold text-white/60">Cancelar</button>
            <button type="button" disabled={saving || !editName.trim()} onClick={updateBarber} className="primary h-10 rounded-[10px] px-4 text-[9px] font-semibold text-white disabled:opacity-35">{saving ? "Guardando..." : "Guardar cambios"}</button>
          </div>
        </Modal>
      )}

      {toast && <div className="fixed bottom-6 right-6 z-[100] rounded-[11px] border border-white/[.08] bg-[#111] px-4 py-3 text-[9px] font-semibold text-white/82 shadow-2xl">{toast}</div>}
    </div>
  );
}

function Metric({ label, value, detail, icon, accent = false }: { label: string; value: string; detail: string; icon: ReactNode; accent?: boolean }) {
  return (
    <div className="panel relative min-h-[150px] p-5">
      {accent && <div className="absolute left-0 top-0 h-px w-1/2 bg-gradient-to-r from-[#ff5a00]/75 to-transparent" />}
      <div className="flex items-start justify-between gap-3">
        <span className="data flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.16em] text-white/64"><span className={accent ? "text-[#ff6a18]" : "text-white/30"}>{icon}</span>{label}</span>
        <span className="data text-[7px] uppercase tracking-[.12em] text-white/27">01</span>
      </div>
      <div className="display mt-7 truncate text-[30px] font-semibold leading-none tracking-[-.065em] text-white">{value}</div>
      <div className="mt-3 truncate text-[10px] text-white/60">{detail}</div>
    </div>
  );
}

function Operational({ label, value, percent }: { label: string; value: string; percent: number }) {
  return (
    <div className="rounded-[11px] border border-white/[.05] bg-white/[.012] p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12px] text-white/68">{label}</span>
        <span className="data text-[10px] text-white/82">{value}</span>
      </div>
      <div className="bar-track h-1.5 overflow-hidden rounded-full"><div className="bar-fill h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} /></div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[10px] border border-white/[.05] bg-[#090909] p-3"><div className="data text-[10px] uppercase tracking-[.13em] text-white/60">{label}</div><div className="display mt-2 truncate text-[18px] font-semibold text-white/88">{value}</div></div>;
}

function DetailStat({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return <div className="panel p-4"><div className="data flex items-center gap-2 text-[8px] uppercase tracking-[.13em] text-white/36">{icon}{label}</div><div className="display mt-3 truncate text-[21px] font-semibold text-white">{value}</div></div>;
}

function Modal({ title, eyebrow, description, onClose, children }: { title: string; eyebrow: string; description: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[440px] overflow-hidden rounded-[16px] border border-white/[.075] bg-[#0b0b0b] p-6 shadow-[0_30px_100px_rgba(0,0,0,.5)]">
        <div className="flex items-start justify-between gap-4">
          <div><div className="data text-[8px] font-bold uppercase tracking-[.16em] text-white/36">{eyebrow}</div><h2 className="display mt-2 text-[22px] font-semibold tracking-[-.04em] text-white">{title}</h2><p className="mt-1 text-[10px] text-white/64">{description}</p></div>
          <button type="button" onClick={onClose} className="control flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-white/44 hover:text-white"><X size={15} /></button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
