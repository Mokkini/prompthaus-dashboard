// app/(dashboard)/layout.js
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { createClient } from '@/lib/supabase/server'; // Supabase Server Client importieren
import { redirect } from 'next/navigation';      // redirect importieren

// Layout wird async, um Daten zu holen
export default async function DashboardLayout({ children }) {
  const supabase = createClient();

  // Nutzerdaten holen
  const { data: { user }, error } = await supabase.auth.getUser();

  // Wenn kein Nutzer oder Fehler -> zum Login umleiten
  // WICHTIG: Stellt sicher, dass nur eingeloggte Nutzer das Dashboard sehen
  if (error || !user) {
    console.log('Dashboard Layout: Kein Nutzer gefunden oder Fehler, leite zu /login um.');
    redirect('/login');
  }

  // Log zur Überprüfung (kann später entfernt werden)
  console.log('Dashboard Layout: User gefunden:', user?.email);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar user={user} /> {/* Nutzerdaten auch an Sidebar übergeben (optional) */}
      <div className="flex flex-col flex-1">
        {/* Nutzerdaten an Header übergeben */}
        <Header user={user} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}