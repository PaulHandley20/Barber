-- =====================================================================
-- DON SEGUNDO · TODAS LAS MIGRACIONES EN UN SOLO ARCHIVO (01 a 08)
-- =====================================================================
-- Pegar TODO este archivo en Supabase → SQL Editor → New query → Run.
-- Corre todo junto dentro de una transacción: si algo falla, no se
-- aplica nada y la base queda como estaba.
-- Se puede volver a correr sin problema (es idempotente).
-- =====================================================================

begin;


-- >>>>> 20261013000100_admin_access.sql
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


-- >>>>> 20261013000200_customer_identity_protection.sql
-- =====================================================================
-- 02 · CLIENTES HISTÓRICOS SIN EMAIL · FLUJO SEGURO
-- =====================================================================
-- Problema: muchos clientes históricos tienen teléfono pero no email.
-- Si una reserva web se asocia a un cliente existente solo por el
-- teléfono, cualquiera que conozca ese número podría "pegarle" su email
-- a otra persona (o cambiarle el nombre).
--
-- Solución:
--   1. Un visitante anónimo (la web pública) NUNCA puede modificar el
--      nombre, teléfono o email de un cliente existente.
--   2. Si la reserva trae un email nuevo para un cliente existente, se
--      guarda en pending_email ("email pendiente de verificar").
--   3. Manu verifica la identidad (en persona el día del turno, o
--      escribiéndole al teléfono que ya estaba registrado) y desde
--      Admin → Clientes aprueba o rechaza el email.
--
-- No depende de cómo esté escrita create_web_appointment: el control
-- lo hace un trigger sobre la tabla customers.
-- =====================================================================

alter table public.customers
  add column if not exists pending_email              text,
  add column if not exists pending_full_name          text,
  add column if not exists pending_email_requested_at timestamptz,
  add column if not exists email_verified_at          timestamptz;

-- Turnos web asociados a un cliente histórico solo por el teléfono.
-- Quedan marcados hasta que Manu verifique la identidad.
alter table public.appointments
  add column if not exists pending_identity boolean not null default false;

create or replace function public.protect_customer_identity()
returns trigger
language plpgsql
as $$
declare
  v_role text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
  v_new_email text := nullif(lower(trim(coalesce(new.email, ''))), '');
begin
  if v_role <> 'anon' then
    return new;
  end if;

  if v_new_email is not null
     and v_new_email is distinct from lower(trim(coalesce(old.email, ''))) then
    new.pending_email := v_new_email;
    new.pending_email_requested_at := now();
  end if;

  new.email     := old.email;
  new.full_name := old.full_name;
  new.phone     := old.phone;
  new.email_verified_at := old.email_verified_at;

  return new;
end;
$$;

drop trigger if exists protect_customer_identity on public.customers;
create trigger protect_customer_identity
  before update on public.customers
  for each row
  execute function public.protect_customer_identity();

-- La aprobación/rechazo del email pendiente (resolve_pending_email)
-- se define en la migración 03, junto con el registro de consentimientos.


-- >>>>> 20261013000300_privacy_consent.sql
-- =====================================================================
-- 03 · CONSENTIMIENTO (PRIVACIDAD/TÉRMINOS Y MARKETING POR SEPARADO)
-- =====================================================================
-- * Aceptar Política de Privacidad + Términos es obligatorio para
--   reservar (lo exige el formulario).
-- * Recibir novedades/promociones es OPCIONAL y se guarda aparte.
-- * Cada aceptación queda registrada en consent_events con la versión
--   del texto legal, para poder demostrar qué aceptó cada cliente.
-- =====================================================================

alter table public.customers
  add column if not exists privacy_accepted_at    timestamptz,
  add column if not exists privacy_policy_version text,
  add column if not exists marketing_opt_in       boolean not null default false,
  add column if not exists marketing_opt_in_at    timestamptz,
  add column if not exists marketing_opt_out_at   timestamptz;

create table if not exists public.consent_events (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references public.customers (id) on delete cascade,
  reservation_code text,
  email            text,
  consent_type     text not null check (consent_type in ('privacy_terms', 'marketing')),
  granted          boolean not null,
  policy_version   text,
  -- false cuando el email todavía no fue verificado (cliente histórico)
  verified         boolean not null default true,
  source           text not null default 'web_booking',
  created_at       timestamptz not null default now()
);

create index if not exists consent_events_customer_idx
  on public.consent_events (customer_id, created_at desc);

alter table public.consent_events enable row level security;

drop policy if exists "consent_events_admin_read" on public.consent_events;
create policy "consent_events_admin_read"
  on public.consent_events
  for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- La web la llama inmediatamente después de crear la reserva.
