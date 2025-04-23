// app/(public)/pakete/page.js

// ======= Imports =======
import { createClient } from '@/lib/supabase/server';
// import Navigation from '@/components/Navigation'; // <-- ENTFERNEN
// Korrekter Named Import für ProductCard
import { ProductCard } from '@/components/store/ProductCard'; // Pfad prüfen!
import { Button } from "@/components/ui/button";
import Link from 'next/link';
// Icons
import { XCircle, LayoutGrid, ArrowLeft, ArrowDownUp, Check, ListFilter } from 'lucide-react';
import RevealOnScroll from '@/components/ui/RevealOnScroll';
// Shadcn UI Komponenten für Dropdown
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


// ======= Hilfsfunktion createFilterUrl (bleibt unverändert) =======
const createFilterUrl = (currentSearchParams, newParam) => {
  const params = new URLSearchParams();
  if (currentSearchParams) {
    Object.entries(currentSearchParams).forEach(([key, value]) => {
      if (typeof value === 'string') {
        params.set(key, value);
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'string') {
            params.append(key, item);
          }
        });
      }
    });
  }
  Object.entries(newParam).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  });
  const queryString = params.toString();
  return queryString ? `/pakete?${queryString}` : '/pakete';
};


// ======= Hauptfunktion der Paketseite =======
export default async function PaketePage({ searchParams }) {
  const supabase = createClient();
  // User wird hier nicht mehr für Navigation gebraucht, aber vielleicht für andere Logik?
  // const { data: { user } } = await supabase.auth.getUser(); // <-- Kann ggf. weg, wenn user hier nicht benötigt wird

  // --- Filter- und Sortierparameter auslesen ---
  const selectedCategory = searchParams?.kategorie;
  const currentSort = searchParams?.sort || 'name_asc'; // Standard-Sortierung

  // --- Sortieroptionen definieren (bleibt unverändert) ---
  const sortOptions = [
    { value: 'name_asc', label: 'Name (A-Z)', column: 'name', ascending: true },
    { value: 'name_desc', label: 'Name (Z-A)', column: 'name', ascending: false },
    { value: 'price_asc', label: 'Preis (aufsteigend)', column: 'price', ascending: true },
    { value: 'price_desc', label: 'Preis (absteigend)', column: 'price', ascending: false },
  ];
  const selectedSortOption = sortOptions.find(opt => opt.value === currentSort) || sortOptions[0];

  // --- Kategorien abrufen (wichtig für das Dropdown) ---
  const { data: categoriesData, error: categoriesError } = await supabase
    .from('prompt_packages')
    .select('category')
    .neq('category', null) // Ignoriere Pakete ohne Kategorie
    .order('category', { ascending: true });

  if (categoriesError) {
    console.error('Fehler beim Laden der Kategorien:', categoriesError.message);
  }
  // Eindeutige Liste von Kategorienamen erstellen
  const availableCategories = categoriesData
    ? [...new Set(categoriesData.map(item => item.category).filter(Boolean))]
    : [];

  // --- Angepasste Supabase-Abfrage mit Varianten ---
  console.log(`Lade Pakete mit Sortierung: ${selectedSortOption.column} ${selectedSortOption.ascending ? 'ASC' : 'DESC'}`);
  const { data: allPromptPackages, error: packagesError } = await supabase
    .from('prompt_packages')
    // Wähle alle Paket-Spalten (*) UND von den verknüpften Varianten nur Titel und ID
    .select(`
      *,
      prompt_variants (
        variant_id,
        title
      )
    `)
    // Optional: Limitieren, falls es sehr viele Varianten pro Paket gibt
    // .select(`*, prompt_variants!inner(variant_id, title, limit: 5)`)
    .order(selectedSortOption.column, { ascending: selectedSortOption.ascending }); // Sortierung der Pakete

  if (packagesError) {
    console.error('Fehler beim Laden der Textpakete inkl. Varianten:', packagesError.message);
  } else {
    console.log(`Erfolgreich ${allPromptPackages?.length || 0} Pakete geladen.`);
    // Optional: Logge die Struktur des ersten Pakets, um die Varianten zu sehen
    // if (allPromptPackages && allPromptPackages.length > 0) {
    //   console.log("Struktur erstes Paket:", JSON.stringify(allPromptPackages[0], null, 2));
    // }
  }

  // --- Filterung nach Kategorie (bleibt unverändert) ---
  const filteredPromptPackages = selectedCategory
    ? (allPromptPackages || []).filter(pkg =>
        (pkg.category || 'Ohne Kategorie') === selectedCategory
      )
    : (allPromptPackages || []);

  const pageTitle = selectedCategory
    ? `Pakete für: ${selectedCategory}`
    : 'Unsere Themenpakete';

  // Seitenstruktur (JSX)
  return (
    // Das äußere Fragment <> </> kann bleiben oder entfernt werden
    <>
      {/* <Navigation user={user} /> */} {/* <-- ENTFERNEN */}
      <main className="flex-grow py-12 md:py-16 lg:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-10 md:mb-16">
            {pageTitle}
          </h1>

          {/* --- Filter- und Navigationsleiste --- */}
          <div className="mb-8 flex flex-wrap justify-center items-center gap-4">

            {/* --- NEU: Kategorie-Filter-Dropdown --- */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ListFilter className="mr-2 h-4 w-4" />
                  {selectedCategory ? `Kategorie: ${selectedCategory}` : 'Kategorie wählen'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start"> {/* Ausrichtung ggf. anpassen */}
                <DropdownMenuLabel>Kategorie filtern</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* Option "Alle Kategorien" */}
                <DropdownMenuItem asChild className={!selectedCategory ? 'bg-accent' : ''}>
                   <Link href={createFilterUrl(searchParams, { kategorie: null })} scroll={false} className="flex justify-between w-full">
                      Alle Kategorien
                      {!selectedCategory && <Check className="h-4 w-4 ml-2" />}
                   </Link>
                </DropdownMenuItem>
                {/* Verfügbare Kategorien auflisten */}
                {availableCategories.map((category) => (
                  <DropdownMenuItem key={category} asChild className={selectedCategory === category ? 'bg-accent' : ''}>
                    <Link href={createFilterUrl(searchParams, { kategorie: category })} scroll={false} className="flex justify-between w-full">
                      {category}
                      {selectedCategory === category && <Check className="h-4 w-4 ml-2" />}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* --- ENDE Kategorie-Filter-Dropdown --- */}


            {/* --- Sortier-Dropdown (bleibt unverändert) --- */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ArrowDownUp className="mr-2 h-4 w-4" />
                  Sortieren nach: {selectedSortOption.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end"> {/* Ausrichtung ggf. anpassen */}
                <DropdownMenuLabel>Sortieren nach</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sortOptions.map((option) => (
                  <DropdownMenuItem key={option.value} asChild className={currentSort === option.value ? 'bg-accent' : ''}>
                    <Link href={createFilterUrl(searchParams, { sort: option.value })} scroll={false} className="flex justify-between w-full">
                      {option.label}
                      {currentSort === option.value && <Check className="h-4 w-4 ml-2" />}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* --- ENDE Sortier-Dropdown --- */}

          </div>

          {/* Fehlerbehandlung und Anzeige der Pakete */}
          {packagesError || categoriesError ? (
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
            <RevealOnScroll>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredPromptPackages.map((promptPackage) => (
                  // Hier wird das Paket inkl. der geladenen Varianten übergeben
                  <ProductCard key={promptPackage.id} prompt={promptPackage} />
                ))}
              </div>
            </RevealOnScroll>
          )}
        </div>
      </main>

      {/* <footer ...> */} {/* <-- ENTFERNEN */}
      {/* <footer className="border-t py-8 bg-muted/40 mt-16">
         <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} PromptHaus. Alle Rechte vorbehalten.</p>
          <div className="mt-2">
            <Link href="/impressum" className="hover:text-primary mx-2">Impressum</Link>
            |
            <Link href="/datenschutz" className="hover:text-primary mx-2">Datenschutz</Link>
          </div>
        </div>
      </footer> */}
      {/* --- ENDE ENTFERNEN --- */}
    </>
  );
}
