"use client";

import { Scissors, Crown, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const services = [
  {
    icon: Scissors,
    title: "Corte Clásico",
    description: "El estilo de siempre con terminaciones perfectas.",
    price: "$15.000",
  },
  {
    icon: Crown,
    title: "Corte + Barba",
    description: "Servicio completo con perfilado profesional.",
    price: "$22.000",
  },
  {
    icon: Sparkles,
    title: "Experiencia Premium",
    description: "Corte, barba, lavado y asesoramiento personalizado.",
    price: "$30.000",
  },
];

export default function Services() {
  return (
    <section className="bg-[#0B0B0B] py-28">
      <div className="mx-auto max-w-7xl px-8">

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-16 text-center"
        >
          <span className="uppercase tracking-[6px] text-[#C8A25A]">
            Servicios
          </span>

          <h2 className="mt-4 text-5xl font-black">
            Elegí tu experiencia
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-zinc-400">
            Cada servicio está pensado para que salgas con la mejor versión de vos mismo.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-3">
          {services.map((service, index) => {
            const Icon = service.icon;

            return (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.15,
                }}
                whileHover={{
                  y: -10,
                }}
                className="rounded-3xl border border-[#C8A25A]/20 bg-white/5 p-8 backdrop-blur-xl transition-all hover:border-[#C8A25A] hover:shadow-2xl"
              >
                <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C8A25A]/20">
                  <Icon className="h-8 w-8 text-[#C8A25A]" />
                </div>

                <h3 className="text-2xl font-bold">
                  {service.title}
                </h3>

                <p className="mt-4 text-zinc-400">
                  {service.description}
                </p>

                <div className="mt-8 text-3xl font-black text-[#C8A25A]">
                  {service.price}
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}