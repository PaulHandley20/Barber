-- DON SEGUNDO · DIAGNÓSTICO DEL PANEL (solo lectura)
-- Pegar en SQL Editor → New query → Run y copiar la celda "diagnostico".
select jsonb_pretty(jsonb_build_object(
  'columnas', (
    select jsonb_object_agg(table_name, cols) from (
      select table_name, jsonb_agg(column_name || ' ' || data_type || case when is_nullable = 'NO' then ' NOT NULL' else '' end || coalesce(' = ' || column_default, '') order by ordinal_position) cols
        from information_schema.columns
       where table_schema = 'public' and table_name not like '%backup%'
       group by table_name) t),
  'restricciones', (
    select jsonb_agg(conrelid::regclass::text || ': ' || pg_get_constraintdef(oid) order by conrelid::regclass::text)
      from pg_constraint
     where connamespace = 'public'::regnamespace and contype in ('u', 'c', 'x', 'f')
       and conrelid::regclass::text not like '%backup%'),
  'funciones_trigger', (
    select jsonb_object_agg(p.proname, pg_get_functiondef(p.oid))
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname in ('award_loyalty_points_for_completed_appointment', 'create_appointment')),
  'storage_buckets', (select jsonb_agg(jsonb_build_object('id', id, 'public', public)) from storage.buckets),
  'storage_politicas', (select jsonb_agg(policyname || ' [' || cmd || '] ' || coalesce(qual, '') || ' ' || coalesce(with_check, '')) from pg_policies where schemaname = 'storage'),
  'admins', (select count(*) from public.admin_users)
)) as diagnostico;
