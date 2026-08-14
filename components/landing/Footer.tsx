"use client";

export default function Footer() {
  return (
    
    <footer 
          id="footer"
          className="bg-[#000000] border-t border-[#171717]">
      <div className="absolute inset-0 bg-black/45" />

      <div className="mx-auto max-w-7xl px-10 py-8">

        <div className="flex flex-wrap items-start justify-between gap-10">

          {/* LOGO */}

          <img
            src="/logo.png"
            alt="Don Segundo"
            className="w-16 opacity-90"
          />

          {/* DIRECCIÓN */}

          <a
            href="https://maps.google.com/?q=Mitre+866+Concepción+del+Uruguay"
            target="_blank"
            className="group"
          >

            <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-[#D7CCB8]">
              Dirección
            </p>

            <p className="text-sm leading-6 text-[#B6A894] transition group-hover:text-[#C29A62]">
              Mitre 866
              <br />
              Abrir Maps
            </p>

          </a>

          {/* INSTAGRAM */}

          <a
            href="https://instagram.com/barberia.donsegundo"
            target="_blank"
            className="group"
          >

            <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-[#D7CCB8]">
              Instagram
            </p>

            <p className="text-sm leading-6 text-[#B6A894] transition group-hover:text-[#C29A62]">
              @barberia.donsegundo
              <br />
              Abrir perfil
            </p>

          </a>

          {/* EMAIL */}

          <a
            href="mailto:barberiadonsegundo@gmail.com"
            className="group"
          >

            <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-[#D7CCB8]">
              Email
            </p>

            <p className="text-sm leading-6 text-[#B6A894] transition group-hover:text-[#C29A62]">
              barberiadonsegundo@gmail.com
              <br />
              Enviar mail
            </p>

          </a>

          {/* HORARIOS */}

          <div>

            <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-[#D7CCB8]">
              Horarios
            </p>

            <p className="text-sm leading-6 text-[#B6A894]">
              Lun - Vie · 09:00 — 20:00
              <br />
              Sáb · 09:00 — 18:00
            </p>

          </div>

        </div>

        {/* Línea */}

        <div className="my-6 h-px bg-[#171717]" />

        {/* COPYRIGHT */}

        <div className="flex flex-col items-center justify-between gap-3 text-[10px] uppercase tracking-[0.28em] text-[#6F675F] md:flex-row">

          <p>
            © 2026 DON SEGUNDO BARBERÍA
          </p>

          <a
            href="mailto:paulhandley2001@gmail.com"
            className="transition hover:text-[#C29A62]"
          >
            Página web por Paul Handley
          </a>

        </div>

      </div>

    </footer>
  );
}