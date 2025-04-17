// components/PromptInteraction.js - Finale, funktionierende Version ohne Debug-Logs

"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Helper für Fallback
const formatPlaceholderName = (name) => {
    return name.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
};

export default function PromptInteraction({ variants, slug }) {
    // Sicherheitscheck
    if (!Array.isArray(variants)) {
         console.error("PromptInteraction received non-array variants prop:", variants);
         return <Alert variant="destructive" className="mt-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Interner Fehler</AlertTitle><AlertDescription>Die Prompt-Varianten konnten nicht korrekt als Liste geladen werden.</AlertDescription></Alert>;
    }

    // States
    const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
    const [currentPlaceholderInfo, setCurrentPlaceholderInfo] = useState([]);
    const [placeholderValues, setPlaceholderValues] = useState({});
    const [generatedText, setGeneratedText] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    // useEffect (unverändert zur letzten Version)
    useEffect(() => {
        if (variants.length > 0 && selectedVariantIndex < variants.length) {
            const variant = variants[selectedVariantIndex];
            if (Array.isArray(variant.placeholders_meta) && variant.placeholders_meta.length >= 0) {
                 setCurrentPlaceholderInfo(variant.placeholders_meta);
            } else {
                 const template = variant?.template || '';
                 const placeholderRegex = /{{(.*?)}}/g;
                 let matches;
                 const foundPlaceholders = new Set();
                 while ((matches = placeholderRegex.exec(template)) !== null) { foundPlaceholders.add(matches[1].trim()); }
                 setCurrentPlaceholderInfo(Array.from(foundPlaceholders));
            }
            setPlaceholderValues({}); setGeneratedText(''); setErrorMsg(''); setIsCopied(false);
        } else {
             setCurrentPlaceholderInfo([]); setPlaceholderValues({}); setGeneratedText(''); setIsCopied(false);
        }
    }, [selectedVariantIndex, variants]);

    // handleInputChange (unverändert)
    const handleInputChange = (placeholderName, value) => {
        setPlaceholderValues(prevValues => ({ ...prevValues, [placeholderName]: value }));
    };

    // handleGenerate - Robuste Logik BEIBEHALTEN, nur console.logs entfernt
     const handleGenerate = async () => {
        setIsCopied(false);
        const expectedPlaceholderNames = currentPlaceholderInfo.map(p => typeof p === 'string' ? p : p.name);
        const missingPlaceholders = expectedPlaceholderNames.filter(name => !placeholderValues[name]?.trim());

        if (missingPlaceholders.length > 0) {
            const formattedMissing = missingPlaceholders.map(name => { /* ... formatting ... */ });
            setErrorMsg(`Bitte fülle alle Platzhalter aus: ${formattedMissing.join(', ')}`);
            return;
        }

        setLoading(true); setErrorMsg(''); setGeneratedText('');
        const payload = { promptPackageSlug: slug, variantIndex: selectedVariantIndex, placeholders: placeholderValues };

        try {
            const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

            // Robuste Fehlerprüfung beibehalten
             if (!response.ok) {
                 let errorData = { error: `HTTP Fehler ${response.status} ${response.statusText}` };
                 try {
                     // Versuche, Fehlerdetails als JSON zu lesen
                     errorData = await response.json();
                 } catch (jsonError) {
                     // Wenn kein JSON, nutze den StatusText
                     console.warn("API error response was not JSON:", jsonError);
                 }
                 // Throw Error mit bester verfügbarer Meldung
                 throw new Error(errorData.error || errorData.message || `HTTP Fehler ${response.status}`);
             }

            // Wenn OK, JSON parsen
            const data = await response.json();

            // Prüfen, ob erwartetes Feld vorhanden ist
            if (typeof data.generatedText === 'undefined') {
                 throw new Error("Antwort vom Server enthielt keinen generierten Text.");
            }

            setGeneratedText(data.generatedText);

        } catch (error) {
            // Fehler im State speichern für Anzeige
            console.error("[handleGenerate] Error caught:", error); // Ein Log hier kann bleiben
            setErrorMsg(`Generierung fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`);
        } finally {
            setLoading(false);
        }
    };

    // handleCopy (unverändert)
     const handleCopy = () => {
        if (!generatedText) return;
        navigator.clipboard.writeText(generatedText)
          .then(() => { setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); })
          .catch(err => console.error('Fehler beim Kopieren:', err));
     };

    // --- RENDERING (unverändert) ---
    return (
        <Tabs value={String(selectedVariantIndex)} onValueChange={(value) => setSelectedVariantIndex(Number(value))} className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 h-auto flex-wrap">
                 {variants.map((variant, index) => ( <TabsTrigger key={index} value={String(index)} className="whitespace-normal h-auto py-2 px-3 text-center">{variant.title || `Variante ${index + 1}`}</TabsTrigger> ))}
            </TabsList>
            {variants.map((variant, index) => (
                <TabsContent key={index} value={String(index)}>
                    <div className="space-y-6 p-4 md:p-6 border rounded-lg bg-card text-card-foreground shadow">
                        {/* Description */}
                        {variant.description && <p className="text-muted-foreground text-sm">{variant.description}</p>}
                        {/* Placeholders */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Platzhalter ausfüllen:</h3>
                            {currentPlaceholderInfo.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {currentPlaceholderInfo.map((placeholderInfo) => { /* ... mapping ... */
                                        const name = typeof placeholderInfo === 'string' ? placeholderInfo : placeholderInfo.name;
                                        const label = typeof placeholderInfo === 'string' ? formatPlaceholderName(name) : placeholderInfo.label || formatPlaceholderName(name);
                                        const placeholderText = typeof placeholderInfo === 'string' ? `Wert für ${label} eingeben...` : placeholderInfo.placeholder || `Wert für ${label} eingeben...`;
                                        if (!name) return null;
                                        return ( <div key={name} className="space-y-1.5"> <Label htmlFor={name}>{label}:</Label> <Input type="text" id={name} value={placeholderValues[name] || ''} onChange={(e) => handleInputChange(name, e.target.value)} placeholder={placeholderText} /> </div> );
                                    })}
                                </div>
                            ) : ( <p className="text-sm text-muted-foreground"><em>Für diese Variante sind keine Platzhalter definiert.</em></p> )}
                        </div>
                         {/* Generate Button & Result */}
                         <div>
                            <Button onClick={handleGenerate} disabled={loading || currentPlaceholderInfo.length > 0 && currentPlaceholderInfo.map(p => typeof p === 'string' ? p : p.name).some(name => !placeholderValues[name]?.trim()) }>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {loading ? 'Generiere...' : 'Generieren'}
                            </Button>
                            {errorMsg && ( <Alert variant="destructive" className="mt-4"><AlertCircle className="h-4 w-4" /><AlertTitle>Fehler</AlertTitle><AlertDescription>{errorMsg}</AlertDescription></Alert> )}
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-medium text-base">Ergebnis:</h4>
                                    {(generatedText && !loading) && ( <Button variant="ghost" size="icon" onClick={handleCopy} title="Kopieren"> {isCopied ? ( <Check className="h-4 w-4 text-green-600" /> ) : ( <Copy className="h-4 w-4" /> )} <span className="sr-only">In Zwischenablage kopieren</span> </Button> )}
                                </div>
                                {(generatedText && !loading) ? ( <Textarea readOnly value={generatedText} className="w-full min-h-[150px] bg-muted whitespace-pre-wrap text-sm" rows={Math.max(5, generatedText.split('\n').length)} /> ) : !errorMsg && !loading ? ( <div className="p-4 bg-muted/50 rounded-md border border-dashed text-sm text-muted-foreground min-h-[100px] flex items-center justify-center"> <em>(Generierter Text erscheint hier...)</em> </div> ) : null}
                              </div>
                         </div>
                    </div>
                </TabsContent>
            ))}
            {(variants.length === 0) && <p className="text-muted-foreground p-4 text-center">Keine Prompt-Varianten für dieses Paket gefunden.</p>}
        </Tabs>
    );
}