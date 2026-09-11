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
      <div className="barberos-dashboard min-h-screen bg-[#070707] text-white">
        <Sidebar />
        <Topbar />

        <main
          className="min-h-screen pt-[78px]"
          style={{
            paddingLeft: collapsed ? 88 : 270,
            transition: "padding-left 260ms cubic-bezier(.22,.61,.36,1)",
          }}
        >
          <div className="min-h-[calc(100vh-78px)] bg-[#070707]">
            {children}
          </div>
        </main>
      </div>
    </AdminShellContext.Provider>
  );
}
