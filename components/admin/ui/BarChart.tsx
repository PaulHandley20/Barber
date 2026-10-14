"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { adminFontVariables } from "@/components/admin/fonts";

/*
  BarChart · gráfico de barras único para todo el panel.

  - Eje Y con valores y líneas guía discretas.
  - Tooltip propio (oscuro, con el estilo del panel) que se dibuja en un
    portal: nunca queda cortado por el contenedor ni aparece el recuadro
    blanco del navegador.
  - Cada columna completa es zona de hover (no hace falta apuntarle a la
    barra) y se puede recorrer con el teclado.
  - Las etiquetas del eje X se espacian solas cuando hay muchas barras.
*/

export type BarDatum = {
  key: string;
  label: string;
  value: number;
  /* Texto secundario del tooltip, ej. "12 turnos" */
  detail?: string;
  /* Etiqueta larga para el tooltip, ej. "martes 13 de octubre" */
  fullLabel?: string;
};

type Props = {
  data: BarDatum[];
  height?: number;
  formatValue?: (value: number) => string;
  formatAxis?: (value: number) => string;
  seriesLabel?: string;
  maxXLabels?: number;
  /* Clave de una barra a resaltar (ej. hoy). */
  highlightKey?: string;
  ariaLabel?: string;
};

function niceMax(value: number) {
  if (value <= 0) return 1;

  const exponent = Math.floor(Math.log10(value));
  const fraction = value / 10 ** exponent;
  const niceFraction =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;

  return niceFraction * 10 ** exponent;
}

export function compactNumber(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`;
  }

  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}k`;
  }

  return value.toLocaleString("es-AR", { maximumFractionDigits: 1 });
}

type TooltipState = {
  datum: BarDatum;
  x: number;
  y: number;
} | null;

