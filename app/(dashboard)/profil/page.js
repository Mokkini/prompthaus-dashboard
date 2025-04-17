// app/(dashboard)/profil/page.js
import { createClient } from '@/lib/supabase/server'; // Dein Supabase Client Pfad
import { redirect } from 'next/navigation';
import { Button } from "@/components/ui/button"; // Import für späteren Button
import PasswordChangeForm from '@/components/PasswordChangeForm';

// Die Page Komponente muss 'async' sein, um 'await' nutzen zu können
export default async function ProfilePage() {
  const supabase = createClient();

  // Aktuellen Benutzer von Supabase abrufen
  const { data: { user } } = await supabase.auth.getUser();

  // Falls aus irgendeinem Grund kein User gefunden wird
  // (sollte durch Layout-Schutz/Middleware eigentlich nicht passieren)
  if (!user) {
    return redirect('/login');
  }

  return (
    <div className="space-y-6"> {/* Fügt Abstände zwischen den Elementen hinzu */}
      <h1 className="text-2xl font-semibold">Mein Profil</h1>

      {/* Benutzerinformationen in einer Card oder einem Div */}
      <div className="bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-4">
          Benutzerinformationen
        </h3>
        {/* Verwendung eines Definition List (dl) für die Darstellung */}
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              E-Mail-Adresse
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {user.email} {/* Zeige die E-Mail des Benutzers an */}
            </dd>
          </div>
          {/* Beispiel für weitere Infos (optional, auskommentiert) */}
          {/*
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Benutzer-ID
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {user.id}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Mitglied seit
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100">
              {user.created_at ? new Date(user.created_at).toLocaleDateString('de-DE') : 'N/A'}
            </dd>
          </div>
           */}
        </dl>
      </div>

      {/* Sektion für Sicherheitseinstellungen */}
      <div className="bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 rounded-lg p-6">
         <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-4">
           Sicherheit
         </h3>
         {/* Platzhalter für Passwortänderung */}
        <PasswordChangeForm />
      </div>
    </div>
  );
}