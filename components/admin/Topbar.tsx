"use client";

import { Bell, Command, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

const pageTitles: Record<string, string> = {
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

function resolveTitle(pathname: string) {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.keys(pageTitles)
    .filter((path) => path !== "/admin" && pathname.startsWith(path))
    .sort((a, b) => b.length - a.length)[0];
  return match ? pageTitles[match] : "Workspace";
}

export default function Topbar() {
  const pathname = usePathname();
  const title = useMemo(() => resolveTitle(pathname), [pathname]);

  return (
    <header className="sticky top-0 z-50 h-[72px] bg-[#070707]/92 backdrop-blur-2xl">
      <div className="relative flex h-full items-center px-5 sm:px-7 lg:px-9">
        {/* Current location */}
        <div className="hidden min-w-[180px] items-center gap-2 md:flex">
          <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-white/25">
            barberOS
          </span>
          <span className="text-white/15">/</span>
          <span className="text-[11px] font-semibold tracking-[-0.015em] text-white/68">
            {title}
          </span>
        </div>

        {/* Search — truly centered in the application header */}
        <div className="absolute left-1/2 top-1/2 w-[min(440px,42vw)] -translate-x-1/2 -translate-y-1/2">
          <button
            type="button"
            className="group flex h-10 w-full items-center gap-3 rounded-[12px] bg-white/[0.035] px-3.5 text-left transition-all duration-200 hover:bg-white/[0.055]"
          >
            <Search
              size={14}
              strokeWidth={1.7}
              className="shrink-0 text-white/32 group-hover:text-white/52"
            />
            <span className="flex-1 text-[11px] font-medium text-white/34">
              Buscar en BarberOS...
            </span>
            <span className="hidden items-center gap-1 rounded-[7px] bg-white/[0.045] px-1.5 py-1 text-[8px] font-medium text-white/25 sm:inline-flex">
              <Command size={9} />
              K
            </span>
          </button>
        </div>

        {/* Right — only notifications + current user */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Notificaciones"
            className="relative flex h-10 w-10 items-center justify-center rounded-[11px] bg-white/[0.035] text-white/45 transition-all duration-200 hover:bg-white/[0.065] hover:text-white/75"
          >
            <Bell size={15} strokeWidth={1.7} />
            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[#FF5A00]" />
          </button>

          <button
            type="button"
            className="group flex h-10 items-center gap-2.5 rounded-[11px] px-1.5 transition-all duration-200 hover:bg-white/[0.04]"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-[9px] font-bold text-white/68 ring-1 ring-white/[0.07]">
              MC
            </div>
            <div className="hidden text-left lg:block">
              <p className="text-[11px] font-semibold tracking-[-0.015em] text-white/82">
                Manuel Cladera
              </p>
              <p className="mt-0.5 text-[7px] font-medium uppercase tracking-[0.15em] text-white/28">
                Administrador
              </p>
            </div>
            <span className="hidden h-1.5 w-1.5 rounded-full bg-[#20D68A] xl:block" />
          </button>
        </div>
      </div>
    </header>
  );
}
