// components/DashboardNav.js - Angepasste Reihenfolge

import Link from 'next/link';
import { Button } from "@/components/ui/button";
// Icons importieren
import { Package, Settings, User, Home } from 'lucide-react'; // Layers entfernt

export default function DashboardNav() {
    return (
        <>
            {/* Hauptnavigation */}
            <nav className="flex flex-col space-y-1 px-2 py-4 flex-grow">
                {/* --- NEUE REIHENFOLGE --- */}

                {/* 1. Zur Startseite */}
                <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/"> {/* Link zur Startseite */}
                        <Home className="mr-2 h-4 w-4" />
                        Zur Startseite
                    </Link>
                </Button>

                {/* 2. Meine Prompts */}
                <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/meine-prompts">
                        <Package className="mr-2 h-4 w-4" />
                        Meine Prompts
                    </Link>
                </Button>

                {/* 3. Profil */}
                <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/profil">
                        <User className="mr-2 h-4 w-4" />
                        Profil
                    </Link>
                </Button>

                {/* 4. Einstellungen */}
                <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/einstellungen">
                        <Settings className="mr-2 h-4 w-4" />
                        Einstellungen
                    </Link>
                </Button>

                {/* --- ENDE NEUE REIHENFOLGE --- */}

                {/* Der Block mit "Alle Kategorien" wurde entfernt */}

            </nav>
        </>
    );
}
