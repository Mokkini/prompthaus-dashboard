// app/(dashboard)/meine-prompts/page.js - Angepasst für Testuser, Grid-Layout, Sortierung & Kategorieauswahl

"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// UI-Komponenten
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Loader2, AlertCircle, ChevronRight, ArrowDownUp, Check, ListFilter } from 'lucide-react';

// Konstante für Testuser-E-Mail
const TEST_USER_EMAIL = 'danadi@gmx.de';

// Sortieroptionen außerhalb der Komponente definieren (konstant)
const sortOptions = [
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'category_asc', label: 'Kategorie (A-Z)' },
  { value: 'category_desc', label: 'Kategorie (Z-A)' },
];

export default function MeinePromptsPage() {
  // State Hooks
  const [allPrompts, setAllPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [currentSort, setCurrentSort] = useState('name_asc'); // Standard-Sortierung

  // Aktuell ausgewählte Sortieroption finden
  const selectedSortOption = useMemo(() =>
    sortOptions.find(opt => opt.value === currentSort) || sortOptions[0],
    [currentSort]
  );

  // Datenabfrage
  useEffect(() => {
    const fetchPrompts = async () => {
      setIsLoading(true);
      setError(null);
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Benutzer nicht angemeldet oder Fehler beim Abrufen.");
        setAllPrompts([]);
        setIsLoading(false);
        console.error("User fetch error:", userError);
        return;
      }
      setCurrentUserEmail(user.email);

      const isTestUser = user.email === TEST_USER_EMAIL;

      try {
        let query = supabase.from('prompt_packages').select('id, name, description, slug, category');

        if (!isTestUser) {
          console.log(`Normaler User (${user.email}). Lade gekaufte Pakete.`);
          const { data: purchases, error: purchasesError } = await supabase
            .from('user_purchases')
            .select('prompt_package_id')
            .eq('user_id', user.id);

          if (purchasesError) throw purchasesError;

          const purchasedPackageIds = purchases.map(p => p.prompt_package_id);

          if (purchasedPackageIds.length === 0) {
            setAllPrompts([]);
            setIsLoading(false);
            return; // Frühzeitiger Ausstieg, wenn keine Käufe vorhanden sind
          }
          query = query.in('id', purchasedPackageIds);
        } else {
          console.log(`Testuser (${user.email}) erkannt. Lade ALLE Pakete.`);
        }

        // Führe die Abfrage aus (ohne DB-Sortierung, da wir clientseitig sortieren)
        const { data: promptsData, error: packagesError } = await query;

        if (packagesError) throw packagesError;
        setAllPrompts(promptsData || []);

      } catch (fetchError) {
         console.error("Gesamtfehler beim Laden der Prompts:", fetchError);
         setError(`Fehler beim Laden Ihrer Prompts: ${fetchError.message}`);
         setAllPrompts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrompts();
  }, []); // Leeres Abhängigkeitsarray, da die Abfrage nur einmal beim Mounten laufen soll

  // Verfügbare Kategorien für Filter
  const availableCategories = useMemo(() => {
    const categories = new Set(allPrompts.map(p => p.category || 'Ohne Kategorie'));
    return ['all', ...Array.from(categories).sort((a, b) => a.localeCompare(b, 'de'))];
  }, [allPrompts]);

  // Filter- UND Sortierlogik
  const filteredAndSortedPrompts = useMemo(() => {
    let filtered = [...allPrompts]; // Kopie erstellen

    // 1. Filtern
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => (p.category || 'Ohne Kategorie') === selectedCategory);
    }
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(lowerSearchTerm) ||
        p.description?.toLowerCase().includes(lowerSearchTerm) ||
        p.category?.toLowerCase().includes(lowerSearchTerm)
      );
    }

    // 2. Sortieren
    const [sortKey, sortDirection] = currentSort.split('_');

    filtered.sort((a, b) => {
      let valA, valB;

      switch (sortKey) {
        case 'category':
          // 'Ohne Kategorie' ans Ende bei ASC, an den Anfang bei DESC
          valA = a.category || (sortDirection === 'asc' ? 'zzzz' : '');
          valB = b.category || (sortDirection === 'asc' ? 'zzzz' : '');
          break;
        case 'name':
        default:
          valA = a.name || '';
          valB = b.name || '';
          break;
      }

      const comparison = valA.localeCompare(valB, 'de', { sensitivity: 'base' });
      return sortDirection === 'desc' ? (comparison * -1) : comparison;
    });

    return filtered;
  }, [allPrompts, selectedCategory, searchTerm, currentSort]);

  // === JSX für die Anzeige ===
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Meine Prompts</h1>

      {/* Filter- und Suchleiste */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Suche */}
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Prompts durchsuchen..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Prompts durchsuchen"
          />
        </div>

        {/* Kategorie-Filter (DropdownMenu) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
              <ListFilter className="mr-2 h-4 w-4" />
              <span className="truncate">
                {selectedCategory === 'all' ? 'Alle Kategorien' : `Kategorie: ${selectedCategory}`}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] max-h-60 overflow-y-auto">
            <DropdownMenuLabel>Kategorie filtern</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setSelectedCategory('all')}
              className={selectedCategory === 'all' ? 'bg-accent' : ''}
            >
              Alle Kategorien
              {selectedCategory === 'all' && <Check className="ml-auto h-4 w-4" />}
            </DropdownMenuItem>
            {availableCategories.filter(cat => cat !== 'all').map(cat => (
              <DropdownMenuItem
                key={cat}
                onSelect={() => setSelectedCategory(cat)}
                className={selectedCategory === cat ? 'bg-accent' : ''}
              >
                {cat}
                {selectedCategory === cat && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sortier-Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
              <ArrowDownUp className="mr-2 h-4 w-4" />
              <span className="truncate">
                Sortieren: {selectedSortOption.label}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[--radix-dropdown-menu-trigger-width]">
            <DropdownMenuLabel>Sortieren nach</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {sortOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onSelect={() => setCurrentSort(option.value)}
                className={currentSort === option.value ? 'bg-accent' : ''}
              >
                {option.label}
                {currentSort === option.value && <Check className="ml-auto h-4 w-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Lade- / Fehler- / Keine-Prompts-Anzeige */}
      {isLoading && (
        <div className="flex items-center justify-center py-10" aria-live="polite">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Lade deine Prompts...</span>
        </div>
      )}
      {error && (
         <Alert variant="destructive" role="alert">
           <AlertCircle className="h-4 w-4" />
           <AlertTitle>Fehler</AlertTitle>
           <AlertDescription>{error}</AlertDescription>
         </Alert>
      )}
      {!isLoading && !error && allPrompts.length === 0 && (
        <p className="text-center py-10 text-muted-foreground">
          {currentUserEmail === TEST_USER_EMAIL
            ? "Es wurden keine Prompt-Pakete in der Datenbank gefunden."
            : "Du hast noch keine Prompt-Pakete erworben oder freigeschaltet."}
        </p>
      )}
       {!isLoading && !error && allPrompts.length > 0 && filteredAndSortedPrompts.length === 0 && (
        <p className="text-center py-10 text-muted-foreground">Keine Prompts entsprechen den aktuellen Filtern.</p>
      )}

      {/* Grid-Layout für die Prompts */}
      {!isLoading && !error && filteredAndSortedPrompts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredAndSortedPrompts.map((prompt) => (
            <Card key={prompt.id} className="flex flex-col h-full transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1">
              <CardHeader>
                <CardTitle className="text-base">{prompt.name || 'Unbenanntes Paket'}</CardTitle>
                {prompt.category && (
                  <Badge variant="secondary" className="mt-1 w-fit">{prompt.category}</Badge>
                )}
              </CardHeader>
              <CardContent className="flex-grow">
                {prompt.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {prompt.description}
                  </p>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Keine Beschreibung</span>
                )}
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full" size="sm">
                  <Link href={`/prompt/${prompt.slug || prompt.id}`}>
                    Prompt <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
