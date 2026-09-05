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

export default function ReferidosPage() {
  return (
    <main className="min-h-screen bg-[#070707] px-8 py-8 text-[#f5f5f4]">
      <div className="mx-auto max-w-[1540px]">
        <header className="mb-8 flex items-end justify-between gap-6">
          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#ff6a18]">
              <Share2 size={14} />
              Growth / Referrals
            </div>

            <h1 className="text-[32px] font-semibold tracking-[-0.04em]">
              Referidos
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#8b8b8b]">
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
          <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d0d] p-7">
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

          <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d0d] p-6">
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

        <section className="mt-5 rounded-2xl border border-dashed border-white/[0.09] bg-[#0a0a0a] p-6">
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
    <div className="rounded-2xl border border-white/[0.07] bg-[#0d0d0d] p-4">
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
