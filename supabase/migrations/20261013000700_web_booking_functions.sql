-- =====================================================================
-- 07 · RESERVAR / REPROGRAMAR / CANCELAR DESDE LA WEB
-- =====================================================================
-- Reescribe las 3 funciones que usa la web para que todas usen la MISMA
-- regla de disponibilidad (compute_available_slots, migración 05), que
-- lee lo que Manu configura en el panel:
--   barbershop_hours + barbershop_blocked_periods + barbershop_settings.
--
-- Antes usaban las tablas viejas business_hours y schedule_blocks, que
-- el panel no modifica (por eso bloquear un día no impactaba en la web),
-- y reschedule_reservation leía columnas que no coincidían con las de
-- get_available_slots.
--
-- create_web_appointment además resuelve los CLIENTES HISTÓRICOS:
--   1. Si el email ya existe → usa ese cliente (el teléfono tiene que
--      coincidir, comparando solo los dígitos).
--   2. Si el email es nuevo pero el teléfono coincide con un cliente
--      histórico SIN email → el turno se asocia a ese cliente (para que
--      sume en su historial y fidelización), pero el email y el nombre
--      que escribió quedan "pendientes de verificar". No se modifica
--      ningún dato del cliente. Manu aprueba o rechaza desde Clientes;
--      si rechaza, el turno pasa a un cliente nuevo.
--   3. Si no coincide nada → crea un cliente nuevo.
-- =====================================================================

create or replace function public.phone_digits(p_phone text)
returns text
language sql
immutable
as $$
  select right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 8)
$$;

-- ---------------------------------------------------------------------
-- Crear reserva
-- ---------------------------------------------------------------------
create or replace function public.create_web_appointment(
  p_full_name  text,
  p_phone      text,
  p_email      text,
  p_service_id uuid,
  p_start_at   timestamptz,
  p_notes      text default null
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
   where id = p_service_id and active = true;

  if v_duration is null then
    raise exception 'El servicio elegido no está disponible.';
  end if;

  -- 2. Horario disponible (misma regla que el calendario)
  if not exists (
    select 1
      from public.compute_available_slots(
             (p_start_at at time zone 'America/Argentina/Buenos_Aires')::date,
             p_service_id,
             null
           ) s
     where s.slot_start = p_start_at
  ) then
    raise exception 'Ese horario ya no está disponible. Elegí otro, por favor.';
  end if;

  -- 3. Cliente por email
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
    -- 4. Cliente histórico sin email con el mismo teléfono
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
      -- 5. Cliente nuevo
      insert into public.customers (full_name, phone, email)
      values (v_name, v_phone, v_email)
      returning id into v_customer_id;
    end if;
  end if;

  -- 6. Barbero (Manu)
  select id into v_barber_id
    from public.barbers
   limit 1;

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
    v_customer_id, p_service_id, v_barber_id, p_start_at,
    p_start_at + make_interval(mins => v_duration),
    'confirmed', nullif(trim(coalesce(p_notes, '')), ''), v_code, v_pending
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.create_web_appointment(text, text, text, uuid, timestamptz, text) from public;
grant execute on function public.create_web_appointment(text, text, text, uuid, timestamptz, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Reprogramar
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

  if not exists (
    select 1
      from public.compute_available_slots(
             (p_new_start_at at time zone 'America/Argentina/Buenos_Aires')::date,
             v_appointment.service_id,
             v_appointment.id
           ) s
     where s.slot_start = p_new_start_at
  ) then
    raise exception 'Ese horario ya no está disponible. Elegí otro, por favor.';
  end if;

  select duration_minutes into v_duration
    from public.services
   where services.id = v_appointment.service_id;

  update public.appointments a
     set start_at   = p_new_start_at,
         end_at     = p_new_start_at + make_interval(mins => coalesce(v_duration, 30)),
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

-- ---------------------------------------------------------------------
-- Cancelar (respeta la anticipación mínima de Configuración)
-- ---------------------------------------------------------------------
create or replace function public.cancel_reservation(p_reservation_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments;
  v_notice      integer;
begin
  if coalesce(trim(p_reservation_code), '') = '' then
    raise exception 'Código de reserva requerido.';
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
    raise exception 'Faltan menos de % horas para tu turno: ya no se puede cancelar online. Escribinos y te ayudamos.', coalesce(v_notice, 0);
  end if;

  update public.appointments
     set status = 'cancelled',
         updated_at = now()
   where id = v_appointment.id;

  return true;
end;
$$;

revoke all on function public.cancel_reservation(text) from public;
grant execute on function public.cancel_reservation(text) to anon, authenticated;
