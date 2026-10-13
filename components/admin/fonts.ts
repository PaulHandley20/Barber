import { DM_Mono, Manrope, Sora } from "next/font/google";

/*
  Tipografía única del panel (BarberOS).
  Antes cada sección cargaba su propia combinación (Manrope, Sora,
  Plus Jakarta, Space Grotesk…) y el panel se veía distinto según la
  página. Ahora todo usa estas tres:

  - Manrope → interfaz y textos         (--font-barberos-ui)
  - Sora    → títulos y números grandes (--font-barberos-display)
  - DM Mono → códigos y datos tabulares (--font-barberos-data)
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

export const dmMono = DM_Mono({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  variable: "--font-barberos-data",
});

export const adminFontVariables = `${manrope.variable} ${sora.variable} ${dmMono.variable}`;
