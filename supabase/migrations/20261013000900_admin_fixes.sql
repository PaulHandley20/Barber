-- =====================================================================
-- 09 · ARREGLOS PARA EL PANEL DE ADMIN
-- =====================================================================
-- 1) Turnos creados desde la Agenda: si no traen barbero o código de
--    reserva, se completan solos (Manu como barbero y un código DS-XXXX).
--    Así "Crear turno" funciona aunque se deje "Sin asignar".
-- 2) barbershop_hours: un solo registro por día. Configuración guarda
--    los horarios con "upsert por día", que necesita esta restricción.
-- =====================================================================

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
    select id into new.barber_id from public.barbers limit 1;
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

drop trigger if exists fill_appointment_defaults on public.appointments;
create trigger fill_appointment_defaults
  before insert on public.appointments
  for each row
  execute function public.fill_appointment_defaults();

-- Un horario por día: se conserva el registro más reciente.
delete from public.barbershop_hours h
 using public.barbershop_hours newer
 where h.day_of_week = newer.day_of_week
   and (coalesce(newer.updated_at, newer.created_at, 'epoch'::timestamptz), newer.id)
     > (coalesce(h.updated_at, h.created_at, 'epoch'::timestamptz), h.id);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.barbershop_hours'::regclass
       and contype = 'u'
       and conname = 'barbershop_hours_day_of_week_key'
  ) then
    alter table public.barbershop_hours
      add constraint barbershop_hours_day_of_week_key unique (day_of_week);
  end if;
end;
$$;
