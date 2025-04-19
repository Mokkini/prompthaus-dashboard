// app/(dashboard)/meine-prompts/page.js - Angepasst für Testuser & Accordion
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils"; // Import cn für bedingte Klassen

// --- NEU: Definiere die E-Mail deines Testusers ---
const TEST_USER_EMAIL = 'danadi@gmx.de'; // <-- Deine Test-E-Mail
// --- Ende NEU ---

// Hilfsfunktion zum Gruppieren (bleibt gleich)
function groupPromptsByCategory(prompts) {
  if (!prompts) return {};
  return prompts.reduce((acc, prompt) => {
    const category = prompt.category || 'Ohne Kategorie';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(prompt);
    // Innerhalb der Kategorie nach Namen sortieren
    acc[category].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return acc;
  }, {});
}


export default function MeinePromptsPage() {
  // State Hooks (bleiben gleich)
  const [allPrompts, setAllPrompts] = useState([]); // Wird jetzt entweder alle oder gekaufte enthalten
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Datenabfrage (ANGEPASST für Testuser)
  useEffect(() => {
    const fetchPrompts = async () => { // Funktion umbenannt für Klarheit
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

      // --- NEUE LOGIK: Prüfen, ob es der Testuser ist ---
      const isTestUser = user.email === TEST_USER_EMAIL;

      try {
        let promptsData = []; // Variable für die zu setzenden Daten

        if (isTestUser) {
          // Lade ALLE Pakete für den Testuser
          console.log(`Testuser (${user.email}) erkannt. Lade ALLE Pakete.`);
          const { data, error: packagesError } = await supabase
            .from('prompt_packages')
            .select('id, name, description, slug, category') // Benötigte Felder
            .order('name', { ascending: true });

          if (packagesError) {
            console.error('Fehler beim Laden ALLER Pakete für Testuser:', packagesError);
            throw packagesError;
          }
          promptsData = data || [];
          console.log(`Anzahl aller Pakete für Testuser: ${promptsData.length}`);

        } else {
          // Lade nur die gekauften Pakete für normale User
          console.log(`Normaler User (${user.email}). Lade gekaufte Pakete.`);
          console.log("Frage user_purchases ab für user_id:", user.id);
          const { data: purchases, error: purchasesError } = await supabase
            .from('user_purchases')
            .select('prompt_package_id')
            .eq('user_id', user.id);

          if (purchasesError) {
            console.error("Fehler beim Abrufen der Käufe:", purchasesError);
            throw purchasesError;
          }

          const purchasedPackageIds = purchases.map(p => p.prompt_package_id);
          console.log("Gekaufte Paket-IDs:", purchasedPackageIds);

          if (purchasedPackageIds.length === 0) {
            console.log("Keine Käufe für diesen User gefunden.");
            promptsData = []; // Leeres Array, wenn nichts gekauft
          } else {
            console.log("Frage prompt_packages ab für IDs:", purchasedPackageIds);
            const { data: packagesData, error: packagesError } = await supabase
              .from('prompt_packages')
              .select('id, name, description, slug, category')
              .in('id', purchasedPackageIds);

            if (packagesError) {
              console.error("Fehler beim Abrufen der Paket-Details:", packagesError);
              throw packagesError;
            }
            promptsData = packagesData || [];
            console.log(`Anzahl gekaufter Pakete für normalen User: ${promptsData.length}`);
          }
        }
        setAllPrompts(promptsData); // Setze die geladenen Daten (entweder alle oder gekaufte)

      } catch (fetchError) {
         console.error("Gesamtfehler beim Laden der Prompts:", fetchError);
         setError(`Fehler beim Laden Ihrer Prompts: ${fetchError.message}`);
         setAllPrompts([]); // Sicherstellen, dass bei Fehler keine alten Daten angezeigt werden
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrompts();
  }, []); // Dependency array bleibt leer, um nur beim Mounten zu laden

  // Filter- und Gruppierungslogik (bleibt gleich)
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
    return filtered;
  }, [allPrompts, selectedCategory, searchTerm]);

  const groupedPrompts = useMemo(() => groupPromptsByCategory(filteredPrompts), [filteredPrompts]);
  // Kategorien für die Anzeige sortieren
  const displayCategories = useMemo(() => Object.keys(groupedPrompts).sort(), [groupedPrompts]);


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

      {/* Lade- / Fehler- / Keine-Prompts-Anzeige (bleibt gleich) */}
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
          {/* Angepasste Nachricht je nachdem, ob es der Testuser ist */}
          {TEST_USER_EMAIL === /* Hier die E-Mail des aktuell eingeloggten Users prüfen, falls verfügbar */ null
            ? "Es wurden keine Prompt-Pakete in der Datenbank gefunden."
            : "Du hast noch keine Prompt-Pakete erworben oder freigeschaltet."}
        </p>
      )}
       {!isLoading && !error && allPrompts.length > 0 && filteredPrompts.length === 0 && (
        <p className="text-center py-10 text-muted-foreground">Keine Prompts entsprechen den aktuellen Filtern.</p>
      )}


      {/* Accordion für die Kategorien */}
      {!isLoading && !error && filteredPrompts.length > 0 && (
        <Accordion type="multiple" className="w-full space-y-2">
          {displayCategories.map((category) => (
            <AccordionItem value={category} key={category} className="border rounded-md bg-card">
              <AccordionTrigger className="text-base font-semibold px-4 py-3 hover:no-underline">
                <div className="flex justify-between items-center w-full">
                    <span>{category}</span>
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({groupedPrompts[category].length})
                    </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3">
                <div className="border-t pt-2">
                  {groupedPrompts[category].map((prompt, promptIndex) => (
                    <div
                      key={prompt.id}
                      className={cn( // cn für bedingte Klassen
                        "flex items-center justify-between py-2",
                        promptIndex < groupedPrompts[category].length - 1 ? 'border-b' : '' // Nur Border, wenn nicht das letzte Element
                      )}
                    >
                      {/* Linke Seite: Name */}
                      <div className="flex-grow mr-4">
                        <span className="font-medium text-sm">{prompt.name || 'Unbenanntes Paket'}</span>
                      </div>
                      {/* Rechte Seite: Button */}
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/prompt/${prompt.slug || prompt.id}`}>
                          {/* Inhalt in ein span gewrappt */}
                          <span className="flex items-center">
                            Nutzen
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </span>
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
