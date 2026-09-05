"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  UserRound,
  Phone,
  Mail,
  CalendarDays,
  Scissors,
  ChevronRight,
  X,
  Clock3,
  TrendingUp,
  Users,
  UserCheck,
  UserX,
  Crown,
  MoreHorizontal,
  ArrowUpRight,
  MessageCircle,
  History,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Customer = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
};

type Appointment = {
  id: string;
  customer_id: string;
  start_at: string;
  end_at: string;
  status: string;
  notes: string | null;
  service: {
    name: string;
    price: number;
  } | null;
};

type CustomerWithStats = Customer & {
  visits: number;
  spent: number;
  lastVisit: string | null;
  favoriteService: string | null;
};

type Segment = "all" | "new" | "active" | "vip" | "risk" | "inactive";

function formatDate(dateString: string | null) {
  if (!dateString) return "Sin visitas";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateString));
}

function formatDateTime(dateString: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(dateString));
}

function formatMemberSince(dateString: string) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(new Date(dateString));
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getCustomerSegment(customer: CustomerWithStats): Segment {
  if (customer.visits === 0) return "inactive";
  if (customer.visits >= 8 || customer.spent >= 150000) return "vip";
  if (!customer.lastVisit) return "inactive";

  const days =
    (Date.now() - new Date(customer.lastVisit).getTime()) /
    (1000 * 60 * 60 * 24);

  if (customer.visits <= 2 && days <= 45) return "new";
  if (days > 90) return "inactive";
  if (days > 45) return "risk";
  return "active";
}

const SEGMENTS: Array<{
  id: Segment;
  label: string;
  description: string;
}> = [
  { id: "all", label: "Todos", description: "Toda la base" },
  { id: "new", label: "Nuevos", description: "Primeras visitas" },
  { id: "active", label: "Activos", description: "Clientes recurrentes" },
  { id: "vip", label: "VIP", description: "Mayor valor" },
  { id: "risk", label: "En riesgo", description: "45–90 días" },
  { id: "inactive", label: "Inactivos", description: "+90 días" },
];

