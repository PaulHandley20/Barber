-- =====================================================================
-- 13 · SERVICIOS "SOLO PANEL" Y VARIOS BARBEROS
-- ---------------------------------------------------------------------
-- 1) Servicios solo panel: services.show_on_web. Si es false, el servicio
--    no aparece en la web ni se puede reservar desde ahí, pero Manu lo
--    puede usar en la Agenda (ej. "Kids").
--
-- 2) Varios barberos: la disponibilidad pasa a ser POR BARBERO.
--    - Un turno ocupa solo la silla de su barbero.
--    - La web puede pedir horarios de un barbero puntual o "sin
--      preferencia" (libre si al menos un barbero activo está libre).
--    - create_web_appointment recibe el barbero elegido (opcional). Sin
--      preferencia, asigna al barbero libre con menos turnos ese día.
--    - Reprogramar mantiene el barbero del turno.
--    - Con un solo barbero activo todo funciona igual que antes.
--
-- Los turnos viejos sin barbero cuentan como del barbero principal
-- (el activo más antiguo, o sea Manu).
-- Se puede volver a correr sin problema.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Columnas
-- ---------------------------------------------------------------------
alter table public.services
  add column if not exists show_on_web boolean not null default true;

alter table public.barbers
  add column if not exists active boolean not null default true;

alter table public.barbers
  add column if not exists created_at timestamptz not null default now();

-- La web (anon) nunca ve los servicios solo panel, aunque consulte la
-- tabla directo. Política restrictiva: se suma a las que ya existen.
drop policy if exists "services_hide_panel_only_from_web" on public.services;
create policy "services_hide_panel_only_from_web"
  on public.services
  as restrictive
  for select
  to anon
  using (coalesce(show_on_web, true));

-- ---------------------------------------------------------------------
-- Barbero principal: el activo más antiguo (Manu).
-- ---------------------------------------------------------------------
create or replace function public.default_barber_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.id
    from public.barbers b
   order by coalesce(b.active, true) desc, b.created_at, b.name, b.id
   limit 1
$$;

revoke all on function public.default_barber_id() from public, anon;
grant execute on function public.default_barber_id() to authenticated;

