"use client";

import { createContext, useContext, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

type AdminShellContextValue = {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  toggleSidebar: () => void;
};

const AdminShellContext = createContext<AdminShellContextValue | null>(null);

export function useAdminShell() {
  const context = useContext(AdminShellContext);
  if (!context) throw new Error("useAdminShell must be used inside AdminShell");
  return context;
}

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const value = useMemo(
    () => ({
      collapsed,
      setCollapsed,
      toggleSidebar: () => setCollapsed((current) => !current),
    }),
    [collapsed]
  );

  return (
    <AdminShellContext.Provider value={value}>
      <div className="barberos-app-shell min-h-screen bg-[#070707] text-[#F5F5F4]">
        <Sidebar />

        <div
          className={[
            "min-h-screen transition-[padding] duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
            collapsed ? "lg:pl-[76px]" : "lg:pl-[248px]",
          ].join(" ")}
        >
          <Topbar />
          <main className="min-h-[calc(100vh-72px)]">{children}</main>
        </div>
      </div>
    </AdminShellContext.Provider>
  );
}
