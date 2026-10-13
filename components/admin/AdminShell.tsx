"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { adminFontVariables } from "./fonts";
import "./admin.css";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { AdminShellProvider, useAdminShell } from "./AdminShellContext";


/*
 * Rutas que no utilizan el chrome del Admin.
 */
const CHROMELESS_ROUTES = ["/admin/login"];

function AdminShellInner({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { collapsed } = useAdminShell();

  if (CHROMELESS_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  const sidebarWidth = collapsed ? "72px" : "230px";

  return (
    <div
      className={[
        adminFontVariables,
        "admin-shell",
        "relative min-h-screen overflow-x-hidden",
        "bg-[#050505] text-white",
        "font-[family:var(--font-barberos-ui)]",
      ].join(" ")}
      style={
        {
          "--admin-sidebar-width": sidebarWidth,
        } as React.CSSProperties
      }
    >
      {/* ========================================================= */}
      {/* GLOBAL BACKGROUND                                        */}
      {/* ========================================================= */}
      {/*
       * Importante:
       *
       * Acá eliminamos:
       * - blur
       * - noise
       * - enormes círculos desenfocados
       * - filtros
       *
       * El fondo ahora se construye únicamente con gradients CSS.
       * Esto evita el aspecto "pixelado / borroso" y mantiene
       * los bordes visuales mucho más limpios.
       */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        {/* Base */}
        <div className="absolute inset-0 bg-[#050505]" />

        {/* Luz naranja principal */}
        <div
          className="
            absolute
            right-[-10vw]
            top-[-22vh]
            h-[72vh]
            w-[72vw]
            max-w-[1100px]
            min-w-[620px]
            bg-[radial-gradient(ellipse_at_center,rgba(255,92,0,0.105)_0%,rgba(255,92,0,0.052)_28%,rgba(255,92,0,0.018)_48%,transparent_72%)]
          "
        />

        {/* Luz secundaria muy tenue */}
        <div
          className="
            absolute
            left-[-20vw]
            top-[22vh]
            h-[58vh]
            w-[58vw]
            max-w-[850px]
            min-w-[520px]
            bg-[radial-gradient(ellipse_at_center,rgba(255,90,0,0.032)_0%,rgba(255,90,0,0.012)_38%,transparent_70%)]
          "
        />

        {/* Luz inferior derecha */}
        <div
          className="
            absolute
            bottom-[-28vh]
            right-[-12vw]
            h-[62vh]
            w-[62vw]
            max-w-[900px]
            min-w-[520px]
            bg-[radial-gradient(ellipse_at_center,rgba(255,90,0,0.038)_0%,rgba(255,90,0,0.012)_42%,transparent_72%)]
          "
        />

        {/* Micro glow superior central */}
        <div
          className="
            absolute
            left-[42%]
            top-0
            h-[420px]
            w-[620px]
            -translate-x-1/2
            bg-[radial-gradient(ellipse_at_top,rgba(255,90,0,0.025)_0%,transparent_70%)]
          "
        />

        {/* Vignette limpia, sin blur */}
        <div
          className="
            absolute
            inset-0
            bg-[radial-gradient(ellipse_at_center,transparent_28%,rgba(0,0,0,0.34)_100%)]
          "
        />

        {/* Línea de luz extremadamente sutil */}
        <div
          className="
            absolute
            left-[var(--admin-sidebar-width)]
            right-0
            top-0
            h-px
            bg-gradient-to-r
            from-transparent
            via-white/[0.025]
            to-transparent
          "
        />
      </div>

      {/* ========================================================= */}
      {/* APPLICATION                                              */}
      {/* ========================================================= */}

      <Sidebar />
      <Topbar />

      <main
        className={[
          "relative min-h-screen pt-[64px] lg:pt-[76px]",
          "pl-0",
          "transition-[padding-left] duration-300 ease-out",
          collapsed
            ? "lg:pl-[72px]"
            : "lg:pl-[230px]",
        ].join(" ")}
      >
        <div className="relative min-h-[calc(100vh-76px)] w-full">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function AdminShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AdminShellProvider>
      <AdminShellInner>{children}</AdminShellInner>
    </AdminShellProvider>
  );
}