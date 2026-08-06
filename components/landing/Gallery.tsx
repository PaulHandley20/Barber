"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const feed = [
  {
    image: "/images/feed1.jpg",
  },
  {
    image: "/images/feed2.jpg",
  },
  {
    image: "/images/feed3.jpg",
  },
  {
    image: "/images/feed4.jpg",
  },
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

  return (

    <section
      id="gallery"
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

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-24 px-10">
      
        {/* ================= TEXTO ================= */}

<motion.div
  initial={{ opacity: 0, x: -50 }}
  whileInView={{ opacity: 1, x: 0 }}
  viewport={{ once: true }}
  transition={{ duration: .8 }}
  className="max-w-lg"
>

  <div className="mb-8 h-px w-24 bg-[#7E6645]" />

  <span
    className="
      uppercase
      tracking-[0.45em]
      text-[#263028]
    "
  >
    Galería
  </span>

  <h2
    className="
      mt-8
      font-serif
      text-[clamp(3rem,5vw,5rem)]
      leading-[1]
      text-[#263028]
    "
  >
    Nuestro
    <br />
    trabajo.
  </h2>

  <p
    className="
      mt-10
      max-w-[420px]
      text-[21px]
      leading-10
      text-[#263028]
    "
  >
    Descubrí algunos de nuestros trabajos y
    seguinos en Instagram.
  </p>

  <a
    href="https://instagram.com/barberia.donsegundo"
    target="_blank"
    className="
      mt-12
      inline-flex
      items-center
      gap-3
      border-b
      border-[#B99663]
      pb-2
      uppercase
      tracking-[0.35em]
      text-[#263028]
      transition-all
      duration-300
      hover:text-[#8A6537]
      hover:border-[#8A6537]
    "
  >
    @barberia.donsegundo
  </a>

</motion.div>
{/* ================= IPHONE ================= */}

<motion.div
  initial={{ opacity: 0, x: 60 }}
  whileInView={{ opacity: 1, x: 0 }}
  viewport={{ once: true }}
  transition={{ duration: .8 }}
  className="relative"
>

  {/* sombra */}

  <div
    className="
      absolute
      left-1/2
      top-12
      h-[820px]
      w-[460px]
      -translate-x-1/2
      rounded-[70px]
      bg-black/45
      blur-[70px]
    "
  />

  {/* Flecha izquierda */}

  <button
    onClick={() =>
      setActive((active - 1 + feed.length) % feed.length)
    }
    className="
      absolute
      left-[-70px]
      top-1/2
      -translate-y-1/2
      z-50
      h-12
      w-12
      rounded-full
      bg-black/30
      text-white
      backdrop-blur
      transition-all
      hover:bg-black/60
    "
  >
    ←
  </button>

  {/* Flecha derecha */}

  <button
    onClick={() =>
      setActive((active + 1) % feed.length)
    }
    className="
      absolute
      right-[-70px]
      top-1/2
      -translate-y-1/2
      z-50
      h-12
      w-12
      rounded-full
      bg-black/30
      text-white
      backdrop-blur
      transition-all
      hover:bg-black/60
    "
  >
    →
  </button>

  {/* TELEFONO */}

  <div
    onMouseEnter={() => setPaused(true)}
    onMouseLeave={() => setPaused(false)}
    className="
      relative
      rotate-[5deg]
      select-none
    "
  >

    <a
      href="https://instagram.com/barberia.donsegundo"
      target="_blank"
    >

      <div
        className="
          relative
          h-[900px]
          w-[400px]
          overflow-hidden
          rounded-[62px]
          border-[12px]
          border-black
          bg-black
          shadow-[0_45px_90px_rgba(0,0,0,.55)]
          transition-transform
          duration-500
          hover:scale-[1.02]
        "
      >

        {/* Dynamic Island */}

        <div
          className="
            absolute
            left-1/2
            top-4
            z-50
            h-8
            w-36
            -translate-x-1/2
            rounded-full
            bg-black
          "
        />

        <AnimatePresence mode="wait">

          <motion.img
            key={active}
            src={feed[active].image}
            initial={{
              opacity: 0,
              x: 40
            }}
            animate={{
              opacity: 1,
              x: 0
            }}
            exit={{
              opacity: 0,
              x: -40
            }}
            transition={{
              duration: .45
            }}
            className="
                absolute
                inset-0
                w-full
                h-full
                object-cover
                bg-black
              "
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
        onClick={() => setActive(i)}
        className={`
          rounded-full
          transition-all
          duration-300
          ${
            active === i
              ? "h-[7px] w-8 bg-[#B99663]"
              : "h-[7px] w-[7px] bg-[#6A6256]"
          }
        `}
      />

    ))}

  </div>
</motion.div>

      </div>

    </section>

  );

}