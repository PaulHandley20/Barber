"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Globe,
  MapPin,
  Phone,
  Save,
  Scissors,
  Settings2,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
  RotateCcw,
  SlidersHorizontal,
  ExternalLink,
  Info,
  CircleCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Settings = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  instagram: string | null;
  online_booking_enabled: boolean;
  min_booking_notice_hours: number;
  max_booking_days_ahead: number;
  cancellation_notice_hours: number;
  loyalty_enabled: boolean;
  notifications_enabled: boolean;
  appointment_confirmation_enabled: boolean;
  appointment_reminder_enabled: boolean;
  created_at?: string;
  updated_at?: string;
};

const defaultSettings: Omit<Settings, "id"> = {
  name: "Don Segundo",
  description: "Barbería tradicional con atención personalizada.",
  address: "",
  phone: "",
  instagram: "",
  online_booking_enabled: true,
  min_booking_notice_hours: 1,
  max_booking_days_ahead: 30,
  cancellation_notice_hours: 2,
  loyalty_enabled: true,
  notifications_enabled: true,
  appointment_confirmation_enabled: true,
  appointment_reminder_enabled: true,
};

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
        checked
          ? "border-[#FF5A00] bg-[#FF5A00]"
          : "border-white/10 bg-white/[0.07]"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full transition ${
          checked ? "left-6 bg-white" : "left-1 bg-zinc-500"
        }`}
      />
    </button>
  );
}

function SectionHeader({
  icon,
  eyebrow,
  title,
  description,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-[#FF6A18]">
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
          {eyebrow}
        </div>
        <h2 className="mt-1 text-base font-semibold tracking-[-0.015em] text-white">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
          {description}
        </p>
      </div>
    </div>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-t border-white/[0.07] py-5 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-600">
          {description}
        </p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
        {label}
      </span>
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600">
            {icon}
          </div>
        )}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`h-11 w-full rounded-xl border border-white/10 bg-white/[0.025] text-sm text-zinc-200 outline-none transition placeholder:text-zinc-700 focus:border-[#FF5A00]/40 focus:bg-white/[0.04] ${
            icon ? "pl-10 pr-4" : "px-4"
          }`}
        />
      </div>
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <div className="relative">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
          className="h-11 w-28 rounded-xl border border-white/10 bg-white/[0.025] px-3 pr-12 text-sm text-zinc-200 outline-none transition focus:border-[#FF5A00]/40"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-zinc-600">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

export default function ConfiguracionPage() {
  const supabase = createClient();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<Settings | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("general");

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("barbershop_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error(error);
        setError("No se pudieron cargar las configuraciones.");
        setLoading(false);
        return;
      }

      if (data) {
        setSettings(data as Settings);
        setOriginalSettings(data as Settings);
        setLoading(false);
        return;
      }

      const { data: created, error: createError } = await supabase
        .from("barbershop_settings")
        .insert(defaultSettings)
        .select("*")
        .single();

      if (!mounted) return;

      if (createError || !created) {
        console.error(createError);
        setError("No se pudo crear la configuración inicial.");
        setLoading(false);
        return;
      }

      setSettings(created as Settings);
      setOriginalSettings(created as Settings);
      setLoading(false);
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  function updateSetting<K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) {
    setSettings((current) =>
      current ? { ...current, [key]: value } : current
    );
    setMessage("");
    setError("");
  }

  const hasChanges = useMemo(() => {
    if (!settings || !originalSettings) return false;
    return JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }, [settings, originalSettings]);

  async function saveSettings() {
    if (!settings) return;

    setSaving(true);
    setMessage("");
    setError("");

    const { data, error } = await supabase
      .from("barbershop_settings")
      .update({
        name: settings.name,
        description: settings.description,
        address: settings.address,
        phone: settings.phone,
        instagram: settings.instagram,
        online_booking_enabled: settings.online_booking_enabled,
        min_booking_notice_hours: settings.min_booking_notice_hours,
        max_booking_days_ahead: settings.max_booking_days_ahead,
        cancellation_notice_hours: settings.cancellation_notice_hours,
        loyalty_enabled: settings.loyalty_enabled,
        notifications_enabled: settings.notifications_enabled,
        appointment_confirmation_enabled:
          settings.appointment_confirmation_enabled,
        appointment_reminder_enabled:
          settings.appointment_reminder_enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id)
      .select("*")
      .single();

    setSaving(false);

    if (error) {
      console.error(error);
      setError("No se pudieron guardar los cambios.");
      return;
    }

    setSettings(data as Settings);
    setOriginalSettings(data as Settings);
    setMessage("Cambios guardados correctamente.");
  }

  function discardChanges() {
    if (!originalSettings) return;
    setSettings(originalSettings);
    setMessage("");
    setError("");
  }

  const sections = [
    { id: "general", label: "General", icon: Store },
    { id: "reservas", label: "Reservas", icon: CalendarDays },
    { id: "fidelizacion", label: "Fidelización", icon: Sparkles },
    { id: "notificaciones", label: "Notificaciones", icon: Bell },
    { id: "horarios", label: "Horarios", icon: Clock3 },
    { id: "cuenta", label: "Cuenta", icon: UserRound },
  ];

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070707] text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0D0D0D] px-6 py-4 text-sm text-zinc-400">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-[#FF5A00]" />
            Cargando configuración...
          </div>
        </div>
      </main>
    );
  }

  if (!settings) {
    return (
      <main className="min-h-screen bg-[#070707] p-8 text-white">
        <div className="mx-auto max-w-6xl rounded-2xl border border-red-500/20 bg-red-500/[0.05] p-6">
          <div className="font-semibold">Configuración no disponible</div>
          <div className="mt-1 text-sm text-red-300/70">
            {error || "No se pudo cargar la configuración."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_82%_0%,rgba(255,90,0,0.07),transparent_28%)]" />

      <div className="relative mx-auto max-w-[1500px] px-5 py-7 pb-32 sm:px-8 lg:px-10">
        <header className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FF6A18]">
              <Settings2 className="h-3.5 w-3.5" />
              Workspace configuration
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              Configuración
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
              Controlá cómo funciona tu workspace, cómo reciben reservas tus
              clientes y cómo BarberOS se comunica con ellos.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.025] px-3 py-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FF5A00]/10">
              <ShieldCheck className="h-3.5 w-3.5 text-[#FF6A18]" />
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
                Workspace
              </div>
              <div className="text-xs font-medium text-zinc-300">
                {settings.name}
              </div>
            </div>
          </div>
        </header>

        {(message || error) && (
          <div
            className={`mb-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
              error
                ? "border-red-500/20 bg-red-500/[0.05] text-red-300"
                : "border-emerald-500/20 bg-emerald-500/[0.05] text-emerald-300"
            }`}
          >
            {error ? (
              <Info className="h-4 w-4" />
            ) : (
              <CircleCheck className="h-4 w-4" />
            )}
            <span>{error || message}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-white/10 bg-[#0D0D0D] p-2 lg:sticky lg:top-6">
            <div className="px-3 pb-3 pt-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-700">
                Settings
              </div>
            </div>

            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const active = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    onClick={() => {
                      setActiveSection(section.id);
                      document
                        .getElementById(section.id)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-medium transition ${
                      active
                        ? "bg-[#FF5A00]/10 text-[#FF8A52]"
                        : "text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-200"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{section.label}</span>
                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#FF5A00]" />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="mt-4 border-t border-white/8 pt-3">
              <a
                href="/admin/horarios"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-zinc-500 transition hover:bg-white/[0.035] hover:text-zinc-200"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Gestionar horarios</span>
                <ChevronRight className="ml-auto h-3.5 w-3.5" />
              </a>
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            <section
              id="general"
              className="scroll-mt-6 rounded-2xl border border-white/10 bg-[#0D0D0D]"
            >
              <div className="border-b border-white/8 p-6 sm:p-7">
                <SectionHeader
                  icon={<Store className="h-5 w-5" />}
                  eyebrow="Workspace identity"
                  title="Información general"
                  description="La información pública y operativa que identifica a la barbería."
                />
              </div>

              <div className="p-6 sm:p-7">
                <div className="grid gap-5 md:grid-cols-2">
                  <Input
                    label="Nombre de la barbería"
                    value={settings.name}
                    onChange={(value) => updateSetting("name", value)}
                    placeholder="Don Segundo"
                    icon={<Store className="h-4 w-4" />}
                  />
                  <Input
                    label="Teléfono"
                    value={settings.phone || ""}
                    onChange={(value) => updateSetting("phone", value)}
                    placeholder="+54 9..."
                    icon={<Phone className="h-4 w-4" />}
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="Descripción"
                      value={settings.description || ""}
                      onChange={(value) => updateSetting("description", value)}
                      placeholder="Descripción de la barbería"
                      icon={<Scissors className="h-4 w-4" />}
                    />
                  </div>
                  <Input
                    label="Dirección"
                    value={settings.address || ""}
                    onChange={(value) => updateSetting("address", value)}
                    placeholder="Dirección de la barbería"
                    icon={<MapPin className="h-4 w-4" />}
                  />
                  <Input
                    label="Instagram"
                    value={settings.instagram || ""}
                    onChange={(value) => updateSetting("instagram", value)}
                    placeholder="@donsegundo"
                    icon={<Globe className="h-4 w-4" />}
                  />
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-700">
                      Identidad
                    </div>
                    <div className="mt-2 text-sm font-medium text-zinc-300">
                      {settings.name || "Sin nombre"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-700">
                      Reservas
                    </div>
                    <div className="mt-2 text-sm font-medium text-zinc-300">
                      {settings.online_booking_enabled ? "Online activo" : "Desactivadas"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-700">
                      Fidelización
                    </div>
                    <div className="mt-2 text-sm font-medium text-zinc-300">
                      {settings.loyalty_enabled ? "Programa activo" : "Desactivado"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section
              id="reservas"
              className="scroll-mt-6 rounded-2xl border border-white/10 bg-[#0D0D0D]"
            >
              <div className="border-b border-white/8 p-6 sm:p-7">
                <SectionHeader
                  icon={<CalendarDays className="h-5 w-5" />}
                  eyebrow="Booking engine"
                  title="Reservas online"
                  description="Definí las reglas que utiliza el motor de reservas de BarberOS."
                />
              </div>

              <div className="p-6 sm:p-7">
                <SettingRow
                  title="Reservas online"
                  description="Permite que los clientes soliciten turnos desde la web."
                >
                  <Toggle
                    checked={settings.online_booking_enabled}
                    onChange={(value) =>
                      updateSetting("online_booking_enabled", value)
                    }
                  />
                </SettingRow>

                <SettingRow
                  title="Anticipación mínima"
                  description="Cantidad mínima de horas antes del turno para permitir una nueva reserva."
                >
                  <NumberInput
                    label=""
                    value={settings.min_booking_notice_hours}
                    onChange={(value) =>
                      updateSetting("min_booking_notice_hours", value)
                    }
                    suffix="hs"
                  />
                </SettingRow>

                <SettingRow
                  title="Ventana de reserva"
                  description="Hasta cuántos días hacia adelante puede reservar un cliente."
                >
                  <NumberInput
                    label=""
                    value={settings.max_booking_days_ahead}
                    onChange={(value) =>
                      updateSetting("max_booking_days_ahead", value)
                    }
                    suffix="días"
                  />
                </SettingRow>

                <SettingRow
                  title="Aviso para cancelar"
                  description="Anticipación mínima requerida para cancelar un turno."
                >
                  <NumberInput
                    label=""
                    value={settings.cancellation_notice_hours}
                    onChange={(value) =>
                      updateSetting("cancellation_notice_hours", value)
                    }
                    suffix="hs"
                  />
                </SettingRow>

                <div className="mt-6 rounded-xl border border-[#FF5A00]/15 bg-[#FF5A00]/[0.035] p-4">
                  <div className="flex gap-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#FF6A18]" />
                    <div>
                      <div className="text-xs font-semibold text-zinc-300">
                        Cómo impacta esto
                      </div>
                      <p className="mt-1 text-xs leading-5 text-zinc-600">
                        Estas reglas afectan el flujo de reservas del sitio
                        público y ayudan a reducir turnos imposibles de atender.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section
              id="fidelizacion"
              className="scroll-mt-6 rounded-2xl border border-white/10 bg-[#0D0D0D]"
            >
              <div className="border-b border-white/8 p-6 sm:p-7">
                <SectionHeader
                  icon={<Sparkles className="h-5 w-5" />}
                  eyebrow="Customer growth"
                  title="Fidelización"
                  description="Controlá la conexión entre clientes frecuentes y el programa de beneficios."
                />
              </div>

              <div className="p-6 sm:p-7">
                <SettingRow
                  title="Programa de fidelización"
                  description="Activa o desactiva los beneficios para clientes frecuentes."
                >
                  <Toggle
                    checked={settings.loyalty_enabled}
                    onChange={(value) =>
                      updateSetting("loyalty_enabled", value)
                    }
                  />
                </SettingRow>

                <div className="mt-6 grid gap-4 md:grid-cols-[1.3fr_1fr]">
                  <div className="rounded-2xl border border-[#FF5A00]/15 bg-[#FF5A00]/[0.035] p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF5A00]/10">
                        <Sparkles className="h-4 w-4 text-[#FF6A18]" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-zinc-200">
                          Programa actual
                        </div>
                        <div className="mt-0.5 text-[11px] text-zinc-600">
                          Configurado desde Fidelización
                        </div>
                      </div>
                    </div>
                    <div className="mt-5 text-2xl font-semibold tracking-[-0.03em]">
                      5 cortes
                    </div>
                    <div className="mt-1 text-xs text-zinc-600">
                      Cada 5 cortes completados, el cliente obtiene un beneficio.
                    </div>
                  </div>

                  <a
                    href="/admin/fidelizacion"
                    className="group flex items-center justify-between rounded-2xl border border-white/8 bg-white/[0.02] p-5 transition hover:border-white/15 hover:bg-white/[0.035]"
                  >
                    <div>
                      <div className="text-xs font-semibold text-zinc-300">
                        Administrar programa
                      </div>
                      <div className="mt-1 text-[11px] leading-5 text-zinc-600">
                        Premios, visitas y clientes.
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-700 transition group-hover:translate-x-0.5 group-hover:text-zinc-400" />
                  </a>
                </div>
              </div>
            </section>

            <section
              id="notificaciones"
              className="scroll-mt-6 rounded-2xl border border-white/10 bg-[#0D0D0D]"
            >
              <div className="border-b border-white/8 p-6 sm:p-7">
                <SectionHeader
                  icon={<Bell className="h-5 w-5" />}
                  eyebrow="Communication"
                  title="Notificaciones"
                  description="Configurá las comunicaciones automáticas relacionadas con los turnos."
                />
              </div>

              <div className="p-6 sm:p-7">
                <SettingRow
                  title="Notificaciones"
                  description="Activa o desactiva las comunicaciones automáticas."
                >
                  <Toggle
                    checked={settings.notifications_enabled}
                    onChange={(value) =>
                      updateSetting("notifications_enabled", value)
                    }
                  />
                </SettingRow>

                <SettingRow
                  title="Confirmación de turno"
                  description="Enviar una confirmación cuando se genere una reserva."
                >
                  <Toggle
                    checked={settings.appointment_confirmation_enabled}
                    onChange={(value) =>
                      updateSetting(
                        "appointment_confirmation_enabled",
                        value
                      )
                    }
                  />
                </SettingRow>

                <SettingRow
                  title="Recordatorio"
                  description="Enviar un recordatorio previo al turno."
                >
                  <Toggle
                    checked={settings.appointment_reminder_enabled}
                    onChange={(value) =>
                      updateSetting("appointment_reminder_enabled", value)
                    }
                  />
                </SettingRow>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  {[
                    ["Confirmación", settings.appointment_confirmation_enabled],
                    ["Recordatorio", settings.appointment_reminder_enabled],
                    ["Canal automático", settings.notifications_enabled],
                  ].map(([label, enabled]) => (
                    <div
                      key={String(label)}
                      className="rounded-xl border border-white/8 bg-white/[0.02] p-4"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            enabled ? "bg-emerald-400" : "bg-zinc-700"
                          }`}
                        />
                        <span className="text-xs font-medium text-zinc-400">
                          {label}
                        </span>
                      </div>
                      <div className="mt-2 text-sm font-semibold text-zinc-200">
                        {enabled ? "Activo" : "Inactivo"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section
              id="horarios"
              className="scroll-mt-6 rounded-2xl border border-white/10 bg-[#0D0D0D]"
            >
              <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                <SectionHeader
                  icon={<Clock3 className="h-5 w-5" />}
                  eyebrow="Operations"
                  title="Horarios de atención"
                  description="Configurá los días y horarios en los que la barbería recibe clientes."
                />

                <a
                  href="/admin/horarios"
                  className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Configurar horarios
                  <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </a>
              </div>
            </section>

            <section
              id="cuenta"
              className="scroll-mt-6 rounded-2xl border border-white/10 bg-[#0D0D0D]"
            >
              <div className="border-b border-white/8 p-6 sm:p-7">
                <SectionHeader
                  icon={<UserRound className="h-5 w-5" />}
                  eyebrow="Account"
                  title="Cuenta"
                  description="Información de la cuenta que administra este workspace."
                />
              </div>

              <div className="p-6 sm:p-7">
                <div className="flex flex-col gap-5 rounded-2xl border border-white/8 bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-sm font-semibold text-black">
                      MC
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">
                        Manuel Cladera
                      </p>
                      <p className="mt-1 text-xs text-zinc-600">
                        Administrador de {settings.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="rounded-full border border-[#FF5A00]/20 bg-[#FF5A00]/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#FF7A3D]">
                      Professional
                    </div>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-zinc-600 transition hover:bg-white/[0.05] hover:text-zinc-300"
                      title="Próximamente"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#090909]/95 px-5 py-3 backdrop-blur-xl lg:left-64">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div className="hidden items-center gap-2 text-[11px] text-zinc-600 sm:flex">
            {hasChanges ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A00]" />
                Cambios sin guardar
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Todo está guardado
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={discardChanges}
              disabled={saving || !hasChanges}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-zinc-500 transition hover:border-white/20 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Descartar
            </button>

            <button
              type="button"
              onClick={saveSettings}
              disabled={saving || !hasChanges}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF5A00] px-5 py-2.5 text-xs font-semibold text-white shadow-[0_10px_35px_rgba(255,90,0,0.16)] transition hover:bg-[#FF6A18] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
