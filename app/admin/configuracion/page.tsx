"use client";

import { useEffect, useMemo, useState } from "react";
import { DM_Mono, Manrope, Sora } from "next/font/google";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Globe,
  Info,
  MapPin,
  Phone,
  RotateCcw,
  Save,
  Scissors,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  UserRound,
  CircleCheck,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

const sections = [
  {
    id: "general",
    label: "General",
    eyebrow: "Identidad",
    description: "Información pública y datos principales de la barbería.",
    icon: Store,
  },
  {
    id: "reservas",
    label: "Reservas",
    eyebrow: "Operaciones",
    description: "Reglas que controlan el flujo de reservas online.",
    icon: CalendarDays,
  },
  {
    id: "fidelizacion",
    label: "Fidelización",
    eyebrow: "Clientes",
    description: "Activá el sistema de beneficios para clientes frecuentes.",
    icon: Sparkles,
  },
  {
    id: "notificaciones",
    label: "Notificaciones",
    eyebrow: "Comunicación",
    description: "Controlá las comunicaciones automáticas de los turnos.",
    icon: Bell,
  },
  {
    id: "horarios",
    label: "Horarios",
    eyebrow: "Disponibilidad",
    description: "Gestioná los días y horarios de atención.",
    icon: Clock3,
  },
  {
    id: "cuenta",
    label: "Cuenta",
    eyebrow: "Acceso",
    description: "Información de la cuenta que administra este workspace.",
    icon: UserRound,
  },
];

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
      aria-pressed={checked}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition-all duration-200 ${
        checked
          ? "border-[#FF5A00] bg-[#FF5A00]"
          : "border-white/[0.10] bg-white/[0.07]"
      }`}
    >
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-[#FF5A00]/15 bg-[#FF5A00]/[0.045] text-[#FF6A18]">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="data text-[9px] font-bold uppercase tracking-[.18em] text-[#FF6A18]">
          {eyebrow}
        </div>
        <h2 className="display mt-1 text-[20px] font-semibold leading-tight tracking-[-.04em] text-white sm:text-[21px]">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-[13px] leading-5 text-white/64 sm:text-[14px]">
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
    <div className="flex items-center justify-between gap-6 border-t border-white/[0.065] py-5 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-[14px] font-semibold tracking-[-.015em] text-white/88">
          {title}
        </p>
        <p className="mt-1 max-w-2xl text-[13px] leading-5 text-white/58">
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
      <span className="data mb-2 block text-[9px] font-bold uppercase tracking-[.16em] text-white/62">
        {label}
      </span>
      <div className="relative">
        {icon && (
          <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/34">
            {icon}
          </div>
        )}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`h-11 w-full rounded-[11px] border border-white/[0.085] bg-[#0B0B0B] text-[13px] text-white outline-none transition placeholder:text-white/25 focus:border-[#FF5A00]/45 focus:bg-[#0F0F0F] ${
            icon ? "pl-10 pr-4" : "px-4"
          }`}
        />
      </div>
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  suffix,
}: {
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <div className="relative">
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) =>
          onChange(Math.max(0, Number(event.target.value)))
        }
        className="h-11 w-[116px] rounded-[11px] border border-white/[0.085] bg-[#0B0B0B] px-3 pr-12 text-[13px] font-medium tabular-nums text-white outline-none transition focus:border-[#FF5A00]/45"
      />
      {suffix && (
        <span className="data pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-medium uppercase tracking-[.08em] text-white/42">
          {suffix}
        </span>
      )}
    </div>
  );
}

function StatusCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`panel-surface min-h-[108px] rounded-[16px] p-4 ${
        accent ? "border-[#FF5A00]/15" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="data text-[9px] font-bold uppercase tracking-[.16em] text-white/60">
          {label}
        </span>
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            accent ? "bg-[#FF5A00]" : "bg-emerald-400"
          }`}
        />
      </div>
      <p className="display mt-5 truncate text-[18px] font-semibold tracking-[-.04em] text-white">
        {value}
      </p>
    </div>
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

      const { data, error: queryError } = await supabase
        .from("barbershop_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!mounted) return;

      if (queryError) {
        console.error(queryError);
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

    const { data, error: saveError } = await supabase
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

    if (saveError) {
      console.error(saveError);
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

  function goToSection(id: string) {
    setActiveSection(id);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading) {
    return (
      <main className={`${manrope.variable} ${sora.variable} ${dmMono.variable} min-h-screen bg-[#070707] text-white`}>
        <div className="flex min-h-screen items-center justify-center">
          <div className="panel-surface flex items-center gap-3 rounded-[14px] px-5 py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-[#FF5A00]" />
            <span className="text-[13px] text-white/70">
              Cargando configuración...
            </span>
          </div>
        </div>
      </main>
    );
  }

  if (!settings) {
    return (
      <main className={`${manrope.variable} ${sora.variable} ${dmMono.variable} min-h-screen bg-[#070707] p-6 text-white`}>
        <div className="mx-auto max-w-[1680px] rounded-[16px] border border-red-500/20 bg-red-500/[0.05] p-6">
          <div className="display text-[18px] font-semibold">
            Configuración no disponible
          </div>
          <div className="mt-2 text-[13px] text-red-300/75">
            {error || "No se pudo cargar la configuración."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`${manrope.variable} ${sora.variable} ${dmMono.variable} barberos-config min-h-screen bg-[#070707] text-white`}
    >
      <style jsx global>{`
        .barberos-config {
          --ink: #070707;
          --surface: #0b0b0b;
          --surface-2: #111111;
          --line: rgba(255,255,255,.075);
          --orange: #ff5a00;
          --orange-bright: #ff7a22;
          font-family: var(--font-barberos-ui), Manrope, sans-serif;
          font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          letter-spacing: -.014em;
          background:
            radial-gradient(720px 360px at 88% -8%,rgba(255,90,0,.045),transparent 70%),
            radial-gradient(520px 320px at 8% 14%,rgba(255,255,255,.010),transparent 74%),
            #070707;
        }
        .barberos-config .display {
          font-family: var(--font-barberos-display), Sora, sans-serif;
        }
        .barberos-config .data {
          font-family: var(--font-barberos-data), "DM Mono", monospace;
        }
        .barberos-config .panel-surface {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          background:
            linear-gradient(145deg,rgba(255,255,255,.028),rgba(255,255,255,.010) 52%,rgba(255,90,0,.012)),
            rgba(10,10,10,.96);
          border: 1px solid var(--line);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.022),
            0 18px 58px rgba(0,0,0,.15);
          transition:
            transform 220ms cubic-bezier(.22,.61,.36,1),
            border-color 220ms ease,
            box-shadow 220ms ease;
        }
        .barberos-config .panel-surface::before {
          content: "";
          position: absolute;
          pointer-events: none;
          width: 260px;
          height: 180px;
          right: -120px;
          top: -120px;
          background: radial-gradient(circle,rgba(255,90,0,.045),transparent 68%);
        }
        .barberos-config .panel-surface:hover {
          border-color: rgba(255,90,0,.12);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.028),
            0 24px 70px rgba(0,0,0,.20);
        }
        .barberos-config .control {
          border: 1px solid rgba(255,255,255,.075);
          background: rgba(255,255,255,.025);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.018);
        }
        .barberos-config .primary-action {
          background: linear-gradient(135deg,#ff6a18 0%,#ff5a00 55%,#e84b00 100%);
          box-shadow:
            0 12px 30px rgba(255,90,0,.14),
            inset 0 1px 0 rgba(255,255,255,.26);
        }
        .barberos-config .primary-action:hover {
          transform: translateY(-1px);
          box-shadow:
            0 16px 36px rgba(255,90,0,.18),
            inset 0 1px 0 rgba(255,255,255,.26);
        }
        .barberos-config input,
        .barberos-config textarea,
        .barberos-config button {
          font-family: var(--font-barberos-ui), Manrope, sans-serif;
        }
        .barberos-config ::selection {
          background: rgba(255,90,0,.28);
          color: #fff;
        }
        @media (prefers-reduced-motion: reduce) {
          .barberos-config *,
          .barberos-config *::before,
          .barberos-config *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      <div className="relative mx-auto max-w-[1680px] px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
        <header className="mb-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="data text-[9px] font-bold uppercase tracking-[.18em] text-white/82">
                  BARBEROS
                </span>
                <span className="text-white/10">/</span>
                <span className="data text-[9px] font-bold uppercase tracking-[.18em] text-[#FF6A18]">
                  CONFIGURACIÓN DEL WORKSPACE
                </span>
                <span className="ml-1 hidden h-px w-10 bg-gradient-to-r from-[#FF5A00]/55 to-transparent sm:block" />
              </div>

              <h1 className="display text-[34px] font-semibold leading-[.91] tracking-[-.075em] text-white sm:text-[42px]">
                Configuración
              </h1>

              <p className="mt-2 max-w-xl text-[14px] leading-6 text-white/72">
                Definí cómo funciona la barbería, cómo se reciben las reservas
                y cómo BarberOS se comunica con tus clientes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={discardChanges}
                disabled={!hasChanges || saving}
                className="control inline-flex h-10 items-center gap-2 rounded-[11px] px-4 text-[11px] font-semibold text-white/70 transition hover:border-white/[0.14] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                <RotateCcw size={13} />
                Descartar
              </button>

              <button
                type="button"
                onClick={saveSettings}
                disabled={!hasChanges || saving}
                className="primary-action inline-flex h-10 items-center gap-2 rounded-[11px] px-4 text-[11px] font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-35"
              >
                <Save size={14} />
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </header>

        {(message || error) && (
          <div
            className={`mb-5 flex items-center gap-3 rounded-[12px] border px-4 py-3 text-[13px] ${
              error
                ? "border-red-400/20 bg-red-400/[0.05] text-red-300"
                : "border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-300"
            }`}
          >
            {error ? <Info size={15} /> : <CircleCheck size={15} />}
            <span>{error || message}</span>
          </div>
        )}

        <section className="mb-5 grid gap-3 sm:grid-cols-3">
          <StatusCard
            label="Workspace"
            value={settings.name || "Sin nombre"}
            accent
          />
          <StatusCard
            label="Reservas"
            value={
              settings.online_booking_enabled ? "Online activo" : "Desactivadas"
            }
          />
          <StatusCard
            label="Fidelización"
            value={settings.loyalty_enabled ? "Programa activo" : "Desactivado"}
          />
        </section>

        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="panel-surface h-fit rounded-[16px] p-2 lg:sticky lg:top-6">
            <div className="px-3 pb-3 pt-2">
              <div className="data text-[9px] font-bold uppercase tracking-[.18em] text-[#FF6A18]">
                CONFIGURACIÓN
              </div>
              <p className="mt-1 text-[12px] leading-5 text-white/48">
                Secciones del workspace
              </p>
            </div>

            <nav className="space-y-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const active = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => goToSection(section.id)}
                    className={`group flex w-full items-center gap-3 rounded-[11px] px-3 py-3 text-left transition ${
                      active
                        ? "bg-[#FF5A00]/[0.09] text-white"
                        : "text-white/55 hover:bg-white/[0.035] hover:text-white/88"
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-[9px] border transition ${
                        active
                          ? "border-[#FF5A00]/20 bg-[#FF5A00]/[0.08] text-[#FF6A18]"
                          : "border-white/[0.06] bg-white/[0.02] text-white/38 group-hover:text-white/65"
                      }`}
                    >
                      <Icon size={14} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold">
                        {section.label}
                      </span>
                      <span
                        className={`data mt-0.5 block text-[8px] uppercase tracking-[.10em] ${
                          active ? "text-[#FF6A18]" : "text-white/28"
                        }`}
                      >
                        {section.eyebrow}
                      </span>
                    </span>

                    {active && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#FF5A00]" />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="mt-3 border-t border-white/[0.06] pt-2">
              <a
                href="/admin/horarios"
                className="group flex items-center gap-3 rounded-[11px] px-3 py-3 text-[12px] font-semibold text-white/50 transition hover:bg-white/[0.035] hover:text-white"
              >
                <SlidersHorizontal size={14} />
                <span className="flex-1">Gestionar horarios</span>
                <ChevronRight
                  size={13}
                  className="transition group-hover:translate-x-0.5"
                />
              </a>
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            <section
              id="general"
              className="panel-surface scroll-mt-6 rounded-[16px]"
            >
              <div className="border-b border-white/[0.065] p-5 sm:p-6">
                <SectionHeader
                  icon={<Store size={18} />}
                  eyebrow="Identidad del workspace"
                  title="Información general"
                  description="La información pública y operativa que identifica a la barbería."
                />
              </div>

              <div className="p-5 sm:p-6">
                <div className="grid gap-5 md:grid-cols-2">
                  <Input
                    label="Nombre de la barbería"
                    value={settings.name}
                    onChange={(value) => updateSetting("name", value)}
                    placeholder="Don Segundo"
                    icon={<Store size={15} />}
                  />
                  <Input
                    label="Teléfono"
                    value={settings.phone || ""}
                    onChange={(value) => updateSetting("phone", value)}
                    placeholder="+54 9..."
                    icon={<Phone size={15} />}
                  />
                  <div className="md:col-span-2">
                    <Input
                      label="Descripción"
                      value={settings.description || ""}
                      onChange={(value) => updateSetting("description", value)}
                      placeholder="Descripción de la barbería"
                      icon={<Scissors size={15} />}
                    />
                  </div>
                  <Input
                    label="Dirección"
                    value={settings.address || ""}
                    onChange={(value) => updateSetting("address", value)}
                    placeholder="Dirección de la barbería"
                    icon={<MapPin size={15} />}
                  />
                  <Input
                    label="Instagram"
                    value={settings.instagram || ""}
                    onChange={(value) => updateSetting("instagram", value)}
                    placeholder="@donsegundo"
                    icon={<Globe size={15} />}
                  />
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[12px] border border-white/[0.065] bg-white/[0.018] p-4">
                    <div className="data text-[9px] font-bold uppercase tracking-[.16em] text-[#FF6A18]">
                      Identidad
                    </div>
                    <div className="mt-3 truncate text-[14px] font-semibold text-white/88">
                      {settings.name || "Sin nombre"}
                    </div>
                  </div>

                  <div className="rounded-[12px] border border-white/[0.065] bg-white/[0.018] p-4">
                    <div className="data text-[9px] font-bold uppercase tracking-[.16em] text-[#FF6A18]">
                      Reservas
                    </div>
                    <div className="mt-3 text-[14px] font-semibold text-white/88">
                      {settings.online_booking_enabled
                        ? "Online activo"
                        : "Desactivadas"}
                    </div>
                  </div>

                  <div className="rounded-[12px] border border-white/[0.065] bg-white/[0.018] p-4">
                    <div className="data text-[9px] font-bold uppercase tracking-[.16em] text-[#FF6A18]">
                      Fidelización
                    </div>
                    <div className="mt-3 text-[14px] font-semibold text-white/88">
                      {settings.loyalty_enabled
                        ? "Programa activo"
                        : "Desactivado"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section
              id="reservas"
              className="panel-surface scroll-mt-6 rounded-[16px]"
            >
              <div className="border-b border-white/[0.065] p-5 sm:p-6">
                <SectionHeader
                  icon={<CalendarDays size={18} />}
                  eyebrow="Motor de reservas"
                  title="Reservas online"
                  description="Definí las reglas que utiliza BarberOS para aceptar y gestionar reservas desde la web."
                />
              </div>

              <div className="p-5 sm:p-6">
                <SettingRow
                  title="Reservas online"
                  description="Permite que los clientes soliciten turnos desde la web pública."
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
                    value={settings.min_booking_notice_hours}
                    onChange={(value) =>
                      updateSetting("min_booking_notice_hours", value)
                    }
                    suffix="hs"
                  />
                </SettingRow>

                <SettingRow
                  title="Ventana de reserva"
                  description="Cantidad máxima de días hacia adelante que puede reservar un cliente."
                >
                  <NumberInput
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
                    value={settings.cancellation_notice_hours}
                    onChange={(value) =>
                      updateSetting("cancellation_notice_hours", value)
                    }
                    suffix="hs"
                  />
                </SettingRow>

                <div className="mt-6 rounded-[12px] border border-[#FF5A00]/15 bg-[#FF5A00]/[0.035] p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-[#FF5A00]/[0.08] text-[#FF6A18]">
                      <Info size={14} />
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-white/86">
                        Cómo impacta esto
                      </div>
                      <p className="mt-1 text-[13px] leading-5 text-white/58">
                        Estas reglas afectan el flujo de reservas del sitio
                        público y ayudan a evitar turnos imposibles de atender.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section
              id="fidelizacion"
              className="panel-surface scroll-mt-6 rounded-[16px]"
            >
              <div className="border-b border-white/[0.065] p-5 sm:p-6">
                <SectionHeader
                  icon={<Sparkles size={18} />}
                  eyebrow="Retención de clientes"
                  title="Fidelización"
                  description="Controlá la conexión entre clientes frecuentes y el programa de beneficios."
                />
              </div>

              <div className="p-5 sm:p-6">
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

                <div className="mt-6 grid gap-3 md:grid-cols-[1.25fr_.75fr]">
                  <div className="rounded-[14px] border border-[#FF5A00]/15 bg-[#FF5A00]/[0.035] p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#FF5A00]/[0.08] text-[#FF6A18]">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-white/88">
                          Programa actual
                        </div>
                        <div className="mt-0.5 text-[12px] text-white/52">
                          Administrado desde Fidelización
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex items-end gap-3">
                      <span className="display text-[32px] font-semibold leading-none tracking-[-.055em] text-white">
                        5
                      </span>
                      <span className="pb-0.5 text-[13px] text-white/58">
                        cortes
                      </span>
                    </div>

                    <p className="mt-2 text-[13px] leading-5 text-white/58">
                      Cada 5 cortes completados, el cliente obtiene un
                      beneficio.
                    </p>
                  </div>

                  <a
                    href="/admin/fidelizacion"
                    className="group flex items-center justify-between rounded-[14px] border border-white/[0.065] bg-white/[0.018] p-5 transition hover:border-white/[0.12] hover:bg-white/[0.028]"
                  >
                    <div>
                      <div className="text-[14px] font-semibold text-white/86">
                        Administrar programa
                      </div>
                      <div className="mt-1 text-[12px] leading-5 text-white/52">
                        Premios, visitas y clientes.
                      </div>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-white/30 transition group-hover:translate-x-0.5 group-hover:text-[#FF6A18]"
                    />
                  </a>
                </div>
              </div>
            </section>

            <section
              id="notificaciones"
              className="panel-surface scroll-mt-6 rounded-[16px]"
            >
              <div className="border-b border-white/[0.065] p-5 sm:p-6">
                <SectionHeader
                  icon={<Bell size={18} />}
                  eyebrow="Comunicación"
                  title="Notificaciones"
                  description="Configurá las comunicaciones automáticas relacionadas con los turnos."
                />
              </div>

              <div className="p-5 sm:p-6">
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
                    [
                      "Confirmación",
                      settings.appointment_confirmation_enabled,
                    ],
                    ["Recordatorio", settings.appointment_reminder_enabled],
                    ["Canal automático", settings.notifications_enabled],
                  ].map(([label, enabled]) => {
                    const active = Boolean(enabled);

                    return (
                      <div
                        key={String(label)}
                        className="rounded-[12px] border border-white/[0.065] bg-white/[0.018] p-4"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              active ? "bg-emerald-400" : "bg-white/20"
                            }`}
                          />
                          <span className="text-[12px] font-semibold text-white/62">
                            {label}
                          </span>
                        </div>
                        <div
                          className={`display mt-3 text-[17px] font-semibold tracking-[-.035em] ${
                            active ? "text-white" : "text-white/38"
                          }`}
                        >
                          {active ? "Activo" : "Inactivo"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section
              id="horarios"
              className="panel-surface scroll-mt-6 rounded-[16px]"
            >
              <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <SectionHeader
                  icon={<Clock3 size={18} />}
                  eyebrow="Disponibilidad"
                  title="Horarios de atención"
                  description="Configurá los días y horarios en los que la barbería recibe clientes."
                />

                <a
                  href="/admin/horarios"
                  className="group control inline-flex shrink-0 items-center justify-center gap-2 rounded-[11px] px-4 py-2.5 text-[11px] font-semibold text-white/72 transition hover:border-[#FF5A00]/20 hover:text-white"
                >
                  Configurar horarios
                  <ChevronRight
                    size={13}
                    className="transition group-hover:translate-x-0.5"
                  />
                </a>
              </div>
            </section>

            <section
              id="cuenta"
              className="panel-surface scroll-mt-6 rounded-[16px]"
            >
              <div className="border-b border-white/[0.065] p-5 sm:p-6">
                <SectionHeader
                  icon={<UserRound size={18} />}
                  eyebrow="Acceso al workspace"
                  title="Cuenta"
                  description="Información de la cuenta que administra este workspace."
                />
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 rounded-[14px] border border-white/[0.065] bg-white/[0.018] p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="display flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[13px] font-semibold text-black">
                      MC
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-white/88">
                        Manuel Cladera
                      </p>
                      <p className="mt-1 text-[12px] text-white/52">
                        Administrador de {settings.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="data rounded-full border border-[#FF5A00]/20 bg-[#FF5A00]/[0.06] px-3 py-1.5 text-[9px] font-medium uppercase tracking-[.12em] text-[#FF7A32]">
                      Professional
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-[9px] border border-white/[0.065] text-white/30">
                      <ShieldCheck size={14} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-3 rounded-[12px] border border-white/[0.055] bg-white/[0.012] p-4">
                  <ExternalLink
                    size={14}
                    className="mt-0.5 shrink-0 text-[#FF6A18]"
                  />
                  <p className="text-[12px] leading-5 text-white/54">
                    La gestión de acceso y autenticación se puede ampliar
                    posteriormente con Supabase Auth sin cambiar la estructura
                    de este módulo.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        <footer className="mt-7 flex flex-col gap-3 border-t border-white/[0.055] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[12px] text-white/42">
            <Settings2 size={13} className="text-[#FF6A18]" />
            <span>BarberOS · Configuración del workspace</span>
          </div>

          <div className="data text-[9px] uppercase tracking-[.14em] text-white/28">
            {hasChanges ? "Cambios sin guardar" : "Configuración sincronizada"}
          </div>
        </footer>
      </div>
    </main>
  );
}
