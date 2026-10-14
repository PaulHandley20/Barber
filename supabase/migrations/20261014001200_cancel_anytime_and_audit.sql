-- =========================================================
-- 12 · Reservar hasta 1 h antes, cancelar en cualquier momento
--      y registro de cancelaciones / ausencias
-- ---------------------------------------------------------
-- 1) Reglas:
--    · Reservar online: hasta 1 hora antes del turno.
--    · Reprogramar online: hasta 1 hora antes del turno.
--    · Cancelar online: en cualquier momento antes de la hora del
--      turno (ya no depende del aviso de Configuración).
--
-- 2) Cada turno guarda:
--    · cancelled_at        → cuándo se canceló
--    · cancelled_by        → 'cliente' (desde la web) o 'admin' (panel)
--    · cancelled_by_email  → email del admin que lo canceló
--    · no_show_at          → cuándo se marcó "No asistió"
--    Los turnos cancelados NO se borran: siguen en el panel.
--
-- Es idempotente: se puede volver a correr sin problema.
-- =========================================================

-- 1) Reglas de anticipación
update public.barbershop_settings
   set min_booking_notice_hours  = 1,
       cancellation_notice_hours = 1;

-- 2) Columnas de registro
alter table public.appointments
  add column if not exists cancelled_at       timestamptz,
  add column if not exists cancelled_by       text,
  add column if not exists cancelled_by_email text,
  add column if not exists no_show_at         timestamptz;

create or replace function public.track_appointment_status()
returns trigger
language plpgsql
as $$
declare
  v_claims jsonb := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
  v_request_role text := coalesce(v_claims ->> 'role', '');
  v_from_web boolean;
begin
  -- Pedido de la web: llega como 'anon', o entra por una función
  -- SECURITY DEFINER (current_user distinto del rol de la petición).
  v_from_web :=
    v_request_role = 'anon'
    or (v_request_role in ('anon', 'authenticated')
        and current_user not in ('anon', 'authenticated'));

  -- Cancelación
  if new.status in ('cancelled', 'canceled')
     and old.status is distinct from new.status then
    new.cancelled_at := coalesce(new.cancelled_at, now());

    if new.cancelled_by is null then
      if v_from_web then
        new.cancelled_by := 'cliente';
      else
        new.cancelled_by := 'admin';
        new.cancelled_by_email := coalesce(new.cancelled_by_email, v_claims ->> 'email');
      end if;
    end if;
  elsif new.status not in ('cancelled', 'canceled')
        and old.status in ('cancelled', 'canceled') then
    -- Si se reactiva el turno, se limpia el registro de cancelación.
    new.cancelled_at := null;
    new.cancelled_by := null;
    new.cancelled_by_email := null;
  end if;

  -- No asistió
  if new.status = 'no_show' and old.status is distinct from new.status then
    new.no_show_at := coalesce(new.no_show_at, now());
  elsif new.status <> 'no_show' then
    new.no_show_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_track_appointment_status on public.appointments;

create trigger trg_track_appointment_status
  before update of status on public.appointments
  for each row
  execute function public.track_appointment_status();

-- 3) Cancelar desde la web: hasta la hora del turno
create or replace function public.cancel_reservation(p_reservation_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments;
begin
  if coalesce(trim(p_reservation_code), '') = '' then
    raise exception 'Código de reserva requerido.';
  end if;

  select a.* into v_appointment
    from public.appointments a
   where upper(trim(a.reservation_code)) = upper(trim(p_reservation_code))
     and a.status in ('confirmed', 'pending')
   limit 1;

  if v_appointment.id is null then
    raise exception 'No encontramos una reserva activa con ese código.';
  end if;

  if v_appointment.start_at <= now() then
    raise exception 'El horario de este turno ya pasó: no se puede cancelar online.';
  end if;

  update public.appointments
     set status = 'cancelled',
         cancelled_by = 'cliente',
         cancelled_at = now(),
         updated_at = now()
   where id = v_appointment.id;

  return true;
end;
$$;

revoke all on function public.cancel_reservation(text) from public;
grant execute on function public.cancel_reservation(text) to anon, authenticated;
