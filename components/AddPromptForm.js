// components/AddPromptForm.js - REFACTORED with shadcn/ui & system_prompt support
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
  const [messageType, setMessageType] = useState(null); // 'success' | 'error' | null
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [variantsJson, setVariantsJson] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setMessageType(null); // Nachrichtentyp zurücksetzen

    const formData = new FormData(event.currentTarget);
    // Stelle sicher, dass der aktuelle Wert aus dem State verwendet wird,
    // falls das Formular-Reset nicht schnell genug ist oder fehlschlägt.
    formData.set('variantsJson', variantsJson);

    const result = await addPromptPackage(formData);

    if (result.success) {
      setMessage(result.message || 'Paket erfolgreich hinzugefügt.');
      setMessageType('success'); // Typ auf Erfolg setzen
      // Formularfelder manuell zurücksetzen
      event.target.reset();
      setVariantsJson(''); // State auch zurücksetzen
    } else {
      setMessage(result.message || 'Ein unbekannter Fehler ist aufgetreten.');
      setMessageType('error'); // Typ auf Fehler setzen
    }

    setIsSubmitting(false);
  };

  // --- Aktualisierter Placeholder mit system_prompt ---
  const jsonPlaceholder = `[
  {
    "title": "Variante 1 Titel",
    "description": "Beschreibung für Variante 1...",
    "template": "Template-Text für Variante 1 mit {{platzhalter}}...",
    "system_prompt": "Optional: Spezifische Anweisung für die KI für Variante 1..."
  },
  {
    "title": "Variante 2 Titel",
    "description": "Beschreibung für Variante 2...",
    "template": "Template-Text für Variante 2...",
     // system_prompt kann auch weggelassen werden, dann wird der Standard genutzt
  },
  // ... (insgesamt genau 5 Stück)
]`;
  // --- Ende Aktualisierung ---

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Felder für name, slug, category, description */}
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
        <Textarea id="description" name="description" rows={3} />
      </div>


      <div className="space-y-2">
        <Label htmlFor="variantsJson">Varianten (als JSON-Array - genau 5 Stück)</Label>
        <Textarea
          id="variantsJson"
          name="variantsJson"
          rows={20}
          required
          value={variantsJson}
          onChange={(e) => setVariantsJson(e.target.value)}
          placeholder={jsonPlaceholder} // Aktualisierter Placeholder
          className="font-mono text-sm bg-muted/50"
        />
         {/* --- Aktualisierte Beschreibung --- */}
         <p className="text-sm text-muted-foreground">
           Struktur pro Variante: {`{ "title": "...", "description": "...", "template": "...", "system_prompt": "(optional)..." }`}
         </p>
         {/* --- Ende Aktualisierung --- */}
      </div>

      {/* Feedback-Nachricht als Alert */}
      {message && (
        <Alert variant={messageType === 'error' ? 'destructive' : 'default'} className={messageType === 'success' ? 'border-green-500 text-green-700 dark:text-green-300 dark:border-green-700 [&>svg]:text-green-700' : ''}>
           {messageType === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertTitle>{messageType === 'error' ? 'Fehler' : 'Erfolg'}</AlertTitle>
          <AlertDescription>
            {message}
          </AlertDescription>
        </Alert>
      )}

       {/* Button */}
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
         {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
         {isSubmitting ? 'Speichere...' : 'Prompt-Paket erstellen'}
       </Button>

    </form>
  );
}
