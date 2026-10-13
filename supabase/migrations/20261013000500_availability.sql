-- =====================================================================
-- 05 · DISPONIBILIDAD DE TURNOS (una sola regla para toda la web)
-- =====================================================================
-- Reemplaza get_available_slots por una versión que respeta TODO lo que
-- Manu configura en el panel:
--
--   * Horarios por día (barbershop_hours). "Apertura" = primer turno y
--     "Cierre" = ÚLTIMO turno (inclusive). Ej.: 08:00 a 18:00 ofrece
--     turnos 08:00, 08:30, …, 18:00.
--   * Pausa/break del día (has_break, break_start, break_end).
--   * Períodos bloqueados (barbershop_blocked_periods): días completos o
--     franjas horarias (vacaciones, feriados, trámites, etc.).
--   * Turnos ya tomados (cualquier estado salvo cancelado / no asistió).
--   * Anticipación mínima y días máximos (barbershop_settings).
--   * Reservas online pausadas (online_booking_enabled = false).
--
-- Además, un trigger valida que TODA reserva o reprogramación hecha desde
-- la web pública (rol anon) caiga en un horario disponible. Así, aunque
-- create_web_appointment o reschedule_reservation tengan su propia
-- lógica, nunca se puede reservar en un horario bloqueado.
-- El panel de admin (usuario autenticado) NO tiene esta restricción:
-- Manu puede cargar turnos pasados o fuera de horario.
-- =====================================================================

-- Intervalo entre turnos (minutos).
create or replace function public.booking_slot_interval_minutes()
returns integer
language sql
immutable
as $$ select 30 $$;

-- ---------------------------------------------------------------------
-- Cálculo interno (permite excluir un turno, para reprogramar).
-- ---------------------------------------------------------------------
create or replace function public.compute_available_slots(
  p_date                   date,
  p_service_id             uuid,
  p_exclude_appointment_id uuid default null
)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz        constant text := 'America/Argentina/Buenos_Aires';
  v_today     date := (now() at time zone v_tz)::date;
  v_duration  integer;
  v_hours     record;
  v_settings  record;
  v_interval  interval := make_interval(mins => public.booking_slot_interval_minutes());
  v_cursor    timestamp;
  v_last      timestamp;
  v_start     timestamptz;
  v_end       timestamptz;
begin
  select duration_minutes into v_duration
    from public.services
   where id = p_service_id and coalesce(active, true);

  if v_duration is null then
    return;
  end if;

  select coalesce(online_booking_enabled, true)  as online_booking_enabled,
         coalesce(min_booking_notice_hours, 0)   as min_booking_notice_hours,
         coalesce(max_booking_days_ahead, 30)    as max_booking_days_ahead
    into v_settings
    from public.barbershop_settings
   limit 1;

  if found and not v_settings.online_booking_enabled then
    return;
  end if;

  if p_date < v_today
     or p_date > v_today + coalesce(v_settings.max_booking_days_ahead, 30) then
    return;
  end if;

  select * into v_hours
    from public.barbershop_hours
   where day_of_week = extract(dow from p_date)::int
   limit 1;

  if not found or not v_hours.is_open
     or v_hours.open_time is null or v_hours.close_time is null then
    return;
  end if;

  v_cursor := p_date + v_hours.open_time;
  v_last   := p_date + v_hours.close_time;   -- último turno, inclusive

  while v_cursor <= v_last loop
    v_start := v_cursor at time zone v_tz;
    v_end   := v_start + make_interval(mins => v_duration);

    if v_start >= now() + make_interval(hours => coalesce(v_settings.min_booking_notice_hours, 0))
       -- pausa del día
       and not (
         coalesce(v_hours.has_break, false)
         and v_hours.break_start is not null
         and v_hours.break_end is not null
         and v_start < ((p_date + v_hours.break_end) at time zone v_tz)
         and v_end   > ((p_date + v_hours.break_start) at time zone v_tz)
       )
       -- períodos bloqueados
       and not exists (
         select 1
           from public.barbershop_blocked_periods b
          where v_start < b.ends_at
            and v_end   > b.starts_at
       )
       -- turnos ya tomados
       and not exists (
         select 1
           from public.appointments a
          where a.status::text not in ('cancelled', 'no_show')
            and (p_exclude_appointment_id is null or a.id <> p_exclude_appointment_id)
            and v_start < a.end_at
            and v_end   > a.start_at
       )
    then
      slot_start := v_start;
      slot_end   := v_end;
      return next;
    end if;

    v_cursor := v_cursor + v_interval;
  end loop;