export default function ClientesPage() {
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerWithStats | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [newCustomer, setNewCustomer] = useState({
    full_name: "",
    phone: "",
    email: "",
    notes: "",
  });

  async function loadData() {
    setLoading(true);
    setError("");

    const [customersResponse, appointmentsResponse] = await Promise.all([
      supabase
        .from("customers")
        .select(`
          id,
          full_name,
          phone,
          email,
          notes,
          created_at
        `)
        .order("full_name", { ascending: true }),

      supabase
        .from("appointments")
        .select(`
          id,
          customer_id,
          start_at,
          end_at,
          status,
          notes,
          service:services (
            name,
            price
          )
        `)
        .order("start_at", { ascending: false }),
    ]);

    if (customersResponse.error) {
      console.error("Error loading customers:", customersResponse.error);
      setError("No se pudieron cargar los clientes.");
      setLoading(false);
      return;
    }

    if (appointmentsResponse.error) {
      console.error("Error loading appointments:", appointmentsResponse.error);
      setError("No se pudo cargar el historial de clientes.");
      setLoading(false);
      return;
    }

    setCustomers(customersResponse.data ?? []);
    setAppointments(
      (appointmentsResponse.data ?? []) as unknown as Appointment[]
    );
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [supabase]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const customersWithStats = useMemo<CustomerWithStats[]>(() => {
    return customers.map((customer) => {
      const customerAppointments = appointments.filter(
        (appointment) =>
          appointment.customer_id === customer.id &&
          appointment.status !== "cancelled"
      );

      const spent = customerAppointments.reduce(
        (total, appointment) =>
          total + Number(appointment.service?.price ?? 0),
        0
      );

      const serviceCounts: Record<string, number> = {};

      customerAppointments.forEach((appointment) => {
        const serviceName = appointment.service?.name;
        if (!serviceName) return;

        serviceCounts[serviceName] =
          (serviceCounts[serviceName] ?? 0) + 1;
      });

      const favoriteService =
        Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
        null;

      return {
        ...customer,
        visits: customerAppointments.length,
        spent,
        lastVisit: customerAppointments[0]?.start_at ?? null,
        favoriteService,
      };
    });
  }, [customers, appointments]);

  const filteredCustomers = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return customersWithStats.filter((customer) => {
      const matchesSearch =
        !normalized ||
        customer.full_name.toLowerCase().includes(normalized) ||
        customer.phone.toLowerCase().includes(normalized) ||
        customer.email?.toLowerCase().includes(normalized);

      const matchesSegment =
        segment === "all" || getCustomerSegment(customer) === segment;

      return matchesSearch && matchesSegment;
    });
  }, [customersWithStats, search, segment]);

  const totalCustomers = customers.length;

  const newCustomers = customersWithStats.filter(
    (customer) => getCustomerSegment(customer) === "new"
  ).length;

  const activeCustomers = customersWithStats.filter(
    (customer) => getCustomerSegment(customer) === "active"
  ).length;

  const vipCustomers = customersWithStats.filter(
    (customer) => getCustomerSegment(customer) === "vip"
  ).length;

  const riskCustomers = customersWithStats.filter(
    (customer) => getCustomerSegment(customer) === "risk"
  ).length;

  const inactiveCustomers = customersWithStats.filter(
    (customer) => getCustomerSegment(customer) === "inactive"
  ).length;

  const totalVisits = appointments.filter(
    (appointment) => appointment.status !== "cancelled"
  ).length;

  const totalRevenue = appointments
    .filter((appointment) => appointment.status !== "cancelled")
    .reduce(
      (total, appointment) =>
        total + Number(appointment.service?.price ?? 0),
      0
    );

  const averageCustomerValue =
    totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  const selectedCustomerAppointments = selectedCustomer
    ? appointments.filter(
        (appointment) =>
          appointment.customer_id === selectedCustomer.id &&
          appointment.status !== "cancelled"
      )
    : [];

  const selectedSegment = selectedCustomer
    ? getCustomerSegment(selectedCustomer)
    : null;

  async function createCustomer() {
    if (!newCustomer.full_name.trim() || !newCustomer.phone.trim()) {
      setError("Nombre y teléfono son obligatorios.");
      return;
    }

    setSaving(true);
    setError("");

    const { data, error: insertError } = await supabase
      .from("customers")
      .insert({
        full_name: newCustomer.full_name.trim(),
        phone: newCustomer.phone.trim(),
        email: newCustomer.email.trim() || null,
        notes: newCustomer.notes.trim() || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating customer:", insertError);
      setError("No se pudo crear el cliente.");
      setSaving(false);
      return;
    }

    setCustomers((current) => [...current, data as Customer]);
    setNewCustomer({ full_name: "", phone: "", email: "", notes: "" });
    setShowCreate(false);
    setSaving(false);
    setNotice("Cliente creado correctamente.");
  }

  function closeDetail() {
    setSelectedCustomer(null);
    setShowActions(false);
  }

  return (
    <div className="min-h-screen bg-[#090909] text-[#F5F5F4]">
      {/* AMBIENT SYSTEM LAYER */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute right-[8%] top-[-12%] h-[420px] w-[420px] rounded-full bg-[#FF5A00]/[0.035] blur-[120px]" />
        <div className="absolute left-[22%] top-[42%] h-[300px] w-[300px] rounded-full bg-white/[0.012] blur-[100px]" />
      </div>

      {/* HEADER */}
      <header className="border-b border-white/[0.075] bg-[#090909]/92 px-8 py-7 backdrop-blur-xl">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FF6A18]">
              <Users size={13} />
              Operations / CRM
            </div>

            <h1 className="text-[32px] font-semibold tracking-[-0.035em] text-white">
              Clientes
            </h1>

            <p className="mt-2 max-w-xl text-[14px] leading-6 text-[#C4C4C1]">
              Customer 360 para entender, gestionar y hacer crecer la relación
              con cada cliente.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => loadData()}
              className="rounded-xl border border-white/[0.10] bg-white/[0.025] px-4 py-2.5 text-[13px] font-medium text-[#E7E7E4] transition hover:border-white/[0.18] hover:bg-white/[0.05]"
            >
              Actualizar
            </button>

            <button
              type="button"
              onClick={() => {
                setError("");
                setShowCreate(true);
              }}
              className="group flex items-center gap-2 rounded-xl bg-[#FF5A00] px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_10px_30px_rgba(255,90,0,0.16)] transition hover:bg-[#FF6814] hover:shadow-[0_12px_36px_rgba(255,90,0,0.22)]"
            >
              <Plus size={16} strokeWidth={2.2} />
              Nuevo cliente
              <ArrowUpRight
                size={14}
                className="opacity-60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </button>
          </div>
        </div>
      </header>

      <main className="px-8 py-7">
        {/* KPI GRID */}
        <section className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            {
              label: "Clientes",
              value: totalCustomers,
              meta: "base registrada",
              icon: Users,
            },
            {
              label: "Nuevos",
              value: newCustomers,
              meta: "primeras visitas",
              icon: UserRound,
            },
            {
              label: "Activos",
              value: activeCustomers,
              meta: "relación recurrente",
              icon: UserCheck,
            },
            {
              label: "VIP",
              value: vipCustomers,
              meta: "alto valor",
              icon: Crown,
            },
            {
              label: "En riesgo",
              value: riskCustomers,
              meta: `${inactiveCustomers} inactivos`,
              icon: UserX,
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="group rounded-2xl border border-white/[0.075] bg-[#111111] p-5 transition hover:border-white/[0.13] hover:bg-[#131313]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#BDBDBA]">
                    {item.label}
                  </span>
                  <Icon
                    size={15}
                    className="text-[#777773] transition group-hover:text-[#FF6A18]"
                  />
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <span className="text-[28px] font-semibold tracking-[-0.035em] text-white tabular-nums">
                    {item.value.toLocaleString("es-AR")}
                  </span>
                </div>

                <p className="mt-1.5 text-[11px] text-[#A6A6A2]">{item.meta}</p>
              </div>
            );
          })}
        </section>

        {/* INSIGHT STRIP */}
        <section className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_1fr]">
          <div className="rounded-2xl border border-white/[0.075] bg-[#0F0F0F] p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-[#BDBDBA]">
              <TrendingUp size={14} className="text-[#FF6A18]" />
              Valor medio
            </div>
            <p className="mt-3 text-[23px] font-semibold tracking-[-0.025em] text-white">
              ${Math.round(averageCustomerValue).toLocaleString("es-AR")}
            </p>
            <p className="mt-1 text-[11px] text-[#A6A6A2]">
              facturación histórica / clientes
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.075] bg-[#0F0F0F] p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-[#BDBDBA]">
              <History size={14} />
              Actividad
            </div>
            <p className="mt-3 text-[23px] font-semibold tracking-[-0.025em] text-white">
              {totalVisits.toLocaleString("es-AR")}
            </p>
            <p className="mt-1 text-[11px] text-[#A6A6A2]">
              visitas no canceladas registradas
            </p>
          </div>

          <div className="rounded-2xl border border-[#FF5A00]/15 bg-[#FF5A00]/[0.035] p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.13em] text-[#FF9A66]">
              <Sparkles size={14} />
              Oportunidad CRM
            </div>
            <p className="mt-3 text-[15px] font-medium text-white">
              {riskCustomers + inactiveCustomers} clientes requieren atención
            </p>
            <p className="mt-1 text-[11px] text-[#C7A18E]">
              revisar recuperación y reactivación
            </p>
          </div>
        </section>

        {/* FILTER / SEARCH BAR */}
        <section className="mb-5 rounded-2xl border border-white/[0.075] bg-[#111111] p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/[0.075] bg-[#0B0B0B] px-4 py-3">
              <Search size={17} className="shrink-0 text-[#999995]" />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar cliente, teléfono o email..."
                className="w-full bg-transparent text-[13px] text-white outline-none placeholder:text-[#A1A19D]"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-[#A1A19D] transition hover:text-white"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="flex gap-1 overflow-x-auto rounded-xl border border-white/[0.075] bg-[#0B0B0B] p-1">
              {SEGMENTS.map((item) => {
                const active = segment === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSegment(item.id)}
                    className={`whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
                      active
                        ? "bg-white/[0.09] text-white"
                        : "text-[#B0B0AC] hover:bg-white/[0.045] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* MASTER DETAIL */}
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
          {/* CUSTOMER TABLE */}
          <div className="overflow-hidden rounded-2xl border border-white/[0.075] bg-[#111111]">
            <div className="flex items-center justify-between border-b border-white/[0.075] px-6 py-5">
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-white">
                  Customer 360
                </h2>
                <p className="mt-1 text-[11px] text-[#A6A6A2]">
                  {filteredCustomers.length} de {totalCustomers} clientes
                </p>
              </div>

              <div className="rounded-lg border border-white/[0.075] bg-white/[0.025] px-3 py-1.5 text-[11px] text-[#C4C4C1]">
                {SEGMENTS.find((item) => item.id === segment)?.description}
              </div>
            </div>

            {loading ? (
              <div className="min-h-[520px] space-y-3 p-6">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[58px] animate-pulse rounded-xl bg-white/[0.035]"
                  />
                ))}
              </div>
            ) : error ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center px-6 text-center">
                <p className="text-sm font-medium text-red-300">{error}</p>
                <button
                  type="button"
                  onClick={() => loadData()}
                  className="mt-4 rounded-lg border border-white/10 px-3 py-2 text-xs text-white transition hover:bg-white/5"
                >
                  Reintentar
                </button>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center px-6 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.075] bg-[#0B0B0B]">
                  <Search size={19} className="text-[#A1A19D]" />
                </div>
                <h3 className="text-sm font-medium text-white">
                  No encontramos clientes
                </h3>
                <p className="mt-1 max-w-sm text-xs leading-5 text-[#A6A6A2]">
                  Probá con otro término de búsqueda o cambiá el segmento.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden grid-cols-[minmax(220px,1.4fr)_120px_120px_140px_120px_24px] gap-4 border-b border-white/[0.05] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A6A6A2] lg:grid">
                  <span>Cliente</span>
                  <span>Visitas</span>
                  <span>Valor</span>
                  <span>Última visita</span>
                  <span>Segmento</span>
                  <span />
                </div>

                <div className="divide-y divide-white/[0.055]">
                  {filteredCustomers.map((customer) => {
                    const customerSegment = getCustomerSegment(customer);
                    const isSelected = selectedCustomer?.id === customer.id;

                    return (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => setSelectedCustomer(customer)}
                        className={`group grid w-full grid-cols-[1fr_auto] gap-4 px-6 py-4 text-left transition lg:grid-cols-[minmax(220px,1.4fr)_120px_120px_140px_120px_24px] ${
                          isSelected
                            ? "bg-white/[0.055]"
                            : "hover:bg-white/[0.025]"
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.09] bg-[#0B0B0B] text-[11px] font-semibold text-[#E6E6E3]">
                            {getInitials(customer.full_name)}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-[13px] font-semibold text-white">
                              {customer.full_name}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-[#B7B7B3]">
                              <Phone size={10} />
                              <span>{customer.phone}</span>
                            </div>
                          </div>
                        </div>

                        <div className="hidden items-center text-[13px] font-medium text-[#E4E4E1] tabular-nums lg:flex">
                          {customer.visits}
                        </div>

                        <div className="hidden items-center text-[13px] font-medium text-white tabular-nums lg:flex">
                          ${customer.spent.toLocaleString("es-AR")}
                        </div>

                        <div className="hidden items-center text-[11px] text-[#C0C0BC] lg:flex">
                          {formatDate(customer.lastVisit)}
                        </div>

                        <div className="hidden items-center lg:flex">
                          <span
                            className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${
                              customerSegment === "vip"
                                ? "border-[#FF5A00]/25 bg-[#FF5A00]/10 text-[#FF9A66]"
                                : customerSegment === "risk"
                                  ? "border-amber-400/20 bg-amber-400/[0.08] text-amber-300"
                                  : customerSegment === "inactive"
                                    ? "border-white/10 bg-white/[0.04] text-[#B5B5B1]"
                                    : customerSegment === "new"
                                      ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"
                                      : "border-white/10 bg-white/[0.04] text-[#D7D7D4]"
                            }`}
                          >
                            {SEGMENTS.find((item) => item.id === customerSegment)
                              ?.label ?? "Activo"}
                          </span>
                        </div>

                        <div className="flex items-center justify-end">
                          <ChevronRight
                            size={16}
                            className={`text-[#7F7F7B] transition ${
                              isSelected
                                ? "text-[#FF6A18]"
                                : "group-hover:text-white"
                            }`}
                          />
                        </div>

                        <div className="col-span-2 flex items-center gap-4 border-t border-white/[0.04] pt-3 text-[11px] text-[#B7B7B3] lg:hidden">
                          <span>{customer.visits} visitas</span>
                          <span>
                            ${customer.spent.toLocaleString("es-AR")}
                          </span>
                          <span className="truncate">
                            {formatDate(customer.lastVisit)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* CUSTOMER 360 DETAIL */}
          <aside className="h-fit overflow-hidden rounded-2xl border border-white/[0.075] bg-[#111111] xl:sticky xl:top-5">
            {!selectedCustomer ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center px-8 text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0B0B0B]">
                  <UserRound size={21} className="text-[#9E9E9A]" />
                </div>
                <h3 className="text-[14px] font-semibold text-white">
                  Customer 360
                </h3>
                <p className="mt-2 max-w-[270px] text-[11px] leading-5 text-[#A6A6A2]">
                  Seleccioná un cliente para consultar actividad, valor,
                  historial y oportunidades.
                </p>
              </div>
            ) : (
              <div>
                {/* PROFILE */}
                <div className="border-b border-white/[0.075] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#FF5A00]/20 bg-[#FF5A00]/[0.08] text-[13px] font-semibold text-[#FF9A66]">
                        {getInitials(selectedCustomer.full_name)}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-[15px] font-semibold text-white">
                          {selectedCustomer.full_name}
                        </h3>
                        <p className="mt-1 text-[10px] text-[#B7B7B3]">
                          Cliente desde{" "}
                          {formatMemberSince(selectedCustomer.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowActions((value) => !value)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.075] text-[#A1A19D] transition hover:bg-white/[0.05] hover:text-white"
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {showActions && (
                        <div className="absolute right-0 top-10 z-20 w-40 rounded-xl border border-white/[0.10] bg-[#171717] p-1.5 shadow-2xl">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] text-[#DADAD7] transition hover:bg-white/[0.06]"
                          >
                            Editar cliente
                          </button>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] text-[#DADAD7] transition hover:bg-white/[0.06]"
                          >
                            Ver agenda
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {selectedSegment && (
                      <span className="rounded-full border border-[#FF5A00]/20 bg-[#FF5A00]/[0.07] px-2.5 py-1 text-[10px] font-semibold text-[#FF9A66]">
                        {SEGMENTS.find((item) => item.id === selectedSegment)
                          ?.label}
                      </span>
                    )}

                    {selectedCustomer.favoriteService && (
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[10px] font-medium text-[#C9C9C6]">
                        {selectedCustomer.favoriteService}
                      </span>
                    )}
                  </div>
                </div>

                {/* QUICK ACTIONS */}
                <div className="grid grid-cols-3 gap-2 border-b border-white/[0.075] p-4">
                  <button
                    type="button"
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.075] bg-[#0B0B0B] px-2 py-3 text-[10px] text-[#D4D4D1] transition hover:border-white/[0.14] hover:bg-white/[0.035]"
                  >
                    <Phone size={14} />
                    Llamar
                  </button>

                  <button
                    type="button"
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.075] bg-[#0B0B0B] px-2 py-3 text-[10px] text-[#D4D4D1] transition hover:border-white/[0.14] hover:bg-white/[0.035]"
                  >
                    <MessageCircle size={14} />
                    WhatsApp
                  </button>

                  <button
                    type="button"
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.075] bg-[#0B0B0B] px-2 py-3 text-[10px] text-[#D4D4D1] transition hover:border-white/[0.14] hover:bg-white/[0.035]"
                  >
                    <CalendarDays size={14} />
                    Turno
                  </button>
                </div>

                {/* CONTACT */}
                <div className="border-b border-white/[0.075] p-6">
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B7B7B3]">
                    Contacto
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Phone size={14} className="text-[#8F8F8B]" />
                      <span className="text-[12px] text-[#E1E1DE]">
                        {selectedCustomer.phone}
                      </span>
                    </div>

                    {selectedCustomer.email && (
                      <div className="flex items-center gap-3">
                        <Mail size={14} className="text-[#8F8F8B]" />
                        <span className="truncate text-[12px] text-[#E1E1DE]">
                          {selectedCustomer.email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* VALUE */}
                <div className="border-b border-white/[0.075] p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B7B7B3]">
                      Valor del cliente
                    </p>
                    <TrendingUp size={14} className="text-[#FF6A18]" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/[0.07] bg-[#0B0B0B] p-4">
                      <p className="text-[10px] text-[#B0B0AC]">Visitas</p>
                      <p className="mt-2 text-[20px] font-semibold text-white tabular-nums">
                        {selectedCustomer.visits}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.07] bg-[#0B0B0B] p-4">
                      <p className="text-[10px] text-[#B0B0AC]">Gasto</p>
                      <p className="mt-2 truncate text-[17px] font-semibold text-white tabular-nums">
                        ${selectedCustomer.spent.toLocaleString("es-AR")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 rounded-xl border border-white/[0.07] bg-[#0B0B0B] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-[#B0B0AC]">
                        Ticket promedio
                      </p>
                      <span className="text-[10px] text-[#FF9A66]">LTV</span>
                    </div>
                    <p className="mt-2 text-[17px] font-semibold text-white tabular-nums">
                      $
                      {Math.round(
                        selectedCustomer.visits
                          ? selectedCustomer.spent / selectedCustomer.visits
                          : 0
                      ).toLocaleString("es-AR")}
                    </p>
                  </div>
                </div>

                {/* ACTIVITY */}
                <div className="border-b border-white/[0.075] p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B7B7B3]">
                      Actividad reciente
                    </p>
                    <span className="text-[10px] text-[#A6A6A2]">
                      {selectedCustomerAppointments.length} turnos
                    </span>
                  </div>

                  {selectedCustomerAppointments.length === 0 ? (
                    <p className="text-[11px] leading-5 text-[#A6A6A2]">
                      Todavía no hay visitas registradas.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {selectedCustomerAppointments.slice(0, 6).map((appointment) => (
                        <div
                          key={appointment.id}
                          className="rounded-xl border border-white/[0.065] bg-[#0B0B0B] p-3.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-semibold text-[#E6E6E3]">
                                {appointment.service?.name ?? "Servicio"}
                              </p>
                              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-[#A6A6A2]">
                                <Clock3 size={10} />
                                {formatDateTime(appointment.start_at)}
                              </div>
                            </div>

                            <span className="shrink-0 text-[11px] font-semibold text-white tabular-nums">
                              $
                              {Number(
                                appointment.service?.price ?? 0
                              ).toLocaleString("es-AR")}
                            </span>
                          </div>

                          {appointment.notes && (
                            <p className="mt-3 border-t border-white/[0.05] pt-3 text-[10px] leading-4 text-[#A6A6A2]">
                              {appointment.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* NOTES */}
                {selectedCustomer.notes && (
                  <div className="border-b border-white/[0.075] p-6">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B7B7B3]">
                      Observaciones
                    </p>
                    <p className="rounded-xl border border-white/[0.065] bg-[#0B0B0B] p-4 text-[11px] leading-5 text-[#C4C4C1]">
                      {selectedCustomer.notes}
                    </p>
                  </div>
                )}

                {/* FOOTER */}
                <div className="flex items-center justify-between p-5">
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="text-[11px] text-[#A6A6A2] transition hover:text-white"
                  >
                    Cerrar perfil
                  </button>

                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-[#FF8A50] transition hover:text-[#FFB18F]"
                  >
                    Ver historial completo
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>

      {/* CREATE CUSTOMER MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/[0.10] bg-[#151515] shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/[0.075] p-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FF6A18]">
                  CRM
                </p>
                <h2 className="mt-1 text-[19px] font-semibold text-white">
                  Nuevo cliente
                </h2>
                <p className="mt-1 text-[11px] text-[#A6A6A2]">
                  Crear un perfil dentro de la base de clientes.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-[#A6A6A2] transition hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              {[
                {
                  label: "Nombre completo",
                  key: "full_name",
                  placeholder: "Ej. Juan Pérez",
                  required: true,
                },
                {
                  label: "Teléfono",
                  key: "phone",
                  placeholder: "Ej. 11 5555 5555",
                  required: true,
                },
                {
                  label: "Email",
                  key: "email",
                  placeholder: "cliente@email.com",
                  required: false,
                },
              ].map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#B7B7B3]">
                    {field.label} {field.required && "*"}
                  </span>
                  <input
                    value={newCustomer[field.key as keyof typeof newCustomer]}
                    onChange={(event) =>
                      setNewCustomer((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                    className="w-full rounded-xl border border-white/[0.09] bg-[#0B0B0B] px-4 py-3 text-[12px] text-white outline-none transition placeholder:text-[#888884] focus:border-[#FF5A00]/45"
                  />
                </label>
              ))}

              <label className="block">
                <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#B7B7B3]">
                  Observaciones
                </span>
                <textarea
                  value={newCustomer.notes}
                  onChange={(event) =>
                    setNewCustomer((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={4}
                  placeholder="Preferencias, información relevante..."
                  className="w-full resize-none rounded-xl border border-white/[0.09] bg-[#0B0B0B] px-4 py-3 text-[12px] leading-5 text-white outline-none transition placeholder:text-[#888884] focus:border-[#FF5A00]/45"
                />
              </label>

              {error && (
                <div className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-[11px] text-red-300">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-white/[0.075] p-5">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-white/[0.09] px-4 py-2.5 text-[11px] font-semibold text-[#C9C9C6] transition hover:bg-white/[0.04]"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={createCustomer}
                className="rounded-xl bg-[#FF5A00] px-4 py-2.5 text-[11px] font-semibold text-white transition hover:bg-[#FF6814] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Creando..." : "Crear cliente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {notice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-[#151515] px-4 py-3 text-[11px] font-medium text-emerald-300 shadow-2xl">
          <UserCheck size={14} />
          {notice}
        </div>
      )}
    </div>
  );
}
