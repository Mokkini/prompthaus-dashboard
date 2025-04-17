// app/(dashboard)/page.js
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShoppingCart } from 'lucide-react'; // Passende Icons

export default function DashboardHomePage() {
  // TODO: Shopify URL ggf. dynamisch laden
  const shopifyUrl = "https://prompthaus.de";

  return (
    <div className="space-y-6"> {/* Fügt vertikalen Abstand hinzu */}
      <h1 className="text-3xl font-bold tracking-tight">
        Willkommen zurück bei PromptHaus!
      </h1>

      <p className="text-muted-foreground">
        Wähle einen deiner vorhandenen Prompts aus oder entdecke neue Pakete im Shop,
        um deine Kommunikation auf das nächste Level zu heben.
      </p>

      <div className="flex flex-col sm:flex-row gap-4"> {/* Buttons nebeneinander (auf kleinen Screens untereinander) */}
        <Button asChild size="lg">
          <Link href="/meine-prompts">
            {/* *** NEU: Span um Text und Icon *** */}
            <span className="flex items-center">
              Zu meinen Prompts
              <ArrowRight className="ml-2 h-5 w-5" />
            </span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
           <Link href={shopifyUrl} target="_blank" rel="noopener noreferrer">
             {/* *** NEU: Span um Text und Icon *** */}
             <span className="flex items-center">
               Neue Prompts kaufen
               <ShoppingCart className="ml-2 h-5 w-5" />
             </span>
           </Link>
        </Button>
      </div>

      {/* Optional: Hier könnten später noch weitere Elemente hinzukommen,
          z.B. eine Übersicht der letzten Prompts oder Neuigkeiten */}

    </div>
  );
}