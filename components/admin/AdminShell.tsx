"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { adminFontVariables } from "./fonts";
import "./admin.css";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import AdminBackdrop from "./AdminBackdrop";
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
        "bg-[#08090a] text-white",
        "font-[family:var(--font-barberos-ui)]",
      ].join(" ")}
      style={
        {
          "--admin-sidebar-width": sidebarWidth,
        } as React.CSSProperties
      }
    >
      <AdminBackdrop />

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