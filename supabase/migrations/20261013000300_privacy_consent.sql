-- =====================================================================
-- 03 · CONSENTIMIENTO (PRIVACIDAD/TÉRMINOS Y MARKETING POR SEPARADO)
-- =====================================================================
-- * Aceptar Política de Privacidad + Términos es obligatorio para
--   reservar (lo exige el formulario).
-- * Recibir novedades/promociones es OPCIONAL y se guarda aparte.
-- * Cada aceptación queda registrada en consent_events con la versión
--   del texto legal, para poder demostrar qué aceptó cada cliente.
-- =====================================================================

alter table public.customers
  add column if not exists privacy_accepted_at    timestamptz,
  add column if not exists privacy_policy_version text,
  add column if not exists marketing_opt_in       boolean not null default false,
  add column if not exists marketing_opt_in_at    timestamptz,
  add column if not exists marketing_opt_out_at   timestamptz;

create table if not exists public.consent_events (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references public.customers (id) on delete cascade,
  reservation_code text,
  email            text,
  consent_type     text not null check (consent_type in ('privacy_terms', 'marketing')),
  granted          boolean not null,
  policy_version   text,
  -- false cuando el email todavía no fue verificado (cliente histórico)
  verified         boolean not null default true,
  source           text not null default 'web_booking',
  created_at       timestamptz not null default now()
);

create index if not exists consent_events_customer_idx
  on public.consent_events (customer_id, created_at desc);

alter table public.consent_events enable row level security;

drop policy if exists "consent_events_admin_read" on public.consent_events;
create policy "consent_events_admin_read"
  on public.consent_events
  for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- La web la llama inmediatamente después de crear la reserva.
-- Solo funciona si el código de reserva y el email coinciden.
-- ---------------------------------------------------------------------
create or replace function public.record_booking_consent(
  p_reservation_code text,
  p_email            text,
  p_policy_version   text,
  p_marketing_opt_in boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_verified    boolean;
  v_email       text := lower(trim(coalesce(p_email, '')));
begin
  if v_email = '' or coalesce(trim(p_reservation_code), '') = '' then
    return false;
  end if;

  select c.id,
         lower(trim(coalesce(c.email, ''))) = v_email
    into v_customer_id, v_verified
    from public.appointments a
    join public.customers c on c.id = a.customer_id
   where upper(a.reservation_code) = upper(trim(p_reservation_code))
     and (lower(trim(coalesce(c.email, ''))) = v_email
          or lower(trim(coalesce(c.pending_email, ''))) = v_email)
     and a.start_at >= now() - interval '1 day'
   limit 1;

  if v_customer_id is null then
    return false;
  end if;

  insert into public.consent_events
    (customer_id, reservation_code, email, consent_type, granted, policy_version, verified)
  values
    (v_customer_id, upper(trim(p_reservation_code)), v_email, 'privacy_terms', true, p_policy_version, v_verified);

  if p_marketing_opt_in then
    insert into public.consent_events
      (customer_id, reservation_code, email, consent_type, granted, policy_version, verified)
    values
      (v_customer_id, upper(trim(p_reservation_code)), v_email, 'marketing', true, p_policy_version, v_verified);
  end if;

  -- La aceptación de la política corresponde a quien reservó ese turno.
  update public.customers
     set privacy_accepted_at    = now(),
         privacy_policy_version = p_policy_version
   where id = v_customer_id;

  -- El opt-in de marketing solo se aplica si el email está verificado.
  -- Si no, queda registrado y se aplica cuando Manu apruebe el email.
  if p_marketing_opt_in and v_verified then
    update public.customers
       set marketing_opt_in     = true,
           marketing_opt_in_at  = now(),
           marketing_opt_out_at = null
     where id = v_customer_id;
  end if;

  return true;
end;
$$;

revoke all on function public.record_booking_consent(text, text, text, boolean) from public;
grant execute on function public.record_booking_consent(text, text, text, boolean) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Aprobar o rechazar el email pendiente de un cliente histórico
-- (solo admins; se usa desde Admin → Clientes).
--
--   Aprobar  = es la misma persona: el email pasa a ser el del cliente
--              y sus turnos web quedan confirmados en su historial.
--   Rechazar = NO es la misma persona: se crea un cliente nuevo con los
--              datos que cargó en la web y se le pasan esos turnos, así
--              el historial y los puntos del cliente histórico no se mezclan.
-- ---------------------------------------------------------------------
create or replace function public.resolve_pending_email(
  p_customer_id uuid,
  p_approve     boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer  record;
  v_marketing boolean;
  v_new_id    uuid;
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  select * into v_customer
    from public.customers
   where id = p_customer_id;

  if not found or v_customer.pending_email is null then
    return;
  end if;

  if p_approve then
    select exists (
      select 1 from public.consent_events
       where customer_id = p_customer_id
         and email = v_customer.pending_email
         and consent_type = 'marketing'
         and granted
    ) into v_marketing;

    update public.customers
       set email                      = v_customer.pending_email,
           email_verified_at          = now(),
           pending_email              = null,
           pending_full_name          = null,
           pending_email_requested_at = null,
           marketing_opt_in           = marketing_opt_in or v_marketing,
           marketing_opt_in_at        = case when v_marketing and not marketing_opt_in
                                             then now() else marketing_opt_in_at end
     where id = p_customer_id;

    update public.appointments
       set pending_identity = false
     where customer_id = p_customer_id
       and pending_identity;

    update public.consent_events
       set verified = true
     where customer_id = p_customer_id
       and email = v_customer.pending_email;

    return;
  end if;

  -- Rechazo: separar en un cliente nuevo.
  insert into public.customers (full_name, phone, email)
  values (
    coalesce(v_customer.pending_full_name, v_customer.full_name),
    v_customer.phone,
    v_customer.pending_email
  )
  returning id into v_new_id;

  update public.appointments
     set customer_id      = v_new_id,
         pending_identity = false
   where customer_id = p_customer_id
     and pending_identity;

  update public.consent_events
     set customer_id = v_new_id
   where customer_id = p_customer_id
     and email = v_customer.pending_email;

  update public.customers
     set pending_email              = null,
         pending_full_name          = null,
         pending_email_requested_at = null
   where id = p_customer_id;
end;
$$;

revoke all on function public.resolve_pending_email(uuid, boolean) from public, anon;
grant execute on function public.resolve_pending_email(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Baja de comunicaciones comerciales (solo admins, desde Clientes).
-- ---------------------------------------------------------------------
create or replace function public.set_marketing_opt_in(
  p_customer_id uuid,
  p_opt_in      boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'No autorizado' using errcode = '42501';
  end if;

  update public.customers
     set marketing_opt_in     = p_opt_in,
         marketing_opt_in_at  = case when p_opt_in then now() else marketing_opt_in_at end,
         marketing_opt_out_at = case when p_opt_in then null else now() end
   where id = p_customer_id;

  insert into public.consent_events (customer_id, consent_type, granted, source)
  values (p_customer_id, 'marketing', p_opt_in, 'admin_panel');
end;
$$;

revoke all on function public.set_marketing_opt_in(uuid, boolean) from public, anon;
grant execute on function public.set_marketing_opt_in(uuid, boolean) to authenticated;
