// components/PromptInteraction.js - Angepasst für variantId (String) statt variantIndex (Number)

"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2, AlertCircle, Copy, Check, Share2, MessageSquare, Linkedin, Facebook, RefreshCw, Info,
  Mail, MailCheck, MailX, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

// Hilfsfunktion zum Formatieren (bleibt gleich)
const formatPlaceholderName = (name) => {
  if (typeof name !== 'string') return '';
  return name.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
};

// Tonalitätsvorschläge (bleibt gleich)
const toneSuggestions = [
  'freundlich', 'sachlich', 'bestimmt', 'höflich', 'emotional',
  'motivierend', 'humorvoll', 'verbindlich', 'kreativ', 'klar & direkt',
  'inspirierend', 'ironisch', 'offiziell/formell', 'einfühlsam',
  'verkaufend', 'locker', 'professionell', 'förmlich'
];

// Hilfsfunktionen zum Setzen/Lesen verschachtelter Werte (bleiben gleich)
const getNestedValue = (obj, path) => {
  if (!obj || typeof path !== 'string') return undefined;
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const setNestedValue = (obj, path, value) => {
  if (!obj || typeof path !== 'string') return obj;
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
  return obj;
};

export default function PromptInteraction({ variants, slug }) {
  // --- ANPASSUNG: variants ist jetzt das Array von Variant-Objekten aus der DB ---
  // Jedes Objekt sollte { id (string), title, description, context, semantic_data, writing_instructions } enthalten
  // WICHTIG: Die Page-Komponente mappt die 'variant_id' aus der DB auf 'id' für das Frontend.
  const generationVariants = Array.isArray(variants) ? variants : [];

  console.log("PromptInteraction erhaltene Prop 'variants':", variants);
  console.log("Verwendetes Array 'generationVariants':", generationVariants);

  // --- NEU: State für die ausgewählte Varianten-ID (String) ---
  const [selectedVariantId, setSelectedVariantId] = useState(
    generationVariants.length > 0 ? generationVariants[0].id : null // Initial die ID der ersten Variante
  );
  // --- Entfernt: selectedVariantIndex ---

  // Bestehende State Hooks (bleiben größtenteils gleich)
  const [semanticDataInfo, setSemanticDataInfo] = useState({});
  const [placeholderValues, setPlaceholderValues] = useState({});
  const [selectedTone, setSelectedTone] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [filteredTones, setFilteredTones] = useState([]);
  const [showToneSuggestions, setShowToneSuggestions] = useState(false);
  const toneInputRef = useRef(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendEmailError, setSendEmailError] = useState('');
  const [sendEmailSuccess, setSendEmailSuccess] = useState(false);
  const [accordionValue, setAccordionValue] = useState("");

  // --- NEU: Aktuell ausgewählte Variante über die ID finden ---
  // Diese Variable wird für die Render-Logik und API-Calls verwendet
  const currentVariant = generationVariants.find(v => v.id === selectedVariantId);

  console.log("Aktuell ausgewählte variantId:", selectedVariantId);
  console.log("Aktuell ausgewählte Variante (Objekt):", currentVariant);


  // --- useEffect zum Initialisieren beim Variantenwechsel (ANGEPASST auf selectedVariantId) ---
  useEffect(() => {
    // Finde die Variante basierend auf der aktuellen ID *innerhalb* des Effekts
    const calculatedCurrentVariant = (Array.isArray(variants) ? variants : []).find(v => v.id === selectedVariantId);

    console.log(`useEffect triggered. selectedVariantId: ${selectedVariantId}. Variants prop reference check.`);

    // Prüfe die *innerhalb* des Effekts gefundene Variante
    if (calculatedCurrentVariant?.semantic_data) {
      const semanticData = calculatedCurrentVariant.semantic_data;
      let initialValues = {};
      let dataInfo = {}; // Struktur für die UI

      // --- processSemanticData Funktion bleibt gleich ---
      const processSemanticData = (data, path = [], infoTarget = dataInfo) => {
         for (const key in data) {
           const item = data[key];
           if (!item || typeof item !== 'object') {
               console.warn(`Ungültiges Item in processSemanticData für Key: ${key}`, item);
               continue;
           }
           const currentPath = [...path, key];
           const stateKey = currentPath.join('.');
           infoTarget[key] = { ...item, stateKey: stateKey };
           if (item.type === 'object' && item.fields) {
             infoTarget[key].fields = {};
             processSemanticData(item.fields, currentPath, infoTarget[key].fields);
           } else {
             let defaultValue = '';
             if (item.type === 'boolean') defaultValue = item.default === true;
             else if (item.default !== undefined) defaultValue = item.default;
             setNestedValue(initialValues, stateKey, defaultValue);
           }
         }
      };

      processSemanticData(semanticData);
      setSemanticDataInfo(dataInfo); // <-- State Update
      setPlaceholderValues(initialValues); // <-- State Update
      setAccordionValue(""); // <-- State Update, Accordion schließen

      console.log("Semantic Data verarbeitet für Variante:", selectedVariantId, { dataInfo, initialValues });

      // Reset anderer States (bleibt gleich)
      setGeneratedText('');
      setSelectedTone('');
      setErrorMsg('');
      setIsCopied(false);
      setShowRefineInput(false);
      setAdditionalInfo('');
      setFilteredTones([]);
      setShowToneSuggestions(false);
      setRecipientEmail('');
      setSendEmailError('');
      setSendEmailSuccess(false);

    } else {
      // Fallback, wenn keine Variante oder keine semantic_data
      console.warn("Keine gültige Variante oder semantic_data für ID gefunden:", selectedVariantId);
      setSemanticDataInfo({}); // <-- State Update
      setPlaceholderValues({}); // <-- State Update
      setAccordionValue(""); // <-- State Update
      // Reset anderer States (bleibt gleich)
      setGeneratedText('');
      setSelectedTone('');
      setErrorMsg('');
      setIsCopied(false);
      setShowRefineInput(false);
      setAdditionalInfo('');
      setFilteredTones([]);
      setShowToneSuggestions(false);
      setRecipientEmail('');
      setSendEmailError('');
      setSendEmailSuccess(false);
    }
    // --- KORRIGIERTES Dependency Array ---
  }, [selectedVariantId, variants]); // <--- Abhängig von ID und variants Array
  // --- ENDE useEffect ---

  // useEffect für Web Share API (bleibt gleich)
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      setCanShare(true);
    }
  }, []);

  // useEffect für Tonalitäts-Vorschläge (bleibt gleich)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (toneInputRef.current && !toneInputRef.current.contains(event.target)) {
        setShowToneSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // --- handleInputChange (bleibt gleich) ---
  const handleInputChange = (stateKey, value) => {
    setPlaceholderValues(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      setNestedValue(newState, stateKey, value);
      return newState;
    });
  };

  // Tonalitäts-Handler (bleiben gleich)
  const handleToneInputChange = (e) => {
    const value = e.target.value;
    setSelectedTone(value);
    if (value.trim().length > 0) {
      const filtered = toneSuggestions.filter(tone => tone.toLowerCase().startsWith(value.toLowerCase()));
      setFilteredTones(filtered);
      setShowToneSuggestions(filtered.length > 0);
    } else {
      setFilteredTones([]);
      setShowToneSuggestions(false);
    }
  };
  const handleToneSuggestionClick = (tone) => {
    setSelectedTone(tone);
    setFilteredTones([]);
    setShowToneSuggestions(false);
  };

  // Kopieren & Teilen Handler (bleiben gleich)
  const handleCopy = () => {
    if (!generatedText) return;
    navigator.clipboard.writeText(generatedText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }).catch(err => {
        console.error('Fehler beim Kopieren:', err);
        setErrorMsg('Text konnte nicht kopiert werden.');
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
      if (error.name !== 'AbortError') {
         setErrorMsg('Text konnte nicht geteilt werden.');
      }
    }
  };

  // Zentrale Funktion für API-Aufrufe (bleibt gleich)
  const callGenerateApi = async (payload, setLoadingState = setLoading) => {
    setIsCopied(false);
    setLoadingState(true);
    setErrorMsg('');

    if (payload.action === 'generate' || payload.action === 'rephrase') {
        setGeneratedText('');
    }

    try {
      console.log("Sende Payload an /api/generate:", payload); // Log Payload
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let errorData = await res.json().catch(() => ({}));
        console.error("API Fehler Response:", errorData); // Log API Fehler
        throw new Error(errorData.error || `HTTP Fehler ${res.status}`);
      }

      const data = await res.json();
      if (typeof data.generatedText === 'undefined') {
        throw new Error("Antwort vom Server enthielt keinen generierten Text.");
      }

      setGeneratedText(data.generatedText);
      if (payload.action === 'refine') {
          setShowRefineInput(false);
          setAdditionalInfo('');
      }
    } catch (error) {
      console.error("Fehler in callGenerateApi:", error); // Log Catch-Fehler
      setErrorMsg(`Aktion fehlgeschlagen: ${error.message}`);
      setGeneratedText('');
    } finally {
      setLoadingState(false);
    }
  };

  // --- Handler für initiale Generierung (ANGEPASST für Validierung & Payload) ---
  const handleInitialGenerate = () => {
    // --- Validierungslogik (validateFields) bleibt gleich ---
    let missing = [];
    const validateFields = (data, currentPath = []) => {
      if (!data || typeof data !== 'object') return;
      for (const key in data) {
        const item = data[key];
        if (!item || typeof item !== 'object') continue;
        const path = [...currentPath, key];
        const stateKey = path.join('.');
        if (item.type === 'object' && item.fields) {
          validateFields(item.fields, path);
        } else if (item.required === true) {
          let isOptionalContext = false;
          let parent = semanticDataInfo;
          for(let i=0; i < path.length -1; i++) {
              if(parent && parent[path[i]]) {
                  parent = parent[path[i]];
                  if(parent.optional === true) {
                      isOptionalContext = true;
                      break;
                  }
                  if(parent.fields) parent = parent.fields;
                  else if (i < path.length - 2) break;
              } else {
                  break;
              }
          }
          if (!isOptionalContext) {
              const value = getNestedValue(placeholderValues, stateKey);
              if (value === '' || value === null || value === undefined) {
                 missing.push(item.label || formatPlaceholderName(key));
              }
          }
        }
      }
    };
    validateFields(semanticDataInfo);

    if (missing.length > 0) {
      setErrorMsg(`Bitte fülle alle erforderlichen Angaben aus: ${missing.join(', ')}`);
      return;
    }

    setErrorMsg('');
    // --- Payload angepasst: sendet variantId statt variantIndex ---
    const payload = {
      action: 'generate',
      promptPackageSlug: slug,
      variantId: selectedVariantId, // <-- HIER DIE ÄNDERUNG
      placeholders: placeholderValues,
      ...(selectedTone.trim() && { tone: selectedTone.trim() })
    };
    callGenerateApi(payload, setLoading);
  };
  // --- ENDE handleInitialGenerate ---

  // --- Handler für "Neu formulieren" (ANGEPASST für Payload) ---
  const handleRephrase = () => {
    if (!currentVariant) return; // Sicherheitshalber
    setErrorMsg('');
    // --- Payload angepasst: sendet variantId statt variantIndex ---
    const payload = {
      action: 'rephrase',
      promptPackageSlug: slug,
      variantId: selectedVariantId, // <-- HIER DIE ÄNDERUNG
      placeholders: placeholderValues, // Aktuelle Eingaben verwenden
      ...(selectedTone.trim() && { tone: selectedTone.trim() })
    };
    callGenerateApi(payload, setIsRefining); // Nutzt Refine-Ladeindikator
  };

  // Handler für "Zusatzinfos angeben" (bleibt gleich)
  const handleToggleRefineInput = () => {
    setShowRefineInput(!showRefineInput);
    setAdditionalInfo('');
    setErrorMsg('');
  };

  // --- Handler für "Verfeinern" (ANGEPASST für Payload) ---
  const handleRefine = () => {
    if (!generatedText || !additionalInfo.trim()) {
      setErrorMsg("Bitte gib Zusatzinformationen für die Verfeinerung ein.");
      return;
    }
    setErrorMsg('');
    // --- Payload angepasst: sendet variantId statt variantIndex ---
    const payload = {
      action: 'refine',
      originalText: generatedText,
      additionalInfo: additionalInfo.trim(),
      promptPackageSlug: slug, // Für Kontext/Tone im Backend
      variantId: selectedVariantId, // <-- HIER DIE ÄNDERUNG (optional, aber nützlich für Backend-Kontext)
      placeholders: placeholderValues, // Für Kontext/Tone im Backend
      ...(selectedTone.trim() && { tone: selectedTone.trim() }) // User-Tone auch für Refine
    };
    callGenerateApi(payload, setIsRefining); // Separater Ladeindikator
  };

  // Handler für E-Mail Versand (bleibt gleich)
  const handleSendEmail = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setSendEmailError('Bitte gib eine gültige E-Mail-Adresse ein.');
      return;
    }
    if (!generatedText) {
      setSendEmailError('Es gibt keinen generierten Text zum Senden.');
      return;
    }

    setIsSendingEmail(true);
    setSendEmailError('');
    setSendEmailSuccess(false);

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipientEmail,
          subject: `Dein Text: ${currentVariant?.title || 'Generierter Text'}`,
          text: generatedText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP Fehler ${res.status}`);
      setSendEmailSuccess(true);
      // Optional: Felder leeren und Dialog schließen
      // setRecipientEmail('');
      // setTimeout(() => {
      //   setShowEmailDialog(false);
      //   setSendEmailSuccess(false);
      // }, 2000);
    } catch (error) {
      setSendEmailError(`Fehler: ${error.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };


  // --- Funktion zum Rendern der dynamischen Felder (renderSemanticFields) bleibt gleich ---
  const renderSemanticFields = (data, isOptionalSection = false) => {
     if (!data || typeof data !== 'object') return [];
     return Object.entries(data)
      .map(([key, item]) => {
        if (!item || typeof item !== 'object' || !item.stateKey) {
            console.warn("Ungültiges Item in renderSemanticFields gefunden:", key, item);
            return null;
        }
        const { stateKey, type, label: itemLabel, placeholder: itemPlaceholder, description: itemDescription, unit, constraints, required, optional } = item;
        const label = itemLabel || formatPlaceholderName(key);
        const placeholder = itemPlaceholder || '';
        const isRequiredMarker = required === true && !isOptionalSection;

        if ((isOptionalSection && optional !== true) || (!isOptionalSection && optional === true)) {
          return null;
        }

        switch (type) {
          case 'object':
            if (item.fields && Object.keys(item.fields).length > 0) {
                const renderedFields = renderSemanticFields(item.fields, isOptionalSection);
                if (renderedFields.some(field => field !== null)) {
                    return (
                        <div key={stateKey} className="space-y-4 border p-4 rounded-md mb-4 bg-muted/30">
                        <h4 className="font-medium text-sm text-muted-foreground">{itemDescription || label} {isRequiredMarker ? '*' : ''}</h4>
                        {renderedFields}
                        </div>
                    );
                }
            }
            return null;
          case 'text':
            return (
              <div key={stateKey} className="space-y-1.5">
                <Label htmlFor={stateKey}>{label} {isRequiredMarker ? '*' : ''}</Label>
                <Textarea
                  id={stateKey}
                  value={getNestedValue(placeholderValues, stateKey) || ''}
                  onChange={e => handleInputChange(stateKey, e.target.value)}
                  placeholder={placeholder}
                  rows={3}
                  disabled={loading || isRefining}
                />
                {itemDescription && <p className="text-xs text-muted-foreground">{itemDescription}</p>}
                {constraints && <p className="text-xs text-muted-foreground italic">Hinweis: {constraints.join(' ')}</p>}
              </div>
            );
          case 'boolean':
            return (
              <div key={stateKey} className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id={stateKey}
                  checked={!!getNestedValue(placeholderValues, stateKey)}
                  onCheckedChange={(checked) => handleInputChange(stateKey, checked)}
                  disabled={loading || isRefining}
                />
                <Label htmlFor={stateKey} className="cursor-pointer">
                  {label} {isRequiredMarker ? '*' : ''}
                </Label>
                {itemDescription && <p className="text-xs text-muted-foreground pl-6">{itemDescription}</p>}
              </div>
            );
          case 'number':
            return (
              <div key={stateKey} className="space-y-1.5">
                <Label htmlFor={stateKey}>{label} {unit ? `(${unit})` : ''} {isRequiredMarker ? '*' : ''}</Label>
                <Input
                  id={stateKey}
                  type="number"
                  value={getNestedValue(placeholderValues, stateKey) || ''}
                  onChange={e => handleInputChange(stateKey, e.target.value)}
                  placeholder={placeholder}
                  disabled={loading || isRefining}
                />
                {itemDescription && <p className="text-xs text-muted-foreground">{itemDescription}</p>}
                {constraints && <p className="text-xs text-muted-foreground italic">Hinweis: {constraints.join(' ')}</p>}
              </div>
            );
          case 'date':
             return (
               <div key={stateKey} className="space-y-1.5">
                 <Label htmlFor={stateKey}>{label} {isRequiredMarker ? '*' : ''}</Label>
                 <Input
                   id={stateKey}
                   type="date"
                   value={getNestedValue(placeholderValues, stateKey) || ''}
                   onChange={e => handleInputChange(stateKey, e.target.value)}
                   placeholder={placeholder || 'JJJJ-MM-TT'}
                   disabled={loading || isRefining}
                 />
                 {itemDescription && <p className="text-xs text-muted-foreground">{itemDescription}</p>}
                 {constraints && <p className="text-xs text-muted-foreground italic">Hinweis: {constraints.join(' ')}</p>}
               </div>
             );
          case 'string':
          default:
            return (
              <div key={stateKey} className="space-y-1.5">
                <Label htmlFor={stateKey}>{label} {isRequiredMarker ? '*' : ''}</Label>
                <Input
                  id={stateKey}
                  type="text"
                  value={getNestedValue(placeholderValues, stateKey) || ''}
                  onChange={e => handleInputChange(stateKey, e.target.value)}
                  placeholder={placeholder}
                  disabled={loading || isRefining}
                />
                {itemDescription && <p className="text-xs text-muted-foreground">{itemDescription}</p>}
                {constraints && <p className="text-xs text-muted-foreground italic">Hinweis: {constraints.join(' ')}</p>}
              </div>
            );
        }
      });
  };
  // --- ENDE renderSemanticFields ---

  // --- Prüfen, ob es optionale Felder gibt (bleibt gleich) ---
  const hasOptionalFields = Object.values(semanticDataInfo).some(item => item?.optional === true);


  // JSX Rendering
  return (
    <div className="w-full space-y-8"> {/* Hauptcontainer */}

      {/* --- Variantenauswahl als Karten (ANGEPASST für variant.id) --- */}
      {generationVariants.length > 1 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-center md:text-left">Variante auswählen:</h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {generationVariants.map((variant) => ( // Iteriere über die Varianten-Objekte
              <button
                key={variant.id} // <-- Nutze die eindeutige String-ID als Key
                onClick={() => setSelectedVariantId(variant.id)} // <-- Setze die ID beim Klick
                disabled={loading || isRefining} // Deaktivieren während Ladevorgängen
                className={cn(
                  // Styling für die Größe und das Layout der "Karten"
                  "w-full sm:w-[calc(50%-0.375rem)] md:w-[calc(33.33%-0.5rem)] lg:w-[calc(25%-0.5625rem)] xl:w-[calc(20%-0.6rem)]",
                  // Basis-Styling (Rahmen, Rundung, Hover-Effekt) -> Karten-Look
                  "p-4 border rounded-lg text-left transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  // Bedingtes Styling für die ausgewählte "Karte"
                  variant.id === selectedVariantId // <-- Prüfe auf ID-Gleichheit
                    ? "bg-primary/10 border-primary ring-2 ring-primary ring-offset-2 dark:bg-primary/20"
                    : "bg-card border-border hover:border-muted-foreground/50",
                  // Styling für deaktivierten Zustand
                  (loading || isRefining) && "opacity-50 cursor-not-allowed"
                )}
              >
                {/* Inhalt der "Karte" (bleibt gleich) */}
                <p className="font-medium text-sm">{variant.title || `Variante ${variant.id}`}</p>
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
      {/* --- ENDE Variantenauswahl --- */}

      {/* Haupt-Grid für Eingabe/Ausgabe */}
      {currentVariant ? ( // Stelle sicher, dass eine Variante ausgewählt ist (über ID gefunden)
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Linke Spalte: Eingabe */}
          <Card>
            <CardHeader>
              {/* Titel und Beschreibung der aktuellen Variante (bleibt gleich) */}
              <CardTitle>{currentVariant?.title || 'Deine Eingaben'}</CardTitle>
              {currentVariant?.description && (
                <CardDescription>{currentVariant.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Tonalität (Input ID angepasst, um Eindeutigkeit zu wahren) */}
              <div className="space-y-1.5 relative" ref={toneInputRef}>
                <Label htmlFor={`tone-${selectedVariantId}`}>Gewünschte Tonalität (optional):</Label>
                <Input
                  id={`tone-${selectedVariantId}`} // <-- Nutze ID statt Index
                  value={selectedTone}
                  onChange={handleToneInputChange}
                  onFocus={() => {
                    if (selectedTone.trim().length > 0 && filteredTones.length > 0) {
                       setShowToneSuggestions(true);
                    }
                  }}
                  placeholder="z.B. sachlich, förmlich, kreativ,..."
                  autoComplete="off"
                  disabled={loading || isRefining}
                />
                {/* Vorschlagsliste (bleibt gleich) */}
                {showToneSuggestions && filteredTones.length > 0 && (
                  <Card className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto shadow-lg">
                    <CardContent className="p-2">
                      {filteredTones.map((tone) => (
                        <button
                          key={tone}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); handleToneSuggestionClick(tone); }}
                          className="block w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-accent"
                        >
                          {tone}
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                )}
                <p className="text-xs text-muted-foreground">
                  Tippe, um Vorschläge zu sehen, oder beschreibe den gewünschten Tonfall.
                </p>
              </div>

              {/* Dynamische Felder (Erforderlich) - renderSemanticFields wird aufgerufen (bleibt gleich) */}
              {Object.keys(semanticDataInfo).length > 0 ? (
                  <div>
                      <h3 className="text-base font-semibold mb-3">Erforderliche Angaben:</h3>
                      <div className="grid grid-cols-1 gap-4">
                          {renderSemanticFields(semanticDataInfo, false)}
                      </div>
                      {/* Nachrichten für optionale/keine Felder bleiben gleich */}
                      {Object.values(semanticDataInfo).every(item => item?.optional === true) && !hasOptionalFields && (
                          <p className="text-sm text-muted-foreground mt-4">
                          <em>Für diese Variante sind keine spezifischen Angaben erforderlich.</em>
                          </p>
                      )}
                      {Object.values(semanticDataInfo).filter(item => item?.optional !== true).length > 0 &&
                       renderSemanticFields(semanticDataInfo, false).every(field => field === null) && (
                          <p className="text-sm text-muted-foreground mt-4">
                          <em>Für diese Variante sind keine spezifischen Angaben erforderlich.</em>
                          </p>
                      )}
                  </div>
              ) : (
                   <p className="text-sm text-muted-foreground">Keine Eingabefelder für diese Variante definiert.</p>
              )}

              {/* Optionaler Bereich mit Accordion (bleibt gleich) */}
              {hasOptionalFields && (
                <Accordion
                  type="single"
                  collapsible
                  value={accordionValue}
                  onValueChange={setAccordionValue}
                  className="w-full pt-4 border-t"
                >
                  <AccordionItem value="optional-fields" className="border-b-0">
                    <AccordionTrigger className="text-base font-semibold hover:no-underline">
                      Optionale Angaben (aufklappen)
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 space-y-4">
                      {renderSemanticFields(semanticDataInfo, true)}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleInitialGenerate}
                disabled={loading || isRefining || !selectedVariantId} // Deaktivieren, wenn keine ID gewählt oder keine Varianten da
                className="w-full"
              >
                {(loading && !isRefining) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {(loading && !isRefining) ? 'Generiere...' : 'Text generieren'}
              </Button>
            </CardFooter>
          </Card>

          {/* Rechte Spalte: Ausgabe (bleibt größtenteils gleich) */}
          <Card className="flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Generierter Text</CardTitle>
                {generatedText && !loading && !isRefining && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    title="Kopieren"
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    <span className="sr-only">In Zwischenablage kopieren</span>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
              {/* Fehlermeldung (bleibt gleich) */}
              {errorMsg && (
                <Alert variant="destructive" className="mb-4">
                   <AlertCircle className="h-4 w-4" />
                   <AlertTitle>Fehler</AlertTitle>
                   <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              {/* Ergebnis-Textarea oder Platzhalter (bleibt gleich) */}
              {(generatedText || isRefining) && !loading ? (
                <Textarea
                  readOnly
                  value={isRefining ? 'Wird überarbeitet...' : generatedText}
                  className={cn(
                      "flex-grow min-h-[250px] bg-muted/30 text-sm whitespace-pre-wrap",
                      isRefining && "opacity-70 italic"
                  )}
                  rows={Math.max(10, generatedText.split('\n').length + 2)}
                />
              ) : !errorMsg && !loading ? (
                <div className="p-4 bg-muted/50 rounded-md border border-dashed text-sm text-muted-foreground min-h-[250px] flex items-center justify-center flex-grow">
                  <em>(Generierter Text erscheint hier...)</em>
                </div>
              ) : null}

              {/* Ladeanzeige für initiale Generierung (bleibt gleich) */}
              {loading && !isRefining && (
                <div className="p-4 bg-muted/50 rounded-md border border-dashed text-sm text-muted-foreground min-h-[250px] flex items-center justify-center flex-grow">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <span>Generiere Text...</span>
                </div>
              )}
            </CardContent>

            {/* Footer für Aktionen (bleibt gleich) */}
            {generatedText && !loading && (
              <CardFooter className="flex flex-col items-start gap-4 pt-4 border-t">

                {/* Bereich für Rephrase/Refine Buttons (bleibt gleich) */}
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

                {/* Bedingter Bereich für Zusatzinfos-Eingabe (bleibt gleich) */}
                {showRefineInput && (
                  <div className="w-full space-y-2 p-3 border rounded-md bg-muted/50">
                    <Label htmlFor="additionalInfo" className="text-sm font-medium">Zusätzliche Anweisungen oder Informationen:</Label>
                    <Textarea
                      id="additionalInfo"
                      value={additionalInfo}
                      onChange={(e) => setAdditionalInfo(e.target.value)}
                      placeholder="z.B. mach’s kürzer, füge eine Bitte hinzu, formuliere weicher, erwähne XY etc."
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

                {/* Bereich für Teilen-Buttons (bleibt gleich) */}
                <div className="w-full pt-4 border-t">
                    <span className="text-sm font-medium block mb-2">Teilen via:</span>
                    <div className="flex flex-wrap gap-2">
                      {/* WhatsApp, LinkedIn, Facebook Buttons (bleiben gleich) */}
                      <Button variant="outline" size="sm" asChild>
                        <a href={`whatsapp://send?text=${encodeURIComponent(generatedText)}`} data-action="share/whatsapp/share" target="_blank" rel="noopener noreferrer" className="flex items-center">
                          <MessageSquare className="h-4 w-4 mr-1" /> WhatsApp
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&title=${encodeURIComponent(currentVariant?.title || 'Generierter Text')}&summary=${encodeURIComponent(generatedText)}`} target="_blank" rel="noopener noreferrer" className="flex items-center">
                           <Linkedin className="h-4 w-4 mr-1" /> LinkedIn
                        </a>
                      </Button>
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

                      {/* E-Mail Senden Button (Dialog bleibt gleich) */}
                      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" /> E-Mail
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Text per E-Mail senden</DialogTitle>
                            <DialogDescription>
                              Gib die E-Mail-Adresse des Empfängers ein.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="recipient-email" className="text-right">
                                An
                              </Label>
                              <Input
                                id="recipient-email"
                                type="email"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                placeholder="empfaenger@beispiel.com"
                                className="col-span-3"
                                disabled={isSendingEmail}
                              />
                            </div>
                            {sendEmailError && (
                              <Alert variant="destructive" className="col-span-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Fehler</AlertTitle>
                                <AlertDescription>{sendEmailError}</AlertDescription>
                              </Alert>
                            )}
                            {sendEmailSuccess && (
                              <Alert variant="default" className="col-span-4 border-green-500 text-green-700 dark:text-green-300 dark:border-green-700 [&>svg]:text-green-700">
                                <MailCheck className="h-4 w-4" />
                                <AlertTitle>Erfolg</AlertTitle>
                                <AlertDescription>E-Mail erfolgreich gesendet!</AlertDescription>
                              </Alert>
                            )}
                          </div>
                          <DialogFooter>
                            <DialogClose asChild>
                               <Button type="button" variant="secondary" disabled={isSendingEmail}>
                                 Abbrechen
                               </Button>
                            </DialogClose>
                            <Button type="button" onClick={handleSendEmail} disabled={isSendingEmail || !recipientEmail}>
                              {isSendingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {isSendingEmail ? 'Sende...' : 'Senden'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      {/* Web Share API Button (bleibt gleich) */}
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
         // Fallback, wenn keine Variante ausgewählt ist
         <p className="text-muted-foreground p-4 text-center">
           {generationVariants.length === 0
             ? "Keine Prompt-Varianten für dieses Paket gefunden."
             : "Bitte wähle eine Variante aus."}
         </p>
      )}

    </div> // Ende Hauptcontainer
  );
}
