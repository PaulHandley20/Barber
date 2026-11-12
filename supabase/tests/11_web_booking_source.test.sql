-- Origen de cada turno: web (anon) o panel (admin).
begin;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select (public.create_web_appointment(
  'Valentín Prueba', '3442 999111', 'vprueba@mail.com',
  (select id from public.services where name = 'Corte'),
  tests.next_weekday_at('10:00'), null
)).reservation_code as web_code \gset
reset role;

select set_config('request.jwt.claims', '{"role":"authenticated","email":"manu@gmail.com","sub":"11111111-1111-1111-1111-111111111111"}', true);
set local role authenticated;
insert into public.appointments (customer_id, service_id, start_at, status)
values ((select id from public.customers where full_name = 'Ana Web'),
        (select id from public.services where name = 'Corte'),
        tests.next_weekday_at('15:00'), 'confirmed')
returning reservation_code as panel_code \gset
reset role;

select tests.assert(
  (select source from public.appointments where reservation_code = :'web_code') = 'web',
  'la reserva hecha desde la web queda con source = web');
select tests.assert(
  (select source from public.appointments where reservation_code = :'panel_code') = 'panel',
  'el turno creado en la Agenda queda con source = panel');

rollback;
