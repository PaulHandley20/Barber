"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AdminShellContextValue = {
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
  toggleSidebar: () => void;
};

const AdminShellContext =
  createContext<AdminShellContextValue | null>(null);

export function AdminShellProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const value = useMemo(
    () => ({
      collapsed,
      setCollapsed,
      toggleSidebar: () => {
        setCollapsed((current) => !current);
      },
    }),
    [collapsed]
  );

  return (
    <AdminShellContext.Provider value={value}>
      {children}
    </AdminShellContext.Provider>
  );
}

export function useAdminShell() {
  const context = useContext(AdminShellContext);

  if (!context) {
    throw new Error(
      "useAdminShell must be used inside AdminShellProvider"
    );
  }

  return context;
}