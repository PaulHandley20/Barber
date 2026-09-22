"use client";

import {
  ArrowUpRight,
  Gift,
  Info,
  CheckCircle2,
  Link2,
  Share2,
  UserPlus,
  Users,
} from "lucide-react";
import { DM_Mono, Manrope, Sora } from "next/font/google";
import type { ReactNode } from "react";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-barberos-ui",
});
const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-barberos-display",
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-barberos-data",
});

export default function ReferidosPage() {
  return (
    <main
      className={`${manrope.variable} ${sora.variable} ${dmMono.variable} barberos-dashboard min-h-screen text-white`}
    >
      <style jsx>{`
        .barberos-dashboard {
          --ink: #070707;
          --surface: #0b0b0b;
          --surface-2: #111111;
          --line: rgba(255,255,255,.075);
          --muted: rgba(255,255,255,.58);
          --quiet: rgba(255,255,255,.34);
          --orange: #ff5a00;
          --orange-bright: #ff7a22;
          font-family: var(--font-barberos-ui), Manrope, sans-serif;
          font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          letter-spacing: -.014em;
          background:
            radial-gradient(720px 360px at 88% -8%, rgba(255,90,0,.045), transparent 70%),
            radial-gradient(520px 320px at 8% 14%, rgba(255,255,255,.010), transparent 74%),
            transparent;
        }

        .barberos-dashboard h1,
        .barberos-dashboard h2,
        .barberos-dashboard h3 {
          font-family: var(--font-barberos-display), Sora, sans-serif;
          font-feature-settings: "kern" 1, "liga" 1;
          text-wrap: balance;
        }

        .display-title {
          font-family: var(--font-barberos-display), Sora, sans-serif;
          font-size: clamp(36px, 4vw, 48px);
          line-height: .91;
          letter-spacing: -.075em;
          font-weight: 620;
        }

        .eyebrow {
          font-size: 9px;
          line-height: 1;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .18em;
        }

        .meta-label {
          font-size: 10px;
          line-height: 1.1;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .16em;
        }

        .metric-value,
        .data-number {
          font-family: var(--font-barberos-display), Sora, sans-serif;
          font-variant-numeric: tabular-nums lining-nums;
          letter-spacing: -.06em;
        }

        .panel-surface,
        .panel {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          background:
            linear-gradient(145deg, rgba(255,255,255,.028), rgba(255,255,255,.010) 52%, rgba(255,90,0,.012)),
            rgba(10,10,10,.96);
          border: 1px solid var(--line);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.022),
            0 18px 58px rgba(0,0,0,.15);
          transition:
            transform 240ms cubic-bezier(.22,.61,.36,1),
            border-color 240ms ease,
            box-shadow 240ms ease;
        }

        .panel:hover {
          transform: translateY(-1px);
          border-color: rgba(255,90,0,.14);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.032),
            0 24px 70px rgba(0,0,0,.22),
            0 0 0 1px rgba(255,90,0,.018);
        }

        .metric-card {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          background:
            linear-gradient(145deg, rgba(255,255,255,.028), rgba(255,255,255,.010) 52%, rgba(255,90,0,.012)),
            rgba(10,10,10,.96);
          border: 1px solid var(--line);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.022),
            0 18px 58px rgba(0,0,0,.15);
          transition:
            transform 220ms cubic-bezier(.22,.61,.36,1),
            border-color 220ms ease,
            box-shadow 220ms ease;
        }

        .panel-surface::before,
        .metric-card::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background: radial-gradient(460px circle at 84% -8%, rgba(255,90,0,.055), transparent 66%);
          opacity: .42;
        }

        .panel-surface::after,
        .metric-card::after {
          content: "";
          position: absolute;
          top: 0;
          left: 7%;
          right: 7%;
          height: 1px;
          pointer-events: none;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.12), rgba(255,90,0,.20), rgba(255,255,255,.08), transparent);
          opacity: .22;
        }

        .panel-surface:hover,
        .metric-card:hover {
          transform: translateY(-1px);
          border-color: rgba(255,90,0,.14);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,.032),
            0 24px 70px rgba(0,0,0,.22),
            0 0 0 1px rgba(255,90,0,.018);
        }

        .metric-card {
          min-height: 138px;
        }

        .metric-card .metric-accent {
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,90,0,.78), transparent);
          opacity: .6;
        }

        .soft-divider {
          border-color: rgba(255,255,255,.065);
        }

        .control {
          border: 1px solid rgba(255,255,255,.075);
          background: rgba(255,255,255,.025);
          transition: all .18s ease;
        }

        .control:hover {
          border-color: rgba(255,255,255,.13);
          background: rgba(255,255,255,.045);
        }

        .accent-number {
          color: #ff6a18;
          font-family: var(--font-barberos-data), monospace;
          font-size: 9px;
          letter-spacing: .08em;
        }

        .flow-row {
          transition: background .18s ease, transform .18s ease;
        }

        .flow-row:hover {
          background: linear-gradient(90deg, rgba(255,90,0,.035), rgba(255,255,255,.015), transparent);
          transform: translateX(2px);
        }

        .primary-action {
          background: linear-gradient(135deg, #ff6a18 0%, #ff5a00 52%, #e84b00 100%);
          box-shadow: 0 12px 30px rgba(255,90,0,.14), inset 0 1px 0 rgba(255,255,255,.26);
        }

        @media (max-width: 900px) {
          .display-title { font-size: 36px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .barberos-dashboard *,
          .barberos-dashboard *::before,
          .barberos-dashboard *::after {
            transition-duration: .01ms !important;
            animation-duration: .01ms !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-[1680px] px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
        <header className="mb-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/82">BarberOS</span>
                <span className="text-white/10">/</span>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff6a18]">Inteligencia de referidos</span>
                <span className="ml-1 hidden h-px w-10 bg-gradient-to-r from-orange-500/55 to-transparent sm:block" />
              </div>

              <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
                <h1 className="display text-[34px] font-semibold leading-[.91] tracking-[-.075em] text-white sm:text-[42px]">Referidos</h1>
              </div>

              <p className="mt-2 max-w-xl text-[14px] leading-6 text-white/72">
                Convertí clientes satisfechos en nuevos clientes y medí el impacto de las recomendaciones desde un solo lugar.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" className="control flex h-10 items-center justify-center rounded-[11px] px-4 text-[12px] font-semibold text-white/68">
                Actualizar
              </button>
              <button type="button" className="primary-action flex h-10 items-center justify-center rounded-[11px] px-4 text-[12px] font-semibold text-white">
                + Configurar programa
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={<Users size={16} />} label="Referidos" value="—" detail="Personas invitadas por clientes" />
          <MetricCard icon={<UserPlus size={16} />} label="Clientes que refieren" value="—" detail="Clientes que participan" />
          <MetricCard icon={<CheckCircle2 size={16} />} label="Nuevos clientes" value="—" detail="Altas provenientes de referidos" />
          <MetricCard icon={<Gift size={16} />} label="Beneficios" value="—" detail="Premios entregados" />
        </section>

        <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.45fr_.75fr]">
          <div className="panel-surface rounded-[16px]">
            <div className="border-b soft-divider px-6 py-5 sm:px-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="eyebrow text-[#ff6a18]">Programa</p>
                  <h2 className="mt-2 text-[21px] font-semibold tracking-[-.035em] text-white">
                    Programa de referidos
                  </h2>
                  <p className="mt-2 max-w-2xl text-[13px] leading-5 text-white/68">
                    Estructura el sistema para registrar quién recomienda, quién llega y qué beneficio corresponde.
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ff5a00]/20 bg-[#ff5a00]/[.07] text-[#ff6a18]">
                  <Share2 size={17} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-0 divide-y divide-white/[.055] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <InfoBlock icon={<Link2 size={15} />} label="Identificación" title="Código o enlace" text="Relacionar al cliente que recomienda con el nuevo cliente." />
              <InfoBlock icon={<Gift size={15} />} label="Beneficio" title="Premio definido" text="Establecer qué recibe quien refiere y qué recibe quien llega." />
              <InfoBlock icon={<ArrowUpRight size={15} />} label="Conversión" title="Seguimiento" text="Registrar cuándo el referido realiza su primera atención." />
            </div>
          </div>

          <div className="panel-surface rounded-[16px] p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow text-[#ff6a18]">Flujo</p>
                <h2 className="mt-2 text-[20px] font-semibold tracking-[-.03em] text-white">Cómo funciona</h2>
              </div>
              <Users size={17} className="text-white/62" />
            </div>

            <div className="mt-6 space-y-0">
              <FlowRow number="01" title="Cliente recomienda" text="Comparte su código o enlace." />
              <FlowRow number="02" title="Nuevo cliente llega" text="El sistema registra la referencia." />
              <FlowRow number="03" title="Primera atención" text="Se confirma la conversión." />
              <FlowRow number="04" title="Beneficio" text="Se acredita según la regla definida." last />
            </div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="panel-surface rounded-[16px] p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-[#ff6a18]">Reglas</p>
                <h2 className="mt-2 text-[20px] font-semibold tracking-[-.03em] text-white">Decisiones del programa</h2>
                <p className="mt-2 text-[13px] leading-5 text-white/68">
                  Estos puntos definen la mecánica comercial antes de activarla.
                </p>
              </div>
              <Info size={16} className="text-white/58" />
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <DecisionCard number="01" title="Beneficio para quien refiere" />
              <DecisionCard number="02" title="Beneficio para el nuevo cliente" />
              <DecisionCard number="03" title="Momento de acreditación" />
              <DecisionCard number="04" title="Compatibilidad con fidelización" />
            </div>
          </div>

          <div className="panel-surface rounded-[16px] p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-[#ff6a18]">Integración</p>
                <h2 className="mt-2 text-[20px] font-semibold tracking-[-.03em] text-white">Conectado con BarberOS</h2>
                <p className="mt-2 text-[13px] leading-5 text-white/68">
                  La estructura está pensada para compartir información con Clientes, Fidelización y Analytics.
                </p>
              </div>
              <Link2 size={16} className="text-[#ff6a18]" />
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              <SystemItem title="Clientes" text="Origen de referencias" />
              <SystemItem title="Fidelización" text="Beneficios y recurrencia" />
              <SystemItem title="Analytics" text="Conversión e impacto" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string | number; detail: string }) {
  return (
    <div className="panel relative min-h-[154px] overflow-hidden rounded-[16px] p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.17em] text-white/52">
          <span className="text-white/52">{icon}</span>
          {label}
        </span>
        <span className="text-[9px] font-medium uppercase tracking-[0.15em] text-white/28">datos</span>
      </div>
      <p className="display mt-7 truncate text-[30px] font-semibold leading-none tracking-[-.065em] text-white">{value}</p>
      <p className="mt-3 truncate text-[12px] leading-5 text-white/62">{detail}</p>
      <span className="absolute bottom-0 left-5 h-px w-16 bg-gradient-to-r from-[#ff5a00]/50 to-transparent" />
    </div>
  );
}

function InfoBlock({ icon, label, title, text }: { icon: ReactNode; label: string; title: string; text: string }) {
  return (
    <div className="p-6 sm:p-7">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[.07] bg-white/[.025] text-[#ff6a18]">
          {icon}
        </div>
        <span className="meta-label text-white/42">{label}</span>
      </div>
      <h3 className="mt-5 text-[15px] font-semibold text-white">{title}</h3>
      <p className="mt-2 text-[13px] leading-5 text-white/52">{text}</p>
    </div>
  );
}

function FlowRow({ number, title, text, last = false }: { number: string; title: string; text: string; last?: boolean }) {
  return (
    <div className={`flow-row flex gap-4 py-4 ${!last ? "border-b border-white/[.055]" : ""}`}>
      <span className="font-mono text-[12px] tracking-[.08em] text-[#ff6a18]">{number}</span>
      <div>
        <p className="text-[13px] font-semibold text-white">{title}</p>
        <p className="mt-1 text-[13px] leading-4 text-white/48">{text}</p>
      </div>
    </div>
  );
}

function DecisionCard({ number, title }: { number: string; title: string }) {
  return (
    <div className="control rounded-xl p-4">
      <span className="font-mono text-[12px] tracking-[.08em] text-white/25">{number}</span>
      <p className="mt-3 text-[13px] font-semibold leading-5 text-white/80">{title}</p>
    </div>
  );
}

function SystemItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="control rounded-xl p-4">
      <p className="text-[13px] font-semibold text-white">{title}</p>
      <p className="mt-1.5 text-[12px] leading-4 text-white/68">{text}</p>
    </div>
  );
}
