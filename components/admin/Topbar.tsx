"use client";

import { Bell, ChevronDown, Search, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAdminShell } from "./AdminShell";

const titles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/turnos": "Agenda",
  "/admin/clientes": "Clientes",
  "/admin/equipo": "Equipo",
  "/admin/servicios": "Servicios",
  "/admin/fidelizacion": "Fidelización",
  "/admin/referidos": "Referidos",
  "/admin/analytics": "Analytics",
  "/admin/configuracion": "Configuración",
};

function getTitle(pathname: string) {
  if (titles[pathname]) return titles[pathname];
  const match = Object.entries(titles).find(
    ([href]) => href !== "/admin" && pathname.startsWith(`${href}/`)
  );
  return match?.[1] ?? "Dashboard";
}

export default function Topbar() {
  const pathname = usePathname();
  const { collapsed } = useAdminShell();
  const title = getTitle(pathname);

  return (
    <header
      className={[
        "fixed inset-x-0 top-0 z-30 h-[76px] bg-[#070707]",
        "transition-[padding-left] duration-300 ease-[cubic-bezier(.22,.61,.36,1)]",
        collapsed ? "lg:pl-[82px]" : "lg:pl-[248px]",
      ].join(" ")}
    >
      <div className="flex h-full items-center px-6 lg:px-8">
        <div className="flex min-w-[170px] items-center">
          <span
            className="text-[18px] font-medium leading-none tracking-[-0.045em] text-white/88"
            style={{ fontFamily: "var(--font-barberos-display, Inter, sans-serif)" }}
          >
            {title}
          </span>
        </div>

        <div className="mx-auto flex flex-1 justify-center px-8">
          <button
            type="button"
            className="group flex h-[40px] w-full max-w-[460px] items-center gap-3 rounded-[11px] bg-white/[0.028] px-3.5 text-left transition hover:bg-white/[0.045]"
          >
            <Search
              size={15}
              strokeWidth={1.5}
              className="text-white/28 transition group-hover:text-white/48"
            />
            <span
              className="flex-1 text-[12px] font-normal tracking-[-0.01em] text-white/30"
              style={{ fontFamily: "var(--font-barberos-ui, Inter, sans-serif)" }}
            >
              Buscar en barberOS
            </span>
            <span className="font-mono text-[8px] font-medium text-white/22">
              ⌘K
            </span>
          </button>
        </div>

        <div className="flex min-w-[245px] items-center justify-end gap-1">
          <button
            type="button"
            aria-label="Asistente"
            className="grid h-9 w-9 place-items-center rounded-[10px] text-white/32 transition hover:bg-white/[0.035] hover:text-[#ff6a18]"
          >
            <Sparkles size={16} strokeWidth={1.5} />
          </button>

          <button
            type="button"
            aria-label="Notificaciones"
            className="relative grid h-9 w-9 place-items-center rounded-[10px] text-white/32 transition hover:bg-white/[0.035] hover:text-white/70"
          >
            <Bell size={16} strokeWidth={1.5} />
            <span className="absolute right-[8px] top-[7px] h-[4px] w-[4px] rounded-full bg-[#ff6a18]" />
          </button>

          {/* Owner identity: deliberately compact so it belongs to the application chrome,
              rather than looking like a separate profile card. */}
          <button
            type="button"
            className="ml-2 flex h-[44px] items-center gap-2.5 rounded-[11px] px-2 transition hover:bg-white/[0.035]"
          >
            <div className="relative grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-white/[0.085] text-[9px] font-semibold text-white/72">
              MC
              <span className="absolute bottom-0 right-0 h-[7px] w-[7px] rounded-full border-[1.5px] border-[#070707] bg-[#65c278]" />
            </div>

            <div className="hidden text-left sm:block">
              <div
                className="text-[11px] font-medium leading-none tracking-[-0.015em] text-white/78"
                style={{ fontFamily: "var(--font-barberos-ui, Inter, sans-serif)" }}
              >
                Manuel Cladera
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[9px] font-normal leading-none text-white/30">
                <span>Don Segundo</span>
                <span className="text-white/15">·</span>
                <span>Admin</span>
              </div>
            </div>

            <ChevronDown
              size={13}
              strokeWidth={1.4}
              className="hidden text-white/22 sm:block"
            />
          </button>
        </div>
      </div>
    </header>
  );
}
