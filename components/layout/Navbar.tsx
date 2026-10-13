"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "#about", label: "Nosotros" },
  { href: "#services", label: "Servicios" },
  { href: "#gallery", label: "Galería" },
  { href: "#footer", label: "Contacto" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header
      className={`fixed left-0 top-0 z-50 w-full transition-all duration-500 ${
        scrolled || open ? "bg-black/80 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-20 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:h-24 lg:px-8">
        {/* Logo */}
        <Link
          href="/#hero"
          onClick={() => setOpen(false)}
          className="flex min-w-0 items-center gap-3"
        >
          <Image
            src="/logo.png"
            alt="Don Segundo Barbería"
            width={58}
            height={58}
            priority
            className="h-11 w-11 shrink-0 object-contain lg:h-14 lg:w-14"
          />

          <div className="hidden leading-none sm:block">
            <p className="font-serif text-[17px] tracking-[0.10em] text-white">
              DON SEGUNDO
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/70">
              Barbería Exclusiva
            </p>
          </div>
        </Link>

        {/* Menú desktop */}
        <nav
          aria-label="Principal"
          className="hidden items-center gap-10 text-sm uppercase tracking-[0.25em] lg:flex xl:gap-12"
        >
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition hover:text-[#C79A5A]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Acciones */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/gestionar-reserva"
            className="hidden border border-white/70 px-6 py-3 text-xs uppercase tracking-[0.25em] text-white transition hover:bg-white hover:text-black md:inline-block"
          >
            Mi reserva
          </Link>

          <Link
            href="/reservar"
            className="border border-[#C79A5A] bg-[#C79A5A] px-4 py-2.5 text-[11px] uppercase tracking-[0.2em] text-black transition hover:bg-[#d8ab6d] sm:px-6 sm:py-3 sm:text-xs sm:tracking-[0.25em]"
          >
            Reservar
          </Link>

          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            className="flex h-11 w-11 items-center justify-center border border-white/30 text-white transition hover:border-white lg:hidden"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Menú mobile */}
      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-menu"
            aria-label="Menú"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "100dvh" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-white/10 bg-black/95 lg:hidden"
          >
            <div className="flex flex-col px-6 pb-32 pt-6">
              {LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-white/10 py-5 font-serif text-3xl text-white transition hover:text-[#C79A5A]"
                >
                  {link.label}
                </a>
              ))}

              <Link
                href="/gestionar-reserva"
                onClick={() => setOpen(false)}
                className="mt-8 border border-white/60 px-6 py-4 text-center text-xs uppercase tracking-[0.25em] text-white"
              >
                Mi reserva
              </Link>

              <Link
                href="/reservar"
                onClick={() => setOpen(false)}
                className="mt-3 bg-[#C79A5A] px-6 py-4 text-center text-xs uppercase tracking-[0.25em] text-black"
              >
                Reservar turno
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
