"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DM_Mono, Manrope, Sora } from "next/font/google";
import {
  Bell,
  ImagePlus,
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
  Trash2,
  Upload,
  Scissors,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  UserRound,
  CircleCheck,
  ExternalLink,
  LogOut,
  KeyRound,
  Mail,
  CheckCircle2,
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
  logo_url: string | null;
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

type BusinessHour = {
  id: string;
  day_of_week: number;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  created_at?: string;
  updated_at?: string;
};

const WEEK_DAYS = [
  { day: 1, label: "Lunes", short: "Lun" },
  { day: 2, label: "Martes", short: "Mar" },
  { day: 3, label: "Miércoles", short: "Mié" },
  { day: 4, label: "Jueves", short: "Jue" },
  { day: 5, label: "Viernes", short: "Vie" },
  { day: 6, label: "Sábado", short: "Sáb" },
  { day: 0, label: "Domingo", short: "Dom" },
];


const defaultSettings: Omit<Settings, "id"> = {
  name: "Don Segundo",
  description: "Barbería tradicional con atención personalizada.",
  address: "",
  phone: "",
  instagram: "",
  logo_url: null,
  online_booking_enabled: true,
  min_booking_notice_hours: 1,
  max_booking_days_ahead: 30,
  cancellation_notice_hours: 2,
  loyalty_enabled: true,
  notifications_enabled: true,
  appointment_confirmation_enabled: true,
  appointment_reminder_enabled: true,
};

function normalizeTime(value: string | null) {
  if (!value) return "";
  return value.slice(0, 5);
}

function buildDefaultHours(): BusinessHour[] {
  return WEEK_DAYS.map((day) => ({
    id: `local-${day.day}`,
    day_of_week: day.day,
    is_open: day.day >= 1 && day.day <= 5,
    open_time: day.day >= 1 && day.day <= 5 ? "09:00" : day.day === 6 ? "09:00" : null,
    close_time: day.day >= 1 && day.day <= 5 ? "19:00" : day.day === 6 ? "14:00" : null,
  }));
}

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
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full border p-[3px] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A00]/40 ${
        checked
          ? "border-[#FF6A18] bg-[#FF5A00]"
          : "border-white/[0.11] bg-[#181818]"
      }`}
    >
      <span
        className={`block h-[19px] w-[19px] rounded-full shadow-[0_1px_3px_rgba(0,0,0,.35)] transition-transform duration-200 ${
          checked
            ? "translate-x-[21px] bg-white"
            : "translate-x-0 bg-[#777]"
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

  const fileRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [originalSettings, setOriginalSettings] = useState<Settings | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("general");
  const [hours, setHours] = useState<BusinessHour[]>([]);
  const [originalHours, setOriginalHours] = useState<BusinessHour[]>([]);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursLoading, setHoursLoading] = useState(true);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [removingLogo, setRemovingLogo] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountName, setAccountName] = useState("Manuel Cladera");
  const [emailOpen, setEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      setLoading(true);
      setHoursLoading(true);
      setError("");

      const [settingsResult, hoursResult, userResult] = await Promise.all([
        supabase
          .from("barbershop_settings")
          .select("*")
          .limit(1)
          .maybeSingle(),
        supabase
          .from("barbershop_hours")
          .select("*")
          .order("day_of_week", { ascending: true }),
        supabase.auth.getUser(),
      ]);

      if (!mounted) return;

      const { data: settingsData, error: settingsError } = settingsResult;
      if (settingsError) {
        console.error("Settings load error:", settingsError);
        setError("No se pudieron cargar las configuraciones.");
        setLoading(false);
      } else if (settingsData) {
        const normalizedSettings = { ...settingsData, logo_url: settingsData.logo_url ?? null } as Settings;
        setSettings(normalizedSettings);
        setOriginalSettings(normalizedSettings);
        setLoading(false);
      } else {
        const { data: created, error: createError } = await supabase
          .from("barbershop_settings")
          .insert(defaultSettings)
          .select("*")
          .single();

        if (!mounted) return;

        if (createError || !created) {
          console.error("Settings create error:", createError);
          setError("No se pudo crear la configuración inicial.");
        } else {
          const normalizedCreated = { ...created, logo_url: created.logo_url ?? null } as Settings;
          setSettings(normalizedCreated);
          setOriginalSettings(normalizedCreated);
        }
        setLoading(false);
      }

      const { data: hoursData, error: hoursError } = hoursResult;
      if (hoursError) {
        console.error("Hours load error:", hoursError);
        setError((current) => current || "No se pudieron cargar los horarios.");
        const fallback = buildDefaultHours();
        setHours(fallback);
        setOriginalHours(fallback);
      } else {
        const normalized = (hoursData ?? []).map((row) => ({
          ...row,
          open_time: normalizeTime(row.open_time),
          close_time: normalizeTime(row.close_time),
        })) as BusinessHour[];

        const byDay = new Map(normalized.map((row) => [row.day_of_week, row]));
        const complete = WEEK_DAYS.map((day) =>
          byDay.get(day.day) ?? buildDefaultHours().find((row) => row.day_of_week === day.day)!
        );
        setHours(complete);
        setOriginalHours(complete);
      }
      setHoursLoading(false);

      if (userResult.data.user) {
        const user = userResult.data.user;
        setAccountEmail(user.email ?? "");
        const metadataName =
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined);
        if (metadataName?.trim()) setAccountName(metadataName.trim());
      }
    }

    loadAll();

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
        logo_url: settings.logo_url || null,
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

    const normalizedSaved = { ...data, logo_url: data.logo_url ?? null } as Settings;
    setSettings(normalizedSaved);
    setOriginalSettings(normalizedSaved);
    if (normalizedSaved.logo_url) {
      window.localStorage.setItem("barberos:workspace-logo", normalizedSaved.logo_url);
    } else {
      window.localStorage.removeItem("barberos:workspace-logo");
    }
    window.dispatchEvent(
      new CustomEvent("barberos:workspace-logo-updated", {
        detail: { logoUrl: normalizedSaved.logo_url ?? null },
      })
    );
    setMessage("Cambios guardados correctamente.");
  }

  async function uploadLogo(file: File) {
    if (!settings) return;

    const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
    if (!allowed.includes(file.type)) {
      setError("Usá un archivo PNG, JPG, WEBP o SVG.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("El logo no puede superar los 5 MB.");
      return;
    }

    setUploadingLogo(true);
    setError("");
    setMessage("");

    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `workspace/${settings.id}/logo-${Date.now()}.${extension}`;

    const upload = await supabase.storage
      .from("barberos-assets")
      .upload(path, file, {
        upsert: false,
        cacheControl: "3600",
        contentType: file.type,
      });

    if (upload.error) {
      console.error("Logo upload error:", upload.error);
      setUploadingLogo(false);
      setError(`No se pudo subir el logo: ${upload.error.message}`);
      return;
    }

    const publicUrl = supabase.storage
      .from("barberos-assets")
      .getPublicUrl(path).data.publicUrl;

    const { data, error: updateError } = await supabase
      .from("barbershop_settings")
      .update({
        logo_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id)
      .select("*")
      .single();

    if (updateError || !data) {
      await supabase.storage.from("barberos-assets").remove([path]);
      console.error("Logo settings update error:", updateError);
      setUploadingLogo(false);
      setError(
        updateError?.message
          ? `No se pudo guardar el logo: ${updateError.message}`
          : "No se pudo guardar el logo."
      );
      return;
    }

    const normalized = { ...data, logo_url: publicUrl } as Settings;
    setSettings(normalized);
    setOriginalSettings(normalized);
    setUploadingLogo(false);
    setMessage("Logo actualizado correctamente.");

    window.localStorage.setItem("barberos:workspace-logo", publicUrl);
    window.dispatchEvent(
      new CustomEvent("barberos:workspace-logo-updated", {
        detail: { logoUrl: publicUrl },
      })
    );
  }

  async function removeLogo() {
    if (!settings?.logo_url) return;

    setRemovingLogo(true);
    setError("");
    setMessage("");

    const oldUrl = settings.logo_url;
    const { data, error: updateError } = await supabase
      .from("barbershop_settings")
      .update({
        logo_url: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id)
      .select("*")
      .single();

    if (updateError || !data) {
      console.error("Logo remove error:", updateError);
      setRemovingLogo(false);
      setError("No se pudo quitar el logo.");
      return;
    }

    try {
      const marker = "/storage/v1/object/public/barberos-assets/";
      const url = new URL(oldUrl);
      const index = url.pathname.indexOf(marker);
      if (index >= 0) {
        const storagePath = decodeURIComponent(
          url.pathname.slice(index + marker.length)
        );
        if (storagePath) {
          await supabase.storage.from("barberos-assets").remove([storagePath]);
        }
      }
    } catch (storageError) {
      console.warn("Could not remove old logo file:", storageError);
    }

    const normalized = { ...data, logo_url: null } as Settings;
    setSettings(normalized);
    setOriginalSettings(normalized);
    setRemovingLogo(false);
    setMessage("Logo eliminado correctamente.");

    window.localStorage.removeItem("barberos:workspace-logo");
    window.dispatchEvent(
      new CustomEvent("barberos:workspace-logo-updated", {
        detail: { logoUrl: null },
      })
    );
  }

  function updateHour(day: number, patch: Partial<BusinessHour>) {
    setHours((current) =>
      current.map((hour) =>
        hour.day_of_week === day ? { ...hour, ...patch } : hour
      )
    );
    setMessage("");
    setError("");
  }

  const hasHoursChanges = useMemo(() => {
    if (!hours.length || !originalHours.length) return false;
    return JSON.stringify(hours) !== JSON.stringify(originalHours);
  }, [hours, originalHours]);

  async function saveHours() {
    if (!hours.length) return;

    setHoursSaving(true);
    setMessage("");
    setError("");

    for (const hour of hours) {
      if (hour.is_open && (!hour.open_time || !hour.close_time)) {
        setHoursSaving(false);
        setError(`Completá el horario de ${WEEK_DAYS.find((d) => d.day === hour.day_of_week)?.label ?? "ese día"}.`);
        return;
      }

      if (hour.is_open && hour.open_time! >= hour.close_time!) {
        setHoursSaving(false);
        setError(`El horario de ${WEEK_DAYS.find((d) => d.day === hour.day_of_week)?.label ?? "ese día"} no es válido.`);
        return;
      }
    }

    const payload = hours.map((hour) => ({
      id: hour.id.startsWith("local-") ? undefined : hour.id,
      day_of_week: hour.day_of_week,
      is_open: hour.is_open,
      open_time: hour.is_open ? hour.open_time : null,
      close_time: hour.is_open ? hour.close_time : null,
      updated_at: new Date().toISOString(),
    }));

    const existing = hours.filter((hour) => !hour.id.startsWith("local-"));
    const hasExisting = existing.length > 0;

    let result;
    if (hasExisting) {
      result = await supabase
        .from("barbershop_hours")
        .upsert(payload, { onConflict: "day_of_week" })
        .select("*");
    } else {
      result = await supabase
        .from("barbershop_hours")
        .insert(payload.map(({ id: _id, ...row }) => row))
        .select("*");
    }

    if (result.error) {
      console.error("Hours save error:", result.error);
      setError("No se pudieron guardar los horarios.");
      setHoursSaving(false);
      return;
    }

    const normalized = (result.data ?? []).map((row) => ({
      ...row,
      open_time: normalizeTime(row.open_time),
      close_time: normalizeTime(row.close_time),
    })) as BusinessHour[];
    const byDay = new Map(normalized.map((row) => [row.day_of_week, row]));
    const complete = WEEK_DAYS.map((day) => byDay.get(day.day) ?? hours.find((h) => h.day_of_week === day.day)!);

    setHours(complete);
    setOriginalHours(complete);
    setHoursSaving(false);
    setMessage("Horarios guardados correctamente.");
  }

  function discardHours() {
    setHours(originalHours);
    setMessage("");
    setError("");
  }

  async function changeEmail() {
  setEmailError("");
  setEmailMessage("");

  const normalizedEmail = newEmail.trim().toLowerCase();

  console.log("EMAIL QUE SE INTENTA CAMBIAR:", normalizedEmail);

  if (!normalizedEmail) {
    setEmailError("Ingresá un email nuevo.");
    return;
  }

  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    setEmailError("Ingresá un email válido.");
    return;
  }

  if (normalizedEmail === (accountEmail || "").trim().toLowerCase()) {
    setEmailError("El nuevo email debe ser diferente al actual.");
    return;
  }

  setEmailSaving(true);

  const { data, error: emailUpdateError } = await supabase.auth.updateUser(
  { email: normalizedEmail,},
  {emailRedirectTo: `${window.location.origin}/admin/login`,}
);

  setEmailSaving(false);

  if (emailUpdateError) {
    console.error("Email update error:", emailUpdateError);
    setEmailError(
      emailUpdateError.message || "No se pudo actualizar el email."
    );
    return;
  }

  setEmailMessage(
    "Solicitud enviada. Revisá tu correo para confirmar el cambio de email."
  );

  if (data.user?.email) {
    setAccountEmail(data.user.email);
  }
}

  async function changePassword() {
    setPasswordError("");
    setPasswordMessage("");

    if (newPassword.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }

    setPasswordSaving(true);
    const { error: passwordError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setPasswordSaving(false);

    if (passwordError) {
      console.error("Password update error:", passwordError);
      setPasswordError("No se pudo actualizar la contraseña.");
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Contraseña actualizada correctamente.");
  }

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("Sign out error:", signOutError);
      setError("No se pudo cerrar la sesión.");
      return;
    }
    window.location.href = "/admin/login";
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
      <main className={`${manrope.variable} ${sora.variable} ${dmMono.variable} min-h-screen text-white`}>
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
      <main className={`${manrope.variable} ${sora.variable} ${dmMono.variable} min-h-screen p-6 text-white`}>
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
      className={`${manrope.variable} ${sora.variable} ${dmMono.variable} barberos-config min-h-screen text-white`}
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
            transparent;
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
          <aside className="panel-surface h-fit rounded-[16px] p-2 lg:sticky lg:top-6 lg:-mt-2">
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
              <button
                type="button"
                onClick={() => goToSection("horarios")}
                className="group flex w-full items-center gap-3 rounded-[11px] px-3 py-3 text-left text-[12px] font-semibold text-white/50 transition hover:bg-white/[0.035] hover:text-white"
              >
                <SlidersHorizontal size={14} />
                <span className="flex-1">Gestionar horarios</span>
                <ChevronRight
                  size={13}
                  className="transition group-hover:translate-x-0.5"
                />
              </button>
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

                <div className="mt-6 rounded-[14px] border border-white/[0.065] bg-white/[0.018] p-4 sm:p-5">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[16px] border border-white/[0.08] bg-[#080808]">
                        {settings.logo_url ? (
                          <img
                            src={settings.logo_url}
                            alt={`Logo de ${settings.name || "la barbería"}`}
                            className="h-full w-full object-contain p-2"
                          />
                        ) : (
                          <ImagePlus size={22} className="text-white/25" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="data text-[9px] font-bold uppercase tracking-[.16em] text-[#FF6A18]">
                          Identidad visual
                        </div>
                        <p className="mt-1 text-[14px] font-semibold text-white/88">
                          Logo de la barbería
                        </p>
                        <p className="mt-1 text-[12px] leading-5 text-white/48">
                          Se utiliza como identidad del workspace y queda guardado en Supabase.
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) uploadLogo(file);
                          event.currentTarget.value = "";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploadingLogo || removingLogo}
                        className="control inline-flex h-9 items-center gap-2 rounded-[10px] px-3 text-[11px] font-semibold text-white/75 transition hover:border-white/[0.14] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {uploadingLogo ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-[#FF6A18]" />
                        ) : (
                          <Upload size={13} />
                        )}
                        {settings.logo_url ? "Reemplazar logo" : "Subir logo"}
                      </button>

                      {settings.logo_url ? (
                        <button
                          type="button"
                          onClick={removeLogo}
                          disabled={uploadingLogo || removingLogo}
                          className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-red-400/15 bg-red-400/[0.03] px-3 text-[11px] font-semibold text-red-300/80 transition hover:border-red-400/25 hover:bg-red-400/[0.06] hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {removingLogo ? (
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-300/20 border-t-red-300" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                          Quitar
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-white/[0.055] pt-3 text-[11px] leading-5 text-white/38">
                    Formatos permitidos: PNG, JPG, WEBP o SVG · máximo 5 MB.
                  </div>
                </div>

                <div className="mt-6 grid items-stretch gap-3 md:grid-cols-3">
                  <div className="flex h-[88px] min-h-[88px] flex-col justify-between rounded-[12px] border border-white/[0.065] bg-white/[0.018] p-4">
                    <div className="data text-[9px] font-bold uppercase tracking-[.16em] text-[#FF6A18]">
                      Identidad
                    </div>
                    <div className="mt-3 truncate text-[14px] font-semibold text-white/88">
                      {settings.name || "Sin nombre"}
                    </div>
                  </div>

                  <div className="flex h-[88px] min-h-[88px] flex-col justify-between rounded-[12px] border border-white/[0.065] bg-white/[0.018] p-4">
                    <div className="data text-[9px] font-bold uppercase tracking-[.16em] text-[#FF6A18]">
                      Reservas
                    </div>
                    <div className="mt-3 text-[14px] font-semibold text-white/88">
                      {settings.online_booking_enabled
                        ? "Online activo"
                        : "Desactivadas"}
                    </div>
                  </div>

                  <div className="flex h-[88px] min-h-[88px] flex-col justify-between rounded-[12px] border border-white/[0.065] bg-white/[0.018] p-4">
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
                        Puntos
                      </span>
                      <span className="pb-0.5 text-[13px] text-white/58">
                        por servicio
                      </span>
                    </div>

                    <p className="mt-2 text-[13px] leading-5 text-white/58">
                      La asignación de puntos y los beneficios se administran
                      desde Fidelización y se aplican a los servicios reales.
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
              <div className="border-b border-white/[0.065] p-5 sm:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <SectionHeader
                    icon={<Clock3 size={18} />}
                    eyebrow="Disponibilidad"
                    title="Horarios de atención"
                    description="Definí los días y horarios reales en los que la barbería recibe clientes."
                  />
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={discardHours}
                      disabled={!hasHoursChanges || hoursSaving}
                      className="control inline-flex h-9 items-center gap-2 rounded-[10px] px-3 text-[11px] font-semibold text-white/65 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <RotateCcw size={13} />
                      Descartar
                    </button>
                    <button
                      type="button"
                      onClick={saveHours}
                      disabled={!hasHoursChanges || hoursSaving || hoursLoading}
                      className="primary-action inline-flex h-9 items-center gap-2 rounded-[10px] px-3.5 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Save size={13} />
                      {hoursSaving ? "Guardando..." : "Guardar horarios"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6">
                {hoursLoading ? (
                  <div className="rounded-[12px] border border-white/[0.065] bg-white/[0.018] p-5 text-[13px] text-white/55">
                    Cargando disponibilidad...
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-[14px] border border-white/[0.065] bg-white/[0.012]">
                    {WEEK_DAYS.map((day) => {
                      const hour = hours.find((item) => item.day_of_week === day.day);
                      if (!hour) return null;

                      return (
                        <div
                          key={day.day}
                          className="grid gap-4 border-b border-white/[0.055] p-4 last:border-b-0 md:grid-cols-[150px_90px_minmax(0,1fr)] md:items-center"
                        >
                          <div>
                            <p className="text-[14px] font-semibold text-white/86">{day.label}</p>
                            <p className="mt-0.5 text-[11px] text-white/42">
                              {hour.is_open ? "Atención habilitada" : "Día cerrado"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <Toggle
                              checked={hour.is_open}
                              onChange={(value) => updateHour(day.day, { is_open: value })}
                            />
                            <span className={`text-[11px] font-semibold ${hour.is_open ? "text-white/72" : "text-white/38"}`}>
                              {hour.is_open ? "Abierto" : "Cerrado"}
                            </span>
                          </div>

                          <div className={`grid grid-cols-2 gap-3 ${hour.is_open ? "" : "opacity-35 pointer-events-none"}`}>
                            <label className="block">
                              <span className="data mb-2 block text-[9px] font-bold uppercase tracking-[.14em] text-white/52">Primer turno</span>
                              <input
                                type="time"
                                value={hour.open_time ?? ""}
                                onChange={(event) => updateHour(day.day, { open_time: event.target.value })}
                                className="h-10 w-full rounded-[10px] border border-white/[0.085] bg-[#0B0B0B] px-3 text-[13px] font-medium text-white outline-none focus:border-[#FF5A00]/45"
                              />
                            </label>
                            <label className="block">
                              <span className="data mb-2 block text-[9px] font-bold uppercase tracking-[.14em] text-white/52">Último turno</span>
                              <input
                                type="time"
                                value={hour.close_time ?? ""}
                                onChange={(event) => updateHour(day.day, { close_time: event.target.value })}
                                className="h-10 w-full rounded-[10px] border border-white/[0.085] bg-[#0B0B0B] px-3 text-[13px] font-medium text-white outline-none focus:border-[#FF5A00]/45"
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 flex items-start gap-3 rounded-[12px] border border-[#FF5A00]/12 bg-[#FF5A00]/[0.03] p-4">
                  <Info size={14} className="mt-0.5 shrink-0 text-[#FF6A18]" />
                  <p className="text-[12px] leading-5 text-white/58">
                    Estos horarios quedan guardados en Supabase y son la base de la disponibilidad operativa de BarberOS. El motor de reservas deberá consultarlos para mostrar únicamente franjas válidas.
                  </p>
                </div>
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
                  description="Gestioná la sesión y las credenciales de la cuenta autenticada en Supabase."
                />
              </div>

              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 rounded-[14px] border border-white/[0.065] bg-white/[0.018] p-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.09] bg-[#111]">
                      {settings.logo_url ? (
                        <img
                          src={settings.logo_url}
                          alt=""
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <span className="display text-[13px] font-semibold text-white">MC</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-white/88">{accountName}</p>
                      <p className="mt-1 flex items-center gap-1.5 truncate text-[12px] text-white/52">
                        <Mail size={12} />
                        {accountEmail || "Sesión autenticada"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="data rounded-full border border-[#FF5A00]/20 bg-[#FF5A00]/[0.06] px-3 py-1.5 text-[9px] font-medium uppercase tracking-[.12em] text-[#FF7A32]">
                      Administrador
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEmailError("");
                        setEmailMessage("");
                        setNewEmail("");
                        setEmailOpen(true);
                      }}
                      className="control inline-flex h-9 items-center gap-2 rounded-[10px] px-3 text-[11px] font-semibold text-white/72 hover:text-white"
                    >
                      <Mail size={13} />
                      Cambiar email
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPasswordError("");
                        setPasswordMessage("");
                        setPasswordOpen(true);
                      }}
                      className="control inline-flex h-9 items-center gap-2 rounded-[10px] px-3 text-[11px] font-semibold text-white/72 hover:text-white"
                    >
                      <KeyRound size={13} />
                      Cambiar contraseña
                    </button>
                    <button
                      type="button"
                      onClick={signOut}
                      className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-red-400/15 bg-red-400/[0.04] px-3 text-[11px] font-semibold text-red-300/75 transition hover:border-red-400/25 hover:bg-red-400/[0.07] hover:text-red-200"
                    >
                      <LogOut size={13} />
                      Cerrar sesión
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-3 rounded-[12px] border border-white/[0.055] bg-white/[0.012] p-4">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-[#FF6A18]" />
                  <p className="text-[12px] leading-5 text-white/54">
                    La sesión y el cambio de contraseña se gestionan mediante Supabase Auth. La cuenta que aparece arriba es la sesión actualmente autenticada.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {emailOpen ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
            <div className="w-full max-w-md overflow-hidden rounded-[16px] border border-white/[0.09] bg-[#0D0D0D] shadow-[0_35px_100px_rgba(0,0,0,.55)]">
              <div className="flex items-start justify-between border-b border-white/[0.065] p-5">
                <div>
                  <div className="data text-[9px] font-bold uppercase tracking-[.18em] text-[#FF6A18]">
                    Seguridad
                  </div>
                  <h2 className="display mt-1 text-[20px] font-semibold tracking-[-.04em] text-white">
                    Cambiar email
                  </h2>
                  <p className="mt-1 text-[13px] leading-5 text-white/58">
                    Actualizá el email utilizado para acceder a BarberOS.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-[9px] text-white/35 hover:bg-white/[0.04] hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-[10px] border border-white/[0.055] bg-white/[0.012] p-3">
                  <div className="data text-[9px] font-bold uppercase tracking-[.14em] text-white/40">
                    Email actual
                  </div>
                  <div className="mt-1 truncate text-[13px] font-medium text-white/75">
                    {accountEmail || "Sesión autenticada"}
                  </div>
                </div>

                {emailMessage ? (
                  <div className="flex items-start gap-2 rounded-[10px] border border-emerald-400/20 bg-emerald-400/[0.05] p-3 text-[12px] leading-5 text-emerald-300">
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                    <span>{emailMessage}</span>
                  </div>
                ) : null}

                {emailError ? (
                  <div className="rounded-[10px] border border-red-400/20 bg-red-400/[0.05] p-3 text-[12px] text-red-300">
                    {emailError}
                  </div>
                ) : null}

                <label className="block">
                  <span className="data mb-2 block text-[9px] font-bold uppercase tracking-[.16em] text-white/62">
                    Nuevo email
                  </span>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="nuevo@email.com"
                    autoComplete="email"
                    className="h-11 w-full rounded-[11px] border border-white/[0.085] bg-[#0B0B0B] px-4 text-[13px] text-white outline-none focus:border-[#FF5A00]/45"
                  />
                </label>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEmailOpen(false)}
                    className="control rounded-[10px] px-4 py-2.5 text-[11px] font-semibold text-white/65 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={changeEmail}
                    disabled={emailSaving || Boolean(emailMessage)}
                    className="primary-action rounded-[10px] px-4 py-2.5 text-[11px] font-bold text-white disabled:opacity-40"
                  >
                    {emailSaving ? "Actualizando..." : "Actualizar email"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {passwordOpen ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
            <div className="w-full max-w-md overflow-hidden rounded-[16px] border border-white/[0.09] bg-[#0D0D0D] shadow-[0_35px_100px_rgba(0,0,0,.55)]">
              <div className="flex items-start justify-between border-b border-white/[0.065] p-5">
                <div>
                  <div className="data text-[9px] font-bold uppercase tracking-[.18em] text-[#FF6A18]">Seguridad</div>
                  <h2 className="display mt-1 text-[20px] font-semibold tracking-[-.04em] text-white">Cambiar contraseña</h2>
                  <p className="mt-1 text-[13px] leading-5 text-white/58">Actualizá la contraseña de la cuenta autenticada.</p>
                </div>
                <button type="button" onClick={() => setPasswordOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-[9px] text-white/35 hover:bg-white/[0.04] hover:text-white">×</button>
              </div>

              <div className="space-y-4 p-5">
                {passwordMessage ? (
                  <div className="flex items-center gap-2 rounded-[10px] border border-emerald-400/20 bg-emerald-400/[0.05] p-3 text-[12px] text-emerald-300">
                    <CheckCircle2 size={14} /> {passwordMessage}
                  </div>
                ) : null}
                {passwordError ? (
                  <div className="rounded-[10px] border border-red-400/20 bg-red-400/[0.05] p-3 text-[12px] text-red-300">{passwordError}</div>
                ) : null}

                <label className="block">
                  <span className="data mb-2 block text-[9px] font-bold uppercase tracking-[.16em] text-white/62">Nueva contraseña</span>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className="h-11 w-full rounded-[11px] border border-white/[0.085] bg-[#0B0B0B] px-4 text-[13px] text-white outline-none focus:border-[#FF5A00]/45" />
                </label>
                <label className="block">
                  <span className="data mb-2 block text-[9px] font-bold uppercase tracking-[.16em] text-white/62">Repetir contraseña</span>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repetí la nueva contraseña" className="h-11 w-full rounded-[11px] border border-white/[0.085] bg-[#0B0B0B] px-4 text-[13px] text-white outline-none focus:border-[#FF5A00]/45" />
                </label>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setPasswordOpen(false)} className="control rounded-[10px] px-4 py-2.5 text-[11px] font-semibold text-white/65 hover:text-white">Cancelar</button>
                  <button type="button" onClick={changePassword} disabled={passwordSaving || Boolean(passwordMessage)} className="primary-action rounded-[10px] px-4 py-2.5 text-[11px] font-bold text-white disabled:opacity-40">
                    {passwordSaving ? "Actualizando..." : "Actualizar contraseña"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <footer className="mt-7 flex flex-col gap-3 border-t border-white/[0.055] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[12px] text-white/42">
            <Settings2 size={13} className="text-[#FF6A18]" />
            <span>BarberOS · Configuración del workspace</span>
          </div>

          <div className="data text-[9px] uppercase tracking-[.14em] text-white/28">
            {hasChanges || hasHoursChanges ? "Cambios sin guardar" : "Configuración sincronizada"}
          </div>
        </footer>
      </div>
    </main>
  );
}
