"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Clock3, MapPin, ShieldCheck } from "lucide-react";
import { BARBERSHOP } from "@/lib/barbershop";

/*
  Kit visual de reservas (Don Segundo).

  Lo comparten /reservar (flujo + confirmación) y /gestionar-reserva
  (Mi reserva), así las tres pantallas se ven como una sola experiencia
  y con la misma estética de la landing: negro cálido, dorado, crema,
  títulos en serif y botones crema redondeados.
*/

/* ---------------------------------------------------------
   Paleta
   --------------------------------------------------------- */
export const BOOKING_BG = "#100f0d";

/* ---------------------------------------------------------
   Clases reutilizables
   --------------------------------------------------------- */
export const bookingLabelClass =
  "mb-2.5 block text-[10px] font-semibold uppercase tracking-[0.26em] text-[#a88d68]";

export const bookingInputClass =
  "w-full rounded-xl border border-[#EADFCB]/10 bg-[#0c0b0a] px-4 py-3.5 text-[15px] text-[#F4EEE5] outline-none transition placeholder:text-[#5f5a52] hover:border-[#EADFCB]/20 focus:border-[#b08a5a] focus:ring-2 focus:ring-[#b08a5a]/15";

export const bookingPrimaryButtonClass =
  "group inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-[#EADFCB] px-7 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#1b1915] transition hover:bg-[#F4ECDD] hover:shadow-[0_14px_40px_rgba(234,223,203,.12)] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-[#4a463f] disabled:text-[#9b9388] disabled:shadow-none";

export const bookingSecondaryButtonClass =
  "inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full border border-[#EADFCB]/20 px-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ddd6cc] transition hover:border-[#EADFCB]/60 hover:bg-[#EADFCB]/[0.04] hover:text-[#F4EEE5] disabled:cursor-not-allowed disabled:opacity-45";

export const bookingDangerButtonClass =
  "inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full border border-red-400/25 bg-red-500/[0.06] px-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-red-200 transition hover:border-red-300/50 hover:bg-red-500/[0.12] disabled:cursor-not-allowed disabled:opacity-45";

/* Tarjeta base (pasos, buscador, paneles). */
export const bookingCardClass =
  "rounded-[22px] border border-[#EADFCB]/[0.09] bg-[#171613]";

/* ---------------------------------------------------------
   Barra superior con la marca
   --------------------------------------------------------- */
