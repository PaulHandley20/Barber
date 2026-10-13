/*
  Lista blanca de administradores del panel.

  ADMIN_EMAILS es una variable de entorno SOLO de servidor (sin el
  prefijo NEXT_PUBLIC_), con uno o más emails separados por coma:

    ADMIN_EMAILS=manu@gmail.com,otro@gmail.com

  Si está vacía, cualquier usuario autenticado en Supabase entra al
  panel (comportamiento anterior). En producción tiene que estar
  configurada y, además, hay que desactivar el registro público de
  usuarios en Supabase (Authentication → Sign In / Providers →
  "Allow new users to sign up" = OFF).
*/

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdmin(email: string | null | undefined) {
  const allowed = getAdminEmails();

  if (allowed.length === 0) return true;
  if (!email) return false;

  return allowed.includes(email.trim().toLowerCase());
}
