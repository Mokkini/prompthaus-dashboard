// app/(dashboard)/admin/llm-settings/LlmSettingsForm.js
"use client";

import React, { useEffect, useState } from 'react';
// --- KORREKTER IMPORT ---
import { useFormStatus } from 'react-dom'; // Importiere useFormStatus von react-dom
// --- ENDE KORREKTER IMPORT ---
import { useActionState } from 'react'; // useActionState kommt von react
import { updateLlmSettings } from './actions';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// SubmitButton verwendet jetzt den korrekt importierten useFormStatus Hook
function SubmitButton() {
  const { pending } = useFormStatus(); // Dieser Hook kommt jetzt von react-dom
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {pending ? 'Speichert...' : 'Einstellungen speichern'}
    </Button>
  );
}

// Definiere die Standardstruktur der Einstellungen
const defaultSettingsFallback = {
    model: 'gpt-4o-mini',
    system_prompt: 'Du bist ein hilfreicher Assistent.',
    temperature: 0.7,
    top_p: 0.95,
    presence_penalty: 0.3,
    frequency_penalty: 0.2,
    max_tokens: 1500,
    stop_sequences: 'User:, System:',
    seed: null,
};

export default function LlmSettingsForm({ currentSettings }) {
  const initialSettings = (currentSettings && typeof currentSettings === 'object')
                           ? { ...defaultSettingsFallback, ...currentSettings }
                           : defaultSettingsFallback;

  const isDataReady = !!currentSettings && typeof currentSettings === 'object';

  const initialState = { success: null, message: null };
  // useActionState kommt weiterhin von 'react'
  const [state, formAction] = useActionState(updateLlmSettings, initialState);

  const [temperature, setTemperature] = useState(initialSettings.temperature);
  const [topP, setTopP] = useState(initialSettings.top_p);
  const [presencePenalty, setPresencePenalty] = useState(initialSettings.presence_penalty);
  const [frequencyPenalty, setFrequencyPenalty] = useState(initialSettings.frequency_penalty);

  useEffect(() => {
    if (state?.success === true) {
      toast.success(state.message || "Einstellungen erfolgreich gespeichert!");
    } else if (state?.success === false && state.message) {
      toast.error(state.message || "Fehler beim Speichern der Einstellungen.");
    }
  }, [state]);

  if (!isDataReady) {
      return (
          <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Datenfehler</AlertTitle>
              <AlertDescription>
                  Die initialen LLM-Einstellungen konnten nicht geladen werden oder sind ungültig. Das Formular kann nicht angezeigt werden. Bitte laden Sie die Seite neu oder kontaktieren Sie den Support.
              </AlertDescription>
          </Alert>
      );
  }

  const initialModel = initialSettings.model;
  const initialSystemPrompt = initialSettings.system_prompt;
  const initialMaxTokens = initialSettings.max_tokens;
  const initialStopSequences = initialSettings.stop_sequences ?? '';
  const initialSeed = initialSettings.seed ?? '';

  const formatNumber = (value, fixed) => {
      return typeof value === 'number' ? value.toFixed(fixed) : 'N/A';
  };

  const getSliderValue = (value) => {
      const numericValue = typeof value === 'number' ? value : 0;
      return [numericValue];
  };

  return (
    <form action={formAction} className="space-y-6">
      {/* Modell */}
      <div className="space-y-2">
        <Label htmlFor="model">Modell</Label>
        <Input
          id="model"
          name="model"
          defaultValue={initialModel}
          required
          placeholder="z.B. gpt-4o-mini"
        />
        <p className="text-sm text-muted-foreground">
          Der Name des zu verwendenden LLM (z.B. gpt-4o-mini, gpt-4-turbo).
        </p>
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <Label htmlFor="system_prompt">System-Prompt (Rolle)</Label>
        <Textarea
          id="system_prompt"
          name="system_prompt"
          defaultValue={initialSystemPrompt}
          required
          rows={4}
          placeholder="z.z. Du bist ein hilfreicher Assistent."
        />
         <p className="text-sm text-muted-foreground">
          Die Systemnachricht, die dem Modell seine Rolle oder Anweisungen gibt.
        </p>
      </div>

      {/* Temperatur */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
            <Label htmlFor="temperature">Temperatur</Label>
            <span className="text-sm font-medium w-12 text-right">{formatNumber(temperature, 2)}</span>
        </div>
        <Slider
          id="temperature"
          name="temperature"
          min={0}
          max={2}
          step={0.01}
          value={getSliderValue(temperature)}
          onValueChange={(value) => setTemperature(value[0])}
        />
        <p className="text-sm text-muted-foreground">
          Steuert die Zufälligkeit. Niedrigere Werte (z.B. 0.2) führen zu fokussierteren, höhere (z.B. 0.8) zu kreativeren Antworten. (Bereich: 0.0 - 2.0)
        </p>
      </div>

       {/* Top P */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
            <Label htmlFor="top_p">Top P</Label>
            <span className="text-sm font-medium w-12 text-right">{formatNumber(topP, 2)}</span>
        </div>
        <Slider
          id="top_p"
          name="top_p"
          min={0}
          max={1}
          step={0.01}
          value={getSliderValue(topP)}
          onValueChange={(value) => setTopP(value[0])}
        />
        <p className="text-sm text-muted-foreground">
          Alternative zur Temperatur. Das Modell berücksichtigt nur Tokens, deren kumulative Wahrscheinlichkeit diesen Wert erreicht. (Bereich: 0.0 - 1.0)
        </p>
      </div>

      {/* Presence Penalty */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
            <Label htmlFor="presence_penalty">Presence Penalty</Label>
            <span className="text-sm font-medium w-12 text-right">{formatNumber(presencePenalty, 1)}</span>
        </div>
        <Slider
          id="presence_penalty"
          name="presence_penalty"
          min={-2}
          max={2}
          step={0.1}
          value={getSliderValue(presencePenalty)}
          onValueChange={(value) => setPresencePenalty(value[0])}
        />
        <p className="text-sm text-muted-foreground">
          Bestraft neue Tokens basierend darauf, ob sie bereits im Text vorkommen. Erhöht die Wahrscheinlichkeit, über neue Themen zu sprechen. (Bereich: -2.0 - 2.0)
        </p>
      </div>

      {/* Frequency Penalty */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
            <Label htmlFor="frequency_penalty">Frequency Penalty</Label>
            <span className="text-sm font-medium w-12 text-right">{formatNumber(frequencyPenalty, 1)}</span>
        </div>
        <Slider
          id="frequency_penalty"
          name="frequency_penalty"
          min={-2}
          max={2}
          step={0.1}
          value={getSliderValue(frequencyPenalty)}
          onValueChange={(value) => setFrequencyPenalty(value[0])}
        />
        <p className="text-sm text-muted-foreground">
          Bestraft neue Tokens basierend auf ihrer bisherigen Häufigkeit im Text. Verringert die Wahrscheinlichkeit, dass das Modell dieselben Zeilen wortwörtlich wiederholt. (Bereich: -2.0 - 2.0)
        </p>
      </div>

      {/* Max Tokens */}
      <div className="space-y-2">
        <Label htmlFor="max_tokens">Maximale Tokens</Label>
        <Input
          id="max_tokens"
          name="max_tokens"
          type="number"
          defaultValue={initialMaxTokens}
          required
          min="1"
          step="1"
          placeholder="z.B. 1500"
        />
         <p className="text-sm text-muted-foreground">
          Die maximale Anzahl an Tokens, die in der Antwort generiert werden sollen.
        </p>
      </div>

      {/* Stop Sequences */}
      <div className="space-y-2">
        <Label htmlFor="stop_sequences">Stop-Sequenzen</Label>
        <Input
          id="stop_sequences"
          name="stop_sequences"
          defaultValue={initialStopSequences}
          placeholder="z.B. User:, System:"
        />
         <p className="text-sm text-muted-foreground">
          Eine Liste von Zeichenketten (durch Komma getrennt), bei denen die API aufhören soll zu generieren.
        </p>
      </div>

       {/* Seed */}
      <div className="space-y-2">
        <Label htmlFor="seed">Seed (Optional)</Label>
        <Input
          id="seed"
          name="seed"
          type="number"
          defaultValue={initialSeed}
          step="1"
          placeholder="z.B. 12345 (leer lassen für zufällig)"
        />
         <p className="text-sm text-muted-foreground">
          Wenn angegeben, versucht das Modell, deterministische Ausgaben zu erzeugen (gleicher Prompt + Seed = gleiche Ausgabe). Nicht immer garantiert.
        </p>
      </div>

      {/* Submit Button */}
      <SubmitButton />
    </form>
  );
}
