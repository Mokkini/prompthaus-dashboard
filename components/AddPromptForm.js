// components/AddPromptForm.js - Angepasst für Preis und neue Action

"use client";

import { useState } from 'react';
// --- KORREKTER IMPORT: Die neue Action importieren ---
// Passe den Pfad an, falls deine actions.js woanders liegt
import { createProductWithStripe } from '@/app/actions'; // <-- GEÄNDERT
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AddPromptForm() {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(null); // 'success' | 'error' | null
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [variantsJson, setVariantsJson] = useState(''); // State für das Textarea

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setMessageType(null);

    const formData = new FormData(event.currentTarget);
    // Stelle sicher, dass der aktuelle Wert aus dem State verwendet wird
    formData.set('variantsJson', variantsJson);

    // --- KORREKTER AUFRUF: Die NEUE Action verwenden ---
    const result = await createProductWithStripe(formData); // <-- GEÄNDERT

    if (result.success) {
      setMessage(result.message || 'Paket erfolgreich hinzugefügt.');
      setMessageType('success');
      // Formularfelder manuell zurücksetzen
      event.target.reset();
      setVariantsJson(''); // State auch zurücksetzen
    } else {
      setMessage(result.message || 'Ein unbekannter Fehler ist aufgetreten.');
      setMessageType('error');
    }

    setIsSubmitting(false);
  };

  // JSON Placeholder (unverändert)
  const jsonPlaceholder = `{
  "generation_variants": [
    {
      "id": "beispiel_id_1",
      "title": "Variante 1 Titel",
      "description": "Beschreibung für Variante 1...",
      "context": {
        "situation": "...",
        "goal": "...",
        "target_audience": { "type": "...", "description": "..." },
        "channel": "...",
        "market": "..."
      },
      "semantic_data": {
        "group1": {
          "type": "object",
          "required": true,
          "description": "Details Gruppe 1",
          "fields": {
            "field1_1": { "type": "string", "label": "Feld 1", "required": true, "placeholder": "..." },
            "field1_2": { "type": "number", "label": "Zahl", "unit": "EUR", "optional": true }
          }
        },
        "optional_text": { "type": "text", "label": "Optionaler Text", "optional": true, "placeholder": "..." }
      },
      "writing_instructions": {
        "overall_tone": ["professional"],
        "formality_level": "formal_sie",
        "key_messages_to_include": ["..."],
        "rhetorical_approach": ["..."],
        "constraints": ["..."]
      }
    },
    {
      "id": "beispiel_id_2",
      "title": "Variante 2 Titel",
      "description": "Beschreibung für Variante 2...",
      "context": { /* ... */ },
      "semantic_data": { /* ... */ },
      "writing_instructions": { /* ... */ }
    }
    // ... weitere Varianten hier einfügen ...
  ]
}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Felder für name, slug, category, description */}
       <div className="space-y-2">
        <Label htmlFor="name">Paket-Name</Label>
        <Input type="text" id="name" name="name" required disabled={isSubmitting} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input type="text" id="slug" name="slug" required pattern="[a-z0-9-]+" placeholder="z.b. danke-sagen" disabled={isSubmitting} />
        <p className="text-sm text-muted-foreground">
          URL-Teil, klein, keine Leerzeichen oder Sonderzeichen außer Bindestrich.
        </p>
      </div>

      <div className="space-y-2">
         <Label htmlFor="category">Kategorie</Label>
         <Input type="text" id="category" name="category" required list="category-suggestions" disabled={isSubmitting} />
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
        <Textarea id="description" name="description" rows={3} disabled={isSubmitting} />
      </div>

      {/* --- NEUES FELD: Preis --- */}
      <div className="space-y-2">
        <Label htmlFor="price">Preis (in Euro)</Label>
        <Input
          type="number"
          id="price"
          name="price"
          required
          step="0.01" // Erlaubt Cent-Beträge
          min="0"      // Kein negativer Preis
          placeholder="z.B. 9.99"
          disabled={isSubmitting}
        />
        <p className="text-sm text-muted-foreground">
          Gib den Preis in Euro an (z.B. 4.50). Dieser wird für Supabase und Stripe verwendet.
        </p>
      </div>
      {/* --- ENDE NEUES FELD --- */}

      {/* Varianten JSON Textarea */}
      <div className="space-y-2">
        <Label htmlFor="variantsJson">Varianten (als JSON-Objekt mit 'generation_variants'-Array)</Label>
        <Textarea
          id="variantsJson"
          name="variantsJson"
          rows={20}
          required
          value={variantsJson}
          onChange={(e) => setVariantsJson(e.target.value)}
          placeholder={jsonPlaceholder}
          className="font-mono text-sm bg-muted/50"
          disabled={isSubmitting}
        />
         <p className="text-sm text-muted-foreground">
           Struktur pro Variante: {`{ "id": "...", "title": "...", "description": "...", "context": {...}, "semantic_data": {...}, "writing_instructions": {...} }`}
         </p>
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
