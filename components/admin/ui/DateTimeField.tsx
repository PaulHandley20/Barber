"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { adminFontVariables } from "@/components/admin/fonts";

/*
  DateTimeField · selector de fecha y hora propio del panel.

  Reemplaza a <input type="date" | "time" | "datetime-local"> (que cada
  navegador dibuja distinto, en inglés y con AM/PM) por un calendario y
  una grilla de horarios con el estilo de BarberOS.

  Usa los mismos formatos de texto que los inputs nativos, así que es un
  reemplazo directo:
    mode "datetime" → "YYYY-MM-DDTHH:mm"
    mode "date"     → "YYYY-MM-DD"
    mode "time"     → "HH:mm"
*/

type Mode = "datetime" | "date" | "time";

type Props = {
  value: string;
  onChange: (value: string) => void;
  mode?: Mode;
  placeholder?: string;
  minuteStep?: number;
  /* Rango de horas que se ofrecen en la grilla (inclusive). */
  hourStart?: number;
  hourEnd?: number;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
};

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

const pad = (value: number) => String(value).padStart(2, "0");

function toDateKey(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseValue(value: string, mode: Mode) {
  if (!value) return { date: "", time: "" };
  if (mode === "time") return { date: "", time: value.slice(0, 5) };
  if (mode === "date") return { date: value.slice(0, 10), time: "" };

  const [date, time = ""] = value.split("T");

  return { date: date ?? "", time: time.slice(0, 5) };
}

function fromDateKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function formatDisplay(value: string, mode: Mode) {
  const { date, time } = parseValue(value, mode);

  if (mode === "time") return time ? `${time} hs` : "";

  if (!date) return "";

  const label = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(fromDateKey(date))
    .replace(/\./g, "");

  const capitalized = label.charAt(0).toUpperCase() + label.slice(1);

  return mode === "datetime" && time ? `${capitalized} · ${time} hs` : capitalized;
}

export default function DateTimeField({
  value,
  onChange,
  mode = "datetime",
  placeholder,
  minuteStep = 15,
  hourStart = 6,
  hourEnd = 23,
  disabled = false,
  className = "",
  ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const parsed = parseValue(value, mode);
  const todayKey = toDateKey(new Date());

  const [viewMonth, setViewMonth] = useState(() => {
    const base = parsed.date ? fromDateKey(parsed.date) : new Date();

    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  useEffect(() => {
    // Los portales solo existen en el navegador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const times = useMemo(() => {
    const list: string[] = [];

    for (let hour = hourStart; hour <= hourEnd; hour += 1) {
      for (let minute = 0; minute < 60; minute += minuteStep) {
        list.push(`${pad(hour)}:${pad(minute)}`);
      }
    }

    // Si el valor actual no cae en la grilla (ej. 11:40), se agrega.
    if (parsed.time && !list.includes(parsed.time)) {
      list.push(parsed.time);
      list.sort();
    }

    return list;
  }, [hourStart, hourEnd, minuteStep, parsed.time]);

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7;

    return Array.from({ length: 42 }, (_, index) => new Date(year, month, index - offset + 1));
  }, [viewMonth]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    function place() {
      const trigger = triggerRef.current?.getBoundingClientRect();
      const popover = popoverRef.current?.getBoundingClientRect();

      if (!trigger) return;

      const width = popover?.width ?? Math.min(424, window.innerWidth - 16);
      const height = popover?.height ?? 360;
      const margin = 8;

      let top = trigger.bottom + margin;
      if (top + height > window.innerHeight - margin && trigger.top - height - margin > margin) {
        top = trigger.top - height - margin;
      }

      let left = trigger.left;
      if (left + width > window.innerWidth - margin) left = window.innerWidth - width - margin;
      if (left < margin) left = margin;

      setPosition({ top, left });
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) return;

      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // Lleva la grilla de horarios al horario elegido.
    const selected = popoverRef.current?.querySelector<HTMLElement>("[data-time-selected='true']");
    selected?.scrollIntoView({ block: "center" });
  }, [open]);

  function emit(date: string, time: string) {
    if (mode === "time") onChange(time);
    else if (mode === "date") onChange(date);
    else onChange(`${date || todayKey}T${time || "10:00"}`);
  }

  function selectDate(key: string) {
    emit(key, parsed.time);
    if (mode === "date") setOpen(false);
  }

  function selectTime(time: string) {
    emit(parsed.date, time);
    if (mode !== "date") setOpen(false);
  }

  const display = formatDisplay(value, mode);
  const Icon = mode === "time" ? Clock3 : CalendarDays;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open && parsed.date) {
            const base = fromDateKey(parsed.date);
            setViewMonth(new Date(base.getFullYear(), base.getMonth(), 1));
          }
          setOpen((current) => !current);
        }}
        className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-[13px] transition ${
          open
            ? "border-[#ff5a00]/50 bg-[#0d0d0d] ring-2 ring-[#ff5a00]/10"
            : "border-white/[.08] bg-[#0b0c0c] hover:border-white/[.16]"
        } disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      >
        <Icon size={15} className="shrink-0 text-white/50" />
        <span className={`flex-1 truncate tabular-nums ${display ? "text-white/88" : "text-white/40"}`}>
          {display || placeholder || (mode === "time" ? "Elegir horario" : "Elegir fecha")}
        </span>
      </button>

      {mounted && open
        ? createPortal(
            <div
              ref={popoverRef}
              role="dialog"
              aria-label={mode === "time" ? "Elegir horario" : "Elegir fecha"}
              className={`${adminFontVariables} fixed z-[300] flex max-h-[calc(100dvh-16px)] max-w-[calc(100vw-16px)] flex-col overflow-y-auto rounded-2xl sm:flex-row sm:overflow-hidden border border-white/[.1] bg-[#121212] shadow-[0_30px_80px_rgba(0,0,0,.6)]`}
              style={{
                top: position?.top ?? -9999,
                left: position?.left ?? -9999,
                fontFamily: "var(--font-barberos-ui), ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {mode !== "time" && (
                <div className="w-[292px] max-w-full p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      type="button"
                      aria-label="Mes anterior"
                      onClick={() =>
                        setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/[.06] hover:text-white"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <p className="text-[14px] font-semibold text-white first-letter:uppercase">
                      {new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(viewMonth)}
                    </p>
                    <button
                      type="button"
                      aria-label="Mes siguiente"
                      onClick={() =>
                        setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/[.06] hover:text-white"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {WEEKDAYS.map((day) => (
                      <span key={day} className="py-1 text-center text-[11px] font-semibold text-white/40">
                        {day}
                      </span>
                    ))}

                    {calendarDays.map((date) => {
                      const key = toDateKey(date);
                      const inMonth = date.getMonth() === viewMonth.getMonth();
                      const selected = key === parsed.date;
                      const isToday = key === todayKey;

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => selectDate(key)}
                          aria-pressed={selected}
                          className={`relative flex h-9 items-center justify-center rounded-lg text-[13px] tabular-nums transition ${
                            selected
                              ? "bg-[#ff5a00] font-semibold text-white"
                              : inMonth
                                ? "text-white/85 hover:bg-white/[.07]"
                                : "text-white/25 hover:bg-white/[.04]"
                          }`}
                        >
                          {date.getDate()}
                          {isToday && !selected && (
                            <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#ff5a00]" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-white/[.07] pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                        selectDate(todayKey);
                      }}
                      className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-[#ff7a33] transition hover:bg-[#ff5a00]/10"
                    >
                      Hoy
                    </button>
                    {mode === "datetime" && (
                      <span className="text-[12px] text-white/45">Elegí el día y después la hora</span>
                    )}
                  </div>
                </div>
              )}

              {mode !== "date" && (
                <div
                  className={`flex w-[292px] max-w-full flex-col sm:w-[132px] ${
                    mode === "datetime" ? "border-t border-white/[.07] sm:border-l sm:border-t-0" : ""
                  } ${mode === "time" ? "w-[160px] sm:w-[132px]" : ""}`}
                >
                  <p className="border-b border-white/[.07] px-3 py-3 text-[12px] font-semibold text-white/60">
                    Horario
                  </p>
                  <div
                    className={`flex-1 overflow-y-auto p-2 sm:block sm:max-h-[300px] ${
                      mode === "datetime" ? "grid max-h-[168px] grid-cols-4 gap-1" : "max-h-[260px]"
                    }`}
                  >
                    {times.map((time) => {
                      const selected = time === parsed.time;

                      return (
                        <button
                          key={time}
                          type="button"
                          data-time-selected={selected}
                          onClick={() => selectTime(time)}
                          className={`w-full rounded-lg px-2 py-2 text-center text-[13px] tabular-nums transition sm:mb-1 sm:px-3 sm:text-left ${
                            selected
                              ? "bg-[#ff5a00] font-semibold text-white"
                              : "text-white/80 hover:bg-white/[.07]"
                          }`}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
