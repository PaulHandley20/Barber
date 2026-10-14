"use client";

import { formatMoney } from "@/components/admin/format";
import { useEffect, useMemo, useState } from "react";
import { manrope, sora, dataFont } from "@/components/admin/fonts";
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
  CalendarDays,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Check,
  Archive,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import BarChart, { compactNumber } from "@/components/admin/ui/BarChart";




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
};

type ServiceFilter = "all" | "active" | "inactive";

function formatPrice(price: number, currency = "ARS") {
  if (currency === "USD") {
    return `US$ ${price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return formatMoney(price);
}

function formatCompactPrice(price: number, currency = "ARS") {
  if (currency === "USD") {
    return `US$ ${Math.round(price).toLocaleString("en-US")}`;
  }

  return formatMoney(price);
}

/* Duración siempre en minutos ("60 min", "90 min"), como se habla en la barbería. */
function formatDuration(minutes: number) {
  return `${minutes} min`;
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
  if (status === "completed") {
    return "border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300";
  }

  if (status === "confirmed") {
    return "border-sky-400/15 bg-sky-400/[0.07] text-sky-300";
  }

  if (status === "pending") {
    return "border-amber-400/15 bg-amber-400/[0.07] text-amber-300";
  }

  if (status === "cancelled") {
    return "border-red-400/15 bg-red-400/[0.07] text-red-300";
  }

  return "border-white/[0.08] bg-white/[0.025] text-white/45";
}

function StatCard({
  label,
  value,
  helper,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: typeof Scissors;
  accent?: boolean;
}) {
  return (
    <div className="metric-card panel-surface group relative min-h-[154px] p-5">
      {accent ? (
        <div className="absolute left-0 top-0 h-px w-1/2 bg-gradient-to-r from-[#ff5a00]/75 to-transparent" />
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={accent ? "text-[#ff6a18]" : "text-white/42"}>
            <Icon size={15} strokeWidth={1.7} />
          </span>
          <span className="meta-label text-white/68">{label}</span>
        </div>

      </div>

      <div className="display mt-7 truncate text-[30px] font-semibold leading-none tracking-[-.065em] text-white">
        {value}
      </div>

      <div className="mt-3 truncate text-[12px] leading-5 text-white/60">
        {helper}
      </div>
    </div>
  );
}

function MiniRevenueChart({
  values,
  labels,
}: {
  values: number[];
  labels: string[];
}) {
  return (
    <div className="rounded-[14px] border border-white/[0.055] bg-[#080808] p-4">
      <BarChart
        height={180}
        seriesLabel="Ingresos"
        formatValue={formatMoney}
        formatAxis={(value) => `$${compactNumber(value)}`}
        ariaLabel="Ingresos diarios del catálogo"
        data={values.map((value, index) => ({
          key: `${labels[index]}-${index}`,
          label: labels[index],
          value,
        }))}
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
    <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[14px] border border-white/[0.08] bg-[#0c0d0e] text-white/38">
        <Scissors size={22} strokeWidth={1.5} />
      </div>

      <h3 className="display text-[18px] font-semibold tracking-[-.04em] text-white">
        {search ? "No encontramos servicios" : "Todavía no hay servicios"}
      </h3>

      <p className="mt-2 max-w-md text-[13px] leading-5 text-white/60">
        {search
          ? "Probá con otro término o limpiá la búsqueda para volver a ver el catálogo."
          : "Creá el primer servicio para empezar a construir el catálogo de BarberOS."}
      </p>

      {!search ? (
        <button
          type="button"
          onClick={onCreate}
          className="primary-action mt-5 inline-flex h-10 items-center gap-2 rounded-[11px] px-4 text-[12px] font-semibold text-white"
        >
          <Plus size={14} />
          Crear servicio
        </button>
      ) : null}
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
}: {
  service: Service;
  usage: number;
  revenue: number;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className={`service-row group grid items-center gap-4 border-b border-white/[0.055] px-5 py-4 transition sm:px-6 md:grid-cols-[minmax(0,1fr)_110px_135px_120px_40px] ${
        selected ? "bg-[#ff5a00]/[0.045]" : "hover:bg-white/[0.018]"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="min-w-0 text-left focus-ring"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] border ${
              selected
                ? "border-[#ff5a00]/20 bg-[#ff5a00]/10 text-[#ff6a18]"
                : "border-white/[0.07] bg-white/[0.018] text-white/44"
            }`}
          >
            <Scissors size={16} strokeWidth={1.5} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-[14px] font-semibold tracking-[-.02em] text-white/90">
                {service.name}
              </span>

              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${
                  service.active
                    ? "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300"
                    : "border-white/[0.08] bg-white/[0.025] text-white/36"
                }`}
              >
                {service.active ? "Activo" : "Inactivo"}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-3 text-[12px] leading-5 text-white/58">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 size={12} />
                {formatDuration(service.duration_minutes)}
              </span>

              {service.description ? (
                <span className="hidden truncate lg:block">
                  {service.description}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </button>

      <div className="hidden text-right md:block">
        <p className="display text-[15px] font-semibold tracking-[-.04em] text-white/90">
          {usage}
        </p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[.12em] text-white/48">
          turnos
        </p>
      </div>

      <div className="hidden text-right md:block">
        <p className="display text-[15px] font-semibold tracking-[-.04em] text-white/90">
          {formatCompactPrice(revenue, service.currency)}
        </p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[.12em] text-white/48">
          ingresos
        </p>
      </div>

      <div className="hidden text-right md:block">
        <p className="display text-[15px] font-semibold tracking-[-.04em] text-white">
          {formatPrice(service.price, service.currency)}
        </p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[.12em] text-white/48">
          precio
        </p>
      </div>

      <button
        type="button"
        aria-label={`Editar ${service.name}`}
        onClick={onEdit}
        className="ml-auto flex h-9 w-9 items-center justify-center rounded-[10px] text-white/30 transition hover:bg-white/[0.05] hover:text-white focus-ring"
      >
        <MoreHorizontal size={17} />
      </button>

      <div className="mt-2 flex items-center gap-4 pl-[52px] md:hidden">
        <span className="text-[11px] text-white/58">
          {usage} turnos
        </span>
        <span className="text-[11px] text-white/58">
          {formatCompactPrice(revenue, service.currency)} ingresos
        </span>
        <span className="text-[11px] font-semibold text-white/84">
          {formatPrice(service.price, service.currency)}
        </span>
      </div>
    </div>
  );
}

export default function ServiciosPage() {
  const supabase = createClient();

  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ServiceFilter>("all");
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
    duration_minutes: 30,
    price: "",
    currency: "ARS",
    active: true,
  });

  useEffect(() => {
    const surfaces = document.querySelectorAll<HTMLElement>(
      ".barberos-services .metric-card, .barberos-services .panel-surface"
    );

    const handlers = new Map<HTMLElement, (event: PointerEvent) => void>();

    surfaces.forEach((element) => {
      const handler = (event: PointerEvent) => {
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

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
  }, [services.length]);

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
            "id,start_at,status,service_id,service:services(name,price)"
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

      if (
        appointment.status === "cancelled" ||
        appointment.status === "no_show"
      ) {
        return;
      }

      map[appointment.service_id] =
        (map[appointment.service_id] ?? 0) + 1;
    });

    return map;
  }, [appointments]);

  const serviceRevenue = useMemo(() => {
    const map: Record<string, number> = {};

    appointments.forEach((appointment) => {
      if (!appointment.service_id) return;

      if (
        appointment.status === "cancelled" ||
        appointment.status === "no_show"
      ) {
        return;
      }

      const fallbackPrice =
        services.find((service) => service.id === appointment.service_id)
          ?.price ?? 0;

      const price = Number(appointment.service?.price ?? 0) || fallbackPrice;

      map[appointment.service_id] =
        (map[appointment.service_id] ?? 0) + price;
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

    return (
      services.reduce((sum, service) => sum + service.price, 0) /
      services.length
    );
  }, [services]);

  const averageDuration = useMemo(() => {
    if (!services.length) return 0;

    return (
      services.reduce(
        (sum, service) => sum + service.duration_minutes,
        0
      ) / services.length
    );
  }, [services]);

  const mostPopularService = useMemo(() => {
    return services.reduce<Service | null>((winner, service) => {
      if (!winner) return service;

      return (serviceUsage[service.id] ?? 0) >
        (serviceUsage[winner.id] ?? 0)
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

  const rankedServices = useMemo(() => {
    return [...services].sort(
      (a, b) =>
        (serviceRevenue[b.id] ?? 0) - (serviceRevenue[a.id] ?? 0) ||
        (serviceUsage[b.id] ?? 0) - (serviceUsage[a.id] ?? 0)
    );
  }, [services, serviceRevenue, serviceUsage]);

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
        if (
          appointment.status === "cancelled" ||
          appointment.status === "no_show"
        ) {
          return sum;
        }

        const appointmentDate = new Date(appointment.start_at);

        if (
          appointmentDate.getFullYear() === day.getFullYear() &&
          appointmentDate.getMonth() === day.getMonth() &&
          appointmentDate.getDate() === day.getDate()
        ) {
          return (
            sum +
            Number(
              appointment.service?.price ??
                services.find(
                  (service) => service.id === appointment.service_id
                )?.price ??
                0
            )
          );
        }

        return sum;
      }, 0);

      values.push(value);
    }

    return { labels, values };
  }, [appointments, services]);

  const leadingServiceShare = useMemo(() => {
    if (!mostPopularService || totalUsage === 0) return "—";

    return `${Math.round(
      ((serviceUsage[mostPopularService.id] ?? 0) / totalUsage) * 100
    )}%`;
  }, [mostPopularService, serviceUsage, totalUsage]);

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
        item.id === service.id
          ? { ...item, active: nextActive }
          : item
      )
    );

    setSelectedService((current) =>
      current?.id === service.id
        ? { ...current, active: nextActive }
        : current
    );

    setToast(nextActive ? "Servicio activado." : "Servicio desactivado.");
  }

  return (
    <main
      className={`${manrope.variable} ${sora.variable} ${dataFont.variable} barberos-services min-h-screen text-white`}
    >
      <style jsx global>{`
        .barberos-services {
          --line: rgba(255, 255, 255, 0.075);
          --line-soft: rgba(255, 255, 255, 0.045);
          --muted: rgba(255, 255, 255, 0.60);
          --quiet: rgba(255, 255, 255, 0.42);
          --orange: #ff5a00;
          --orange-bright: #ff7a22;
          font-family: var(--font-barberos-ui), Manrope, sans-serif;
          font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          letter-spacing: -0.014em;
          background:
            radial-gradient(
              720px 360px at 88% -8%,
              rgba(255, 90, 0, 0.045),
              transparent 70%
            ),
            radial-gradient(
              520px 320px at 8% 14%,
              rgba(255, 255, 255, 0.01),
              transparent 74%
            ),
            transparent;
        }

        .barberos-services h1,
        .barberos-services h2,
        .barberos-services h3,
        .barberos-services h4,
        .barberos-services .display {
          font-family: var(--font-barberos-display), Sora, sans-serif;
          font-feature-settings: "kern" 1, "liga" 1;
          text-wrap: balance;
        }

        .barberos-services .display-title {
          font-family: var(--font-barberos-display), Sora, sans-serif;
          font-size: 34px;
          line-height: 0.91;
          letter-spacing: -0.075em;
          font-weight: 600;
        }

        .barberos-services .data {
          font-family: var(--font-barberos-data), Sora, sans-serif;
          font-variant-numeric: tabular-nums;
        }

        .barberos-services .meta-label {
          font-family: var(--font-barberos-ui), Manrope, sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-size: 9px;
          line-height: 1;
          font-weight: 700;
        }

        .barberos-services .eyebrow {
          font-family: var(--font-barberos-ui), Manrope, sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 9px;
          line-height: 1;
          font-weight: 800;
        }

        .barberos-services .panel-surface {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 16px;
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.028),
              rgba(255, 255, 255, 0.01) 52%,
              rgba(255, 90, 0, 0.012)
            ),
            rgba(10, 10, 10, 0.96);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.022),
            0 18px 58px rgba(0, 0, 0, 0.15);
          transition:
            transform 240ms cubic-bezier(0.22, 0.61, 0.36, 1),
            border-color 240ms ease,
            box-shadow 240ms ease;
        }

        .barberos-services .panel-surface::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background: radial-gradient(
            480px circle at var(--spot-x, 82%) var(--spot-y, -8%),
            rgba(255, 90, 0, 0.052),
            rgba(255, 90, 0, 0.012) 32%,
            transparent 68%
          );
          opacity: 0.34;
          transition: opacity 260ms ease;
        }

        .barberos-services .panel-surface::after {
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
            rgba(255, 255, 255, 0.12),
            rgba(255, 90, 0, 0.2),
            rgba(255, 255, 255, 0.08),
            transparent
          );
          opacity: 0.2;
        }

        .barberos-services .panel-surface:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 90, 0, 0.14);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.032),
            0 24px 70px rgba(0, 0, 0, 0.22),
            0 0 0 1px rgba(255, 90, 0, 0.018);
        }

        .barberos-services .panel-surface:hover::before {
          opacity: 0.5;
        }

        .barberos-services .metric-card {
          min-height: 154px;
        }

        .barberos-services .metric-card::after {
          content: "";
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 0;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 90, 0, 0.78),
            transparent
          );
          transform: scaleX(0.16);
          transform-origin: center;
          opacity: 0.6;
          transition:
            transform 260ms ease,
            opacity 260ms ease;
        }

        .barberos-services .metric-card:hover::after {
          transform: scaleX(1);
          opacity: 1;
        }

        .barberos-services .primary-action {
          position: relative;
          overflow: hidden;
          background: linear-gradient(
            135deg,
            #ff6a18 0%,
            #ff5a00 52%,
            #e84b00 100%
          );
          box-shadow:
            0 12px 30px rgba(255, 90, 0, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.26);
        }

        .barberos-services .primary-action::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            108deg,
            transparent 20%,
            rgba(255, 255, 255, 0.3) 47%,
            transparent 72%
          );
          transform: translateX(-140%);
          transition: transform 650ms cubic-bezier(0.22, 0.61, 0.36, 1);
        }

        .barberos-services .primary-action:hover::before {
          transform: translateX(140%);
        }

        .barberos-services .glass-control {
          border: 1px solid rgba(255, 255, 255, 0.075);
          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.055),
              rgba(255, 255, 255, 0.018)
            );
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.03),
            0 10px 30px rgba(0, 0, 0, 0.16);
          backdrop-filter: blur(18px);
        }

        .barberos-services .services-input {
          border: 1px solid rgba(255, 255, 255, 0.075);
          background: rgba(255, 255, 255, 0.018);
          transition:
            border-color 180ms ease,
            background 180ms ease;
        }

        .barberos-services .services-input:focus-within {
          border-color: rgba(255, 90, 0, 0.38);
          background: rgba(255, 255, 255, 0.025);
        }

        .barberos-services .services-filter-active {
          background: rgba(255, 255, 255, 0.09);
          color: #fff;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
        }

        .barberos-services .service-row:hover {
          background:
            linear-gradient(
              90deg,
              rgba(255, 90, 0, 0.035),
              rgba(255, 255, 255, 0.018) 52%,
              transparent
            );
        }

        .barberos-services .focus-ring:focus-visible,
        .barberos-services button:focus-visible,
        .barberos-services input:focus-visible,
        .barberos-services textarea:focus-visible,
        .barberos-services select:focus-visible {
          outline: 2px solid rgba(255, 90, 0, 0.72);
          outline-offset: 3px;
        }

        .barberos-services .dashboard-grid-bg {
          background-image:
            linear-gradient(
              rgba(255, 255, 255, 0.013) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.013) 1px,
              transparent 1px
            );
          background-size: 48px 48px;
          mask-image: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.86),
            transparent 72%
          );
        }

        @media (min-width: 640px) {
          .barberos-services .display-title {
            font-size: 42px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .barberos-services *,
          .barberos-services *::before,
          .barberos-services *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 dashboard-grid-bg opacity-20" />

      <div className="relative mx-auto max-w-[1680px] px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
        <header className="mb-7 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/82">BarberOS</span>
              <span className="text-white/10">/</span>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff6a18]">Inteligencia de Servicios</span>
              <span className="ml-1 hidden h-px w-10 bg-gradient-to-r from-[#ff5a00]/55 to-transparent sm:block" />
            </div>

            <h1 className="display-title text-white">Servicios</h1>

            <p className="mt-2 max-w-xl text-[14px] leading-5 text-white/72">
              Gestioná tu catálogo, precios, disponibilidad y rendimiento
              desde un único lugar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={openCreate}
              className="primary-action group inline-flex h-11 items-center gap-2 rounded-[11px] px-4 text-[12px] font-semibold text-white"
            >
              <Plus size={15} strokeWidth={2} />
              <span>Nuevo servicio</span>
              <ArrowUpRight
                size={14}
                className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              />
            </button>
          </div>
        </header>

        <section className="mb-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            label="Servicios"
            value={services.length}
            helper={`${activeServices.length} activos · ${inactiveServices.length} inactivos`}
            icon={Scissors}
            accent
          />

          <StatCard
            label="Precio promedio"
            value={formatCompactPrice(averagePrice)}
            helper="Promedio actual del catálogo"
            icon={DollarSign}
          />

          <StatCard
            label="Ingresos"
            value={formatCompactPrice(totalRevenue)}
            helper="Generados por servicios registrados"
            icon={TrendingUp}
          />

          <StatCard
            label="Duración media"
            value={formatDuration(Math.round(averageDuration))}
            helper="Tiempo medio por servicio"
            icon={Clock3}
          />
        </section>

        <section className="mb-7 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(330px,.75fr)]">
          <div className="panel-surface p-5 sm:p-6">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <div className="eyebrow mb-2 text-[#ff6a18]">
                  INTELIGENCIA DE SERVICIOS
                </div>
                <h2 className="display text-[20px] font-semibold tracking-[-.04em] text-white">
                  Actividad del catálogo
                </h2>
                <p className="mt-1 text-[13px] leading-5 text-white/62">
                  Evolución diaria de los ingresos de los servicios.
                </p>
              </div>

              <div className="hidden items-center gap-2 text-[10px] font-medium uppercase tracking-[.14em] text-white/58 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ff5a00]" />
                Ingresos
              </div>
            </div>

            {chartData.values.some((value) => value > 0) ? (
              <MiniRevenueChart
                values={chartData.values}
                labels={chartData.labels}
              />
            ) : (
              <div className="flex h-[220px] items-center justify-center rounded-[14px] border border-dashed border-white/[0.07] bg-white/[0.012] text-[13px] text-white/58">
                Todavía no hay suficiente actividad para mostrar la evolución.
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-[12px] border border-white/[0.055] bg-white/[0.012] p-4">
                <div className="meta-label text-white/58">Servicio líder</div>
                <div className="display mt-2 text-[17px] font-semibold tracking-[-.035em] text-white">
                  {mostPopularService?.name ?? "Sin datos"}
                </div>
                <div className="mt-1 text-[12px] text-white/58">
                  {leadingServiceShare} de las atenciones
                </div>
              </div>

              <div className="rounded-[12px] border border-white/[0.055] bg-white/[0.012] p-4">
                <div className="meta-label text-white/58">Revenue registrado</div>
                <div className="display mt-2 text-[17px] font-semibold tracking-[-.035em] text-[#ff7a22]">
                  {formatCompactPrice(totalRevenue)}
                </div>
                <div className="mt-1 text-[12px] text-white/58">
                  Sobre turnos no cancelados
                </div>
              </div>
            </div>
          </div>

          <div className="panel-surface p-5 sm:p-6">
            <div className="eyebrow mb-2 text-[#ff6a18]">
              OPORTUNIDADES
            </div>
            <h2 className="display text-[20px] font-semibold tracking-[-.04em] text-white">
              Lo que mueve el catálogo
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-white/62">
              Los servicios con mayor actividad y facturación aparecen primero.
            </p>

            <div className="mt-5 space-y-2.5">
              {rankedServices.slice(0, 3).map((service, index) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => setSelectedService(service)}
                  className="interactive-row flex w-full items-center gap-3 rounded-[12px] border border-white/[0.055] bg-white/[0.012] p-3 text-left focus-ring"
                >
                  <span className="data w-5 text-[9px] text-white/34">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#ff5a00]/15 bg-[#ff5a00]/[0.05] text-[#ff6a18]">
                    <Scissors size={14} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-white/86">
                      {service.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-white/58">
                      {serviceUsage[service.id] ?? 0} turnos
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="display text-[13px] font-semibold text-white/90">
                      {formatCompactPrice(
                        serviceRevenue[service.id] ?? 0,
                        service.currency
                      )}
                    </div>
                    <div className="mt-0.5 text-[10px] text-white/48">
                      revenue
                    </div>
                  </div>

                  <ChevronRight size={14} className="text-white/28" />
                </button>
              ))}

              {rankedServices.length === 0 ? (
                <div className="rounded-[12px] border border-dashed border-white/[0.07] p-5 text-[13px] text-white/58">
                  Sin servicios cargados todavía.
                </div>
              ) : null}
            </div>

            <div className="mt-5 border-t border-white/[0.055] pt-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="meta-label text-white/58">
                    Catálogo activo
                  </div>
                  <div className="display mt-2 text-[19px] font-semibold tracking-[-.04em] text-white">
                    {activeServices.length} / {services.length}
                  </div>
                </div>

                <div className="data text-[11px] font-medium text-[#ff7a22]">
                  {services.length
                    ? `${Math.round(
                        (activeServices.length / services.length) * 100
                      )}%`
                    : "0%"}
                </div>
              </div>

              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#ff5a00] to-[#ff7a22]"
                  style={{
                    width: `${
                      services.length
                        ? (activeServices.length / services.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="panel-surface overflow-hidden">
          <div className="border-b border-white/[0.055] p-5 sm:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="eyebrow mb-2 text-[#ff6a18]">
                  DIRECTORIO OPERATIVO
                </div>
                <h2 className="display text-[20px] font-semibold tracking-[-.04em] text-white">
                  Catálogo de servicios
                </h2>
                <p className="mt-1 text-[13px] leading-5 text-white/62">
                  Precio, duración, demanda y estado de cada servicio.
                </p>
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row">
                <div className="services-input flex h-11 w-full items-center gap-2.5 rounded-[11px] px-3.5 sm:w-[300px]">
                  <Search size={15} className="shrink-0 text-white/38" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar servicio..."
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/38"
                  />
                </div>

                <div className="glass-control flex h-11 items-center rounded-[11px] p-1">
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
                      className={`h-9 rounded-[9px] px-3.5 text-[11px] font-semibold transition ${
                        filter === key
                          ? "services-filter-active"
                          : "text-white/52 hover:text-white/82"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="hidden grid-cols-[minmax(0,1fr)_110px_135px_120px_40px] gap-4 border-b border-white/[0.055] bg-white/[0.012] px-5 py-3 text-[9px] font-bold uppercase tracking-[.16em] text-white/48 md:grid md:px-6">
            <span>Servicio</span>
            <span className="text-right">Uso</span>
            <span className="text-right">Ingresos</span>
            <span className="text-right">Precio</span>
            <span />
          </div>

          {loading ? (
            <div>
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 border-b border-white/[0.05] px-5 py-5 sm:px-6"
                >
                  <div className="h-10 w-10 animate-pulse rounded-[11px] bg-white/[0.05]" />
                  <div className="flex-1">
                    <div className="h-3 w-40 animate-pulse rounded bg-white/[0.055]" />
                    <div className="mt-2 h-2.5 w-28 animate-pulse rounded bg-white/[0.035]" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 text-center">
              <CircleX size={24} className="text-red-300/80" />
              <p className="mt-3 text-[14px] font-medium text-white/82">
                {error}
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 inline-flex items-center gap-2 text-[12px] font-semibold text-[#ff7a22] hover:text-[#ff9a58]"
              >
                <RefreshCw size={13} />
                Reintentar
              </button>
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
                  onSelect={() => setSelectedService(service)}
                  onEdit={() => openEdit(service)}
                />
              ))}
            </div>
          )}
        </section>

        <div className="mt-4 flex items-center gap-2 px-1 text-[11px] leading-5 text-white/48">
          <RefreshCw size={12} />
          Los ingresos se calculan a partir de turnos no cancelados registrados en Supabase.
        </div>
      </div>

      {selectedService ? (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <button
            type="button"
            aria-label="Cerrar detalle"
            onClick={() => setSelectedService(null)}
            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-[2px]"
          />

          <aside className="relative h-full w-full max-w-[480px] overflow-y-auto border-l border-white/[0.08] bg-[#0b0b0b] shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-[#0b0b0b]/95 px-6 py-5 backdrop-blur-xl">
              <div>
                <div className="eyebrow text-[#ff6a18]">SERVICIO 360</div>
                <h2 className="display mt-1 text-[20px] font-semibold tracking-[-.04em] text-white">
                  Detalle del servicio
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedService(null)}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] text-white/38 transition hover:bg-white/[0.05] hover:text-white focus-ring"
                aria-label="Cerrar"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] border border-[#ff5a00]/20 bg-[#ff5a00]/[0.08] text-[#ff6a18]">
                  <Scissors size={22} strokeWidth={1.5} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="display text-[22px] font-semibold tracking-[-.045em] text-white">
                      {selectedService.name}
                    </h3>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold ${
                        selectedService.active
                          ? "border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300"
                          : "border-white/[0.08] bg-white/[0.025] text-white/36"
                      }`}
                    >
                      {selectedService.active ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  <p className="mt-2 text-[13px] leading-5 text-white/62">
                    {selectedService.description ||
                      "Sin descripción configurada."}
                  </p>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-3">
                <div className="rounded-[14px] border border-white/[0.065] bg-white/[0.012] p-4">
                  <div className="meta-label flex items-center gap-2 text-white/58">
                    <DollarSign size={12} />
                    Precio
                  </div>
                  <div className="display mt-3 text-[24px] font-semibold tracking-[-.055em] text-white">
                    {formatPrice(
                      selectedService.price,
                      selectedService.currency
                    )}
                  </div>
                </div>

                <div className="rounded-[14px] border border-white/[0.065] bg-white/[0.012] p-4">
                  <div className="meta-label flex items-center gap-2 text-white/58">
                    <Clock3 size={12} />
                    Duración
                  </div>
                  <div className="display mt-3 text-[24px] font-semibold tracking-[-.055em] text-white">
                    {formatDuration(selectedService.duration_minutes)}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-[14px] border border-white/[0.065] bg-white/[0.012] p-4">
                  <div className="meta-label flex items-center gap-2 text-white/58">
                    <CalendarDays size={12} />
                    Atenciones
                  </div>
                  <div className="display mt-3 text-[24px] font-semibold tracking-[-.055em] text-white">
                    {serviceUsage[selectedService.id] ?? 0}
                  </div>
                </div>

                <div className="rounded-[14px] border border-white/[0.065] bg-white/[0.012] p-4">
                  <div className="meta-label flex items-center gap-2 text-white/58">
                    <TrendingUp size={12} />
                    Ingresos
                  </div>
                  <div className="display mt-3 text-[20px] font-semibold tracking-[-.045em] text-[#ff7a22]">
                    {formatCompactPrice(
                      serviceRevenue[selectedService.id] ?? 0,
                      selectedService.currency
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[14px] border border-white/[0.065] bg-white/[0.012]">
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.055] px-4 py-3.5">
                  <span className="text-[12px] text-white/58">Estado</span>
                  <span className="inline-flex items-center gap-2 text-[12px] font-semibold text-white/84">
                    {selectedService.active ? (
                      <CircleCheck size={14} className="text-emerald-300" />
                    ) : (
                      <CircleX size={14} className="text-white/38" />
                    )}
                    {selectedService.active ? "Disponible" : "Inactivo"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 border-b border-white/[0.055] px-4 py-3.5">
                  <span className="text-[12px] text-white/58">Creado</span>
                  <span className="text-[12px] font-semibold text-white/78">
                    {formatDate(selectedService.created_at)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <span className="text-[12px] text-white/58">
                    Participación
                  </span>
                  <span className="data text-[12px] font-medium text-[#ff7a22]">
                    {totalUsage > 0
                      ? `${Math.round(
                          ((serviceUsage[selectedService.id] ?? 0) /
                            totalUsage) *
                            100
                        )}%`
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="mt-7">
                <div className="eyebrow mb-3 text-[#ff6a18]">ACCIONES</div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => openEdit(selectedService)}
                    className="flex h-11 items-center justify-center gap-2 rounded-[11px] border border-white/[0.08] bg-white/[0.025] text-[12px] font-semibold text-white/72 transition hover:border-white/[0.14] hover:bg-white/[0.045] hover:text-white focus-ring"
                  >
                    <Pencil size={14} />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleService(selectedService)}
                    className="flex h-11 items-center justify-center gap-2 rounded-[11px] border border-white/[0.08] bg-white/[0.025] text-[12px] font-semibold text-white/72 transition hover:border-white/[0.14] hover:bg-white/[0.045] hover:text-white focus-ring"
                  >
                    {selectedService.active ? (
                      <>
                        <Archive size={14} />
                        Desactivar
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        Activar
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-[14px] border border-[#ff5a00]/10 bg-[#ff5a00]/[0.035] p-4">
                <div className="flex items-start gap-3">
                  <Sparkles
                    size={15}
                    className="mt-0.5 shrink-0 text-[#ff6a18]"
                  />
                  <p className="text-[12px] leading-5 text-white/58">
                    Este servicio alimenta la Agenda, los ingresos del
                    Dashboard y Analytics de BarberOS.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {showServiceModal ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto sm:items-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[560px] overflow-hidden rounded-[16px] border border-white/[0.09] bg-[#0f0f0f] shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/[0.07] px-6 py-5">
              <div>
                <div className="eyebrow text-[#ff6a18]">
                  {editingService ? "EDITAR CATÁLOGO" : "NUEVO CATÁLOGO"}
                </div>
                <h2 className="display mt-1 text-[20px] font-semibold tracking-[-.04em] text-white">
                  {editingService ? "Editar servicio" : "Crear servicio"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-[10px] text-white/38 transition hover:bg-white/[0.05] hover:text-white focus-ring"
                aria-label="Cerrar modal"
              >
                <X size={17} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[.14em] text-white/62">
                  Nombre
                </span>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Ej. Corte clásico"
                  className="h-11 w-full rounded-[11px] border border-white/[0.08] bg-[#080808] px-3.5 text-[13px] text-white outline-none placeholder:text-white/38 focus:border-[#ff5a00]/40"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[.14em] text-white/62">
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
                  placeholder="Descripción que se mostrará en el catálogo y durante la reserva."
                  className="w-full resize-none rounded-[11px] border border-white/[0.08] bg-[#080808] px-3.5 py-3 text-[13px] leading-5 text-white outline-none placeholder:text-white/38 focus:border-[#ff5a00]/40"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[.14em] text-white/62">
                    Duración
                  </span>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={form.duration_minutes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        duration_minutes: Number(event.target.value),
                      }))
                    }
                    className="h-11 w-full rounded-[11px] border border-white/[0.08] bg-[#080808] px-3.5 text-[13px] text-white outline-none focus:border-[#ff5a00]/40"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[.14em] text-white/62">
                    Precio
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                    placeholder="20000"
                    className="h-11 w-full rounded-[11px] border border-white/[0.08] bg-[#080808] px-3.5 text-[13px] text-white outline-none placeholder:text-white/38 focus:border-[#ff5a00]/40"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[.14em] text-white/62">
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
                    className="h-11 w-full rounded-[11px] border border-white/[0.08] bg-[#080808] px-3.5 text-[13px] text-white outline-none focus:border-[#ff5a00]/40"
                  >
                    <option value="ARS">ARS · Pesos argentinos</option>
                    <option value="USD">USD · Dólares</option>
                  </select>
                </label>

                <div>
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[.14em] text-white/62">
                    Estado
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        active: !current.active,
                      }))
                    }
                    className={`flex h-11 w-full items-center justify-between rounded-[11px] border px-3.5 text-[12px] font-semibold transition ${
                      form.active
                        ? "border-emerald-400/15 bg-emerald-400/[0.055] text-emerald-300"
                        : "border-white/[0.08] bg-white/[0.025] text-white/50"
                    }`}
                  >
                    <span>{form.active ? "Activo" : "Inactivo"}</span>
                    {form.active ? (
                      <CircleCheck size={15} />
                    ) : (
                      <CircleX size={15} />
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-[12px] border border-[#ff5a00]/10 bg-[#ff5a00]/[0.03] px-4 py-3 text-[12px] leading-5 text-white/58">
                Los cambios se guardan en el catálogo central de BarberOS. La
                Agenda y cualquier módulo de reservas que consulte
                <span className="mx-1 font-semibold text-white/78">services</span>
                utilizarán automáticamente estos datos actualizados.
              </div>

              <div className="flex justify-end gap-2.5 border-t border-white/[0.055] pt-5">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="h-11 rounded-[11px] border border-white/[0.08] px-4 text-[12px] font-semibold text-white/62 transition hover:bg-white/[0.04] hover:text-white"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={saveService}
                  className="primary-action h-11 rounded-[11px] px-5 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Guardando..."
                    : editingService
                      ? "Guardar cambios"
                      : "Crear servicio"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[100] flex items-center gap-3 rounded-[12px] border border-white/[0.09] bg-[#111111]/95 px-4 py-3 text-[12px] font-semibold text-white shadow-2xl backdrop-blur-xl">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff6a18]" />
          {toast}
        </div>
      ) : null}
    </main>
  );
}
