-- Cancelar en cualquier momento y registro de quién canceló / no asistió.
begin;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select (public.create_web_appointment(
  'Ana Prueba', '3442 777000', 'ana.prueba@x.com',
  (select id from public.services where name = 'Corte'),
  tests.next_weekday_at('11:00'), null
)).reservation_code as code \gset
select public.cancel_reservation(:'code');
reset role;

select tests.assert(
  (select status = 'cancelled' and cancelled_by = 'cliente' and cancelled_at is not null
     from public.appointments where reservation_code = :'code'),
  'el cliente cancela desde la web y queda registrado');

select set_config('request.jwt.claims', '{"role":"authenticated","email":"manu@gmail.com","sub":"11111111-1111-1111-1111-111111111111"}', true);
set local role authenticated;
insert into public.appointments (customer_id, service_id, start_at, status)
values ((select id from public.customers where full_name = 'Ana Web'),
        (select id from public.services where name = 'Corte'),
        tests.next_weekday_at('16:00'), 'confirmed')
returning id as admin_id \gset
update public.appointments set status = 'cancelled' where id = :'admin_id';
reset role;

select tests.assert(
  (select cancelled_by = 'admin' and cancelled_by_email = 'manu@gmail.com'
     from public.appointments where id = :'admin_id'),
  'la cancelación desde el panel guarda el email del admin');

set local role authenticated;
update public.appointments set status = 'confirmed' where id = :'admin_id';
update public.appointments set status = 'no_show' where id = :'admin_id';
reset role;

select tests.assert(
  (select cancelled_at is null and no_show_at is not null
     from public.appointments where id = :'admin_id'),
  'reactivar limpia la cancelación y "no asistió" queda registrado');

rollback;
