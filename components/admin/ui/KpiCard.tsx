import type { ReactNode } from "react";

/*
  KpiCard · tarjeta de métrica única para todo el panel.

  Antes cada sección tenía su propia versión (ícono en recuadro, título
  arriba o abajo, numeración "01", tamaños distintos). Ahora todas usan
  esta, con el estilo de Clientes y Servicios:

    [ícono] RÓTULO                     [badge opcional]

    Valor grande (Sora 30px)

    Texto de apoyo

  Los estilos viven en admin.css (clases .bo-kpi*), así no dependen de
  los estilos propios de cada página.
*/
export default function KpiCard({
  label,
  value,
  detail,
  icon,
  accent = false,
  badge,
  trend,
  compact = false,
  className = "",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  /* Resalta el ícono y el rótulo en naranja. */
  accent?: boolean;
  /* Elemento chico arriba a la derecha (ej. punto de estado). */
  badge?: ReactNode;
  /* Variación (ej. <KpiDelta />), a la derecha del texto de apoyo. */
  trend?: ReactNode;
  /* Versión baja para tarjetas de estado sin texto de apoyo. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={[
        "bo-kpi",
        accent ? "bo-kpi--accent" : "",
        compact ? "bo-kpi--compact" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="bo-kpi-head">
        <span className="bo-kpi-label">
          {icon ? <span className="bo-kpi-icon">{icon}</span> : null}
          <span className="truncate">{label}</span>
        </span>
        {badge ? <span className="shrink-0">{badge}</span> : null}
      </div>

      <div className="bo-kpi-value-row">
        <div className="bo-kpi-value">{value}</div>
      </div>

      {detail || trend ? (
        <div className="bo-kpi-foot">
          {detail ? <div className="bo-kpi-detail">{detail}</div> : <span />}
          {trend ? <span className="shrink-0">{trend}</span> : null}
        </div>
      ) : null}
    </div>
  );
}

/* Variación porcentual (verde si sube, rojo si baja). */
export function KpiDelta({ value }: { value: number }) {
  const up = value >= 0;

  return (
    <span className={`bo-kpi-delta ${up ? "bo-kpi-delta--up" : "bo-kpi-delta--down"}`}>
      {up ? "+" : ""}
      {value.toFixed(0)}%
    </span>
  );
}
