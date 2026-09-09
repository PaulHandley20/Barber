 "use client";

import {
  ArrowUpRight,
  Gift,
  Info,
  Link2,
  Megaphone,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import { DM_Mono, Manrope, Sora } from "next/font/google";

const manrope = Manrope({ subsets: ["latin"], display: "swap", variable: "--font-barberos-ui" });
const spaceGrotesk = Sora({ subsets: ["latin"], display: "swap", variable: "--font-barberos-display" });
const dmMono = DM_Mono({ subsets: ["latin"], display: "swap", weight: ["400", "500"], variable: "--font-barberos-data" });


export default function ReferidosPage() {
  return (
    <main className={`${manrope.variable} ${spaceGrotesk.variable} ${dmMono.variable} barberos-dashboard min-h-screen bg-[#070707] text-white`}>
      <style jsx>{`
        /*
          BARBEROS V7 — FUTURE MINIMAL
          UI: Manrope
          Display + data: Sora
          Accent data: DM Mono
        */
        .barberos-dashboard {
          --ink: #070707;
          --surface: #0b0b0b;
          --surface-2: #0f0f0f;
          --line: rgba(255,255,255,.075);
          --line-soft: rgba(255,255,255,.05);
          --muted: rgba(255,255,255,.46);
          --quiet: rgba(255,255,255,.30);
          --orange: #ff5a00;
          --orange-bright: #ff7a22;
          font-family: var(--font-barberos-ui), ui-sans-serif, system-ui, sans-serif;
          font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          letter-spacing: -0.014em;
          background:
            radial-gradient(720px 360px at 88% -8%, rgba(255,90,0,.045), transparent 70%),
            radial-gradient(520px 320px at 8% 14%, rgba(255,255,255,.010), transparent 74%),
            #070707;
        }

        .barberos-dashboard h1,
        .barberos-dashboard h2,
        .barberos-dashboard h3,
        .barberos-dashboard h4,
        .barberos-dashboard .display-font {
          font-family: var(--font-barberos-display), sans-serif;
          font-feature-settings: "kern" 1, "liga" 1;
          text-wrap: balance;
        }

        .barberos-dashboard .display-title {
          font-family: var(--font-barberos-display), sans-serif;
          font-size: clamp(34px, 4vw, 48px);
          line-height: .91;
          letter-spacing: -.075em;
          font-weight: 620;
        }

        .barberos-dashboard .data-number,
        .barberos-dashboard .numeric-value,
        .barberos-dashboard .kpi-value,
        .barberos-dashboard .data-emphasis {
          font-family: var(--font-barberos-display), sans-serif;
          font-variant-numeric: tabular-nums lining-nums;
          font-feature-settings: "tnum" 1, "zero" 1, "kern" 1;
          letter-spacing: -.065em;
        }

        .barberos-dashboard .data-emphasis {
          font-family: var(--font-barberos-display), sans-serif;
          letter-spacing: -.045em;
        }

        .barberos-dashboard .eyebrow,
        .barberos-dashboard .meta-label {
          font-family: var(--font-barberos-ui), sans-serif;
          text-transform: uppercase;
          letter-spacing: .18em;
        }

        .barberos-dashboard .eyebrow {
          font-size: 8px;
          line-height: 1;
          font-weight: 800;
        }

        .barberos-dashboard .meta-label {
          font-size: 9px;
          font-weight: 650;
        }

        .barberos-dashboard .micro-copy {
          font-size: 10px;
          line-height: 1.55;
        }

        .barberos-dashboard .kpi-value {
          font-size: 30px;
          line-height: .96;
          font-weight: 570;
          font-feature-settings: "tnum" 1, "lnum" 1, "kern" 1;
        }

        .barberos-dashboard .caption {
          font-size: 9px;
          line-height: 1.45;
          font-weight: 520;
        }

        /* The same premium treatment now reaches every lower panel. */
        .barberos-dashboard .panel-surface {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          background:
            linear-gradient(145deg, rgba(255,255,255,.028), rgba(255,255,255,.010) 52%, rgba(255,90,0,.012)),
            rgba(10,10,10,.96);
          border-color: var(--line) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.022),
            0 18px 58px rgba(0,0,0,.15);
          transition:
            transform 240ms cubic-bezier(.22,.61,.36,1),
            border-color 240ms ease,
            box-shadow 240ms ease;
        }

        .barberos-dashboard .panel-surface::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background:
            radial-gradient(
              480px circle at 82% -8%,
              rgba(255,90,0,.052),
              rgba(255,90,0,.012) 32%,
              transparent 68%
            );
          opacity: .34;
          transition: opacity 260ms ease;
        }

        .barberos-dashboard .panel-surface::after {
          content: "";
          position: absolute;
          top: 0;
          left: 7%;
          right: 7%;
          height: 1px;
          pointer-events: none;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255,255,255,.12),
            rgba(255,90,0,.20),
            rgba(255,255,255,.08),
            transparent
          );
          opacity: .20;
        }

        .barberos-dashboard .panel-surface:hover {
          transform: translateY(-1px);
          border-color: rgba(255,90,0,.14) !important;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.032),
            0 24px 70px rgba(0,0,0,.22),
            0 0 0 1px rgba(255,90,0,.018);
        }

        .barberos-dashboard .panel-surface:hover::before {
          opacity: .50;
        }

        .barberos-dashboard .metric-card {
          min-height: 138px;
        }

        .barberos-dashboard .metric-card::after {
          content: "";
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,90,0,.78), transparent);
          transform: scaleX(.16);
          transform-origin: center;
          opacity: .60;
          transition: transform 260ms ease, opacity 260ms ease;
        }

        .barberos-dashboard .metric-card:hover::after {
          transform: scaleX(1);
          opacity: 1;
        }

        .barberos-dashboard .metric-index {
          font-family: var(--font-barberos-data), monospace;
          font-size: 8px;
          letter-spacing: .04em;
          color: rgba(255,255,255,.20);
        }

        .barberos-dashboard .glass-control {
          border: 1px solid rgba(255,255,255,.08);
          background:
            linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.018));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.03),
            0 10px 30px rgba(0,0,0,.16);
          backdrop-filter: blur(18px);
        }

        .barberos-dashboard .primary-action {
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(135deg, #ff6a18 0%, #ff5a00 52%, #e84b00 100%);
          box-shadow:
            0 12px 30px rgba(255,90,0,.14),
            inset 0 1px 0 rgba(255,255,255,.26);
        }

        .barberos-dashboard .primary-action::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            108deg,
            transparent 20%,
            rgba(255,255,255,.30) 47%,
            transparent 72%
          );
          transform: translateX(-140%);
          transition: transform 650ms cubic-bezier(.22,.61,.36,1);
        }

        .barberos-dashboard .primary-action:hover::before {
          transform: translateX(140%);
        }

        .barberos-dashboard .system-strip {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.065);
          background:
            linear-gradient(90deg, rgba(255,90,0,.045), rgba(255,255,255,.012) 35%, rgba(255,255,255,.008));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.025),
            0 12px 40px rgba(0,0,0,.12);
        }

        .barberos-dashboard .system-strip::before {
          content: "";
          position: absolute;
          inset-y: 0;
          width: 180px;
          left: -200px;
          background: linear-gradient(90deg, transparent, rgba(255,90,0,.075), transparent);
          animation: barberos-scan 9s linear infinite;
          pointer-events: none;
        }

        .barberos-dashboard .status-led {
          box-shadow: 0 0 14px currentColor;
        }

        .barberos-dashboard .pulse-dot {
          animation: none;
        }

        .barberos-dashboard .chart-shell {
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.018),
            inset 0 0 70px rgba(255,90,0,.015);
        }

        .barberos-dashboard .interactive-row {
          position: relative;
          transition:
            background 180ms ease,
            transform 180ms cubic-bezier(.22,.61,.36,1);
        }

        .barberos-dashboard .interactive-row:hover {
          background:
            linear-gradient(90deg, rgba(255,90,0,.035), rgba(255,255,255,.018) 52%, transparent);
          transform: translateX(3px);
        }

        .barberos-dashboard .accent-line {
          position: relative;
        }

        .barberos-dashboard .accent-line::before {
          content: "";
          position: absolute;
          left: 0;
          top: 18%;
          bottom: 18%;
          width: 2px;
          border-radius: 999px;
          background: linear-gradient(to bottom, #ff7a22, #ff5a00 55%, transparent);
          box-shadow: 0 0 20px rgba(255,90,0,.32);
        }

        .barberos-dashboard .dashboard-grid-bg {
          background-image:
            linear-gradient(rgba(255,255,255,.013) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.013) 1px, transparent 1px);
          background-size: 48px 48px;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,.86), transparent 72%);
        }

        .barberos-dashboard .dashboard-fade {
          background:
            radial-gradient(circle at 84% 0%, rgba(255,90,0,.035), transparent 24%),
            radial-gradient(circle at 12% 18%, rgba(255,255,255,.010), transparent 18%);
        }

        .barberos-dashboard .dashboard-noise {
          opacity: .035;
          background-image:
            repeating-radial-gradient(circle at 0 0, rgba(255,255,255,.08) 0 .35px, transparent .5px 3.6px);
          mix-blend-mode: soft-light;
        }

        .barberos-dashboard .orange-orb { width: 0; height: 0; opacity: 0; }

        .barberos-dashboard .focus-ring:focus-visible {
          outline: 2px solid rgba(255,90,0,.72);
          outline-offset: 3px;
        }

        @keyframes barberos-scan {
          0% { transform: translateX(0); }
          100% { transform: translateX(calc(100vw + 420px)); }
        }

        @keyframes ambient-drift {
          from { transform: translate3d(0,0,0) scale(1); }
          to { transform: translate3d(-1.2%,1%,0) scale(1.025); }
        }

        @media (max-width: 900px) {
          .barberos-dashboard .display-title {
            font-size: 34px;
          }
        }



        .barberos-dashboard .metric-card,
        .barberos-dashboard .panel-surface {
          position: relative;
          isolation: isolate;
        }

        .barberos-dashboard .metric-card::after,
        .barberos-dashboard .panel-surface::after {
          content: "";
          pointer-events: none;
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background:
            radial-gradient(
              420px circle at var(--spot-x, 50%) var(--spot-y, -10%),
              rgba(255, 90, 0, 0.055),
              transparent 42%
            );
          opacity: 0;
          transition: opacity 260ms ease;
          z-index: -1;
        }

        .barberos-dashboard .metric-card:hover::after,
        .barberos-dashboard .panel-surface:hover::after {
          opacity: 1;
        }

        .barberos-dashboard .metric-card:hover {
          border-color: rgba(255,255,255,0.105) !important;
          transform: translateY(-1px);
        }

        .barberos-dashboard .metric-card,
        .barberos-dashboard .panel-surface {
          transition:
            border-color 220ms ease,
            transform 220ms cubic-bezier(.22,1,.36,1);
        }

        .barberos-dashboard .executive-label {
          color: rgba(255,255,255,.42);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .barberos-dashboard .executive-value {
          color: rgba(255,255,255,.92);
          font-size: 11px;
          font-weight: 600;
        }

        .barberos-dashboard .hero-title-accent {
          display: inline-block;
          width: 30px;
          height: 1px;
          margin-left: 2px;
          vertical-align: middle;
          background: linear-gradient(90deg, rgba(255,90,0,.75), transparent);
        }

        .barberos-dashboard .period-control button {
          min-width: 78px;
        }
        .barberos-dashboard .period-control button[data-active="true"] {
          background: rgba(255,255,255,0.09);
          color: #fff;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
        }
        .barberos-dashboard .period-nav {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.025);
          box-shadow: 0 10px 35px rgba(0,0,0,0.18);
        }
        .barberos-dashboard .chart-vignette {
          background:
            linear-gradient(180deg, rgba(255,90,0,0.025), transparent 30%),
            radial-gradient(circle at 70% 0%, rgba(255,90,0,0.035), transparent 30%);
        }
        .barberos-dashboard .numeric-value,
        .barberos-dashboard .data-number {
          font-family: var(--font-barberos-display), sans-serif;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.045em;
        }
        .barberos-dashboard .data-emphasis {
          font-variant-numeric: tabular-nums;
        }
        @media (prefers-reduced-motion: reduce) {
          .barberos-dashboard *,
          .barberos-dashboard *::before,
          .barberos-dashboard *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>
      <div className="mx-auto max-w-[1680px]">
        <header className="mb-7 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6a18]">
              <Share2 size={14} />
              Referidos
            </div>

            <h1 className="display-title text-[34px] text-white sm:text-[42px]">
              Referidos
            </h1>

            <p className="mt-2 max-w-2xl text-[11px] leading-6 text-white/72">
              Convertí clientes satisfechos en nuevos clientes. Este módulo
              queda preparado para definir el programa de referidos junto con
              Manu antes de activarlo.
            </p>
          </div>

          <div className="rounded-xl border border-[#ff5a00]/15 bg-[#ff5a00]/[0.05] px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-[#ff6a18]" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ff7a36]">
                  Próximamente
                </p>
                <p className="mt-0.5 text-xs text-[#888]">
                  Programa en definición
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-4 gap-3">
          <Metric
            icon={<Users size={16} />}
            label="Referidos"
            value="—"
            detail="Todavía sin activar"
          />
          <Metric
            icon={<Gift size={16} />}
            label="Beneficios"
            value="—"
            detail="Reglas por definir"
          />
          <Metric
            icon={<ArrowUpRight size={16} />}
            label="Conversión"
            value="—"
            detail="Sin datos todavía"
          />
          <Metric
            icon={<Megaphone size={16} />}
            label="Campañas"
            value="—"
            detail="Sin campañas activas"
          />
        </section>

        <section className="mt-5 grid grid-cols-[1.35fr_0.65fr] gap-4">
          <div className="rounded-[16px] border border-white/[0.07] bg-[#0d0d0d] p-7">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#ff5a00]/20 bg-[#ff5a00]/[0.07] text-[#ff6a18]">
              <Share2 size={19} />
            </div>

            <h2 className="mt-5 text-xl font-semibold tracking-[-0.025em]">
              Programa de referidos
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-[#777]">
              Todavía no definimos la mecánica comercial. La idea es que un
              cliente pueda recomendar Don Segundo a otra persona y que
              BarberOS registre el vínculo, el estado del referido y el
              beneficio correspondiente.
            </p>

            <div className="mt-7 grid grid-cols-3 gap-3">
              <Concept
                icon={<Link2 size={15} />}
                title="Código / enlace"
                text="Identificar quién recomendó a quién."
              />
              <Concept
                icon={<Gift size={15} />}
                title="Beneficio"
                text="Definir premio para cliente y referido."
              />
              <Concept
                icon={<ArrowUpRight size={15} />}
                title="Conversión"
                text="Medir cuándo el referido se convierte."
              />
            </div>
          </div>

          <div className="rounded-[16px] border border-white/[0.07] bg-[#0d0d0d] p-6">
            <div className="flex items-center gap-2">
              <Info size={15} className="text-[#ff6a18]" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#666]">
                Pendiente con Manu
              </p>
            </div>

            <div className="mt-5 space-y-4">
              <Decision
                number="01"
                title="¿Qué recibe quien refiere?"
              />
              <Decision
                number="02"
                title="¿Qué recibe el nuevo cliente?"
              />
              <Decision
                number="03"
                title="¿Cuándo se acredita?"
              />
              <Decision
                number="04"
                title="¿Puede acumularse con fidelización?"
              />
            </div>

            <div className="mt-6 rounded-xl border border-white/[0.06] bg-[#111] p-4">
              <p className="text-xs leading-5 text-[#666]">
                Una vez definida la regla, este módulo puede conectarse con
                Clientes, Fidelización y Analytics sin rehacer la estructura.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-[16px] border border-dashed border-white/[0.09] bg-[#0a0a0a] p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#151515] text-[#666]">
              <Gift size={16} />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-[#ccc]">
                Módulo preparado, todavía no operativo
              </h3>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-[#666]">
                No creamos tablas ni columnas nuevas en Supabase porque todavía
                no existe una definición acordada del programa. De esta forma
                BarberOS no queda bloqueado y tampoco atamos el sistema a una
                lógica comercial que después tengamos que desarmar.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[16px] border border-white/[0.07] bg-[#0d0d0d] p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] bg-[#151515] text-[#777]">
        {icon}
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#555]">
        {label}
      </p>
      <p className="mt-1 text-[25px] font-semibold tracking-[-0.04em]">
        {value}
      </p>
      <p className="mt-1 text-[10px] text-[#666]">{detail}</p>
    </div>
  );
}

function Concept({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#111] p-4">
      <div className="text-[#ff6a18]">{icon}</div>
      <p className="mt-3 text-xs font-semibold text-[#ccc]">{title}</p>
      <p className="mt-1 text-[10px] leading-5 text-[#666]">{text}</p>
    </div>
  );
}

function Decision({
  number,
  title,
}: {
  number: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-white/[0.05] pb-4 last:border-0 last:pb-0">
      <span className="font-mono text-[10px] text-[#444]">{number}</span>
      <span className="text-xs text-[#999]">{title}</span>
    </div>
  );
}
