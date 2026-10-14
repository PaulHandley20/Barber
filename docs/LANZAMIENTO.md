# Don Segundo · Guía de lanzamiento

Checklist para dejar la web en producción. Marcado con ✅ lo que ya quedó
resuelto en el código; con ☐ lo que hay que hacer a mano (Supabase, Vercel,
dominio y pruebas reales).

---

## 0. Orden recomendado

1. Supabase: diagnóstico → migraciones → registrar admin → apagar registro público.
2. Vercel: variables de entorno → deploy → dominio.
3. Supabase Auth: URL del sitio de producción.
4. Pruebas en producción (punto 6) desde el celular.
5. Anunciar.

---

## 1. Supabase

### 1.1 Diagnóstico (solo lectura)

☐ Abrir **Supabase → SQL Editor → New query**, pegar todo `supabase/diagnostics.sql` y tocar **Run**. Devuelve una sola celda (`diagnostico`): copiarla entera.
Revisar especialmente:

- **Consulta 1:** todas las tablas con `rls_enabled = true`.
- **Consulta 2:** ninguna política de `customers`, `appointments`,
  `loyalty_*` o `consent_events` debe incluir los roles `anon` o `public`
  para SELECT/UPDATE/DELETE. Si existe, cualquiera con la clave pública
  puede leer los datos de los clientes. `services` sí puede tener lectura
  pública.
- **Consulta 3:** cómo `create_web_appointment` busca al cliente existente.
- **Consulta 6:** en `auth.users` solo deberían estar Manu (y vos).

### 1.2 Migraciones

> **Forma más fácil:** pegar `supabase/migrar_todo.sql` (las 8 juntas, en
> una transacción) en SQL Editor → New query → Run. Si se edita alguna
> migración, regenerar ese archivo.

☐ Ejecutar en el SQL Editor, **en este orden**, cada archivo de
`supabase/migrations/` (son idempotentes: se pueden volver a correr):

| Archivo | Qué hace |
| --- | --- |
| `…0100_admin_access.sql` | Tabla `admin_users` y función `is_admin()` |
| `…0200_customer_identity_protection.sql` | La web pública ya no puede cambiar nombre/teléfono/email de un cliente existente; el email nuevo queda "pendiente de verificar" |
| `…0300_privacy_consent.sql` | Consentimiento de privacidad y de marketing (por separado), historial `consent_events`, aprobación de emails pendientes |
| `…0400_public_booking.sql` | Horarios/reglas públicas para el calendario y búsqueda de reservas con email + teléfono |
| `…0500_availability.sql` | Nueva `get_available_slots`: respeta horarios (Primer turno / Último turno **inclusive**), pausa, **períodos bloqueados** del panel, turnos tomados, anticipación y días máximos. Un trigger impide que la web reserve en un horario no disponible. El panel (admin) no tiene esa restricción |
| `…0600_horarios_lunes_a_viernes.sql` | Deja el horario en lunes a viernes, turnos de 08:00 a 18:00 inclusive; sábado y domingo cerrados |
| `…0700_web_booking_functions.sql` | Reescribe `create_web_appointment`, `reschedule_reservation` y `cancel_reservation` para que usen la misma regla de disponibilidad (tablas del panel). Resuelve clientes históricos por teléfono con verificación. Cancelar/reprogramar respeta la anticipación de Configuración |
| `…0800_security_hardening.sql` | Activa RLS en las tablas de backup (estaban expuestas), cambia las políticas a `is_admin()` y agrega el permiso que faltaba para crear turnos desde la Agenda |
| `…0900_admin_fixes.sql` | "Crear turno" completa solo barbero y código si faltan; un horario por día (Configuración guarda por día) |
| `…1000_table_grants.sql` | Permisos de tabla (GRANT) para que el panel pueda leer y escribir con el usuario admin |
| `…1100_web_booking_notifications.sql` | Marca el origen de cada turno nuevo (`source`: `web` o `panel`) y activa Realtime en `appointments`: la campanita del panel avisa al instante cuando alguien reserva desde la web |
| `…1200_cancel_anytime_and_audit.sql` | Reservar y reprogramar online hasta **1 hora antes**; cancelar online **en cualquier momento antes del turno**. Cada turno guarda quién lo canceló (cliente o panel, con el email del admin), cuándo, y cuándo se marcó "No asistió". Los cancelados no se borran |
| `…1300_one_active_appointment_per_slot.sql` | **Un solo turno activo por horario**: la base rechaza crear o mover un turno (también desde el panel) a un horario que ya tiene otro confirmado, pendiente o completado. Los cancelados no ocupan el horario |

