/*
  Fondo del panel (BarberOS).

  Base gris casi negra, apenas fría, con rayos de luz naranja en
  diagonal: uno principal abajo a la izquierda (pasa por detrás del
  menú lateral), un reflejo arriba al centro y otro abajo a la
  derecha. Cada rayo es una línea fina + su halo, dibujados en SVG
  anclados a las esquinas, así se ven igual en cualquier tamaño de
  pantalla y no tapan el contenido.
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

type Haze = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  angle: number;
  opacity: number;
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

function Streaks({ streaks, filterId }: { streaks: Streak[]; filterId: string }) {
  return (
    <>
      {/* Halo ancho */}
      <g filter={`url(#${filterId}-wide)`}>
        {streaks.map((streak) => (
          <line
            key={`wide-${streak.id}`}
            x1={streak.x1}
            y1={streak.y1}
            x2={streak.x2}
            y2={streak.y2}
            stroke={`url(#${streak.id})`}
            strokeWidth={34}
            strokeLinecap="round"
            opacity={0.12 * streak.strength}
          />
        ))}
      </g>

      {/* Brillo cercano */}
      <g filter={`url(#${filterId}-soft)`}>
        {streaks.map((streak) => (
          <line
            key={`soft-${streak.id}`}
            x1={streak.x1}
            y1={streak.y1}
            x2={streak.x2}
            y2={streak.y2}
            stroke={`url(#${streak.id})`}
            strokeWidth={5}
            strokeLinecap="round"
            opacity={0.3 * streak.strength}
          />
        ))}
      </g>

      {/* Línea */}
      {streaks.map((streak) => (
        <line
          key={`core-${streak.id}`}
          x1={streak.x1}
          y1={streak.y1}
          x2={streak.x2}
          y2={streak.y2}
          stroke={`url(#${streak.id})`}
          strokeWidth={1.1}
          strokeLinecap="round"
          opacity={0.55 * streak.strength}
        />
      ))}
    </>
  );
}

function Hazes({ hazes, gradientId }: { hazes: Haze[]; gradientId: string }) {
  return (
    <>
      {hazes.map((haze, index) => (
        <ellipse
          key={index}
          cx={haze.cx}
          cy={haze.cy}
          rx={haze.rx}
          ry={haze.ry}
          fill={`url(#${gradientId})`}
          opacity={haze.opacity}
          transform={`rotate(${haze.angle} ${haze.cx} ${haze.cy})`}
        />
      ))}
    </>
  );
}

function Filters({ id }: { id: string }) {
  return (
    <>
      <filter id={`${id}-wide`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="18" />
      </filter>
      <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3.5" />
      </filter>
    </>
  );
}

function HazeGradient({ id }: { id: string }) {
  return (
    <radialGradient id={id}>
      <stop offset="0" stopColor={ORANGE} stopOpacity="1" />
      <stop offset="0.35" stopColor={ORANGE} stopOpacity="0.45" />
      <stop offset="0.7" stopColor={ORANGE} stopOpacity="0.1" />
      <stop offset="1" stopColor={ORANGE} stopOpacity="0" />
    </radialGradient>
  );
}

/* ---------------------------------------------------------
   Esquina inferior izquierda: el rayo principal
   --------------------------------------------------------- */
const BOTTOM_LEFT_STREAKS: Streak[] = [
  { id: "bl-main", x1: -60, y1: 520, x2: 520, y2: 110, strength: 1, peak: 0.36 },
  { id: "bl-low", x1: 120, y1: 960, x2: 720, y2: 540, strength: 0.7, peak: 0.28 },
  { id: "bl-faint", x1: -40, y1: 330, x2: 380, y2: 40, strength: 0.32, peak: 0.4 },
];

const BOTTOM_LEFT_HAZES: Haze[] = [
  { cx: 150, cy: 640, rx: 470, ry: 120, angle: -35, opacity: 0.08 },
  { cx: 60, cy: 820, rx: 300, ry: 160, angle: -35, opacity: 0.045 },
];

/* ---------------------------------------------------------
   Arriba al centro: reflejo suave
   --------------------------------------------------------- */
const TOP_STREAKS: Streak[] = [
  { id: "tc-a", x1: 40, y1: 230, x2: 380, y2: -20, strength: 0.42, peak: 0.62 },
  { id: "tc-b", x1: 170, y1: 250, x2: 520, y2: -10, strength: 0.26, peak: 0.6 },
];

const TOP_HAZES: Haze[] = [{ cx: 280, cy: 20, rx: 330, ry: 80, angle: -32, opacity: 0.06 }];

/* ---------------------------------------------------------
   Esquina inferior derecha
   --------------------------------------------------------- */
const BOTTOM_RIGHT_STREAKS: Streak[] = [
  { id: "br-a", x1: 300, y1: 560, x2: 760, y2: 230, strength: 0.5, peak: 0.45 },
  { id: "br-b", x1: 480, y1: 600, x2: 800, y2: 370, strength: 0.32, peak: 0.4 },
];

const BOTTOM_RIGHT_HAZES: Haze[] = [{ cx: 620, cy: 520, rx: 380, ry: 110, angle: -32, opacity: 0.06 }];

function CornerArt({
  id,
  width,
  height,
  streaks,
  hazes,
  className,
  preserve,
}: {
  id: string;
  width: number;
  height: number;
  streaks: Streak[];
  hazes: Haze[];
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
        <Filters id={id} />
        <HazeGradient id={`${id}-haze`} />
        <StreakDefs streaks={streaks} />
      </defs>
      <Hazes hazes={hazes} gradientId={`${id}-haze`} />
      <Streaks streaks={streaks} filterId={id} />
    </svg>
  );
}

export default function AdminBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Base: gris carbón, apenas frío, con un leve degradé */}
      <div className="absolute inset-0 bg-[linear-gradient(160deg,#0b0c0e_0%,#08090a_45%,#070707_100%)]" />

      <CornerArt
        id="bg-bl"
        width={760}
        height={960}
        streaks={BOTTOM_LEFT_STREAKS}
        hazes={BOTTOM_LEFT_HAZES}
        preserve="xMinYMax meet"
        className="bottom-0 left-0 h-[min(960px,100dvh)] w-[min(760px,100vw)]"
      />

      <CornerArt
        id="bg-tc"
        width={640}
        height={280}
        streaks={TOP_STREAKS}
        hazes={TOP_HAZES}
        preserve="xMidYMin meet"
        className="left-[38%] top-0 h-[280px] w-[640px]"
      />

      <CornerArt
        id="bg-br"
        width={800}
        height={600}
        streaks={BOTTOM_RIGHT_STREAKS}
        hazes={BOTTOM_RIGHT_HAZES}
        preserve="xMaxYMax meet"
        className="bottom-0 right-0 h-[min(600px,70dvh)] w-[min(800px,100vw)]"
      />

      {/* Viñeta: oscurece apenas los bordes para dar profundidad */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.38)_100%)]" />
    </div>
  );
}
