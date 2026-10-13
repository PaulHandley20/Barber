# Don Segundo · Web y sistema de reservas

Web pública + reservas online + panel de administración (BarberOS) para
**Don Segundo Barbería** (Mitre 866, Concepción del Uruguay, Entre Ríos).

- **Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · Supabase (Postgres + Auth) · Framer Motion.
- **Hosting recomendado:** Vercel.

## Rutas

| Ruta | Qué es |
| --- | --- |
| `/` | Landing (nosotros, servicios, galería, historia, contacto) |
| `/reservar` | Reserva en 5 pasos. Acepta `?servicio=<id>` para preseleccionar |
| `/gestionar-reserva` | Consultar, reprogramar o cancelar (con código o con email + teléfono). Acepta `?codigo=DS-XXXX` |
| `/privacidad`, `/terminos` | Textos legales (Ley 25.326) |
| `/admin` | Panel de Manu (protegido por login + `ADMIN_EMAILS`) |

## Desarrollo

```bash
cp .env.example .env.local   # completar valores
npm install
npm run dev                  # http://localhost:3000
npm run build                # build de producción (incluye chequeo de tipos)
```

## Dónde se cambia cada cosa

- **Datos de contacto, dirección, Instagram, email:** `lib/barbershop.ts`.
- **Horarios, servicios, precios, días de anticipación:** desde el panel (`/admin/horarios`, `/admin/servicios`, `/admin/configuracion`). La web pública los lee de Supabase.
- **Versión de los textos legales:** `LEGAL_VERSION` en `lib/barbershop.ts` (cambiarla cada vez que se edita `/privacidad` o `/terminos`).

## Base de datos

Las funciones nuevas están en `supabase/migrations/` y se aplican en
Supabase → SQL Editor, en orden. Antes, correr `supabase/diagnostics.sql`.
Todo el paso a paso está en [`docs/LANZAMIENTO.md`](docs/LANZAMIENTO.md).
