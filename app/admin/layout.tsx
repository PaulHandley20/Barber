"use client";

import Sidebar from "@/components/admin/Sidebar";
import Topbar from "@/components/admin/Topbar";
import { Sora, Manrope } from "next/font/google";
import { useState } from "react";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div
      className={`${sora.variable} ${manrope.variable} min-h-screen bg-[#08090b] text-white`}
      style={{
        fontFamily:
          "var(--font-manrope), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      <main
        className={[
          "min-h-screen transition-[padding-left] duration-300",
          "ease-[cubic-bezier(.22,1,.36,1)]",
          sidebarCollapsed ? "pl-[76px]" : "pl-[264px]",
        ].join(" ")}
      >
        <Topbar />

        <div className="min-h-[calc(100vh-64px)]">
          {children}
        </div>
      </main>
    </div>
  );
}