#### Hallazgos del diagnóstico (13/10/2026)

- **Las tablas `backup_*` y `migration_backup_*` no tenían RLS**: con la
  clave pública de la web se podían leer (nombres y teléfonos). Lo
  corrige la 08. Si ya no se usan, conviene borrarlas.
- **La web usaba tablas viejas** (`business_hours`, `schedule_blocks`)
  que el panel no modifica: por eso bloquear un día o cambiar horarios no
  impactaba en la web. Lo corrigen la 05 y la 07.
- `reschedule_reservation` leía columnas de `business_hours` distintas de
  las que leía `get_available_slots`: una de las dos fallaba.
- **Crear turno desde la Agenda fallaba**: `appointments` no tenía
  política de INSERT. Lo corrige la 08.
- **Admin → Horarios no podía guardar pausas ni bloqueos**: faltaban las
  columnas `has_break`, `break_start`, `break_end` y `all_day`. Las
  agrega la 04.
- 84 de 85 clientes no tienen email: la 07 los reconoce por teléfono sin
  modificar sus datos (ver punto 2).
- `get_reservation_by_code` no devuelve datos personales del cliente
  (bien, por privacidad); la web ya no muestra esos campos vacíos.

Las migraciones fueron probadas sobre PostgreSQL 16 con un esquema
equivalente (ver punto 7). Si alguna falla por un nombre de columna
distinto, mandame el resultado de la consulta 4 del diagnóstico.

### 1.3 Registrar a Manu como admin

☐ En el SQL Editor (cambiando el email):

```sql
insert into public.admin_users (user_id, email)
select id, email from auth.users where email = 'EMAIL_DE_MANU@gmail.com'
on conflict (user_id) do nothing;
```

### 1.4 Apagar el registro público de usuarios

☐ **Authentication → Sign In / Providers → Email → "Allow new users to sign up" = OFF.**
Sin esto, cualquiera podría crearse una cuenta con la clave pública.

### 1.5 Endurecer RLS

✅ Lo hace la migración 08. Solo falta el paso 1.3 (registrar a Manu).

### 1.5.b (anterior) Endurecer RLS manualmente

☐ Con el resultado de la consulta 2, reemplazar las políticas de las tablas
privadas por `using (public.is_admin())` (hay un ejemplo al final de
`…0100_admin_access.sql`). Si querés, mandame el resultado y te armo el
script exacto.

### 1.6 URL del sitio

☐ **Authentication → URL Configuration → Site URL** = el dominio final
(`https://…`). Agregarlo también en *Redirect URLs*.

---

## 2. Clientes históricos sin email (flujo seguro)

✅ Implementado en `create_web_appointment` (migración 07):

1. **Email ya registrado** → se usa ese cliente; el teléfono tiene que
   coincidir (se comparan solo los dígitos, así "3442 12-3456" y
   "3442123456" valen igual).
2. **Email nuevo + teléfono de un cliente histórico sin email** → el turno
   se asocia a ese cliente (suma en su historial y fidelización), pero
   **no se modifica ningún dato**: el email y el nombre que escribió quedan
   como *pendientes de verificar* y el turno queda marcado.
3. En **Admin → Clientes** aparece la etiqueta *Email por verificar* con
   el nombre con el que reservó. Manu confirma la identidad (en el local o
   escribiéndole al teléfono registrado):
   - **Aprobar** → el email queda guardado y verificado.
   - **Rechazar** → se crea un cliente nuevo con los datos de la web y se
     le pasa esa reserva; el cliente histórico queda como estaba.
