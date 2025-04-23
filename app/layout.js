// app/layout.js (VEREINFACHT)

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import AuthListenerWrapper from '@/components/AuthListenerWrapper';
import CookieConsentBanner from "@/components/CookieConsentBanner";
// KEINE Imports mehr für Navigation, Footer oder headers!

// Fonts bleiben gleich
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Metadaten bleiben gleich
export const metadata = {
  title: "PromptHaus",
  description: "Entdecke und nutze perfekte Prompts.",
};

// RootLayout ist NICHT mehr async, da wir keine User-Daten mehr hier brauchen
export default function RootLayout({ children }) {
  // KEIN User-Daten holen mehr hier!
  // KEINE Pfad-Erkennung mehr hier!

  return (
    <html lang="de" suppressHydrationWarning>
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* AuthListenerWrapper umschließt alles */}
        <AuthListenerWrapper>
          {/* ThemeProvider umschließt alles */}
          <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
            {/* KEIN spezielles Wrapper-Div oder <main> mehr hier */}
            {/* Die spezifischen Layouts (public, dashboard) kümmern sich darum */}
            {children}

            {/* Cookie Banner wird immer gerendert, Positionierung über CSS */}
            <CookieConsentBanner />
          </ThemeProvider>
        </AuthListenerWrapper>
      </body>
    </html>
  );
}
