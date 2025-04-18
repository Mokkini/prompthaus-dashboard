// app/(dashboard)/meine-prompts/page.js
"use client"; // Wichtig, da wir Hooks und Client-Side Data Fetching nutzen

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client'; // Client-seitigen Supabase Client importieren!

// UI-Komponenten (Beispielhaft, passe sie an deine tatsächlichen Karten an)
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function MeinePromptsPage() {
  const [prompts, setPrompts] = useState([]); // State für die gekauften Prompts
  const [isLoading, setIsLoading] = useState(true); // Ladezustand
  const [error, setError] = useState(null); // Fehlerzustand
  const [searchTerm, setSearchTerm] = useState(''); // State für Suchbegriff (falls du Suche behalten willst)

  // === NEUE DATENABFRAGE-LOGIK ===
  useEffect(() => {
    const fetchPurchasedPrompts = async () => {
      setIsLoading(true);
      setError(null);
      const supabase = createClient(); // Client-seitigen Client holen

      // 1. Aktuellen Benutzer holen
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Benutzer nicht angemeldet oder Fehler beim Abrufen.");
        setPrompts([]);
        setIsLoading(false);
        console.error("User fetch error:", userError);
        return;
      }
      console.log("Eingeloggter User:", user.id);

      try {
        // 2. IDs der gekauften Pakete für diesen User holen
        console.log("Frage user_purchases ab für user_id:", user.id);
        const { data: purchases, error: purchasesError } = await supabase
          .from('user_purchases') // Name der Kauftabelle
          .select('prompt_package_id') // Nur die Spalte mit der Paket-ID
          .eq('user_id', user.id); // Filtern nach der ID des aktuellen Nutzers

        if (purchasesError) {
          console.error("Fehler beim Abrufen der Käufe:", purchasesError);
          throw purchasesError; // Fehler weiterwerfen, wird im catch behandelt
        }

        // Extrahiere die Paket-IDs in ein Array
        const purchasedPackageIds = purchases.map(p => p.prompt_package_id);
        console.log("Gekaufte Paket-IDs:", purchasedPackageIds);

        // Wenn keine Käufe vorhanden sind
        if (purchasedPackageIds.length === 0) {
          console.log("Keine Käufe für diesen User gefunden.");
          setPrompts([]); // Leere Liste setzen
        } else {
          // 3. Details der gekauften Pakete holen
          console.log("Frage prompt_packages ab für IDs:", purchasedPackageIds);
          const { data: packagesData, error: packagesError } = await supabase
            .from('prompt_packages') // Name der Paket-Tabelle
            .select('*') // Alle Details der Pakete holen
            .in('id', purchasedPackageIds); // Filtern nach den gekauften IDs

          if (packagesError) {
            console.error("Fehler beim Abrufen der Paket-Details:", packagesError);
            throw packagesError; // Fehler weiterwerfen
          }
          console.log("Gekaufte Pakete Daten:", packagesData);
          setPrompts(packagesData || []); // State mit den gekauften Paketen aktualisieren
        }

      } catch (fetchError) {
         // Fängt Fehler aus den try-Blöcken oben ab
         console.error("Gesamtfehler beim Laden der gekauften Prompts:", fetchError);
         setError(`Fehler beim Laden Ihrer Prompts: ${fetchError.message}`);
         setPrompts([]); // Setze Prompts zurück bei Fehler
      } finally {
        // Wird immer ausgeführt (nach try oder catch)
        setIsLoading(false); // Ladezustand beenden
      }
    };

    fetchPurchasedPrompts(); // Funktion beim ersten Rendern aufrufen
  }, []); // Leeres Abhängigkeitsarray = nur einmal ausführen

  // === Logik für die Suche (Optional, wie vorher) ===
  const filteredPrompts = useMemo(() => {
    if (!searchTerm) {
      return prompts;
    }
    return prompts.filter(prompt =>
      prompt.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prompt.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [prompts, searchTerm]);

  // === JSX für die Anzeige ===
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Meine Prompts</h1>

      {/* Suchleiste (Optional) */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Gekaufte Prompts durchsuchen..."
          className="pl-8 w-full md:w-1/3"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Lade- / Fehler- / Keine-Prompts-Anzeige */}
      {isLoading && <p>Lade deine Prompts...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!isLoading && !error && filteredPrompts.length === 0 && (
        <p>Du hast noch keine Prompt-Pakete erworben oder deine Suche ergab keine Treffer.</p>
      )}

      {/* Grid für die gekauften Prompt Cards */}
      {!isLoading && !error && filteredPrompts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrompts.map((prompt) => (
            // Hier deine Prompt-Card-Komponente einfügen, die zum Dashboard passt!
            // Stelle sicher, dass sie mit den Daten aus 'prompt_packages' umgehen kann
            // und den Link zur tatsächlichen Prompt-Nutzungsseite enthält.
            // Beispielhafte einfache Karte:
            <Card key={prompt.id}>
              <CardHeader>
                <CardTitle>{prompt.name || 'Unbenanntes Paket'}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {prompt.description || 'Keine Beschreibung'}
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button asChild className="w-full">
                  {/* WICHTIG: Passe den Link an deine Detail-/Nutzungsseite an! */}
                  <Link href={`/prompt/${prompt.slug || prompt.id}`}>Prompt nutzen</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}