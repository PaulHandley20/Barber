-- Servicios "solo panel" y disponibilidad por barbero.
begin;

insert into public.services (id, name, duration_minutes, price, show_on_web)
values ('22222222-0000-0000-0000-0000000000a1', 'Kids', 20, 9000, false);

select id as corte from public.services where name = 'Corte' \gset
select id as manu from public.barbers where name = 'Manu' \gset
select tests.next_weekday_at('11:00') as t11, tests.next_weekday_at('11:30') as t1130,
       (tests.next_weekday_at('11:00') at time zone 'America/Argentina/Buenos_Aires')::date as dia \gset

-- Con un solo barbero, sin elegir → Manu
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select (public.create_web_appointment('Ana Uno', '3442 111111', 'uno@x.com', :'corte', :'t11', null)).reservation_code as c1 \gset
reset role;
select tests.assert(
  (select barber_id from public.appointments where reservation_code = :'c1') = :'manu',
  'con un solo barbero la reserva queda con Manu');

-- Segundo barbero
insert into public.barbers (name, created_at) values ('Juan', now() + interval '1 minute');
select id as juan from public.barbers where name = 'Juan' \gset

set local role anon;
select tests.assert(
  (select count(*) from public.get_public_barbers()) = 2,
  'la web ve los dos barberos activos');
select tests.assert(
  not exists (select 1 from public.get_available_slots(:'dia', :'corte', :'manu') where slot_start = :'t11'),
  'Manu está ocupado a las 11');
select tests.assert(
  exists (select 1 from public.get_available_slots(:'dia', :'corte', :'juan') where slot_start = :'t11'),
  'Juan está libre a las 11');
select tests.assert(
  exists (select 1 from public.get_available_slots(:'dia', :'corte') where slot_start = :'t11'),
  'sin preferencia, las 11 siguen libres');
select (public.create_web_appointment(p_full_name => 'Beto Dos', p_phone => '3442 222222', p_email => 'dos@x.com',
        p_service_id => :'corte', p_start_at => :'t11')).reservation_code as c2 \gset
reset role;
select tests.assert(
  (select barber_id from public.appointments where reservation_code = :'c2') = :'juan',
  'sin preferencia asigna al barbero libre');

set local role anon;
select tests.assert(
  not exists (select 1 from public.get_available_slots(:'dia', :'corte') where slot_start = :'t11'),
  'con los dos ocupados, las 11 ya no se ofrecen');

-- Servicio solo panel
select tests.assert(
  not exists (select 1 from public.services where name = 'Kids'),
  'la web no ve los servicios solo panel');
select tests.assert(
  (select count(*) from public.get_available_slots(:'dia', '22222222-0000-0000-0000-0000000000a1')) = 0,
  'la web no ofrece horarios para un servicio solo panel');
do $$
begin
  perform public.create_web_appointment('Eli Kids', '3442 555555', 'kids@x.com',
    '22222222-0000-0000-0000-0000000000a1', tests.next_weekday_at('12:00'), null);
  raise exception 'FALLÓ: la web pudo reservar un servicio solo panel';
exception when others then
  if sqlerrm like 'FALLÓ:%' then raise; end if;
end;
$$;

-- Reprogramar mantiene el barbero
select public.reschedule_reservation(:'c1', :'t1130');
reset role;
select tests.assert(
  (select barber_id = :'manu' and start_at = :'t1130' from public.appointments where reservation_code = :'c1'),
  'reprogramar mantiene el barbero del turno');

rollback;
