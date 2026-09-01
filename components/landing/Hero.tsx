"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section 
      id="hero"
      className="relative flex min-h-screen items-center justify-center overflow-hidden">

      {/* Fondo */}
      <img
        src="/images/hero.jpg"
        alt="Don Segundo Barbería"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/55" />

      {/* Degradado */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,.20), rgba(0,0,0,.40), rgba(0,0,0,.75))",
        }}
      />

      {/* Contenido */}
      <div className="relative z-20 flex w-full flex-col items-center px-6 text-center">

        {/* Logo */}
        <motion.img
          src="/logo.png"
          alt="Don Segundo"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            width: "clamp(150px, 12vw, 250px)",
            marginBottom: "clamp(18px, 2vw, 35px)",
          }}
        />

        {/* Título */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="font-serif uppercase text-white leading-none"
          style={{
            fontSize: "clamp(3rem, 7vw, 6rem)",
            letterSpacing: ".08em",
          }}
        >
          DON SEGUNDO
        </motion.h1>

        {/* Ubicación */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="uppercase text-[#C79A5A]"
          style={{
            marginTop: "clamp(12px, 1vw, 18px)",
            fontSize: "clamp(.75rem, .9vw, 1rem)",
            letterSpacing: ".45em",
          }}
        >
          Concepción del Uruguay, Entre Ríos
        </motion.p>

        {/* Frase */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="font-serif italic text-white/90"
          style={{
            marginTop: "clamp(18px, 2vw, 30px)",
            fontSize: "clamp(1.4rem, 2vw, 2.4rem)",
          }}
        >
          La tradición del buen detalle.
        </motion.p>

        {/* Botones */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex flex-wrap justify-center gap-5"
          style={{
            marginTop: "clamp(25px, 2vw, 40px)",
          }}
        >

          {/* RESERVAR */}
          <Link
            href="/reservar"
            className="group flex items-center gap-3 bg-[#C79A5A] px-10 py-4 uppercase tracking-[4px] text-black transition hover:bg-[#d8ab6d]"
          >
            Reservar

            <ArrowRight
              size={18}
              className="transition group-hover:translate-x-1"
            />
          </Link>

          {/* CONOCER MÁS */}
          <a
            href="#timeline"
            className="border border-white/40 px-10 py-4 uppercase tracking-[4px] text-white transition hover:bg-white hover:text-black"
          >
            Conocer más
          </a>

        </motion.div>

      </div>

      {/* Scroll */}
      <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 text-center">

        <p className="mb-3 text-[11px] uppercase tracking-[6px] text-white/70">
          Scroll
        </p>

        <ArrowDown
          size={22}
          className="mx-auto animate-bounce text-[#C79A5A]"
        />

      </div>

    </section>
  );
}