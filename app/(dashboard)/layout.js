// app/(dashboard)/layout.js - Angepasst, um 'user' an Sidebar zu übergeben

import '@/app/globals.css';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar'; // <-- HIER WIRD SIE IMPORTIERT
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }) {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // Wenn kein Benutzer eingeloggt ist oder ein Fehler auftritt, zur Login-Seite weiterleiten
  if (userError || !user) {
    console.log("Kein Benutzer eingeloggt oder Fehler beim Abrufen:", userError?.message);
    redirect('/login');
  }

  // Wenn der Benutzer eingeloggt ist, das Dashboard-Layout rendern
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar wird hier gerendert */}
      {/* --- NEU: user-Prop an Sidebar übergeben --- */}
      <Sidebar user={user} />
      {/* --- ENDE NEU --- */}

      {/* Hauptinhaltsbereich (wo deine page.js-Dateien landen) */}
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        {/* Header wird hier gerendert (user-Prop wird bereits übergeben) */}
        <Header user={user} />
        <main className="p-4 md:p-8 flex-1">
          {children} {/* <-- Hier wird der Inhalt der aktuellen Seite eingefügt */}
        </main>
      </div>
    </div>
  );
}

// Metadaten für das Dashboard-Layout
export const metadata = {
  title: 'Prompthaus Dashboard',
  description: 'Verwaltung deiner Prompts',
};
