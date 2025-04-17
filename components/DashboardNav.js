// components/DashboardNav.js
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Package, Settings, User, ExternalLink } from 'lucide-react';

export default function DashboardNav() {
    // TODO: Lade die Shopify URL dynamisch (z.B. aus .env)
    const shopifyUrl = "https://prompthaus.de";

    return (
        <> {/* React Fragment, um mehrere Elemente zurückzugeben */}
            {/* Hauptnavigation */}
            <nav className="flex flex-col space-y-1 px-2 py-4"> {/* Abstand und Padding angepasst */}
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

            {/* Shopify Link separat, ggf. unten */}
             <div className="mt-auto px-2 py-4"> {/* Stellt sicher, dass er unten ist */}
                <Button variant="outline" className="w-full justify-start" asChild>
                    <Link href={shopifyUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Zum PromptHaus Shop
                    </Link>
                </Button>
            </div>
        </>
    );
}