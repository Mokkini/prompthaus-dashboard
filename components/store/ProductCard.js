// components/store/ProductCard.js

// "use client"; // Nicht mehr zwingend nötig, da keine Klick-Handler mehr direkt hier sind

import Link from 'next/link'; // Wichtig: Link importieren
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// useState, useTransition, createCheckoutSession, loadStripe werden hier nicht mehr benötigt

// Hilfsfunktion zum Formatieren des Preises (kann bleiben, falls du sie woanders brauchst oder hier wieder einsetzt)
function formatPrice(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '';
  }
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// Komponente ProductCard
export function ProductCard({ prompt }) {
  // Kein isPending State und kein handleCheckout Handler mehr nötig

  if (!prompt) {
    return null;
  }

  // Stelle sicher, dass das prompt-Objekt einen 'slug' hat.
  // Falls nicht, musst du ihn ggf. in der /pakete Seite hinzufügen oder hier eine ID verwenden.
  const checkoutUrl = prompt.slug ? `/checkout/${prompt.slug}` : null;
  const displayPrice = formatPrice(prompt.price);

  // JSX für die Karte mit Hover-Effekten
  return (
    <Card className="group flex flex-col h-full transition-transform duration-300 hover:-translate-y-2 hover:shadow-lg">
      <CardHeader>
        <CardTitle className="transition-colors group-hover:text-primary">
          {prompt.name || 'Unbenanntes Paket'}
        </CardTitle>
        <CardDescription className="line-clamp-3 min-h-[3rem]">
          {prompt.description || 'Keine Beschreibung verfügbar.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow pt-2 pb-4">
        {displayPrice && (
          <p className="text-2xl font-bold text-primary mb-4">{displayPrice}</p>
        )}
        {/* Hier könntest du weitere Details anzeigen, falls gewünscht */}
      </CardContent>
      <CardFooter>
        {/* --- GEÄNDERTER BUTTON -> LINK --- */}
        {/* Prüfe, ob eine URL vorhanden ist (also ein Slug existiert) */}
        {checkoutUrl ? (
          <Button asChild className="w-full">
            {/* Der Link führt zur Checkout-Seite mit dem Slug des Pakets */}
            <Link href={checkoutUrl}>
              Details & Kaufen {/* Text angepasst */}
            </Link>
          </Button>
        ) : (
          <Button disabled className="w-full">
            Kauf nicht möglich {/* Fallback, falls kein Slug */}
          </Button>
        )}
        {/* --- ENDE LINK --- */}
      </CardFooter>
    </Card>
  );
} // Ende Komponente
