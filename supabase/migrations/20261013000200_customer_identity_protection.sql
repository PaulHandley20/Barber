-- =====================================================================
-- 02 · CLIENTES HISTÓRICOS SIN EMAIL · FLUJO SEGURO
-- =====================================================================
-- Problema: muchos clientes históricos tienen teléfono pero no email.
-- Si una reserva web se asocia a un cliente existente solo por el
-- teléfono, cualquiera que conozca ese número podría "pegarle" su email
-- a otra persona (o cambiarle el nombre).
--
-- Solución:
--   1. Un visitante anónimo (la web pública) NUNCA puede modificar el
--      nombre, teléfono o email de un cliente existente.
--   2. Si la reserva trae un email nuevo para un cliente existente, se
--      guarda en pending_email ("email pendiente de verificar").
--   3. Manu verifica la identidad (en persona el día del turno, o
--      escribiéndole al teléfono que ya estaba registrado) y desde
--      Admin → Clientes aprueba o rechaza el email.
--
-- No depende de cómo esté escrita create_web_appointment: el control
-- lo hace un trigger sobre la tabla customers.
-- =====================================================================

alter table public.customers
  add column if not exists pending_email              text,
  add column if not exists pending_full_name          text,
  add column if not exists pending_email_requested_at timestamptz,
  add column if not exists email_verified_at          timestamptz;

-- Turnos web asociados a un cliente histórico solo por el teléfono.
-- Quedan marcados hasta que Manu verifique la identidad.
alter table public.appointments
  add column if not exists pending_identity boolean not null default false;

create or replace function public.protect_customer_identity()
returns trigger
language plpgsql
as $$
declare
  v_role text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
  v_new_email text := nullif(lower(trim(coalesce(new.email, ''))), '');
begin
  if v_role <> 'anon' then
    return new;
  end if;

  if v_new_email is not null
     and v_new_email is distinct from lower(trim(coalesce(old.email, ''))) then
    new.pending_email := v_new_email;
    new.pending_email_requested_at := now();
  end if;

  new.email     := old.email;
  new.full_name := old.full_name;
  new.phone     := old.phone;
  new.email_verified_at := old.email_verified_at;

  return new;
end;
$$;

drop trigger if exists protect_customer_identity on public.customers;
create trigger protect_customer_identity
  before update on public.customers
  for each row
  execute function public.protect_customer_identity();

-- La aprobación/rechazo del email pendiente (resolve_pending_email)
-- se define en la migración 03, junto con el registro de consentimientos.
