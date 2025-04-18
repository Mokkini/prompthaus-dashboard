// app/layout.js

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
// KORRIGIERTER IMPORT: Kein '/auth/' Unterordner
import AuthListenerWrapper from '@/components/AuthListenerWrapper'; // Pfad korrigiert!

// Korrekter Aufruf für Geist Sans Variable
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

// RootLayout bleibt gleich
export default function RootLayout({ children }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* AuthListenerWrapper umschließt ThemeProvider und den Rest */}
        <AuthListenerWrapper>
          <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
            <main className="flex flex-col min-h-screen">
              {children}
            </main>
          </ThemeProvider>
        </AuthListenerWrapper>
      </body>
    </html>
  );
}