-- Solo funciona si el código de reserva y el email coinciden.
-- ---------------------------------------------------------------------
create or replace function public.record_booking_consent(
  p_reservation_code text,
  p_email            text,
  p_policy_version   text,
  p_marketing_opt_in boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_verified    boolean;
  v_email       text := lower(trim(coalesce(p_email, '')));
begin
  if v_email = '' or coalesce(trim(p_reservation_code), '') = '' then
    return false;
  end if;

  select c.id,
         lower(trim(coalesce(c.email, ''))) = v_email
    into v_customer_id, v_verified
    from public.appointments a
    join public.customers c on c.id = a.customer_id
   where upper(a.reservation_code) = upper(trim(p_reservation_code))
     and (lower(trim(coalesce(c.email, ''))) = v_email
          or lower(trim(coalesce(c.pending_email, ''))) = v_email)
     and a.start_at >= now() - interval '1 day'
   limit 1;

  if v_customer_id is null then
    return false;
  end if;

  insert into public.consent_events
    (customer_id, reservation_code, email, consent_type, granted, policy_version, verified)
  values
    (v_customer_id, upper(trim(p_reservation_code)), v_email, 'privacy_terms', true, p_policy_version, v_verified);

  if p_marketing_opt_in then
    insert into public.consent_events
      (customer_id, reservation_code, email, consent_type, granted, policy_version, verified)
    values
      (v_customer_id, upper(trim(p_reservation_code)), v_email, 'marketing', true, p_policy_version, v_verified);
  end if;

  -- La aceptación de la política corresponde a quien reservó ese turno.
  update public.customers
     set privacy_accepted_at    = now(),
         privacy_policy_version = p_policy_version
   where id = v_customer_id;

  -- El opt-in de marketing solo se aplica si el email está verificado.
  -- Si no, queda registrado y se aplica cuando Manu apruebe el email.
  if p_marketing_opt_in and v_verified then
    update public.customers
       set marketing_opt_in     = true,
           marketing_opt_in_at  = now(),
           marketing_opt_out_at = null
     where id = v_customer_id;
  end if;

  return true;
end;
$$;

revoke all on function public.record_booking_consent(text, text, text, boolean) from public;
grant execute on function public.record_booking_consent(text, text, text, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Aprobar o rechazar el email pendiente de un cliente histórico
-- (solo admins; se usa desde Admin → Clientes).
--
--   Aprobar  = es la misma persona: el email pasa a ser el del cliente
--              y sus turnos web quedan confirmados en su historial.
--   Rechazar = NO es la misma persona: se crea un cliente nuevo con los
--              datos que cargó en la web y se le pasan esos turnos, así
--              el historial y los puntos del cliente histórico no se mezclan.
-- ---------------------------------------------------------------------
create or replace function public.resolve_pending_email(
  p_customer_id uuid,
  p_approve     boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer  record;
  v_marketing boolean;
  v_new_id    uuid;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_customer
    from public.customers
   where id = p_customer_id;

  if not found or v_customer.pending_email is null then
    return;
  end if;

  if p_approve then
    select exists (
      select 1 from public.consent_events
       where customer_id = p_customer_id
         and email = v_customer.pending_email
         and consent_type = 'marketing'
         and granted
    ) into v_marketing;

    update public.customers
       set email                      = v_customer.pending_email,
           email_verified_at          = now(),
           pending_email              = null,
           pending_full_name          = null,
           pending_email_requested_at = null,
           marketing_opt_in           = marketing_opt_in or v_marketing,
           marketing_opt_in_at        = case when v_marketing and not marketing_opt_in
                                             then now() else marketing_opt_in_at end
     where id = p_customer_id;

    update public.appointments
       set pending_identity = false
     where customer_id = p_customer_id
       and pending_identity;

    update public.consent_events
       set verified = true
     where customer_id = p_customer_id
       and email = v_customer.pending_email;

    return;
  end if;

  -- Rechazo: separar en un cliente nuevo.
  insert into public.customers (full_name, phone, email)
  values (
    coalesce(v_customer.pending_full_name, v_customer.full_name),
    v_customer.phone,
    v_customer.pending_email
  )
  returning id into v_new_id;

  update public.appointments
     set customer_id      = v_new_id,
         pending_identity = false
   where customer_id = p_customer_id
     and pending_identity;

  update public.consent_events
     set customer_id = v_new_id
   where customer_id = p_customer_id
     and email = v_customer.pending_email;

  update public.customers
     set pending_email              = null,
         pending_full_name          = null,
         pending_email_requested_at = null
   where id = p_customer_id;
end;
$$;

revoke all on function public.resolve_pending_email(uuid, boolean) from public, anon;
grant execute on function public.resolve_pending_email(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Baja de comunicaciones comerciales (solo admins, desde Clientes).
-- ---------------------------------------------------------------------
create or replace function public.set_marketing_opt_in(
  p_customer_id uuid,
  p_opt_in      boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  update public.customers
     set marketing_opt_in     = p_opt_in,
         marketing_opt_in_at  = case when p_opt_in then now() else marketing_opt_in_at end,
         marketing_opt_out_at = case when p_opt_in then null else now() end
   where id = p_customer_id;

  insert into public.consent_events (customer_id, consent_type, granted, source)
  values (p_customer_id, 'marketing', p_opt_in, 'admin_panel');
end;
$$;

revoke all on function public.set_marketing_opt_in(uuid, boolean) from public, anon;
grant execute on function public.set_marketing_opt_in(uuid, boolean) to authenticated;


-- >>>>> 20261013000400_public_booking.sql
-- =====================================================================
-- 04 · FUNCIONES PÚBLICAS PARA LA WEB DE RESERVAS
-- =====================================================================
-- get_public_booking_config: horarios y reglas de reserva (sin datos
--   sensibles) para que el calendario público use los mismos horarios
--   que Manu configura en el panel.
-- find_reservations_by_contact: permite encontrar una reserva SIN el
--   código, con email + teléfono (ambos tienen que coincidir).
-- =====================================================================

-- Columnas que usa la pantalla Admin → Horarios y que faltaban en la base
-- (sin ellas, guardar horarios con pausa o bloquear un día fallaba).
alter table public.barbershop_hours
  add column if not exists has_break   boolean not null default false,
  add column if not exists break_start time,
  add column if not exists break_end   time;

alter table public.barbershop_blocked_periods
  add column if not exists all_day boolean not null default false;

create or replace function public.get_public_booking_config()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
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
    'max_booking_days_ahead',    (select s.max_booking_days_ahead    from public.barbershop_settings s limit 1),
    'min_booking_notice_hours',  (select s.min_booking_notice_hours  from public.barbershop_settings s limit 1),
    'cancellation_notice_hours', (select s.cancellation_notice_hours from public.barbershop_settings s limit 1),
    'online_booking_enabled',    (select s.online_booking_enabled    from public.barbershop_settings s limit 1)
  );
$$;

revoke all on function public.get_public_booking_config() from public;
grant execute on function public.get_public_booking_config() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Búsqueda sin código: email exacto (sin importar mayúsculas) + los
-- últimos 8 dígitos del teléfono. Devuelve solo turnos próximos y no
-- cancelados, y únicamente datos mínimos; el detalle completo se pide
-- después con get_reservation_by_code.
--
-- Se usa email + teléfono (y no apellido) porque el apellido es un
-- dato público: alguien que conoce tu email probablemente también
-- conoce tu apellido, pero es menos probable que tenga tu teléfono.
-- Solo se compara contra emails VERIFICADOS (no contra pending_email).
-- ---------------------------------------------------------------------
create or replace function public.find_reservations_by_contact(
  p_email text,
  p_phone text
)
returns table (
  reservation_code text,
  service_name     text,
  start_at         timestamptz,
  status           text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email  text := lower(trim(coalesce(p_email, '')));
  v_digits text := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 8);
begin
  if position('@' in v_email) = 0 or length(v_digits) < 8 then
    return;
  end if;

  return query
  select a.reservation_code::text,
         s.name::text,
         a.start_at,
         a.status::text
    from public.appointments a
    join public.customers c on c.id = a.customer_id
    left join public.services s on s.id = a.service_id
   where lower(trim(c.email)) = v_email
     and right(regexp_replace(coalesce(c.phone, ''), '\D', '', 'g'), 8) = v_digits
     and c.deleted_at is null
     and a.reservation_code is not null
     and a.status::text <> 'cancelled'
     and a.start_at >= now() - interval '2 hours'
   order by a.start_at
   limit 10;
end;
$$;

revoke all on function public.find_reservations_by_contact(text, text) from public;
grant execute on function public.find_reservations_by_contact(text, text) to anon, authenticated;


-- >>>>> 20261013000500_availability.sql
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


-- >>>>> 20261013000600_horarios_lunes_a_viernes.sql
-- =====================================================================
-- 06 · HORARIO DE RESERVAS: LUNES A VIERNES, 08:00 A 18:00 (INCLUSIVE)
-- =====================================================================
-- Deja configurados los horarios pedidos. Después Manu los puede cambiar
-- cuando quiera desde Admin → Horarios (Primer turno / Último turno).
-- Requiere la migración 05 (donde "Cierre" pasa a ser el último turno).
-- =====================================================================

-- Lunes (1) a viernes (5): primer turno 08:00, último turno 18:00.
update public.barbershop_hours
   set is_open    = true,
       open_time  = '08:00',
       close_time = '18:00'
 where day_of_week between 1 and 5;

-- Sábado (6) y domingo (0): cerrado.
update public.barbershop_hours
   set is_open = false
 where day_of_week in (0, 6);

-- Si faltara algún día en la tabla, se crea.
insert into public.barbershop_hours (day_of_week, is_open, open_time, close_time)
select d,
       d between 1 and 5,
       case when d between 1 and 5 then '08:00'::time end,
       case when d between 1 and 5 then '18:00'::time end
  from generate_series(0, 6) d
 where not exists (
   select 1 from public.barbershop_hours h where h.day_of_week = d
 );


-- >>>>> 20261013000700_web_booking_functions.sql
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


-- >>>>> 20261013000800_security_hardening.sql
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


commit;