4. **Nada coincide** → cliente nuevo.
5. La búsqueda sin código de `/gestionar-reserva` solo usa emails
   verificados, y la consulta por código no muestra datos personales.

☐ **Prueba con un cliente histórico real:** reservar desde la web con su
teléfono y un email de prueba → ver la etiqueta en Clientes → aprobar o
rechazar → cancelar la reserva de prueba.

> Recomendación: que Manu verifique antes de tocar "Completar" en un turno
> marcado, así los puntos van a la persona correcta.

---

## 2.b Horarios, bloqueos y turnos pasados

✅ En Admin → Horarios y en Configuración, los campos ahora dicen
**Primer turno** y **Último turno** (el último se puede reservar).

✅ Lo que Manu bloquea en **Admin → Horarios → Períodos bloqueados**
(vacaciones, feriados, una franja de un día) desaparece de la web:
los días completos se muestran tachados en el calendario y las franjas
parciales no ofrecen horarios.

✅ **Turnos que ya pasaron:** en Admin → Agenda → Crear turno, elegir la
fecha/hora real (por ejemplo hoy 11:00) y tildar **"Ya fue atendido"**
(se tilda solo si la fecha ya pasó). El turno queda **completado** y pasa
por el mismo camino que el botón "Completar", así que suma la visita y
los puntos de fidelización.

☐ Probar en producción: crear un turno pasado para un cliente y verificar
en Fidelización que se le sumaron los puntos.

---

## 3. Privacidad, términos y consentimiento

✅ `/privacidad` (Ley 25.326, con la leyenda obligatoria de la AAIP):
qué datos se recopilan, para qué, base legal, proveedores externos
(Supabase y Vercel), conservación, seguridad y cómo pedir acceso,
corrección o eliminación.

✅ `/terminos`: reservas, cancelación/reprogramación, puntualidad,
precios y pago en el local, fidelización, ley aplicable.

✅ Formulario de reserva:
- Casilla **obligatoria**: "Leí y acepto la Política de privacidad y los Términos" (con enlaces).
- Casilla **opcional y separada**: novedades y promociones. Nunca es necesaria para reservar.
- Se guarda fecha, versión del texto (`LEGAL_VERSION`) y ambas decisiones en `consent_events`.
- Manu puede dar de baja de novedades a un cliente desde Admin → Clientes
  (nunca darlo de alta: eso solo lo hace el cliente).

☐ Que Manu lea y confirme estos puntos de los textos (están como valores
por defecto en `lib/barbershop.ts` → `DEFAULT_BOOKING_RULES`):
- Anticipación para cancelar/reprogramar online: **3 horas** (debe coincidir con *Configuración → horas de anticipación para cancelar* del panel).
- Tolerancia de llegada tarde: **10 minutos**.
- Conservación de datos: 24 meses sin turnos.
- Hosting: si no se usa Vercel, cambiar el proveedor en `/privacidad`.

☐ Recomendado: inscribir la base de datos en el **Registro Nacional de
Bases de Datos** de la AAIP (trámite gratuito en argentina.gob.ar) y, si se
puede, que un abogado revise los textos.

---

## 4. Variables de entorno y deploy (Vercel)

☐ En **Vercel → Project → Settings → Environment Variables** (entorno *Production*):

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase de producción |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave **publicable/anon** (nunca la `service_role`) |
| `NEXT_PUBLIC_SITE_URL` | `https://<dominio final>` |
| `NEXT_PUBLIC_BARBERSHOP_WHATSAPP` | Ej. `5493442123456` (opcional) |
| `ADMIN_EMAILS` | Email(s) de Manu, separados por coma |

✅ Verificado: el código no usa ninguna clave secreta. Lo único que llega
al navegador es la URL y la clave publicable, que son públicas por diseño.
`.env*` está en `.gitignore`.

☐ Confirmar que la URL de Supabase es la de **producción** (la de
`next.config.ts` → `images.remotePatterns` también debe coincidir).

☐ **Dominio:** Vercel → Settings → Domains → agregar el dominio y cargar en
el proveedor (ej. NIC.ar + DNS) los registros que indica Vercel.

