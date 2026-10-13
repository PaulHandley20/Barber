-- =====================================================================
-- 10 · PERMISOS DE TABLA PARA EL PANEL (GRANT)
-- =====================================================================
-- Supabase controla el acceso en dos capas:
--   1) GRANT: si el rol puede tocar la tabla (insert/update/…).
--   2) RLS:   qué filas puede tocar (acá, solo si es admin).
-- Algunas tablas no tenían el GRANT para usuarios logueados (por eso
-- "Crear turno" daba "permission denied for table appointments").
-- Se otorgan los permisos a 'authenticated'; las políticas RLS con
-- is_admin() siguen decidiendo quién puede hacer qué.
-- A los visitantes (anon) NO se les da nada nuevo.
-- =====================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'appointments', 'customers', 'services', 'barbers',
    'barbershop_hours', 'barbershop_settings', 'barbershop_blocked_periods',
    'loyalty_accounts', 'loyalty_programs', 'loyalty_rewards',
    'loyalty_service_rules', 'loyalty_point_transactions',
    'consent_events', 'admin_users'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'grant select, insert, update, delete on table public.%I to authenticated',
        t
      );
    end if;
  end loop;
end;
$$;
