"use client";

import { motion } from "framer-motion";

export default function About() {
  return (
    <section
      id="about"
      className="relative overflow-hidden py-40"
     style={{
  background: `
    linear-gradient(
      to bottom,
      #1A1918 0%,
      #D6CCC0 3%,
      #CEC4B7 10%,
      #B7A28B 75%,
      #B7A28B 95%,
      #4A3A2D 100%
    )
  `,
}}
    >
      <div className="mx-auto grid max-w-7xl items-center gap-24 px-8 lg:grid-cols-[1fr_1.05fr]">

        {/* TEXTO */}

        <motion.div
          initial={{ opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: .8 }}
        >

          <div className="mb-10 h-px w-28 bg-[#59624f]" />

          <span className="text-lg uppercase tracking-[0.45em] text-[#59624f]">

            Nosotros

          </span>

          <h2
            className="
              mt-7
              font-serif
              text-[clamp(2.8rem,4vw,4.2rem)]
              leading-[1.08]
              text-[#263028]
            "
          >

            Manuel Cladera

          </h2>

          <p
            className="
              mt-12
              text-[22px]
              leading-[2.1rem]
              text-[#435046]
            "
          >

            "En Don Segundo creemos que una barbería sigue siendo uno
            de esos pocos lugares donde todavía existe el tiempo para
            una buena conversación."

            <br />
            <br />
           
            "Cada cliente llega con una historia distinta. Por eso nos
            gusta escuchar, entender qué busca y dedicarle el tiempo
            necesario para que cada detalle esté a la altura."

            <br />
            <br />
           
            "Más que un servicio, buscamos que cada visita sea un momento
            para desconectar de la rutina, compartir una charla y salir
            sintiéndote renovado."

          </p>

          {/* EXPERIENCIA */}

          <div className="mt-20 border-t border-[#b6ab99] pt-12">

            <div className="grid gap-10 md:grid-cols-2">

              <div>

                <h3 className="font-serif text-5xl text-[#55624F]">

                  +8

                </h3>

                <p className="mt-3 uppercase tracking-[0.22em] text-[#62625c]">

                  Años perfeccionando el oficio

                </p>

              </div>

              <div>

                <h3 className="font-serif text-5xl text-[#55624F]">

                  +1000

                </h3>

                <p className="mt-3 uppercase tracking-[0.22em] text-[#62625c]">

                  Clientes felices

                </p>

              </div>

              <div>

                <h3 className="font-serif text-5xl text-[#55624F]">

                  5

                </h3>

                <p className="mt-3 uppercase tracking-[0.22em] text-[#62625c]">

                  Continentes recorridos

                </p>

              </div>

              <div>

                <h3 className="font-serif text-5xl text-[#55624F]">

                  ∞

                </h3>

                <p className="mt-3 uppercase tracking-[0.22em] text-[#62625c]">

                  de Historias compartidas

                </p>

              </div>

            </div>

          </div>

        </motion.div>

        {/* FOTO */}

        <motion.div
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: .8 }}
          className="relative"
        >

          <img
            src="/images/about.jpg"
            alt="Don Segundo Barbería"
            className="
              h-[760px]
              w-full
              object-cover
              brightness-90
              contrast-95
              saturate-75
              shadow-[0_45px_90px_rgba(0,0,0,.18)]
            "
          />

          {/* Caja */}

          <div
            className="
              absolute
              -bottom-10
              -left-10
              max-w-sm
              bg-[#2E372F]/95
              px-10
              py-9
              backdrop-blur-lg
            "
          >

            <p className="text-xs uppercase tracking-[0.45em] text-[#B7A88F]">

              Don Segundo

            </p>

            <h4 className="mt-5 font-serif text-3xl leading-tight text-[#EFE8DD]">

               " Mas que un corte.
              <br />
              Una experiencia."

            </h4>

          </div>

        </motion.div>

      </div>
    </section>
  );
}