import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { isAllowedAdmin } from "@/lib/admin-auth";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  if (!isAllowedAdmin(user.email)) {
    redirect("/admin/login?error=unauthorized");
  }

  return <AdminShell>{children}</AdminShell>;
}
