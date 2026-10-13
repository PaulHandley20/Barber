"use client";

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
            <a
              href="mailto:paulhandley2001@gmail.com"
              className="transition hover:text-[#C29A62]"
            >
              Web por Paul Handley
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
