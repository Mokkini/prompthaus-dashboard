// components/DynamicFormRenderer.js
"use client"; // Da wir UI-Komponenten und Handler verwenden

import React from 'react'; // React importieren
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

// Hilfsfunktion zum Formatieren
const formatPlaceholderName = (name) => {
  if (typeof name !== 'string') return '';
  return name.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
};

// Die Komponente
export function DynamicFormRenderer({
  semanticDataInfo,
  placeholderValues,
  handleInputChange,
  loading,
  isRefining,
  getNestedValue,
  accordionValue,
  setAccordionValue
}) {

  // --- renderSemanticFields Funktion (ANGEPASST für Schritt 2) ---
  const renderSemanticFields = (data, isOptionalSection = false, currentPath = '') => {
     if (!data || typeof data !== 'object') return [];
     return Object.entries(data)
      .map(([key, item]) => {
        if (!item || typeof item !== 'object') {
            console.warn("Ungültiges Item in renderSemanticFields gefunden:", key, item);
            return null;
        }
        const stateKey = currentPath ? `${currentPath}.${key}` : key;
        const { type, label: itemLabel, placeholder: itemPlaceholder, description: itemDescription, unit, constraints, required, optional, fields } = item; // fields extrahiert

        const label = itemLabel || formatPlaceholderName(key);
        const placeholder = itemPlaceholder || '';
        const isRequiredMarker = required === true && !isOptionalSection;

        // Logik zum Überspringen von Feldern basierend auf Sektion
        if ((isOptionalSection && optional !== true) || (!isOptionalSection && optional === true)) {
          return null;
        }

        // --- NEU: Prüfung auf verschachtelte Felder ZUERST ---
        // Wenn das Item ein 'fields'-Objekt hat, behandeln wir es als Gruppe/Objekt.
        if (fields && typeof fields === 'object' && Object.keys(fields).length > 0) {
            // Rekursiver Aufruf für die Unterfelder, stateKey als neuen Pfad übergeben
            const renderedFields = renderSemanticFields(fields, isOptionalSection, stateKey);
            // Nur rendern, wenn tatsächlich Felder im Objekt sind
            if (renderedFields.some(field => field !== null)) {
                return (
                    // Container für die Gruppe/das Objekt
                    <div key={stateKey} className="space-y-4 border p-4 rounded-md mb-4 bg-muted/30">
                      {/* Titel für die Gruppe */}
                      <h4 className="font-medium text-sm text-muted-foreground">{itemDescription || label} {isRequiredMarker ? '*' : ''}</h4>
                      {/* Rekursiv gerenderte Felder */}
                      {renderedFields}
                    </div>
                );
            }
            return null; // Leere Gruppe nicht rendern
        }
        // --- ENDE NEU ---

        // --- Fallback: Wenn keine 'fields' vorhanden sind, den 'type' für primitive Felder verwenden ---
        switch (type) {
          // --- 'object'-Case ist jetzt redundant ---
          /*
          case 'object':
            return null; // Wird oben durch 'fields'-Prüfung abgedeckt
          */

          case 'text': // oder 'textarea'
            return (
              <div key={stateKey} className="space-y-1.5">
                <Label htmlFor={stateKey}>{label} {isRequiredMarker ? '*' : ''}</Label>
                <Textarea
                  id={stateKey}
                  value={getNestedValue(placeholderValues, stateKey) || ''}
                  onChange={e => handleInputChange(stateKey, e.target.value)}
                  placeholder={placeholder}
                  rows={3}
                  disabled={loading || isRefining}
                />
                {itemDescription && <p className="text-xs text-muted-foreground">{itemDescription}</p>}
                {constraints && <p className="text-xs text-muted-foreground italic">Hinweis: {constraints.join(' ')}</p>}
              </div>
            );
          case 'boolean':
            return (
              <div key={stateKey} className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id={stateKey}
                  checked={!!getNestedValue(placeholderValues, stateKey)}
                  onCheckedChange={(checked) => handleInputChange(stateKey, checked)}
                  disabled={loading || isRefining}
                />
                <Label htmlFor={stateKey} className="cursor-pointer">
                  {label} {isRequiredMarker ? '*' : ''}
                </Label>
                {itemDescription && <p className="text-xs text-muted-foreground pl-6">{itemDescription}</p>}
              </div>
            );
          case 'number':
            return (
              <div key={stateKey} className="space-y-1.5">
                <Label htmlFor={stateKey}>{label} {unit ? `(${unit})` : ''} {isRequiredMarker ? '*' : ''}</Label>
                <Input
                  id={stateKey}
                  type="number"
                  value={getNestedValue(placeholderValues, stateKey) || ''}
                  onChange={e => handleInputChange(stateKey, e.target.value)}
                  placeholder={placeholder}
                  disabled={loading || isRefining}
                />
                {itemDescription && <p className="text-xs text-muted-foreground">{itemDescription}</p>}
                {constraints && <p className="text-xs text-muted-foreground italic">Hinweis: {constraints.join(' ')}</p>}
              </div>
            );
          case 'date':
             return (
               <div key={stateKey} className="space-y-1.5">
                 <Label htmlFor={stateKey}>{label} {isRequiredMarker ? '*' : ''}</Label>
                 <Input
                   id={stateKey}
                   type="date"
                   value={getNestedValue(placeholderValues, stateKey) || ''}
                   onChange={e => handleInputChange(stateKey, e.target.value)}
                   placeholder={placeholder || 'JJJJ-MM-TT'}
                   disabled={loading || isRefining}
                 />
                 {itemDescription && <p className="text-xs text-muted-foreground">{itemDescription}</p>}
                 {constraints && <p className="text-xs text-muted-foreground italic">Hinweis: {constraints.join(' ')}</p>}
               </div>
             );
          // --- NEU: Fallback für 'string' und unbekannte Typen ---
          case 'string':
          default:
            return (
              <div key={stateKey} className="space-y-1.5">
                <Label htmlFor={stateKey}>{label} {isRequiredMarker ? '*' : ''}</Label>
                <Input
                  id={stateKey}
                  type="text"
                  value={getNestedValue(placeholderValues, stateKey) || ''}
                  onChange={e => handleInputChange(stateKey, e.target.value)}
                  placeholder={placeholder}
                  disabled={loading || isRefining}
                />
                {itemDescription && <p className="text-xs text-muted-foreground">{itemDescription}</p>}
                {constraints && <p className="text-xs text-muted-foreground italic">Hinweis: {constraints.join(' ')}</p>}
              </div>
            );
        }
      })
      .filter(field => field !== null);
  };
  // --- Ende renderSemanticFields ---

  // --- ANPASSUNG: Initiale Aufrufe mit leerem Pfad versehen ---
  const hasOptionalFields = Object.values(semanticDataInfo).some(item => item?.optional === true);
  const requiredFieldsRendered = renderSemanticFields(semanticDataInfo, false, ''); // <-- Leerer Pfad hinzugefügt

  return (
    <div className="space-y-6">
      {/* Dynamische Felder (Erforderlich) */}
      {Object.keys(semanticDataInfo).length > 0 ? (
        <div>
          <h3 className="text-base font-semibold mb-3">Damit dein Text wirkt …</h3>
          <div className="grid grid-cols-1 gap-4 mt-6">
            {requiredFieldsRendered} {/* Hier wird die angepasste Funktion aufgerufen */}
          </div>
          {requiredFieldsRendered.length === 0 && !hasOptionalFields && (
            <p className="text-sm text-muted-foreground mt-4">
              <em>Für diese Variante sind keine spezifischen Angaben erforderlich.</em>
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Keine Eingabefelder für diese Variante definiert.</p>
      )}

      {/* Optionaler Bereich mit Accordion */}
      {hasOptionalFields && (
        <Accordion
          type="single"
          collapsible
          value={accordionValue}
          onValueChange={setAccordionValue}
          className="w-full pt-4 border-t"
        >
          <AccordionItem value="optional-fields" className="border-b-0">
            <AccordionTrigger className={cn(
              "text-base font-semibold hover:no-underline",
              "p-4 rounded-md bg-muted/60 hover:bg-muted/80 transition-colors w-full flex justify-between items-center"
            )}>
              Optionale Angaben (aufklappen)
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              {/* --- ANPASSUNG: Initialer Aufruf mit leerem Pfad --- */}
              {renderSemanticFields(semanticDataInfo, true, '')} {/* <-- Leerer Pfad hinzugefügt */}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
