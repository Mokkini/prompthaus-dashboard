// app/layout.tsx
import AuthButton from '../components/AuthButton'; // Pfad prüfen!
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider"; // ThemeProvider importieren

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
  title: "PromptHaus Dashboard",
  description: "Verwaltung deiner Prompts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head />
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
          {/* Deine bestehende Navigation */}
          <nav style={{ padding: '10px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ fontWeight: 'bold' }}>PromptHaus</div>
            <AuthButton />
          </nav>
          {/* Dein Hauptinhalt */}
          <main style={{ padding: '0 20px' }}>
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}