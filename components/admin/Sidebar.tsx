"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Gift,
  LayoutDashboard,
  Settings2,
  Users,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { useAdminShell } from "./AdminShell";

const navigation = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Agenda", href: "/admin/turnos", icon: CalendarDays },
  { label: "Clientes", href: "/admin/clientes", icon: Users },
  { label: "Equipo", href: "/admin/equipo", icon: UserRoundCog },
  { label: "Servicios", href: "/admin/servicios", icon: CircleDollarSign },
  { label: "Fidelización", href: "/admin/fidelizacion", icon: Gift },
  { label: "Referidos", href: "/admin/referidos", icon: UsersRound },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Configuración", href: "/admin/configuracion", icon: Settings2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useAdminShell();

  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-[#070707]",
        "transition-[width] duration-300 ease-[cubic-bezier(.22,.61,.36,1)]",
        collapsed ? "w-[82px]" : "w-[248px]",
      ].join(" ")}
    >
      <div className="flex h-full flex-col px-3.5 py-5">
        <div
          className={[
            "mb-9 flex h-[42px] items-center",
            collapsed ? "justify-center" : "px-2",
          ].join(" ")}
        >
          <Link href="/admin" className="flex items-center">
            <div className="relative h-[31px] w-[31px] shrink-0">
              <Image
                src="/brand/barberos-mark.png"
                alt="barberOS"
                fill
                priority
                className="object-contain"
              />
            </div>

            {!collapsed && (
              <div className="ml-3.5">
                <div
                  className="text-[20px] font-medium leading-none tracking-[-0.055em] text-white"
                  style={{ fontFamily: "var(--font-barberos-display, Inter, sans-serif)" }}
                >
                  barber<span className="text-[#ff6a18]">OS</span>
                </div>
                <div className="mt-1.5 text-[7px] font-medium uppercase tracking-[0.19em] text-white/25">
                  Business platform
                </div>
              </div>
            )}
          </Link>
        </div>

        <nav className="space-y-[3px]">
          {!collapsed && (
            <div className="mb-3 px-3 text-[8px] font-medium uppercase tracking-[0.19em] text-white/22">
              Navegación
            </div>
          )}

          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={[
                  "group relative flex h-[43px] items-center rounded-[10px]",
                  "transition-all duration-200",
                  collapsed ? "justify-center" : "gap-3 px-3",
                  active
                    ? "bg-white/[0.048] text-white"
                    : "text-white/43 hover:bg-white/[0.028] hover:text-white/78",
                ].join(" ")}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-[18px] w-[2px] -translate-y-1/2 rounded-full bg-[#ff6a18]" />
                )}

                <Icon
                  size={17}
                  strokeWidth={active ? 1.75 : 1.5}
                  className={
                    active
                      ? "text-[#ff6a18]"
                      : "text-white/32 group-hover:text-white/58"
                  }
                />

                {!collapsed && (
                  <span
                    className="text-[13px] font-medium tracking-[-0.018em]"
                    style={{ fontFamily: "var(--font-barberos-ui, Inter, sans-serif)" }}
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className={[
              "flex h-[40px] w-full items-center rounded-[10px] text-white/25 transition",
              "hover:bg-white/[0.03] hover:text-white/60",
              collapsed ? "justify-center" : "gap-3 px-3",
            ].join(" ")}
            aria-label={collapsed ? "Expandir navegación" : "Ocultar navegación"}
          >
            {collapsed ? (
              <ChevronRight size={16} strokeWidth={1.5} />
            ) : (
              <>
                <ChevronLeft size={16} strokeWidth={1.5} />
                <span
                  className="text-[10px] font-medium"
                  style={{ fontFamily: "var(--font-barberos-ui, Inter, sans-serif)" }}
                >
                  Ocultar navegación
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