export function BookingTopBar({
  current,
  onReserveClick,
}: {
  current: "reservar" | "mi-reserva";
  /* Si se pasa, reemplaza la navegación del botón "Reservar" (ej. empezar una reserva nueva). */
  onReserveClick?: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#EADFCB]/[0.07] bg-[#100f0d]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 md:h-[72px] lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Volver al inicio">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-9 w-9 shrink-0 object-contain md:h-10 md:w-10" />
          <span className="hidden leading-none sm:block">
            <span className="block font-serif text-[15px] tracking-[0.12em] text-[#F4EEE5]">
              DON SEGUNDO
            </span>
            <span className="mt-1 block text-[9px] uppercase tracking-[0.26em] text-[#a88d68]">
              Barbería exclusiva
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-2" aria-label="Reservas">
          <Link
            href="/"
            className="hidden items-center gap-2 rounded-full px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8d877e] transition hover:text-[#F4EEE5] md:inline-flex"
          >
            <ArrowLeft size={13} />
            Inicio
          </Link>

          <Link
            href="/reservar"
            onClick={
              onReserveClick
                ? (event) => {
                    event.preventDefault();
                    onReserveClick();
                  }
                : undefined
            }
            aria-current={current === "reservar" ? "page" : undefined}
            className={`rounded-full px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
              current === "reservar"
                ? "bg-[#EADFCB] text-[#1b1915]"
                : "border border-[#EADFCB]/20 text-[#ddd6cc] hover:border-[#EADFCB]/50"
            }`}
          >
            Reservar
          </Link>

          <Link
            href="/gestionar-reserva"
            aria-current={current === "mi-reserva" ? "page" : undefined}
            className={`rounded-full px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] transition ${
              current === "mi-reserva"
                ? "bg-[#EADFCB] text-[#1b1915]"
                : "border border-[#EADFCB]/20 text-[#ddd6cc] hover:border-[#EADFCB]/50"
            }`}
          >
            Mi reserva
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* ---------------------------------------------------------
   Encabezado con foto de la barbería
   --------------------------------------------------------- */
export function BookingHero({
  image,
  eyebrow,
  title,
  subtitle,
  hoursLabel,
  children,
  align = "left",
}: {
  image: string;
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  hoursLabel?: string;
  children?: ReactNode;
  align?: "left" | "center";
}) {
  const centered = align === "center";

  return (
    <section className="relative isolate overflow-hidden border-b border-[#EADFCB]/[0.07]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full object-cover opacity-[0.32]"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(16,15,13,.55)_0%,rgba(16,15,13,.82)_55%,#100f0d_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(16,15,13,.92)_0%,rgba(16,15,13,.35)_70%,rgba(16,15,13,.6)_100%)]" />

      <div
        className={`mx-auto max-w-7xl px-4 pb-10 pt-10 sm:px-6 md:pb-14 md:pt-16 lg:px-8 ${
          centered ? "text-center" : ""
        }`}
      >
        <div className={`flex items-center gap-3 ${centered ? "justify-center" : ""}`}>
          <span className="h-px w-10 bg-[#b08a5a]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#c9a46e]">
            {eyebrow}
          </p>
          {centered ? <span className="h-px w-10 bg-[#b08a5a]" /> : null}
        </div>

        <h1
          className={`mt-5 font-serif text-[clamp(2.3rem,6vw,4.6rem)] leading-[1.02] text-[#F4EEE5] ${
            centered ? "mx-auto max-w-4xl" : "max-w-3xl"
          }`}
        >
          {title}
        </h1>

        {subtitle ? (
          <p
            className={`mt-5 text-[15px] leading-7 text-[#c2b9ac] md:text-base ${
              centered ? "mx-auto max-w-2xl" : "max-w-2xl"
            }`}
          >
            {subtitle}
          </p>
        ) : null}

        <div
          className={`mt-7 flex flex-wrap gap-2 ${centered ? "justify-center" : ""}`}
        >
          <HeroChip icon={<MapPin size={13} />}>
            {BARBERSHOP.address}, {BARBERSHOP.city}
          </HeroChip>
          {hoursLabel ? <HeroChip icon={<Clock3 size={13} />}>{hoursLabel}</HeroChip> : null}
          <HeroChip icon={<ShieldCheck size={13} />}>Confirmación al instante</HeroChip>
        </div>

        {children}
      </div>
    </section>
  );
}

function HeroChip({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[#EADFCB]/[0.12] bg-[#100f0d]/55 px-3.5 py-2 text-[12px] text-[#d9d0c3] backdrop-blur-sm">
      <span className="text-[#c9a46e]">{icon}</span>
      {children}
    </span>
  );
}

/* ---------------------------------------------------------
   Comprobante de turno (ticket)
   --------------------------------------------------------- */
export type TicketTone = "confirmed" | "draft" | "cancelled" | "neutral";

const TONE: Record<TicketTone, { label: string; className: string }> = {
  confirmed: {
    label: "Confirmado",
    className: "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200",
  },
  draft: {
    label: "Sin confirmar",
    className: "border-[#EADFCB]/15 bg-[#EADFCB]/[0.05] text-[#c2b9ac]",
  },
  cancelled: {
    label: "Cancelado",
    className: "border-red-300/25 bg-red-300/[0.08] text-red-200",
  },
  neutral: {
    label: "",
    className: "border-[#EADFCB]/15 bg-[#EADFCB]/[0.05] text-[#c2b9ac]",
  },
};

export function BookingTicket({
  tone,
  statusLabel,
  startAt,
  endAt,
  serviceName,
  durationMinutes,
  price,
  barber,
  code,
  codeAction,
  notchColor = BOOKING_BG,
  footer,
  compact = false,
  timeKnown = true,
}: {
  tone: TicketTone;
  statusLabel?: string;
  /* ISO del inicio (si todavía no se eligió, se muestran guiones). */
  startAt?: string | null;
  endAt?: string | null;
  serviceName?: string | null;
  durationMinutes?: number | null;
  price?: number | null;
  barber?: string | null;
  code?: string | null;
  codeAction?: ReactNode;
  notchColor?: string;
  footer?: ReactNode;
  compact?: boolean;
  /* false cuando ya hay día pero todavía no horario. */
  timeKnown?: boolean;
}) {
  const start = startAt ? new Date(startAt) : null;
  const toneMeta = TONE[tone];
  const timeZone = "America/Argentina/Buenos_Aires";

  const weekday = start
    ? new Intl.DateTimeFormat("es-AR", { weekday: "long", timeZone }).format(start)
    : "Día";
  const day = start
    ? new Intl.DateTimeFormat("es-AR", { day: "numeric", timeZone }).format(start)
    : "—";
  const monthYear = start
    ? new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone }).format(start)
    : "Elegí una fecha";
  const time = (value: string | null | undefined) =>
    value
      ? new Intl.DateTimeFormat("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
          timeZone,
        }).format(new Date(value))
      : "--:--";

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-[#EADFCB]/[0.12] bg-[linear-gradient(180deg,#1d1b17_0%,#171613_100%)] shadow-[0_30px_90px_rgba(0,0,0,.35)]">
      {/* Cabecera */}
      <div className={`flex items-center justify-between gap-3 ${compact ? "px-5 pt-5" : "px-6 pt-6 md:px-8 md:pt-7"}`}>
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
          <div className="min-w-0 leading-none">
            <p className="truncate font-serif text-[15px] tracking-[0.1em] text-[#F4EEE5]">
              DON SEGUNDO
            </p>
            <p className="mt-1 truncate text-[9px] uppercase tracking-[0.2em] text-[#a88d68]">
              {compact ? (
                "Tu turno"
              ) : (
                <>
                  <span className="sm:hidden">Tu turno</span>
                  <span className="hidden sm:inline">Comprobante de turno</span>
                </>
              )}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneMeta.className}`}
        >
          {statusLabel ?? toneMeta.label}
        </span>
      </div>

      {/* Fecha y hora */}
      <div
        className={`grid grid-cols-[auto_minmax(0,1fr)] items-end gap-5 ${
          compact ? "px-5 pb-5 pt-6" : "px-6 pb-7 pt-8 md:px-8"
        }`}
      >
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#a88d68]">
            {weekday}
          </p>
          <p
            className={`font-serif leading-none text-[#F4EEE5] ${
              compact ? "mt-1 text-[52px]" : "mt-2 text-[64px] md:text-[76px]"
            }`}
          >
            {day}
          </p>
        </div>

        <div className="min-w-0 border-l border-[#EADFCB]/[0.1] pb-1.5 pl-5">
          <p className="truncate text-[12px] text-[#a39a8e] first-letter:uppercase">{monthYear}</p>
          <p
            className={`mt-1 font-serif leading-none text-[#e3c591] ${
              compact ? "text-[34px]" : "text-[40px] md:text-[48px]"
            }`}
          >
            {timeKnown ? time(startAt) : "--:--"}
          </p>
          <p className="mt-2 truncate text-[12px] text-[#a39a8e]">
            {endAt ? `hasta las ${time(endAt)}` : timeKnown && startAt ? "Horario" : "Elegí un horario"}
            {durationMinutes ? ` · ${durationMinutes} min` : ""}
          </p>
        </div>
      </div>

      {/* Corte troquelado */}
      <div className="relative h-0">
        <span
          className="absolute -left-3 -top-3 h-6 w-6 rounded-full border-r border-[#EADFCB]/[0.12]"
          style={{ background: notchColor }}
        />
        <span
          className="absolute -right-3 -top-3 h-6 w-6 rounded-full border-l border-[#EADFCB]/[0.12]"
          style={{ background: notchColor }}
        />
        <div className="mx-6 border-t border-dashed border-[#EADFCB]/[0.16]" />
      </div>

      {/* Detalle */}
      <dl className={`grid gap-4 ${compact ? "px-5 py-5" : "px-6 py-6 md:px-8"}`}>
        <TicketRow label="Servicio" value={serviceName ?? "Elegí un servicio"} muted={!serviceName} />
        <TicketRow label="Barbero" value={barber ?? BARBERSHOP.barber} />
        {code ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7d756a]">
              Código
            </dt>
            <dd className="flex min-w-0 items-center gap-2">
              <span className="truncate font-mono text-[15px] tracking-[0.14em] text-[#e3c591]">
                {code}
              </span>
              {codeAction}
            </dd>
          </div>
        ) : null}
        <div className="flex items-end justify-between gap-3 border-t border-[#EADFCB]/[0.08] pt-4">
          <dt className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7d756a]">
            Total
            <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-[#6f685e]">
              Se abona en el local
            </span>
          </dt>
          <dd className="font-serif text-[26px] leading-none text-[#F4EEE5]">
            {typeof price === "number" ? `$${price.toLocaleString("es-AR")}` : "$0"}
          </dd>
        </div>
      </dl>

      {footer ? (
        <div className="border-t border-[#EADFCB]/[0.08] bg-[#100f0d]/40 px-6 py-5 md:px-8">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

function TicketRow({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7d756a]">{label}</dt>
      <dd className={`min-w-0 truncate text-right text-[15px] ${muted ? "text-[#6f685e]" : "text-[#F4EEE5]"}`}>
        {value}
      </dd>
    </div>
  );
}

/* ---------------------------------------------------------
   Horarios agrupados (mañana / tarde)
   --------------------------------------------------------- */
export function TimeSlotGroups<T extends { slot_start: string }>({
  slots,
  isSelected,
  onSelect,
  formatTime,
}: {
  slots: T[];
  isSelected: (slot: T) => boolean;
  onSelect: (slot: T) => void;
  formatTime: (iso: string) => string;
}) {
  const hourOf = (iso: string) =>
    Number(
      new Intl.DateTimeFormat("es-AR", {
        hour: "2-digit",
        hourCycle: "h23",
        timeZone: "America/Argentina/Buenos_Aires",
      }).format(new Date(iso))
    );

  const groups = [
    { key: "manana", label: "Mañana", items: slots.filter((slot) => hourOf(slot.slot_start) < 13) },
    { key: "tarde", label: "Tarde", items: slots.filter((slot) => hourOf(slot.slot_start) >= 13) },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.key}>
          <div className="mb-3 flex items-center gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#a88d68]">
              {group.label}
            </p>
            <span className="h-px flex-1 bg-[#EADFCB]/[0.07]" />
            <span className="text-[11px] text-[#7d756a]">
              {group.items.length} {group.items.length === 1 ? "horario" : "horarios"}
            </span>
          </div>

          <div
            role="radiogroup"
            aria-label={`Horarios de la ${group.label.toLowerCase()}`}
            className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 md:gap-2.5"
          >
            {group.items.map((slot) => {
              const selected = isSelected(slot);

              return (
                <button
                  key={slot.slot_start}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onSelect(slot)}
                  className={`min-h-[48px] rounded-full border text-[15px] tabular-nums transition ${
                    selected
                      ? "border-[#EADFCB] bg-[#EADFCB] font-semibold text-[#1b1915] shadow-[0_10px_30px_rgba(234,223,203,.12)]"
                      : "border-[#EADFCB]/[0.12] bg-[#0f0e0c] text-[#ddd6cc] hover:border-[#b08a5a] hover:text-[#F4EEE5]"
                  }`}
                >
                  {formatTime(slot.slot_start)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* Rótulo chico dorado reutilizable */
export function BookingEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#a88d68]">
      {children}
    </p>
  );
}
