"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BARBERSHOP, getWhatsappUrl, summarizeHours } from "@/lib/barbershop";
import { usePublicBookingConfig } from "@/lib/public-config";

export default function Footer() {
  const { config } = usePublicBookingConfig();
  const hours = summarizeHours(config.hours);
  const whatsappUrl = getWhatsappUrl("Hola! Quería hacer una consulta.");

  return (
    <footer id="footer" className="scroll-mt-20 border-t border-[#171717] bg-black">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-10 md:py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_1fr_1fr] lg:gap-12">
          {/* LOGO */}
          <img
            src="/logo.png"
            alt="Don Segundo Barbería"
            loading="lazy"
            className="w-20 opacity-90 sm:col-span-2 lg:col-span-1 lg:w-16"
          />

          {/* DIRECCIÓN */}
          <a
            href={BARBERSHOP.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group"
          >
            <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-[#D7CCB8]">
              Dirección
            </p>
            <p className="text-sm leading-6 text-[#B6A894] transition group-hover:text-[#C29A62]">
              {BARBERSHOP.address}, {BARBERSHOP.city}
              <br />
              <span className="underline-offset-4 group-hover:underline">
                Abrir en Maps
              </span>
            </p>
          </a>

          {/* CONTACTO */}
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-[#D7CCB8]">
              Contacto
            </p>
            <ul className="space-y-1 text-sm leading-6 text-[#B6A894]">
              <li>
                <a
                  href={BARBERSHOP.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition hover:text-[#C29A62]"
                >
                  Instagram · @{BARBERSHOP.instagramHandle}
                </a>
              </li>
              {whatsappUrl && (
                <li>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition hover:text-[#C29A62]"
                  >
                    WhatsApp
                  </a>
                </li>
              )}
              <li>
                <a
                  href={`mailto:${BARBERSHOP.email}`}
                  className="break-all transition hover:text-[#C29A62]"
                >
                  {BARBERSHOP.email}
                </a>
              </li>
            </ul>
          </div>

          {/* HORARIOS */}
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-[#D7CCB8]">
              Horarios
            </p>
            <ul className="text-sm leading-6 text-[#B6A894]">
              {hours.length > 0 ? (
                hours.map((item) => (
                  <li key={item.days}>
                    {item.days} · {item.hours}
                  </li>
                ))
              ) : (
                <li>Consultanos por Instagram</li>
              )}
            </ul>
          </div>

          {/* TURNOS */}
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-[#D7CCB8]">
              Turnos
            </p>
            <ul className="space-y-1 text-sm leading-6 text-[#B6A894]">
              <li>
                <Link href="/reservar" className="transition hover:text-[#C29A62]">
                  Reservar turno
                </Link>
              </li>
              <li>
                <Link
                  href="/gestionar-reserva"
                  className="transition hover:text-[#C29A62]"
                >
                  Modificar o cancelar
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="my-8 h-px bg-[#171717]" />

        <div className="flex flex-col items-center justify-between gap-4 text-center text-[10px] uppercase tracking-[0.22em] text-[#6F675F] md:flex-row md:text-left md:tracking-[0.28em]">
          <p>
            © {new Date().getFullYear()} {BARBERSHOP.legalName}
          </p>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href="/privacidad" className="transition hover:text-[#C29A62]">
              Privacidad
            </Link>
            <Link href="/terminos" className="transition hover:text-[#C29A62]">
              Términos
            </Link>
            <DeveloperCredit />
          </div>
        </div>
      </div>
    </footer>
  );
}

const DEVELOPER_EMAIL = "paulhandley2001@gmail.com";

/* "Web hecha por Paul Handley": al tocar el nombre aparece el mail,
   con opción de copiarlo o escribir. (Un mailto solo no muestra nada
   si la persona no tiene una app de correo configurada.) */
function DeveloperCredit() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(DEVELOPER_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Sin permiso de portapapeles: el mail igual queda a la vista.
    }
  }

  return (
    <span ref={ref} className="relative inline-flex items-center gap-1.5">
      <span>Web hecha por</span>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="developer-contact"
        className="cursor-pointer uppercase tracking-[inherit] text-[#C29A62] underline decoration-[#C29A62]/40 underline-offset-4 transition hover:text-[#EADFCB] hover:decoration-[#EADFCB]/60"
      >
        Paul Handley
      </button>

      {open ? (
        <span
          id="developer-contact"
          role="dialog"
          aria-label="Contacto de Paul Handley"
          className="absolute bottom-full right-1/2 z-20 mb-3 w-max max-w-[86vw] translate-x-1/2 border border-[#2a2622] bg-[#0d0c0b] px-4 py-3.5 text-left normal-case tracking-normal shadow-[0_18px_50px_rgba(0,0,0,.6)] md:right-0 md:translate-x-0"
        >
          <span className="block text-[10px] uppercase tracking-[0.22em] text-[#6F675F]">
            Contacto
          </span>
          <a
            href={`mailto:${DEVELOPER_EMAIL}`}
            className="mt-1.5 block break-all text-[14px] text-[#F3EBDD] transition hover:text-[#C29A62]"
          >
            {DEVELOPER_EMAIL}
          </a>
          <span className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={copyEmail}
              className="cursor-pointer rounded-full border border-[#3a342d] px-3 py-1.5 text-[11px] text-[#ddd6cc] transition hover:border-[#C29A62] hover:text-[#C29A62]"
            >
              {copied ? "¡Copiado!" : "Copiar mail"}
            </button>
            <a
              href={`mailto:${DEVELOPER_EMAIL}`}
              className="rounded-full bg-[#EADFCB] px-3 py-1.5 text-[11px] text-[#1b1915] transition hover:bg-[#F4ECDD]"
            >
              Escribir
            </a>
          </span>
        </span>
      ) : null}
    </span>
  );
}
