// app/kostenlos-testen/page.js

// ======= Imports =======
import { createClient } from '@/lib/supabase/server';
import Navigation from '@/components/Navigation';
import PromptInteraction from '@/components/PromptInteraction'; // Die Interaktionskomponente
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import Link from 'next/link';
// Ggf. Footer importieren
// import Footer from '@/components/Footer';

// *** WICHTIG: Lege hier den Slug des kostenlosen Prompts fest ***
const FREE_PROMPT_SLUG = 'test'; // Slug ist jetzt 'test'

// ======= Hauptfunktion der Seite =======
export default async function KostenlosTestenPage() {
  const supabase = createClient();

  // 1. User holen (nur für die Navigation, kann null sein)
  const { data: { user } } = await supabase.auth.getUser();

  // *** KORRIGIERTE DATENABFRAGE: Nur das Paket laden ***
  let promptPackage = null;
  let packageError = null;
  let variantsToUse = [];

  try {
    console.log(`Lade Paket mit Slug: ${FREE_PROMPT_SLUG}`);
    const { data: packageData, error: pkgError } = await supabase
      .from('prompt_packages')
      // Wähle alle Spalten aus, inklusive der 'prompt_variants'-Spalte
      .select('*')
      .eq('slug', FREE_PROMPT_SLUG)
      .single(); // Erwarte genau ein Ergebnis

    if (pkgError) {
      console.error(`Fehler beim Laden des Pakets:`, pkgError);
      throw pkgError; // Wirf den Fehler, um ihn unten zu fangen
    }
    if (!packageData) {
      console.error(`Paket mit Slug ${FREE_PROMPT_SLUG} nicht gefunden.`);
      throw new Error('Prompt-Paket nicht gefunden.');
    }

    promptPackage = packageData; // Speichere die Paketdaten
    console.log(`Paket gefunden: ID ${promptPackage.id}, Name: ${promptPackage.name}`);

    // *** Extrahiere die Varianten aus der Spalte 'prompt_variants' ***
    // Prüfe, ob die Spalte existiert und ein Array ist
    if (Array.isArray(promptPackage.prompt_variants)) {
      variantsToUse = promptPackage.prompt_variants;
      console.log(`${variantsToUse.length} Varianten aus der Spalte 'prompt_variants' extrahiert.`);
    } else {
      console.warn(`Die Spalte 'prompt_variants' im Paket ${promptPackage.id} ist kein Array oder fehlt.`);
      variantsToUse = []; // Setze auf leeres Array, falls die Daten ungültig sind
    }

  } catch (error) {
    // Fange alle Fehler aus der Abfrage
    packageError = error;
    console.error(`[ Server ] Fehler beim Laden des kostenlosen Prompts (${FREE_PROMPT_SLUG}):`, packageError?.message || 'Unbekannter Fehler.');
  }

  // 3. Fehlerbehandlung (bleibt strukturell gleich)
  if (packageError || !promptPackage) {
    return (
      <>
        <Navigation user={user} />
        <main className="flex-grow py-12 md:py-16 lg:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-10 md:mb-16">
              Kostenlos testen
            </h1>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fehler</AlertTitle>
              <AlertDescription>
                Der kostenlose Test-Prompt konnte leider nicht geladen werden ({packageError?.message || 'Paket nicht gefunden'}). Bitte versuchen Sie es später erneut.
              </AlertDescription>
            </Alert>
          </div>
        </main>
        {/* Footer */}
        <footer className="border-t py-8 bg-muted/40 mt-16">
         <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
           <p>© {new Date().getFullYear()} PromptHaus. Alle Rechte vorbehalten.</p>
             <div className="mt-2">
               <Link href="/impressum" className="hover:text-primary mx-2">Impressum</Link>
               |
               <Link href="/datenschutz" className="hover:text-primary mx-2">Datenschutz</Link>
             </div>
         </div>
       </footer>
      </>
    );
  }

  // 4. Varianten sind jetzt korrekt in variantsToUse

  // 5. Seite rendern (bleibt gleich)
  return (
    <>
      <Navigation user={user} />

      <main className="flex-grow py-12 md:py-16 lg:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4">
            {promptPackage.name}
          </h1>
          <p className="text-lg text-muted-foreground text-center mb-10 md:mb-16 max-w-2xl mx-auto">
            Probiere hier kostenlos eine Variante unseres Prompt-Pakets aus. Fülle die Platzhalter aus und erhalte deinen individuellen Textvorschlag.
          </p>

          {/* Die Interaktionskomponente mit den Varianten des kostenlosen Prompts */}
          {variantsToUse.length > 0 ? (
            <PromptInteraction
              variants={variantsToUse}
              slug={FREE_PROMPT_SLUG} // Wichtig für die API
            />
          ) : (
             <Alert variant="warning">
               <AlertCircle className="h-4 w-4" />
               <AlertTitle>Keine Varianten</AlertTitle>
               <AlertDescription>
                 Für dieses Test-Prompt wurden keine Varianten gefunden (oder die Daten in der Spalte 'prompt_variants' sind ungültig).
               </AlertDescription>
             </Alert>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 bg-muted/40 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} PromptHaus. Alle Rechte vorbehalten.</p>
          <div className="mt-2">
            <Link href="/impressum" className="hover:text-primary mx-2">Impressum</Link>
            |
            <Link href="/datenschutz" className="hover:text-primary mx-2">Datenschutz</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
