// app/(dashboard)/layout.js

import '@/app/globals.css';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar'; // <-- HIER WIRD SIE IMPORTIERT
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }) {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.log("Kein Benutzer eingeloggt oder Fehler beim Abrufen:", userError?.message);
    redirect('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar wird hier gerendert */}
      <Sidebar /> {/* <-- HIER WIRD SIE GERENDERT */}

      {/* Hauptinhaltsbereich (wo deine llm-settings/page.js landet) */}
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {/* Stelle sicher, dass 'user' korrekt übergeben wird */}
        <Header user={user} />
        <main className="p-4 md:p-8 flex-1">
          {children} {/* <-- Hier wird der Inhalt von page.js eingefügt */}
        </main>
      </div>
    </div>
  );
}

// Metadaten
export const metadata = {
  title: 'Prompthaus Dashboard',
  description: 'Verwaltung deiner Prompts',
};
