// components/EditPromptForm.js - REFACTORED with shadcn/ui
"use client";

import { useState } from 'react';
// import { useRouter } from 'next/navigation'; // Nur nötig für Redirect nach Erfolg
import { updatePromptPackage } from '@/app/admin/prompts/actions'; // Pfad ggf. anpassen
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"; // Icons
import { cn } from "@/lib/utils"; // Hilfsklasse für bedingte Klassen

export default function EditPromptForm({ promptPackage }) {
  // const router = useRouter(); // Bei Bedarf einkommentieren

  // State für Formularfelder (bleibt gleich)
  const [name, setName] = useState(promptPackage.name || '');
  const [slug, setSlug] = useState(promptPackage.slug || ''); // Wird nur angezeigt
  const [description, setDescription] = useState(promptPackage.description || '');
  const [category, setCategory] = useState(promptPackage.category || '');
  const [variantsJson, setVariantsJson] = useState(
    promptPackage.prompt_variants ? JSON.stringify(promptPackage.prompt_variants, null, 2) : '' // Formatiert für Lesbarkeit
  );

  // State für Nachrichten und Zustand (messageType hinzugefügt)
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(null); // 'success' | 'error' | null
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jsonError, setJsonError] = useState('');

  // JSON Validierung (Logik unverändert)
  const handleJsonChange = (e) => {
    const newJson = e.target.value;
    setVariantsJson(newJson);
    try {
      const parsedData = JSON.parse(newJson);
      if (!Array.isArray(parsedData)) throw new Error('JSON ist kein Array.');
      // Hinweis: Die Prüfung auf genau 5 Stück wurde aus deinem Code übernommen.
      if (parsedData.length !== 5) throw new Error(`JSON muss genau 5 Varianten enthalten, enthält aber ${parsedData.length}.`);
      parsedData.forEach((variant, index) => {
         if (!variant.title || !variant.description || !variant.template) {
           throw new Error(`Variante ${index + 1} fehlen benötigte Felder (title, description, template).`);
         }
      });
      setJsonError(''); // Fehler löschen bei Erfolg
    } catch (err) {
      setJsonError(`Ungültiges JSON oder falsche Struktur: ${err.message}`); // Fehler setzen
    }
  };

  // Submit Handler (Logik fast unverändert, setzt messageType)
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (jsonError) {
      setMessage(`Fehler: Bitte korrigiere das ungültige JSON im Varianten-Feld.`);
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
    formData.append('variantsJson', variantsJson); // Den (validierten) String senden

    const result = await updatePromptPackage(formData);

    if (result.success) {
      setMessage(result.message || 'Änderungen erfolgreich gespeichert.');
      setMessageType('success');
      // Optional: router.push('/admin/prompts'); // Zurück zur Übersicht
      // Optional: router.refresh(); // Daten auf der aktuellen Seite neu laden
    } else {
      setMessage(result.message || 'Ein unbekannter Fehler ist aufgetreten.');
      setMessageType('error');
    }
    setIsSubmitting(false);
  };

  return (
    // Form mit Tailwind spacing
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Die Überschrift sollte von der umgebenden Seite kommen, z.B. /admin/prompts/edit/[id]/page.js */}
      {/* <h3 className="text-xl font-semibold">Prompt-Paket bearbeiten</h3> */}

      <div className="space-y-2">
        <Label htmlFor="name">Paket-Name</Label>
        <Input type="text" id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug (nicht änderbar)</Label>
        {/* ReadOnly Input mit speziellem Styling */}
        <Input type="text" id="slug" name="slug" readOnly value={slug} className="bg-muted border-muted cursor-not-allowed" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Kategorie</Label>
        <Input type="text" id="category" name="category" required value={category} onChange={(e) => setCategory(e.target.value)} list="category-suggestions" />
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
        <Textarea id="description" name="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="variantsJson">Varianten (als JSON-Array - genau 5 Stück)</Label>
        <Textarea
          id="variantsJson"
          name="variantsJson"
          rows={20}
          required
          value={variantsJson}
          onChange={handleJsonChange} // Unser Handler mit Validierung
          className={cn( // cn() für bedingte Klassen
            "font-mono text-sm bg-muted/50", // Basis-Styling
            jsonError && "border-red-500 focus-visible:ring-red-500" // Roter Rand bei Fehler
          )}
        />
         <p className="text-sm text-muted-foreground">
           Struktur pro Variante: {`{ "title": "...", "description": "...", "template": "..." }`}
         </p>
        {/* Anzeige des JSON-Fehlers mit Tailwind gestylt */}
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

      <Button type="submit" disabled={isSubmitting || !!jsonError} className="w-full sm:w-auto">
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isSubmitting ? 'Speichere...' : 'Änderungen speichern'}
      </Button>

    </form>
  );
}