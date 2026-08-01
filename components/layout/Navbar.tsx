"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed left-0 top-0 z-50 w-full transition-all duration-500 ${
        scrolled
          ? "bg-black/70 backdrop-blur-x1"
          : "bg-transparent"
     }`}
    >
    <div className="relative flex h-24 w-full items-center px-8">

    {/* Logo */}
      <div className="absolute left-8 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Don Segundo Barbería"
            width={58}
            height={58}
            priority
            className="h-14 w-14 object-contain"
          />
      
      <div className="leading-none">
        <h2 className="font-serif text-[17px] tracking-[0.10em] text-white">
            DON SEGUNDO
        </h2>

        <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/70">
          Barbería Exclusiva
        </p>
       </div>
     </Link>
   </div>

    {/* Menú */}
     <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-12 text-sm uppercase tracking-[0.25em] lg:flex">

     <a href="#about" className="transition hover:text-[#C79A5A]">
      Nosotros
       </a>

     <a href="#services" className="transition hover:text-[#C79A5A]">
      Servicios
       </a>

     <a href="#gallery" className="transition hover:text-[#C79A5A]">
      Galería
       </a>

     <a href="#contact" className="transition hover:text-[#C79A5A]">
      Contacto
        </a>

     </nav>

    {/* Botón */}
  <div className="absolute right-8">
    <a
      href="#"
      className="border border-white px-7 py-3 text-xs uppercase tracking-[0.25em] transition hover:bg-white hover:text-black"
    >
      Reservar
             </a>
          </div>
        </div>
    </header>
  );
}