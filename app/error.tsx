"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[#11110f] px-6 text-center text-[#F4EEE5]">
      <div className="max-w-md">
        <div className="mx-auto mb-8 h-px w-20 bg-[#b08a5a]" />
        <p className="text-xs uppercase tracking-[0.38em] text-[#9b8465]">
          Algo salió mal
        </p>
        <h1 className="mt-5 font-serif text-4xl leading-tight md:text-5xl">
          No pudimos cargar esta página.
        </h1>
        <p className="mt-5 text-sm leading-7 text-[#aaa198]">
          Probá de nuevo en unos segundos. Si el problema sigue, escribinos por
          Instagram y te ayudamos con tu turno.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="bg-[#b08a5a] px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#171512] transition hover:bg-[#c09a6c]"
          >
            Reintentar
          </button>
          <Link
            href="/"
            className="border border-white/15 px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#ddd6cc] transition hover:border-[#b08a5a]/70"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
