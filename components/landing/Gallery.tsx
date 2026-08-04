"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const feed = [
  {
    image: "/images/feed1.jpg",
    likes: "248",
    text: "Fade + Beard",
  },
  {
    image: "/images/feed2.jpg",
    likes: "312",
    text: "Classic Cut",
  },
  {
    image: "/images/feed3.jpg",
    likes: "284",
    text: "Low Fade",
  },
  {
    image: "/images/feed4.jpg",
    likes: "361",
    text: "Buzz Cut",
  },
];

export default function Gallery() {

  const [active, setActive] = useState(0);

  const nextPost = () => {

    if (active < feed.length - 1) {

      setActive(active + 1);

    }

  };

  const prevPost = () => {

    if (active > 0) {

      setActive(active - 1);

    }

  };

  const handleWheel = (e: React.WheelEvent) => {

    e.preventDefault();

    if (e.deltaY > 0) {

      nextPost();

    } else {

      prevPost();

    }

  };

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
              text-[21px]
              leading-10
              text-[#263028]
            "
          >
            Deslizá sobre el teléfono para recorrer
            algunas publicaciones de nuestro
            Instagram.

          </p>

          <a
            href="https://instagram.com/barberia.donsegundo"
            target="_blank"
            className="
              mt-10
              inline-flex
              items-center
              gap-3
              border-b
              border-[#B99663]
              pb-2
              uppercase
              tracking-[0.35em]
              text-[#263028]
              transition
              hover:text-white
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
              h-[760px]
              w-[420px]
              -translate-x-1/2
              rounded-[70px]
              bg-black/40
              blur-[60px]
            "
          />

          {/* teléfono */}

          <div
            onWheel={handleWheel}
            className="
              relative
              rotate-[5deg]
              cursor-pointer
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
                  h-[860px]
                  w-[430px]
                  overflow-hidden
                  rounded-[58px]
                  border-[12px]
                  border-black
                  bg-black
                  shadow-[0_40px_80px_rgba(0,0,0,.55)]
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

                {/* pantalla */}

                <AnimatePresence mode="wait">

                  <motion.div
                    key={active}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: .35 }}
                    className="absolute inset-0"
                  >

                    {/* FOTO */}

                    <img
                      src={feed[active].image}
                      className="
                        w-full
                        h-full
                        object-contain
                        bg-[#101010]
                        "
                    />
                    
                  </motion.div>

                </AnimatePresence>

              </div>

            </a>

          </div>

          {/* indicador */}

          <div className="mt-10 text-center">

            <p
              className="
                text-sm
                uppercase
                tracking-[0.45em]
                text-[#A98755]
              "
            >

              {String(active + 1).padStart(2, "0")}
              {" "}
              /
              {" "}
              {String(feed.length).padStart(2, "0")}

            </p>

          </div>

        </motion.div>

      </div>

    </section>

  );

}