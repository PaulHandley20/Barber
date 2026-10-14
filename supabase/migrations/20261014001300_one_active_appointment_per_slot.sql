-- =========================================================
-- 13 · Un solo turno activo por horario
-- ---------------------------------------------------------
-- Un horario puede tener un único turno activo (confirmado,
-- pendiente o completado). Los cancelados y "no asistió" no
-- ocupan el horario, así que se puede volver a reservar encima.
--
-- La web ya lo controlaba al calcular la disponibilidad; esta
-- regla lo asegura también para los turnos cargados o editados
-- desde el panel, y si dos personas reservan al mismo segundo.
--
-- Solo se controla cuando un turno pasa a ocupar un horario:
--   · al crearlo activo,
--   · al cambiarle día, hora o barbero,
--   · al reactivarlo (de cancelado a confirmado).
-- Marcar como completado un turno que ya existía no se bloquea,
-- así no afecta datos históricos que pudieran superponerse.
--
-- Es idempotente: se puede volver a correr sin problema.
-- =========================================================

create or replace function public.prevent_double_booking()
returns trigger
language plpgsql
as $$
declare
  v_conflict record;
  v_active_new boolean := new.status in ('confirmed', 'pending', 'completed');
begin
  if not v_active_new then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and old.status in ('confirmed', 'pending', 'completed')
     and old.start_at is not distinct from new.start_at
     and old.end_at is not distinct from new.end_at
     and old.barber_id is not distinct from new.barber_id then
    return new;
  end if;

  select a.id, a.start_at, a.end_at
    into v_conflict
    from public.appointments a
   where a.id is distinct from new.id
     and a.status in ('confirmed', 'pending', 'completed')
     and a.start_at < new.end_at
     and a.end_at > new.start_at
     and (
       a.barber_id is null
       or new.barber_id is null
       or a.barber_id = new.barber_id
     )
   limit 1;

  if v_conflict.id is not null then
    raise exception 'Ese horario ya está ocupado por otro turno (% a %). Elegí otro horario.',
      to_char(v_conflict.start_at at time zone 'America/Argentina/Buenos_Aires', 'HH24:MI'),
      to_char(v_conflict.end_at at time zone 'America/Argentina/Buenos_Aires', 'HH24:MI')
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_double_booking on public.appointments;

create trigger trg_prevent_double_booking
  before insert or update of start_at, end_at, status, barber_id
  on public.appointments
  for each row
  execute function public.prevent_double_booking();
