// components/EditPromptForm.js - Mit Tag-Bearbeitung

"use client";

import { useState, useEffect } from 'react';
import { updatePromptPackage } from '@/app/admin/prompts/actions'; // Korrekter Import
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EditPromptForm({ initialData }) {
  // States für die Paket-Metadaten
  const [name, setName] = useState(initialData?.promptPackage?.name || '');
  const [slug, setSlug] = useState(initialData?.promptPackage?.slug || '');
  const [description, setDescription] = useState(initialData?.promptPackage?.description || '');
  const [category, setCategory] = useState(initialData?.promptPackage?.category || '');
  const [price, setPrice] = useState(initialData?.promptPackage?.price?.toString() || '');

  // --- NEU: State für Tags ---
  // Initialisiere mit dem Array aus der DB, umgewandelt in einen String
  const [tagsString, setTagsString] = useState(() => {
    const tagsArray = initialData?.promptPackage?.tags;
    return Array.isArray(tagsArray) ? tagsArray.join(', ') : ''; // Mit Komma+Leerzeichen verbinden
  });
  // --- ENDE NEU ---

  // State für Prompt-Daten JSON
  const [promptDataJsonString, setPromptDataJsonString] = useState(() => {
    const promptData = {
      context: initialData?.promptPackage?.context || {},
      semantic_data: initialData?.promptPackage?.semantic_data || {},
      writing_instructions: initialData?.promptPackage?.writing_instructions || {}
    };
    try {
      return JSON.stringify(promptData, null, 2);
    } catch (e) {
      console.error("Fehler beim Stringifizieren der initialen Prompt-Daten:", e);
      return '{\n  "context": {},\n  "semantic_data": {},\n  "writing_instructions": {}\n}';
    }
  });

  // States für Feedback und Ladezustand
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jsonError, setJsonError] = useState('');

  // Submit Handler (ANGEPASST für Tags)
  const handleSubmit = async (event) => {
    event.preventDefault();
    setJsonError('');
    setMessage('');
    setMessageType(null);

    let parsedPromptData;

    // 1. Syntax-Prüfung (JSON.parse)
    try {
      parsedPromptData = JSON.parse(promptDataJsonString);
      if (typeof parsedPromptData !== 'object' || parsedPromptData === null ||
          typeof parsedPromptData.context !== 'object' || parsedPromptData.context === null ||
          typeof parsedPromptData.semantic_data !== 'object' || parsedPromptData.semantic_data === null ||
          typeof parsedPromptData.writing_instructions !== 'object' || parsedPromptData.writing_instructions === null) {
        throw new Error("Das JSON muss ein Objekt sein und context, semantic_data, writing_instructions enthalten.");
      }
    } catch (parseError) {
      setJsonError(`JSON Syntaxfehler: ${parseError.message}`);
      setMessage(`Fehler: Das eingegebene JSON ist syntaktisch ungültig oder hat nicht die erwartete Struktur.`);
      setMessageType('error');
      return;
    }

    // 2. Preis-Validierung
    const priceFloat = parseFloat(price);
    if (isNaN(priceFloat) || priceFloat < 0) {
        setMessage(`Fehler: Ungültiger Preis angegeben.`);
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
    formData.append('price', price);
    formData.append('promptDataJson', promptDataJsonString);
    // --- NEU: Tags-String hinzufügen ---
    formData.append('tags', tagsString); // Den String aus dem State übergeben
    // --- ENDE NEU ---

    const result = await updatePromptPackage(formData); // Action-Aufruf

    if (result.success) {
      setMessage(result.message || 'Änderungen erfolgreich gespeichert.');
      setMessageType('success');
      // Optional: Tags-String neu setzen, falls die Action ihn ändert (unwahrscheinlich)
      // setTagsString(Array.isArray(result.data?.tags) ? result.data.tags.join(', ') : '');
    } else {
      setMessage(result.message || 'Ein unbekannter Fehler ist aufgetreten.');
      setMessageType('error');
    }
    setIsSubmitting(false);
  };

  // Initialisierungs-Check
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

  const jsonPlaceholder = `{
  "context": { ... },
  "semantic_data": { ... },
  "writing_instructions": { ... }
}`;

  // JSX (ANGEPASST: Tag-Feld hinzugefügt)
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Paket-Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Paket-Name</Label>
        <Input type="text" id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} disabled={isSubmitting} />
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug">Slug (nicht änderbar)</Label>
        <Input type="text" id="slug" name="slug" readOnly value={slug} className="bg-muted border-muted cursor-not-allowed" />
      </div>

      {/* Kategorie */}
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

      {/* Beschreibung */}
      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea id="description" name="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} disabled={isSubmitting} />
      </div>

      {/* Preis */}
      <div className="space-y-2">
        <Label htmlFor="price">Preis (in Euro)</Label>
        <Input
          type="number"
          id="price"
          name="price"
          required
          step="0.01"
          min="0"
          placeholder="z.B. 9.99"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={isSubmitting}
        />
         <p className="text-sm text-muted-foreground">
           Hinweis: Ändert den Preis in der Datenbank. Der verknüpfte Stripe-Preis wird *nicht* automatisch aktualisiert.
         </p>
      </div>

      {/* --- NEUES FELD FÜR TAGS --- */}
      <div className="space-y-2">
        <Label htmlFor="tags">Tags (mit Komma trennen)</Label>
        <Input
          type="text"
          id="tags"
          name="tags" // Wichtig für FormData
          placeholder="z.B. TOP, E-Mail, Beruf, beliebt"
          value={tagsString} // State verwenden
          onChange={(e) => setTagsString(e.target.value)} // State aktualisieren
          disabled={isSubmitting}
        />
        <p className="text-sm text-muted-foreground">
          Einzelne Wörter oder kurze Phrasen, mit Komma getrennt. 'beliebt' wird speziell behandelt.
        </p>
      </div>
      {/* --- ENDE NEUES FELD FÜR TAGS --- */}

      {/* Prompt-Daten JSON Editor */}
      <div className="space-y-2">
        <Label htmlFor="promptDataJson">Prompt-Daten (als einzelnes JSON-Objekt)</Label>
        <Textarea
          id="promptDataJson"
          name="promptDataJson"
          value={promptDataJsonString}
          onChange={(e) => setPromptDataJsonString(e.target.value)}
          rows={20}
          placeholder={jsonPlaceholder}
          className={cn(
            "font-mono text-sm",
            jsonError && "border-red-500 ring-1 ring-red-500"
          )}
          disabled={isSubmitting}
        />
         <p className="text-sm text-muted-foreground">
           Struktur: {`{ "context": {...}, "semantic_data": {...}, "writing_instructions": {...} }`}
         </p>
        {jsonError && <p className="text-sm font-medium text-destructive">{jsonError}</p>}
      </div>

      {/* Feedback Alert */}
      {message && (
        <Alert variant={messageType === 'error' ? 'destructive' : 'default'} className={messageType === 'success' ? 'border-green-500 text-green-700 dark:text-green-300 dark:border-green-700 [&>svg]:text-green-700' : ''}>
          {messageType === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>{messageType === 'error' ? 'Fehler' : 'Erfolg'}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Button */}
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSubmitting ? 'Speichere...' : 'Änderungen speichern'}
      </Button>

    </form>
  );
}
