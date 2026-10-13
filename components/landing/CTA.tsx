"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function CTA() {
  return (
    <section
      id="cta"
      className="relative min-h-[85svh] overflow-hidden"
    >
      {/* Fondo */}

      <img
        src="/images/cta.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover object-[30%_center] md:object-center"
      />

      {/* Overlay MUY suave */}

      <div className="absolute inset-0 bg-black/55 md:bg-black/45" />

      {/* Contenido */}

      <div className="relative z-10 mx-auto flex min-h-[85svh] max-w-7xl items-center justify-center px-6 py-20 sm:px-10 md:justify-end md:px-12">

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-[560px] text-center md:text-right"
        >

          <div className="mx-auto mb-8 h-px w-24 bg-[#C7A467] md:mr-0" />

          <p className="text-sm uppercase tracking-[0.35em] text-[#C7A467] md:text-base md:tracking-[0.45em]">
            Don Segundo
          </p>

          <h2
            className="
              mt-6
              font-serif
              text-[clamp(2.6rem,6vw,5rem)]
              md:mt-8
              leading-[0.95]
              text-[#F4EFE8]
            "
          >
            La próxima conversación empieza acá.
          </h2>

          <p
            className="
              mt-6
              text-lg
              leading-8
              text-[#E4DDD2]
              md:mt-10
              md:text-[22px]
              md:leading-10
            "
          >
            Te esperamos
            <br />
            Hecho con tiempo, hecho para vos.
          </p>

          {/* Reservar turno */}

          <Link
            href="/reservar"
            className="
              mt-10
              inline-flex
              md:mt-16
              items-center
              gap-3

              rounded-full
              border
              border-[#EADFCB]

              px-8
              py-4
              text-sm
              md:px-12
              md:py-5
              md:text-base

              uppercase
              tracking-[0.25em]
              md:tracking-[0.30em]
              text-[#F4EFE8]

              transition-all
              duration-300

              hover:bg-[#EADFCB]
              hover:text-[#181818]
              hover:scale-105
            "
          >
            Reservar turno →
          </Link>

        </motion.div>

      </div>
    </section>
  );
}