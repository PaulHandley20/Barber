"use client";

import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { AdminShellProvider, useAdminShell } from "./AdminShellContext";

export default function AdminShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AdminShellProvider>
      <AdminShellContent>{children}</AdminShellContent>
    </AdminShellProvider>
  );
}

function AdminShellContent({
  children,
}: {
  children: ReactNode;
}) {
  const { collapsed } = useAdminShell();

  return (
    <div className="admin-shell relative min-h-screen overflow-x-hidden bg-[#070707] text-white">
      {/* ===================================================== */}
      {/* FONDO GLOBAL                                         */}
      {/* ===================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        {/* Base */}
        <div className="absolute inset-0 bg-[#070707]" />

        {/* Luz naranja superior derecha */}
        <div
          className="
            absolute
            -right-[220px]
            -top-[280px]
            h-[720px]
            w-[720px]
            rounded-full
            bg-[radial-gradient(circle,rgba(255,90,0,0.12)_0%,rgba(255,90,0,0.055)_32%,rgba(255,90,0,0.015)_52%,transparent_72%)]
            blur-[18px]
          "
        />

        {/* Luz naranja izquierda, mucho más suave */}
        <div
          className="
            absolute
            -left-[360px]
            top-[28%]
            h-[620px]
            w-[620px]
            rounded-full
            bg-[radial-gradient(circle,rgba(255,90,0,0.045)_0%,rgba(255,90,0,0.015)_42%,transparent_70%)]
            blur-[28px]
          "
        />

        {/* Luz inferior derecha */}
        <div
          className="
            absolute
            -bottom-[360px]
            -right-[180px]
            h-[700px]
            w-[700px]
            rounded-full
            bg-[radial-gradient(circle,rgba(255,90,0,0.05)_0%,rgba(255,90,0,0.015)_42%,transparent_72%)]
            blur-[30px]
          "
        />

        {/* ================================================= */}
        {/* CURVAS DECORATIVAS                                 */}
        {/* ================================================= */}

        <div
          className="
            absolute
            -right-[300px]
            top-[40px]
            h-[720px]
            w-[900px]
            rotate-[-18deg]
            rounded-[50%]
            border
            border-white/[0.025]
          "
        />

        <div
          className="
            absolute
            -right-[260px]
            top-[65px]
            h-[650px]
            w-[830px]
            rotate-[-18deg]
            rounded-[50%]
            border
            border-[#ff5a00]/[0.055]
          "
        />

        <div
          className="
            absolute
            -left-[350px]
            bottom-[80px]
            h-[500px]
            w-[700px]
            rotate-[14deg]
            rounded-[50%]
            border
            border-[#ff5a00]/[0.035]
          "
        />

        {/* ================================================= */}
        {/* TEXTURA MUY SUTIL                                 */}
        {/* ================================================= */}

        <div
          className="
            absolute
            inset-0
            opacity-[0.22]
            bg-[linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)]
            bg-[size:80px_80px]
            [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_75%)]
          "
        />

        {/* ================================================= */}
        {/* VIÑETA                                            */}
        {/* ================================================= */}

        <div
          className="
            absolute
            inset-0
            bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.38)_100%)]
          "
        />

        {/* Fade superior */}
        <div
          className="
            absolute
            inset-x-0
            top-0
            h-[180px]
            bg-gradient-to-b
            from-black/25
            to-transparent
          "
        />

        {/* Fade inferior */}
        <div
          className="
            absolute
            inset-x-0
            bottom-0
            h-[180px]
            bg-gradient-to-t
            from-black/30
            to-transparent
          "
        />
      </div>

      {/* ===================================================== */}
      {/* SIDEBAR                                              */}
      {/* ===================================================== */}

      <div className="relative z-40">
        <Sidebar />
      </div>

      {/* ===================================================== */}
      {/* TOPBAR                                               */}
      {/* ===================================================== */}

      <div className="relative z-30">
        <Topbar />
      </div>

      {/* ===================================================== */}
      {/* CONTENIDO                                            */}
      {/* ===================================================== */}

      <div
        className={`
          relative
          z-10
          min-h-screen
          transition-[padding-left]
          duration-300
          ease-out
          ${collapsed ? "lg:pl-[78px]" : "lg:pl-[228px]"}
        `}
      >
        <main className="min-h-screen pt-[76px]">
          {children}
        </main>
      </div>
    </div>
  );
}