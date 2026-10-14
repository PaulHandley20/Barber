-- =========================================================
-- 11 · Notificaciones de reservas web
-- ---------------------------------------------------------
-- La campanita del panel avisa cuando un cliente reserva desde
-- la web. Para distinguir esos turnos de los cargados desde el
-- panel, cada turno nuevo guarda su origen en `source`:
--
--   'web'   → creado por create_web_appointment (landing)
--   'panel' → creado por un admin desde Agenda
--
-- Cómo se detecta: las reservas web entran por una función
-- SECURITY DEFINER, así que el usuario de la base que inserta
-- (current_user) es el dueño de la función y no el rol de la
-- petición (anon/authenticated). Un admin que crea un turno
-- desde el panel inserta directo como 'authenticated'.
--
-- Los turnos que ya existían quedan con source = null (no
-- generan notificaciones). Es idempotente: se puede volver a
-- correr sin problema.
-- =========================================================

alter table public.appointments
  add column if not exists source text;

create or replace function public.set_appointment_source()
returns trigger
language plpgsql
as $$
declare
  v_request_role text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
begin
  if new.source is null then
    if v_request_role in ('anon', 'authenticated')
       and current_user not in ('anon', 'authenticated') then
      new.source := 'web';
    else
      new.source := 'panel';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_set_appointment_source on public.appointments;

create trigger trg_set_appointment_source
  before insert on public.appointments
  for each row
  execute function public.set_appointment_source();

create index if not exists appointments_source_created_at_idx
  on public.appointments (source, created_at desc);

-- Tiempo real: el panel se entera al instante de cada reserva nueva.
-- (Solo los admins la reciben: Realtime respeta las políticas RLS.)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
         from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'appointments'
     ) then
    execute 'alter publication supabase_realtime add table public.appointments';
  end if;
end;
$$;
