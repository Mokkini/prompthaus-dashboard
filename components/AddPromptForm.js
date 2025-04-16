// components/AddPromptForm.js - REFACTORED with shadcn/ui
"use client";

import { useState } from 'react';
import { addPromptPackage } from '@/app/admin/prompts/actions'; // Pfad ggf. anpassen
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// Icons für Ladezustand und Feedback importieren
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AddPromptForm() {
  const [message, setMessage] = useState('');
  // Neuer State für den Typ der Nachricht (für Alert-Styling)
  const [messageType, setMessageType] = useState(null); // 'success' | 'error' | null
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [variantsJson, setVariantsJson] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setMessageType(null); // Nachrichtentyp zurücksetzen

    const formData = new FormData(event.currentTarget);
    const result = await addPromptPackage(formData);

    if (result.success) {
      setMessage(result.message || 'Paket erfolgreich hinzugefügt.');
      setMessageType('success'); // Typ auf Erfolg setzen
      event.target.reset();
      setVariantsJson('');
    } else {
      setMessage(result.message || 'Ein unbekannter Fehler ist aufgetreten.');
      setMessageType('error'); // Typ auf Fehler setzen
    }

    setIsSubmitting(false);
  };

  // Gekürzter Placeholder für Lesbarkeit
  const jsonPlaceholder = `[
  {
    "title": "Variante 1...",
    "description": "...",
    "template": "..."
  },
  {
    "title": "Variante 2...",
    "description": "...",
    "template": "..."
  },
  ... (genau 5 Stück)
]`;

  return (
    // Ersetze Inline-Styles durch Tailwind-Klassen für Abstände
    // Das <form> selbst braucht keinen Rahmen mehr, da es in der Card ist.
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Die Überschrift wird durch CardTitle in page.js ersetzt, daher hier auskommentiert */}
      {/* <h3 className="text-xl font-semibold">Neues Prompt-Paket hinzufügen</h3> */}

      {/* Verwende Label und Input von shadcn/ui */}
      <div className="space-y-2">
        <Label htmlFor="name">Paket-Name</Label>
        <Input type="text" id="name" name="name" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input type="text" id="slug" name="slug" required pattern="[a-z0-9-]+" placeholder="z.b. danke-sagen" />
        <p className="text-sm text-muted-foreground">
          URL-Teil, klein, keine Leerzeichen oder Sonderzeichen außer Bindestrich.
        </p>
      </div>

      <div className="space-y-2">
         <Label htmlFor="category">Kategorie</Label>
         {/* Input funktioniert mit datalist */}
         <Input type="text" id="category" name="category" required list="category-suggestions" />
         <datalist id="category-suggestions">
           <option value="Alltag" />
           <option value="Briefe/Vorlagen" />
           <option value="Beruf" />
           <option value="Eltern" />
           <option value="Emotionen" />
           {/* Füge bei Bedarf weitere Kategorien hinzu */}
         </datalist>
       </div>

      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung</Label>
        {/* Verwende Textarea von shadcn/ui */}
        <Textarea id="description" name="description" rows={3} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="variantsJson">Varianten (als JSON-Array - genau 5 Stück)</Label>
        <Textarea
          id="variantsJson"
          name="variantsJson"
          rows={20} // Höhe beibehalten
          required
          value={variantsJson} // Gesteuert durch State
          onChange={(e) => setVariantsJson(e.target.value)} // State-Update
          placeholder={jsonPlaceholder} // Placeholder
          className="font-mono text-sm bg-muted/50" // Monospace Schriftart + leichter Hintergrund
        />
         <p className="text-sm text-muted-foreground">
           Struktur pro Variante: {`{ "title": "...", "description": "...", "template": "..." }`}
         </p>
      </div>

      {/* Feedback-Nachricht als Alert */}
      {message && (
         // Setze Variante und ggf. Klassen basierend auf messageType
        <Alert variant={messageType === 'error' ? 'destructive' : 'default'} className={messageType === 'success' ? 'border-green-500 text-green-700 dark:text-green-300 dark:border-green-700 [&>svg]:text-green-700' : ''}>
           {messageType === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>{messageType === 'error' ? 'Fehler' : 'Erfolg'}</AlertTitle>
          <AlertDescription>
            {message}
          </AlertDescription>
        </Alert>
      )}

       {/* Verwende Button von shadcn/ui */}
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
         {/* Zeige Spinner wenn isSubmitting true ist */}
         {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
         {isSubmitting ? 'Speichere...' : 'Prompt-Paket erstellen'}
       </Button>

    </form>
  );
}