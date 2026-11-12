-- =====================================================================
-- 14 · EMAILS AUTOMÁTICOS (CONFIRMACIÓN, CAMBIOS, CANCELACIÓN,
--      RECORDATORIO) Y GOOGLE CALENDAR
-- ---------------------------------------------------------------------
-- La base de datos anota lo que hay que avisar; el sitio (ruta
-- /api/notifications/process) lo envía por Gmail y lo sincroniza con el
-- calendario de la barbería.
--
-- 1) notification_jobs: "cola de envíos". Cada vez que se crea, cambia
--    o cancela un turno (desde la web, Mi reserva o la Agenda) un
--    trigger anota la tarea. Si un envío falla se reintenta.
-- 2) Recordatorios: no usan la cola. Cada pocos minutos se buscan los
--    turnos que empiezan dentro de "reminder_hours_before" horas y que
--    todavía no recibieron recordatorio (appointments.reminder_sent_at).
-- 3) Configuración nueva: horas de anticipación del recordatorio y
--    sincronización con Google Calendar.
--
-- Las funciones que usa el procesador solo las puede ejecutar la clave
-- de servicio (service_role), que vive únicamente en el servidor.
-- Se puede volver a correr sin problema.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Columnas
-- ---------------------------------------------------------------------
alter table public.barbershop_settings
  add column if not exists notifications_enabled boolean not null default true;

alter table public.barbershop_settings
  add column if not exists appointment_confirmation_enabled boolean not null default true;

alter table public.barbershop_settings
  add column if not exists appointment_reminder_enabled boolean not null default true;

alter table public.barbershop_settings
  add column if not exists reminder_hours_before integer not null default 24;

alter table public.barbershop_settings
  add column if not exists calendar_sync_enabled boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'barbershop_settings_reminder_hours_check'
  ) then
    alter table public.barbershop_settings
      add constraint barbershop_settings_reminder_hours_check
      check (reminder_hours_before between 1 and 72);
  end if;
end;
$$;

-- Momento en que se mandó el recordatorio (o en que se decidió que no
-- hacía falta: turnos reservados con menos anticipación que el
-- recordatorio ya reciben la confirmación).
alter table public.appointments
  add column if not exists reminder_sent_at timestamptz;

-- Los turnos que ya pasaron no tienen que recibir recordatorio.
update public.appointments
   set reminder_sent_at = now()
 where reminder_sent_at is null
   and start_at <= now();

-- ---------------------------------------------------------------------
-- Cola de envíos
-- ---------------------------------------------------------------------
create table if not exists public.notification_jobs (
  id             bigint generated always as identity primary key,
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  kind           text not null
                 check (kind in ('confirmation', 'updated', 'cancelled', 'calendar_sync')),
  status         text not null default 'pending'
                 check (status in ('pending', 'processing', 'sent', 'skipped', 'failed')),
  attempts       integer not null default 0,
  run_after      timestamptz not null default now(),
  locked_at      timestamptz,
  processed_at   timestamptz,
  detail         text,
  last_error     text,
  created_at     timestamptz not null default now()
);

create index if not exists notification_jobs_pending_idx
  on public.notification_jobs (status, run_after);

create index if not exists notification_jobs_appointment_idx
  on public.notification_jobs (appointment_id);

alter table public.notification_jobs enable row level security;

revoke all on table public.notification_jobs from anon;
revoke all on table public.notification_jobs from authenticated;
grant select on table public.notification_jobs to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on table public.notification_jobs to service_role;
  end if;
end;
$$;

-- El panel solo lee (para mostrar el estado de los envíos).
drop policy if exists "notification_jobs_admin_select" on public.notification_jobs;
create policy "notification_jobs_admin_select"
  on public.notification_jobs
  for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- Recordatorio: si el turno se crea o se mueve dentro de la ventana del
-- recordatorio, no se manda (alcanza con la confirmación o el aviso de
-- cambio). Si se mueve más adelante, se vuelve a programar.
-- ---------------------------------------------------------------------
create or replace function public.reset_appointment_reminder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hours integer;
begin
  if tg_op = 'UPDATE' and new.start_at is not distinct from old.start_at then
    return new;
  end if;

  select coalesce(reminder_hours_before, 24) into v_hours
    from public.barbershop_settings
   limit 1;

  if new.start_at <= now() + make_interval(hours => coalesce(v_hours, 24)) then
    new.reminder_sent_at := now();
  else
    new.reminder_sent_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_reset_appointment_reminder on public.appointments;
