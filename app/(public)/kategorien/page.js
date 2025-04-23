// app/(public)/kategorien/page.js
'use client';

// Suspense importieren
import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
// import Navigation from '@/components/Navigation'; // <-- ENTFERNEN
import { useSearchParams } from 'next/navigation';
// Icons
import { ArrowDownUp, Check, FolderKanban, Search, Loader2 } from 'lucide-react'; // Loader2 für Fallback
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Shadcn UI Komponenten für Dropdown
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Deine Liste aller Kategorien (bleibt gleich)
const allCategories = [
  "Familienkommunikation", "Elternbriefe für Kita & Schule", "Behördenschreiben stressfrei",
  "Nachbarschaft & Zusammenleben", "E-Mail-Vorlagen für Profis", "Bewerbungsboost & Jobstart",
  "Konflikte klären im Job", "Mahnungen & Zahlungserinnerungen", "Souverän emotional schreiben",
  "Nein sagen mit Klarheit", "Wertschätzend Danke sagen", "Professionell Entschuldigen",
  "Erfolgreich auf Social Media", "Messenger-Texte mit Wirkung", "Kreative Grußtexte & Glückwünsche",
  "Vorlagen für Umzug & Wohnen", "Gesundheit & Arztgespräche", "Texte für Hochzeit & Feiern",
  "Reklamationen souverän lösen", "Vereinskommunikation leicht gemacht"
];

// Hilfsfunktion createCategorySortUrl (bleibt gleich)
const createCategorySortUrl = (currentSearchParams, newSort) => {
    const params = new URLSearchParams(currentSearchParams.toString());
    if (newSort) {
        params.set('sort', newSort);
    } else {
        params.delete('sort');
    }
    const queryString = params.toString();
    return queryString ? `/kategorien?${queryString}` : '/kategorien';
};

// --- Eigene Komponente für den Inhalt, der useSearchParams nutzt (bleibt gleich) ---
function KategorieContent() {
  const searchParams = useSearchParams();
  const currentCategorySort = searchParams.get('sort') || 'asc';
  const [searchTerm, setSearchTerm] = useState('');

  const categorySortOptions = [
      { value: 'asc', label: 'Name (A-Z)' },
      { value: 'desc', label: 'Name (Z-A)' },
  ];
  const selectedCategorySortOption = categorySortOptions.find(opt => opt.value === currentCategorySort) || categorySortOptions[0];

  const filteredAndSortedCategories = useMemo(() => {
    const filtered = searchTerm
      ? allCategories.filter(category =>
          category.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : allCategories;

    return [...filtered].sort((a, b) => {
      if (currentCategorySort === 'desc') {
        return b.localeCompare(a);
      }
      return a.localeCompare(b);
    });
  }, [searchTerm, currentCategorySort]);

  return (
    <main className="flex-grow py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 md:px-6">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-10 md:mb-16">
          Alle Themenwelten entdecken
        </h1>

        {/* Filter-/Sortierleiste */}
        <div className="mb-8 flex flex-col md:flex-row justify-center items-center gap-4">
          {/* Suchleiste (nur mobil sichtbar) */}
          <div className="relative w-full md:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Kategorie suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10"
            />
          </div>

          {/* Sortier-Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full md:w-auto">
                <ArrowDownUp className="mr-2 h-4 w-4" />
                Sortieren: {selectedCategorySortOption.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              <DropdownMenuLabel>Kategorien sortieren</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {categorySortOptions.map((option) => (
                <DropdownMenuItem key={option.value} asChild className={currentCategorySort === option.value ? 'bg-accent' : ''}>
                  <Link href={createCategorySortUrl(searchParams, option.value)} scroll={false} className="flex justify-between w-full">
                    {option.label}
                    {currentCategorySort === option.value && <Check className="h-4 w-4 ml-2" />}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Grid für die Kategorien */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {filteredAndSortedCategories.length > 0 ? (
            filteredAndSortedCategories.map((category) => (
               <Link
                 href={`/pakete?kategorie=${encodeURIComponent(category)}`}
                 key={category}
                 className="flex flex-col justify-between p-4 bg-muted dark:bg-gray-800 rounded-lg shadow-sm transition-colors duration-200 ease-in-out hover:bg-primary hover:text-primary-foreground dark:hover:bg-primary dark:hover:text-primary-foreground hover:shadow-md"
               >
                 <div className="flex items-center gap-3 mb-2">
                    <FolderKanban className="h-5 w-5 text-current flex-shrink-0" />
                    <span className="text-sm font-medium text-current line-clamp-2">
                      {category}
                    </span>
                 </div>
                 <div className="mt-auto pt-2 text-right opacity-0 hover:opacity-100 transition-opacity duration-200">
                    <span className="text-xs text-current">
                        Pakete ansehen &rarr;
                    </span>
                 </div>
              </Link>
            ))
          ) : (
            <p className="col-span-full text-center text-muted-foreground mt-8">
              Keine Kategorien gefunden, die zu "{searchTerm}" passen.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
// --- ENDE NEUE Komponente ---

// --- Fallback-Komponente für Suspense (bleibt gleich) ---
function LoadingFallback() {
  return (
    <main className="flex-grow py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 md:px-6 text-center">
         <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-10 md:mb-16 text-muted-foreground/50 animate-pulse">
            Alle Themenwelten entdecken
          </h1>
         <div className="flex justify-center items-center gap-4 mb-8">
             <div className="h-9 w-32 bg-muted rounded animate-pulse"></div> {/* Placeholder für Suchleiste/Dropdown */}
         </div>
         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {/* Zeige ein paar Platzhalter-Karten */}
            {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="h-24 bg-muted rounded-lg animate-pulse"></div>
            ))}
         </div>
      </div>
    </main>
  );
}
// --- ENDE NEU ---


// Hauptkomponente, die Suspense verwendet
export default function KategorienPageWrapper() { // Umbenannt, um Konflikt zu vermeiden
  return (
    // Das äußere Fragment <> </> kann bleiben oder entfernt werden
    <>
      {/* <Navigation user={null} /> */} {/* <-- ENTFERNEN */}

      {/* --- Suspense Boundary (bleibt gleich) --- */}
      <Suspense fallback={<LoadingFallback />}>
        <KategorieContent />
      </Suspense>
      {/* --- ENDE NEU --- */}

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
