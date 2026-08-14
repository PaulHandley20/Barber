"use client";

import { motion } from "framer-motion";

export default function CTA() {
  return (
    <section
      id="cta"
      className="relative min-h-[85vh] overflow-hidden"
    >
      {/* Fondo */}

      <img
        src="/images/cta.jpg"
        alt="Don Segundo"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Overlay MUY suave */}

      <div className="absolute inset-0 bg-black/45" />

      {/* Contenido */}

      <div className="relative z-10 mx-auto flex min-h-[85vh] max-w-7xl items-center justify-end px-12">

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: .8 }}
          className="max-w-[560px] text-right"
        >

          <div className="ml-auto mb-8 h-px w-24 bg-[#C7A467]" />

          <p
            className="
              uppercase
              tracking-[0.45em]
              text-[#C7A467]
            "
          >
            Don Segundo
          </p>

          <h2
            className="
              mt-8
              font-serif
              text-[clamp(3.8rem,6vw,5rem)]
              leading-[0.95]
              text-[#F4EFE8]
            "
          >
            La próxima conversación empieza acá.
            <br />
            
          </h2>

          <p
            className="
              mt-10
              text-[22px]
              leading-10
              text-[#E4DDD2]
            "
          >
            Te esperamos
            <br />
            Hecho con tiempo, Hecho para vos.
          </p>

          <a
            href="https://wa.me/5493442XXXXXXXX"
            target="_blank"
            rel="noopener noreferrer"
            className="
              mt-16
              inline-flex
              items-center
              gap-3

              rounded-full
              border
              border-[#C7A467]

              px-12
              py-5

              uppercase
              tracking-[0.30em]
              text-[#F4EFE8]

              transition-all
              duration-300

              hover:bg-[#C7A467]
              hover:text-[#181818]
              hover:scale-105
            "
          >
            Reservar turno →
          </a>

        </motion.div>

      </div>
    </section>
  );
}