create trigger trg_reset_appointment_reminder
  before insert or update of start_at on public.appointments
  for each row
  execute function public.reset_appointment_reminder();

-- ---------------------------------------------------------------------
-- Anotar tareas cuando cambia un turno
-- ---------------------------------------------------------------------
create or replace function public.enqueue_appointment_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active     boolean := new.status::text in ('confirmed', 'pending');
  v_future     boolean := new.start_at > now();
  v_was_active boolean;
  v_cancelled  boolean := new.status::text in ('cancelled', 'canceled');
begin
  if tg_op = 'INSERT' then
    if v_active and v_future then
      insert into public.notification_jobs (appointment_id, kind)
      values (new.id, 'confirmation');
    end if;

    if not v_cancelled and new.end_at > now() then
      insert into public.notification_jobs (appointment_id, kind)
      values (new.id, 'calendar_sync');
    end if;

    return new;
  end if;

  v_was_active := old.status::text in ('confirmed', 'pending');

  -- Cancelado (antes estaba activo y todavía no pasó)
  if v_cancelled and v_was_active and new.start_at > now() then
    insert into public.notification_jobs (appointment_id, kind)
    values (new.id, 'cancelled');

  -- Reactivado (estaba cancelado o no asistió y vuelve a estar activo)
  elsif v_active and not v_was_active and v_future then
    insert into public.notification_jobs (appointment_id, kind)
    select new.id, 'confirmation'
     where not exists (
       select 1 from public.notification_jobs j
        where j.appointment_id = new.id
          and j.kind = 'confirmation'
          and j.status in ('pending', 'processing')
     );

  -- Cambió el día, la hora, el barbero o el servicio
  elsif v_active and v_future and (
          new.start_at   is distinct from old.start_at
       or new.barber_id  is distinct from old.barber_id
       or new.service_id is distinct from old.service_id
  ) then
    insert into public.notification_jobs (appointment_id, kind)
    select new.id, 'updated'
     where not exists (
       select 1 from public.notification_jobs j
        where j.appointment_id = new.id
          and j.kind in ('confirmation', 'updated')
          and j.status = 'pending'
     );
  end if;

  -- Calendario: cualquier cambio visible de un turno actual o futuro
  if (new.end_at > now() or old.end_at > now()) and (
          new.status::text is distinct from old.status::text
       or new.start_at    is distinct from old.start_at
       or new.end_at      is distinct from old.end_at
       or new.barber_id   is distinct from old.barber_id
       or new.service_id  is distinct from old.service_id
       or new.customer_id is distinct from old.customer_id
       or new.notes       is distinct from old.notes
  ) then
    insert into public.notification_jobs (appointment_id, kind)
    select new.id, 'calendar_sync'
     where not exists (
       select 1 from public.notification_jobs j
        where j.appointment_id = new.id
          and j.kind = 'calendar_sync'
          and j.status = 'pending'
     );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enqueue_appointment_notifications on public.appointments;
create trigger trg_enqueue_appointment_notifications
  after insert or update on public.appointments
  for each row
  execute function public.enqueue_appointment_notifications();

-- ---------------------------------------------------------------------
-- Datos de un turno para armar el email o el evento
-- ---------------------------------------------------------------------
create or replace function public.notification_payload(p_appointment_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'appointment', jsonb_build_object(
      'id',               a.id,
      'reservation_code', a.reservation_code,
      'start_at',         a.start_at,
      'end_at',           a.end_at,
      'status',           a.status::text,
      'notes',            a.notes,
      'cancelled_by',     to_jsonb(a) ->> 'cancelled_by',
      'source',           to_jsonb(a) ->> 'source'
    ),
    'customer', jsonb_build_object(
      'full_name', c.full_name,
      'phone',     c.phone,
      'email',     coalesce(nullif(trim(c.email), ''), nullif(trim(to_jsonb(c) ->> 'pending_email'), ''))
    ),
    'service', jsonb_build_object(
      'name',             s.name,
      'duration_minutes', s.duration_minutes,
      'price',            s.price
    ),
    'barber', jsonb_build_object('name', b.name),
    'settings', (
      select jsonb_build_object(
        'name',                             st.name,
        'address',                          to_jsonb(st) ->> 'address',
        'phone',                            to_jsonb(st) ->> 'phone',
        'instagram',                        to_jsonb(st) ->> 'instagram',
        'notifications_enabled',            coalesce(st.notifications_enabled, true),
        'appointment_confirmation_enabled', coalesce(st.appointment_confirmation_enabled, true),
        'appointment_reminder_enabled',     coalesce(st.appointment_reminder_enabled, true),
        'reminder_hours_before',            coalesce(st.reminder_hours_before, 24),
        'calendar_sync_enabled',            coalesce(st.calendar_sync_enabled, false),
        'cancellation_notice_hours',        coalesce(st.cancellation_notice_hours, 0)
      )
      from public.barbershop_settings st
      limit 1
    )
  )
  from public.appointments a
  left join public.customers c on c.id = a.customer_id
  left join public.services  s on s.id = a.service_id
  left join public.barbers   b on b.id = a.barber_id
  where a.id = p_appointment_id
