// app/(dashboard)/einstellungen/page.js
import { ThemeSwitcher } from '@/components/ThemeSwitcher'; // Importiere den Switcher

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Einstellungen</h1>

      {/* Abschnitt für Erscheinungsbild/Theme */}
      <div className="bg-white dark:bg-gray-800 shadow border border-gray-200 dark:border-gray-700 rounded-lg p-6">
         <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 mb-4">
           Erscheinungsbild
         </h3>
         <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">
                Wähle das gewünschte Farbschema für das Dashboard.
            </p>
            {/* Hier den Theme Switcher einfügen */}
            <ThemeSwitcher />
         </div>
      </div>

      {/* Hier können später weitere Einstellungs-Sektionen hinzukommen */}

    </div>
  );
}