-- =====================================================================
-- DON SEGUNDO · DIAGNÓSTICO DE LA BASE (solo lectura, no modifica nada)
-- =====================================================================
-- Ejecutalo en Supabase → SQL Editor ANTES de aplicar las migraciones.
-- Guardá los resultados: sirven para revisar la seguridad y para
-- adaptar las funciones si hiciera falta.
-- =====================================================================

-- 1) Tablas públicas y si tienen RLS activado.
--    TODAS deberían tener rls_enabled = true.
select c.relname as tabla,
       c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;

-- 2) Políticas RLS existentes.
--    ALERTA si alguna política de customers, appointments,
--    loyalty_* o consent_events incluye el rol anon o public
--    con SELECT/UPDATE/DELETE: significaría que cualquier visitante
--    puede leer o modificar datos personales con la clave pública.
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

-- 3) Definición de las funciones que usa la web pública.
--    Revisá especialmente create_web_appointment: cómo busca al
--    cliente existente (¿por teléfono? ¿por email?) y qué actualiza.
select p.proname as funcion,
       p.prosecdef as security_definer,
       pg_get_functiondef(p.oid) as definicion
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_web_appointment',
    'get_available_slots',
    'get_reservation_by_code',
    'reschedule_reservation',
    'cancel_reservation'
  );

-- 4) Columnas de las tablas principales (para confirmar tipos).
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('customers', 'appointments', 'services',
                     'barbershop_settings', 'barbershop_hours')
order by table_name, ordinal_position;

-- 5) Clientes históricos sin email (los que necesitan el flujo seguro).
select count(*) filter (where email is null or trim(email) = '') as sin_email,
       count(*) as total
from public.customers
where deleted_at is null;

-- 6) Usuarios con acceso al panel (Authentication → Users).
--    Debería figurar SOLO la cuenta de Manu (y la tuya si corresponde).
select id, email, created_at, last_sign_in_at
from auth.users
order by created_at;
