-- =====================================================================
-- 04 · FUNCIONES PÚBLICAS PARA LA WEB DE RESERVAS
-- =====================================================================
-- get_public_booking_config: horarios y reglas de reserva (sin datos
--   sensibles) para que el calendario público use los mismos horarios
--   que Manu configura en el panel.
-- find_reservations_by_contact: permite encontrar una reserva SIN el
--   código, con email + teléfono (ambos tienen que coincidir).
-- =====================================================================

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
