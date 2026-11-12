-- Cola de envíos (emails y calendario) y recordatorios.
begin;

select id as corte from public.services where name = 'Corte' \gset

-- 1) Reserva web → confirmación + calendario
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select (public.create_web_appointment(
  'Ana Prueba', '3442 777000', 'ana.prueba@x.com', :'corte',
  tests.next_weekday_at('11:00'), null
)).reservation_code as code \gset
reset role;

select id as appt from public.appointments where reservation_code = :'code' \gset

select tests.assert(
  (select count(*) from public.notification_jobs
    where appointment_id = :'appt' and kind = 'confirmation' and status = 'pending') = 1,
  'la reserva web anota la confirmación');
select tests.assert(
  (select count(*) from public.notification_jobs
    where appointment_id = :'appt' and kind = 'calendar_sync' and status = 'pending') = 1,
  'la reserva web anota la sincronización con el calendario');
select tests.assert(
  (select reminder_sent_at is null from public.appointments where id = :'appt'),
  'un turno con más de 24 h de anticipación queda esperando su recordatorio');
select tests.assert(
  public.notification_payload(:'appt') -> 'customer' ->> 'email' = 'ana.prueba@x.com',
  'el payload trae el email del cliente');
select tests.assert(
  public.notification_payload(:'appt') -> 'barber' ->> 'name' = 'Manu',
  'el payload trae el barbero');

-- 2) Seguridad: la web y el panel no pueden usar las funciones del procesador
set local role anon;
do $$
begin
  perform public.claim_notification_jobs(10, null);
  raise exception 'FALLÓ: anon pudo tomar tareas de la cola';
exception when insufficient_privilege then null;
end;
$$;
do $$
begin
  perform 1 from public.notification_jobs;
  raise exception 'FALLÓ: la web pudo leer la cola';
exception when insufficient_privilege then null;
end;
$$;
reset role;

select set_config('request.jwt.claims', '{"role":"authenticated","email":"manu@gmail.com","sub":"11111111-1111-1111-1111-111111111111"}', true);
set local role authenticated;
do $$
begin
  perform public.notification_payload(gen_random_uuid());
  raise exception 'FALLÓ: el panel pudo leer el payload directo';
exception when insufficient_privilege then null;
end;
$$;
select tests.assert(
  (select count(*) from public.notification_jobs) >= 2,
  'el admin puede ver el estado de la cola');
reset role;

-- 3) El procesador toma y cierra las tareas
set local role service_role;
select count(*) as claimed from public.claim_notification_jobs(10, null) \gset
reset role;
select tests.assert(:'claimed'::int = 2, 'el procesador toma las 2 tareas pendientes');

set local role service_role;
select tests.assert(
  (select count(*) from public.claim_notification_jobs(10, null)) = 0,
  'una tarea en proceso no se toma dos veces');
select public.finish_notification_job(id, 'sent', 'ok')
  from public.notification_jobs where appointment_id = :'appt';
reset role;

-- 4) Reprogramar → aviso de cambio (sin duplicados)
set local role anon;
select public.reschedule_reservation(:'code', tests.next_weekday_at('12:00'));
reset role;
set local role authenticated;
update public.appointments set start_at = tests.next_weekday_at('12:30'),
       end_at = tests.next_weekday_at('12:30') + interval '30 minutes'
 where id = :'appt';
reset role;

select tests.assert(
  (select count(*) from public.notification_jobs
    where appointment_id = :'appt' and kind = 'updated' and status = 'pending') = 1,
  'dos cambios seguidos generan un solo aviso de cambio');

-- 5) Cambiar solo las notas → calendario, sin email
set local role authenticated;
update public.appointments set notes = 'Trae a su hijo' where id = :'appt';
reset role;
select tests.assert(
  (select count(*) from public.notification_jobs
    where appointment_id = :'appt' and kind in ('confirmation', 'updated', 'cancelled')
      and status = 'pending') = 1,
  'cambiar las notas no manda otro email');

