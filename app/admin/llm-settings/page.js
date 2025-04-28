// app/(dashboard)/admin/llm-settings/page.js
"use client"; // Diese Seite ist eine Client-Komponente, da sie Hooks wie useState/useEffect verwendet

import React, { useState, useEffect } from 'react';
import { getLlmSettings } from './actions'; // Importiere die Action zum Laden der Daten
// --- KORRIGIERTER IMPORT ---
import LlmSettingsForm from './LlmSettingsForm'; // Importiere die eigentliche Formular-Komponente (Großes L!)
// --- ENDE KORRIGIERTER IMPORT ---
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from 'lucide-react'; // Loader2 für Ladeanzeige

// Definiere die Standardstruktur auch hier oder importiere sie, falls getLlmSettings keinen Fallback hat
// (Obwohl dein getLlmSettings bereits einen Fallback enthält, ist es gut, ihn hier zur Sicherheit zu haben)
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


export default function LlmSettingsPage() {
  // State für die geladenen Einstellungen
  const [settingsData, setSettingsData] = useState(null);
  // State für den Ladevorgang
  const [loading, setLoading] = useState(true);
  // State für Fehlermeldungen
  const [error, setError] = useState(null);

  // Effekt zum Laden der Daten beim ersten Rendern der Seite
  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        setError(null); // Fehler zurücksetzen vor neuem Versuch
        console.log("Lade LLM Einstellungen...");
        const result = await getLlmSettings(); // Rufe die Server Action auf
        console.log("Ergebnis von getLlmSettings:", result);

        if (result.success && result.settings) {
          // Erfolg: Speichere die geladenen Einstellungen
          setSettingsData(result.settings);
        } else {
          // Fehler oder keine Daten: Setze Fehler und verwende Fallback für die Anzeige
          setError(result.error || "Unbekannter Fehler beim Laden der Einstellungen.");
          console.warn("Fehler beim Laden oder keine Settings gefunden, setze Fallback für Anzeige.");
          // Optional: Hier könntest du entscheiden, ob du Fallback-Daten anzeigen willst
          // oder nur die Fehlermeldung. Wir setzen hier mal den Fallback,
          // damit das Formular ggf. mit Defaults angezeigt werden kann, wenn kein harter Fehler vorliegt.
          // Wenn du bei *jedem* Ladefehler nur die Fehlermeldung willst, setze settingsData auf null.
          setSettingsData(defaultSettingsFallback);
        }
      } catch (err) {
        // Unerwarteter Fehler während des Abrufs
        console.error("Unerwarteter Fehler in loadSettings:", err);
        setError("Ein unerwarteter Fehler ist aufgetreten.");
        setSettingsData(null); // Keine Daten bei unerwartetem Fehler
      } finally {
        // Ladevorgang abgeschlossen (egal ob Erfolg oder Fehler)
        setLoading(false);
      }
    }

    loadSettings();
  }, []); // Leeres Abhängigkeitsarray, damit der Effekt nur einmal beim Mounten läuft

  // --- Render-Logik basierend auf Lade-/Fehlerzustand ---

  // 1. Ladezustand anzeigen
  if (loading) {
    return (
      // --- ANGEPASST: Wrapper für Konsistenz ---
      <div className="space-y-6">
        <div className="flex items-center justify-center h-40">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" />
          <span>Lade Einstellungen...</span>
        </div>
      </div>
      // --- ENDE ANPASSUNG ---
    );
  }

  // 2. Fehlerzustand anzeigen (wenn ein Fehler aufgetreten ist UND keine Daten zum Anzeigen da sind)
  // Wenn ein Fehler auftrat, aber wir Fallback-Daten in settingsData haben, zeigen wir das Formular trotzdem an (mit Fehlermeldung oben).
  if (error && !settingsData) {
    return (
      // --- ANGEPASST: Wrapper für Konsistenz ---
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">LLM Einstellungen</h1> {/* Überschrift auch hier anzeigen */}
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Fehler</AlertTitle>
          <AlertDescription>
            {error} Bitte versuchen Sie es später erneut oder kontaktieren Sie den Support.
          </AlertDescription>
        </Alert>
      </div>
      // --- ENDE ANPASSUNG ---
    );
  }

  // 3. Erfolgszustand (oder Fehler mit Fallback-Daten): Formular rendern
  // Wir übergeben die geladenen (oder Fallback-) Daten an die LlmSettingsForm Komponente.
  // Die LlmSettingsForm Komponente ist jetzt dafür verantwortlich, die States (temperature etc.)
  // basierend auf dieser Prop zu initialisieren und das Formular darzustellen.
  return (
    // --- ANGEPASST: space-y-6 statt space-y-4 ---
    <div className="space-y-6">
      {/* --- ANGEPASST: font-semibold statt font-bold --- */}
      <h1 className="text-2xl font-semibold">LLM Einstellungen</h1>

      {/* Optionale Anzeige einer Fehlermeldung, auch wenn das Formular mit Fallbacks angezeigt wird */}
      {error && (
         <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Hinweis</AlertTitle>
            <AlertDescription>
              {error} Es werden Standardeinstellungen angezeigt.
            </AlertDescription>
        </Alert>
      )}

      {/* Rendere das eigentliche Formular nur, wenn wir Daten haben (geladen oder Fallback) */}
      {settingsData ? (
        // Hier wird die Komponente mit dem korrekten Namen verwendet
        <LlmSettingsForm currentSettings={settingsData} />
      ) : (
         // Dieser Fall sollte kaum eintreten, wenn die Logik oben korrekt ist,
         // aber als letzte Sicherheit.
         <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Fehler</AlertTitle>
            <AlertDescription>
              Die Einstellungsdaten konnten nicht initialisiert werden.
            </AlertDescription>
        </Alert>
      )}
    </div>
    // --- ENDE ANPASSUNG ---
  );
}
