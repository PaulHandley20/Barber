import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BARBERSHOP, LEGAL_LAST_UPDATE } from "@/lib/barbershop";

export function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#11110f] text-[#F4EEE5]">
      <header className="border-b border-white/10 px-5 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#777169] transition-colors hover:text-[#b08a5a]"
          >
            <ArrowLeft size={14} />
            Volver al inicio
          </Link>

          <div className="mb-6 h-px w-20 bg-[#b08a5a]" />

          <p className="text-xs uppercase tracking-[0.38em] text-[#9b8465]">
            {BARBERSHOP.name} · {eyebrow}
          </p>

          <h1 className="mt-4 font-serif text-4xl leading-tight md:text-5xl">
            {title}
          </h1>

          <div className="mt-5 text-sm leading-7 text-[#aaa198] md:text-base">
            {intro}
          </div>

          <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-[#625e58]">
            Última actualización: {LEGAL_LAST_UPDATE}
          </p>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-12 md:px-10 md:py-16">
        <div className="space-y-10 text-[15px] leading-8 text-[#cfc7bc]">
          {children}
        </div>

        <nav className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-8 text-[11px] uppercase tracking-[0.2em] sm:flex-row sm:gap-8">
          <Link href="/privacidad" className="text-[#9b8465] hover:text-[#c09a6c]">
            Política de privacidad
          </Link>
          <Link href="/terminos" className="text-[#9b8465] hover:text-[#c09a6c]">
            Términos y condiciones
          </Link>
          <Link href="/reservar" className="text-[#9b8465] hover:text-[#c09a6c]">
            Reservar turno
          </Link>
        </nav>
      </article>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 font-serif text-2xl text-[#F4EEE5]">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5 marker:text-[#b08a5a]">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
