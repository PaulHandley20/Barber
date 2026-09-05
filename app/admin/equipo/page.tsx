// app/admin/equipo/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  UserRound,
  CircleCheck,
  CircleX,
  ChevronRight,
  X,
  CalendarDays,
  DollarSign,
  Scissors,
  TrendingUp,
  Users,
  Activity,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Pencil,
  Power,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
  service: {
    name: string;
    price: number;
  } | null;
};

type BarberWithStats = Barber & {
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

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatShortDate(dateString: string | null) {
  if (!dateString) return "Sin actividad";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(dateString));
}

function formatDateTime(dateString: string | null) {
  if (!dateString) return "Sin turnos";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateString));
}

function formatPrice(price: number) {
  return `$${price.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getPercentageChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export default function EquipoPage() {
  const supabase = createClient();

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedBarber, setSelectedBarber] =
    useState<BarberWithStats | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<"all" | "active" | "inactive">("all");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [newName, setNewName] = useState("");
  const [editName, setEditName] = useState("");

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTeam() {
    setLoading(true);
    setError("");

    const [
      { data: barbersData, error: barbersError },
      { data: appointmentsData, error: appointmentsError },
    ] = await Promise.all([
      supabase
        .from("barbers")
        .select("id, name, active, created_at")
        .order("name", { ascending: true }),

      supabase
        .from("appointments")
        .select(`
          id,
          barber_id,
          start_at,
          end_at,
          status,
          service:services (
            name,
            price
          )
        `)
        .order("start_at", { ascending: false }),
    ]);

    if (barbersError || appointmentsError) {
      console.error("Error loading team:", {
        barbersError,
        appointmentsError,
      });

      setError("No se pudo cargar la información del equipo.");
      setLoading(false);
      return;
    }

    setBarbers((barbersData ?? []) as Barber[]);
    setAppointments((appointmentsData ?? []) as unknown as Appointment[]);
    setLoading(false);
  }

  useEffect(() => {
    loadTeam();
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => setToast(""), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const team = useMemo<BarberWithStats[]>(() => {
    const now = new Date();
    const currentWindowStart = new Date(now);
    currentWindowStart.setDate(now.getDate() - 30);

    const previousWindowStart = new Date(now);
    previousWindowStart.setDate(now.getDate() - 60);

    const previousWindowEnd = currentWindowStart;

    const valid = appointments.filter(
      (appointment) => appointment.status !== "cancelled"
    );

    const totalRevenue = valid.reduce(
      (total, appointment) =>
        total + Number(appointment.service?.price ?? 0),
      0
    );

    return barbers.map((barber) => {
      const barberAppointments = valid.filter(
        (appointment) => appointment.barber_id === barber.id
      );

      const completedAppointments = barberAppointments.filter(
        (appointment) => appointment.status === "completed"
      );

      const revenue = completedAppointments.reduce(
        (total, appointment) =>
          total + Number(appointment.service?.price ?? 0),
        0
      );

      const recent = barberAppointments.filter(
        (appointment) =>
          new Date(appointment.start_at) >= currentWindowStart
      );

      const previousRecent = barberAppointments.filter((appointment) => {
        const date = new Date(appointment.start_at);
        return (
          date >= previousWindowStart && date < previousWindowEnd
        );
      });

      const recentRevenue = recent
        .filter((appointment) => appointment.status === "completed")
        .reduce(
          (total, appointment) =>
            total + Number(appointment.service?.price ?? 0),
          0
        );

      const previousRecentRevenue = previousRecent
        .filter((appointment) => appointment.status === "completed")
        .reduce(
          (total, appointment) =>
            total + Number(appointment.service?.price ?? 0),
          0
        );

      const lastAppointment =
        barberAppointments.length > 0
          ? barberAppointments[0].start_at
          : null;

      const services = Array.from(
        new Set(
          barberAppointments
            .map((appointment) => appointment.service?.name)
            .filter(Boolean) as string[]
        )
      );

      return {
        ...barber,
        appointmentsCount: barberAppointments.length,
        completedAppointments: completedAppointments.length,
        revenue,
        averageTicket:
          completedAppointments.length > 0
            ? revenue / completedAppointments.length
            : 0,
        lastAppointment,
        recentAppointments: recent.length,
        recentRevenue,
        previousRecentAppointments: previousRecent.length,
        previousRecentRevenue,
        growth: getPercentageChange(
          recentRevenue,
          previousRecentRevenue
        ),
        revenueShare:
          totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
        services,
      };
    });
  }, [barbers, appointments]);

  const filteredTeam = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return team.filter((barber) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        barber.name.toLowerCase().includes(normalizedSearch);

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && barber.active) ||
        (filter === "inactive" && !barber.active);

      return matchesSearch && matchesFilter;
    });
  }, [team, search, filter]);

  const rankedTeam = useMemo(
    () =>
      [...team].sort((a, b) => b.revenue - a.revenue),
    [team]
  );

  const activeBarbers = team.filter((barber) => barber.active).length;
  const inactiveBarbers = team.filter((barber) => !barber.active).length;

  const totalAppointments = team.reduce(
    (total, barber) => total + barber.appointmentsCount,
    0
  );

  const completedAppointments = team.reduce(
    (total, barber) => total + barber.completedAppointments,
    0
  );

  const totalRevenue = team.reduce(
    (total, barber) => total + barber.revenue,
    0
  );

  const averageTicket =
    completedAppointments > 0
      ? totalRevenue / completedAppointments
      : 0;

  const topPerformer = rankedTeam[0] ?? null;

  async function createBarber() {
    const name = newName.trim();

    if (!name) return;

    setSaving(true);

    const { data, error: insertError } = await supabase
      .from("barbers")
      .insert({
        name,
        active: true,
      })
      .select("id, name, active, created_at")
      .single();

    if (insertError) {
      console.error(insertError);
      setToast("No se pudo crear el barbero.");
      setSaving(false);
      return;
    }

    setBarbers((current) =>
      [...current, data as Barber].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    );

    setNewName("");
    setShowCreateModal(false);
    setToast("Barbero creado correctamente.");
    setSaving(false);
  }

  async function updateBarber() {
    if (!selectedBarber) return;

    const name = editName.trim();

    if (!name) return;

    setSaving(true);

    const { data, error: updateError } = await supabase
      .from("barbers")
      .update({ name })
      .eq("id", selectedBarber.id)
      .select("id, name, active, created_at")
      .single();

    if (updateError) {
      console.error(updateError);
      setToast("No se pudo actualizar el barbero.");
      setSaving(false);
      return;
    }

    setBarbers((current) =>
      current.map((barber) =>
        barber.id === selectedBarber.id
          ? (data as Barber)
          : barber
      )
    );

    setSelectedBarber((current) =>
      current
        ? {
            ...current,
            name: data.name,
          }
        : current
    );

    setShowEditModal(false);
    setToast("Perfil actualizado.");
    setSaving(false);
  }

  async function toggleBarber(barber: BarberWithStats) {
    const nextActive = !barber.active;

    const { data, error: updateError } = await supabase
      .from("barbers")
      .update({ active: nextActive })
      .eq("id", barber.id)
      .select("id, name, active, created_at")
      .single();

    if (updateError) {
      console.error(updateError);
      setToast("No se pudo actualizar el estado.");
      return;
    }

    setBarbers((current) =>
      current.map((item) =>
        item.id === barber.id ? (data as Barber) : item
      )
    );

    setSelectedBarber((current) =>
      current
        ? {
            ...current,
            active: data.active,
          }
        : current
    );

    setToast(
      data.active
        ? "Barbero activado."
        : "Barbero desactivado."
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-[#F5F5F4]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 top-0 h-96 w-96 rounded-full bg-[#FF5A00]/[0.045] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-white/[0.018] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-[1680px] px-6 py-7 lg:px-8">
        {/* HEADER */}
        <header className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[#71717A]">
              <span>Workspace</span>
              <span className="text-[#3F3F46]">/</span>
              <span className="text-[#A1A1AA]">Equipo</span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-[30px] font-semibold tracking-[-0.035em]">
                Equipo
              </h1>

              <span className="rounded-full border border-[#FF5A00]/20 bg-[#FF5A00]/[0.08] px-2.5 py-1 text-[11px] font-medium text-[#FF7A33]">
                Team Management
              </span>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8F8F96]">
              Gestioná tu equipo, analizá su rendimiento y mantené
              el servicio operativo desde un único centro.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#FF5A00] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(255,90,0,0.15)] transition hover:bg-[#FF6A18]"
          >
            <Plus size={17} />
            Nuevo barbero
            <ArrowUpRight
              size={15}
              className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </button>
        </header>

        {/* KPI STRIP */}
        <section className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Equipo total",
              value: team.length,
              helper: `${activeBarbers} activos · ${inactiveBarbers} inactivos`,
              icon: Users,
            },
            {
              label: "Turnos atendidos",
              value: completedAppointments,
              helper: `${totalAppointments} registrados`,
              icon: CalendarDays,
            },
            {
              label: "Revenue generado",
              value: formatPrice(totalRevenue),
              helper: "Según turnos completados",
              icon: DollarSign,
            },
            {
              label: "Ticket promedio",
              value: formatPrice(averageTicket),
              helper: "Por turno completado",
              icon: TrendingUp,
            },
            {
              label: "Mejor performer",
              value: topPerformer?.name ?? "—",
              helper: topPerformer
                ? `${formatPrice(topPerformer.revenue)} generado`
                : "Sin datos",
              icon: Activity,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-2xl border border-white/[0.07] bg-[#101010] p-4 transition hover:border-white/[0.11]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#68686F]">
                      {item.label}
                    </div>

                    <div className="mt-3 truncate text-[23px] font-semibold tracking-[-0.035em]">
                      {item.value}
                    </div>

                    <div className="mt-1 truncate text-xs text-[#71717A]">
                      {item.helper}
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.035] p-2.5">
                    <Icon size={16} className="text-[#A1A1AA]" />
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* ANALYTICS */}
        <section className="mb-7 grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_0.8fr]">
          <div className="rounded-2xl border border-white/[0.07] bg-[#101010] p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">
                  Rendimiento del equipo
                </div>
                <div className="mt-1 text-xs text-[#71717A]">
                  Revenue generado por cada miembro
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-[#71717A]">
                <span className="h-2 w-2 rounded-full bg-[#FF5A00]" />
                Revenue
              </div>
            </div>

            <div className="space-y-4">
              {rankedTeam.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-[#71717A]">
                  Sin datos de rendimiento.
                </div>
              ) : (
                rankedTeam.map((barber, index) => {
                  const maxRevenue =
                    rankedTeam[0]?.revenue || 1;

                  return (
                    <button
                      key={barber.id}
                      type="button"
                      onClick={() => setSelectedBarber(barber)}
                      className="group w-full text-left"
                    >
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="w-5 text-[11px] font-medium text-[#4F4F55]">
                            {String(index + 1).padStart(2, "0")}
                          </span>

                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.04] text-[10px] font-semibold">
                            {getInitials(barber.name)}
                          </div>

                          <span className="truncate text-sm text-[#D4D4D8] group-hover:text-white">
                            {barber.name}
                          </span>
                        </div>

                        <span className="shrink-0 text-sm font-medium">
                          {formatPrice(barber.revenue)}
                        </span>
                      </div>

                      <div className="ml-8 h-1.5 overflow-hidden rounded-full bg-white/[0.045]">
                        <div
                          className="h-full rounded-full bg-[#FF5A00] transition-all duration-500 group-hover:bg-[#FF6A18]"
                          style={{
                            width: `${Math.max(
                              3,
                              (barber.revenue / maxRevenue) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[#101010] p-5">
            <div className="mb-5">
              <div className="text-sm font-semibold">
                Distribución del trabajo
              </div>
              <div className="mt-1 text-xs text-[#71717A]">
                Participación sobre el revenue registrado
              </div>
            </div>

            <div className="space-y-4">
              {rankedTeam.slice(0, 5).map((barber) => (
                <div key={barber.id}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="truncate text-xs text-[#A1A1AA]">
                      {barber.name}
                    </span>
                    <span className="text-xs font-medium text-[#D4D4D8]">
                      {barber.revenueShare.toFixed(1)}%
                    </span>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.045]">
                    <div
                      className="h-full rounded-full bg-[#FF5A00]/80"
                      style={{
                        width: `${Math.min(
                          100,
                          barber.revenueShare
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}

              {rankedTeam.length === 0 && (
                <div className="flex h-24 items-center justify-center text-xs text-[#71717A]">
                  Sin datos.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* TOOLBAR */}
        <section className="mb-5 flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-[#101010] p-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5E5E65]"
            />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar miembro del equipo..."
              className="h-10 w-full rounded-xl border border-white/[0.06] bg-[#0B0B0B] pl-10 pr-4 text-sm text-[#F5F5F4] outline-none placeholder:text-[#55555C] focus:border-[#FF5A00]/40"
            />
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-[#0B0B0B] p-1">
            {[
              { key: "all", label: "Todos" },
              { key: "active", label: "Activos" },
              { key: "inactive", label: "Inactivos" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setFilter(
                    item.key as "all" | "active" | "inactive"
                  )
                }
                className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                  filter === item.key
                    ? "bg-white/[0.08] text-white"
                    : "text-[#71717A] hover:text-[#D4D4D8]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {/* TEAM GRID */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-56 animate-pulse rounded-2xl border border-white/[0.07] bg-[#101010]"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/10 bg-red-400/[0.04] p-10 text-center text-sm text-red-300">
            {error}
          </div>
        ) : filteredTeam.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.07] bg-[#101010] p-14 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.035]">
              <UserRound size={20} className="text-[#71717A]" />
            </div>

            <h3 className="text-sm font-semibold">
              No encontramos miembros
            </h3>

            <p className="mt-2 text-xs text-[#71717A]">
              Probá con otro nombre o modificá el filtro.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {filteredTeam.map((barber) => {
              const isTop =
                topPerformer?.id === barber.id &&
                barber.revenue > 0;

              return (
                <button
                  key={barber.id}
                  type="button"
                  onClick={() => setSelectedBarber(barber)}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-[#101010] p-5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-white/[0.12] hover:bg-[#121212]"
                >
                  {isTop && (
                    <div className="absolute right-4 top-4 rounded-full border border-[#FF5A00]/20 bg-[#FF5A00]/[0.08] px-2 py-1 text-[10px] font-semibold text-[#FF7A33]">
                      Top performer
                    </div>
                  )}

                  <div className="mb-6 flex items-center gap-3">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.045] text-sm font-semibold">
                      {getInitials(barber.name)}

                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#101010] ${
                          barber.active
                            ? "bg-emerald-400"
                            : "bg-[#52525B]"
                        }`}
                      />
                    </div>

                    <div className="min-w-0 pr-24">
                      <div className="truncate text-sm font-semibold text-[#F4F4F5]">
                        {barber.name}
                      </div>

                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-[#71717A]">
                          Barbero
                        </span>

                        <span className="text-[#3F3F46]">•</span>

                        <span
                          className={`text-[11px] ${
                            barber.active
                              ? "text-emerald-300"
                              : "text-[#71717A]"
                          }`}
                        >
                          {barber.active ? "Activo" : "Inactivo"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-white/[0.06] bg-[#0B0B0B]">
                    <div className="border-r border-white/[0.06] p-3">
                      <div className="text-[10px] uppercase tracking-[0.06em] text-[#55555C]">
                        Turnos
                      </div>
                      <div className="mt-1.5 text-sm font-semibold">
                        {barber.completedAppointments}
                      </div>
                    </div>

                    <div className="border-r border-white/[0.06] p-3">
                      <div className="text-[10px] uppercase tracking-[0.06em] text-[#55555C]">
                        Revenue
                      </div>
                      <div className="mt-1.5 text-sm font-semibold">
                        {formatPrice(barber.revenue)}
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="text-[10px] uppercase tracking-[0.06em] text-[#55555C]">
                        Ticket
                      </div>
                      <div className="mt-1.5 text-sm font-semibold">
                        {formatPrice(barber.averageTicket)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-[#71717A]">
                        <CalendarDays size={13} />
                        Último turno
                      </div>

                      <div className="mt-1 text-xs font-medium text-[#A1A1AA]">
                        {barber.lastAppointment
                          ? `${formatShortDate(
                              barber.lastAppointment
                            )} · ${formatDateTime(
                              barber.lastAppointment
                            ).split(", ").pop()}`
                          : "Sin actividad"}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2 text-xs text-[#71717A] group-hover:text-[#D4D4D8]">
                      Ver perfil
                      <ChevronRight
                        size={15}
                        className="transition group-hover:translate-x-0.5"
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* DETAIL DRAWER */}
        {selectedBarber && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
            <div
              className="absolute inset-y-0 right-0 w-full max-w-[500px] overflow-y-auto border-l border-white/[0.08] bg-[#0C0C0C] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sticky top-0 z-20 border-b border-white/[0.07] bg-[#0C0C0C]/95 backdrop-blur-xl">
                <div className="flex items-center justify-between px-6 py-5">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#55555C]">
                      Team 360
                    </div>

                    <h2 className="mt-1 text-xl font-semibold tracking-[-0.025em]">
                      {selectedBarber.name}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedBarber(null)}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.035] p-2 text-[#71717A] transition hover:text-white"
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>

              <div className="space-y-6 p-6">
                {/* PROFILE */}
                <div className="rounded-2xl border border-white/[0.07] bg-[#101010] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#FF5A00]/20 bg-[#FF5A00]/[0.08] text-lg font-semibold text-[#FF7A33]">
                        {getInitials(selectedBarber.name)}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate font-semibold">
                          {selectedBarber.name}
                        </div>

                        <div className="mt-1 text-xs text-[#71717A]">
                          Miembro del equipo
                        </div>

                        <div
                          className={`mt-2 inline-flex items-center gap-1.5 text-[11px] ${
                            selectedBarber.active
                              ? "text-emerald-300"
                              : "text-[#71717A]"
                          }`}
                        >
                          {selectedBarber.active ? (
                            <>
                              <CircleCheck size={12} />
                              Actualmente activo
                            </>
                          ) : (
                            <>
                              <CircleX size={12} />
                              Actualmente inactivo
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditName(selectedBarber.name);
                        setShowEditModal(true);
                      }}
                      className="rounded-xl border border-white/[0.07] bg-white/[0.035] p-2.5 text-[#8F8F96] transition hover:text-white"
                    >
                      <Pencil size={15} />
                    </button>
                  </div>
                </div>

                {/* PERFORMANCE */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">
                        Rendimiento
                      </div>
                      <div className="mt-1 text-xs text-[#71717A]">
                        Métricas acumuladas del equipo
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        label: "Turnos",
                        value: selectedBarber.completedAppointments,
                        icon: CalendarDays,
                      },
                      {
                        label: "Revenue",
                        value: formatPrice(selectedBarber.revenue),
                        icon: DollarSign,
                      },
                      {
                        label: "Ticket promedio",
                        value: formatPrice(
                          selectedBarber.averageTicket
                        ),
                        icon: TrendingUp,
                      },
                      {
                        label: "Participación",
                        value: `${selectedBarber.revenueShare.toFixed(
                          1
                        )}%`,
                        icon: BarChart3,
                      },
                    ].map((item) => {
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.label}
                          className="rounded-xl border border-white/[0.07] bg-[#101010] p-4"
                        >
                          <div className="flex items-center gap-2 text-[11px] text-[#71717A]">
                            <Icon size={13} />
                            {item.label}
                          </div>

                          <div className="mt-2 text-lg font-semibold tracking-[-0.02em]">
                            {item.value}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RECENT TREND */}
                <div className="rounded-2xl border border-white/[0.07] bg-[#101010] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold">
                        Últimos 30 días
                      </div>
                      <div className="mt-1 text-xs text-[#71717A]">
                        Comparación con los 30 días anteriores
                      </div>
                    </div>

                    <div
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${
                        selectedBarber.growth >= 0
                          ? "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300"
                          : "border-red-400/15 bg-red-400/[0.07] text-red-300"
                      }`}
                    >
                      {selectedBarber.growth >= 0 ? (
                        <ArrowUpRight size={12} />
                      ) : (
                        <ArrowDownRight size={12} />
                      )}
                      {Math.abs(selectedBarber.growth).toFixed(1)}%
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[11px] text-[#71717A]">
                        Revenue
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {formatPrice(selectedBarber.recentRevenue)}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] text-[#71717A]">
                        Turnos
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {selectedBarber.recentAppointments}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SERVICES */}
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Scissors size={15} className="text-[#8F8F96]" />
                    <div className="text-sm font-semibold">
                      Servicios realizados
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/[0.07] bg-[#101010] p-4">
                    {selectedBarber.services.length === 0 ? (
                      <div className="py-4 text-center text-xs text-[#71717A]">
                        Todavía no hay servicios registrados.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedBarber.services.map((service) => (
                          <span
                            key={service}
                            className="rounded-lg border border-white/[0.07] bg-white/[0.035] px-2.5 py-1.5 text-xs text-[#B7B7BD]"
                          >
                            {service}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* INFORMATION */}
                <div>
                  <div className="mb-3 text-sm font-semibold">
                    Información
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
                      <span className="text-xs text-[#71717A]">
                        Incorporación
                      </span>
                      <span className="text-xs text-[#D4D4D8]">
                        {formatDate(selectedBarber.created_at)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5">
                      <span className="text-xs text-[#71717A]">
                        Último turno
                      </span>
                      <span className="text-xs text-[#D4D4D8]">
                        {formatDateTime(
                          selectedBarber.lastAppointment
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between px-4 py-3.5">
                      <span className="text-xs text-[#71717A]">
                        Estado
                      </span>
                      <span
                        className={`text-xs ${
                          selectedBarber.active
                            ? "text-emerald-300"
                            : "text-[#71717A]"
                        }`}
                      >
                        {selectedBarber.active
                          ? "Activo"
                          : "Inactivo"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ACTIONS */}
                <div>
                  <div className="mb-3 text-sm font-semibold">
                    Acciones
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = `/admin/turnos?barber=${selectedBarber.id}`;
                      }}
                      className="flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-[#101010] px-4 py-3.5 text-sm transition hover:border-white/[0.12] hover:bg-[#121212]"
                    >
                      <span className="flex items-center gap-2.5">
                        <CalendarDays size={15} />
                        Ver agenda
                      </span>
                      <ChevronRight size={16} className="text-[#55555C]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditName(selectedBarber.name);
                        setShowEditModal(true);
                      }}
                      className="flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-[#101010] px-4 py-3.5 text-sm transition hover:border-white/[0.12] hover:bg-[#121212]"
                    >
                      <span className="flex items-center gap-2.5">
                        <Pencil size={15} />
                        Editar perfil
                      </span>
                      <ChevronRight size={16} className="text-[#55555C]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleBarber(selectedBarber)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-sm transition ${
                        selectedBarber.active
                          ? "border-red-400/10 bg-red-400/[0.035] text-red-300 hover:bg-red-400/[0.06]"
                          : "border-emerald-400/10 bg-emerald-400/[0.035] text-emerald-300 hover:bg-emerald-400/[0.06]"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Power size={15} />
                        {selectedBarber.active
                          ? "Desactivar barbero"
                          : "Activar barbero"}
                      </span>
                      <ChevronRight size={16} />
                    </button>

                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-[#101010] px-4 py-3.5 text-sm text-[#A1A1AA] transition hover:border-white/[0.12] hover:bg-[#121212]"
                    >
                      <span className="flex items-center gap-2.5">
                        <MoreHorizontal size={15} />
                        Más opciones
                      </span>
                      <ChevronRight size={16} className="text-[#55555C]" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              aria-label="Cerrar panel"
              onClick={() => setSelectedBarber(null)}
              className="absolute inset-0 -z-10 h-full w-full"
            />
          </div>
        )}

        {/* CREATE MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#101010] p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#55555C]">
                    Equipo
                  </div>
                  <h2 className="mt-1 text-xl font-semibold">
                    Nuevo barbero
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl p-2 text-[#71717A] hover:bg-white/[0.05] hover:text-white"
                >
                  <X size={17} />
                </button>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-[#A1A1AA]">
                  Nombre completo
                </span>
                <input
                  autoFocus
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") createBarber();
                  }}
                  placeholder="Ej. Manuel Cladera"
                  className="h-11 w-full rounded-xl border border-white/[0.07] bg-[#0B0B0B] px-4 text-sm text-white outline-none placeholder:text-[#55555C] focus:border-[#FF5A00]/40"
                />
              </label>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-white/[0.07] px-4 py-2.5 text-sm text-[#A1A1AA] hover:bg-white/[0.04]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={saving || !newName.trim()}
                  onClick={createBarber}
                  className="rounded-xl bg-[#FF5A00] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#FF6A18] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? "Guardando..." : "Crear barbero"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {showEditModal && selectedBarber && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#101010] p-6 shadow-2xl">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#55555C]">
                    Team 360
                  </div>
                  <h2 className="mt-1 text-xl font-semibold">
                    Editar perfil
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl p-2 text-[#71717A] hover:bg-white/[0.05] hover:text-white"
                >
                  <X size={17} />
                </button>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-medium text-[#A1A1AA]">
                  Nombre completo
                </span>
                <input
                  autoFocus
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") updateBarber();
                  }}
                  className="h-11 w-full rounded-xl border border-white/[0.07] bg-[#0B0B0B] px-4 text-sm text-white outline-none focus:border-[#FF5A00]/40"
                />
              </label>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl border border-white/[0.07] px-4 py-2.5 text-sm text-[#A1A1AA] hover:bg-white/[0.04]"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={saving || !editName.trim()}
                  onClick={updateBarber}
                  className="rounded-xl bg-[#FF5A00] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#FF6A18] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOAST */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-[100] rounded-xl border border-white/[0.08] bg-[#151515] px-4 py-3 text-sm text-[#E4E4E7] shadow-2xl">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
