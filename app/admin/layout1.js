// app/(admin)/layout.js (NEUE DATEI)

import { createClient } from '@/lib/supabase/server'; // Supabase Server Client
import { redirect } from 'next/navigation';      // redirect importieren
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogOut, Home } from 'lucide-react';
import { logout } from '@/app/auth/actions'; // Importiere die Logout-Action <-- NEU & KORREKT


// Layout wird async, um Daten zu holen und Admin zu prüfen
export default async function AdminLayout({ children }) {
  const supabase = createClient();

  // Nutzerdaten holen
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // 1. Prüfen, ob User eingeloggt ist
  if (userError || !user) {
    console.log('Admin Layout: Kein Nutzer gefunden oder Fehler, leite zu /login um.');
    redirect('/login');
  }

  // 2. Prüfen, ob der User der Admin ist
  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  if (!isAdmin) {
    console.log(`Admin Layout: Nutzer ${user.email} ist kein Admin, leite zur Startseite um.`);
    redirect('/'); // Oder eine andere Seite, z.B. /unauthorized
  }

  // Wenn Admin, dann das Layout rendern
  console.log(`Admin Layout: Admin ${user.email} greift zu.`);

  return (
    // Grundstruktur für den Admin-Bereich
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Einfacher Admin-Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-border">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 py-3 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
            Admin Panel
          </h1>
          <div className="flex items-center gap-3">
             <Button variant="outline" size="sm" asChild>
                <Link href="/">
                    <Home className="mr-2 h-4 w-4" /> Zur Hauptseite
                </Link>
             </Button>
             <form action={logout}>
               <Button variant="outline" size="sm" type="submit">
                 <LogOut className="mr-2 h-4 w-4" /> Logout
               </Button>
             </form>
          </div>
        </div>
      </header>

      {/* Hauptinhalt der Admin-Seiten */}
      <main className="flex-grow container mx-auto py-8 px-4 md:px-6 lg:px-8">
        {children} {/* Hier werden deine Admin-Seiten (prompts/page.js etc.) gerendert */}
      </main>

      {/* Optional: Einfacher Admin-Footer */}
      <footer className="bg-gray-200 dark:bg-gray-800 text-center py-3 text-xs text-muted-foreground border-t border-border">
        PromptHaus Adminbereich
      </footer>
    </div>
  );
}
