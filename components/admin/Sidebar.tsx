"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Scissors,
  Gift,
  BarChart3,
  Settings,
  UserRoundCog,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAdminShell } from "./AdminShellContext";

const navigation = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Agenda",
    href: "/admin/turnos",
    icon: CalendarDays,
  },
  {
    label: "Clientes",
    href: "/admin/clientes",
    icon: Users,
  },
  {
    label: "Equipo",
    href: "/admin/equipo",
    icon: UserRoundCog,
  },
  {
    label: "Servicios",
    href: "/admin/servicios",
    icon: Scissors,
  },
  {
    label: "Fidelización",
    href: "/admin/fidelizacion",
    icon: Gift,
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    label: "Configuración",
    href: "/admin/configuracion",
    icon: Settings,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggleSidebar } = useAdminShell();

  return (
    <aside
      className={[
        "fixed left-0 top-0 z-40 h-screen",
        "transition-[width] duration-300 ease-out",
        collapsed ? "w-[76px]" : "w-[240px]",
      ].join(" ")}
    >
      {/* =========================================================
          BACKGROUND
      ========================================================= */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* Base */}
        <div className="absolute inset-0 bg-[#050505]" />

        {/* Orange atmospheric glow */}
        <div
          className="
            absolute
            -left-[170px]
            top-[30%]
            h-[520px]
            w-[520px]
            rounded-full
            bg-[radial-gradient(circle,rgba(255,90,0,0.055)_0%,rgba(255,90,0,0.018)_35%,transparent_70%)]
          "
        />

        <div
          className="
            absolute
            -bottom-[180px]
            left-[15%]
            h-[420px]
            w-[420px]
            rounded-full
            bg-[radial-gradient(circle,rgba(255,90,0,0.035)_0%,transparent_70%)]
          "
        />
      </div>

      {/* =========================================================
          CONTENT
      ========================================================= */}

      <div className="relative flex h-full flex-col">

        {/* =======================================================
            BRAND
        ======================================================= */}

        <div
          className={[
            "flex h-[116px] shrink-0 items-center justify-center",
            collapsed ? "px-2" : "px-5",
          ].join(" ")}
        >
          <Link
            href="/admin"
            aria-label="Ir al Dashboard"
            className="group flex flex-col items-center justify-center"
          >
            <div
              className={[
                "relative flex items-center justify-center",
                collapsed ? "h-[42px] w-[42px]" : "h-[54px] w-[54px]",
              ].join(" ")}
            >
              <Image
                src="/brand/barberos-mark.png"
                alt="barberOS"
                fill
                sizes={collapsed ? "42px" : "54px"}
                priority
                className="object-contain transition-transform duration-300 group-hover:scale-[1.04]"
              />
            </div>

            {!collapsed && (
              <>
                <div className="mt-1.5 font-[family:var(--font-barberos-ui)] text-[10px] font-bold uppercase tracking-[0.30em] text-white/80">
                BARBER
                <span className="ml-[2px] text-[12px] font-extrabold tracking-[-0.02em] text-[#ff5a00]">
                  OS
                </span>
              </div>

                <div className="mt-2 h-[2px] w-7 rounded-full bg-[#ff5a00]" />
              </>
            )}
          </Link>
        </div>

        {/* =======================================================
            NAVIGATION
        ======================================================= */}

        <div
          className={[
            "flex-1",
            collapsed ? "px-2" : "px-3",
          ].join(" ")}
        >
          {!collapsed && (
            <div className="mb-3 px-3 text-[9px] font-semibold uppercase tracking-[0.24em] text-white/25">
              Navegación
            </div>
          )}

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={[
                    "group relative flex items-center rounded-[12px]",
                    "transition-all duration-200",
                    collapsed
                      ? "h-[46px] justify-center"
                      : "h-[46px] gap-3 px-3.5",
                    isActive
                      ? "bg-white/[0.055] text-white"
                      : "text-white/48 hover:bg-white/[0.035] hover:text-white/85",
                  ].join(" ")}
                >
                  {/* Orange active indicator */}
                  {isActive && (
                    <span
                      className="
                        absolute
                        left-0
                        top-1/2
                        h-5
                        w-[2px]
                        -translate-y-1/2
                        rounded-r-full
                        bg-[#ff5a00]
                        shadow-[0_0_12px_rgba(255,90,0,.45)]
                      "
                    />
                  )}

                  {/* Icon */}
                  <span
                    className={[
                      "flex shrink-0 items-center justify-center",
                      "transition-all duration-200",
                      isActive
                        ? "text-[#ff6a18]"
                        : "text-white/45 group-hover:text-white/80",
                    ].join(" ")}
                  >
                    <Icon
                      size={18}
                      strokeWidth={isActive ? 1.9 : 1.55}
                    />
                  </span>

                  {!collapsed && (
                    <span
                      className={[
                        "font-[family:var(--font-barberos-ui)] text-[13px] tracking-[-0.01em]",
                        isActive
                          ? "font-semibold text-white"
                          : "font-medium text-white/58 group-hover:text-white/90",
                      ].join(" ")}
                    >
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* =======================================================
            COLLAPSE
        ======================================================= */}

        <div
          className={[
            "pb-5",
            collapsed ? "px-2" : "px-3",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={
              collapsed
                ? "Mostrar navegación"
                : "Ocultar navegación"
            }
            title={
              collapsed
                ? "Mostrar navegación"
                : "Ocultar navegación"
            }
            className={[
              "group flex w-full items-center rounded-[12px]",
              "text-white/35 transition-all duration-200",
              "hover:bg-white/[0.035] hover:text-white/75",
              collapsed
                ? "h-[46px] justify-center"
                : "h-[44px] gap-3 px-3",
            ].join(" ")}
          >
            <span
              className="
                flex
                h-8
                w-8
                shrink-0
                items-center
                justify-center
                rounded-full
                border
                border-white/[0.08]
                bg-white/[0.025]
                transition
                group-hover:border-white/[0.14]
              "
            >
              {collapsed ? (
                <PanelLeftOpen
                  size={16}
                  strokeWidth={1.5}
                />
              ) : (
                <PanelLeftClose
                  size={16}
                  strokeWidth={1.5}
                />
              )}
            </span>

            {!collapsed && (
              <span className="font-[family:var(--font-barberos-ui)] text-[11px] font-medium text-white/38 group-hover:text-white/65">
                Colapsar sidebar
              </span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}