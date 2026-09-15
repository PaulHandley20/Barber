"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  Trash2,
  ShieldCheck,
  Pencil,
} from "lucide-react";
import { DM_Mono, Manrope, Sora } from "next/font/google";
import { createClient } from "@/lib/supabase/client";

const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-barberos-ui" });
const sora = Sora({ subsets: ["latin"], display: "swap", variable: "--font-barberos-display" });
const dmMono = DM_Mono({ subsets: ["latin"], display: "swap", weight: ["400", "500"], variable: "--font-barberos-data" });

type Customer = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
  deleted_at: string | null;
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
  useEffect(() => {
    const surfaces = document.querySelectorAll<HTMLElement>(
      ".barberos-dashboard .metric-card, .barberos-dashboard .panel-surface"
    );
    const handlers = new Map<HTMLElement, (event: PointerEvent) => void>();

    surfaces.forEach((element) => {
      const handler = (event: PointerEvent) => {
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        element.style.setProperty("--spot-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
        element.style.setProperty("--spot-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
      };
      handlers.set(element, handler);
      element.addEventListener("pointermove", handler);
    });

    return () => {
      handlers.forEach((handler, element) => {
        element.removeEventListener("pointermove", handler);
      });
    };
  }, []);

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

  const [showEdit, setShowEdit] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerWithStats | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const router = useRouter();

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
          created_at,
          deleted_at
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

    setCustomers((customersResponse.data ?? []).filter((customer) => !customer.deleted_at));
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
      console.error("=== BARBEROS · ERROR AL CREAR CLIENTE ===");
      console.error(insertError);
      setError(
        insertError.message ||
          "No se pudo crear el cliente. Revisá los permisos de la tabla customers."
      );
      setSaving(false);
      return;
    }

    const createdCustomer = data as Customer;
    setCustomers((current) =>
      [...current, createdCustomer].sort((a, b) =>
        a.full_name.localeCompare(b.full_name, "es")
      )
    );

    const createdWithStats: CustomerWithStats = {
      ...createdCustomer,
      visits: 0,
      spent: 0,
      lastVisit: null,
      favoriteService: null,
    };

    setSelectedCustomer(createdWithStats);
    setNewCustomer({ full_name: "", phone: "", email: "", notes: "" });
    setShowCreate(false);
    setSaving(false);
    setNotice("Cliente creado correctamente.");
  }

  function openEditCustomer() {
    if (!selectedCustomer) return;

    setEditingCustomer(selectedCustomer);
    setShowActions(false);
    setError("");
    setShowEdit(true);
  }

  async function updateCustomer() {
    if (!editingCustomer) return;

    if (!editingCustomer.full_name.trim() || !editingCustomer.phone.trim()) {
      setError("Nombre y teléfono son obligatorios.");
      return;
    }

    setEditSaving(true);
    setError("");

    const { data, error: updateError } = await supabase
      .from("customers")
      .update({
        full_name: editingCustomer.full_name.trim(),
        phone: editingCustomer.phone.trim(),
        email: editingCustomer.email?.trim() || null,
        notes: editingCustomer.notes?.trim() || null,
      })
      .eq("id", editingCustomer.id)
      .select()
      .single();

    if (updateError) {
      console.error("=== BARBEROS · ERROR AL EDITAR CLIENTE ===");
      console.error(updateError);
      setError(
        updateError.message ||
          "No se pudo actualizar el cliente. Revisá los permisos de la tabla customers."
      );
      setEditSaving(false);
      return;
    }

    const updated = data as Customer;

    setCustomers((current) =>
      current
        .map((customer) =>
          customer.id === updated.id ? updated : customer
        )
        .sort((a, b) => a.full_name.localeCompare(b.full_name, "es"))
    );

    setSelectedCustomer((current) =>
      current && current.id === updated.id
        ? {
            ...current,
            ...updated,
          }
        : current
    );

    setEditingCustomer(null);
    setShowEdit(false);
    setEditSaving(false);
    setNotice("Cliente actualizado correctamente.");
  }

  function openDeleteCustomer() {
    if (!selectedCustomer) return;

    setShowActions(false);
    setDeletePassword("");
    setDeleteError("");
    setShowDelete(true);
  }

  async function deleteCustomer() {
    if (!selectedCustomer) return;

    if (!deletePassword) {
      setDeleteError("Ingresá tu contraseña para confirmar la eliminación.");
      return;
    }

    setDeleteSaving(true);
    setDeleteError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        throw new Error(
          "No pudimos verificar la sesión del administrador."
        );
      }

      const { error: reauthError } =
        await supabase.auth.signInWithPassword({
          email: user.email,
          password: deletePassword,
        });

      if (reauthError) {
        console.error("BARBEROS · REAUTENTICACIÓN FALLIDA:", reauthError);
        throw new Error("La contraseña no es correcta.");
      }

      const customerId = selectedCustomer.id;

      // Soft delete: ocultamos el perfil, pero conservamos el registro para
      // mantener intactos los turnos históricos y su relación con appointments.
      const { error: deleteDbError } = await supabase
        .from("customers")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", customerId);

      if (deleteDbError) {
        console.error("=== BARBEROS · ERROR AL ELIMINAR CLIENTE ===");
        console.error(deleteDbError);

        if (deleteDbError.code === "42501") {
          throw new Error(
            "Supabase rechazó la baja del perfil por permisos. Revisá la política RLS de UPDATE sobre customers."
          );
        }

        throw new Error(
          deleteDbError.message ||
            "No se pudo eliminar el cliente."
        );
      }

      setCustomers((current) =>
        current.filter((customer) => customer.id !== customerId)
      );
      setSelectedCustomer(null);
      setShowDelete(false);
      setDeletePassword("");
      setNotice("Perfil eliminado. El historial de turnos se conservó.");
    } catch (unexpectedError) {
      console.error("BARBEROS · ERROR EN ELIMINACIÓN:", unexpectedError);
      setDeleteError(
        unexpectedError instanceof Error
          ? unexpectedError.message
          : "No se pudo eliminar el cliente."
      );
    } finally {
      setDeleteSaving(false);
    }
  }

  function callCustomer(phone: string) {
    window.location.href = `tel:${phone.replace(/[^+\\d]/g, "")}`;
  }

  function whatsappCustomer(phone: string) {
    const digits = phone.replace(/\\D/g, "");
    const normalized =
      digits.startsWith("54")
        ? digits
        : digits.startsWith("0")
          ? `54${digits.slice(1)}`
          : `54${digits}`;

    window.open(`https://wa.me/${normalized}`, "_blank", "noopener,noreferrer");
  }

  function goToAppointment() {
    if (!selectedCustomer) return;

    router.push(`/admin/turnos?customer=${encodeURIComponent(selectedCustomer.id)}`);
  }

  function closeDetail() {
    setSelectedCustomer(null);
    setShowActions(false);
  }

  return (
    <div className={`${manrope.variable} ${sora.variable} ${dmMono.variable} clientes-shell barberos-dashboard min-h-screen bg-[#070707] text-[#f5f5f4] selection:bg-[#ff5a00]/30`}>
      <style jsx>{`
        .barberos-dashboard{
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

        .barberos-dashboard h1,
        .barberos-dashboard h2,
        .barberos-dashboard h3,
        .barberos-dashboard h4{
          font-family:var(--font-barberos-display),Sora,sans-serif;
          font-feature-settings:"kern" 1,"liga" 1;
          text-wrap:balance;
        }

        .display-title{
          font-family:var(--font-barberos-display),Sora,sans-serif;
          font-size:clamp(34px,4vw,48px);
          line-height:.91;
          letter-spacing:-.075em;
          font-weight:620;
        }

        .numeric-value,
        .kpi-value,
        .data-number{
          font-family:var(--font-barberos-display),Sora,sans-serif;
          font-variant-numeric:tabular-nums lining-nums;
          font-feature-settings:"tnum" 1,"lnum" 1,"zero" 1,"kern" 1;
          letter-spacing:-.065em;
        }

        .eyebrow,
        .meta-label{
          font-family:var(--font-barberos-ui),Manrope,sans-serif;
          text-transform:uppercase;
          letter-spacing:.18em;
        }

        .eyebrow{font-size:8px;line-height:1;font-weight:800}
        .meta-label{font-size:9px;line-height:1;font-weight:650}
        .caption{font-size:9px;line-height:1.45;font-weight:520}

        .panel-surface{
          position:relative;
          isolation:isolate;
          overflow:hidden;
          background:
            linear-gradient(145deg,rgba(255,255,255,.028),rgba(255,255,255,.010) 52%,rgba(255,90,0,.012)),
            rgba(10,10,10,.96);
          border:1px solid var(--line)!important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.022),
            0 18px 58px rgba(0,0,0,.15);
          transition:
            transform 240ms cubic-bezier(.22,.61,.36,1),
            border-color 240ms ease,
            box-shadow 240ms ease;
        }

        .panel-surface::before{
          content:"";
          position:absolute;
          inset:0;
          z-index:-1;
          pointer-events:none;
          background:
            radial-gradient(
              480px circle at var(--spot-x,82%) var(--spot-y,-8%),
              rgba(255,90,0,.052),
              rgba(255,90,0,.012) 32%,
              transparent 68%
            );
          opacity:.34;
          transition:opacity 260ms ease;
        }

        .panel-surface::after{
          content:"";
          position:absolute;
          top:0;
          left:7%;
          right:7%;
          height:1px;
          pointer-events:none;
          background:linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,.12),
            rgba(255,90,0,.20),
            rgba(255,255,255,.08),
            transparent
          );
          opacity:.20;
        }

        .panel-surface:hover{
          transform:translateY(-1px);
          border-color:rgba(255,90,0,.14)!important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.032),
            0 24px 70px rgba(0,0,0,.22),
            0 0 0 1px rgba(255,90,0,.018);
        }

        .panel-surface:hover::before{opacity:.50}

        .metric-card{
          min-height:138px;
          position:relative;
          isolation:isolate;
          overflow:hidden;
        }

        .metric-card::after{
          content:"";
          pointer-events:none;
          position:absolute;
          left:18px;
          right:18px;
          bottom:0;
          height:1px;
          background:linear-gradient(90deg,transparent,rgba(255,90,0,.78),transparent);
          transform:scaleX(.16);
          transform-origin:center;
          opacity:.60;
          transition:transform 260ms ease,opacity 260ms ease;
        }

        .metric-card:hover{
          border-color:rgba(255,255,255,.105)!important;
          transform:translateY(-1px);
        }

        .metric-card:hover::after{
          transform:scaleX(1);
          opacity:1;
        }

        .glass-control{
          border:1px solid rgba(255,255,255,.08);
          background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.018));
          box-shadow:inset 0 1px 0 rgba(255,255,255,.03),0 10px 30px rgba(0,0,0,.16);
          backdrop-filter:blur(18px);
        }

        .primary-action{
          position:relative;
          overflow:hidden;
          background:linear-gradient(135deg,#ff6a18 0%,#ff5a00 52%,#e84b00 100%);
          box-shadow:0 12px 30px rgba(255,90,0,.14),inset 0 1px 0 rgba(255,255,255,.26);
        }

        .primary-action::before{
          content:"";
          position:absolute;
          inset:0;
          background:linear-gradient(108deg,transparent 20%,rgba(255,255,255,.30) 47%,transparent 72%);
          transform:translateX(-140%);
          transition:transform 650ms cubic-bezier(.22,.61,.36,1);
        }

        .primary-action:hover::before{transform:translateX(140%)}

        .system-strip{
          position:relative;
          overflow:hidden;
          border:1px solid rgba(255,255,255,.065);
          background:linear-gradient(90deg,rgba(255,90,0,.045),rgba(255,255,255,.012) 35%,rgba(255,255,255,.008));
          box-shadow:inset 0 1px 0 rgba(255,255,255,.025),0 12px 40px rgba(0,0,0,.12);
        }

        .interactive-row{
          position:relative;
          transition:background 180ms ease,transform 180ms cubic-bezier(.22,.61,.36,1);
        }

        .interactive-row:hover{
          background:linear-gradient(90deg,rgba(255,90,0,.035),rgba(255,255,255,.018) 52%,transparent);
          transform:translateX(3px);
        }

        .dashboard-grid-bg{
          background-image:
            linear-gradient(rgba(255,255,255,.013) 1px,transparent 1px),
            linear-gradient(90deg,rgba(255,255,255,.013) 1px,transparent 1px);
          background-size:48px 48px;
          mask-image:linear-gradient(to bottom,rgba(0,0,0,.86),transparent 72%);
        }

        .dashboard-noise{
          opacity:.035;
          background-image:repeating-radial-gradient(circle at 0 0,rgba(255,255,255,.08) 0 .35px,transparent .5px 3.6px);
          mix-blend-mode:soft-light;
        }

        .focus-ring:focus-visible,
        .barberos-dashboard button:focus-visible,
        .barberos-dashboard input:focus-visible,
        .barberos-dashboard textarea:focus-visible{
          outline:2px solid rgba(255,90,0,.72);
          outline-offset:3px;
        }

        .customer-avatar{
          font-family:var(--font-barberos-display),Sora,sans-serif;
          font-variant-numeric:tabular-nums;
          letter-spacing:-.04em;
        }

        .customer-row{
          position:relative;
          transition:background 180ms ease,transform 180ms ease;
        }

        .customer-row:hover{
          background:linear-gradient(90deg,rgba(255,90,0,.025),rgba(255,255,255,.016) 55%,transparent);
        }

        .customer-row-selected{
          background:linear-gradient(90deg,rgba(255,90,0,.07),rgba(255,90,0,.014) 72%,transparent)!important;
          box-shadow:inset 2px 0 0 rgba(255,90,0,.88);
        }

        .customer-row-selected .customer-avatar{
          border-color:rgba(255,90,0,.34)!important;
          background:rgba(255,90,0,.08)!important;
          color:#ff9a66!important;
        }

        .segment-active{
          background:rgba(255,255,255,.085)!important;
          color:#fff!important;
          box-shadow:inset 0 1px 0 rgba(255,255,255,.035);
        }

        .progress-track{
          height:4px;
          border-radius:999px;
          background:rgba(255,255,255,.055);
          overflow:hidden;
        }

        .progress-fill{
          height:100%;
          border-radius:999px;
          background:linear-gradient(90deg,#b83d00,#ff5a00,#ff7a22);
        }

        .detail-stat{
          border:1px solid rgba(255,255,255,.065);
          background:linear-gradient(180deg,rgba(255,255,255,.025),rgba(255,255,255,.008));
        }

        .drawer-scroll::-webkit-scrollbar{width:5px}
        .drawer-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.10);border-radius:999px}
        .drawer-scroll::-webkit-scrollbar-track{background:transparent}

        @media(max-width:900px){
          .display-title{font-size:34px}
        }

        .agenda-display{font-family:var(--font-barberos-display),Sora,sans-serif}
        .agenda-control{border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);transition:all .18s ease}
        .agenda-control:hover{border-color:rgba(255,255,255,.13);background:rgba(255,255,255,.045)}
        .agenda-control:focus{outline:none;border-color:rgba(255,90,0,.4);box-shadow:0 0 0 3px rgba(255,90,0,.07)}
        .agenda-primary{background:#ff5a00;box-shadow:0 10px 28px rgba(255,90,0,.12);transition:all .18s ease}
        .agenda-primary:hover{background:#ff6a18;transform:translateY(-1px);box-shadow:0 14px 34px rgba(255,90,0,.2)}
        .panel{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:16px;background:linear-gradient(180deg,rgba(255,255,255,.018),transparent 30%),rgba(11,11,11,.88);box-shadow:0 20px 60px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.018)}
        .metric-card{min-height:154px}
        .metric-card::after{left:18px;right:18px;bottom:0}
        .clientes-kpi{min-height:154px}
        .clientes-shell .system-strip{border:1px solid rgba(255,255,255,.065);background:linear-gradient(90deg,rgba(255,90,0,.045),rgba(255,255,255,.012) 35%,rgba(255,255,255,.008));box-shadow:inset 0 1px 0 rgba(255,255,255,.025),0 12px 40px rgba(0,0,0,.12)}
        .clientes-shell .display-title{font-size:34px;line-height:.91;letter-spacing:-.075em;font-weight:600}
        @media(min-width:640px){.clientes-shell .display-title{font-size:42px}}

        @media(prefers-reduced-motion:reduce){
          .barberos-dashboard *,
          .barberos-dashboard *::before,
          .barberos-dashboard *::after{
            animation-duration:.01ms!important;
            animation-iteration-count:1!important;
            transition-duration:.01ms!important;
          }
        }
      `}</style>
      <div className="relative overflow-hidden">
        <div className="relative mx-auto max-w-[1680px] px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
          <header className="mb-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/82">BarberOS</span>
                  <span className="text-white/10">/</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff6a18]">Inteligencia de clientes</span>
                  <span className="ml-1 hidden h-px w-10 bg-gradient-to-r from-orange-500/55 to-transparent sm:block" />
                </div>
                <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                  <h1 className="agenda-display display-title text-[34px] font-semibold leading-[.91] tracking-[-0.075em] text-white sm:text-[42px]">Clientes</h1>
                </div>
                <p className="mt-2 max-w-xl text-[14px] leading-5 text-white/64">Gestioná tu base de clientes, entendé su actividad y detectá oportunidades desde un solo lugar.</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => loadData()} className="agenda-control flex h-10 items-center gap-2 rounded-[11px] px-4 text-[12px] font-semibold text-white/68">
                  <History size={14} />Actualizar
                </button>
                <button type="button" onClick={() => { setError(""); setShowCreate(true); }} className="agenda-primary flex h-10 items-center gap-2 rounded-[11px] px-4 text-[12px] font-semibold text-white">
                  <Plus size={14} />Nuevo cliente
                </button>
              </div>
            </div>
          </header>

          <main className="clientes-main pb-10">
        {/* KPI GRID */}
        <section className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
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
                className="metric-card panel-surface clientes-panel clientes-kpi group rounded-[16px] border p-5 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="meta-label text-white/82">
                    {item.label}
                  </span>
                  <Icon
                    size={15}
                    className="text-[#A9A9A5] transition group-hover:text-[#FF6A18]"
                  />
                </div>

                <div className="mt-4 flex items-end justify-between">
                  <span className="numeric-value kpi-value text-white">
                    {item.value.toLocaleString("es-AR")}
                  </span>
                </div>

                <p className="mt-1.5 text-[11px] leading-4 text-white/58">{item.meta}</p>
              </div>
            );
          })}
        </section>

        {/* INSIGHT STRIP */}
        <section className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_1fr]">
          <div className="panel-surface clientes-panel rounded-[16px] border p-5">
            <div className="flex items-center gap-2 clientes-meta text-[10px] font-semibold uppercase tracking-[.16em] text-[#ff6a18]">
              <TrendingUp size={14} className="text-[#FF6A18]" />
              Valor medio
            </div>
            <p className="mt-3 text-[23px] font-semibold tracking-[-0.025em] text-white">
              ${Math.round(averageCustomerValue).toLocaleString("es-AR")}
            </p>
            <p className="mt-1 text-[12px] text-[#D0D0CC]">
              facturación histórica / clientes
            </p>
          </div>

          <div className="panel-surface clientes-panel rounded-[16px] border p-5">
            <div className="flex items-center gap-2 clientes-meta text-[10px] font-semibold uppercase tracking-[.16em] text-[#ff6a18]">
              <History size={14} />
              Actividad
            </div>
            <p className="mt-3 text-[23px] font-semibold tracking-[-0.025em] text-white">
              {totalVisits.toLocaleString("es-AR")}
            </p>
            <p className="mt-1 text-[12px] text-[#D0D0CC]">
              visitas no canceladas registradas
            </p>
          </div>

          <div className="panel-surface clientes-panel clientes-opportunity rounded-[16px] border border-orange-500/[.16] bg-orange-500/[.035] p-5">
            <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.13em] text-[#FF9A66]">
              <Sparkles size={14} />
              Oportunidad GESTIÓN
            </div>
            <p className="mt-3 text-[15px] font-medium text-white">
              {riskCustomers + inactiveCustomers} clientes requieren atención
            </p>
            <p className="mt-1 text-[12px] text-[#D2B09B]">
              revisar recuperación y reactivación
            </p>
          </div>
        </section>

        {/* FILTER / SEARCH BAR */}
        <section className="panel mb-5 rounded-[16px] p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[11px] border border-white/[.07] bg-[#0b0b0b] px-4 py-2.5">
              <Search size={17} className="shrink-0 text-[#BDBDB9]" />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar cliente, teléfono o email..."
                className="w-full bg-transparent text-[12px] text-white outline-none placeholder:text-white/42"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-[#C2C2BE] transition hover:text-white"
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
                    className={`focus-ring whitespace-nowrap rounded-lg px-3 py-2 text-[12px] font-semibold transition ${
                      active
                        ? "segment-active"
                        : "text-[#C8C8C4] hover:bg-white/[0.045] hover:text-white"
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
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_390px] items-stretch">
          {/* CUSTOMER TABLE */}
          <div className="panel overflow-hidden rounded-[16px]">
            <div className="flex items-center justify-between border-b border-white/[0.075] px-6 py-5">
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-white">
                  Cliente 360
                </h2>
                <p className="mt-1 text-[12px] text-[#D0D0CC]">
                  {filteredCustomers.length} de {totalCustomers} clientes
                </p>
              </div>

              <div className="rounded-lg border border-white/[0.075] bg-white/[0.025] px-3 py-1.5 text-[12px] text-[#D8D8D4]">
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
                  <Search size={19} className="text-[#C2C2BE]" />
                </div>
                <h3 className="text-sm font-medium text-white">
                  No encontramos clientes
                </h3>
                <p className="mt-1 max-w-sm text-xs leading-5 text-[#D0D0CC]">
                  Probá con otro término de búsqueda o cambiá el segmento.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden grid-cols-[minmax(220px,1.4fr)_120px_120px_140px_120px_24px] gap-4 border-b border-white/[0.05] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#D0D0CC] lg:grid">
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
                        className={`customer-row group grid w-full grid-cols-[1fr_auto] gap-4 px-6 py-4 text-left transition lg:grid-cols-[minmax(220px,1.4fr)_120px_120px_140px_120px_24px] ${
                          isSelected ? "customer-row-selected" : ""
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="customer-avatar flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.09] bg-[#0B0B0B] text-[13px] font-semibold text-[#F0F0ED] transition">
                            {getInitials(customer.full_name)}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate text-[14px] font-semibold text-white">
                              {customer.full_name}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[12px] text-[#D0D0CC]">
                              <Phone size={10} />
                              <span>{customer.phone}</span>
                            </div>
                          </div>
                        </div>

                        <div className="hidden items-center text-[14px] font-medium text-[#E4E4E1] tabular-nums lg:flex">
                          {customer.visits}
                        </div>

                        <div className="hidden items-center text-[14px] font-medium text-white tabular-nums lg:flex">
                          ${customer.spent.toLocaleString("es-AR")}
                        </div>

                        <div className="hidden items-center text-[12px] text-[#C0C0BC] lg:flex">
                          {formatDate(customer.lastVisit)}
                        </div>

                        <div className="hidden items-center lg:flex">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
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

                        <div className="col-span-2 flex items-center gap-4 border-t border-white/[0.04] pt-3 text-[12px] text-[#D0D0CC] lg:hidden">
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
          <aside className="panel h-full max-h-[calc(100vh-110px)] overflow-hidden rounded-[16px] xl:sticky xl:top-0">
            {!selectedCustomer ? (
              <div className="flex min-h-[520px] flex-col items-center justify-center px-8 text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0B0B0B]">
                  <UserRound size={21} className="text-[#9E9E9A]" />
                </div>
                <h3 className="text-[14px] font-semibold text-white">
                  Cliente 360
                </h3>
                <p className="mt-2 max-w-[270px] text-[13px] leading-5 text-[#D8D8D4]">
                  Seleccioná un cliente para consultar actividad, valor,
                  historial y oportunidades.
                </p>
              </div>
            ) : (
              <div className="drawer-scroll max-h-[calc(100vh-110px)] overflow-y-auto">
                {/* PROFILE */}
                <div className="border-b border-white/[0.075] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="customer-avatar flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#FF5A00]/20 bg-[#FF5A00]/[0.08] text-[14px] font-semibold text-[#FF9A66]">
                        {getInitials(selectedCustomer.full_name)}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-[17px] font-semibold text-white">
                          {selectedCustomer.full_name}
                        </h3>
                        <p className="mt-1 text-[12px] text-[#DADAD7]">
                          Cliente desde{" "}
                          {formatMemberSince(selectedCustomer.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowActions((value) => !value)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.075] text-[#C2C2BE] transition hover:bg-white/[0.05] hover:text-white"
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {showActions && (
                        <div className="absolute right-0 top-10 z-20 w-40 rounded-xl border border-white/[0.10] bg-[#171717] p-1.5 shadow-2xl">
                          <button
                            type="button"
                            onClick={openEditCustomer}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] text-[#DADAD7] transition hover:bg-white/[0.06] hover:text-white"
                          >
                            <Pencil size={13} />
                            Editar cliente
                          </button>
                          <button
                            type="button"
                            onClick={goToAppointment}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] text-[#DADAD7] transition hover:bg-white/[0.06] hover:text-white"
                          >
                            <CalendarDays size={13} />
                            Ver agenda
                          </button>
                          <div className="my-1 h-px bg-white/[0.07]" />
                          <button
                            type="button"
                            onClick={openDeleteCustomer}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] text-red-300 transition hover:bg-red-400/[0.08] hover:text-red-200"
                          >
                            <Trash2 size={13} />
                            Eliminar perfil
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {selectedSegment && (
                      <span className="rounded-full border border-[#FF5A00]/20 bg-[#FF5A00]/[0.07] px-2.5 py-1 text-[11px] font-semibold text-[#FF9A66]">
                        {SEGMENTS.find((item) => item.id === selectedSegment)
                          ?.label}
                      </span>
                    )}

                    {selectedCustomer.favoriteService && (
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[11px] font-medium text-[#C9C9C6]">
                        {selectedCustomer.favoriteService}
                      </span>
                    )}
                  </div>
                </div>

                {/* QUICK ACTIONS */}
                <div className="grid grid-cols-3 gap-2 border-b border-white/[0.075] p-4">
                  <button
                    type="button"
                    onClick={() => callCustomer(selectedCustomer.phone)}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.075] bg-[#0B0B0B] px-2 py-3 text-[11px] font-medium text-[#E4E4E1] transition hover:border-white/[0.14] hover:bg-white/[0.035] hover:text-white"
                  >
                    <Phone size={14} />
                    Llamar
                  </button>

                  <button
                    type="button"
                    onClick={() => whatsappCustomer(selectedCustomer.phone)}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.075] bg-[#0B0B0B] px-2 py-3 text-[11px] font-medium text-[#E4E4E1] transition hover:border-white/[0.14] hover:bg-white/[0.035] hover:text-white"
                  >
                    <MessageCircle size={14} />
                    WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={goToAppointment}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.075] bg-[#0B0B0B] px-2 py-3 text-[11px] font-medium text-[#E4E4E1] transition hover:border-[#FF5A00]/25 hover:bg-[#FF5A00]/[0.035] hover:text-white"
                  >
                    <CalendarDays size={14} />
                    Turno
                  </button>
                </div>

                {/* CONTACT */}
                <div className="border-b border-white/[0.075] p-6">
                  <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E0E0DC]">
                    Contacto
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Phone size={14} className="text-[#8F8F8B]" />
                      <span className="text-[13px] text-[#E1E1DE]">
                        {selectedCustomer.phone}
                      </span>
                    </div>

                    {selectedCustomer.email && (
                      <div className="flex items-center gap-3">
                        <Mail size={14} className="text-[#8F8F8B]" />
                        <span className="truncate text-[13px] text-[#E1E1DE]">
                          {selectedCustomer.email}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* VALUE */}
                <div className="border-b border-white/[0.075] p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E0E0DC]">
                      Valor del cliente
                    </p>
                    <TrendingUp size={14} className="text-[#FF6A18]" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-white/[0.07] bg-[#0B0B0B] p-4">
                      <p className="text-[12px] text-[#D8D8D4]">Visitas</p>
                      <p className="mt-2 text-[24px] font-semibold text-white tabular-nums">
                        {selectedCustomer.visits}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.07] bg-[#0B0B0B] p-4">
                      <p className="text-[12px] text-[#D8D8D4]">Gasto</p>
                      <p className="mt-2 truncate text-[18px] font-semibold text-white tabular-nums">
                        ${selectedCustomer.spent.toLocaleString("es-AR")}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 rounded-xl border border-white/[0.07] bg-[#0B0B0B] p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] text-[#D8D8D4]">
                        Ticket promedio
                      </p>
                      <span className="text-[10px] font-semibold text-[#FF9A66]">LTV</span>
                    </div>
                    <p className="mt-2 text-[19px] font-semibold text-white tabular-nums">
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
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E0E0DC]">
                      Actividad reciente
                    </p>
                    <span className="text-[12px] text-[#D8D8D4]">
                      {selectedCustomerAppointments.length} turnos
                    </span>
                  </div>

                  {selectedCustomerAppointments.length === 0 ? (
                    <p className="text-[13px] leading-5 text-[#D8D8D4]">
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
                              <p className="truncate text-[13px] font-semibold text-[#F0F0ED]">
                                {appointment.service?.name ?? "Servicio"}
                              </p>
                              <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[#D8D8D4]">
                                <Clock3 size={10} />
                                {formatDateTime(appointment.start_at)}
                              </div>
                            </div>

                            <span className="shrink-0 text-[12px] font-semibold text-white tabular-nums">
                              $
                              {Number(
                                appointment.service?.price ?? 0
                              ).toLocaleString("es-AR")}
                            </span>
                          </div>

                          {appointment.notes && (
                            <p className="mt-3 border-t border-white/[0.05] pt-3 text-[12px] leading-5 text-[#D8D8D4]">
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
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#E0E0DC]">
                      Observaciones
                    </p>
                    <p className="rounded-xl border border-white/[0.065] bg-[#0B0B0B] p-4 text-[12px] leading-5 text-[#D8D8D4]">
                      {selectedCustomer.notes}
                    </p>
                  </div>
                )}

                {/* FOOTER */}
                <div className="flex items-center justify-between gap-3 p-5">
                  <button
                    type="button"
                    onClick={openDeleteCustomer}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-[#D0D0CC] transition hover:text-red-300"
                  >
                    <Trash2 size={13} />
                    Eliminar perfil
                  </button>

                  <button
                    type="button"
                    onClick={closeDetail}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-[#FF8A50] transition hover:text-[#FFB18F]"
                  >
                    Cerrar perfil
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </aside>
        </section>
          </main>
        </div>
      </div>

      {/* CREATE CUSTOMER MODAL */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-[16px] border border-white/[.09] bg-[#0d0d0d] shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/[0.075] p-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FF6A18]">
                  GESTIÓN
                </p>
                <h2 className="mt-1 text-[19px] font-semibold text-white">
                  Nuevo cliente
                </h2>
                <p className="mt-1 text-[12px] text-[#D0D0CC]">
                  Crear un perfil dentro de la base de clientes.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-[#D0D0CC] transition hover:text-white"
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
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#D0D0CC]">
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
                    className="w-full rounded-xl border border-white/[0.09] bg-[#0B0B0B] px-4 py-3 text-[13px] text-white outline-none transition placeholder:text-[#888884] focus:border-[#FF5A00]/45"
                  />
                </label>
              ))}

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#D0D0CC]">
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
                  className="w-full resize-none rounded-xl border border-white/[0.09] bg-[#0B0B0B] px-4 py-3 text-[13px] leading-5 text-white outline-none transition placeholder:text-[#888884] focus:border-[#FF5A00]/45"
                />
              </label>

              {error && (
                <div className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-[12px] text-red-300">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-white/[0.075] p-5">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-xl border border-white/[0.09] px-4 py-2.5 text-[12px] font-semibold text-[#C9C9C6] transition hover:bg-white/[0.04]"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={createCustomer}
                className="rounded-xl bg-[#FF5A00] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#FF6814] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Creando..." : "Crear cliente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {showEdit && editingCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !editSaving) {
              setShowEdit(false);
              setEditingCustomer(null);
            }
          }}
        >
          <div className="w-full max-w-lg overflow-hidden rounded-[16px] border border-white/[.09] bg-[#0d0d0d] shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/[0.075] p-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FF6A18]">
                  GESTIÓN
                </p>
                <h2 className="mt-1 text-[20px] font-semibold text-white">
                  Editar cliente
                </h2>
                <p className="mt-1 text-[13px] text-[#D0D0CC]">
                  Actualizá la información del perfil.
                </p>
              </div>
              <button
                type="button"
                disabled={editSaving}
                onClick={() => {
                  setShowEdit(false);
                  setEditingCustomer(null);
                }}
                className="text-[#D0D0CC] transition hover:text-white disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#D8D8D4]">
                  Nombre completo *
                </span>
                <input
                  value={editingCustomer.full_name}
                  onChange={(event) =>
                    setEditingCustomer((current) =>
                      current
                        ? { ...current, full_name: event.target.value }
                        : current
                    )
                  }
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0B0B0B] px-4 py-3 text-[14px] text-white outline-none transition placeholder:text-[#888884] focus:border-[#FF5A00]/45"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#D8D8D4]">
                  Teléfono *
                </span>
                <input
                  value={editingCustomer.phone}
                  onChange={(event) =>
                    setEditingCustomer((current) =>
                      current
                        ? { ...current, phone: event.target.value }
                        : current
                    )
                  }
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0B0B0B] px-4 py-3 text-[14px] text-white outline-none transition focus:border-[#FF5A00]/45"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#D8D8D4]">
                  Email
                </span>
                <input
                  type="email"
                  value={editingCustomer.email ?? ""}
                  onChange={(event) =>
                    setEditingCustomer((current) =>
                      current
                        ? { ...current, email: event.target.value }
                        : current
                    )
                  }
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0B0B0B] px-4 py-3 text-[14px] text-white outline-none transition focus:border-[#FF5A00]/45"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#D8D8D4]">
                  Observaciones
                </span>
                <textarea
                  rows={4}
                  value={editingCustomer.notes ?? ""}
                  onChange={(event) =>
                    setEditingCustomer((current) =>
                      current
                        ? { ...current, notes: event.target.value }
                        : current
                    )
                  }
                  className="w-full resize-none rounded-xl border border-white/[0.09] bg-[#0B0B0B] px-4 py-3 text-[14px] leading-5 text-white outline-none transition focus:border-[#FF5A00]/45"
                />
              </label>

              {error && (
                <div className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-[12px] leading-5 text-red-300">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-white/[0.075] p-5">
              <button
                type="button"
                disabled={editSaving}
                onClick={() => {
                  setShowEdit(false);
                  setEditingCustomer(null);
                }}
                className="rounded-xl border border-white/[0.09] px-4 py-2.5 text-[12px] font-semibold text-[#D0D0CC] transition hover:bg-white/[0.04] disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={editSaving}
                onClick={updateCustomer}
                className="rounded-xl bg-[#FF5A00] px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-[#FF6814] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {editSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CUSTOMER · ADMIN REAUTHENTICATION */}
      {showDelete && selectedCustomer && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-5 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !deleteSaving) {
              setShowDelete(false);
              setDeletePassword("");
              setDeleteError("");
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-[18px] border border-red-400/20 bg-[#0d0d0d] shadow-[0_30px_100px_rgba(0,0,0,.55)]">
            <div className="border-b border-white/[0.075] p-6">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/[0.07] text-red-300">
                <ShieldCheck size={19} />
              </div>

              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-red-300">
                Confirmación de administrador
              </p>

              <h2 className="mt-1.5 text-[21px] font-semibold tracking-[-0.025em] text-white">
                Eliminar perfil
              </h2>

              <p className="mt-2 text-[13px] leading-5 text-[#D0D0CC]">
                Vas a quitar de la base activa el perfil de{" "}
                <span className="font-semibold text-white">
                  {selectedCustomer.full_name}
                </span>
                .
              </p>

              <div className="mt-4 rounded-xl border border-red-400/15 bg-red-400/[0.045] px-4 py-3 text-[12px] leading-5 text-red-200">
                El perfil dejará de aparecer entre los clientes activos. Los turnos
                y el historial de este cliente se conservarán. Para continuar,
                verificá nuevamente tu contraseña de administrador.
              </div>
            </div>

            <div className="space-y-4 p-6">
              <label className="block">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#D8D8D4]">
                  Contraseña del administrador
                </span>
                <input
                  type="password"
                  autoFocus
                  value={deletePassword}
                  onChange={(event) => {
                    setDeletePassword(event.target.value);
                    setDeleteError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !deleteSaving) {
                      deleteCustomer();
                    }
                  }}
                  placeholder="Ingresá tu contraseña"
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0B0B0B] px-4 py-3 text-[14px] text-white outline-none transition placeholder:text-[#777773] focus:border-red-400/40 focus:ring-2 focus:ring-red-400/[0.07]"
                />
              </label>

              {deleteError && (
                <div className="rounded-xl border border-red-400/15 bg-red-400/[0.06] px-4 py-3 text-[12px] leading-5 text-red-300">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-white/[0.075] p-5">
              <button
                type="button"
                disabled={deleteSaving}
                onClick={() => {
                  setShowDelete(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                className="rounded-xl border border-white/[0.09] px-4 py-2.5 text-[12px] font-semibold text-[#D0D0CC] transition hover:bg-white/[0.04] disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={deleteSaving || !deletePassword}
                onClick={deleteCustomer}
                className="flex items-center gap-2 rounded-xl bg-red-500/90 px-4 py-2.5 text-[12px] font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={14} />
                {deleteSaving ? "Verificando..." : "Eliminar perfil"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {notice && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-[#151515] px-4 py-3 text-[12px] font-medium text-emerald-300 shadow-2xl">
          <UserCheck size={14} />
          {notice}
        </div>
      )}
    </div>
  );
}
