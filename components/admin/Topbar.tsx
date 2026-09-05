"use client";

import {
  Bell,
  ChevronDown,
  Command,
  Search,
} from "lucide-react";
import { usePathname } from "next/navigation";

const pageNames: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/turnos": "Agenda",
  "/admin/clientes": "Clientes",
  "/admin/servicios": "Servicios",
  "/admin/equipo": "Equipo",
  "/admin/fidelizacion": "Fidelización",
  "/admin/referidos": "Referidos",
  "/admin/analytics": "Analytics",
  "/admin/horarios": "Horarios",
  "/admin/configuracion": "Configuración",
};

export default function Topbar() {
  const pathname = usePathname();

  const pageName =
    pageNames[pathname] ??
    Object.entries(pageNames).find(
      ([route]) =>
        route !== "/admin" &&
        pathname.startsWith(route)
    )?.[1] ??
    "BarberOS";

  return (
    <header className="sticky top-0 z-30 flex h-[64px] items-center border-b border-white/[0.06] bg-[#090a0b]/90 px-6 backdrop-blur-xl">
      {/* LEFT */}
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-[11px] text-white/25">
          Don Segundo
        </span>

        <span className="text-white/15">/</span>

        <span className="truncate text-[11px] text-white/55">
          {pageName}
        </span>
      </div>

      {/* RIGHT */}
      <div className="ml-auto flex items-center gap-2">
        {/* SEARCH */}
        <button
          type="button"
          className="hidden h-9 items-center gap-3 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-white/30 transition hover:border-white/[0.12] hover:bg-white/[0.045] hover:text-white/55 md:flex"
        >
          <Search
            size={14}
            strokeWidth={1.5}
          />

          <span className="text-[11px]">
            Buscar
          </span>

          <span className="ml-4 flex items-center gap-1 text-[9px] text-white/20">
            <Command
              size={10}
              strokeWidth={1.5}
            />
            K
          </span>
        </button>

        {/* NOTIFICATIONS */}
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-white/35 transition hover:border-white/[0.07] hover:bg-white/[0.035] hover:text-white/65"
          aria-label="Notificaciones"
        >
          <Bell
            size={15}
            strokeWidth={1.5}
          />

          <span className="absolute right-[9px] top-[8px] h-1.5 w-1.5 rounded-full bg-white" />
        </button>

        {/* USER */}
        <button
          type="button"
          className="ml-1 flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 transition hover:border-white/[0.07] hover:bg-white/[0.035]"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.09] text-[9px] font-medium text-white/65">
            MC
          </div>

          <div className="hidden text-left lg:block">
            <p className="text-[11px] leading-none text-white/65">
              Manuel Cladera
            </p>

            <p className="mt-1 text-[9px] leading-none text-white/25">
              Administrator
            </p>
          </div>

          <ChevronDown
            size={12}
            strokeWidth={1.5}
            className="text-white/25"
          />
        </button>
      </div>
    </header>
  );
}