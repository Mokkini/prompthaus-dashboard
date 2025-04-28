// app/layout.js (WIEDER KORRIGIERT)

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import AuthListenerWrapper from '@/components/AuthListenerWrapper';
import CookieConsentBanner from "@/components/CookieConsentBanner";

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

export default function RootLayout({ children }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head />
      {/* --- BODY ZURÜCKGESETZT --- */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
        // Erklärung der Klassen:
        // - flex, h-screen, overflow-hidden ENTFERNT!
        // - min-h-screen: Sorgt dafür, dass der Body mindestens die Bildschirmhöhe hat (gut für Footer)
        // - bg-background/text-foreground: Beibehalten für Standardfarben
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
            {/* Kinder werden direkt gerendert */}
            {children}

            {/* Cookie Banner wird immer gerendert */}
            <CookieConsentBanner />
          </ThemeProvider>
        </AuthListenerWrapper>
      </body>
      {/* --- ENDE BODY ZURÜCKGESETZT --- */}
    </html>
  );
}
