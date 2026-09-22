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
  const {
    collapsed,
    toggleSidebar,
  } = useAdminShell();

  return (
    <aside
      className={[
        "fixed left-0 top-0 z-40 h-screen",
        "bg-[#050505]/35",
        "transition-[width] duration-300 ease-out",
        collapsed
          ? "w-[72px]"
          : "w-[230px]",
      ].join(" ")}
    >
      <div className="relative flex h-full flex-col">

        {/* ================================================= */}
        {/* BRAND                                             */}
        {/* ================================================= */}

        <div
          className={[
            "flex h-[72px] shrink-0 items-center",
            collapsed
              ? "justify-center"
              : "px-6",
          ].join(" ")}
        >
          <Link
            href="/admin"
            className="group flex items-center gap-3"
            aria-label="barberOS"
          >
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center">
              <Image
                src="/brand/barberos-mark.png"
                alt="barberOS"
                width={36}
                height={36}
                className="h-9 w-9 object-contain"
                priority
              />
            </div>

            {!collapsed && (
              <div className="flex flex-col leading-none">
                <div
                  className="
                    font-[family:var(--font-barberos-display)]
                    text-[18px]
                    font-semibold
                    tracking-[-0.045em]
                    text-white
                  "
                >
                  barber
                  <span className="text-[#ff6a00]">
                    OS
                  </span>
                </div>

                <span
                  className="
                    mt-1
                    font-[family:var(--font-barberos-nav)]
                    text-[7px]
                    font-medium
                    uppercase
                    tracking-[0.24em]
                    text-white/25
                  "
                >
                  Business Platform
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* ================================================= */}
        {/* NAVIGATION                                        */}
        {/* ================================================= */}

        <div
          className={[
            "pt-7",
            collapsed
              ? "px-2"
              : "px-3",
          ].join(" ")}
        >
          {!collapsed && (
            <div
              className="
                mb-3
                px-3
                font-[family:var(--font-barberos-nav)]
                text-[9px]
                font-semibold
                uppercase
                tracking-[0.20em]
                text-white/24
              "
            >
              Navegación
            </div>
          )}

          <nav className="space-y-0.5">
            {navigation.map((item) => {
              const Icon = item.icon;

              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href ||
                    pathname.startsWith(
                      `${item.href}/`
                    );

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={
                    collapsed
                      ? item.label
                      : undefined
                  }
                  className={[
                    "group relative flex h-[45px] items-center rounded-[10px]",
                    "font-[family:var(--font-barberos-nav)]",
                    "transition-all duration-200",
                    collapsed
                      ? "justify-center"
                      : "gap-3 px-3",
                    isActive
                      ? "bg-white/[0.045]"
                      : "hover:bg-white/[0.025]",
                  ].join(" ")}
                >
                  {/* Active indicator */}

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
                        bg-[#ff6a00]
                        shadow-[0_0_10px_rgba(255,106,0,.35)]
                      "
                    />
                  )}

                  {/* Icon */}

                  <span
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center",
                      "transition-colors duration-200",
                      isActive
                        ? "text-[#ff6a00]"
                        : "text-white/38 group-hover:text-white/70",
                    ].join(" ")}
                  >
                    <Icon
                      size={17}
                      strokeWidth={
                        isActive ? 1.9 : 1.6
                      }
                    />
                  </span>

                  {!collapsed && (
                    <span
                      className={[
                        "text-[12px] font-medium tracking-[-0.012em]",
                        isActive
                          ? "text-white/92"
                          : "text-white/52 group-hover:text-white/82",
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

        {/* ================================================= */}
        {/* COLLAPSE                                          */}
        {/* ================================================= */}

        <div className="mt-auto p-3">
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
              "group flex w-full items-center rounded-[10px]",
              "font-[family:var(--font-barberos-nav)]",
              "text-white/30 transition-all duration-200",
              "hover:bg-white/[0.035] hover:text-white/65",
              collapsed
                ? "h-10 justify-center"
                : "h-10 gap-3 px-3",
            ].join(" ")}
          >
            <span
              className="
                flex
                h-7
                w-7
                items-center
                justify-center
                rounded-[8px]
                bg-white/[0.025]
              "
            >
              {collapsed ? (
                <PanelLeftOpen
                  size={15}
                  strokeWidth={1.6}
                />
              ) : (
                <PanelLeftClose
                  size={15}
                  strokeWidth={1.6}
                />
              )}
            </span>

            {!collapsed && (
              <span className="text-[10px] font-medium">
                Ocultar navegación
              </span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}