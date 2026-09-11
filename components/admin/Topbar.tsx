"use client";

import { Bell, Search, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

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

export default function Topbar() {
  const pathname = usePathname();

  const exact = titles[pathname];
  const title =
    exact ||
    Object.entries(titles).find(
      ([href]) => href !== "/admin" && pathname.startsWith(`${href}/`)
    )?.[1] ||
    "Dashboard";

  return (
    <header className="fixed inset-x-0 top-0 z-30 h-[78px] bg-[#070707]">
      <div className="flex h-full items-center pl-[294px] pr-7">
        <div className="flex min-w-[210px] items-center gap-3">
          <span className="display text-[9px] font-bold uppercase tracking-[0.15em] text-white/22">
            BARBEROS
          </span>
          <span className="h-3 w-px bg-white/[0.10]" />
          <span className="display text-[16px] font-semibold leading-none tracking-[-0.055em] text-white/82">
            {title}
          </span>
        </div>

        <div className="mx-auto w-full max-w-[520px]">
          <button
            type="button"
            className="group flex h-[44px] w-full items-center gap-3 rounded-[14px] border border-white/[0.075] bg-white/[0.028] px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.018)] transition hover:border-white/[0.13] hover:bg-white/[0.04]"
          >
            <Search size={16} strokeWidth={1.7} className="text-white/34 transition group-hover:text-white/55" />
            <span className="display text-[13px] font-medium tracking-[-0.025em] text-white/34">
              Buscar en barberOS...
            </span>
            <span className="ml-auto rounded-[7px] border border-white/[0.07] bg-white/[0.025] px-2 py-1 font-mono text-[9px] font-medium text-white/28">
              ⌘ K
            </span>
          </button>
        </div>

        <div className="ml-auto flex min-w-[250px] items-center justify-end gap-2">
          <button
            type="button"
            aria-label="Asistente"
            className="grid h-10 w-10 place-items-center rounded-[12px] text-white/42 transition hover:bg-white/[0.04] hover:text-[#ff6a18]"
          >
            <Sparkles size={17} strokeWidth={1.7} />
          </button>

          <button
            type="button"
            aria-label="Notificaciones"
            className="relative grid h-10 w-10 place-items-center rounded-[12px] text-white/42 transition hover:bg-white/[0.04] hover:text-white"
          >
            <Bell size={17} strokeWidth={1.7} />
            <span className="absolute right-[9px] top-[8px] h-[5px] w-[5px] rounded-full bg-[#ff6a18]" />
          </button>

          <div className="ml-2 flex items-center gap-3">
            <div className="relative grid h-9 w-9 place-items-center rounded-full bg-white/[0.075] text-[10px] font-bold text-white/78">
              MC
              <span className="absolute bottom-0 right-0 h-[8px] w-[8px] rounded-full border-2 border-[#070707] bg-[#63c174]" />
            </div>
            <div className="hidden xl:block">
              <div className="display text-[12px] font-semibold leading-none tracking-[-0.03em] text-white/82">
                Manuel Cladera
              </div>
              <div className="display mt-1.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white/27">
                Administrador
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
