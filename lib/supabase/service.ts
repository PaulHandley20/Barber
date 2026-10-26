import { createClient } from "@supabase/supabase-js";

/*
  Cliente con la clave de servicio (service_role). SOLO para código de
  servidor (rutas /api): saltea las políticas RLS. Nunca importarlo desde
  un componente "use client".

  Variable de entorno (solo servidor, sin NEXT_PUBLIC_):
    SUPABASE_SERVICE_ROLE_KEY
*/
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
