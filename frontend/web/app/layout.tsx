import type { Metadata } from "next";
import { Manrope, Inter } from "next/font/google";
import "@/styles/globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { BoiEasterEgg } from "@/components/BoiEasterEgg";

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
  // Movie film-strip favicon (public/icon-*.png). Declared explicitly so it
  // wins over the app/favicon.ico convention and ships in the static export.
  icons: {
    icon: [
      { url: "/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-96.png", sizes: "96x96", type: "image/png" },
    ],
    shortcut: "/icon-32.png",
    apple: "/icon-96.png",
  },
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
        <BoiEasterEgg />
      </body>
    </html>
  );
}