-- 6) Cancelar → aviso de cancelación
set local role anon;
select public.cancel_reservation(:'code');
reset role;
select tests.assert(
  (select count(*) from public.notification_jobs
    where appointment_id = :'appt' and kind = 'cancelled') = 1,
  'cancelar anota el aviso de cancelación');
select tests.assert(
  public.notification_payload(:'appt') -> 'appointment' ->> 'cancelled_by' = 'cliente',
  'el payload indica quién canceló');

-- 7) Reintentos: un fallo vuelve a la cola con espera
update public.notification_jobs set status = 'pending' where appointment_id = :'appt';
set local role service_role;
select id as job from public.claim_notification_jobs(1, null) \gset
select public.finish_notification_job(:'job', 'failed', null, 'SMTP caído');
reset role;
select tests.assert(
  (select status = 'pending' and run_after > now() and last_error = 'SMTP caído'
     from public.notification_jobs where id = :'job'),
  'un envío fallido se reintenta más tarde');
update public.notification_jobs set attempts = 5, status = 'processing' where id = :'job';
set local role service_role;
select public.finish_notification_job(:'job', 'failed', null, 'SMTP caído');
reset role;
select tests.assert(
  (select status from public.notification_jobs where id = :'job') = 'failed',
  'después de 5 intentos queda como fallido');

-- 8) Turno del pasado cargado en la Agenda ("ya fue atendido"): nada que avisar
set local role authenticated;
insert into public.appointments (customer_id, service_id, start_at, status)
values ((select id from public.customers where full_name = 'Ana Web'), :'corte',
        now() - interval '3 hours', 'completed')
returning id as past_id \gset
reset role;
select tests.assert(
  not exists (select 1 from public.notification_jobs where appointment_id = :'past_id'),
  'un turno pasado no genera emails ni eventos');

-- 9) Recordatorios
set local role authenticated;
insert into public.appointments (customer_id, service_id, start_at, status)
values ((select id from public.customers where full_name = 'Ana Web'), :'corte',
        now() + interval '5 hours', 'confirmed')
returning id as soon_id \gset
insert into public.appointments (customer_id, service_id, start_at, status)
values ((select id from public.customers where full_name = 'Ana Web'), :'corte',
        now() + interval '40 hours', 'confirmed')
returning id as later_id \gset
reset role;

select tests.assert(
  (select reminder_sent_at is not null from public.appointments where id = :'soon_id'),
  'un turno reservado dentro de la ventana no recibe recordatorio aparte');

set local role service_role;
select tests.assert(
  not exists (select 1 from public.claim_due_reminders(10) where appointment_id = :'later_id'),
  'un turno a 40 h todavía no recibe recordatorio (ventana de 24 h)');
reset role;

update public.barbershop_settings set reminder_hours_before = 48;
set local role service_role;
select tests.assert(
  (select payload -> 'customer' ->> 'full_name' from public.claim_due_reminders(10)
    where appointment_id = :'later_id') = 'Ana Web',
  'con ventana de 48 h el turno a 40 h recibe recordatorio');
select tests.assert(
  not exists (select 1 from public.claim_due_reminders(10) where appointment_id = :'later_id'),
  'el recordatorio no se manda dos veces');
select public.release_reminder(:'later_id');
reset role;
select tests.assert(
  (select reminder_sent_at is null from public.appointments where id = :'later_id'),
  'si el envío falla, el recordatorio se libera para reintentar');

update public.barbershop_settings set appointment_reminder_enabled = false;
set local role service_role;
select tests.assert(
  (select count(*) from public.claim_due_reminders(10)) = 0,
  'con el recordatorio apagado no se manda nada');
reset role;

-- Mover el turno más adelante vuelve a programar el recordatorio
update public.barbershop_settings set appointment_reminder_enabled = true, reminder_hours_before = 24;
update public.appointments set reminder_sent_at = now() where id = :'later_id';
set local role authenticated;
update public.appointments set start_at = now() + interval '4 days',
       end_at = now() + interval '4 days 30 minutes'
 where id = :'later_id';
reset role;
select tests.assert(
  (select reminder_sent_at is null from public.appointments where id = :'later_id'),
  'reprogramar a más adelante vuelve a programar el recordatorio');

rollback;
