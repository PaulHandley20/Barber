-- Registro de cambios de horario (cliente desde la web o el panel).
begin;

select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select (public.create_web_appointment(
  'Ana Prueba', '3442 777000', 'ana.prueba@x.com',
  (select id from public.services where name = 'Corte'),
  tests.next_weekday_at('11:00'), null
)).reservation_code as code \gset
reset role;

select tests.assert(
  (select rescheduled_at is null and rescheduled_by is null
     from public.appointments where reservation_code = :'code'),
  'un turno recién creado no figura como reprogramado');

-- El cliente lo cambia desde Mi reserva
set local role anon;
select public.reschedule_reservation(:'code', tests.next_weekday_at('12:00'));
reset role;

select tests.assert(
  (select rescheduled_by = 'cliente'
      and rescheduled_at is not null
      and previous_start_at = tests.next_weekday_at('11:00')
     from public.appointments where reservation_code = :'code'),
  'el cambio desde la web queda como del cliente, con el horario anterior');

-- Manu lo cambia desde la Agenda
select set_config('request.jwt.claims', '{"role":"authenticated","email":"manu@gmail.com","sub":"11111111-1111-1111-1111-111111111111"}', true);
set local role authenticated;
update public.appointments
   set start_at = tests.next_weekday_at('15:00'),
       end_at = tests.next_weekday_at('15:00') + interval '30 minutes'
 where reservation_code = :'code';

-- Cambiar otra cosa no lo marca como reprogramado de nuevo
update public.appointments set notes = 'Prefiere máquina' where reservation_code = :'code';
reset role;

select tests.assert(
  (select rescheduled_by = 'admin'
      and previous_start_at = tests.next_weekday_at('12:00')
     from public.appointments where reservation_code = :'code'),
  'el cambio desde el panel queda como de la barbería');

rollback;
