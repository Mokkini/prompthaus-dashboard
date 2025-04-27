// app/(public)/pakete/page.js

// ======= Imports =======
import { createClient } from '@/lib/supabase/server';
// Korrekter Named Import für ProductCard
import { ProductCard } from '@/components/store/ProductCard'; // Pfad prüfen!
import { Button } from "@/components/ui/button";
import Link from 'next/link';
// Icons
import { XCircle, LayoutGrid, ArrowLeft, ArrowDownUp, Check, ListFilter } from 'lucide-react';
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

  // --- Kategorien abrufen (bleibt unverändert) ---
  const { data: categoriesData, error: categoriesError } = await supabase
    .from('prompt_packages')
    .select('category')
    .neq('category', null) // Ignoriere Pakete ohne Kategorie
    .order('category', { ascending: true });

  if (categoriesError) {
    console.error('Fehler beim Laden der Kategorien:', categoriesError.message);
  }
  const availableCategories = categoriesData
    ? [...new Set(categoriesData.map(item => item.category).filter(Boolean))]
    : [];

  // --- ANGEPASSTE Supabase-Abfrage OHNE Kommentar im Select ---
  console.log(`Lade Pakete mit Sortierung: ${selectedSortOption.column} ${selectedSortOption.ascending ? 'ASC' : 'DESC'}`);
  const { data: allPromptPackages, error: packagesError } = await supabase
    .from('prompt_packages')
    // Wähle die Spalten aus, die für die Übersichtskarte benötigt werden (inkl. Tags)
    .select(`
      id,
      name,
      slug,
      description,
      category,
      price,
      stripe_product_id,
      stripe_price_id,
      tags
    `) // <-- Kommentar entfernt!
    .order(selectedSortOption.column, { ascending: selectedSortOption.ascending }); // Sortierung der Pakete

  if (packagesError) {
    // Gib den Fehler aus, damit er im Server-Log sichtbar ist
    console.error('[PaketePage] Fehler beim Laden der Textpakete:', packagesError.message);
    // Optional: Hier könntest du eine spezifischere Fehlermeldung für den Nutzer setzen
  } else {
    console.log(`[PaketePage] Erfolgreich ${allPromptPackages?.length || 0} Pakete geladen.`);
  }
  // --- ENDE ANGEPASSTE Abfrage ---


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
    <>
      {/* Navigation wird vom Layout bereitgestellt */}
      <main className="flex-grow py-12 md:py-16 lg:py-20">
        <div className="container mx-auto px-4 md:px-6">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-10 md:mb-16">
            {pageTitle}
          </h1>

          {/* --- Filter- und Navigationsleiste (unverändert) --- */}
          <div className="mb-8 flex flex-wrap justify-center items-center gap-4">
            {/* Kategorie-Filter-Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ListFilter className="mr-2 h-4 w-4" />
                  {selectedCategory ? `Kategorie: ${selectedCategory}` : 'Kategorie wählen'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Kategorie filtern</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className={!selectedCategory ? 'bg-accent' : ''}>
                   <Link href={createFilterUrl(searchParams, { kategorie: null })} scroll={false} className="flex justify-between w-full">
                      Alle Kategorien
                      {!selectedCategory && <Check className="h-4 w-4 ml-2" />}
                   </Link>
                </DropdownMenuItem>
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

            {/* Sortier-Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <ArrowDownUp className="mr-2 h-4 w-4" />
                  Sortieren nach: {selectedSortOption.label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
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
          </div>

          {/* Fehlerbehandlung und Anzeige der Pakete */}
          {packagesError || categoriesError ? (
            <p className="text-center text-destructive"> {/* Klasse geändert zu destructive */}
              Ups! Es gab ein Problem beim Laden der Inhalte. Bitte versuche es später erneut.
              {/* Optional: Zeige die Fehlermeldung im Entwicklungsmodus */}
              {process.env.NODE_ENV === 'development' && (
                <span className="block text-xs mt-1">({packagesError?.message || categoriesError?.message})</span>
              )}
            </p>
          ) : !filteredPromptPackages || filteredPromptPackages.length === 0 ? (
            <p className="text-center text-muted-foreground">
              {selectedCategory
                ? `Momentan sind keine Pakete in der Kategorie "${selectedCategory}" verfügbar.`
                : 'Momentan sind keine Textpakete verfügbar. Schau bald wieder vorbei!'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPromptPackages.map((promptPackage) => (
                // ProductCard erhält jetzt die Basis-Paketdaten inkl. Tags
                <ProductCard key={promptPackage.id} prompt={promptPackage} />
              ))}
            </div>
          )}
        </div>
      </main>
      {/* Footer wird vom Layout bereitgestellt */}
    </>
  );
}
