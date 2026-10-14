"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Service = {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  active: boolean;
};

export default function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadServices() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("services")
        // "*" para no fallar si todavía no existe show_on_web (migración 13).
        .select("*")
        .eq("active", true)
        .order("price", { ascending: true });

      if (error) {
        console.error("Error loading services:", error);
        setLoading(false);
        return;
      }

      // Los servicios "solo panel" (ej. Kids) no se ofrecen en la web.
      setServices(
        (data ?? []).filter(
          (service: { show_on_web?: boolean | null }) => service.show_on_web !== false
        )
      );
      setLoading(false);
    }

    loadServices();
  }, []);

  return (
    <section
      id="services"
      className="relative scroll-mt-20 overflow-hidden py-24 md:py-32 lg:py-40"
    >
      {/* Imagen de fondo */}

      <img
        src="/images/services.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Overlay */}

      <div className="absolute inset-0 bg-[#11110f]/75" />

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,.60), rgba(0,0,0,.72), rgba(0,0,0,.86))",
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">

        {/* Encabezado */}

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-14 text-center md:mb-24"
        >
          <div className="mx-auto mb-8 h-px w-28 bg-[#7c6548]" />

          <h2 className="font-serif text-[clamp(2.4rem,5vw,4.5rem)] leading-tight text-[#F5EFE6]">
            Elegí tu experiencia.
          </h2>

          <p className="mt-5 text-[clamp(1.05rem,2vw,1.45rem)] italic text-[#cbb08b] md:mt-7">
            Donde los buenos cortes se mezclan con las mejores conversaciones.
          </p>
        </motion.div>

        {/* Cards */}

        {loading ? (
          <div className="text-center text-[#cbb08b]">
            Cargando servicios...
          </div>
        ) : services.length === 0 ? (
          <div className="text-center">
            <Link
              href="/reservar"
              className="inline-block border border-[#b08a5a] px-10 py-4 uppercase tracking-[0.3em] text-[#F4EEE5] transition hover:bg-[#b08a5a] hover:text-black"
            >
              Ver servicios y reservar
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 md:gap-8 xl:grid-cols-4">

            {services.map((service, index) => (

              <motion.div
                key={service.id}
                className="h-full"
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{
                  delay: index * 0.12,
                  duration: 0.7,
                }}
                whileHover={{
                  y: -10,
                  scale: 1.02,
                }}
              >
              <Link
                href={`/reservar?servicio=${service.id}`}
                aria-label={`Reservar ${service.name}`}
                className="
                  group
                  relative
                  flex
                  h-full
                  min-h-[340px]
                  flex-col
                  overflow-hidden
                  border
                  border-[#8a7152]/25
                  bg-[#181715]/55
                  px-7
                  py-10
                  backdrop-blur-md
                  transition-all
                  duration-500
                  hover:border-[#b08a5a]
                  hover:bg-[#223126]/65
                  hover:shadow-[0_20px_80px_rgba(0,0,0,.45)]
                  md:min-h-[470px]
                  md:px-12
                  md:py-14
                "
              >

                {/* Línea lateral */}

                <div className="absolute left-0 top-0 h-full w-px bg-[#6d573d]/40 transition-all duration-500 group-hover:bg-[#b08a5a]" />

                {/* Número */}

                <span
                  className="
                    absolute
                    -right-2
                    top-2
                    text-[120px]
                    font-black
                    leading-none
                    text-[#b08a5a]/10
                    transition-all
                    duration-500
                    group-hover:scale-110
                    group-hover:text-[#b08a5a]/20
                  "
                >
                  {(index + 1).toString().padStart(2, "0")}
                </span>

                {/* Línea */}

                <div className="mb-10 h-px w-14 bg-[#7a6447]" />

                {/* Título */}

                <h3 className="font-serif text-[1.9rem] leading-tight text-[#F4EEE5] md:text-[2.2rem]">
                  {service.name}
                </h3>

                {/* Descripción */}

                <p className="mt-5 text-base leading-8 text-[#ddd6cc]/85 md:mt-7 md:text-[17px] md:leading-9">
                  {service.description}
                </p>

                {/* Footer */}

                <div className="mt-auto pt-10 md:pt-14">

                  <div className="mb-5 h-px w-full bg-white/10" />

                  <p className="text-xs uppercase tracking-[0.35em] text-[#9b8465]">
                    {service.duration_minutes} MIN
                  </p>

                  {/* Precio y "Reservar" en la misma línea */}
                  <div className="mt-2 flex items-center justify-between gap-4">

                    <p className="font-serif text-lg text-[#F3EBDD]">
                      ${service.price.toLocaleString("es-AR")}
                    </p>

                    <span className="flex shrink-0 items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[#b08a5a]">
                      Reservar
                      <ArrowUpRight
                        size={20}
                        className="transition duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                      />
                    </span>

                  </div>

                </div>

              </Link>
              </motion.div>

            ))}

          </div>
        )}

      </div>
    </section>
  );
}