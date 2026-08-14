"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const timeline = [
  {
    year: "2016",
    location: "CONCEPCIÓN DEL URUGUAY",
    title: "Donde empezó todo",
    text:
      "Empecé a cortar el pelo en 2003, cuando tenía 14 años. Antes, a los 7 u 8, ya jugaba a ponerle ruleros a mi abuela María del Valle. Mi abuela paterna, Juana, también era peluquera. Con el tiempo estudié estilismo y encontré un gran mentor: Claudio Gatt.",
    images: [
      "/images/timeline-1-1.jpg",
      "/images/timeline-1-2.jpg",
      "/images/timeline-1-3.jpg",
    ],
  },

  {
    year: "2019",
    location: "NUEVA ZELANDA",
    title: "El mundo como escuela",
    text:
      "En Nueva Zelanda conocí nuevas formas de trabajar, culturas e historias de personas de todo el mundo. Aprendí que cuando algo se hace con pasión, no existen barreras: ni el idioma, ni la cultura, ni la distancia.",
    images: [
      "/images/timeline-2-1.jpg",
      "/images/timeline-2-2.jpg",
      "/images/timeline-2-3.jpg",
    ],
  },

  {
    year: "2019 · 2025",
    location: "ASIA · OCEANÍA · EUROPA",
    title: "Seguir aprendiendo",
    text:
      "Corté el pelo a personas de muchísimos lugares y cada una dejó algo distinto. Conocí culturas, historias y formas de vivir que ampliaron mi manera de ver el oficio. Bali, especialmente, me enseñó a valorar el presente y disfrutar cada día.",
    images: [
      "/images/timeline-3-1.jpg",
      "/images/timeline-3-2.jpg",
      "/images/timeline-3-3.jpg",
    ],
  },

  {
    year: "2026",
    location: "DON SEGUNDO",
    title: "Volver a casa",
    text:
      "Después de más de siete años lejos, decidí volver a Argentina. A mi tierra, mi cultura y la ciudad que me vio crecer. Don Segundo nació en 2016 y lleva el nombre de mi abuelo Manuel Segundo. Hoy, todo lo aprendido vuelve a casa.",
    images: [
      "/images/timeline-4-1.jpg",
      "/images/timeline-4-2.jpg",
      "/images/timeline-4-3.jpg",
    ],
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

  const [photoIndexes, setPhotoIndexes] = useState(
    timeline.map(() => 0)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setPhotoIndexes((prev) =>
        prev.map((photoIndex, timelineIndex) => {
          const totalPhotos = timeline[timelineIndex].images.length;

          return (photoIndex + 1) % totalPhotos;
        })
      );
    }, 2500);

    return () => clearInterval(interval);
  }, []);

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

      <div className="relative w-full h-[235px] overflow-hidden">

        <AnimatePresence mode="wait">

          <motion.img
            key={photoIndexes[index]}
            src={item.images[photoIndexes[index]]}
            alt=""
            initial={{
              opacity: 0,
              scale: 1.03,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              scale: 0.98,
            }}
            transition={{
              duration: 0.5,
              ease: "easeInOut",
            }}
            className="
              absolute
              inset-0
              h-full
              w-full
              object-cover
            "
          />

  </AnimatePresence>

</div>

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