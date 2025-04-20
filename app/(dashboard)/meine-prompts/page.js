// app/(dashboard)/meine-prompts/page.js - Angepasst für Testuser & Grid-Layout
"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// UI-Komponenten
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter, CardContent } from "@/components/ui/card"; // Card-Komponenten importieren
import { Badge } from "@/components/ui/badge"; // Badge für Kategorie importieren

// --- NEU: Definiere die E-Mail deines Testusers ---
const TEST_USER_EMAIL = 'danadi@gmx.de'; // <-- Deine Test-E-Mail
// --- Ende NEU ---

// Hilfsfunktion zum Gruppieren wird nicht mehr benötigt für Grid

export default function MeinePromptsPage() {
  // State Hooks (bleiben gleich)
  const [allPrompts, setAllPrompts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentUserEmail, setCurrentUserEmail] = useState(null); // State für User-Email

  // Datenabfrage (ANGEPASST für Testuser)
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
      console.log("Eingeloggter User:", user.id, user.email);
      setCurrentUserEmail(user.email); // User-Email im State speichern

      const isTestUser = user.email === TEST_USER_EMAIL;

      try {
        let promptsData = [];

        if (isTestUser) {
          console.log(`Testuser (${user.email}) erkannt. Lade ALLE Pakete.`);
          const { data, error: packagesError } = await supabase
            .from('prompt_packages')
            .select('id, name, description, slug, category') // Benötigte Felder
            .order('category') // Sortiere nach Kategorie, dann Name
            .order('name');

          if (packagesError) throw packagesError;
          promptsData = data || [];
          console.log(`Anzahl aller Pakete für Testuser: ${promptsData.length}`);

        } else {
          console.log(`Normaler User (${user.email}). Lade gekaufte Pakete.`);
          const { data: purchases, error: purchasesError } = await supabase
            .from('user_purchases')
            .select('prompt_package_id')
            .eq('user_id', user.id);

          if (purchasesError) throw purchasesError;

          const purchasedPackageIds = purchases.map(p => p.prompt_package_id);
          console.log("Gekaufte Paket-IDs:", purchasedPackageIds);

          if (purchasedPackageIds.length === 0) {
            console.log("Keine Käufe für diesen User gefunden.");
            promptsData = [];
          } else {
            console.log("Frage prompt_packages ab für IDs:", purchasedPackageIds);
            const { data: packagesData, error: packagesError } = await supabase
              .from('prompt_packages')
              .select('id, name, description, slug, category')
              .in('id', purchasedPackageIds)
              .order('category') // Sortiere nach Kategorie, dann Name
              .order('name');

            if (packagesError) throw packagesError;
            promptsData = packagesData || [];
            console.log(`Anzahl gekaufter Pakete für normalen User: ${promptsData.length}`);
          }
        }
        setAllPrompts(promptsData);

      } catch (fetchError) {
         console.error("Gesamtfehler beim Laden der Prompts:", fetchError);
         setError(`Fehler beim Laden Ihrer Prompts: ${fetchError.message}`);
         setAllPrompts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrompts();
  }, []);

  // Filterlogik (bleibt gleich)
  const availableCategories = useMemo(() => {
    const categories = new Set(allPrompts.map(p => p.category || 'Ohne Kategorie'));
    return ['all', ...Array.from(categories).sort()];
  }, [allPrompts]);

  const filteredPrompts = useMemo(() => {
    let filtered = allPrompts;
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => (p.category || 'Ohne Kategorie') === selectedCategory);
    }
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(lowerSearchTerm) ||
        p.description?.toLowerCase().includes(lowerSearchTerm)
      );
    }
    // Optional: Hier könnte man noch nach Name sortieren, wenn die DB-Sortierung nicht ausreicht
    // filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return filtered;
  }, [allPrompts, selectedCategory, searchTerm]);

  // Gruppierungslogik wird nicht mehr benötigt

  // === JSX für die Anzeige ===
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Meine Prompts</h1>

      {/* Filter- und Suchleiste (bleibt gleich) */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Prompts durchsuchen..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Kategorie filtern..." />
          </SelectTrigger>
          <SelectContent>
            {availableCategories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat === 'all' ? 'Alle Kategorien' : cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lade- / Fehler- / Keine-Prompts-Anzeige (bleibt gleich, Nachricht angepasst) */}
      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Lade deine Prompts...</span>
        </div>
      )}
      {error && (
         <Alert variant="destructive">
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
       {!isLoading && !error && allPrompts.length > 0 && filteredPrompts.length === 0 && (
        <p className="text-center py-10 text-muted-foreground">Keine Prompts entsprechen den aktuellen Filtern.</p>
      )}

      {/* --- NEU: Grid-Layout für die Prompts --- */}
      {!isLoading && !error && filteredPrompts.length > 0 && (
        <>
          {/* Optionale Überschrift für gefilterte Kategorie */}
          {selectedCategory !== 'all' && (
            <h2 className="text-xl font-medium border-b pb-2 mb-4">
              Prompts in Kategorie: {selectedCategory}
            </h2>
          )}

          {/* Das Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredPrompts.map((prompt) => (
              // Hier verwenden wir die Card-Komponente
              <Card key={prompt.id} className="flex flex-col h-full transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1">
                <CardHeader>
                  <CardTitle className="text-base">{prompt.name || 'Unbenanntes Paket'}</CardTitle>
                  {/* Kategorie als Badge anzeigen */}
                  {prompt.category && (
                    <Badge variant="secondary" className="mt-1 w-fit">{prompt.category}</Badge>
                  )}
                </CardHeader>
                {/* Beschreibung nur anzeigen, wenn vorhanden */}
                {prompt.description && (
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {prompt.description}
                    </p>
                  </CardContent>
                )}
                {/* Wenn keine Beschreibung, aber Platz benötigt wird */}
                {!prompt.description && <CardContent className="flex-grow"></CardContent>}
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
        </>
      )}
      {/* --- Ende Grid-Layout --- */}

    </div>
  );
}
