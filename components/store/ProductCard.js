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
import { Zap, Check } from 'lucide-react'; // Check-Icon für die Liste

// Preisformatierung bleibt unverändert
function formatPrice(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    if (amount === 0) return 'Kostenlos';
    return '';
  }
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// Komponente ProductCard
export function ProductCard({ prompt }) {

  if (!prompt) {
    return null;
  }

  const { id, name, description, price, image_url, prompt_variants, slug } = prompt;

  // --- Varianten-Logik VEREINFACHT ---
  // Wir holen alle Varianten, keine Begrenzung mehr
  const variants = Array.isArray(prompt_variants) ? prompt_variants : [];
  // MAX_VISIBLE_VARIANTS, visibleVariants, hiddenVariantsCount entfernt
  // --- Ende Varianten-Logik ---

  const checkoutUrl = slug ? `/checkout/${slug}` : (id ? `/checkout/${id}` : null);
  const displayPrice = formatPrice(price);

  return (
    <Card className="group flex flex-col h-full transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg border rounded-lg overflow-hidden bg-card">

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
        <CardTitle className="text-lg font-semibold transition-colors group-hover:text-primary">
          {name || 'Unbenanntes Paket'}
        </CardTitle>
        <CardDescription className="text-sm line-clamp-3 min-h-[3em] text-muted-foreground">
          {description || 'Keine Beschreibung verfügbar.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow pt-2 pb-4 flex flex-col">

        {/* --- ANGEPASST: Anzeige ALLER Varianten als Bullet-Point-Liste --- */}
        {variants.length > 0 && (
          <div className="mb-4 mt-2">
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {/* Zeige ALLE Varianten als Listeneinträge */}
              {variants.map((variant, index) => ( // Iteriere direkt über 'variants'
                <li key={index} className="flex items-start">
                  <Check className="h-4 w-4 mr-2 mt-0.5 text-primary flex-shrink-0" />
                  <span title={variant.title || 'Variante'}>
                    {variant.title || 'Variante'}
                  </span>
                </li>
              ))}
              {/* Der "+X mehr"-Listeneintrag wurde entfernt */}
            </ul>
          </div>
        )}
        {/* --- ENDE Varianten --- */}

        {/* Preis (bleibt erhalten, wird durch mt-auto nach unten geschoben) */}
        {displayPrice && (
          <p className="text-xl font-bold text-primary mt-auto pt-4">
            {displayPrice}
          </p>
        )}
        {/* Fallback, damit Liste oben bleibt, wenn kein Preis da ist */}
        {!displayPrice && variants.length > 0 && <div className="mt-auto"></div>}

      </CardContent>

      {/* CardFooter mit dem Link-Button (bleibt gleich) */}
      <CardFooter className="pt-0 pb-4">
        {checkoutUrl ? (
          <Button asChild className="w-full">
            <Link href={checkoutUrl}>
              Details & Kaufen <Zap className="ml-2 h-4 w-4" />
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
