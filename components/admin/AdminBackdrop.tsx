/*
  Fondo del panel (BarberOS).

  Base gris casi negra, apenas fría, con 4 rayos de luz naranja en
  diagonal: dos abajo a la izquierda (pasan por detrás del menú
  lateral), uno arriba al centro y uno abajo a la derecha.

  Todo es nítido: líneas finas con un degradé a lo largo, sin
  desenfoques, sin manchas ovaladas y sin viñeta. Cada grupo de
  rayos es un SVG anclado a su esquina, así se ve igual en cualquier
  tamaño de pantalla.
*/

type Streak = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /* Intensidad de la línea (0–1). */
  strength: number;
  /* Dónde está el punto más brillante a lo largo del rayo (0–1). */
  peak?: number;
};

/* Naranja quemado, más apagado que el de los botones: el fondo
   acompaña sin cansar la vista. */
const ORANGE = "#b9500f";
const ORANGE_PEAK = "#d0601c";

function StreakDefs({ streaks }: { streaks: Streak[] }) {
  return (
    <>
      {streaks.map((streak) => {
        const peak = streak.peak ?? 0.5;

        return (
          <linearGradient
            key={streak.id}
            id={streak.id}
            gradientUnits="userSpaceOnUse"
            x1={streak.x1}
            y1={streak.y1}
            x2={streak.x2}
            y2={streak.y2}
          >
            <stop offset="0" stopColor={ORANGE} stopOpacity="0" />
            <stop offset={Math.max(0, peak - 0.28)} stopColor={ORANGE} stopOpacity="0.25" />
            <stop offset={peak} stopColor={ORANGE_PEAK} stopOpacity="1" />
            <stop offset={Math.min(1, peak + 0.3)} stopColor={ORANGE} stopOpacity="0.22" />
            <stop offset="1" stopColor={ORANGE} stopOpacity="0" />
          </linearGradient>
        );
      })}
    </>
  );
}

function Streaks({ streaks }: { streaks: Streak[] }) {
  return (
    <>
      {streaks.map((streak) => (
        <g key={streak.id}>
          {/* Cuerpo apenas más ancho, sin desenfoque */}
          <line
            x1={streak.x1}
            y1={streak.y1}
            x2={streak.x2}
            y2={streak.y2}
            stroke={`url(#${streak.id})`}
            strokeWidth={2.4}
            strokeLinecap="round"
            opacity={0.14 * streak.strength}
          />
          {/* Línea */}
          <line
            x1={streak.x1}
            y1={streak.y1}
            x2={streak.x2}
            y2={streak.y2}
            stroke={`url(#${streak.id})`}
            strokeWidth={1}
            strokeLinecap="round"
            opacity={0.6 * streak.strength}
          />
        </g>
      ))}
    </>
  );
}

/* ---------------------------------------------------------
   Esquina inferior izquierda: el rayo principal
   --------------------------------------------------------- */
const BOTTOM_LEFT_STREAKS: Streak[] = [
  { id: "bl-main", x1: -60, y1: 520, x2: 520, y2: 110, strength: 0.7, peak: 0.36 },
  { id: "bl-low", x1: 120, y1: 960, x2: 720, y2: 540, strength: 0.4, peak: 0.28 },
];

/* ---------------------------------------------------------
   Arriba al centro: reflejo suave
   --------------------------------------------------------- */
const TOP_STREAKS: Streak[] = [
  { id: "tc-a", x1: 40, y1: 230, x2: 380, y2: -20, strength: 0.28, peak: 0.62 },
];

/* ---------------------------------------------------------
   Esquina inferior derecha
   --------------------------------------------------------- */
const BOTTOM_RIGHT_STREAKS: Streak[] = [
  { id: "br-a", x1: 300, y1: 560, x2: 760, y2: 230, strength: 0.32, peak: 0.45 },
];

function CornerArt({
  width,
  height,
  streaks,
  className,
  preserve,
}: {
  width: number;
  height: number;
  streaks: Streak[];
  className: string;
  preserve: string;
}) {
  return (
    <svg
      className={`absolute ${className}`}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio={preserve}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <StreakDefs streaks={streaks} />
      </defs>
      <Streaks streaks={streaks} />
    </svg>
  );
}

export default function AdminBackdrop() {
  return (
    // Capa propia (translateZ): el navegador dibuja el fondo una sola vez
    // y no lo vuelve a pintar al hacer scroll.
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden [contain:strict] [transform:translateZ(0)] [will-change:transform]"
    >
      {/* Base: gris carbón, apenas frío, con un leve degradé */}
      <div className="absolute inset-0 bg-[linear-gradient(160deg,#0b0c0e_0%,#08090a_45%,#070707_100%)]" />

      <CornerArt
        width={760}
        height={960}
        streaks={BOTTOM_LEFT_STREAKS}
        preserve="xMinYMax meet"
        className="bottom-0 left-0 h-[min(960px,100dvh)] w-[min(760px,100vw)]"
      />

      <CornerArt
        width={640}
        height={280}
        streaks={TOP_STREAKS}
        preserve="xMidYMin meet"
        className="left-[38%] top-0 h-[280px] w-[640px]"
      />

      <CornerArt
        width={800}
        height={600}
        streaks={BOTTOM_RIGHT_STREAKS}
        preserve="xMaxYMax meet"
        className="bottom-0 right-0 h-[min(600px,70dvh)] w-[min(800px,100vw)]"
      />
    </div>
  );
}
