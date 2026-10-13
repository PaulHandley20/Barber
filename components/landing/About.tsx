"use client";

import { motion } from "framer-motion";

export default function About() {
  return (
    <section
      id="about"
      className="relative scroll-mt-20 overflow-hidden py-24 md:py-32 lg:py-40"
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
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-5 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-24">

        {/* TEXTO */}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: .8 }}
        >

          <div className="mb-8 h-px w-28 bg-[#59624f] md:mb-10" />

          <span className="text-sm uppercase tracking-[0.35em] text-[#59624f] md:text-lg md:tracking-[0.45em]">

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
              mt-8
              text-[17px]
              leading-8
              text-[#435046]
              md:mt-12
              md:text-[22px]
              md:leading-[2.1rem]
            "
          >

            &ldquo;En Don Segundo creemos que una barbería sigue siendo uno
            de esos pocos lugares donde todavía existe el tiempo para
            una buena conversación.&rdquo;

            <br />
            <br />
           
            &ldquo;Cada cliente llega con una historia distinta. Por eso nos
            gusta escuchar, entender qué busca y dedicarle el tiempo
            necesario para que cada detalle esté a la altura.&rdquo;

            <br />
            <br />
           
            &ldquo;Más que un servicio, buscamos que cada visita sea un momento
            para desconectar de la rutina, compartir una charla y salir
            sintiéndote renovado.&rdquo;

          </p>

          {/* EXPERIENCIA */}

          <div className="mt-12 border-t border-[#b6ab99] pt-10 md:mt-20 md:pt-12">

            <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:gap-10">

              <div>

                <p className="font-serif text-4xl text-[#55624F] md:text-5xl">

                  +8

                </p>

                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#62625c] md:text-base md:tracking-[0.22em]">

                  Años perfeccionando el oficio

                </p>

              </div>

              <div>

                <p className="font-serif text-4xl text-[#55624F] md:text-5xl">

                  +1000

                </p>

                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#62625c] md:text-base md:tracking-[0.22em]">

                  Clientes felices

                </p>

              </div>

              <div>

                <p className="font-serif text-4xl text-[#55624F] md:text-5xl">

                  5

                </p>

                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#62625c] md:text-base md:tracking-[0.22em]">

                  Continentes recorridos

                </p>

              </div>

              <div>

                <p className="font-serif text-4xl text-[#55624F] md:text-5xl">

                  ∞

                </p>

                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#62625c] md:text-base md:tracking-[0.22em]">

                  de Historias compartidas

                </p>

              </div>

            </div>

          </div>

        </motion.div>

        {/* FOTO */}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: .8 }}
          className="relative mb-10 lg:mb-0"
        >

          <img
            src="/images/about.jpg"
            alt="Manu trabajando en Don Segundo Barbería"
            loading="lazy"
            className="
              h-[440px]
              sm:h-[600px]
              lg:h-[760px]
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
              -bottom-8
              left-4
              right-4
              bg-[#2E372F]/95
              px-7
              py-6
              sm:left-auto
              sm:right-auto
              sm:max-w-sm
              lg:-bottom-10
              lg:-left-10
              lg:px-10
              lg:py-9
              backdrop-blur-lg
            "
          >

            <p className="text-xs uppercase tracking-[0.45em] text-[#B7A88F]">

              Don Segundo

            </p>

            <p className="mt-4 font-serif text-2xl leading-tight text-[#EFE8DD] lg:mt-5 lg:text-3xl">
              &ldquo;Más que un corte.
              <br />
              Una experiencia.&rdquo;

            </p>

          </div>

        </motion.div>

      </div>
    </section>
  );
}