-- ¿El barbero está libre en ese rango?
create or replace function public.barber_is_free(
  p_barber_id              uuid,
  p_start                  timestamptz,
  p_end                    timestamptz,
  p_exclude_appointment_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (
    select 1
      from public.appointments a
     where a.status::text not in ('cancelled', 'canceled', 'no_show')
       and (p_exclude_appointment_id is null or a.id <> p_exclude_appointment_id)
       and coalesce(a.barber_id, public.default_barber_id()) = p_barber_id
       and p_start < a.end_at
       and p_end   > a.start_at
  )
$$;

revoke all on function public.barber_is_free(uuid, timestamptz, timestamptz, uuid) from public, anon;
grant execute on function public.barber_is_free(uuid, timestamptz, timestamptz, uuid) to authenticated;

-- Barbero activo libre con menos turnos ese día (desempate: el más antiguo).
create or replace function public.pick_free_barber(
  p_start                  timestamptz,
  p_end                    timestamptz,
  p_exclude_appointment_id uuid default null
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select b.id
    from public.barbers b
   where coalesce(b.active, true)
     and public.barber_is_free(b.id, p_start, p_end, p_exclude_appointment_id)
   order by (
     select count(*)
       from public.appointments a
      where coalesce(a.barber_id, public.default_barber_id()) = b.id
        and a.status::text not in ('cancelled', 'canceled', 'no_show')
        and (a.start_at at time zone 'America/Argentina/Buenos_Aires')::date
          = (p_start at time zone 'America/Argentina/Buenos_Aires')::date
   ),
   b.created_at, b.name, b.id
   limit 1
$$;

revoke all on function public.pick_free_barber(timestamptz, timestamptz, uuid) from public, anon;
grant execute on function public.pick_free_barber(timestamptz, timestamptz, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Disponibilidad (ahora con barbero opcional)
-- ---------------------------------------------------------------------
drop function if exists public.get_available_slots(date, uuid);
drop function if exists public.get_available_slots(date, uuid, uuid);
drop function if exists public.compute_available_slots(date, uuid, uuid);
drop function if exists public.compute_available_slots(date, uuid, uuid, uuid);

create function public.compute_available_slots(
  p_date                   date,
  p_service_id             uuid,
  p_exclude_appointment_id uuid default null,
  p_barber_id              uuid default null
)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_tz          constant text := 'America/Argentina/Buenos_Aires';
  v_today       date := (now() at time zone v_tz)::date;
  v_duration    integer;
  v_hours       record;
  v_settings    record;
  v_interval    interval := make_interval(mins => public.booking_slot_interval_minutes());
  v_cursor      timestamp;
  v_last        timestamp;
  v_start       timestamptz;
  v_end         timestamptz;
  v_has_barbers boolean;
begin
  select duration_minutes into v_duration
    from public.services
   where id = p_service_id and coalesce(active, true);

  if v_duration is null then
    return;
  end if;

  -- Barbero puntual: tiene que existir y estar activo.
  if p_barber_id is not null and not exists (
    select 1 from public.barbers b
     where b.id = p_barber_id and coalesce(b.active, true)
  ) then
    return;
  end if;

  v_has_barbers := exists (
    select 1 from public.barbers b where coalesce(b.active, true)
  );

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
       -- períodos bloqueados (toda la barbería)
       and not exists (
         select 1
           from public.barbershop_blocked_periods b
          where v_start < b.ends_at
            and v_end   > b.starts_at
       )
       -- turnos ya tomados
       and (
         case
           when p_barber_id is not null then
             public.barber_is_free(p_barber_id, v_start, v_end, p_exclude_appointment_id)
           when v_has_barbers then
             exists (
               select 1 from public.barbers b
                where coalesce(b.active, true)
                  and public.barber_is_free(b.id, v_start, v_end, p_exclude_appointment_id)
             )
           else
             not exists (
               select 1
                 from public.appointments a
                where a.status::text not in ('cancelled', 'canceled', 'no_show')
                  and (p_exclude_appointment_id is null or a.id <> p_exclude_appointment_id)
                  and v_start < a.end_at
                  and v_end   > a.start_at
             )
         end
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

revoke all on function public.compute_available_slots(date, uuid, uuid, uuid) from public, anon;
grant execute on function public.compute_available_slots(date, uuid, uuid, uuid) to authenticated;

-- Web: horarios de un servicio, opcionalmente para un barbero.
create function public.get_available_slots(
  p_date       date,
  p_service_id uuid,
  p_barber_id  uuid default null
)
returns table (slot_start timestamptz, slot_end timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.slot_start, s.slot_end
    from public.services sv
    cross join lateral public.compute_available_slots(p_date, p_service_id, null, p_barber_id) s
   where sv.id = p_service_id
     and coalesce(sv.show_on_web, true)
   order by s.slot_start;
$$;

revoke all on function public.get_available_slots(date, uuid, uuid) from public;
grant execute on function public.get_available_slots(date, uuid, uuid) to anon, authenticated;

-- Mi reserva: horarios para reprogramar (mismo barbero, sin contar el
-- propio turno). Vale también para servicios solo panel.
create or replace function public.get_reschedule_slots(
  p_reservation_code text,
  p_date             date
)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments;
  v_barber_id   uuid;
begin
  select a.* into v_appointment
    from public.appointments a
   where upper(trim(a.reservation_code)) = upper(trim(coalesce(p_reservation_code, '')))
     and a.status::text in ('confirmed', 'pending')
   limit 1;

  if v_appointment.id is null then
    return;
  end if;

  v_barber_id := coalesce(v_appointment.barber_id, public.default_barber_id());

  -- Si su barbero ya no está activo, se ofrece cualquier barbero libre.
  if v_barber_id is not null and not exists (
    select 1 from public.barbers b
     where b.id = v_barber_id and coalesce(b.active, true)
  ) then
    v_barber_id := null;
  end if;

  return query
  select s.slot_start, s.slot_end
    from public.compute_available_slots(p_date, v_appointment.service_id, v_appointment.id, v_barber_id) s
   order by s.slot_start;
end;
$$;

revoke all on function public.get_reschedule_slots(text, date) from public;
grant execute on function public.get_reschedule_slots(text, date) to anon, authenticated;

-- Barberos que la web puede ofrecer.
create or replace function public.get_public_barbers()
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.name::text
    from public.barbers b
   where coalesce(b.active, true)
   order by b.created_at, b.name, b.id
$$;

revoke all on function public.get_public_barbers() from public;
grant execute on function public.get_public_barbers() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Validación de turnos hechos desde la web (por barbero)
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
     and new.service_id is not distinct from old.service_id
     and new.barber_id is not distinct from old.barber_id then
    return new;
  end if;

  if new.status::text in ('cancelled', 'canceled', 'no_show') then
    return new;
  end if;

  -- Desde la web no se pueden crear turnos de servicios solo panel.
  if tg_op = 'INSERT' and exists (
    select 1 from public.services s
     where s.id = new.service_id and not coalesce(s.show_on_web, true)
  ) then
    raise exception 'El servicio elegido no está disponible.'
      using errcode = 'P0001';
  end if;

  v_date := (new.start_at at time zone 'America/Argentina/Buenos_Aires')::date;

  if not exists (
    select 1
      from public.compute_available_slots(
             v_date,
             new.service_id,
             case when tg_op = 'UPDATE' then old.id else null end,
             new.barber_id
           ) s
     where s.slot_start = new.start_at
  ) then
    raise exception 'Ese horario ya no está disponible. Elegí otro, por favor.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Turnos del panel sin barbero → barbero principal
-- ---------------------------------------------------------------------
create or replace function public.fill_appointment_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if new.barber_id is null then
    new.barber_id := public.default_barber_id();
  end if;

  if new.reservation_code is null or trim(new.reservation_code) = '' then
    loop
      v_code := 'DS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
      exit when not exists (
        select 1 from public.appointments where reservation_code = v_code
      );
    end loop;
    new.reservation_code := v_code;
  end if;

  if new.end_at is null and new.start_at is not null then
    select new.start_at + make_interval(mins => coalesce(s.duration_minutes, 30))
      into new.end_at
      from public.services s
     where s.id = new.service_id;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Crear reserva (con barbero opcional)
-- ---------------------------------------------------------------------
drop function if exists public.create_web_appointment(text, text, text, uuid, timestamptz, text);
drop function if exists public.create_web_appointment(text, text, text, uuid, timestamptz, text, uuid);

create function public.create_web_appointment(
  p_full_name  text,
  p_phone      text,
  p_email      text,
  p_service_id uuid,
  p_start_at   timestamptz,
  p_notes      text default null,
  p_barber_id  uuid default null
)
returns public.appointments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name        text := regexp_replace(trim(coalesce(p_full_name, '')), '\s+', ' ', 'g');
  v_email       text := lower(trim(coalesce(p_email, '')));
  v_phone       text := trim(coalesce(p_phone, ''));
  v_digits      text := public.phone_digits(p_phone);
  v_customer_id uuid;
  v_existing_phone text;
  v_pending     boolean := false;
  v_duration    integer;
  v_barber_id   uuid;
  v_end_at      timestamptz;
  v_code        text;
  v_row         public.appointments;
begin
  -- 1. Validaciones
  if length(v_name) < 3 then
    raise exception 'Ingresá tu nombre y apellido.';
  end if;

  if length(v_digits) < 8 then
    raise exception 'Ingresá un teléfono válido, con característica.';
  end if;

  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then
    raise exception 'Ingresá un email válido.';
  end if;

  select duration_minutes into v_duration
    from public.services
   where id = p_service_id
     and active = true
     and coalesce(show_on_web, true);

  if v_duration is null then
    raise exception 'El servicio elegido no está disponible.';
  end if;

  if p_barber_id is not null and not exists (
    select 1 from public.barbers b
     where b.id = p_barber_id and coalesce(b.active, true)
  ) then
    raise exception 'El barbero elegido no está disponible. Elegí otro, por favor.';
  end if;

  v_end_at := p_start_at + make_interval(mins => v_duration);

  -- 2. Horario disponible (misma regla que el calendario)
  if not exists (
    select 1
      from public.compute_available_slots(
             (p_start_at at time zone 'America/Argentina/Buenos_Aires')::date,
             p_service_id,
             null,
             p_barber_id
           ) s
     where s.slot_start = p_start_at
  ) then
    raise exception 'Ese horario ya no está disponible. Elegí otro, por favor.';
  end if;

  -- 3. Barbero: el elegido, o el libre con menos turnos ese día.
  v_barber_id := coalesce(p_barber_id, public.pick_free_barber(p_start_at, v_end_at, null));

  -- 4. Cliente por email
  select c.id, c.phone
    into v_customer_id, v_existing_phone
    from public.customers c
   where lower(trim(c.email)) = v_email
     and c.deleted_at is null
   order by c.created_at
   limit 1;

  if v_customer_id is not null then
    if public.phone_digits(v_existing_phone) <> v_digits then
      raise exception 'Ese email ya está registrado con otro teléfono. Usá el mismo teléfono de tus reservas anteriores o escribinos y lo actualizamos.';
    end if;

  else
    -- 5. Cliente histórico sin email con el mismo teléfono
    select c.id
      into v_customer_id
      from public.customers c
     where c.deleted_at is null
       and (c.email is null or trim(c.email) = '')
       and public.phone_digits(c.phone) = v_digits
     order by c.created_at
     limit 1;

    if v_customer_id is not null then
      v_pending := true;

      update public.customers
         set pending_email              = v_email,
             pending_full_name          = v_name,
             pending_email_requested_at = now()
       where id = v_customer_id;

    else
      -- 6. Cliente nuevo
      insert into public.customers (full_name, phone, email)
      values (v_name, v_phone, v_email)
      returning id into v_customer_id;
    end if;
  end if;

  -- 7. Código de reserva único
  loop
    v_code := 'DS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (
      select 1 from public.appointments where reservation_code = v_code
    );
  end loop;

  -- 8. Crear el turno
  insert into public.appointments (
    customer_id, service_id, barber_id, start_at, end_at,
    status, notes, reservation_code, pending_identity
  )
  values (
    v_customer_id, p_service_id, v_barber_id, p_start_at, v_end_at,
    'confirmed', nullif(trim(coalesce(p_notes, '')), ''), v_code, v_pending
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_web_appointment(text, text, text, uuid, timestamptz, text, uuid) from public;
grant execute on function public.create_web_appointment(text, text, text, uuid, timestamptz, text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Reprogramar (mantiene el barbero del turno)
-- ---------------------------------------------------------------------
create or replace function public.reschedule_reservation(
  p_reservation_code text,
  p_new_start_at     timestamptz
)
returns table (
  id               uuid,
  reservation_code text,
  start_at         timestamptz,
  end_at           timestamptz,
  status           text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments;
  v_duration    integer;
  v_notice      integer;
  v_barber_id   uuid;
  v_new_end     timestamptz;
begin
  if coalesce(trim(p_reservation_code), '') = '' then
    raise exception 'Código de reserva requerido.';
  end if;

  if p_new_start_at is null then
    raise exception 'Elegí el nuevo horario.';
  end if;

  select a.* into v_appointment
    from public.appointments a
   where upper(trim(a.reservation_code)) = upper(trim(p_reservation_code))
     and a.status = 'confirmed'
   limit 1;

  if v_appointment.id is null then
    raise exception 'No encontramos una reserva confirmada con ese código.';
  end if;

  select coalesce(cancellation_notice_hours, 0) into v_notice
    from public.barbershop_settings
   limit 1;

  if v_appointment.start_at < now() + make_interval(hours => coalesce(v_notice, 0)) then
    raise exception 'Faltan menos de % horas para tu turno: ya no se puede modificar online. Escribinos y te ayudamos.', coalesce(v_notice, 0);
  end if;

  v_barber_id := coalesce(v_appointment.barber_id, public.default_barber_id());

  if v_barber_id is not null and not exists (
    select 1 from public.barbers b
     where b.id = v_barber_id and coalesce(b.active, true)
  ) then
    v_barber_id := null;
  end if;

  if not exists (
    select 1
      from public.compute_available_slots(
             (p_new_start_at at time zone 'America/Argentina/Buenos_Aires')::date,
             v_appointment.service_id,
             v_appointment.id,
             v_barber_id
           ) s
     where s.slot_start = p_new_start_at
  ) then
    raise exception 'Ese horario ya no está disponible. Elegí otro, por favor.';
  end if;

  select duration_minutes into v_duration
    from public.services
   where services.id = v_appointment.service_id;

  v_new_end := p_new_start_at + make_interval(mins => coalesce(v_duration, 30));

  -- Su barbero ya no atiende: se asigna uno libre.
  if v_barber_id is null then
    v_barber_id := public.pick_free_barber(p_new_start_at, v_new_end, v_appointment.id);
  end if;

  update public.appointments a
     set start_at   = p_new_start_at,
         end_at     = v_new_end,
         barber_id  = coalesce(v_barber_id, a.barber_id),
         updated_at = now()
   where a.id = v_appointment.id;

  return query
  select a.id, a.reservation_code, a.start_at, a.end_at, a.status::text
    from public.appointments a
   where a.id = v_appointment.id;
end;
$$;

revoke all on function public.reschedule_reservation(text, timestamptz) from public;
grant execute on function public.reschedule_reservation(text, timestamptz) to anon, authenticated;

-- Que la API tome las firmas nuevas de las funciones enseguida.
notify pgrst, 'reload schema';
