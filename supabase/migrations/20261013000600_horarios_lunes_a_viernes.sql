-- =====================================================================
-- 06 · HORARIO DE RESERVAS: LUNES A VIERNES, 08:00 A 18:00 (INCLUSIVE)
-- =====================================================================
-- Deja configurados los horarios pedidos. Después Manu los puede cambiar
-- cuando quiera desde Admin → Horarios (Primer turno / Último turno).
-- Requiere la migración 05 (donde "Cierre" pasa a ser el último turno).
-- =====================================================================

-- Lunes (1) a viernes (5): primer turno 08:00, último turno 18:00.
update public.barbershop_hours
   set is_open    = true,
       open_time  = '08:00',
       close_time = '18:00'
 where day_of_week between 1 and 5;

-- Sábado (6) y domingo (0): cerrado.
update public.barbershop_hours
   set is_open = false
 where day_of_week in (0, 6);

-- Si faltara algún día en la tabla, se crea.
insert into public.barbershop_hours (day_of_week, is_open, open_time, close_time)
select d,
       d between 1 and 5,
       case when d between 1 and 5 then '08:00'::time end,
       case when d between 1 and 5 then '18:00'::time end
  from generate_series(0, 6) d
 where not exists (
   select 1 from public.barbershop_hours h where h.day_of_week = d
 );
