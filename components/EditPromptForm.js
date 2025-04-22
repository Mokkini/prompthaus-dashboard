// components/EditPromptForm.js - Mit react-json-editor-ajrm

"use client";

import { useState, useEffect } from 'react';
import { updatePromptPackage } from '@/app/actions'; // Pfad ggf. anpassen
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Behalten für Description
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// --- NEU: JSON Editor importieren ---
import JSONInput from 'react-json-editor-ajrm';
import locale from 'react-json-editor-ajrm/locale/en'; // Oder 'de', falls verfügbar und gewünscht

export default function EditPromptForm({ initialData }) {
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

  const { promptPackage, variants: initialVariants } = initialData;

  // State für Formularfelder (bleibt gleich)
  const [name, setName] = useState(promptPackage.name || '');
  const [slug, setSlug] = useState(promptPackage.slug || '');
  const [description, setDescription] = useState(promptPackage.description || '');
  const [category, setCategory] = useState(promptPackage.category || '');

  // --- State für JSON angepasst ---
  // Wir speichern das geparste Objekt für den Editor
  const [variantsObject, setVariantsObject] = useState({ generation_variants: initialVariants || [] });
  // Wir behalten auch den String für die Server Action und die ursprüngliche Validierung
  const [variantsJsonString, setVariantsJsonString] = useState(
    JSON.stringify({ generation_variants: initialVariants || [] }, null, 2)
  );

  // State für Nachrichten und Zustand (bleibt gleich)
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(null); // 'success' | 'error' | null
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jsonError, setJsonError] = useState(''); // Für unsere Struktur-Validierung

  // --- Struktur-Validierung (bleibt wichtig!) ---
  // Diese Funktion prüft die *Struktur*, nicht nur die Syntax
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

  // --- Handler für Änderungen im JSON Editor ---
  const handleEditorChange = (jsObject) => {
    // jsObject enthält { jsObject, error, json }
    if (jsObject.error) {
      // Syntaxfehler vom Editor erkannt
      setJsonError(`JSON Syntaxfehler: ${jsObject.error.reason} (Zeile ${jsObject.error.line})`);
      // Objekt-State nicht aktualisieren, String-State auch nicht
      // Wichtig: Den String-State hier *nicht* setzen, da er ungültig ist!
    } else {
      // Keine Syntaxfehler -> Struktur prüfen
      const structureValidation = validateStructure(jsObject.jsObject?.generation_variants);
      if (structureValidation.valid) {
        setJsonError(''); // Alle Fehler löschen
        setVariantsObject(jsObject.jsObject); // Objekt-State aktualisieren
        // String-State für die Server Action aktualisieren (formatiert)
        setVariantsJsonString(JSON.stringify(jsObject.jsObject, null, 2));
      } else {
        // Syntax ok, aber Struktur nicht
        setJsonError(structureValidation.error);
        setVariantsObject(jsObject.jsObject); // Objekt trotzdem setzen, damit User weiter editieren kann
        // String-State *nicht* setzen, da Struktur ungültig ist
        // Alternativ: String setzen, aber Fehler anzeigen
        setVariantsJsonString(JSON.stringify(jsObject.jsObject, null, 2)); // Setzen, damit Submit fehlschlägt
      }
    }
  };

  // Effekt, um die Struktur beim initialen Laden zu prüfen (optional, aber gut)
  useEffect(() => {
    const initialValidation = validateStructure(variantsObject.generation_variants);
    if (!initialValidation.valid) {
      setJsonError(initialValidation.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Nur einmal beim Mounten

  // Submit Handler (prüft jetzt nur noch jsonError State)
  const handleSubmit = async (event) => {
    event.preventDefault();

    // Prüfen, ob ein Fehler im jsonError State vorliegt
    if (jsonError) {
      setMessage(`Fehler: Bitte korrigiere die Fehler im Varianten-JSON.`);
      setMessageType('error');
      // Fokus auf den Editor setzen (optional)
      // document.getElementById('variants-json-editor')?.focus();
      return;
    }
    // Prüfen, ob das Feld (jetzt der String) leer ist
    if (!variantsJsonString.trim() || variantsJsonString === '{}' || variantsJsonString === '{"generation_variants":[]}') {
        setMessage(`Fehler: Das Varianten-JSON darf nicht leer sein oder muss mindestens eine Variante enthalten.`);
        setMessageType('error');
        return;
    }

    setIsSubmitting(true);
    setMessage('');
    setMessageType(null);

    const formData = new FormData();
    formData.append('packageId', promptPackage.id);
    formData.append('name', name);
    formData.append('description', description);
    formData.append('category', category);
    // --- WICHTIG: Den validierten JSON-String senden ---
    formData.append('variantsJson', variantsJsonString);

    const result = await updatePromptPackage(formData);

    if (result.success) {
      setMessage(result.message || 'Änderungen erfolgreich gespeichert.');
      setMessageType('success');
      // Optional: Weiterleiten oder Seite neu laden
    } else {
      setMessage(result.message || 'Ein unbekannter Fehler ist aufgetreten.');
      setMessageType('error');
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Felder für name, slug, category, description (bleiben gleich) */}
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

      {/* --- Varianten JSON Editor --- */}
      <div className="space-y-2">
        <Label htmlFor="variants-json-editor">Varianten (JSON)</Label>
        <div className={cn(
            "border rounded-md overflow-hidden", // Rahmen um den Editor
            jsonError && "border-red-500 ring-1 ring-red-500" // Roter Rahmen bei Fehler
        )}>
          <JSONInput
            id='variants-json-editor'
            // WICHTIG: Das Objekt übergeben
            placeholder={variantsObject}
            // Das Locale Objekt übergeben
            locale={locale}
            // Farben anpassen (optional, hier Standard)
            // colors={{ ... }}
            // Style anpassen (optional)
            // style={{ ... }}
            // Unser Handler für Änderungen
            onChange={handleEditorChange}
            // Höhe und Breite anpassen
            height='450px'
            width='100%'
            // Wartezeit für onChange-Trigger (optional)
            // waitAfterKeyPress={1000}
            // Theme (optional, passt sich oft an, aber man kann es erzwingen)
            // theme="light_mitsuketa_tribute" // Beispiel
          />
        </div>
         {/* Beschreibung der Struktur (bleibt gleich) */}
         <p className="text-sm text-muted-foreground">
           Struktur pro Variante: {`{ "id": "...", "title": "...", "description": "...", "context": {...}, "semantic_data": {...}, "writing_instructions": {...} }`}
         </p>
        {/* Fehlermeldung für JSON anzeigen */}
        {jsonError && <p className="text-sm font-medium text-destructive">{jsonError}</p>}
      </div>
      {/* --- ENDE JSON Editor --- */}

      {/* Feedback Alert (bleibt gleich) */}
      {message && (
        <Alert variant={messageType === 'error' ? 'destructive' : 'default'} className={messageType === 'success' ? 'border-green-500 text-green-700 dark:text-green-300 dark:border-green-700 [&>svg]:text-green-700' : ''}>
          {messageType === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>{messageType === 'error' ? 'Fehler' : 'Erfolg'}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Button (prüft jetzt jsonError State) */}
      <Button type="submit" disabled={isSubmitting || !!jsonError} className="w-full sm:w-auto">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSubmitting ? 'Speichere...' : 'Änderungen speichern'}
      </Button>

    </form>
  );
}
