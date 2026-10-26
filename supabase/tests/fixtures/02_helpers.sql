-- Ayudas para las pruebas.
create schema if not exists tests;

create or replace function tests.assert(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if p_condition is not true then
    raise exception 'FALLÓ: %', p_message;
  end if;
end;
$$;

-- Próximo día hábil (lunes a viernes) a partir de pasado mañana, a la
-- hora indicada (hora de Argentina).
create or replace function tests.next_weekday_at(p_time time, p_days_ahead integer default 2)
returns timestamptz
language sql
stable
as $$
  select ((d::date + p_time) at time zone 'America/Argentina/Buenos_Aires')
    from generate_series(current_date + p_days_ahead, current_date + p_days_ahead + 7, interval '1 day') d
   where extract(dow from d) between 1 and 5
   order by d
   limit 1
$$;

grant usage on schema tests to anon, authenticated, service_role;
grant execute on all functions in schema tests to anon, authenticated, service_role;
