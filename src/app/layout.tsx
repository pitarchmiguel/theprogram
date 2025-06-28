import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CrossFit Trainer - Programación de Entrenamientos",
  description: "Aplicación móvil para programar y gestionar entrenamientos de CrossFit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
        <Toaster 
          position="bottom-right"
          richColors
          closeButton
        />
      </body>
    </html>
  );
}
