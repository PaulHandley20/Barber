"use client";

import { createContext, useContext, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

type AdminShellContextValue = {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
};

const AdminShellContext = createContext<AdminShellContextValue | null>(null);

export function useAdminShell() {
  const context = useContext(AdminShellContext);
  if (!context) {
    throw new Error("useAdminShell must be used inside AdminShell");
  }
  return context;
}

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const value = useMemo(
    () => ({ collapsed, setCollapsed }),
    [collapsed]
  );

  return (
    <AdminShellContext.Provider value={value}>
      <div
        className="barberos-dashboard min-h-screen bg-[#070707] text-white"
        style={
          {
            "--font-barberos-ui":
              "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            "--font-barberos-display":
              "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          } as React.CSSProperties
        }
      >
        <Sidebar />
        <Topbar />

        <main
          className={[
            "min-h-screen bg-[#070707] pt-[76px]",
            "transition-[padding-left] duration-300 ease-[cubic-bezier(.22,.61,.36,1)]",
            collapsed ? "lg:pl-[82px]" : "lg:pl-[248px]",
          ].join(" ")}
        >
          <div className="min-h-[calc(100vh-76px)] bg-[#070707]">
            {children}
          </div>
        </main>
      </div>
    </AdminShellContext.Provider>
  );
}
