"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BARBERSHOP } from "@/lib/barbershop";

const feed = [
  { image: "/images/feed1.jpg", alt: "Corte realizado en Don Segundo" },
  { image: "/images/feed2.jpg", alt: "Trabajo de barbería en Don Segundo" },
  { image: "/images/feed3.jpg", alt: "Perfilado de barba en Don Segundo" },
  { image: "/images/feed4.jpg", alt: "Resultado final de un corte en Don Segundo" },
];

export default function Gallery() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % feed.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [paused]);

  const previous = () => setActive((active - 1 + feed.length) % feed.length);
  const next = () => setActive((active + 1) % feed.length);

  return (
    <section
      id="gallery"
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
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-14 px-5 sm:px-10 lg:flex-row lg:justify-between lg:gap-24">
        {/* ================= TEXTO ================= */}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-lg"
        >
          <div className="mb-8 h-px w-24 bg-[#7E6645]" />

          <span className="text-sm uppercase tracking-[0.35em] text-[#263028] md:text-base md:tracking-[0.45em]">
            Galería
          </span>

          <h2 className="mt-6 font-serif text-[clamp(2.6rem,5vw,5rem)] leading-[1] text-[#263028] md:mt-8">
            Nuestro
            <br />
            trabajo.
          </h2>

          <p className="mt-6 max-w-[420px] text-lg leading-8 text-[#263028] md:mt-10 md:text-[21px] md:leading-10">
            Descubrí algunos de nuestros trabajos y seguinos en Instagram.
          </p>

          <a
            href={BARBERSHOP.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-3 border-b border-[#B99663] pb-2 text-sm uppercase tracking-[0.25em] text-[#263028] transition-all duration-300 hover:border-[#8A6537] hover:text-[#8A6537] md:mt-12 md:text-base md:tracking-[0.35em]"
          >
            @{BARBERSHOP.instagramHandle}
          </a>
        </motion.div>

        {/* ================= TELÉFONO ================= */}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          {/* sombra */}
          <div className="absolute left-1/2 top-12 h-[85%] w-[115%] -translate-x-1/2 rounded-[70px] bg-black/45 blur-[70px]" />

          {/* Flechas */}
          <button
            type="button"
            onClick={previous}
            aria-label="Foto anterior"
            className="absolute -left-5 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-all hover:bg-black/70 sm:-left-16 sm:h-12 sm:w-12 lg:-left-[70px]"
          >
            <ArrowLeft size={18} />
          </button>

          <button
            type="button"
            onClick={next}
            aria-label="Foto siguiente"
            className="absolute -right-5 top-1/2 z-50 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition-all hover:bg-black/70 sm:-right-16 sm:h-12 sm:w-12 lg:-right-[70px]"
          >
            <ArrowRight size={18} />
          </button>

          <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="relative rotate-[3deg] select-none lg:rotate-[5deg]"
          >
            <a
              href={BARBERSHOP.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ver más trabajos en Instagram"
            >
              <div className="relative h-[540px] w-[250px] overflow-hidden rounded-[44px] border-[10px] border-black bg-black shadow-[0_45px_90px_rgba(0,0,0,.55)] transition-transform duration-500 hover:scale-[1.02] sm:h-[700px] sm:w-[320px] sm:rounded-[54px] lg:h-[900px] lg:w-[400px] lg:rounded-[62px] lg:border-[12px]">
                {/* Dynamic Island */}
                <div className="absolute left-1/2 top-3 z-50 h-6 w-24 -translate-x-1/2 rounded-full bg-black lg:top-4 lg:h-8 lg:w-36" />

                <AnimatePresence mode="wait">
                  <motion.img
                    key={active}
                    src={feed[active].image}
                    alt={feed[active].alt}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.45 }}
                    className="absolute inset-0 h-full w-full bg-black object-cover"
                  />
                </AnimatePresence>
              </div>
            </a>
          </div>

          {/* Indicadores */}
          <div className="mt-8 flex justify-center gap-3">
            {feed.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={active === i}
                className={`rounded-full transition-all duration-300 ${
                  active === i
                    ? "h-[7px] w-8 bg-[#B99663]"
                    : "h-[7px] w-[7px] bg-[#6A6256]"
                }`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
