"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { manrope as navFont } from "@/components/admin/fonts";
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

// Fuente redondeada solo para los labels de navegación.

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
  const { collapsed: collapsedSetting, toggleSidebar, mobileOpen, setMobileOpen } = useAdminShell();
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  // En celular el menú siempre se muestra completo (nunca contraído).
  const collapsed = isDesktop && collapsedSetting;

  // Al navegar, el cajón se cierra solo.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen, setMobileOpen]);

  return (
    <>
    {/* Fondo oscuro detrás del cajón en celular/tablet */}
    <div
      aria-hidden="true"
      onClick={() => setMobileOpen(false)}
      className={[
        "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
        mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
    />

    <aside
      aria-label="Menú del panel"
      className={[
        "fixed left-0 top-0 z-50 h-[100dvh] border-r border-white/[0.06] lg:z-40 lg:border-r-0",
        "transition-[width,transform] duration-300 ease-out",
        collapsed ? "w-[76px]" : "w-[264px] lg:w-[240px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      ].join(" ")}
    >
      {/* =========================================================
          BACKGROUND
      ========================================================= */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* En compu el menú no tiene fondo ni línea divisoria: queda
            integrado al fondo del panel. En celular (menú desplegable)
            sí lleva fondo para leerse sobre el contenido. */}
        <div className="absolute inset-0 bg-[#0a0b0d]/95 backdrop-blur-xl lg:hidden" />
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
            "flex-1 pt-4",
            collapsed ? "px-2" : "px-3",
          ].join(" ")}
        >
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
                        navFont.className,
                        "text-[13px] font-semibold tracking-[-0.008em]",
                        "transition-colors duration-200",
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
            onClick={() => (isDesktop ? toggleSidebar() : setMobileOpen(false))}
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
                Ocultar
              </span>
            )}
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}