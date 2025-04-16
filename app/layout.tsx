// app/layout.tsx
import AuthButton from '../components/AuthButton'; // Pfad prüfen!
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google"; // Korrigierter Importname für Geist Sans
import "./globals.css";

// Korrekter Aufruf für Geist Sans Variable
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PromptHaus Dashboard", // Titel angepasst
  description: "Verwaltung deiner Prompts", // Beschreibung angepasst
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Sprache auf Deutsch gesetzt
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Einfache Navigationsleiste hinzugefügt */}
        <nav style={{ padding: '10px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ fontWeight: 'bold' }}>PromptHaus</div> {/* Beispiel Logo/Titel */}
          <AuthButton /> {/* HIER WIRD DER BUTTON EINGEFÜGT */}
        </nav>
        {/* Hauptinhalt mit etwas Abstand */}
        <main style={{ padding: '0 20px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}