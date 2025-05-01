// app/(public)/layout.js (NEUE DATEI)
// WIRD WIEDER EINE SERVER COMPONENT!

import Navigation from "@/components/Navigation"; // Öffentlicher Header
import Footer from "@/components/Footer";       // Öffentlicher Footer
// createClient wird hier nicht mehr benötigt, da der User in Navigation geholt wird
// import { createClient } from '@/lib/supabase/server';

// PublicLayout ist jetzt eine einfache Server Component
export default function PublicLayout({ children }) {
  // User-Daten werden nicht mehr hier geholt

  return (
    // Wrapper Div für Flexbox-Layout (Sticky Footer)
    <div className="flex flex-col min-h-screen">
      {/* Navigation wird hier gerendert und holt den User selbst */}
      <Navigation />

      {/* Hauptinhalt der öffentlichen Seiten */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer einfügen */}
      <Footer />
    </div>
  );
}
