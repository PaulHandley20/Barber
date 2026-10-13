-- =====================================================================
-- DON SEGUNDO · DIAGNÓSTICO DE LA BASE (solo lectura, no modifica nada)
-- =====================================================================
-- Cómo usarlo:
--   1. Supabase → SQL Editor → "New query".
--   2. Pegar TODO este archivo y tocar "Run".
--   3. Aparece una sola fila con una columna "diagnostico".
--      Hacer clic en la celda, copiar el contenido y mandárselo a Claude.
--
-- No incluye datos de clientes: solo estructura, permisos, la definición
-- de las funciones y cantidades.
-- =====================================================================

select jsonb_pretty(jsonb_build_object(

  -- 1) Tablas y si tienen RLS activado (todas deberían estar en true).
  'tablas_rls', (
    select jsonb_object_agg(c.relname, c.relrowsecurity)
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
  ),

  -- 2) Políticas RLS. Alerta si customers/appointments/loyalty_* tienen
  --    políticas para anon o public con select/update/delete.
  'politicas', (
    select jsonb_agg(jsonb_build_object(
             'tabla', tablename,
             'politica', policyname,
             'roles', roles,
             'accion', cmd,
             'condicion', qual,
             'check', with_check
           ) order by tablename, cmd, policyname)
      from pg_policies
     where schemaname = 'public'
  ),

  -- 3) Definición de las funciones que usa la web pública.
  'funciones', (
    select jsonb_object_agg(
             p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
             jsonb_build_object(
               'security_definer', p.prosecdef,
               'definicion', pg_get_functiondef(p.oid)
             )
           )
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'create_web_appointment',
         'get_available_slots',
         'get_reservation_by_code',
         'reschedule_reservation',
         'cancel_reservation'
       )
  ),

  -- 4) Triggers existentes (por ejemplo, el que suma puntos).
  'triggers', (
    select jsonb_agg(jsonb_build_object(
             'tabla', event_object_table,
             'trigger', trigger_name,
             'evento', event_manipulation,
             'accion', action_statement
           ) order by event_object_table, trigger_name)
      from information_schema.triggers
     where trigger_schema = 'public'
  ),

  -- 5) Columnas de las tablas principales.
  'columnas', (
    select jsonb_object_agg(table_name, cols)
      from (
        select table_name,
               jsonb_agg(column_name || ' ' || data_type order by ordinal_position) as cols
          from information_schema.columns
         where table_schema = 'public'
           and table_name in ('customers', 'appointments', 'services',
                              'barbershop_settings', 'barbershop_hours',
                              'barbershop_blocked_periods')
         group by table_name
      ) t
  ),

  -- 6) Cantidades (sin datos personales).
  'cantidades', jsonb_build_object(
    'clientes_activos',   (select count(*) from public.customers where deleted_at is null),
    'clientes_sin_email', (select count(*) from public.customers
                            where deleted_at is null and (email is null or trim(email) = '')),
    'turnos',             (select count(*) from public.appointments),
    'usuarios_panel',     (select count(*) from auth.users)
  )

)) as diagnostico;
