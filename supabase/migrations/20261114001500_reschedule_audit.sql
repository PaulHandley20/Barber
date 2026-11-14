-- =====================================================================
-- 15 · REGISTRO DE CAMBIOS DE HORARIO
-- ---------------------------------------------------------------------
-- Cada vez que un turno cambia de día u hora se guarda cuándo, quién lo
-- cambió (el cliente desde "Mi reserva" o la barbería desde el panel) y
-- cuál era el horario anterior. La campanita del panel avisa cuando el
-- que reprogramó fue el cliente.
-- Se puede volver a correr sin problema.
-- =====================================================================

alter table public.appointments
  add column if not exists rescheduled_at          timestamptz,
  add column if not exists rescheduled_by          text,
  add column if not exists previous_start_at       timestamptz;

create or replace function public.track_appointment_reschedule()
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
  if new.start_at is not distinct from old.start_at then
    return new;
  end if;

  -- Misma regla que las cancelaciones (migración 12): la web llega como
  -- 'anon' o entra por una función SECURITY DEFINER.
  v_from_web :=
    v_request_role = 'anon'
    or (v_request_role in ('anon', 'authenticated')
        and current_user not in ('anon', 'authenticated'));

  new.rescheduled_at    := now();
  new.rescheduled_by    := case when v_from_web then 'cliente' else 'admin' end;
  new.previous_start_at := old.start_at;

  return new;
end;
$$;

drop trigger if exists trg_track_appointment_reschedule on public.appointments;
create trigger trg_track_appointment_reschedule
  before update of start_at on public.appointments
  for each row
  execute function public.track_appointment_reschedule();

create index if not exists appointments_rescheduled_idx
  on public.appointments (rescheduled_at)
  where rescheduled_by = 'cliente';

notify pgrst, 'reload schema';
