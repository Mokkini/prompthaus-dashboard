// components/DashboardNav.js - Ohne Shop-Button

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Package, Settings, User } from 'lucide-react'; // ExternalLink entfernt

export default function DashboardNav() {
    // Die Variable shopifyUrl wird nicht mehr benötigt

    return (
        <> {/* React Fragment */}
            {/* Hauptnavigation */}
            <nav className="flex flex-col space-y-1 px-2 py-4 flex-grow"> {/* flex-grow hinzugefügt, damit es den Platz einnimmt */}
                <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/meine-prompts">
                        <Package className="mr-2 h-4 w-4" />
                        Meine Prompts
                    </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/profil">
                        <User className="mr-2 h-4 w-4" />
                        Profil
                    </Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                    <Link href="/einstellungen">
                        <Settings className="mr-2 h-4 w-4" />
                        Einstellungen
                    </Link>
                </Button>
            </nav>

            {/* Der Shopify Link wurde entfernt */}
            {/* <div className="mt-auto px-2 py-4"> ... </div> */}
        </>
    );
}