☐ **HTTPS:** Vercel emite el certificado automáticamente. Verificar que
`http://` redirige a `https://` y que el candado aparece.

✅ Encabezados de seguridad (HSTS, anti-iframe, nosniff, etc.), `robots.txt`
(no indexa `/admin`), `sitemap.xml`, favicon/íconos con el logo y vista
previa al compartir (Open Graph).

---

## 5. Revisión visual / UX

✅ Hecho y probado (Chromium, 390 px, 820 px y 1440 px, sin scroll horizontal):
- Landing responsive: menú hamburguesa en mobile, secciones apiladas,
  línea de tiempo en carrusel horizontal en mobile/tablet, galería y CTA adaptados.
- Cursor de "manito" en todo lo clickeable (web y panel) y foco visible para teclado.
- `/reservar`: círculo de selección visible en cada servicio, pasos que se
  contraen mostrando lo elegido (con "Cambiar"), barra de progreso en
  mobile, validación de datos con mensajes claros, calendario con los días
  y horarios reales del panel, errores entendibles.
- Confirmación: código con botón copiar, agendar en Google Calendar, ir a
  "Mi reserva", WhatsApp y **Volver al inicio**. Se eliminó el texto que
  decía que se había enviado un email (no hay envío de emails).
- `/gestionar-reserva`: búsqueda con código **o con email + teléfono**,
  contacto (WhatsApp, Instagram, email, dirección), confirmación de
  cancelación en pantalla, bloqueo de cambios a menos de N horas.
- Páginas 404 y de error con la estética del sitio.
- Imágenes optimizadas: de 22,5 MB a 3,8 MB en total.
- Servicios inactivos ya no aparecen en la landing; cada tarjeta lleva a
  reservar ese servicio.
- Se eliminaron las páginas de prueba públicas (`/supabase-test`,
  `/slots-test`, `/booking-test`, `/api/supabase-test`).

☐ Pendiente de revisar con datos reales: Agenda, Clientes, Configuración,
precios, horarios y textos del panel; flujo completo desde el teléfono
de Manu.

---

## 6. Control final antes de anunciar (en producción)

☐ Desde un celular, en el dominio final:

1. Reservar un turno real de prueba (con tu email/teléfono).
2. Ver en Supabase → `appointments` que se guardó; en `customers` el
   cliente; en `consent_events` la aceptación.
3. Ver que aparece en **Admin → Agenda/Turnos** con cliente y servicio correctos.
4. En `/gestionar-reserva`: buscar con el código y también con email + teléfono.
5. Reprogramar y verificar el cambio en Agenda.
6. Cancelar y verificar el estado.
7. Abrir la consola del navegador (desktop, F12) en `/`, `/reservar`,
   `/gestionar-reserva` y `/admin`: sin errores en rojo.
8. Entrar a `/admin` con una cuenta que **no** esté en `ADMIN_EMAILS`:
   debe rechazarla.
9. Eliminar/cancelar la reserva de prueba.

---

## 7. Próximo: emails desde el Gmail de la barbería

Pendiente para el final (pedido de Paul): enviar un email al reservar con
la confirmación del turno, los puntos acumulados y los premios
disponibles. Opciones: Gmail con contraseña de aplicación (SMTP) para
volúmenes chicos, o un servicio como Resend con el dominio propio (mejor
entregabilidad). Se dispara desde una Supabase Edge Function o una ruta
de Next.js.

---

## 8. Cómo se probó

- `npm run build` sin errores (TypeScript incluido).
- Migraciones aplicadas dos veces seguidas sobre PostgreSQL 16 con un
  esquema simulado de Supabase (roles `anon`/`authenticated`,
  `auth.uid()`), probando: intento de "pisar" un cliente por teléfono
  (bloqueado y desviado a pendiente), registro de consentimiento con email
  correcto e incorrecto, búsqueda por email + teléfono (no matchea emails
  pendientes), aprobación/rechazo por admin, bloqueo para usuarios no admin
  y para `anon`.
- Flujo completo en navegador (Playwright) contra un Supabase simulado:
  reserva → confirmación → gestionar por código → reprogramar → buscar sin
  código → cancelar.
