import { Manrope, Sora } from "next/font/google";

/*
  Tipografía única del panel (BarberOS).
  Antes cada sección cargaba su propia combinación (Manrope, Sora,
  Plus Jakarta, Space Grotesk…) y el panel se veía distinto según la
  página. Ahora todo usa estas dos:

  - Manrope → interfaz y textos (--font-barberos-ui)
  - Sora    → títulos y TODOS los números (--font-barberos-display y
              --font-barberos-data). Horarios, precios, contadores y
              métricas usan la misma letra que las tarjetas KPI.
*/
export const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-barberos-ui",
});

export const sora = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-barberos-display",
});

/* Mismo archivo que `sora`, expuesto con el nombre que usan los datos. */
export const dataFont = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-barberos-data",
});

export const adminFontVariables = `${manrope.variable} ${sora.variable} ${dataFont.variable}`;
