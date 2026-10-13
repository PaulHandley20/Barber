-- =====================================================================
-- 08 · SEGURIDAD: TABLAS DE BACKUP Y POLÍTICAS SOLO PARA ADMINS
-- =====================================================================
-- 1) Las tablas de backup (backup_* y migration_backup_*) estaban SIN
--    RLS. En Supabase eso significa que cualquiera con la clave pública
--    de la web podía leerlas (incluyen nombres y teléfonos de clientes).
--    Se activa RLS sin políticas (nadie las ve desde la web ni el panel;
--    siguen disponibles en el SQL Editor) y se quitan los permisos.
--
-- 2) Las políticas actuales dejan hacer TODO a cualquier usuario
--    autenticado. Se cambian para que exijan public.is_admin().
--    Mientras admin_users esté vacía, is_admin() se comporta igual que
--    antes (cualquier usuario autenticado), así que nada se rompe. Al
--    registrar a Manu en admin_users, solo él tiene acceso.
-- =====================================================================

do $$
declare
  r record;
begin
  -- 1) Backups
  for r in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and (c.relname like 'backup\_%' or c.relname like 'migration\_backup\_%')
  loop
    execute format('alter table public.%I enable row level security', r.relname);
    execute format('revoke all on table public.%I from anon, authenticated', r.relname);
  end loop;

  -- 2) Políticas "true" para authenticated → is_admin()
  for r in
    select tablename, policyname, cmd
      from pg_policies
     where schemaname = 'public'
       and roles = array['authenticated']::name[]
       and (qual = 'true' or with_check = 'true')
  loop
    if r.cmd = 'INSERT' then
      execute format(
        'alter policy %I on public.%I with check (public.is_admin())',
        r.policyname, r.tablename
      );
    elsif r.cmd in ('SELECT', 'DELETE') then
      execute format(
        'alter policy %I on public.%I using (public.is_admin())',
        r.policyname, r.tablename
      );
    else
      execute format(
        'alter policy %I on public.%I using (public.is_admin()) with check (public.is_admin())',
        r.policyname, r.tablename
      );
    end if;
  end loop;
end;
$$;

-- 3) appointments no tenía política de INSERT: crear un turno desde
--    Admin → Agenda fallaba. Se agrega, solo para admins.
drop policy if exists "appointments_insert_admin" on public.appointments;
create policy "appointments_insert_admin"
  on public.appointments
  for insert
  to authenticated
  with check (public.is_admin());
