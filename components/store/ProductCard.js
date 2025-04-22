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
import { Zap, Check } from 'lucide-react';

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

export function ProductCard({ prompt }) {
  if (!prompt) {
    return null;
  }

  const { id, name, description, price, image_url, prompt_variants, slug, tags, category } = prompt;
  const variants = Array.isArray(prompt_variants) ? prompt_variants : [];
  const checkoutUrl = slug ? `/checkout/${slug}` : (id ? `/checkout/${id}` : null);
  const displayPrice = formatPrice(price);

  return (
    <Card className="group flex flex-col h-full transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-1 hover:ring-primary/30 border rounded-lg overflow-hidden bg-card relative">

      {/* Beliebt-Badge */}
      {tags?.includes('beliebt') && (
        <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs px-2 py-1 rounded font-medium shadow-sm z-10">
          Beliebt
        </div>
      )}

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
        {category && (
          <p className="text-xs uppercase tracking-wider text-primary/60 mb-1 font-medium">
            {category}
          </p>
        )}
        <CardTitle className="text-lg font-semibold transition-colors group-hover:text-primary">
          {name || 'Unbenanntes Paket'}
        </CardTitle>
        <CardDescription className="text-sm line-clamp-3 min-h-[3em] text-muted-foreground">
          {description || 'Keine Beschreibung verfügbar.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-grow pt-2 pb-4 flex flex-col">

        {variants.length > 0 && (
          <div className="mb-4 mt-2 bg-muted/30 rounded-md p-3">
            <p className="text-sm font-medium mb-2 text-muted-foreground">
              Dieses Paket enthält folgende anpassbare Textvorlagen:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {variants.map((variant, index) => (
                <li key={index} className="flex items-start">
                  <Check className="h-4 w-4 mr-2 mt-0.5 text-primary flex-shrink-0" />
                  <span>{variant.title || 'Variante'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {displayPrice && (
          <p className="text-xl font-bold text-primary mt-auto pt-4">
            {displayPrice}
          </p>
        )}
        {!displayPrice && variants.length > 0 && <div className="mt-auto"></div>}

      </CardContent>

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