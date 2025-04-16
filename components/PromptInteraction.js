// components/PromptInteraction.js - REFACTORED with shadcn/ui

"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea"; // Könnte nützlich sein
import { Loader2, AlertCircle } from "lucide-react"; // Icons für Loading und Error
import { cn } from "@/lib/utils"; // Hilfsfunktion für Klassen

export default function PromptInteraction({ variants, slug }) {
  // State Hooks bleiben größtenteils gleich
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [currentPlaceholders, setCurrentPlaceholders] = useState([]);
  const [placeholderValues, setPlaceholderValues] = useState({});
  const [generatedText, setGeneratedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // useEffect zum Extrahieren der Platzhalter und Zurücksetzen bleibt gleich
  useEffect(() => {
    // Stellen sicher, dass variants existiert und nicht leer ist
    if (variants && variants.length > 0 && selectedVariantIndex < variants.length) {
      const variant = variants[selectedVariantIndex];
      const template = variant?.template || ''; // Sicherstellen, dass variant und template existieren
      const placeholderRegex = /{{(.*?)}}/g;
      let matches;
      const foundPlaceholders = new Set();
      while ((matches = placeholderRegex.exec(template)) !== null) {
        foundPlaceholders.add(matches[1].trim());
      }
      const placeholdersArray = Array.from(foundPlaceholders);
      setCurrentPlaceholders(placeholdersArray);

      // Reset state für die neue Variante
      setPlaceholderValues({}); // Platzhalter leeren
      setGeneratedText('');    // Generierten Text leeren
      setErrorMsg('');       // Fehlermeldung leeren
    } else {
      // Fallback, wenn keine Varianten oder ungültiger Index
      setCurrentPlaceholders([]);
      setPlaceholderValues({});
      setGeneratedText('');
      setErrorMsg('Keine gültige Variante ausgewählt.');
    }
  }, [selectedVariantIndex, variants]);


  const handleInputChange = (placeholderName, value) => {
    setPlaceholderValues(prevValues => ({
      ...prevValues,
      [placeholderName]: value,
    }));
  };

  // handleGenerate Logik bleibt unverändert, da sie gut ist
  const handleGenerate = async () => {
    const missingPlaceholders = currentPlaceholders.filter(
      (p) => !placeholderValues[p]?.trim()
    );
    if (missingPlaceholders.length > 0) {
      setErrorMsg(`Bitte fülle alle Platzhalter aus: ${missingPlaceholders.join(', ')}`);
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setGeneratedText('');
    const payload = {
      promptPackageSlug: slug,
      variantIndex: selectedVariantIndex,
      placeholders: placeholderValues,
    };
    console.log("Sende an /api/generate:", payload);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error("API Fehler-Antwort:", data);
        throw new Error(data.error || `HTTP Fehler ${response.status}`);
      }
      console.log("API Erfolgs-Antwort:", data);
      setGeneratedText(data.generatedText);
    } catch (error) {
      console.error("Fehler beim Aufruf von /api/generate:", error);
      setErrorMsg(`Generierung fehlgeschlagen: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to format placeholder names for display
  const formatPlaceholderName = (name) => {
    return name.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
  };

  // --- NEUES RENDERING MIT SHADCN/UI ---
  return (
    // Verwende Tabs für die Variantenauswahl
    // defaultValue muss ein String sein, daher konvertieren wir den Index
    <Tabs value={String(selectedVariantIndex)} onValueChange={(value) => setSelectedVariantIndex(Number(value))} className="w-full">

      {/* Liste der Tab-Buttons */}
      <TabsList className="mb-4 grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 h-auto flex-wrap">
        {variants && variants.map((variant, index) => (
          <TabsTrigger
            key={index}
            value={String(index)}
            className="whitespace-normal h-auto py-2 px-3 text-center" // Ermöglicht Umbruch und passt Höhe an
          >
            {variant.title || `Variante ${index + 1}`}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Inhalt für den jeweils aktiven Tab */}
      {variants && variants.map((variant, index) => (
        <TabsContent key={index} value={String(index)}>
          {/* Struktur innerhalb eines Tabs, z.B. mit einer Card oder divs */}
          <div className="space-y-6 p-4 md:p-6 border rounded-lg bg-card text-card-foreground shadow">

            {/* Beschreibung der Variante */}
            {variant.description && (
               <p className="text-muted-foreground text-sm">{variant.description}</p>
            )}

             {/* Platzhalter-Eingaben */}
             <div>
               <h3 className="text-lg font-semibold mb-4">Platzhalter ausfüllen:</h3>
               {currentPlaceholders.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {currentPlaceholders.map((placeholderName) => (
                     <div key={placeholderName} className="space-y-1.5">
                       <Label htmlFor={placeholderName}>
                         {formatPlaceholderName(placeholderName)}:
                       </Label>
                       <Input
                         type="text"
                         id={placeholderName}
                         value={placeholderValues[placeholderName] || ''}
                         onChange={(e) => handleInputChange(placeholderName, e.target.value)}
                         placeholder={`Wert für ${formatPlaceholderName(placeholderName)} eingeben...`}
                       />
                     </div>
                   ))}
                 </div>
               ) : (
                 <p className="text-sm text-muted-foreground"><em>Für diese Variante sind keine Platzhalter definiert.</em></p>
               )}
             </div>

            {/* Generierungs-Button und Ergebnis */}
            <div>
               <Button
                 onClick={handleGenerate}
                 disabled={loading || (currentPlaceholders.length > 0 && Object.keys(placeholderValues).length !== currentPlaceholders.length)} // Optional: Deaktivieren bis alle Platzhalter gefüllt sind? Oder nur wenn leer. Aktuell: Nur wenn loading. Oder wenn es Platzhalter gibt, aber nicht alle gefüllt sind. -> Verwendet die Prüfung aus handleGenerate.
                 // Alternative Deaktivierung: disabled={loading || currentPlaceholders.some(p => !placeholderValues[p]?.trim())}
               >
                 {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 {loading ? 'Generiere...' : 'Generieren'}
               </Button>

               {/* Fehleranzeige mit Alert */}
               {errorMsg && (
                 <Alert variant="destructive" className="mt-4">
                   <AlertCircle className="h-4 w-4" />
                   <AlertTitle>Fehler</AlertTitle>
                   <AlertDescription>{errorMsg}</AlertDescription>
                 </Alert>
               )}

               {/* Ergebnisanzeige */}
               <div className="mt-4 space-y-2">
                 <h4 className="font-medium text-base">Ergebnis:</h4>
                 {/* Zeige entweder den generierten Text ODER den Platzhalter */}
                 {(generatedText && !loading) ? (
                    // Verwende Textarea für potenziell langen Text mit Scrollbar und pre-wrap
                    <Textarea
                        readOnly
                        value={generatedText}
                        className="w-full min-h-[150px] bg-muted whitespace-pre-wrap text-sm"
                        rows={Math.max(5, generatedText.split('\n').length)} // Dynamische Höhe
                     />
                    // Alternative: Div wie vorher
                    // <div className="p-4 bg-muted rounded-md border whitespace-pre-wrap text-sm min-h-[100px]">
                    //   {generatedText}
                    // </div>
                 ) : !errorMsg && !loading ? ( // Zeige Platzhalter nur, wenn kein Fehler und nicht ladend
                   <div className="p-4 bg-muted/50 rounded-md border border-dashed text-sm text-muted-foreground min-h-[100px] flex items-center justify-center">
                     <em>(Generierter Text erscheint hier nach Klick auf "Generieren")</em>
                   </div>
                 ) : null}
               </div>
            </div>

          </div>
        </TabsContent>
      ))}
       {/* Fallback, falls gar keine Varianten da sind */}
       {(!variants || variants.length === 0) && (
            <p className="text-muted-foreground p-4 text-center">Keine Prompt-Varianten für dieses Paket gefunden.</p>
       )}
    </Tabs>
  );
}