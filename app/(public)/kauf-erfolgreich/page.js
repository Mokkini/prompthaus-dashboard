// app/kauf-erfolgreich/page.js
import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Importiere den Button
import { CheckCircle } from 'lucide-react'; // Importiere ein Icon

// Diese Seite wird nach erfolgreicher Zahlung angezeigt
export default function KaufErfolgreichPage() {
  // Hinweis: Diese Seite ist serverseitig gerendert. Wenn wir hier
  // die session_id aus der URL lesen wollten, um Details anzuzeigen,
  // müssten wir sie zur Client Component machen ("use client").
  // Für eine einfache Bestätigung reicht das so.

  return (
    // Zentrierter Container für die Nachricht
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
      <div className="bg-card p-8 rounded-lg shadow-lg max-w-md w-full border">
        {/* Grünes Häkchen-Icon */}
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />

        {/* Überschrift */}
        <h1 className="text-2xl md:text-3xl font-semibold mb-3 text-card-foreground">
          Kauf erfolgreich!
        </h1>

        {/* Text */}
        <p className="text-muted-foreground mb-8">
          Vielen Dank für deinen Einkauf. Du findest das erworbene Prompt-Paket jetzt in deinem Dashboard unter "Meine Prompts".
        </p>

        {/* Button zum Dashboard */}
        <Button asChild size="lg">
          <Link href="/meine-prompts">Zu meinen Prompts</Link>
        </Button>
      </div>
    </div>
  );
}