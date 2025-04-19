// Beispiel: components/PurchasedPromptCard.js (neu zu erstellen)
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Für Kategorie
import Image from 'next/image'; // Falls Bilder verwendet werden

export function PurchasedPromptCard({ prompt }) {
  return (
    <Card className="flex flex-col h-full transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1">
      {/* Optional: Bild */}
      {prompt.image_url && (
        <div className="relative aspect-video overflow-hidden rounded-t-lg">
          <Image src={prompt.image_url} alt={prompt.name} fill className="object-cover"/>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-lg">{prompt.name || 'Unbenanntes Paket'}</CardTitle>
        {/* Kategorie als Badge anzeigen */}
        {prompt.category && (
          <Badge variant="secondary" className="mt-1 w-fit">{prompt.category}</Badge>
        )}
      </CardHeader>
      <CardContent className="flex-grow">
        <CardDescription className="line-clamp-3 text-sm">
          {prompt.description || 'Keine Beschreibung'}
        </CardDescription>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={`/prompt/${prompt.slug || prompt.id}`}>Prompt nutzen</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
