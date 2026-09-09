"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gift,
  Heart,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Scissors,
  Settings,
  Store,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useAdminShell } from "./AdminShell";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Agenda", href: "/admin/turnos", icon: CalendarDays },
  { label: "Clientes", href: "/admin/clientes", icon: Users },
  { label: "Equipo", href: "/admin/equipo", icon: UserRound },
  { label: "Servicios", href: "/admin/servicios", icon: Scissors },
  { label: "Fidelización", href: "/admin/fidelizacion", icon: Heart },
  { label: "Referidos", href: "/admin/referidos", icon: Gift },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Configuración", href: "/admin/configuracion", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggleSidebar } = useAdminShell();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setWorkspaceOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
      <button
        type="button"
        aria-label="Abrir navegación"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-[70] flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0A0A0A]/95 text-white/65 shadow-2xl backdrop-blur-xl lg:hidden"
      >
        <PanelLeft size={17} strokeWidth={1.7} />
      </button>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar navegación"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-[65] flex flex-col overflow-hidden",
          "bg-[#080808]",
          "transition-[width,transform] duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
          collapsed ? "lg:w-[76px]" : "lg:w-[248px]",
          mobileOpen ? "translate-x-0 w-[248px]" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* Brand area */}
        <div
          className={[
            "flex h-[72px] shrink-0 items-center",
            collapsed ? "justify-center px-2" : "px-6",
          ].join(" ")}
        >
          <Link
            href="/admin"
            aria-label="barberOS"
            className={[
              "group flex items-center",
              collapsed ? "justify-center" : "gap-3",
            ].join(" ")}
          >
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
              <Image
                src="/brand/barberos-mark.png"
                alt=""
                width={36}
                height={36}
                priority
                className="h-9 w-9 object-contain"
              />
            </div>

            {!collapsed && (
              <div className="leading-none">
                <div className="brand-wordmark text-[17px] font-semibold tracking-[-0.055em] text-white">
                  barber<span className="text-[#FF5A00]">OS</span>
                </div>
                <div className="mt-1 text-[7px] font-medium uppercase tracking-[0.24em] text-white/25">
                  business platform
                </div>
              </div>
            )}
          </Link>

          <button
            type="button"
            aria-label="Cerrar navegación"
            onClick={() => setMobileOpen(false)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:bg-white/[0.04] hover:text-white lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* Workspace */}
        <div className={collapsed ? "px-3 pb-5" : "px-4 pb-5"}>
          <div className="relative">
            <button
              type="button"
              onClick={() => !collapsed && setWorkspaceOpen((current) => !current)}
              title={collapsed ? "Don Segundo" : undefined}
              className={[
                "workspace-control flex w-full items-center rounded-[14px] bg-white/[0.035]",
                "transition-all duration-200 hover:bg-white/[0.055]",
                collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
              ].join(" ")}
            >
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.045]">
                <Store size={14} strokeWidth={1.65} className="text-white/60" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-[#080808] bg-[#20D68A]" />
              </div>

              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[11px] font-semibold tracking-[-0.01em] text-white/85">
                      Don Segundo
                    </p>
                    <p className="mt-1 truncate text-[7px] uppercase tracking-[0.15em] text-white/30">
                      Workspace activo
                    </p>
                  </div>
                  <ChevronDown
                    size={13}
                    className={[
                      "text-white/25 transition-transform duration-200",
                      workspaceOpen ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </>
              )}
            </button>

            {workspaceOpen && !collapsed && (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-[14px] border border-white/[0.08] bg-[#111111] p-1.5 shadow-2xl">
                <div className="px-2 pb-1.5 pt-1 text-[7px] font-semibold uppercase tracking-[0.18em] text-white/25">
                  Workspace
                </div>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-[10px] bg-white/[0.05] px-2.5 py-2.5 text-left"
                >
                  <Store size={13} className="text-[#FF6A18]" />
                  <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-white/75">
                    Don Segundo
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#20D68A]" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation — one flat system */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={[
                    "group relative flex h-11 items-center rounded-[12px]",
                    "transition-all duration-200",
                    collapsed ? "justify-center px-0" : "gap-3 px-3",
                    active
                      ? "bg-white/[0.075] text-white"
                      : "text-white/48 hover:bg-white/[0.04] hover:text-white/82",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute left-0 h-5 w-[2px] rounded-r-full transition-all duration-200",
                      active ? "bg-[#FF5A00]" : "bg-transparent",
                    ].join(" ")}
                  />

                  <Icon
                    size={17}
                    strokeWidth={active ? 1.9 : 1.65}
                    className={
                      active
                        ? "text-[#FF6A18]"
                        : "text-white/38 group-hover:text-white/62"
                    }
                  />

                  {!collapsed && (
                    <span className="text-[12px] font-medium tracking-[-0.015em]">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Account */}
        <div className="shrink-0 px-3 pb-3">
          {!collapsed && (
            <div className="flex items-center gap-3 rounded-[12px] px-2 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.055] text-[9px] font-semibold text-white/65">
                MC
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10px] font-semibold text-white/78">
                  Manuel Cladera
                </p>
                <p className="mt-1 text-[7px] uppercase tracking-[0.14em] text-white/28">
                  Administrador
                </p>
              </div>
              <button
                type="button"
                aria-label="Cerrar sesión"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/28 hover:bg-white/[0.04] hover:text-white/60"
              >
                <LogOut size={13} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expandir navegación" : "Contraer navegación"}
            title={collapsed ? "Expandir navegación" : "Contraer navegación"}
            className={[
              "flex h-8 w-full items-center rounded-[10px] bg-white/[0.025]",
              "text-white/28 transition hover:bg-white/[0.05] hover:text-white/60",
              collapsed ? "justify-center" : "justify-between px-3",
            ].join(" ")}
          >
            {!collapsed && (
              <span className="text-[8px] font-medium uppercase tracking-[0.15em]">
                Contraer
              </span>
            )}
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </aside>
    </>
  );
}
