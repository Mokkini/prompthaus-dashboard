// app/(public)/kategorien/page.js
'use client';

// Suspense importieren
import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
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

// --- NEU: Angepasste Datenstruktur mit Name und Beschreibung ---
const allCategories = [
  { name: "Briefe & Anträge", description: "Kündigungen, Widerrufe und wichtige Schreiben schnell erledigen" },
  { name: "Entschuldigungen", description: "Schnelle Entschuldigungen für Schule, Kita oder Arbeit erstellen" },
  { name: "Beschwerden & Reklamationen", description: "Lieferprobleme und Reklamationen freundlich und klar ansprechen" },
  { name: "Nachbarschaft", description: "Höfliche Mitteilungen und Bitten rund ums Zusammenleben" },
  { name: "Schule & Kita", description: "Briefe und Mitteilungen an Lehrer:innen, Schulen und Betreuungseinrichtungen" },
  { name: "Einladungen & Feste", description: "Persönliche Einladungstexte für Feiern, Hochzeiten und Geburtstage" },
  { name: "Wohnen & Miete", description: "Kommunikation mit Vermieter:innen, Nachbarn und Hausverwaltungen leicht gemacht" },
  { name: "Nachrichten & Social Media", description: "Kurze Texte für WhatsApp, Instagram, Facebook & Co. – freundlich, klar und schnell verschickt" }
];
// --- ENDE NEU ---

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

// --- Komponente für den Inhalt, angepasst für Objekt-Array ---
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
          // --- NEU: Filtern nach category.name ---
          category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          category.description.toLowerCase().includes(searchTerm.toLowerCase()) // Optional: Auch Beschreibung durchsuchen
        )
      : allCategories;

    // --- NEU: Sortieren nach category.name ---
    return [...filtered].sort((a, b) => {
      if (currentCategorySort === 'desc') {
        return b.name.localeCompare(a.name);
      }
      return a.name.localeCompare(b.name);
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
          {/* Suchleiste */}
          <div className="relative w-full md:w-auto md:flex-grow max-w-xs mx-auto md:mx-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Thema suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10"
              aria-label="Kategorie suchen"
            />
          </div>

          {/* Sortier-Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full md:w-auto flex-shrink-0">
                <ArrowDownUp className="mr-2 h-4 w-4" />
                Sortieren: {selectedCategorySortOption.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end"> {/* Geändert zu align="end" für bessere Positionierung */}
              <DropdownMenuLabel>Kategorien sortieren</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {categorySortOptions.map((option) => (
                <DropdownMenuItem key={option.value} asChild className={currentCategorySort === option.value ? 'bg-accent' : ''}>
                  <Link href={createCategorySortUrl(searchParams, option.value)} scroll={false} className="flex justify-between w-full cursor-pointer">
                    {option.label}
                    {currentCategorySort === option.value && <Check className="h-4 w-4 ml-2" />}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Grid für die Kategorien */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"> {/* Angepasst für bessere Darstellung */}
          {filteredAndSortedCategories.length > 0 ? (
            filteredAndSortedCategories.map((category) => (
               <Link
                 // --- NEU: Link basiert auf category.name ---
                 href={`/pakete?kategorie=${encodeURIComponent(category.name)}`}
                 // --- NEU: Key ist category.name ---
                 key={category.name}
                 className="flex flex-col justify-between p-4 bg-muted dark:bg-gray-800 rounded-lg shadow-sm transition-transform transform hover:scale-[1.03] hover:shadow-lg" // Leichter Hover-Effekt
               >
                 <div> {/* Wrapper für Inhalt oben */}
                   <div className="flex items-center gap-3 mb-2">
                      <FolderKanban className="h-5 w-5 text-primary flex-shrink-0" />
                      {/* --- NEU: Zeige category.name --- */}
                      <span className="text-base font-semibold text-foreground line-clamp-2">
                        {category.name}
                      </span>
                   </div>
                   {/* --- NEU: Zeige category.description --- */}
                   <p className="text-sm text-muted-foreground mt-1 line-clamp-3 mb-3">
                       {category.description}
                   </p>
                 </div>
                 {/* --- Button/Link am Ende --- */}
                 <div className="mt-auto pt-2 text-right text-sm font-medium text-primary hover:underline">
                    Pakete ansehen &rarr;
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
// --- ENDE Anpassung ---

// --- Fallback-Komponente für Suspense (bleibt gleich) ---
function LoadingFallback() {
  return (
    <main className="flex-grow py-12 md:py-16 lg:py-20">
      <div className="container mx-auto px-4 md:px-6 text-center">
         <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-10 md:mb-16 text-muted-foreground/50 animate-pulse">
            Alle Themenwelten entdecken
          </h1>
         <div className="flex justify-center items-center gap-4 mb-8">
             <div className="h-9 w-48 bg-muted rounded animate-pulse"></div> {/* Placeholder für Suche */}
             <div className="h-9 w-32 bg-muted rounded animate-pulse"></div> {/* Placeholder für Dropdown */}
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"> {/* Angepasst */}
            {/* Zeige ein paar Platzhalter-Karten */}
            {Array.from({ length: 8 }).map((_, index) => ( // Angepasst
                <div key={index} className="h-32 bg-muted rounded-lg animate-pulse"></div> // Höhe angepasst
            ))}
         </div>
      </div>
    </main>
  );
}
// --- ENDE NEU ---


// Hauptkomponente, die Suspense verwendet
export default function KategorienPageWrapper() { // Name bleibt gleich
  return (
    <>
      {/* Navigation wird vom Layout bereitgestellt */}
      <Suspense fallback={<LoadingFallback />}>
        <KategorieContent />
      </Suspense>
      {/* Footer wird vom Layout bereitgestellt */}
    </>
  );
}
