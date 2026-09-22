"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Manrope,
  Plus_Jakarta_Sans,
  Sora,
} from "next/font/google";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import {
  AdminShellProvider,
  useAdminShell,
} from "./AdminShellContext";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-barberos-ui",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-barberos-nav",
  weight: ["400", "500", "600", "700"],
});

const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-barberos-display",
});

const NOISE_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMjAnIGhlaWdodD0nMTIwJz48ZmlsdGVyIGlkPSduJz48ZmVUdXJidWxlbmNlIHR5cGU9J2ZyYWN0YWxOb2lzZScgYmFzZUZyZXF1ZW5jeT0nMC44NScgbnVtT2N0YXZlcz0nMicgc3RpdGNoVGlsZXM9J3N0aXRjaCcvPjxmZUNvbG9yTWF0cml4IHR5cGU9J3NhdHVyYXRlJyB2YWx1ZXM9JzAnLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWx0ZXI9J3VybCglMjNuKScvPjwvc3ZnPg==";

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

  return (
    <div
      className={[
        manrope.variable,
        plusJakarta.variable,
        sora.variable,
        "min-h-screen overflow-x-hidden bg-[#050505] text-white",
      ].join(" ")}
    >
      {/* ===================================================== */}
      {/* GLOBAL BACKGROUND                                    */}
      {/* ===================================================== */}

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[#050505]" />

        <div
          className="
            absolute
            -right-[10vw]
            -top-[18vh]
            h-[90vh]
            w-[90vh]
            rounded-full
            bg-[radial-gradient(circle,rgba(255,94,0,0.14)_0%,rgba(255,94,0,0.08)_22%,rgba(255,90,0,0.035)_44%,rgba(255,90,0,0.012)_62%,transparent_78%)]
          "
        />

        <div
          className="
            absolute
            -left-[16vw]
            top-[16vh]
            h-[64vh]
            w-[64vh]
            rounded-full
            bg-[radial-gradient(circle,rgba(255,90,0,0.045)_0%,rgba(255,90,0,0.022)_32%,transparent_74%)]
          "
        />

        <div
          className="
            absolute
            -bottom-[26vh]
            -left-[12vw]
            h-[66vh]
            w-[66vh]
            rounded-full
            bg-[radial-gradient(circle,rgba(255,90,0,0.035)_0%,rgba(255,90,0,0.015)_38%,transparent_75%)]
          "
        />

        <div
          className="
            absolute
            -bottom-[28vh]
            -right-[10vw]
            h-[70vh]
            w-[70vh]
            rounded-full
            bg-[radial-gradient(circle,rgba(255,90,0,0.06)_0%,rgba(255,90,0,0.028)_30%,rgba(255,90,0,0.01)_52%,transparent_74%)]
          "
        />

        <div
          className="
            absolute
            inset-0
            bg-[radial-gradient(ellipse_at_center,transparent_38%,rgba(0,0,0,0.34)_100%)]
          "
        />

        <div
          className="absolute inset-0 opacity-[0.028] mix-blend-overlay"
          style={{
            backgroundImage: `url("${NOISE_URL}")`,
            backgroundSize: "120px 120px",
          }}
        />
      </div>

      {/* ===================================================== */}
      {/* APP CHROME                                            */}
      {/* ===================================================== */}

      <Sidebar />
      <Topbar />

      <main
        className={[
          "relative z-10 min-h-screen pl-0 pt-[72px]",
          "transition-[padding-left] duration-300 ease-out",
          collapsed
            ? "lg:pl-[72px]"
            : "lg:pl-[230px]",
        ].join(" ")}
      >
        <div className="relative min-h-[calc(100vh-72px)]">
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