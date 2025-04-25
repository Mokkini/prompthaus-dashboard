// components/PromptInteraction.js - Angepasst für variantId (String) und verschobenen Tonalitäts-Input

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
  const generationVariants = Array.isArray(variants) ? variants : [];

  console.log("PromptInteraction erhaltene Prop 'variants':", variants);
  console.log("Verwendetes Array 'generationVariants':", generationVariants);

  const [selectedVariantId, setSelectedVariantId] = useState(
    generationVariants.length > 0 ? generationVariants[0].id : null
  );

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
  const toneInputRef = useRef(null); // Ref bleibt, wird im Output-Footer verwendet
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendEmailError, setSendEmailError] = useState('');
  const [sendEmailSuccess, setSendEmailSuccess] = useState(false);
  const [accordionValue, setAccordionValue] = useState("");

  const currentVariant = generationVariants.find(v => v.id === selectedVariantId);

  console.log("Aktuell ausgewählte variantId:", selectedVariantId);
  console.log("Aktuell ausgewählte Variante (Objekt):", currentVariant);

  useEffect(() => {
    const calculatedCurrentVariant = (Array.isArray(variants) ? variants : []).find(v => v.id === selectedVariantId);
    console.log(`useEffect triggered. selectedVariantId: ${selectedVariantId}. Variants prop reference check.`);

    if (calculatedCurrentVariant?.semantic_data) {
      const semanticData = calculatedCurrentVariant.semantic_data;
      let initialValues = {};
      let dataInfo = {};

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
      setSemanticDataInfo(dataInfo);
      setPlaceholderValues(initialValues);
      setAccordionValue("");

      console.log("Semantic Data verarbeitet für Variante:", selectedVariantId, { dataInfo, initialValues });

      setGeneratedText('');
      setSelectedTone(''); // Tonalität auch zurücksetzen beim Variantenwechsel
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
      console.warn("Keine gültige Variante oder semantic_data für ID gefunden:", selectedVariantId);
      setSemanticDataInfo({});
      setPlaceholderValues({});
      setAccordionValue("");
      setGeneratedText('');
      setSelectedTone(''); // Tonalität auch zurücksetzen
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
  }, [selectedVariantId, variants]);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      setCanShare(true);
    }
  }, []);

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

  const handleInputChange = (stateKey, value) => {
    setPlaceholderValues(prev => {
      const newState = JSON.parse(JSON.stringify(prev));
      setNestedValue(newState, stateKey, value);
      return newState;
    });
  };

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

  const callGenerateApi = async (payload, setLoadingState = setLoading) => {
    setIsCopied(false);
    setLoadingState(true);
    setErrorMsg('');

    if (payload.action === 'generate' || payload.action === 'rephrase') {
        setGeneratedText('');
    }

    try {
      console.log("Sende Payload an /api/generate:", payload);
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        let errorData = await res.json().catch(() => ({}));
        console.error("API Fehler Response:", errorData);
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
      console.error("Fehler in callGenerateApi:", error);
      setErrorMsg(`Aktion fehlgeschlagen: ${error.message}`);
      setGeneratedText('');
    } finally {
      setLoadingState(false);
    }
  };

  const handleInitialGenerate = () => {
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
    // --- Payload OHNE Tonalität ---
    const payload = {
      action: 'generate',
      promptPackageSlug: slug,
      variantId: selectedVariantId,
      placeholders: placeholderValues,
      // tone wird hier NICHT mehr gesendet
    };
    callGenerateApi(payload, setLoading);
  };

  const handleRephrase = () => {
    if (!currentVariant) return;
    setErrorMsg('');
    // --- Payload MIT Tonalität (aus dem Output-Footer) ---
    const payload = {
      action: 'rephrase',
      promptPackageSlug: slug,
      variantId: selectedVariantId,
      placeholders: placeholderValues,
      ...(selectedTone.trim() && { tone: selectedTone.trim() }) // User-Ton wird hier mitgesendet
    };
    callGenerateApi(payload, setIsRefining);
  };

  const handleToggleRefineInput = () => {
    setShowRefineInput(!showRefineInput);
    setAdditionalInfo('');
    setErrorMsg('');
  };

  const handleRefine = () => {
    if (!generatedText || !additionalInfo.trim()) {
      setErrorMsg("Bitte gib Zusatzinformationen für die Verfeinerung ein.");
      return;
    }
    setErrorMsg('');
    // --- Payload MIT Tonalität (aus dem Output-Footer) ---
    const payload = {
      action: 'refine',
      originalText: generatedText,
      additionalInfo: additionalInfo.trim(),
      promptPackageSlug: slug,
      variantId: selectedVariantId,
      placeholders: placeholderValues,
      ...(selectedTone.trim() && { tone: selectedTone.trim() }) // User-Ton wird hier mitgesendet
    };
    callGenerateApi(payload, setIsRefining);
  };

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
    } catch (error) {
      setSendEmailError(`Fehler: ${error.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };

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

  const hasOptionalFields = Object.values(semanticDataInfo).some(item => item?.optional === true);

  // JSX Rendering
  return (
    <div className="w-full space-y-8">

      {/* Variantenauswahl */}
      {generationVariants.length > 1 && (
        <div>
          
          <div className="flex flex-wrap gap-3 justify-center px-2"> {/* <--- Padding hier */}
            {generationVariants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariantId(variant.id)}
                disabled={loading || isRefining}
                className={cn(
                  "w-full sm:w-[calc(50%-0.375rem)] md:w-[calc(33.33%-0.5rem)] lg:w-[calc(25%-0.5625rem)] xl:w-[calc(20%-0.6rem)]",
                  "p-4 border rounded-lg text-left transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  variant.id === selectedVariantId
                    ? "bg-primary/10 border-primary ring-2 ring-primary ring-offset-2 dark:bg-primary/20"
                    : "bg-card border-muted-foreground hover:border-muted-foreground/50",
                  (loading || isRefining) && "opacity-50 cursor-not-allowed"
                )}
              >
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

      {/* Haupt-Grid */}
      {currentVariant ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 px-2"> {/* <--- Padding hier */}
          {/* Linke Spalte: Eingabe */}
          {/* --- KORREKTUR: Klasse hier im Card-Tag --- */}
          <Card className="border-input">
            <CardHeader>
              {currentVariant?.description && (
                <CardDescription className="text-center">{currentVariant.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              {/* --- Tonalität Input ENTFERNT --- */}

              {/* Dynamische Felder (Erforderlich) */}
              {Object.keys(semanticDataInfo).length > 0 ? (
                  <div>
                      <h3 className="text-base font-semibold mb-3">Damit dein Text wirkt …</h3>
                      <div className="grid grid-cols-1 gap-4 mt-6">
                          {renderSemanticFields(semanticDataInfo, false)}
                      </div>
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

              {/* Optionaler Bereich mit Accordion */}
              {hasOptionalFields && (
                <Accordion
                  type="single"
                  collapsible
                  value={accordionValue}
                  onValueChange={setAccordionValue}
                  className="w-full pt-4 border-t"
                >
                  <AccordionItem value="optional-fields" className="border-b-0">
                  <AccordionTrigger className={cn(
                      "text-base font-semibold hover:no-underline",
                      "p-4 rounded-md bg-muted/60 hover:bg-muted/80 transition-colors w-full flex justify-between items-center"
                    )}>
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
                disabled={loading || isRefining || !selectedVariantId}
                className="w-full"
              >
                {(loading && !isRefining) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {(loading && !isRefining) ? 'Generiere...' : 'Text generieren'}
              </Button>
            </CardFooter>
          </Card>

          {/* Rechte Spalte: Ausgabe */}
          {/* --- KORREKTUR: Klasse hier im Card-Tag --- */}
          <Card className="flex flex-col border-input">
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
              {errorMsg && (
                <Alert variant="destructive" className="mb-4">
                   <AlertCircle className="h-4 w-4" />
                   <AlertTitle>Fehler</AlertTitle>
                   <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

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

              {loading && !isRefining && (
                <div className="p-4 bg-muted/50 rounded-md border border-dashed text-sm text-muted-foreground min-h-[250px] flex items-center justify-center flex-grow">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <span>Generiere Text...</span>
                </div>
              )}
            </CardContent>

            {/* Footer für Aktionen (ANGEPASST) */}
            {generatedText && !loading && (
              <CardFooter className="flex flex-col items-start gap-4 pt-4 border-t">

                {/* --- NEU: Tonalitäts-Input hier platziert --- */}
                <div className="w-full space-y-2 p-3 border rounded-md bg-muted/50">
                  <Label htmlFor={`tone-${selectedVariantId}-adjust`}>Tonalität anpassen (optional):</Label>
                  <div className="relative" ref={toneInputRef}> {/* ref hierher verschoben */}
                    <Input
                      id={`tone-${selectedVariantId}-adjust`} // Eindeutige ID
                      value={selectedTone}
                      onChange={handleToneInputChange}
                      onFocus={() => {
                        if (selectedTone.trim().length > 0 && filteredTones.length > 0) {
                           setShowToneSuggestions(true);
                        }
                      }}
                      placeholder="z.B. lockerer, formeller, witziger, kreativer..."
                      autoComplete="off"
                      disabled={isRefining} // Nur während Refine deaktivieren
                    />
                    {/* Vorschlagsliste */}
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
                  </div>
                   <p className="text-xs text-muted-foreground">
                     Gib hier einen Ton an, wenn du den generierten Text mit den Buttons unten anpassen möchtest.
                   </p>
                </div>
                {/* --- ENDE NEU --- */}

                {/* Bereich für Rephrase/Refine Buttons */}
                <div className="flex flex-wrap gap-2 w-full">
                   <Button variant="secondary" size="sm" onClick={handleRephrase} disabled={isRefining} className="flex items-center">
                     {isRefining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                     {isRefining ? 'Formuliere neu...' : 'Neu formulieren'}
                   </Button>
                   <Button variant="secondary" size="sm" onClick={handleToggleRefineInput} disabled={isRefining} className="flex items-center">
                     <Info className="mr-2 h-4 w-4" />
                     {showRefineInput ? 'ausblenden' : 'Zusatzinfos'}
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

                {/* Bereich für Teilen-Buttons */}
                <div className="w-full pt-4 border-t">
                    <span className="text-sm font-medium block mb-2">Teilen via:</span>
                    <div className="flex flex-wrap gap-2">
                      {/* WhatsApp, LinkedIn, Facebook Buttons */}
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

                      {/* E-Mail Senden Button (Dialog) */}
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
           {generationVariants.length === 0
             ? "Keine Prompt-Varianten für dieses Paket gefunden."
             : "Bitte wähle eine Variante aus."}
         </p>
      )}

    </div>
  );
}
