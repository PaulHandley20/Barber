-- =====================================================================
-- Esquema base equivalente al de producción ANTES de las migraciones
-- (tablas, políticas y funciones viejas con las mismas firmas), más
-- datos mínimos. Solo para pruebas: nunca se corre en Supabase.
-- =====================================================================
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, created_at timestamptz default now(), last_sign_in_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(nullif(current_setting('request.jwt.claims', true),'')::jsonb->>'sub','')::uuid $$;
grant usage on schema auth to anon, authenticated; grant usage on schema public to anon, authenticated;
create table public.services (id uuid primary key default gen_random_uuid(), name text, description text, duration_minutes integer, price numeric, active boolean default true, created_at timestamptz default now(), currency text);
create table public.customers (id uuid primary key default gen_random_uuid(), full_name text not null, phone text, email text, notes text, created_at timestamptz default now(), updated_at timestamptz default now(), deleted_at timestamptz);
create table public.barbers (id uuid primary key default gen_random_uuid(), name text, active boolean default true);
create table public.appointments (id uuid primary key default gen_random_uuid(), customer_id uuid references customers(id), service_id uuid references services(id), barber_id uuid references barbers(id), start_at timestamptz, end_at timestamptz, status text default 'confirmed', notes text, created_at timestamptz default now(), updated_at timestamptz default now(), reservation_code text);
create table public.barbershop_hours (id uuid primary key default gen_random_uuid(), day_of_week integer, is_open boolean, open_time time, close_time time, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.barbershop_settings (id uuid primary key default gen_random_uuid(), name text, online_booking_enabled boolean, min_booking_notice_hours integer, max_booking_days_ahead integer, cancellation_notice_hours integer);
create table public.barbershop_blocked_periods (id uuid primary key default gen_random_uuid(), title text, starts_at timestamptz, ends_at timestamptz, reason text, created_at timestamptz default now(), updated_at timestamptz default now());
create table public.loyalty_point_transactions (id uuid primary key default gen_random_uuid(), customer_id uuid, appointment_id uuid, points int, created_at timestamptz default now());
create table public.backup_customers_20261012 as select * from public.customers;
create function public.award_loyalty_points_for_completed_appointment() returns trigger language plpgsql security definer as $$ begin if new.status='completed' and (tg_op='INSERT' or old.status is distinct from 'completed') then insert into loyalty_point_transactions(customer_id, appointment_id, points) values (new.customer_id, new.id, 10); end if; return new; end $$;
create trigger trg_award_loyalty_points_completed after insert or update on appointments for each row execute function award_loyalty_points_for_completed_appointment();
-- funciones viejas (mismas firmas)
create function public.get_available_slots(p_date date, p_service_id uuid) returns table(slot_start timestamptz, slot_end timestamptz) language plpgsql security definer as $$ begin return; end $$;
create function public.create_web_appointment(p_full_name text, p_phone text, p_email text, p_service_id uuid, p_start_at timestamptz, p_notes text default null) returns appointments language plpgsql security definer as $$ declare r appointments; begin return r; end $$;
create function public.reschedule_reservation(p_reservation_code text, p_new_start_at timestamptz) returns table(id uuid, reservation_code text, start_at timestamptz, end_at timestamptz, status text) language plpgsql security definer as $$ begin return; end $$;
create function public.cancel_reservation(p_reservation_code text) returns boolean language plpgsql security definer as $$ begin return true; end $$;
-- RLS y políticas como en producción
alter table customers enable row level security; alter table appointments enable row level security; alter table services enable row level security; alter table barbershop_hours enable row level security; alter table barbershop_settings enable row level security; alter table barbershop_blocked_periods enable row level security; alter table barbers enable row level security; alter table loyalty_point_transactions enable row level security;
create policy "Authenticated users can read customers" on customers for select to authenticated using (true);
create policy "Authenticated users can insert customers" on customers for insert to authenticated with check (true);
create policy "Authenticated users can update customers" on customers for update to authenticated using (true) with check (true);
create policy "Authenticated users can read appointments" on appointments for select to authenticated using (true);
create policy "appointments_update_admin" on appointments for update to authenticated using (true) with check (true);
create policy "Public can read active services" on services for select to anon, authenticated using (active = true);
create policy "Authenticated users can select barbershop hours" on barbershop_hours for select to authenticated using (true);
create policy "Authenticated users can insert blocked periods" on barbershop_blocked_periods for insert to authenticated with check (true);
grant all on all tables in schema public to anon, authenticated;
-- datos
insert into services(id,name,duration_minutes,price) values ('681a3c51-5164-4e39-b874-059d78b1f19f','Corte',30,15000), ('11111111-0000-0000-0000-000000000060','Corte + Barba',60,22000);
insert into barbers(name) values ('Manu');
insert into barbershop_hours(day_of_week,is_open,open_time,close_time) select d, d between 1 and 6, '09:00','19:00' from generate_series(0,6) d;
insert into barbershop_settings(name,max_booking_days_ahead,min_booking_notice_hours,cancellation_notice_hours,online_booking_enabled) values ('Don Segundo',30,1,3,true);
insert into customers(full_name, phone, email) values ('Juan Histórico','+54 9 3442 12-3456', null), ('Ana Web','3442654321','ana@mail.com');
insert into auth.users(id,email) values ('11111111-1111-1111-1111-111111111111','manu@gmail.com'),('22222222-2222-2222-2222-222222222222','intruso@gmail.com');
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
