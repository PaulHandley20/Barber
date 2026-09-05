"use client";

import { useEffect, useState } from "react";
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
        .select("*");

      console.log("SERVICES DATA:", data);
      console.log("SERVICES ERROR:", error);

      if (error) {
        console.error("Error loading services:", error);
        setLoading(false);
        return;
      }

      setServices(data ?? []);
      setLoading(false);
    }

    loadServices();
  }, []);

  return (
    <section
      id="services"
      className="relative overflow-hidden py-40"
    >
      {/* Imagen de fondo */}

      <img
        src="/images/services.jpg"
        alt=""
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

      <div className="relative z-10 mx-auto max-w-7xl px-8">

        {/* Encabezado */}

        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-24 text-center"
        >
          <div className="mx-auto mb-8 h-px w-28 bg-[#7c6548]" />

          <h3 className="font-serif text-[clamp(2.7rem,5vw,4.5rem)] text-[#F5EFE6]">
            Elegí tu experiencia.
          </h3>

          <p className="mt-7 text-[clamp(1.15rem,2vw,1.45rem)] italic text-[#cbb08b]">
            Donde los buenos cortes se mezclan con las mejores conversaciones.
          </p>
        </motion.div>

        {/* Cards */}

        {loading ? (
          <div className="text-center text-[#cbb08b]">
            Cargando servicios...
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">

            {services.map((service, index) => (

              <motion.div
                key={service.id}
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
                className="
                  group
                  relative
                  flex
                  min-h-[470px]
                  flex-col
                  overflow-hidden
                  border
                  border-[#8a7152]/25
                  bg-[#181715]/55
                  px-12
                  py-14
                  backdrop-blur-md
                  transition-all
                  duration-500
                  hover:border-[#b08a5a]
                  hover:bg-[#223126]/65
                  hover:shadow-[0_20px_80px_rgba(0,0,0,.45)]
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

                <h3 className="font-serif text-[2.2rem] leading-tight text-[#F4EEE5]">
                  {service.name}
                </h3>

                {/* Descripción */}

                <p className="mt-7 text-[17px] leading-9 text-[#ddd6cc]/85">
                  {service.description}
                </p>

                {/* Footer */}

                <div className="mt-auto pt-14">

                  <div className="mb-5 h-px w-full bg-white/10" />

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-xs uppercase tracking-[0.35em] text-[#9b8465]">
                        {service.duration_minutes} MIN
                      </p>

                      <p className="mt-2 font-serif text-lg text-[#F3EBDD]">
                        ${service.price.toLocaleString("es-AR")}
                      </p>

                    </div>

                    <ArrowUpRight
                      size={22}
                      className="text-[#b08a5a] transition duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                    />

                  </div>

                </div>

              </motion.div>

            ))}

          </div>
        )}

      </div>
    </section>
  );
}