end;
$$;

revoke all on function public.compute_available_slots(date, uuid, uuid) from public, anon;
grant execute on function public.compute_available_slots(date, uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Función pública que usa la web (misma firma de siempre).
-- ---------------------------------------------------------------------
drop function if exists public.get_available_slots(date, uuid);

create function public.get_available_slots(
  p_date       date,
  p_service_id uuid
)
returns table (slot_start timestamptz, slot_end timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.slot_start, s.slot_end
    from public.compute_available_slots(p_date, p_service_id, null) s
   order by s.slot_start;
$$;

revoke all on function public.get_available_slots(date, uuid) from public;
grant execute on function public.get_available_slots(date, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Validación de reservas hechas desde la web pública.
-- ---------------------------------------------------------------------
create or replace function public.validate_public_appointment_slot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
  v_date date;
begin
  if v_role <> 'anon' then
    return new;
  end if;

  -- Cancelaciones y otros cambios que no mueven el horario: sin validar.
  if tg_op = 'UPDATE'
     and new.start_at is not distinct from old.start_at
     and new.service_id is not distinct from old.service_id then
    return new;
  end if;

  if new.status::text in ('cancelled', 'no_show') then
    return new;
  end if;

  v_date := (new.start_at at time zone 'America/Argentina/Buenos_Aires')::date;

  if not exists (
    select 1
      from public.compute_available_slots(
             v_date,
             new.service_id,
             case when tg_op = 'UPDATE' then old.id else null end
           ) s
     where s.slot_start = new.start_at
  ) then
    raise exception 'Ese horario ya no está disponible. Elegí otro, por favor.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_public_appointment_slot on public.appointments;
create trigger validate_public_appointment_slot
  before insert or update on public.appointments
  for each row
  execute function public.validate_public_appointment_slot();

-- ---------------------------------------------------------------------
-- Configuración pública: se agregan los días bloqueados completos para
-- que el calendario de la web los muestre deshabilitados.
-- ---------------------------------------------------------------------
create or replace function public.get_public_booking_config()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with settings as (
    select * from public.barbershop_settings limit 1
  ),
  days as (
    select d::date as day
      from generate_series(
             (now() at time zone 'America/Argentina/Buenos_Aires')::date,
             (now() at time zone 'America/Argentina/Buenos_Aires')::date
               + coalesce((select max_booking_days_ahead from settings), 30),
             interval '1 day'
           ) d
  ),
  blocked as (
    select dy.day
      from days dy
      join public.barbershop_hours h
        on h.day_of_week = extract(dow from dy.day)::int
       and h.is_open and h.open_time is not null and h.close_time is not null
     where exists (
       select 1
         from public.barbershop_blocked_periods b
        where b.starts_at <= ((dy.day + h.open_time) at time zone 'America/Argentina/Buenos_Aires')
          and b.ends_at   >  ((dy.day + h.close_time) at time zone 'America/Argentina/Buenos_Aires')
     )
  )
  select jsonb_build_object(
    'hours', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'day_of_week', h.day_of_week,
                 'is_open',     h.is_open,
                 'open_time',   h.open_time,
                 'close_time',  h.close_time,
                 'has_break',   h.has_break,
                 'break_start', h.break_start,
                 'break_end',   h.break_end
               )
               order by h.day_of_week
             )
        from public.barbershop_hours h
    ), '[]'::jsonb),
    'blocked_dates', coalesce((select jsonb_agg(day order by day) from blocked), '[]'::jsonb),
    'max_booking_days_ahead',    (select max_booking_days_ahead    from settings),
    'min_booking_notice_hours',  (select min_booking_notice_hours  from settings),
    'cancellation_notice_hours', (select cancellation_notice_hours from settings),
    'online_booking_enabled',    (select online_booking_enabled    from settings)
  );
$$;

revoke all on function public.get_public_booking_config() from public;
grant execute on function public.get_public_booking_config() to anon, authenticated;
