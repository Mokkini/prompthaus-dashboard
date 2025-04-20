// components/PromptInteraction.js - Mit Rephrase/Refine, Share Buttons und Freitext-Tonalität + Autocomplete

"use client";

import { useState, useEffect, useRef } from 'react'; // useRef hinzugefügt
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
// Icons importieren
import { Loader2, AlertCircle, Copy, Check, Share2, MessageSquare, Linkedin, Facebook, RefreshCw, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// Hilfsfunktion zum Formatieren
const formatPlaceholderName = (name) => {
  return name.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
};

// --- NEU: Liste der Tonalitätsvorschläge ---
const toneSuggestions = [
  'freundlich', 'sachlich', 'bestimmt', 'höflich', 'emotional',
  'motivierend', 'humorvoll', 'verbindlich', 'kreativ', 'klar & direkt',
  'inspirierend', 'ironisch', 'offiziell/formell', 'einfühlsam',
  'verkaufend', 'locker', 'professionell', 'förmlich'
];
// --- ENDE NEU ---

export default function PromptInteraction({ variants, slug }) {
  // Bestehende State Hooks
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [currentPlaceholderInfo, setCurrentPlaceholderInfo] = useState([]);
  const [placeholderValues, setPlaceholderValues] = useState({});
  const [selectedTone, setSelectedTone] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // State Hooks für Rephrase/Refine
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // --- NEU: State Hooks für Tonalitätsvorschläge ---
  const [filteredTones, setFilteredTones] = useState([]);
  const [showToneSuggestions, setShowToneSuggestions] = useState(false);
  const toneInputRef = useRef(null); // Ref für das Input-Feld und die Vorschlagsliste
  // --- ENDE NEU ---

  // Aktuell ausgewählte Variante
  const currentVariant = variants?.[selectedVariantIndex];

  // useEffect zum Initialisieren beim Variantenwechsel
  useEffect(() => {
    if (currentVariant) {
      // Placeholder Logik
      if (Array.isArray(currentVariant.placeholders_meta)) {
        setCurrentPlaceholderInfo(currentVariant.placeholders_meta);
      } else {
        const template = currentVariant.template || '';
        const regex = /{{(.*?)}}/g;
        const matches = new Set();
        let match;
        while ((match = regex.exec(template)) !== null) {
          matches.add(match[1].trim());
        }
        setCurrentPlaceholderInfo(Array.from(matches));
      }
      // Reset States
      setPlaceholderValues({});
      setGeneratedText('');
      setSelectedTone('');
      setErrorMsg('');
      setIsCopied(false);
      setShowRefineInput(false);
      setAdditionalInfo('');
      // --- NEU: Vorschläge zurücksetzen ---
      setFilteredTones([]);
      setShowToneSuggestions(false);
      // --- ENDE NEU ---
    } else {
      // Fallback
      setCurrentPlaceholderInfo([]);
      setPlaceholderValues({});
      setGeneratedText('');
      setSelectedTone('');
      setErrorMsg('');
      setIsCopied(false);
      setShowRefineInput(false);
      setAdditionalInfo('');
      // --- NEU: Vorschläge zurücksetzen ---
      setFilteredTones([]);
      setShowToneSuggestions(false);
      // --- ENDE NEU ---
    }
  }, [selectedVariantIndex, variants, currentVariant]);

  // useEffect zum Prüfen der Web Share API
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      setCanShare(true);
    }
  }, []);

  // --- NEU: useEffect zum Schließen der Vorschläge bei Klick außerhalb ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Schließe, wenn außerhalb des Bereichs geklickt wird, der durch toneInputRef definiert ist
      if (toneInputRef.current && !toneInputRef.current.contains(event.target)) {
        setShowToneSuggestions(false);
      }
    };
    // Event Listener hinzufügen
    document.addEventListener('mousedown', handleClickOutside);
    // Cleanup: Event Listener entfernen
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []); // Leeres Array, damit der Effekt nur beim Mounten/Unmounten läuft
  // --- ENDE NEU ---


  // Event Handlers
  const handleInputChange = (name, value) => {
    setPlaceholderValues(prev => ({ ...prev, [name]: value }));
  };

  // --- NEU: Handler für Tonalitäts-Input-Änderungen ---
  const handleToneInputChange = (e) => {
    const value = e.target.value;
    setSelectedTone(value);

    if (value.trim().length > 0) {
      // Filtere Vorschläge, die mit der Eingabe beginnen (case-insensitive)
      const filtered = toneSuggestions.filter(tone =>
        tone.toLowerCase().startsWith(value.toLowerCase())
      );
      setFilteredTones(filtered);
      // Zeige Vorschläge nur an, wenn welche gefunden wurden
      setShowToneSuggestions(filtered.length > 0);
    } else {
      // Keine Eingabe -> keine Vorschläge
      setFilteredTones([]);
      setShowToneSuggestions(false);
    }
  };
  // --- ENDE NEU ---

  // --- NEU: Handler für die Auswahl eines Tonalitäts-Vorschlags ---
  const handleToneSuggestionClick = (tone) => {
    setSelectedTone(tone); // Setze den ausgewählten Ton in den Input
    setFilteredTones([]);   // Leere die gefilterten Vorschläge
    setShowToneSuggestions(false); // Verstecke die Vorschlagsliste
  };
  // --- ENDE NEU ---

  const handleCopy = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const handleWebShare = async () => {
    if (!generatedText || !navigator.share) return;
    try {
      await navigator.share({
        title: currentVariant?.title || 'Generierter Text',
        text: generatedText,
      });
      console.log('Text erfolgreich geteilt via Web Share API');
    } catch (error) {
      console.error('Fehler beim Teilen via Web Share API:', error);
    }
  };

  // Zentrale Funktion für API-Aufrufe
  const callGenerateApi = async (payload, setLoadingState = setLoading) => {
    setIsCopied(false);
    setLoadingState(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP Fehler ${res.status}`);
      }

      const data = await res.json();
      if (typeof data.generatedText === 'undefined') {
        throw new Error("Antwort vom Server enthielt keinen generierten Text.");
      }

      setGeneratedText(data.generatedText);
      setShowRefineInput(false);
      setAdditionalInfo('');
    } catch (error) {
      setErrorMsg(`Aktion fehlgeschlagen: ${error.message}`);
    } finally {
      setLoadingState(false);
    }
  };

  // Handler für initiale Generierung (unverändert bezüglich Tonalität)
  const handleInitialGenerate = () => {
    const expected = currentPlaceholderInfo.map(p => typeof p === 'string' ? p : p.name);
    const missing = expected.filter(name => !placeholderValues[name]?.trim());
    if (missing.length > 0) {
      setErrorMsg(`Bitte fülle alle Platzhalter aus: ${missing.map(formatPlaceholderName).join(', ')}`);
      return;
    }

    const payload = {
      action: 'generate',
      promptPackageSlug: slug,
      variantIndex: selectedVariantIndex,
      placeholders: placeholderValues,
      ...(selectedTone.trim() && { tone: selectedTone.trim() })
    };
    callGenerateApi(payload, setLoading);
  };

  // Handler für "Neu formulieren" (unverändert bezüglich Tonalität)
  const handleRephrase = () => {
    const payload = {
      action: 'rephrase',
      promptPackageSlug: slug,
      variantIndex: selectedVariantIndex,
      placeholders: placeholderValues,
      ...(selectedTone.trim() && { tone: selectedTone.trim() })
    };
    callGenerateApi(payload, setIsRefining);
  };

  // Handler für "Zusatzinfos angeben" (unverändert)
  const handleToggleRefineInput = () => {
    setShowRefineInput(!showRefineInput);
  };

  // Handler für "Verfeinern" (unverändert bezüglich Tonalität)
  const handleRefine = () => {
    if (!additionalInfo.trim()) {
      setErrorMsg("Bitte gib Zusatzinformationen für die Verfeinerung ein.");
      return;
    }

    const payload = {
      action: 'refine',
      originalText: generatedText,
      additionalInfo: additionalInfo,
      promptPackageSlug: slug,
      variantIndex: selectedVariantIndex,
      placeholders: placeholderValues,
      ...(selectedTone.trim() && { tone: selectedTone.trim() })
    };
    callGenerateApi(payload, setIsRefining);
  };


  // JSX Rendering
  return (
    <div className="w-full space-y-8"> {/* Hauptcontainer */}

      {/* Variantenauswahl (unverändert) */}
      {variants.length > 1 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-center md:text-left">Variante auswählen:</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {variants.map((variant, i) => (
              <button
                key={i}
                onClick={() => setSelectedVariantIndex(i)}
                className={cn(
                  "w-full sm:w-[calc(50%-0.375rem)] md:w-[calc(33.33%-0.5rem)] lg:w-[calc(25%-0.5625rem)] xl:w-[calc(20%-0.6rem)]",
                  "p-4 border rounded-lg text-left transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  i === selectedVariantIndex
                    ? "bg-primary/10 border-primary ring-2 ring-primary ring-offset-2 dark:bg-primary/20"
                    : "bg-card border-border hover:border-muted-foreground/50"
                )}
              >
                <p className="font-medium text-sm">{variant.title || `Variante ${i + 1}`}</p>
                {variant.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {variant.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Haupt-Grid für Eingabe/Ausgabe (unverändert) */}
      {currentVariant ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Linke Spalte: Eingabe */}
          <Card>
             <CardHeader>
              <CardTitle>Deine Eingaben</CardTitle>
              {currentVariant.description && (
                <CardDescription>{currentVariant.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">

              {/* --- ANPASSUNG: Tonalität als Freitextfeld MIT VORSCHLÄGEN --- */}
              <div className="space-y-1.5 relative" ref={toneInputRef}> {/* Position relative + Ref */}
                <Label htmlFor={`tone-${selectedVariantIndex}`}>Gewünschte Tonalität (optional):</Label>
                <Input
                  id={`tone-${selectedVariantIndex}`}
                  value={selectedTone}
                  onChange={handleToneInputChange} // Geänderten Handler verwenden
                  onFocus={() => { // Zeige Vorschläge auch bei Fokus, wenn Input nicht leer ist und Filter existieren
                    if (selectedTone.trim().length > 0 && filteredTones.length > 0) {
                       setShowToneSuggestions(true);
                    }
                  }}
                  placeholder="z.B. sachlich, förmlich, kreativ,..."
                  autoComplete="off" // Browser-Autocomplete deaktivieren
                />
                {/* --- NEU: Vorschlagsliste --- */}
                {showToneSuggestions && filteredTones.length > 0 && (
                  <ul className="absolute z-10 w-full bg-background border border-border rounded-md shadow-lg mt-1 max-h-60 overflow-y-auto"> {/* max-h erhöht */}
                    {filteredTones.map((tone, index) => (
                      <li
                        key={index}
                        className="px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                        // onMouseDown statt onClick, um Blur-Event des Inputs zuvorzukommen
                        onMouseDown={(e) => { e.preventDefault(); handleToneSuggestionClick(tone); }}
                      >
                        {tone}
                      </li>
                    ))}
                  </ul>
                )}
                {/* --- ENDE NEU --- */}
                <p className="text-xs text-muted-foreground">
                  Tippe, um Vorschläge zu sehen, oder beschreibe den gewünschten Tonfall.
                </p>
              </div>
              {/* --- ENDE ANPASSUNG --- */}

              {/* Platzhalter (unverändert) */}
              <div>
                <h3 className="text-base font-semibold mb-3">Platzhalter ausfüllen:</h3>
                {currentPlaceholderInfo.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {currentPlaceholderInfo.map(info => {
                      const name = typeof info === 'string' ? info : info.name;
                      const label = typeof info === 'string' ? formatPlaceholderName(name) : info.label || formatPlaceholderName(name);
                      const placeholder = typeof info === 'string' ? `Wert für ${label} eingeben...` : info.placeholder || `Wert für ${label} eingeben...`;
                      if (!name) return null;
                      return (
                        <div key={name} className="space-y-1.5">
                          <Label htmlFor={`${name}-${selectedVariantIndex}`}>{label}:</Label>
                          <Input id={`${name}-${selectedVariantIndex}`} value={placeholderValues[name] || ''} onChange={e => handleInputChange(name, e.target.value)} placeholder={placeholder} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    <em>Für diese Variante sind keine Platzhalter definiert.</em>
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleInitialGenerate} disabled={loading || isRefining} className="w-full">
                {(loading && !isRefining) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {(loading && !isRefining) ? 'Generiere...' : 'Text generieren'}
              </Button>
            </CardFooter>
          </Card>

          {/* Rechte Spalte: Ausgabe (unverändert) */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Generierter Text</CardTitle>
                {generatedText && !loading && !isRefining && (
                  <Button variant="ghost" size="icon" onClick={handleCopy} title="Kopieren">
                    {isCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    <span className="sr-only">In Zwischenablage kopieren</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
              {/* Fehlermeldung */}
              {errorMsg && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Fehler</AlertTitle>
                  <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              {/* Ergebnis-Textarea oder Platzhalter */}
              {(generatedText || isRefining) && !loading ? (
                 <Textarea
                   readOnly
                   value={isRefining ? "Wird überarbeitet..." : generatedText}
                   className={cn(
                     "w-full min-h-[250px] bg-muted whitespace-pre-wrap text-sm flex-grow",
                     isRefining && "opacity-70"
                   )}
                   rows={Math.max(10, generatedText.split('\n').length)}
                 />
               ) : !errorMsg && !loading ? (
                 <div className="p-4 bg-muted/50 rounded-md border border-dashed text-sm text-muted-foreground min-h-[250px] flex items-center justify-center flex-grow">
                   <em>(Generierter Text erscheint hier...)</em>
                 </div>
               ) : null}
              {/* Ladeanzeige für initiale Generierung */}
              {loading && !isRefining && (
                 <div className="p-4 bg-muted/50 rounded-md border border-dashed text-sm text-muted-foreground min-h-[250px] flex items-center justify-center flex-grow">
                   <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                   <span>Generiere Text...</span>
                 </div>
               )}
            </CardContent>

            {/* Footer für Aktionen (unverändert) */}
            {generatedText && !loading && (
              <CardFooter className="flex flex-col items-start gap-4 pt-4 border-t">

                {/* Bereich für Rephrase/Refine Buttons */}
                <div className="flex flex-wrap gap-2 w-full">
                   <Button variant="secondary" size="sm" onClick={handleRephrase} disabled={isRefining} className="flex items-center">
                     {isRefining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                     {isRefining ? 'Formuliere neu...' : 'Neu formulieren'}
                   </Button>
                   <Button variant="secondary" size="sm" onClick={handleToggleRefineInput} disabled={isRefining} className="flex items-center">
                     <Info className="mr-2 h-4 w-4" />
                     {showRefineInput ? 'Zusatzinfos ausblenden' : 'Zusatzinfos angeben'}
                   </Button>
                </div>

                {/* Bedingter Bereich für Zusatzinfos-Eingabe */}
                {showRefineInput && (
                  <div className="w-full space-y-2 p-3 border rounded-md bg-muted/50">
                    <Label htmlFor="additionalInfo" className="text-sm font-medium">Zusätzliche Anweisungen oder Informationen:</Label>
                    <Textarea
                      id="additionalInfo"
                      value={additionalInfo}
                      onChange={(e) => setAdditionalInfo(e.target.value)}
                      placeholder="z.B. Kürze den Text, füge einen Call-to-Action hinzu, erwähne Produkt X..."
                      rows={3}
                      className="bg-background"
                      disabled={isRefining}
                    />
                    <Button size="sm" onClick={handleRefine} disabled={isRefining || !additionalInfo.trim()} className="mt-2">
                      {isRefining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Verfeinern
                    </Button>
                  </div>
                )}

                {/* Bereich für Teilen-Buttons */}
                <div className="w-full pt-4 border-t">
                    <span className="text-sm font-medium block mb-2">Teilen via:</span>
                    <div className="flex flex-wrap gap-2">
                      {/* WhatsApp Button */}
                      <Button variant="outline" size="sm" asChild>
                        <a href={`whatsapp://send?text=${encodeURIComponent(generatedText)}`} data-action="share/whatsapp/share" target="_blank" rel="noopener noreferrer" className="flex items-center">
                          <MessageSquare className="h-4 w-4 mr-1" /> WhatsApp
                        </a>
                      </Button>
                      {/* LinkedIn Button */}
                      <Button variant="outline" size="sm" asChild>
                        <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&title=${encodeURIComponent(currentVariant?.title || 'Generierter Text')}&summary=${encodeURIComponent(generatedText)}`} target="_blank" rel="noopener noreferrer" className="flex items-center">
                           <Linkedin className="h-4 w-4 mr-1" /> LinkedIn
                        </a>
                      </Button>
                      {/* Facebook Button */}
                      <Button variant="outline" size="sm" asChild>
                         <a
                           href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&quote=${encodeURIComponent(generatedText)}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="flex items-center"
                         >
                            <Facebook className="h-4 w-4 mr-1" /> Facebook
                         </a>
                       </Button>
                      {/* Web Share API Button */}
                      {canShare && (
                        <Button variant="outline" size="sm" onClick={handleWebShare} className="flex items-center">
                          <Share2 className="h-4 w-4 mr-1" /> Mehr...
                        </Button>
                      )}
                    </div>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      ) : (
         <p className="text-muted-foreground p-4 text-center">
           Keine Prompt-Varianten für dieses Paket gefunden oder ausgewählt.
         </p>
      )}

    </div> // Ende Hauptcontainer
  );
}
