"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Scissors,
  Clock3,
  CircleCheck,
  CircleX,
  ChevronRight,
  X,
  Pencil,
  MoreHorizontal,
  DollarSign,
  TrendingUp,
  BarChart3,
  CalendarDays,
  Users,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Check,
  Archive,
  Eye,
  EyeOff,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  active: boolean;
  created_at: string;
  currency: string;
};

type Appointment = {
  id: string;
  start_at: string;
  status: string;
  service_id: string | null;
  service?: {
    name: string;
    price: number;
  } | null;
  customer?: {
    full_name: string;
  } | null;
};

type Range = "all" | "active" | "inactive";

const ORANGE = "#FF5A00";

function formatPrice(price: number, currency = "ARS") {
  if (currency === "USD") {
    return `US$ ${price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `$${price.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompactPrice(price: number, currency = "ARS") {
  if (currency === "USD") {
    return `US$ ${Math.round(price).toLocaleString("en-US")}`;
  }

  return `$${Math.round(price).toLocaleString("es-AR")}`;
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  return remaining === 0 ? `${hours} h` : `${hours} h ${remaining} min`;
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    completed: "Completado",
    confirmed: "Confirmado",
    pending: "Pendiente",
    cancelled: "Cancelado",
    no_show: "No asistió",
  };

  return labels[status] ?? status;
}

function statusClass(status: string) {
  if (status === "completed")
    return "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300";
  if (status === "confirmed")
    return "border-sky-400/15 bg-sky-400/[0.07] text-sky-300";
  if (status === "pending")
    return "border-amber-400/15 bg-amber-400/[0.07] text-amber-300";
  if (status === "cancelled")
    return "border-red-400/15 bg-red-400/[0.07] text-red-300";

  return "border-white/10 bg-white/[0.03] text-white/45";
}

function StatCard({
  label,
  value,
  caption,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: typeof Scissors;
  accent?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-5 transition duration-200 ${
        accent
          ? "border-[#FF5A00]/20 bg-[#FF5A00]/[0.055]"
          : "border-white/[0.075] bg-[#111213]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">
          {label}
        </p>

        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
            accent
              ? "border-[#FF5A00]/20 bg-[#FF5A00]/10 text-[#FF6A18]"
              : "border-white/[0.07] bg-white/[0.025] text-white/40"
          }`}
        >
          <Icon size={15} strokeWidth={1.7} />
        </div>
      </div>

      <p className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-white">
        {value}
      </p>
      <p className="mt-1.5 text-xs text-white/35">{caption}</p>

      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full blur-3xl transition-opacity group-hover:opacity-100 ${
          accent ? "bg-[#FF5A00]/10 opacity-60" : "bg-white/[0.025] opacity-0"
        }`}
      />
    </div>
  );
}

function EmptyState({
  search,
  onCreate,
}: {
  search: string;
  onCreate: () => void;
}) {
  return (
    <div className="flex min-h-[440px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0c0d0e] text-white/35">
        <Scissors size={22} strokeWidth={1.5} />
      </div>

      <h3 className="text-sm font-semibold text-white">
        {search ? "No encontramos servicios" : "Todavía no hay servicios"}
      </h3>

      <p className="mt-2 max-w-sm text-xs leading-5 text-white/35">
        {search
          ? "Probá con otro término o limpiá la búsqueda para volver a ver el catálogo."
          : "Creá el primer servicio para empezar a construir el catálogo de BarberOS."}
      </p>

      {!search && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#FF5A00] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#ff6816]"
        >
          <Plus size={14} />
          Crear servicio
        </button>
      )}
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
      {values.map((value, index) => (
        <div key={`${labels[index]}-${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="flex h-28 w-full items-end">
            <div
              className="w-full rounded-t-md bg-[#FF5A00]/75 transition-all duration-300 hover:bg-[#FF5A00]"
              style={{ height: `${Math.max((value / max) * 100, value > 0 ? 7 : 2)}%` }}
              title={`${value} turnos`}
            />
          </div>
          <span className="truncate text-[9px] text-white/30">{labels[index]}</span>
        </div>
      ))}
    </div>
  );
}

function ServiceRow({
  service,
  usage,
  revenue,
  selected,
  onSelect,
  onEdit,
  onToggle,
}: {
  service: Service;
  usage: number;
  revenue: number;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      className={`group grid grid-cols-[minmax(0,1fr)_120px_130px_110px_34px] items-center gap-4 border-b border-white/[0.055] px-5 py-4 transition ${
        selected ? "bg-[#FF5A00]/[0.045]" : "hover:bg-white/[0.018]"
      }`}
    >
      <button type="button" onClick={onSelect} className="min-w-0 text-left">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
              selected
                ? "border-[#FF5A00]/20 bg-[#FF5A00]/10 text-[#FF6A18]"
                : "border-white/[0.07] bg-[#0d0e0f] text-white/40"
            }`}
          >
            <Scissors size={16} strokeWidth={1.5} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-white/90">
                {service.name}
              </span>

              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium ${
                  service.active
                    ? "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300"
                    : "border-white/[0.08] bg-white/[0.025] text-white/30"
                }`}
              >
                {service.active ? "Activo" : "Inactivo"}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-3 text-[11px] text-white/32">
              <span className="inline-flex items-center gap-1">
                <Clock3 size={11} />
                {formatDuration(service.duration_minutes)}
              </span>

              {service.description && (
                <span className="hidden truncate lg:block">
                  {service.description}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>

      <div className="text-right">
        <p className="text-sm font-medium tabular-nums text-white/75">
          {usage}
        </p>
        <p className="mt-0.5 text-[10px] text-white/25">turnos</p>
      </div>

      <div className="text-right">
        <p className="text-sm font-medium tabular-nums text-white/75">
          {formatCompactPrice(revenue, service.currency)}
        </p>
        <p className="mt-0.5 text-[10px] text-white/25">ingresos</p>
      </div>

      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums text-white/90">
          {formatPrice(service.price, service.currency)}
        </p>
        <p className="mt-0.5 text-[10px] text-white/25">precio</p>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          aria-label={`Acciones para ${service.name}`}
          onClick={onEdit}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-white/25 opacity-0 transition hover:bg-white/[0.05] hover:text-white group-hover:opacity-100"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      <button
        type="button"
        onClick={onToggle}
        className="hidden"
        aria-hidden
      />
    </div>
  );
}

export default function ServiciosPage() {
  const supabase = createClient();

  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Range>("all");
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showMoreActions, setShowMoreActions] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    duration_minutes: 30,
    price: "",
    currency: "ARS",
    active: true,
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      const [servicesResponse, appointmentsResponse] = await Promise.all([
        supabase
          .from("services")
          .select(
            "id,name,description,duration_minutes,price,active,created_at,currency"
          )
          .order("active", { ascending: false })
          .order("name", { ascending: true }),

        supabase
          .from("appointments")
          .select(
            "id,start_at,status,service_id,service:services(name,price),customer:customers(full_name)"
          )
          .order("start_at", { ascending: false })
          .limit(5000),
      ]);

      if (servicesResponse.error) {
        console.error("Error loading services:", servicesResponse.error);
        setError("No se pudieron cargar los servicios.");
        setServices([]);
      } else {
        setServices(
          (servicesResponse.data ?? []).map((service) => ({
            ...service,
            price: Number(service.price),
            duration_minutes: Number(service.duration_minutes),
          }))
        );
      }

      if (!appointmentsResponse.error) {
        setAppointments(
          (appointmentsResponse.data ?? []).map((appointment: any) => ({
            ...appointment,
            service: Array.isArray(appointment.service)
              ? appointment.service[0] ?? null
              : appointment.service ?? null,
            customer: Array.isArray(appointment.customer)
              ? appointment.customer[0] ?? null
              : appointment.customer ?? null,
          }))
        );
      }

      setLoading(false);
    }

    load();
  }, [supabase]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeServices = useMemo(
    () => services.filter((service) => service.active),
    [services]
  );

  const inactiveServices = useMemo(
    () => services.filter((service) => !service.active),
    [services]
  );

  const serviceUsage = useMemo(() => {
    const map: Record<string, number> = {};

    appointments.forEach((appointment) => {
      if (!appointment.service_id) return;
      if (appointment.status === "cancelled" || appointment.status === "no_show")
        return;

      map[appointment.service_id] = (map[appointment.service_id] ?? 0) + 1;
    });

    return map;
  }, [appointments]);

  const serviceRevenue = useMemo(() => {
    const map: Record<string, number> = {};

    appointments.forEach((appointment) => {
      if (!appointment.service_id) return;
      if (appointment.status === "cancelled" || appointment.status === "no_show")
        return;

      const servicePrice =
        Number(appointment.service?.price ?? 0) ||
        services.find((service) => service.id === appointment.service_id)?.price ||
        0;

      map[appointment.service_id] =
        (map[appointment.service_id] ?? 0) + servicePrice;
    });

    return map;
  }, [appointments, services]);

  const totalUsage = useMemo(
    () => Object.values(serviceUsage).reduce((sum, value) => sum + value, 0),
    [serviceUsage]
  );

  const totalRevenue = useMemo(
    () => Object.values(serviceRevenue).reduce((sum, value) => sum + value, 0),
    [serviceRevenue]
  );

  const averagePrice = useMemo(() => {
    if (!services.length) return 0;
    return services.reduce((sum, service) => sum + service.price, 0) / services.length;
  }, [services]);

  const averageDuration = useMemo(() => {
    if (!services.length) return 0;
    return (
      services.reduce((sum, service) => sum + service.duration_minutes, 0) /
      services.length
    );
  }, [services]);

  const mostPopularService = useMemo(() => {
    return services.reduce<Service | null>((winner, service) => {
      if (!winner) return service;
      return (serviceUsage[service.id] ?? 0) > (serviceUsage[winner.id] ?? 0)
        ? service
        : winner;
    }, null);
  }, [services, serviceUsage]);

  const filteredServices = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return services.filter((service) => {
      const matchesSearch =
        !normalized ||
        service.name.toLowerCase().includes(normalized) ||
        service.description?.toLowerCase().includes(normalized);

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && service.active) ||
        (filter === "inactive" && !service.active);

      return Boolean(matchesSearch && matchesFilter);
    });
  }, [services, search, filter]);

  const chartData = useMemo(() => {
    const now = new Date();
    const labels: string[] = [];
    const values: number[] = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
      const day = new Date(now);
      day.setHours(0, 0, 0, 0);
      day.setDate(now.getDate() - offset);

      labels.push(
        new Intl.DateTimeFormat("es-AR", {
          weekday: "short",
        })
          .format(day)
          .replace(".", "")
      );

      const value = appointments.reduce((sum, appointment) => {
        const appointmentDate = new Date(appointment.start_at);
        if (
          appointment.status === "cancelled" ||
          appointment.status === "no_show"
        )
          return sum;

        if (
          appointmentDate.getFullYear() === day.getFullYear() &&
          appointmentDate.getMonth() === day.getMonth() &&
          appointmentDate.getDate() === day.getDate()
        ) {
          return sum + Number(appointment.service?.price ?? 0);
        }

        return sum;
      }, 0);

      values.push(value);
    }

    return { labels, values };
  }, [appointments]);

  function openCreate() {
    setEditingService(null);
    setForm({
      name: "",
      description: "",
      duration_minutes: 30,
      price: "",
      currency: "ARS",
      active: true,
    });
    setShowServiceModal(true);
  }

  function openEdit(service: Service) {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description ?? "",
      duration_minutes: service.duration_minutes,
      price: String(service.price),
      currency: service.currency,
      active: service.active,
    });
    setShowServiceModal(true);
  }

  async function saveService() {
    if (!form.name.trim()) {
      setToast("Ingresá un nombre para el servicio.");
      return;
    }

    const numericPrice = Number(form.price);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      setToast("Ingresá un precio válido.");
      return;
    }

    if (!form.duration_minutes || form.duration_minutes < 5) {
      setToast("La duración mínima es de 5 minutos.");
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      duration_minutes: Number(form.duration_minutes),
      price: numericPrice,
      currency: form.currency,
      active: form.active,
    };

    if (editingService) {
      const { data, error: updateError } = await supabase
        .from("services")
        .update(payload)
        .eq("id", editingService.id)
        .select(
          "id,name,description,duration_minutes,price,active,created_at,currency"
        )
        .single();

      if (updateError) {
        console.error(updateError);
        setToast("No se pudo actualizar el servicio.");
      } else {
        const normalized = {
          ...data,
          price: Number(data.price),
          duration_minutes: Number(data.duration_minutes),
        };

        setServices((current) =>
          current.map((service) =>
            service.id === normalized.id ? normalized : service
          )
        );

        setSelectedService((current) =>
          current?.id === normalized.id ? normalized : current
        );

        setToast("Servicio actualizado.");
        setShowServiceModal(false);
      }
    } else {
      const { data, error: insertError } = await supabase
        .from("services")
        .insert(payload)
        .select(
          "id,name,description,duration_minutes,price,active,created_at,currency"
        )
        .single();

      if (insertError) {
        console.error(insertError);
        setToast("No se pudo crear el servicio.");
      } else {
        const normalized = {
          ...data,
          price: Number(data.price),
          duration_minutes: Number(data.duration_minutes),
        };

        setServices((current) => [...current, normalized]);
        setSelectedService(normalized);
        setToast("Servicio creado correctamente.");
        setShowServiceModal(false);
      }
    }

    setSaving(false);
  }

  async function toggleService(service: Service) {
    const nextActive = !service.active;

    const { error: updateError } = await supabase
      .from("services")
      .update({ active: nextActive })
      .eq("id", service.id);

    if (updateError) {
      console.error(updateError);
      setToast("No se pudo cambiar el estado.");
      return;
    }

    setServices((current) =>
      current.map((item) =>
        item.id === service.id ? { ...item, active: nextActive } : item
      )
    );

    setSelectedService((current) =>
      current?.id === service.id ? { ...current, active: nextActive } : current
    );

    setToast(nextActive ? "Servicio activado." : "Servicio desactivado.");
  }

  function selectService(service: Service) {
    setSelectedService(service);
    setShowMoreActions(false);
  }

  return (
    <div className="min-h-screen bg-[#090A0B] text-white">
      {/* HEADER */}
      <header className="border-b border-white/[0.07] bg-[#090A0B]/95 px-7 py-7 backdrop-blur-xl lg:px-8">
        <div className="mx-auto max-w-[1700px]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FF6A18]">
                <Scissors size={13} strokeWidth={1.8} />
                Operaciones
              </div>

              <h1 className="text-[30px] font-semibold tracking-[-0.045em] text-white">
                Servicios
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
                Gestioná tu catálogo, precios, disponibilidad y rendimiento
                comercial desde un único centro de control.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5 text-[11px] text-white/35 lg:flex">
                <BarChart3 size={14} />
                {totalUsage} atenciones registradas
              </div>

              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF5A00] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_8px_30px_rgba(255,90,0,0.14)] transition hover:bg-[#ff6816] active:scale-[0.99]"
              >
                <Plus size={15} strokeWidth={2} />
                Nuevo servicio
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1700px] px-7 py-7 lg:px-8">
        {/* KPI GRID */}
        <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Catálogo"
            value={services.length}
            caption={`${activeServices.length} activos ahora`}
            icon={Scissors}
            accent
          />

          <StatCard
            label="Precio promedio"
            value={formatCompactPrice(averagePrice)}
            caption="promedio del catálogo"
            icon={DollarSign}
          />

          <StatCard
            label="Atenciones"
            value={totalUsage}
            caption="reservas no canceladas"
            icon={CalendarDays}
          />

          <StatCard
            label="Ingresos atribuibles"
            value={formatCompactPrice(totalRevenue)}
            caption="según servicios registrados"
            icon={TrendingUp}
          />

          <StatCard
            label="Duración media"
            value={formatDuration(Math.round(averageDuration))}
            caption="tiempo medio por servicio"
            icon={Clock3}
          />
        </section>

        {/* BUSINESS INTELLIGENCE */}
        <section className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1.65fr_1fr]">
          <div className="rounded-2xl border border-white/[0.075] bg-[#111213]">
            <div className="flex items-start justify-between gap-5 border-b border-white/[0.06] px-6 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-white">
                    Actividad de servicios
                  </h2>
                  <span className="rounded-full border border-[#FF5A00]/15 bg-[#FF5A00]/[0.06] px-2 py-0.5 text-[9px] font-medium text-[#FF7A32]">
                    7 días
                  </span>
                </div>
                <p className="mt-1 text-xs text-white/32">
                  Evolución diaria de los ingresos asociados al catálogo.
                </p>
              </div>

              <div className="hidden items-center gap-2 text-[10px] text-white/25 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A00]" />
                Ingresos
              </div>
            </div>

            <div className="px-6 pb-5 pt-4">
              {chartData.values.some((value) => value > 0) ? (
                <MiniBarChart values={chartData.values} labels={chartData.labels} />
              ) : (
                <div className="flex h-40 items-center justify-center text-xs text-white/25">
                  Todavía no hay suficiente actividad para mostrar la evolución.
                </div>
              )}

              <div className="mt-1 flex items-center justify-between border-t border-white/[0.055] pt-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/25">
                    Servicio líder
                  </p>
                  <p className="mt-1 text-sm font-medium text-white/75">
                    {mostPopularService?.name ?? "Sin datos"}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/25">
                    Participación
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-white/75">
                    {mostPopularService && totalUsage > 0
                      ? `${Math.round(
                          ((serviceUsage[mostPopularService.id] ?? 0) /
                            totalUsage) *
                            100
                        )}%`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.075] bg-[#111213]">
            <div className="border-b border-white/[0.06] px-6 py-5">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#FF6A18]" />
                <h2 className="text-sm font-semibold text-white">
                  Oportunidades del catálogo
                </h2>
              </div>
              <p className="mt-1 text-xs text-white/32">
                Señales útiles para mejorar la oferta.
              </p>
            </div>

            <div className="divide-y divide-white/[0.055]">
              <div className="flex items-center gap-3 px-6 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-white/40">
                  <TrendingUp size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white/75">
                    Servicio más solicitado
                  </p>
                  <p className="mt-1 truncate text-[11px] text-white/30">
                    {mostPopularService?.name ?? "Sin actividad registrada"}
                  </p>
                </div>
                {mostPopularService && (
                  <span className="text-xs font-semibold tabular-nums text-[#FF6A18]">
                    {serviceUsage[mostPopularService.id] ?? 0}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 px-6 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-white/40">
                  <EyeOff size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white/75">
                    Servicios ocultos
                  </p>
                  <p className="mt-1 text-[11px] text-white/30">
                    No aparecen en nuevas reservas.
                  </p>
                </div>
                <span className="text-xs font-semibold tabular-nums text-white/60">
                  {inactiveServices.length}
                </span>
              </div>

              <div className="flex items-center gap-3 px-6 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-white/40">
                  <Clock3 size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white/75">
                    Capacidad media
                  </p>
                  <p className="mt-1 text-[11px] text-white/30">
                    Duración promedio de una atención.
                  </p>
                </div>
                <span className="text-xs font-semibold tabular-nums text-white/60">
                  {formatDuration(Math.round(averageDuration))}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* CATALOGUE */}
        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.075] bg-[#111213]">
          <div className="border-b border-white/[0.06] px-5 py-4 lg:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Catálogo de servicios
                </h2>
                <p className="mt-1 text-xs text-white/30">
                  {filteredServices.length} de {services.length} servicios visibles
                </p>
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row">
                <div className="flex min-w-[280px] items-center gap-2.5 rounded-xl border border-white/[0.075] bg-[#0c0d0e] px-3.5 py-2.5">
                  <Search size={15} className="text-white/25" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar servicio..."
                    className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/20"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="text-white/25 transition hover:text-white"
                      aria-label="Limpiar búsqueda"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex rounded-xl border border-white/[0.075] bg-[#0c0d0e] p-1">
                  {(
                    [
                      ["all", "Todos"],
                      ["active", "Activos"],
                      ["inactive", "Inactivos"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilter(key)}
                      className={`rounded-lg px-3 py-2 text-[10px] font-medium transition ${
                        filter === key
                          ? "bg-white/[0.08] text-white"
                          : "text-white/30 hover:text-white/65"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* TABLE HEADER */}
          <div className="hidden grid-cols-[minmax(0,1fr)_120px_130px_110px_34px] gap-4 border-b border-white/[0.055] bg-white/[0.012] px-5 py-2.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/20 md:grid">
            <span>Servicio</span>
            <span className="text-right">Uso</span>
            <span className="text-right">Ingresos</span>
            <span className="text-right">Precio</span>
            <span />
          </div>

          {loading ? (
            <div className="space-y-0">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 border-b border-white/[0.05] px-5 py-5"
                >
                  <div className="h-10 w-10 animate-pulse rounded-xl bg-white/[0.04]" />
                  <div className="flex-1">
                    <div className="h-3 w-40 animate-pulse rounded bg-white/[0.05]" />
                    <div className="mt-2 h-2.5 w-28 animate-pulse rounded bg-white/[0.035]" />
                  </div>
                  <div className="hidden h-3 w-16 animate-pulse rounded bg-white/[0.04] sm:block" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <CircleX size={22} className="text-red-300/70" />
              <p className="mt-3 text-sm font-medium text-white/75">{error}</p>
              <p className="mt-1 text-xs text-white/30">
                Revisá la conexión con Supabase y volvé a intentar.
              </p>
            </div>
          ) : filteredServices.length === 0 ? (
            <EmptyState search={search} onCreate={openCreate} />
          ) : (
            <div>
              {filteredServices.map((service) => (
                <ServiceRow
                  key={service.id}
                  service={service}
                  usage={serviceUsage[service.id] ?? 0}
                  revenue={serviceRevenue[service.id] ?? 0}
                  selected={selectedService?.id === service.id}
                  onSelect={() => selectService(service)}
                  onEdit={() => openEdit(service)}
                  onToggle={() => toggleService(service)}
                />
              ))}
            </div>
          )}
        </section>

        {/* FOOTER NOTE */}
        <div className="mt-4 flex items-center gap-2 px-1 text-[10px] text-white/20">
          <RefreshCw size={11} />
          Los ingresos atribuibles se calculan a partir de turnos no cancelados
          registrados en Supabase.
        </div>
      </main>

      {/* DETAIL DRAWER */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Cerrar detalle"
            onClick={() => setSelectedService(null)}
            className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px]"
          />

          <aside className="relative h-full w-full max-w-[470px] overflow-y-auto border-l border-white/[0.08] bg-[#0B0C0D] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-[#0B0C0D]/95 px-6 py-5 backdrop-blur-xl">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#FF6A18]">
                  Service 360
                </p>
                <h2 className="mt-1 text-base font-semibold text-white">
                  Detalle del servicio
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedService(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/[0.05] hover:text-white"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#FF5A00]/20 bg-[#FF5A00]/[0.08] text-[#FF6A18]">
                  <Scissors size={22} strokeWidth={1.5} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
                      {selectedService.name}
                    </h3>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[9px] font-medium ${
                        selectedService.active
                          ? "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300"
                          : "border-white/[0.08] bg-white/[0.025] text-white/30"
                      }`}
                    >
                      {selectedService.active ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-white/35">
                    {selectedService.description ||
                      "Sin descripción configurada."}
                  </p>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[0.07] bg-[#111213] p-4">
                  <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25">
                    <DollarSign size={11} />
                    Precio
                  </div>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                    {formatPrice(
                      selectedService.price,
                      selectedService.currency
                    )}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-[#111213] p-4">
                  <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25">
                    <Clock3 size={11} />
                    Duración
                  </div>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                    {formatDuration(selectedService.duration_minutes)}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/[0.07] bg-[#111213] p-4">
                  <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25">
                    <CalendarDays size={11} />
                    Atenciones
                  </div>
                  <p className="mt-3 text-2xl font-semibold tabular-nums tracking-[-0.04em] text-white">
                    {serviceUsage[selectedService.id] ?? 0}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.07] bg-[#111213] p-4">
                  <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25">
                    <TrendingUp size={11} />
                    Ingresos
                  </div>
                  <p className="mt-3 text-xl font-semibold tabular-nums tracking-[-0.04em] text-white">
                    {formatCompactPrice(
                      serviceRevenue[selectedService.id] ?? 0,
                      selectedService.currency
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/[0.07] bg-[#111213]">
                <div className="border-b border-white/[0.06] px-4 py-4">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25">
                    Configuración
                  </p>
                </div>

                <div className="divide-y divide-white/[0.055]">
                  <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                    <span className="text-xs text-white/35">Moneda</span>
                    <span className="text-xs font-medium text-white/70">
                      {selectedService.currency}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                    <span className="text-xs text-white/35">Estado</span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-white/65">
                      {selectedService.active ? (
                        <CircleCheck size={13} className="text-emerald-300" />
                      ) : (
                        <CircleX size={13} className="text-white/25" />
                      )}
                      {selectedService.active
                        ? "Disponible para reservas"
                        : "Oculto de nuevas reservas"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                    <span className="text-xs text-white/35">Creado</span>
                    <span className="text-xs font-medium text-white/60">
                      {formatDate(selectedService.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-white/25">
                  Acciones
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => openEdit(selectedService)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-3 text-xs font-medium text-white/65 transition hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-white"
                  >
                    <Pencil size={13} />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleService(selectedService)}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-3 text-xs font-medium text-white/65 transition hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-white"
                  >
                    {selectedService.active ? (
                      <>
                        <Archive size={13} />
                        Desactivar
                      </>
                    ) : (
                      <>
                        <Check size={13} />
                        Activar
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-[#FF5A00]/10 bg-[#FF5A00]/[0.035] p-4">
                <div className="flex items-start gap-3">
                  <Sparkles
                    size={15}
                    className="mt-0.5 shrink-0 text-[#FF6A18]"
                  />
                  <p className="text-[11px] leading-5 text-white/35">
                    Este servicio alimenta la Agenda, los ingresos del
                    Dashboard, Analytics y las futuras herramientas de
                    fidelización de BarberOS.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showServiceModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-white/[0.09] bg-[#0D0E0F] shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/[0.07] px-6 py-5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#FF6A18]">
                  {editingService ? "Editar catálogo" : "Nuevo catálogo"}
                </p>
                <h2 className="mt-1 text-base font-semibold text-white">
                  {editingService ? "Editar servicio" : "Crear servicio"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/[0.05] hover:text-white"
                aria-label="Cerrar modal"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <label className="block">
                <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.14em] text-white/30">
                  Nombre
                </span>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Ej. Corte clásico"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#08090A] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-[#FF5A00]/40"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.14em] text-white/30">
                  Descripción
                </span>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Descripción breve que puede mostrarse al reservar."
                  className="w-full resize-none rounded-xl border border-white/[0.08] bg-[#08090A] px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-[#FF5A00]/40"
                />
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.14em] text-white/30">
                    Precio
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                    placeholder="15000"
                    className="w-full rounded-xl border border-white/[0.08] bg-[#08090A] px-3.5 py-3 text-sm tabular-nums text-white outline-none focus:border-[#FF5A00]/40"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.14em] text-white/30">
                    Duración
                  </span>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={form.duration_minutes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        duration_minutes: Number(event.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-[#08090A] px-3.5 py-3 text-sm tabular-nums text-white outline-none focus:border-[#FF5A00]/40"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[10px] font-medium uppercase tracking-[0.14em] text-white/30">
                    Moneda
                  </span>
                  <select
                    value={form.currency}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        currency: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/[0.08] bg-[#08090A] px-3.5 py-3 text-sm text-white outline-none focus:border-[#FF5A00]/40"
                  >
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
              </div>

              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    active: !current.active,
                  }))
                }
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 transition ${
                  form.active
                    ? "border-emerald-400/15 bg-emerald-400/[0.045]"
                    : "border-white/[0.07] bg-white/[0.02]"
                }`}
              >
                <div className="flex items-center gap-3">
                  {form.active ? (
                    <Eye size={15} className="text-emerald-300" />
                  ) : (
                    <EyeOff size={15} className="text-white/30" />
                  )}
                  <div className="text-left">
                    <p className="text-xs font-medium text-white/75">
                      Disponible para reservas
                    </p>
                    <p className="mt-1 text-[10px] text-white/30">
                      {form.active
                        ? "El servicio aparecerá en nuevos turnos."
                        : "El servicio quedará oculto del flujo de reserva."}
                    </p>
                  </div>
                </div>

                <div
                  className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${
                    form.active ? "bg-[#FF5A00]" : "bg-white/[0.12]"
                  }`}
                >
                  <span
                    className={`h-4 w-4 rounded-full bg-white transition ${
                      form.active ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/[0.07] px-6 py-4">
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="rounded-xl px-4 py-2.5 text-xs font-medium text-white/40 transition hover:text-white"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={saveService}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF5A00] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#ff6816] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check size={13} />
                    {editingService ? "Guardar cambios" : "Crear servicio"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-[80] flex max-w-[360px] items-center gap-3 rounded-xl border border-white/[0.09] bg-[#111213] px-4 py-3 shadow-2xl">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-400/[0.08] text-emerald-300">
            <Check size={14} />
          </div>
          <p className="text-xs font-medium text-white/75">{toast}</p>
        </div>
      )}
    </div>
  );
}
