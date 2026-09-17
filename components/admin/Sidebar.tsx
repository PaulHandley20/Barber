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
import { useState } from "react";

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
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={[
        "fixed left-0 top-0 z-40 h-screen",
        "border-r border-white/[0.06]",
        "bg-[#050607]/95 backdrop-blur-xl",
        "transition-[width] duration-300 ease-out",
        collapsed ? "w-[82px]" : "w-[270px]",
      ].join(" ")}
    >
      {/* Atmospheric glow */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -left-32 top-[24%] h-[360px] w-[360px] rounded-full bg-orange-500/[0.035] blur-[110px]" />
        <div className="absolute -bottom-20 left-0 h-[280px] w-[280px] rounded-full bg-orange-500/[0.025] blur-[100px]" />
      </div>

      <div className="relative flex h-full flex-col">
        {/* BRAND */}
        <div
          className={[
            "flex h-[88px] items-center border-b border-white/[0.05]",
            collapsed ? "justify-center px-3" : "px-7",
          ].join(" ")}
        >
          <Link
            href="/admin"
            className="group flex items-center gap-3"
            aria-label="barberOS"
          >
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center">
              <Image
                src="/brand/barberos-mark.png"
                alt="barberOS"
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
                priority
              />
            </div>

            {!collapsed && (
              <div className="flex flex-col leading-none">
                <div className="text-[21px] font-semibold tracking-[-0.04em] text-white">
                  barber
                  <span className="text-[#ff6a00]">OS</span>
                </div>

                <span className="mt-1 text-[8px] font-medium uppercase tracking-[0.24em] text-white/30">
                  Business Platform
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* NAVIGATION */}
        <div
          className={[
            "px-3 pt-8",
            collapsed ? "px-2" : "px-3",
          ].join(" ")}
        >
          {!collapsed && (
            <div className="mb-4 px-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/30">
              Navegación
            </div>
          )}

          <nav className="space-y-1.5">
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
                    "group relative flex h-[50px] items-center rounded-[12px]",
                    "transition-all duration-200",
                    collapsed
                      ? "justify-center px-0"
                      : "gap-3.5 px-4",
                    isActive
                      ? "bg-white/[0.075] text-white"
                      : "text-white/55 hover:bg-white/[0.045] hover:text-white/90",
                  ].join(" ")}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-[#ff6a00]" />
                  )}

                  {/* Icon container */}
                  <span
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]",
                      "transition-all duration-200",
                      isActive
                        ? "bg-[#ff6a00]/10 text-[#ff6a00]"
                        : "bg-transparent text-white/45 group-hover:text-white/80",
                    ].join(" ")}
                  >
                    <Icon
                      size={19}
                      strokeWidth={isActive ? 2 : 1.7}
                    />
                  </span>

                  {!collapsed && (
                    <span
                      className={[
                        "text-[14px] font-medium tracking-[-0.01em]",
                        isActive
                          ? "text-white"
                          : "text-white/60 group-hover:text-white/90",
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

        {/* BOTTOM AREA */}
        <div className="mt-auto border-t border-white/[0.05] p-4">
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className={[
              "group flex w-full items-center rounded-[12px]",
              "text-white/40 transition-all duration-200",
              "hover:bg-white/[0.045] hover:text-white/80",
              collapsed
                ? "h-11 justify-center"
                : "h-11 gap-3 px-3",
            ].join(" ")}
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
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025]">
              {collapsed ? (
                <PanelLeftOpen size={17} strokeWidth={1.7} />
              ) : (
                <PanelLeftClose size={17} strokeWidth={1.7} />
              )}
            </span>

            {!collapsed && (
              <span className="text-[12px] font-medium">
                Ocultar navegación
              </span>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}