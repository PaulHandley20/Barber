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
  Clock3,
  Gift,
  LayoutDashboard,
  Settings2,
  Sparkles,
  Users,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { useAdminShell } from "./AdminShell";

const navItems = [
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
      className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-[#070707] ${
        collapsed ? "w-[88px]" : "w-[270px]"
      }`}
      style={{ transition: "width 260ms cubic-bezier(.22,.61,.36,1)" }}
    >
      <div className="flex h-full flex-col px-4 py-5">
        <div className={`mb-8 flex items-center ${collapsed ? "justify-center" : "justify-between px-2"}`}>
          <Link href="/admin" className="group flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-[11px]">
              <Image
                src="/brand/barberos-mark.png"
                alt="barberOS"
                fill
                className="object-contain"
              />
            </div>
            {!collapsed && (
              <div>
                <div className="display text-[21px] font-semibold leading-none tracking-[-0.065em] text-white">
                  barber<span className="text-[#ff6a18]">OS</span>
                </div>
                <div className="display mt-1.5 text-[8px] font-semibold uppercase tracking-[0.13em] text-white/35">
                  Business platform
                </div>
              </div>
            )}
          </Link>

          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Contraer menú"
              className="grid h-8 w-8 place-items-center rounded-lg text-white/35 transition hover:bg-white/[0.045] hover:text-white"
            >
              <ChevronLeft size={15} strokeWidth={1.8} />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            aria-label="Expandir menú"
            className="mx-auto mb-7 grid h-8 w-8 place-items-center rounded-lg text-white/35 transition hover:bg-white/[0.045] hover:text-white"
          >
            <ChevronRight size={15} strokeWidth={1.8} />
          </button>
        )}

        <div className={`${collapsed ? "" : "px-1"} mb-3`}>
          {!collapsed && (
            <div className="display px-3 text-[8px] font-bold uppercase tracking-[0.18em] text-white/25">
              Workspace
            </div>
          )}
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
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
                className={`group relative flex h-[46px] items-center rounded-[13px] transition-all duration-200 ${
                  collapsed ? "justify-center" : "gap-3 px-3"
                } ${
                  active
                    ? "bg-white/[0.055] text-white"
                    : "text-white/47 hover:bg-white/[0.032] hover:text-white/82"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[#ff6a18]" />
                )}

                <Icon
                  size={18}
                  strokeWidth={active ? 2 : 1.65}
                  className={active ? "text-[#ff6a18]" : "text-white/38 group-hover:text-white/65"}
                />

                {!collapsed && (
                  <span className="display text-[14px] font-semibold leading-none tracking-[-0.045em]">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          {!collapsed && (
            <div className="mb-4 rounded-[15px] bg-white/[0.025] px-3.5 py-3">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-[#ff6a18]" />
                <span className="display text-[10px] font-semibold text-white/65">
                  Workspace activo
                </span>
              </div>
              <div className="display mt-1 text-[13px] font-semibold tracking-[-0.035em] text-white/90">
                Don Segundo
              </div>
            </div>
          )}

          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3 px-2"}`}>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/[0.075] text-[11px] font-bold text-white/80">
              MC
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <div className="display truncate text-[13px] font-semibold tracking-[-0.035em] text-white/86">
                  Manuel Cladera
                </div>
                <div className="display mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/30">
                  Administrador
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
