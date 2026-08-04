"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const timeline = [
  {
    year: "2016",
    location: "CONCEPCIÓN DEL URUGUAY",
    title: "Todo empezó",
    text:
      "La pasión por este oficio nació mucho antes de viajar por el mundo. Todo comenzó con una máquina, una silla y muchas ganas de aprender.",
    image: "/images/timeline-1.jpg",
  },
  {
    year: "2018",
    location: "NUEVA ZELANDA",
    title: "Nuevos comienzos",
    text:
      "Vivir lejos de casa significó aprender nuevas técnicas, conocer otras culturas y trabajar con clientes de todas partes del mundo.",
    image: "/images/timeline-2.jpg",
  },
  {
    year: "2021 · 2025",
    location: "ASIA · OCEANÍA · EUROPA",
    title: "Seguir aprendiendo",
    text:
      "Cada país dejó una enseñanza distinta. Nuevas formas de trabajar, nuevas personas y una visión mucho más amplia del oficio.",
    image: "/images/timeline-3.jpg",
  },
  {
    year: "2026",
    location: "DON SEGUNDO",
    title: "El sueño",
    text:
      "Todo el camino recorrido hoy vive dentro de Don Segundo. Cada corte representa un poco de esa historia.",
    image: "/images/timeline-5.jpg",
  },
];

const positions = [
  {
    left: "8%",
    top: "33%",
    rotate: -7,
  },
  {
    left: "31%",
    top: "23%",
    rotate: 3,
  },
  {
    left: "56%",
    top: "33%",
    rotate: -4,
  },
  {
    left: "79%",
    top: "23%",
    rotate: 4,
  },
];

export default function TimelineV3() {
  const [active, setActive] = useState(2);

  return (
    <section className="relative overflow-hidden bg-[#15120F]">

      <img
        src="/images/timeline.jpg"
        className="absolute inset-0 h-full w-full object-cover"
        alt=""
      />

      <div className="absolute inset-0 bg-black/65" />

      <div className="relative mx-auto max-w-[1800px] min-h-[1100px]">

        {/* HEADER */}
        {/* ================= HEADER ================= */}

<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.7 }}
  className="pt-16 text-center"
>
  <p className="uppercase tracking-[0.45em] text-[25px] text-[#C7A467]">
    EL CAMINO DE MANU
  </p>

  <div className="mt-3 mx-auto flex items-center w-[320px]">
  <div className="flex-1 h-px bg-[#6C5638]" />

  <div className="mx-4 h-[6px] w-[6px] rotate-45 border border-[#C7A467]" />

  <div className="flex-1 h-px bg-[#6C5638]" />
</div>
</motion.div>

{/* ================= CAMINO ================= */}

<svg
  className="absolute left-[7%] top-[42%] w-[86%] h-[170px]"
  viewBox="0 0 1500 170"
  preserveAspectRatio="none"
>
  <path
    d="
    M20 90

    C180 0 320 0 430 90

    S720 180 860 90

    S1160 0 1480 90
    "
    fill="none"
    stroke="#B38B54"
    strokeWidth="2.4"
    strokeDasharray="5 10"
    strokeLinecap="round"
  />
</svg>

{/* ================= POLAROIDS ================= */}

{timeline.map((item, index) => (
  <motion.div
    key={item.year}
    style={{
      left: positions[index].left,
      top: positions[index].top,
    }}
    className="absolute"
    whileHover={{
      y: -12,
      rotate: 0,
      scale: 1.03,
    }}
    transition={{ duration: .25 }}
    onClick={() => setActive(index)}
  >
    <motion.div
      animate={{
        scale: active === index ? 1.05 : 1,
      }}
      transition={{ duration: .25 }}
      style={{
        rotate: `${positions[index].rotate}deg`,
      }}
      className="
      relative
      w-[270px]
      bg-[#F1ECE3]
      p-[10px]
      shadow-[0_25px_40px_rgba(0,0,0,.45)]
      "
    >
      {/* Chinche */}

      <div
        className="
        absolute
        left-1/2
        -top-[8px]
        -translate-x-1/2
        h-4
        w-4
        rounded-full
        bg-gradient-to-b
        from-[#D6B67E]
        to-[#8B6336]
        shadow-lg
        z-20
      "
      />

      {/* FOTO */}

      <img
        src={item.image}
        alt=""
        className="
        w-full
        h-[235px]
        object-cover
      "
      />

      {/* PIE */}

      <div className="pt-4 pb-2 text-center">

        <h2
         className="
             font-serif
             text-[30px]
             leading-none
             text-[#3B4332]
            "
            >
          {item.year}
        </h2>

        <p
         
         className="
             mt-2
             text-[10px]
             uppercase
             tracking-[0.40em]
             font-medium
             text-[#3F4A33]
          "
        >
          {item.location}
        </p>
      </div>
    </motion.div>
  </motion.div>
))}

{/* ================= TARJETA ================= */}

<AnimatePresence mode="wait">
  <motion.div
    key={active}
    initial={{ opacity: 0, y: 25 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: .35 }}
    className="
      absolute
      left-1/2
      bottom-[8%]
      -translate-x-1/2
      text-center
      w-[650px]
    "
  >

    <p
      className="
        uppercase
        tracking-[0.45em]
        text-[11px]
        text-[#B89259]
      "
    >
      {timeline[active].location}
    </p>

    <h2
      className="
        mt-2
        font-serif
        text-[48px]
        leading-none
        text-[#EFE7DB]
      "
    >
      {timeline[active].title}
    </h2>

    <div className="mt-5 flex justify-center items-center gap-4">

      <div className="h-px w-20 bg-[#7A603A]" />

      <div className="w-[7px] h-[7px] rotate-45 bg-[#C7A467]" />

      <div className="h-px w-20 bg-[#7A603A]" />

    </div>

    <p
      className="
        mt-7
        mx-auto
        max-w-[560px]
        text-[18px]
        leading-8
        text-[#DDD5CA]
      "
    >
      {timeline[active].text}
    </p>

    <div className="mt-10 flex justify-center gap-3">

      {timeline.map((_, i) => (

        <button
          key={i}
          onClick={() => setActive(i)}
          className={`
            transition-all
            rounded-full
            ${
              active === i
                ? "w-8 h-[8px] bg-[#C7A467]"
                : "w-[8px] h-[8px] bg-[#666055]"
            }
          `}
        />

      ))}

    </div>

  </motion.div>
</AnimatePresence>

      </div>
    </section>
  );
}