// components/DashboardNav.js - Angepasst mit bedingtem Admin-Link

import Link from 'next/link';
import { Button } from "@/components/ui/button";
// Icons importieren
import { Package, Settings, User, Home, ShieldCheck } from 'lucide-react';

// Die Komponente erwartet jetzt eine 'user'-Prop
export default function DashboardNav({ user }) {
    // Prüfe, ob der Benutzer Admin ist (E-Mail-Vergleich)
    // Stelle sicher, dass ADMIN_EMAIL in deinen Umgebungsvariablen gesetzt ist!
    // (z.B. in .env.local oder den Systemeinstellungen deines Hostings)
    const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL; // NEXT_PUBLIC_, falls im Client benötigt, sonst nur process.env.ADMIN_EMAIL

    return (
        <>
            {/* Hauptnavigation */}
            <nav className="flex flex-col space-y-1 px-2 py-4 flex-grow">
                {/* --- REIHENFOLGE --- */}

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

                {/* --- Admin-Bereich Link (BEDINGT) --- */}
                {/* Wird nur gerendert, wenn isAdmin true ist */}
                {isAdmin && (
                    <Button variant="ghost" className="w-full justify-start mt-4 border-t pt-4" asChild>
                        <Link href="/admin">
                            <ShieldCheck className="mr-2 h-4 w-4 text-red-500" /> {/* Icon für Admin */}
                            Admin-Bereich
                        </Link>
                    </Button>
                )}
                {/* --- ENDE Admin-Bereich Link --- */}

            </nav>
        </>
    );
}
