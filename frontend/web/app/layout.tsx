import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import "@/styles/globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { Toaster } from "@/components/ui/sonner";

const fontDisplay = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const fontBody = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cinedica",
  description: "Cinedica, o melhor site de recomendação de filmes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${fontDisplay.variable} ${fontBody.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