$$;

-- ---------------------------------------------------------------------
-- Tomar tareas pendientes (sin que dos procesos tomen la misma)
-- ---------------------------------------------------------------------
create or replace function public.claim_notification_jobs(
  p_limit   integer default 20,
  p_max_age interval default null
)
returns setof public.notification_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Tareas que quedaron "en proceso" por un corte: vuelven a la cola.
  update public.notification_jobs
     set status = 'pending', locked_at = null
   where status = 'processing'
     and locked_at < now() - interval '10 minutes';

  return query
  update public.notification_jobs j
     set status    = 'processing',
         locked_at = now(),
         attempts  = j.attempts + 1
   where j.id in (
     select q.id
       from public.notification_jobs q
      where q.status = 'pending'
        and q.run_after <= now()
        and (p_max_age is null or q.created_at > now() - p_max_age)
      order by q.id
      for update skip locked
      limit greatest(1, least(coalesce(p_limit, 20), 100))
   )
  returning j.*;
end;
$$;

-- Cerrar una tarea. Si falló, se reintenta hasta 5 veces con espera
-- creciente (2, 8, 18, 32 minutos).
create or replace function public.finish_notification_job(
  p_id     bigint,
  p_status text,
  p_detail text default null,
  p_error  text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts integer;
begin
  select attempts into v_attempts
    from public.notification_jobs
   where id = p_id;

  if p_status = 'failed' and coalesce(v_attempts, 0) < 5 then
    update public.notification_jobs
       set status     = 'pending',
           locked_at  = null,
           run_after  = now() + make_interval(mins => 2 * v_attempts * v_attempts),
           last_error = left(p_error, 1000)
     where id = p_id;
    return;
  end if;

  update public.notification_jobs
     set status       = p_status,
         locked_at    = null,
         processed_at = now(),
         detail       = left(p_detail, 500),
         last_error   = case when p_status = 'failed' then left(p_error, 1000) else last_error end
   where id = p_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Recordatorios a enviar: se marcan como enviados al tomarlos (para no
-- mandarlos dos veces) y se liberan si el envío falla.
-- ---------------------------------------------------------------------
create or replace function public.claim_due_reminders(p_limit integer default 20)
returns table (appointment_id uuid, payload jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings record;
begin
  select coalesce(notifications_enabled, true)            as notifications_enabled,
         coalesce(appointment_reminder_enabled, true)     as reminder_enabled,
         coalesce(reminder_hours_before, 24)              as hours
    into v_settings
    from public.barbershop_settings
   limit 1;

  if found and (not v_settings.notifications_enabled or not v_settings.reminder_enabled) then
    return;
  end if;

  return query
  with due as (
    select a.id
      from public.appointments a
     where a.status::text in ('confirmed', 'pending')
       and a.reminder_sent_at is null
       and a.start_at > now()
       and a.start_at <= now() + make_interval(hours => coalesce(v_settings.hours, 24))
     order by a.start_at
     for update skip locked
     limit greatest(1, least(coalesce(p_limit, 20), 100))
  ),
  marked as (
    update public.appointments a
       set reminder_sent_at = now()
      from due
     where a.id = due.id
    returning a.id
  )
  select m.id, public.notification_payload(m.id)
    from marked m;
end;
$$;

create or replace function public.release_reminder(p_appointment_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.appointments
     set reminder_sent_at = null
   where id = p_appointment_id
     and start_at > now();
$$;

-- Solo el servidor (clave de servicio) usa estas funciones.
do $$
declare
  v_fn text;
begin
  foreach v_fn in array array[
    'public.notification_payload(uuid)',
    'public.claim_notification_jobs(integer, interval)',
    'public.finish_notification_job(bigint, text, text, text)',
    'public.claim_due_reminders(integer)',
    'public.release_reminder(uuid)'
  ]
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_fn);
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', v_fn);
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
