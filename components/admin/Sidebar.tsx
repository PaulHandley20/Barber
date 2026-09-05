"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Scissors,
  UserRound,
  Heart,
  Gift,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Store,
  Sparkles,
  PanelLeft,
  X,
} from "lucide-react";

const navigation = [
  {
    section: "GENERAL",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Agenda", href: "/admin/turnos", icon: CalendarDays },
      { label: "Clientes", href: "/admin/clientes", icon: Users },
    ],
  },
  {
    section: "OPERACIONES",
    items: [
      { label: "Servicios", href: "/admin/servicios", icon: Scissors },
      { label: "Equipo", href: "/admin/equipo", icon: UserRound },
    ],
  },
  {
    section: "CRECIMIENTO",
    items: [
      { label: "Fidelización", href: "/admin/fidelizacion", icon: Heart },
      { label: "Referidos", href: "/admin/referidos", icon: Gift },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    section: "SISTEMA",
    items: [
      { label: "Configuración", href: "/admin/configuracion", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  // Remember the user's preferred sidebar state.
  useEffect(() => {
    const saved = window.localStorage.getItem("barberos-sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "barberos-sidebar-collapsed",
      String(collapsed)
    );
  }, [collapsed]);

  // Close mobile navigation after route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Escape closes mobile navigation / workspace menu.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setWorkspaceOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => !value);
    setWorkspaceOpen(false);
  };

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        aria-label="Abrir menú"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#090a0c]/95 text-zinc-300 shadow-2xl backdrop-blur-xl transition hover:border-white/[0.14] hover:bg-[#101114] lg:hidden"
      >
        <PanelLeft size={17} strokeWidth={1.7} />
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={[
          "group/sidebar fixed left-0 top-0 z-50 flex h-dvh flex-col",
          "border-r border-white/[0.065] bg-[linear-gradient(180deg,#151617_0%,#101112_48%,#0d0e0f_100%)] text-white",
          "transition-[width,transform] duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
          "lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-[76px]" : "w-[264px]",
          "lg:block",
        ].join(" ")}
      >
        {/* Subtle edge highlight */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-gradient-to-b from-white/[0.12] via-white/[0.025] to-transparent" />

        {/* ============================================================ */}
        {/* BRAND                                                        */}
        {/* ============================================================ */}

        <div
          className={[
            "flex h-[76px] shrink-0 items-center border-b border-white/[0.07]",
            collapsed ? "justify-center px-3" : "px-5",
          ].join(" ")}
        >
          <Link
            href="/admin"
            aria-label="barberOS Dashboard"
            className="group/brand flex min-w-0 items-center gap-3"
          >
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
              <div className="absolute inset-0 rounded-[11px] border border-white/[0.10] bg-white/[0.025] transition duration-200 group-hover/brand:border-[#ff5a00]/30 group-hover/brand:bg-[#ff5a00]/[0.06]" />

              {/* Stylized B / barberOS mark */}
              <span className="relative -translate-x-px text-[20px] font-semibold tracking-[-0.12em] text-white">
                B
              </span>

              <span className="absolute bottom-[7px] right-[7px] h-1 w-1 rounded-full bg-[#ff5a00]" />
            </div>

            {!collapsed && (
              <div className="min-w-0 leading-none">
                <div className="text-[15px] font-semibold tracking-[-0.045em] text-white">
                  barber<span className="text-zinc-500">OS</span>
                </div>
                <div className="mt-1.5 text-[8px] font-medium uppercase tracking-[0.18em] text-zinc-600">
                  business platform
                </div>
              </div>
            )}
          </Link>

          {/* Mobile close */}
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMobileOpen(false)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-white/[0.04] hover:text-zinc-300 lg:hidden"
          >
            <X size={16} strokeWidth={1.7} />
          </button>
        </div>

        {/* ============================================================ */}
        {/* WORKSPACE                                                    */}
        {/* ============================================================ */}

        <div className={collapsed ? "px-3 py-4" : "px-3 py-4"}>
          <div className="relative">
            <button
              type="button"
              onClick={() => !collapsed && setWorkspaceOpen((value) => !value)}
              title={collapsed ? "Don Segundo" : undefined}
              className={[
                "group/workspace flex w-full items-center rounded-xl border border-white/[0.06] bg-white/[0.022] text-left transition-all",
                "hover:border-white/[0.11] hover:bg-white/[0.038]",
                collapsed ? "justify-center p-2" : "gap-3 p-2.5",
              ].join(" ")}
            >
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.065] bg-[#181a1b]">
                <Store
                  size={15}
                  strokeWidth={1.65}
                  className="text-zinc-400 transition-colors group-hover/workspace:text-zinc-200"
                />
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-[#111318] bg-emerald-400" />
              </div>

              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-[11px] font-medium text-zinc-200">
                        Don Segundo
                      </p>
                      <span className="rounded border border-emerald-400/10 bg-emerald-400/[0.055] px-1 py-0.5 text-[7px] font-medium uppercase tracking-[0.08em] text-emerald-400">
                        Live
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[9px] text-zinc-600">
                      Workspace activo
                    </p>
                  </div>

                  <ChevronDown
                    size={14}
                    strokeWidth={1.7}
                    className={[
                      "shrink-0 text-zinc-600 transition-transform duration-200",
                      workspaceOpen ? "rotate-180 text-zinc-400" : "",
                    ].join(" ")}
                  />
                </>
              )}
            </button>

            {/* Workspace menu — ready for future multi-tenant workspaces */}
            {workspaceOpen && !collapsed && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-xl border border-white/[0.08] bg-[#171819] p-1.5 shadow-2xl shadow-black/50">
                <div className="px-2.5 pb-1.5 pt-2">
                  <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                    Workspace
                  </p>
                </div>

                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-lg bg-white/[0.045] px-2.5 py-2 text-left"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1d1f20]">
                    <Store size={12} className="text-[#ff6a18]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-medium text-zinc-200">
                      Don Segundo
                    </p>
                    <p className="text-[8px] text-zinc-600">Activo ahora</p>
                  </div>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </button>

                <div className="my-1.5 h-px bg-white/[0.05]" />

                <button
                  type="button"
                  className="w-full rounded-lg px-2.5 py-2 text-left text-[9px] font-medium text-zinc-600 transition hover:bg-white/[0.035] hover:text-zinc-300"
                >
                  + Agregar workspace
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* NAVIGATION                                                   */}
        {/* ============================================================ */}

        <nav
          className={[
            "min-h-0 flex-1 overflow-y-auto pb-4",
            "scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/[0.07]",
            collapsed ? "px-3" : "px-3",
          ].join(" ")}
        >
          <div className={collapsed ? "space-y-5" : "space-y-5"}>
            {navigation.map((group) => (
              <div key={group.section}>
                {!collapsed && (
                  <div className="mb-1.5 px-2.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-zinc-700">
                    {group.section}
                  </div>
                )}

                {collapsed && (
                  <div className="mb-1.5 flex justify-center">
                    <div className="h-px w-5 bg-white/[0.055]" />
                  </div>
                )}

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;

                    const isActive =
                      item.href === "/admin"
                        ? pathname === "/admin"
                        : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        className={[
                          "group/navitem relative flex h-9 items-center rounded-lg transition-all duration-150",
                          collapsed
                            ? "justify-center px-0"
                            : "gap-3 px-2.5",
                          isActive
                            ? "bg-white/[0.065] text-white"
                            : "text-zinc-500 hover:bg-white/[0.035] hover:text-zinc-200",
                        ].join(" ")}
                      >
                        {/* Active rail */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-[#ff5a00] shadow-[0_0_10px_rgba(255,90,0,.28)]" />
                        )}

                        <Icon
                          size={16}
                          strokeWidth={isActive ? 1.85 : 1.65}
                          className={[
                            "shrink-0 transition-colors",
                            isActive
                              ? "text-[#ff6a18]"
                              : "text-zinc-600 group-hover/navitem:text-zinc-400",
                          ].join(" ")}
                        />

                        {!collapsed && (
                          <>
                            <span className="truncate text-[11px] font-medium">
                              {item.label}
                            </span>

                            {item.label === "Analytics" && (
                              <span
                                className={[
                                  "ml-auto rounded-md border px-1.5 py-0.5 text-[7px] font-semibold uppercase tracking-[0.10em]",
                                  isActive
                                    ? "border-[#ff5a00]/20 bg-[#ff5a00]/[0.08] text-[#ff7b35]"
                                    : "border-white/[0.07] bg-white/[0.025] text-zinc-600",
                                ].join(" ")}
                              >
                                PRO
                              </span>
                            )}
                          </>
                        )}

                        {/* Collapsed active dot */}
                        {collapsed && isActive && (
                          <span className="absolute bottom-[5px] h-1 w-1 rounded-full bg-[#ff5a00]" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* ============================================================ */}
        {/* INSIGHTS                                                     */}
        {/* ============================================================ */}

        <div className={collapsed ? "px-3 pb-3" : "px-3 pb-3"}>
          {collapsed ? (
            <button
              type="button"
              title="barberOS Insights"
              className="flex h-10 w-full items-center justify-center rounded-xl border border-[#ff5a00]/10 bg-[#ff5a00]/[0.035] text-[#ff6a18] transition hover:border-[#ff5a00]/20 hover:bg-[#ff5a00]/[0.06]"
            >
              <Sparkles size={14} strokeWidth={1.65} />
            </button>
          ) : (
            <div className="relative overflow-hidden rounded-xl border border-white/[0.065] bg-white/[0.022] p-3">
              <div className="pointer-events-none absolute -right-7 -top-7 h-20 w-20 rounded-full bg-[#ff5a00]/[0.07] blur-2xl" />

              <div className="relative">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-[#ff5a00]/10 bg-[#ff5a00]/[0.06] text-[#ff6a18]">
                    <Sparkles size={11} strokeWidth={1.7} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold text-zinc-300">
                      barberOS Insights
                    </p>
                    <p className="text-[7px] uppercase tracking-[0.12em] text-zinc-700">
                      Intelligence layer
                    </p>
                  </div>
                </div>

                <p className="text-[9px] leading-4 text-zinc-600">
                  Próximamente, señales inteligentes para detectar
                  oportunidades de crecimiento.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* FOOTER                                                       */}
        {/* ============================================================ */}

        <div className="shrink-0 border-t border-white/[0.07] px-3 pb-3 pt-2.5">
          {!collapsed && (
            <>
              {/* Plan */}
              <div className="mb-1 flex items-center justify-between rounded-lg px-2.5 py-2">
                <div>
                  <p className="text-[7px] font-semibold uppercase tracking-[0.15em] text-zinc-700">
                    Plan
                  </p>
                  <p className="mt-0.5 text-[10px] font-medium text-zinc-400">
                    Profesional
                  </p>
                </div>

                <span className="rounded-md border border-emerald-400/10 bg-emerald-400/[0.055] px-1.5 py-1 text-[7px] font-semibold uppercase tracking-[0.10em] text-emerald-400">
                  Activo
                </span>
              </div>

              {/* User */}
              <div className="group/user flex items-center gap-2.5 rounded-lg px-2.5 py-2.5 transition hover:bg-white/[0.035]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.045] text-[9px] font-semibold text-zinc-300">
                  MC
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] font-medium text-zinc-300">
                    Manuel Cladera
                  </p>
                  <p className="mt-0.5 truncate text-[8px] text-zinc-700">
                    Administrador
                  </p>
                </div>

                <button
                  type="button"
                  aria-label="Cerrar sesión"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-700 transition hover:bg-red-500/[0.07] hover:text-red-300"
                >
                  <LogOut size={13} strokeWidth={1.7} />
                </button>
              </div>
            </>
          )}

          {/* Collapse control */}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir sidebar" : "Contraer sidebar"}
            title={collapsed ? "Expandir sidebar" : "Contraer sidebar"}
            className={[
              "mt-1 flex h-8 items-center rounded-lg border border-white/[0.05] bg-white/[0.018] text-zinc-600 transition",
              "hover:border-white/[0.09] hover:bg-white/[0.035] hover:text-zinc-300",
              collapsed ? "w-full justify-center" : "w-full justify-between px-2.5",
            ].join(" ")}
          >
            {!collapsed && (
              <span className="text-[8px] font-medium uppercase tracking-[0.12em]">
                Contraer menú
              </span>
            )}

            {collapsed ? (
              <ChevronRight size={14} strokeWidth={1.7} />
            ) : (
              <ChevronLeft size={14} strokeWidth={1.7} />
            )}
          </button>
        </div>
      </aside>

      {/* Desktop helper: tiny collapse handle at the sidebar edge when collapsed */}
      {collapsed && (
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label="Expandir sidebar"
          title="Expandir sidebar"
          className="fixed left-[68px] top-1/2 z-[51] hidden h-7 w-5 -translate-y-1/2 items-center justify-center rounded-r-md border border-l-0 border-white/[0.08] bg-[#171819] text-zinc-600 shadow-xl transition hover:text-zinc-300 lg:flex"
        >
          <ChevronRight size={12} strokeWidth={1.8} />
        </button>
      )}
    </>
  );
}
