// components/Sidebar.js - Angepasst, um 'user' Prop zu akzeptieren und weiterzugeben

import Link from 'next/link';
import Image from 'next/image';
import DashboardNav from './DashboardNav';

// Die Komponente akzeptiert jetzt die 'user'-Prop
export default function Sidebar({ user }) { // <-- user als Prop empfangen
  return (
    // Responsive Klassen bleiben unverändert
    <aside className="hidden md:flex w-64 bg-gray-100 dark:bg-gray-800 flex-col flex-shrink-0">
      {/* Logo-Bereich (unverändert) */}
      <div className="p-4 border-b">
        <Link href="/" aria-label="Zur PromptHaus Startseite">
          <Image
            src="/prompthaus-logo.png"
            alt="PromptHaus Logo"
            width={128}
            height={32}
            priority
            className="h-auto" // Stellt sicher, dass das Seitenverhältnis beibehalten wird
          />
        </Link>
      </div>

      {/* Navigation - user-Prop wird an DashboardNav weitergegeben */}
      <div className="flex flex-col flex-grow overflow-y-auto px-4 py-4">
         {/* --- HIER wird die user-Prop weitergegeben --- */}
         <DashboardNav user={user} />
         {/* --- ENDE Anpassung --- */}
      </div>

    </aside>
  );
}
