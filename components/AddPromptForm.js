// components/AddPromptForm.js - Mit Tag-Eingabefeld

"use client";

import { useState } from 'react';
import { addPromptPackage } from '@/app/admin/prompts/actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function AddPromptForm() {
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promptDataJson, setPromptDataJson] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    setMessageType(null);

    const formData = new FormData(event.currentTarget);
    // Stelle sicher, dass der aktuelle Wert aus dem State verwendet wird
    formData.set('promptDataJson', promptDataJson);

    // Die Tags werden automatisch durch FormData geholt, da das Feld einen 'name' hat.
    // Die Verarbeitung erfolgt in der Server Action.

    const result = await addPromptPackage(formData);

    if (result.success) {
      setMessage(result.message || 'Paket erfolgreich hinzugefügt.');
      setMessageType('success');
      event.target.reset(); // Setzt alle Standard-Formularfelder zurück
      setPromptDataJson(''); // JSON-State explizit zurücksetzen
      // Optional: Auch andere States zurücksetzen, falls nötig
    } else {
      setMessage(result.message || 'Ein unbekannter Fehler ist aufgetreten.');
      setMessageType('error');
    }

    setIsSubmitting(false);
  };

  const jsonPlaceholder = `{
  "context": {
    "goal": "...",
    "market": "Deutschland",
    "channel": "...",
    "persona": { "role": "...", "emotion": "..." },
    "situation": "...",
    "target_audience": { "type": "...", "description": "..." }
  },
  "semantic_data": {
    "feldname_1": {
      "type": "text",
      "label": "Beispiel Label 1",
      "optional": false,
      "placeholder": "z.B. Wert A, Wert B"
    },
    "feldname_2": {
      "type": "boolean",
      "label": "Beispiel Option",
      "optional": true
    }
    // ... weitere Felder ...
  },
  "writing_instructions": {
    "constraints": ["..."],
    "overall_tone": ["..."],
    "language_level": "B1",
    "formality_level": "Neutral",
    "stylistic_rules": ["..."],
    "rhetorical_approach": ["..."],
    "key_messages_to_include": ["..."]
  }
}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Paket-Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Paket-Name</Label>
        <Input type="text" id="name" name="name" required disabled={isSubmitting} />
      </div>

      {/* Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug">Slug</Label>
        <Input type="text" id="slug" name="slug" required pattern="[a-z0-9-]+" placeholder="z.b. danke-sagen" disabled={isSubmitting} />
        <p className="text-sm text-muted-foreground">
          URL-Teil, klein, keine Leerzeichen oder Sonderzeichen außer Bindestrich.
        </p>
      </div>

      {/* Kategorie */}
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

      {/* Beschreibung */}
      <div className="space-y-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea id="description" name="description" rows={3} disabled={isSubmitting} />
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
          disabled={isSubmitting}
        />
      </div>

      {/* --- NEUES FELD FÜR TAGS --- */}
      <div className="space-y-2">
        <Label htmlFor="tags">Tags (mit Komma trennen)</Label>
        <Input
          type="text"
          id="tags"
          name="tags" // Wichtig für FormData
          placeholder="z.B. TOP, E-Mail, Beruf, beliebt"
          disabled={isSubmitting}
        />
        <p className="text-sm text-muted-foreground">
          Einzelne Wörter oder kurze Phrasen, mit Komma getrennt. 'beliebt' wird speziell behandelt.
        </p>
      </div>
      {/* --- ENDE NEUES FELD FÜR TAGS --- */}

      {/* Prompt-Daten JSON */}
      <div className="space-y-2">
        <Label htmlFor="promptDataJson">Prompt-Daten (als einzelnes JSON-Objekt)</Label>
        <Textarea
          id="promptDataJson"
          name="promptDataJson" // Name bleibt, aber Wert wird über State gesteuert
          rows={20}
          required
          value={promptDataJson}
          onChange={(e) => setPromptDataJson(e.target.value)}
          placeholder={jsonPlaceholder}
          className="font-mono text-sm bg-muted/50"
          disabled={isSubmitting}
        />
        <p className="text-sm text-muted-foreground">
          Struktur: {`{ "context": {...}, "semantic_data": {...}, "writing_instructions": {...} }`}
        </p>
      </div>

      {/* Feedback-Nachricht */}
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
