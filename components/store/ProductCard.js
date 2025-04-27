// components/store/ProductCard.js
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Importiere Badge für Kategorie (und ggf. 'beliebt')
import { Zap } from 'lucide-react'; // Icon für Button

function formatPrice(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    if (amount === 0) return 'Kostenlos';
    return ''; // Kein Preis anzeigen, wenn ungültig und nicht 0
  }
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function ProductCard({ prompt }) {
  if (!prompt) {
    return null; // Frühzeitiger Ausstieg, wenn kein Prompt übergeben wird
  }

  // Destrukturiere nur die Eigenschaften, die von der Übersichtsseite kommen
  const { id, name, description, price, image_url, slug, tags, category } = prompt;

  // Filtere spezielle Tags wie 'beliebt' heraus, wenn sie nicht als Text angezeigt werden sollen
  const displayTags = Array.isArray(tags) ? tags.filter(tag => tag.toLowerCase() !== 'beliebt') : [];

  const checkoutUrl = slug ? `/checkout/${slug}` : (id ? `/checkout/${id}` : null);
  const displayPrice = formatPrice(price);

  return (
    <Card className="group flex flex-col h-full transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-1 hover:ring-primary/30 border rounded-lg overflow-hidden bg-card relative">

      {/* Beliebt-Badge (bleibt bestehen) */}
      {Array.isArray(tags) && tags.some(tag => tag.toLowerCase() === 'beliebt') && (
        <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded font-medium shadow-sm z-10">
          Beliebt
        </div>
      )}

      {/* Bild (bleibt bestehen) */}
      {image_url && (
        <div className="relative w-full h-40 md:h-48 overflow-hidden">
          <img
            src={image_url}
            alt={name || 'Paket-Vorschau'}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}

      <CardHeader className="pt-4 pb-2">
        {/* Kategorie (bleibt bestehen) */}
        {category && (
          <p className="text-xs uppercase tracking-wider text-primary/60 mb-1 font-medium">
            {category}
          </p>
        )}
        {/* Titel (bleibt bestehen) */}
        <CardTitle className="text-lg font-semibold transition-colors group-hover:text-primary">
          {name || 'Unbenanntes Paket'}
        </CardTitle>
        {/* Beschreibung (bleibt bestehen, wird wichtiger!) */}
        <CardDescription className="text-sm line-clamp-3 min-h-[3em] text-muted-foreground">
          {description || 'Keine Beschreibung verfügbar.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow pt-2 pb-4 flex flex-col">

        {/* --- NEU: Anzeige von Tags als Liste --- */}
        {displayTags.length > 0 && (
          <div className="mb-4 mt-2 text-sm text-muted-foreground"> {/* Optional: Klasse für Styling */}
            <ul className="list-disc list-inside space-y-1"> {/* Liste mit Bullet Points */}
              {displayTags.map((tag, index) => (
                <li key={index}>
                  {tag}
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* --- ENDE: Anzeige von Tags --- */}

         {/* --- PREIS ANZEIGE (bleibt bestehen) --- */}
         <div className="mt-auto pt-4"> {/* Sorgt dafür, dass Preis+MwSt. unten bleiben */}
          {displayPrice && (
            <>
              <p className="text-xl font-bold text-primary">
                {displayPrice}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                inkl. MwSt.
              </p>
            </>
          )}
          {/* Fallback, falls kein Preis, aber z.B. Tags da sind, um Layout zu halten */}
          {!displayPrice && displayTags.length > 0 && <div className="mt-auto"></div>}
        </div>
        {/* --- ENDE PREIS ANZEIGE --- */}
      </CardContent>

      <CardFooter className="pt-0 pb-4">
        {/* Button (bleibt bestehen) */}
        {checkoutUrl ? (
          <Button asChild className="w-full">
            <Link href={checkoutUrl}>
              Kaufen <Zap className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button disabled className="w-full">
            Kauf nicht möglich
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
