-- =====================================================================
-- 01 · ACCESO DE ADMINISTRADORES
-- =====================================================================
-- Crea la lista de administradores y la función is_admin() que usan
-- las demás migraciones y que podés usar en tus políticas RLS.
--
-- Modo inicial: mientras admin_users esté vacía, cualquier usuario
-- autenticado se considera admin (igual que hoy). Apenas registres a
-- Manu (paso al final), solo él tendrá acceso.
-- =====================================================================

create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_self_read" on public.admin_users;
create policy "admin_users_self_read"
  on public.admin_users
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when not exists (select 1 from public.admin_users) then true
    else exists (select 1 from public.admin_users where user_id = auth.uid())
  end;
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- PASO MANUAL: registrar a Manu como admin (reemplazá el email).
-- ---------------------------------------------------------------------
-- insert into public.admin_users (user_id, email)
-- select id, email from auth.users where email = 'EMAIL_DE_MANU@gmail.com'
-- on conflict (user_id) do nothing;
--
-- ---------------------------------------------------------------------
-- RECOMENDADO: endurecer las políticas de las tablas privadas.
-- Primero mirá las políticas actuales con supabase/diagnostics.sql.
-- Ejemplo para customers (repetir para appointments, loyalty_*, etc.):
-- ---------------------------------------------------------------------
-- drop policy if exists "<nombre de la política actual>" on public.customers;
-- create policy "customers_admin_all" on public.customers
--   for all to authenticated
--   using (public.is_admin()) with check (public.is_admin());
