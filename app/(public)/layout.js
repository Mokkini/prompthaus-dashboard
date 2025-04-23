// app/(public)/layout.js (NEUE DATEI)

import Navigation from "@/components/Navigation"; // Öffentlicher Header
import Footer from "@/components/Footer";       // Öffentlicher Footer
import { createClient } from '@/lib/supabase/server'; // Für User-Daten im Header

// PublicLayout wird async, um User-Daten für Navigation zu holen
export default async function PublicLayout({ children }) {
  // User-Daten holen (jetzt hier, da Navigation hier ist)
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    // Wrapper Div für Flexbox-Layout (Sticky Footer)
    <div className="flex flex-col min-h-screen">
      {/* Öffentlichen Header einfügen */}
      <Navigation user={user} />

      {/* Hauptinhalt der öffentlichen Seiten */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Footer einfügen */}
      <Footer />
    </div>
  );
}
