// components/Sidebar.js
import DashboardNav from './DashboardNav'; // Importiere die ausgelagerten Nav-Links

export default function Sidebar() {
  return (
    // WICHTIG: 'hidden md:flex' hinzugefügt, um die Sidebar auf kleinen Screens auszublenden
    <aside className="hidden md:flex w-64 bg-gray-100 dark:bg-gray-800 flex-col h-screen">
      {/* Optional: Logo oder Titel hier */}
      <div className="p-4"> {/* Padding für den Titel */}
          <h2 className="text-lg font-semibold">PromptHaus Menü</h2>
      </div>

      {/* Hier die ausgelagerte Navigation einfügen */}
      {/* Das flex-grow sorgt dafür, dass der Shopify-Link nach unten geschoben wird */}
      <div className="flex flex-col flex-grow overflow-y-auto">
         <DashboardNav />
      </div>
    </aside>
  );
}