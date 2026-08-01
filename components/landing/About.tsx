"use client";

import { motion } from "framer-motion";

export default function About() {
  return (
    <section className="bg-black py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-8 lg:grid-cols-2">

        {/* Imagen */}
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative h-[600px] overflow-hidden rounded-3xl"
        >
          <img
            src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?q=80&w=1200&auto=format&fit=crop"
            alt="Barbero"
            className="h-full w-full object-cover"
          />
        </motion.div>

        {/* Texto */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span className="uppercase tracking-[6px] text-[#C8A25A]">
            Nuestra Historia
          </span>

          <h2 className="mt-6 text-5xl font-black leading-tight">
            Mucho más
            <br />
            que un corte.
          </h2>

          <p className="mt-8 text-lg leading-9 text-zinc-400">
            En Don Segundo creemos que una barbería es un lugar donde cada
            cliente merece tiempo, dedicación y atención a los detalles.
          </p>

          <p className="mt-6 text-lg leading-9 text-zinc-400">
            Nuestro objetivo no es solamente que salgas con un buen corte,
            sino que disfrutes de una experiencia cómoda, profesional y
            personalizada desde que entrás hasta que te vas.
          </p>

          <div className="mt-14 grid grid-cols-3 gap-8">

            <div>
              <h3 className="text-5xl font-black text-[#C8A25A]">
                5★
              </h3>
              <p className="mt-2 text-zinc-400">
                Atención
              </p>
            </div>

            <div>
              <h3 className="text-5xl font-black text-[#C8A25A]">
                +500
              </h3>
              <p className="mt-2 text-zinc-400">
                Cortes
              </p>
            </div>

            <div>
              <h3 className="text-5xl font-black text-[#C8A25A]">
                100%
              </h3>
              <p className="mt-2 text-zinc-400">
                Pasión
              </p>
            </div>

          </div>

        </motion.div>

      </div>
    </section>
  );
}