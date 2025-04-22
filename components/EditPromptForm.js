// components/EditPromptForm.js - Zurück zu Textarea

"use client";

import { useState, useEffect, useRef } from 'react';
import { updatePromptPackage } from '@/app/admin/prompts/actions'; // Pfad prüfen!
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Standard Textarea
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
// --- JSONInput und locale entfernt ---

export default function EditPromptForm({ initialData }) {
  const [name, setName] = useState(initialData?.promptPackage?.name || '');
  const [slug, setSlug] = useState(initialData?.promptPackage?.slug || '');
  const [description, setDescription] = useState(initialData?.promptPackage?.description || '');
  const [category, setCategory] = useState(initialData?.promptPackage?.category || '');

  // --- Nur noch der JSON-String im State ---
  const [variantsJsonString, setVariantsJsonString] = useState(
    // Initialisiere mit formatiertem JSON oder leerem String
    initialData?.variants ? JSON.stringify({ generation_variants: initialData.variants }, null, 2) : '{\n  "generation_variants": []\n}'
  );

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // --- jsonError State bleibt für Fehler beim Submit ---
  const [jsonError, setJsonError] = useState('');

  // --- Debounce Ref wird nicht mehr benötigt ---
  // const debounceTimeoutRef = useRef(null);

  // --- Struktur-Validierung (bleibt für Submit-Prüfung) ---
  const validateStructure = (variantsArray) => {
    try {
      if (!Array.isArray(variantsArray)) {
        throw new Error("Die 'generation_variants' müssen ein Array sein.");
      }
      const variantIds = new Set();
      variantsArray.forEach((variant, index) => {
        if (!variant || typeof variant !== 'object') throw new Error(`Variante ${index + 1} ist kein gültiges Objekt.`);
        if (!variant.id || typeof variant.id !== 'string' || variant.id.trim() === '') throw new Error(`Variante ${index + 1}: Fehlende oder ungültige String 'id'.`);
        if (variantIds.has(variant.id)) throw new Error(`Variante ${index + 1}: Die ID '${variant.id}' ist nicht eindeutig.`);
        variantIds.add(variant.id);
        if (!variant.title || typeof variant.title !== 'string') throw new Error(`Variante ${index + 1}: Fehlende oder ungültige 'title'.`);
        if (!variant.description || typeof variant.description !== 'string') throw new Error(`Variante ${index + 1}: Fehlende oder ungültige 'description'.`);
        if (!variant.context || typeof variant.context !== 'object') throw new Error(`Variante ${index + 1}: Fehlendes oder ungültiges 'context' Objekt.`);
        if (!variant.semantic_data || typeof variant.semantic_data !== 'object') throw new Error(`Variante ${index + 1}: Fehlendes oder ungültiges 'semantic_data' Objekt.`);
        if (!variant.writing_instructions || typeof variant.writing_instructions !== 'object') throw new Error(`Variante ${index + 1}: Fehlendes oder ungültiges 'writing_instructions' Objekt.`);
      });
      return { valid: true, error: null };
    } catch (err) {
      return { valid: false, error: `Strukturfehler: ${err.message}` };
    }
  };

  // --- handleEditorChange wird nicht mehr benötigt ---

  // --- useEffect für Timeout Cleanup wird nicht mehr benötigt ---

  // --- useEffect für initiale Validierung (kann entfernt oder angepasst werden) ---
  // Da wir keine Live-Validierung mehr haben, ist dieser Effekt weniger kritisch.
  // Man könnte ihn lassen, um *beim Laden* einen Fehler anzuzeigen, falls die initialen Daten ungültig sind.
  useEffect(() => {
    if (initialData?.variants) {
      try {
        // Nur Struktur prüfen, Syntax wird durch stringify sichergestellt
        const initialValidation = validateStructure(initialData.variants);
        if (!initialValidation.valid) {
          setJsonError(`Warnung: Die initial geladenen Daten haben eine ungültige Struktur: ${initialValidation.error}`);
          // Optional: messageType auf 'warning' setzen
        }
      } catch (e) {
         // Sollte durch stringify nicht passieren, aber sicher ist sicher
         setJsonError(`Warnung: Fehler beim Verarbeiten der initialen Daten: ${e.message}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Nur einmal beim Mounten

  // --- Submit Handler (ANGEPASST: Validierung hier) ---
  const handleSubmit = async (event) => {
    event.preventDefault();
    setJsonError(''); // Fehler vor jeder Prüfung zurücksetzen
    setMessage('');
    setMessageType(null);

    let parsedVariants;
    let variantsArray;

    // 1. Syntax-Prüfung (JSON.parse)
    try {
      parsedVariants = JSON.parse(variantsJsonString);
      // Prüfen, ob das Top-Level-Objekt 'generation_variants' enthält
      if (!parsedVariants || typeof parsedVariants !== 'object' || !parsedVariants.hasOwnProperty('generation_variants')) {
          throw new Error("Das JSON muss ein Objekt mit einem Schlüssel 'generation_variants' sein.");
      }
      variantsArray = parsedVariants.generation_variants; // Array extrahieren
    } catch (parseError) {
      setJsonError(`JSON Syntaxfehler: ${parseError.message}`);
      setMessage(`Fehler: Das eingegebene JSON ist syntaktisch ungültig.`);
      setMessageType('error');
      return;
    }

    // 2. Struktur-Prüfung (validateStructure)
    const structureValidation = validateStructure(variantsArray);
    if (!structureValidation.valid) {
      setJsonError(structureValidation.error);
      setMessage(`Fehler: Die JSON-Struktur ist ungültig. ${structureValidation.error}`);
      setMessageType('error');
      return;
    }

    // 3. Prüfung auf leeres Array (optional, je nach Anforderung)
    if (!Array.isArray(variantsArray) || variantsArray.length === 0) {
        setMessage(`Fehler: Das 'generation_variants'-Array darf nicht leer sein.`);
        setMessageType('error');
        return;
    }

    // Wenn alle Prüfungen ok sind:
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('packageId', initialData?.promptPackage?.id);
    formData.append('name', name);
    formData.append('description', description);
    formData.append('category', category);
    // Sende den validierten und geparsten String (optional neu formatiert)
    formData.append('variantsJson', JSON.stringify(parsedVariants, null, 2));

    const result = await updatePromptPackage(formData);

    if (result.success) {
      setMessage(result.message || 'Änderungen erfolgreich gespeichert.');
      setMessageType('success');
      // Optional: Den State mit dem erfolgreich gespeicherten, formatierten JSON aktualisieren
      setVariantsJsonString(JSON.stringify(parsedVariants, null, 2));
    } else {
      setMessage(result.message || 'Ein unbekannter Fehler ist aufgetreten.');
      setMessageType('error');
    }
    setIsSubmitting(false);
  };

  // --- Initialisierungs-Check (unverändert) ---
  if (!initialData || !initialData.promptPackage) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Fehler</AlertTitle>
        <AlertDescription>
          Fehler beim Laden der Paketdaten. Das Formular kann nicht angezeigt werden.
        </AlertDescription>
      </Alert>
    );
  }

  // --- JSX (ANGEPASST: Textarea statt JSONInput) ---
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ... (Felder für name, slug, category, description bleiben gleich) ... */}
       <div className="space-y-2">
        <Label htmlFor="name">Paket-Name</Label>
        <Input type="text" id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug (nicht änderbar)</Label>
        <Input type="text" id="slug" name="slug" readOnly value={slug} className="bg-muted border-muted cursor-not-allowed" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Kategorie</Label>
        <Input type="text" id="category" name="category" required value={category} onChange={(e) => setCategory(e.target.value)} list="category-suggestions" disabled={isSubmitting} />
        <datalist id="category-suggestions">
          <option value="Alltag" />
          <option value="Briefe/Vorlagen" />
          <option value="Beruf" />
          <option value="Eltern" />
          <option value="Emotionen" />
        </datalist>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea id="description" name="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSubmitting} />
      </div>


      {/* --- Varianten JSON Editor (jetzt Textarea) --- */}
      <div className="space-y-2">
        <Label htmlFor="variants-json-editor">Varianten (JSON)</Label>
        {/* Standard Textarea verwenden */}
        <Textarea
          id="variants-json-editor"
          value={variantsJsonString}
          onChange={(e) => setVariantsJsonString(e.target.value)}
          rows={20} // Höhe anpassen nach Bedarf
          placeholder={'{\n  "generation_variants": [\n    {\n      "id": "...",\n      "title": "...",\n      ...\n    }\n  ]\n}'}
          className={cn(
            "font-mono text-sm", // Monospace für bessere Lesbarkeit
            jsonError && "border-red-500 ring-1 ring-red-500" // Fehlerhervorhebung
          )}
          disabled={isSubmitting}
        />
         <p className="text-sm text-muted-foreground">
           Struktur pro Variante: {`{ "id": "...", "title": "...", "description": "...", "context": {...}, "semantic_data": {...}, "writing_instructions": {...} }`}
         </p>
        {/* Fehlermeldung wird jetzt hauptsächlich beim Submit relevant */}
        {jsonError && <p className="text-sm font-medium text-destructive">{jsonError}</p>}
      </div>
      {/* --- ENDE JSON Editor --- */}

      {/* Feedback Alert (unverändert) */}
      {message && (
        <Alert variant={messageType === 'error' ? 'destructive' : 'default'} className={messageType === 'success' ? 'border-green-500 text-green-700 dark:text-green-300 dark:border-green-700 [&>svg]:text-green-700' : ''}>
          {messageType === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>{messageType === 'error' ? 'Fehler' : 'Erfolg'}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Button (unverändert, Logik für disabled bleibt) */}
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSubmitting ? 'Speichere...' : 'Änderungen speichern'}
      </Button>

    </form>
  );
}
