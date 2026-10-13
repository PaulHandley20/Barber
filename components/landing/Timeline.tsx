"use client";

import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
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
    <section
      id="timeline"
      className="relative scroll-mt-24 overflow-hidden bg-[#15120F]"
    >
      {/* ====================================================== */}
      {/* FONDO */}
      {/* ====================================================== */}

      <img
        src="/images/timeline.jpg"
        className="absolute inset-0 h-full w-full object-cover"
        alt=""
        aria-hidden="true"
        loading="lazy"
      />

      <div className="absolute inset-0 bg-black/65" />

      {/* ====================================================== */}
      {/* CONTENEDOR */}
      {/* ====================================================== */}

      <MobileTimeline
        active={active}
        setActive={setActive}
        photoIndexes={photoIndexes}
      />

      <div className="relative mx-auto hidden min-h-[1100px] max-w-[1800px] xl:block">

        {/* ====================================================== */}
        {/* HEADER */}
        {/* ====================================================== */}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="pt-16 text-center"
        >
          <p className="text-[25px] uppercase tracking-[0.45em] text-[#C7A467]">
            EL CAMINO DE MANU
          </p>

          <div className="mx-auto mt-3 flex w-[320px] items-center">
            <div className="h-px flex-1 bg-[#6C5638]" />

            <div className="mx-4 h-[6px] w-[6px] rotate-45 border border-[#C7A467]" />

            <div className="h-px flex-1 bg-[#6C5638]" />
          </div>
        </motion.div>

        {/* ====================================================== */}
        {/* CAMINO */}
        {/* ====================================================== */}

        <svg
          className="absolute left-[7%] top-[42%] h-[170px] w-[86%]"
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

        {/* ====================================================== */}
        {/* POLAROIDS */}
        {/* ====================================================== */}

        {timeline.map((item, index) => (
          <motion.div
            key={item.year}
            style={{
              left: positions[index].left,
              top: positions[index].top,
            }}
            className="absolute cursor-pointer"
            whileHover={{
              y: -12,
              rotate: 0,
              scale: 1.03,
            }}
            transition={{ duration: 0.25 }}
            onClick={() => setActive(index)}
          >
            <motion.div
              animate={{
                scale: active === index ? 1.05 : 1,
              }}
              transition={{ duration: 0.25 }}
              style={{
                rotate: `${positions[index].rotate}deg`,
              }}
              className="
                relative
                w-[230px]
                bg-[#F1ECE3]
                2xl:w-[270px]
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
                  z-20
                  h-4
                  w-4
                  -translate-x-1/2
                  rounded-full
                  bg-gradient-to-b
                  from-[#D6B67E]
                  to-[#8B6336]
                  shadow-lg
                "
              />

              {/* FOTO */}

              <div className="relative h-[200px] w-full overflow-hidden 2xl:h-[235px]">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={photoIndexes[index]}
                    src={item.images[photoIndexes[index]]}
                    alt={`${item.title} · ${item.location}`}
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

              <div className="pb-2 pt-4 text-center">
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
                    font-medium
                    uppercase
                    tracking-[0.40em]
                    text-[#3F4A33]
                  "
                >
                  {item.location}
                </p>
              </div>
            </motion.div>
          </motion.div>
        ))}

        {/* ====================================================== */}
        {/* TARJETA */}
        {/* ====================================================== */}

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="
              absolute
              bottom-[8%]
              left-1/2
              w-[650px]
              -translate-x-1/2
              text-center
            "
          >
            <p
              className="
                text-[11px]
                uppercase
                tracking-[0.45em]
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

            <div className="mt-5 flex items-center justify-center gap-4">
              <div className="h-px w-20 bg-[#7A603A]" />

              <div className="h-[7px] w-[7px] rotate-45 bg-[#C7A467]" />

              <div className="h-px w-20 bg-[#7A603A]" />
            </div>

            <p
              className="
                mx-auto
                mt-7
                max-w-[560px]
                text-[18px]
                leading-8
                text-[#DDD5CA]
              "
            >
              {timeline[active].text}
            </p>

            {/* INDICADORES */}

            <div className="mt-10 flex justify-center gap-3">
              {timeline.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Ver historia ${i + 1}`}
                  className={`
                    rounded-full
                    transition-all
                    ${
                      active === i
                        ? "h-[8px] w-8 bg-[#C7A467]"
                        : "h-[8px] w-[8px] bg-[#666055]"
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
/*
  Versión mobile/tablet: las polaroids se deslizan en una fila
  horizontal y el texto de la etapa elegida aparece debajo.
*/
function MobileTimeline({
  active,
  setActive,
  photoIndexes,
}: {
  active: number;
  setActive: Dispatch<SetStateAction<number>>;
  photoIndexes: number[];
}) {
  return (
    <div className="relative px-5 py-20 sm:px-8 xl:hidden">
      <div className="text-center">
        <p className="text-base uppercase tracking-[0.35em] text-[#C7A467] sm:text-xl">
          El camino de Manu
        </p>

        <div className="mx-auto mt-3 flex w-[240px] items-center">
          <div className="h-px flex-1 bg-[#6C5638]" />
          <div className="mx-4 h-[6px] w-[6px] rotate-45 border border-[#C7A467]" />
          <div className="h-px flex-1 bg-[#6C5638]" />
        </div>
      </div>

      <div className="-mx-5 mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-6 pt-4 [scrollbar-width:none] sm:-mx-8 sm:px-8">
        {timeline.map((item, index) => (
          <button
            key={item.year}
            type="button"
            onClick={() => setActive(index)}
            aria-pressed={active === index}
            className={`relative w-[200px] shrink-0 snap-center bg-[#F1ECE3] p-2 text-left shadow-[0_20px_35px_rgba(0,0,0,.45)] transition-transform duration-300 sm:w-[230px] ${
              active === index ? "-translate-y-2 ring-2 ring-[#C7A467]" : ""
            }`}
            style={{ rotate: `${positions[index].rotate / 2}deg` }}
          >
            <div className="relative h-[180px] w-full overflow-hidden sm:h-[210px]">
              <AnimatePresence mode="wait">
                <motion.img
                  key={photoIndexes[index]}
                  src={item.images[photoIndexes[index]]}
                  alt={`${item.title} · ${item.location}`}
                  loading="lazy"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </AnimatePresence>
            </div>

            <div className="pb-1 pt-3 text-center">
              <p className="font-serif text-2xl leading-none text-[#3B4332]">
                {item.year}
              </p>
              <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.3em] text-[#3F4A33]">
                {item.location}
              </p>
            </div>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="mx-auto mt-8 max-w-xl text-center"
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-[#B89259]">
            {timeline[active].location}
          </p>

          <h3 className="mt-2 font-serif text-4xl leading-none text-[#EFE7DB]">
            {timeline[active].title}
          </h3>

          <p className="mt-6 text-base leading-8 text-[#DDD5CA]">
            {timeline[active].text}
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="mt-8 flex justify-center gap-3">
        {timeline.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Ver etapa ${i + 1}`}
            className={`rounded-full transition-all ${
              active === i
                ? "h-[8px] w-8 bg-[#C7A467]"
                : "h-[8px] w-[8px] bg-[#666055]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
