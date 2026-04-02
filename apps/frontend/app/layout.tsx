import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";
import "flag-icons/css/flag-icons.min.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  preload: false,
});

export const metadata: Metadata = {
  title: "VAKS - Plataforma de Vaquinhas Virtuais",
  description: "Crie e contribua com vaquinhas usando VAKS. Transforme suas ideias em realidade.",
  icons: {
    icon: { url: "/logo_dark.svg", sizes: "64x64", type: "image/svg+xml" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var noop = function() {};
                ['log', 'info', 'warn', 'error', 'debug', 'trace', 'dir', 'table', 'group', 'groupEnd', 'groupCollapsed', 'assert', 'count', 'countReset', 'time', 'timeLog', 'timeEnd', 'clear', 'profile', 'profileEnd', 'timeStamp'].forEach(function(m) {
                  if (console[m]) console[m] = noop;
                });
                window.addEventListener('error', function(e) { e.preventDefault(); e.stopPropagation(); return true; }, true);
                window.addEventListener('unhandledrejection', function(e) { e.preventDefault(); e.stopPropagation(); return true; }, true);
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${sourceSans.variable} font-sans antialiased bg-vaks-light-primary dark:bg-vaks-dark-primary`}>
        <Providers>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
