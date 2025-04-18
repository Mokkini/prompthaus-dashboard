// components/Sidebar.js
import Link from 'next/link'; // Hinzugefügt für den Logo-Link
import Image from 'next/image'; // Hinzugefügt für das Logo-Bild
import DashboardNav from './DashboardNav'; // Dein bestehender Import für die Navigation

export default function Sidebar() {
  return (
    // WICHTIG: 'hidden md:flex' bleibt bestehen für die Responsivität
    <aside className="hidden md:flex w-64 bg-gray-100 dark:bg-gray-800 flex-col h-screen">

      {/* Logo-Bereich: H2 ersetzt durch Link mit Image */}
      <div className="p-4"> {/* Bestehendes Padding für den Logo-Bereich */}
        <Link href="/" aria-label="Zur PromptHaus Startseite"> {/* Link zur Startseite */}
          <Image
            src="/prompthaus-logo.png" // Pfad zum Logo im public-Ordner
            alt="PromptHaus Logo"      // Alt-Text für das Logo
            width={128}               // Breite des Logos (kannst du anpassen)
            height={32}               // Höhe des Logos (kannst du anpassen)
            priority                  // Bild wird priorisiert geladen
          />
        </Link>
      </div>

      {/* Navigation: Bleibt unverändert */}
      {/* Das flex-grow sorgt dafür, dass die Navigation den restlichen Platz einnimmt */}
      <div className="flex flex-col flex-grow overflow-y-auto px-4"> {/* Optional px-4 hinzugefügt, falls Nav-Elemente zu nah am Rand sind */}
         <DashboardNav />
      </div>

    </aside>
  );
}