import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Manrope } from "next/font/google";
import { BARBERSHOP } from "@/lib/barbershop";
import "./globals.css";

const heading = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
});

const body = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${BARBERSHOP.name} · Barbería en ${BARBERSHOP.city}`,
    template: `%s · ${BARBERSHOP.name}`,
  },
  description: BARBERSHOP.description,
  applicationName: BARBERSHOP.name,
  keywords: [
    "barbería",
    "barbería Concepción del Uruguay",
    "corte de pelo",
    "barba",
    "turnos online",
    "Don Segundo",
  ],
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: BARBERSHOP.legalName,
    title: `${BARBERSHOP.name} · Barbería en ${BARBERSHOP.city}`,
    description: BARBERSHOP.description,
    url: "/",
    images: [
      {
        url: "/images/hero.jpg",
        alt: BARBERSHOP.legalName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BARBERSHOP.name} · Barbería en ${BARBERSHOP.city}`,
    description: BARBERSHOP.description,
    images: ["/images/hero.jpg"],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#11110f",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-AR"
      className={`${heading.variable} ${body.variable}`}
    >
      <body className="bg-[#090909] text-[#F5F2EB] font-[family:var(--font-body)] antialiased">
        {children}
      </body>
    </html>
  );
}
