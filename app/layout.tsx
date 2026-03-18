import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";
import { Providers } from "./providers";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "VAKS - Plataforma de Vaquinhas Virtuais",
  description: "Crie e contribua com vaquinhas usando VAKS. Transforme suas ideias em realidade.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="scroll-smooth" suppressHydrationWarning>
      <body
        className={`${sourceSans.variable} font-sans antialiased bg-vaks-light-primary dark:bg-vaks-dark-primary`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
