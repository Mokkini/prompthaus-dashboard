// app/(dashboard)/layout.js
import Sidebar from '@/components/Sidebar'; // Importiere Sidebar
import Header from '@/components/Header';   // Importiere Header

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar /> {/* Füge die Sidebar hinzu */}
      <div className="flex flex-col flex-1">
        <Header /> {/* Füge den Header hinzu */}
        <main className="flex-1 p-6"> {/* Hauptinhaltsbereich */}
          {children} {/* Hier wird der Inhalt der jeweiligen Seite geladen */}
        </main>
      </div>
    </div>
  );
}