export default function BarChart({
  data,
  height = 240,
  formatValue = (value) => value.toLocaleString("es-AR"),
  formatAxis = compactNumber,
  seriesLabel,
  maxXLabels = 8,
  highlightKey,
  ariaLabel,
}: Props) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);
  const [mounted, setMounted] = useState(false);
  const tooltipId = useId();
  const plotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Los portales solo existen en el navegador.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const max = niceMax(Math.max(...data.map((item) => item.value), 0));
  const ticks = [max, max * 0.75, max * 0.5, max * 0.25, 0];
  const labelEvery = Math.max(1, Math.ceil(data.length / maxXLabels));
  const gap = data.length > 40 ? 2 : data.length > 20 ? 4 : data.length > 10 ? 6 : 10;

  const showTooltip = useCallback((datum: BarDatum, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const bar = element.querySelector<HTMLElement>("[data-bar]");
    const barRect = bar?.getBoundingClientRect();

    setTooltip({
      datum,
      x: rect.left + rect.width / 2,
      y: barRect && barRect.height > 0 ? barRect.top : rect.bottom - 8,
    });
  }, []);

  return (
    <div className="relative" aria-label={ariaLabel} role="figure">
      <div className="flex" style={{ height }}>
        {/* Eje Y */}
        <div className="relative w-12 shrink-0 select-none pr-2" aria-hidden="true">
          {ticks.map((tick, index) => (
            <span
              key={index}
              className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-white/45"
              style={{ top: `${(index / (ticks.length - 1)) * 100}%` }}
            >
              {formatAxis(tick)}
            </span>
          ))}
        </div>

        {/* Área del gráfico */}
        <div ref={plotRef} className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            {ticks.map((_, index) => (
              <div
                key={index}
                className={`absolute left-0 right-0 border-t ${
                  index === ticks.length - 1 ? "border-white/[.14]" : "border-dashed border-white/[.06]"
                }`}
                style={{ top: `${(index / (ticks.length - 1)) * 100}%` }}
              />
            ))}
          </div>

          <div
            className="relative flex h-full items-end"
            style={{ gap }}
            onPointerLeave={() => setTooltip(null)}
          >
            {data.map((datum) => {
              const ratio = max > 0 ? datum.value / max : 0;
              const isActive = tooltip?.datum.key === datum.key;
              const dimmed = tooltip !== null && !isActive;
              const highlighted = highlightKey === datum.key;

              return (
                <div
                  key={datum.key}
                  role="img"
                  tabIndex={0}
                  aria-label={`${datum.fullLabel ?? datum.label}: ${formatValue(datum.value)}${
                    datum.detail ? `, ${datum.detail}` : ""
                  }`}
                  aria-describedby={isActive ? tooltipId : undefined}
                  className="group relative flex h-full min-w-0 flex-1 cursor-default items-end justify-center outline-none"
                  onPointerEnter={(event) => showTooltip(datum, event.currentTarget)}
                  onFocus={(event) => showTooltip(datum, event.currentTarget)}
                  onBlur={() => setTooltip(null)}
                >
                  {/* Zona de hover de toda la columna */}
                  <div
                    className={`absolute inset-x-0 bottom-0 top-0 rounded-md transition-colors ${
                      isActive ? "bg-white/[.035]" : ""
                    }`}
                  />

                  <div
                    data-bar
                    className={`relative w-full max-w-[56px] rounded-t-[4px] transition-all duration-200 group-focus-visible:ring-2 group-focus-visible:ring-[#ff5a00]/60 ${
                      highlighted
                        ? "bg-[#ff7a2e]"
                        : isActive
                          ? "bg-[#ff6a18]"
                          : "bg-[#ff5a00]/80"
                    } ${dimmed ? "opacity-45" : "opacity-100"}`}
                    style={{
                      height: datum.value > 0 ? `max(${ratio * 100}%, 3px)` : "0px",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Eje X */}
      <div className="ml-12 mt-2 flex select-none" style={{ gap }} aria-hidden="true">
        {data.map((datum, index) => {
          const visible =
            index % labelEvery === 0 ||
            (index === data.length - 1 && (data.length - 1) % labelEvery >= labelEvery / 2);

          return (
            <span key={datum.key} className="relative h-4 min-w-0 flex-1">
              {visible && (
                <span
                  className={`absolute left-1/2 top-0 -translate-x-1/2 whitespace-nowrap text-[11px] tabular-nums ${
                    highlightKey === datum.key ? "font-semibold text-white/80" : "text-white/50"
                  }`}
                >
                  {datum.label}
                </span>
              )}
            </span>
          );
        })}
      </div>

      {mounted && tooltip
        ? createPortal(
            <ChartTooltip
              id={tooltipId}
              x={tooltip.x}
              y={tooltip.y}
              title={tooltip.datum.fullLabel ?? tooltip.datum.label}
              value={formatValue(tooltip.datum.value)}
              seriesLabel={seriesLabel}
              detail={tooltip.datum.detail}
            />,
            document.body
          )
        : null}
    </div>
  );
}

export function ChartTooltip({
  id,
  x,
  y,
  title,
  value,
  seriesLabel,
  detail,
}: {
  id?: string;
  x: number;
  y: number;
  title: string;
  value: string;
  seriesLabel?: string;
  detail?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const rect = element.getBoundingClientRect();
    const margin = 12;
    let shift = 0;

    if (rect.left < margin) shift = margin - rect.left;
    if (rect.right > window.innerWidth - margin) {
      shift = window.innerWidth - margin - rect.right;
    }

    // Ajuste de posición para que el tooltip no se salga de la pantalla.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffset(shift);
  }, [x, y]);

  return (
    <div
      ref={ref}
      id={id}
      role="tooltip"
      className={`${adminFontVariables} pointer-events-none fixed z-[200] min-w-[150px] -translate-x-1/2 -translate-y-full rounded-xl border border-white/[.1] bg-[#141414]/95 px-3.5 py-3 shadow-[0_18px_50px_rgba(0,0,0,.55)] backdrop-blur-md`}
      style={{
        left: x + offset,
        top: y - 10,
        fontFamily: "var(--font-barberos-ui), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <p className="text-[12px] font-medium text-white/60 first-letter:uppercase">{title}</p>
      <p className="mt-1 text-[17px] font-semibold tabular-nums tracking-[-.02em] text-white">
        {value}
      </p>
      {(seriesLabel || detail) && (
        <div className="mt-2 flex items-center gap-2 border-t border-white/[.07] pt-2 text-[12px] text-white/60">
          {seriesLabel && <span className="h-[2px] w-3 rounded-full bg-[#ff5a00]" />}
          <span>{[seriesLabel, detail].filter(Boolean).join(" · ")}</span>
        </div>
      )}
    </div>
  );
}
