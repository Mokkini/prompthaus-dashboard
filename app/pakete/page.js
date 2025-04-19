// app/pakete/page.js - Mit Zurück-Button für die "Alle Pakete"-Ansicht

// ======= Imports =======
import { createClient } from '@/lib/supabase/server';
import Navigation from '@/components/Navigation';
import { ProductCard } from '@/components/store/ProductCard'; // Pfad prüfen!
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { XCircle, LayoutGrid, ArrowLeft } from 'lucide-react'; // ArrowLeft hinzugefügt
import RevealOnScroll from '@/components/ui/RevealOnScroll'; // Für den Effekt
// Ggf. Footer importieren
// import Footer from '@/components/Footer';

// ======= Hauptfunktion der Paketseite (nimmt searchParams entgegen) =======
export default async function PaketePage({ searchParams }) {
  // Nutzerstatus für Navigation holen
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Alle Pakete laden
  const { data: allPromptPackages, error: packagesError } = await supabase
    .from('prompt_packages')
    .select('*') // Alle Daten für ProductCard holen
    .order('name', { ascending: true });

  if (packagesError) {
    console.error('Fehler beim Laden der Textpakete für Paketseite:', packagesError.message);
    // Hier könnte man eine bessere Fehlerseite rendern
  }

  // Kategorie aus searchParams lesen
  const selectedCategory = searchParams?.kategorie;

  // Pakete filtern, falls eine Kategorie ausgewählt ist
  const filteredPromptPackages = selectedCategory
    ? (allPromptPackages || []).filter(pkg =>
        (pkg.category || 'Ohne Kategorie') === selectedCategory
      )
    : (allPromptPackages || []); // Wenn keine Kategorie ausgewählt, zeige alle

  // Dynamischer Titel basierend auf der Auswahl
  const pageTitle = selectedCategory
    ? `Pakete für: ${selectedCategory}`
    : 'Unsere Themenpakete';

  // Seitenstruktur (JSX)
  return (
    <>
      {/* ======= Navigation ======= */}
      <Navigation user={user} />

      {/* ======= Hauptinhalt der Paketseite ======= */}
      <main className="flex-grow py-12 md:py-16 lg:py-20">
        <div className="container mx-auto px-4 md:px-6">

          {/* --- Breadcrumbs wurden entfernt --- */}

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-10 md:mb-16">
            {pageTitle} {/* Dynamischer Titel */}
          </h1>

          {/* --- ANGEPASST: Bedingte Buttons --- */}
          <div className="text-center mb-8 flex flex-wrap justify-center items-center gap-4">
            {selectedCategory ? (
              // Buttons, wenn eine Kategorie ausgewählt ist
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/pakete" scroll={false}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Alle Pakete anzeigen
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/kategorien" scroll={false}>
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    Zurück zu allen Kategorien
                  </Link>
                </Button>
              </>
            ) : (
              // Button, wenn KEINE Kategorie ausgewählt ist (Alle Pakete Ansicht)
              <Button variant="outline" size="sm" asChild>
                <Link href="/kategorien" scroll={false}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> {/* Oder LayoutGrid */}
                  Zurück zu den Kategorien
                </Link>
              </Button>
            )}
          </div>
          {/* --- ENDE ANGEPASST --- */}


          {/* Fehlerbehandlung und Anzeige der gefilterten Pakete */}
          {packagesError ? (
            <p className="text-center text-red-500">
              Ups! Es gab ein Problem beim Laden der Inhalte. Bitte versuche es später erneut.
            </p>
          ) : !filteredPromptPackages || filteredPromptPackages.length === 0 ? (
            <p className="text-center text-muted-foreground">
              {selectedCategory
                ? `Momentan sind keine Pakete in der Kategorie "${selectedCategory}" verfügbar.`
                : 'Momentan sind keine Textpakete verfügbar. Schau bald wieder vorbei!'}
            </p>
          ) : (
            // RevealOnScroll um das Grid legen für einen Gesamt-Effekt
            <RevealOnScroll>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPromptPackages.map((prompt) => (
                  // Stelle sicher, dass ProductCard importiert ist und die Props erwartet
                  <ProductCard key={prompt.id} prompt={prompt} />
                ))}
              </div>
            </RevealOnScroll>
          )}
        </div>
      </main>

      {/* ======= Footer ======= */}
      {/* <Footer /> */}
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
