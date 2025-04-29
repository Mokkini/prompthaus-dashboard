// components/DynamicFormRenderer.js - KORRIGIERT (Props-Weitergabe in Rekursion)

"use client";

import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

// Hilfsfunktion zum Formatieren (unverändert)
const formatPlaceholderName = (name) => {
  if (typeof name !== 'string') return '';
  return name.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
};

// Hilfsfunktion renderSingleField (unverändert, nimmt Props entgegen)
const renderSingleField = (key, item, stateKey, isRequiredMarker, placeholderValues, handleInputChange, loading, isRefining, getNestedValue) => {
    if (!item || typeof item !== 'object') {
        console.warn("Ungültiges Item in renderSingleField gefunden:", key, item);
        return null;
    }
    const { type, label: itemLabel, placeholder: itemPlaceholder, description: itemDescription, unit, constraints, options } = item;

    const label = itemLabel || formatPlaceholderName(key);
    const placeholder = itemPlaceholder || '';

    // --- KORREKTUR: Sicherstellen, dass getNestedValue aufgerufen wird ---
    const currentValue = getNestedValue(placeholderValues, stateKey);
    // --- ENDE KORREKTUR ---

    switch (type) {
      case 'select':
        const selectOptions = Array.isArray(options) ? options : [];
        return (
          <div key={stateKey} className="space-y-1.5">
            <Label htmlFor={stateKey}>{label} {isRequiredMarker ? '*' : ''}</Label>
            <select
              id={stateKey}
              name={stateKey}
              value={currentValue || ''} // Verwende currentValue
              onChange={e => handleInputChange(stateKey, e.target.value)}
              disabled={loading || isRefining}
              className="block w-full px-3 py-2 border border-input bg-background rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring sm:text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="" disabled>
                {placeholder || 'Bitte wählen...'}
              </option>
              {selectOptions.map((optionObj) => (
                <option
                  key={optionObj.key || optionObj.value}
                  value={optionObj.value}
                >
                  {optionObj.label}
                </option>
              ))}
            </select>
            {itemDescription && <p className="text-xs text-muted-foreground">{itemDescription}</p>}
            {constraints && <p className="text-xs text-muted-foreground italic">Hinweis: {constraints.join(' ')}</p>}
          </div>
        );
      case 'textarea':
        return (
          <div key={stateKey} className="space-y-1.5">
            <Label htmlFor={stateKey}>{label} {isRequiredMarker ? '*' : ''}</Label>
            <Textarea
              id={stateKey}
              value={currentValue || ''} // Verwende currentValue
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
              checked={!!currentValue} // Verwende currentValue
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
              value={currentValue || ''} // Verwende currentValue
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
               value={currentValue || ''} // Verwende currentValue
               onChange={e => handleInputChange(stateKey, e.target.value)}
               placeholder={placeholder || 'JJJJ-MM-TT'}
               disabled={loading || isRefining}
             />
             {itemDescription && <p className="text-xs text-muted-foreground">{itemDescription}</p>}
             {constraints && <p className="text-xs text-muted-foreground italic">Hinweis: {constraints.join(' ')}</p>}
           </div>
         );
      case 'string':
      case 'text':
      default:
        return (
          <div key={stateKey} className="space-y-1.5">
            <Label htmlFor={stateKey}>{label} {isRequiredMarker ? '*' : ''}</Label>
            <Input
              id={stateKey}
              type="text"
              value={currentValue || ''} // Verwende currentValue
              onChange={e => handleInputChange(stateKey, e.target.value)}
              placeholder={placeholder}
              disabled={loading || isRefining}
            />
            {itemDescription && <p className="text-xs text-muted-foreground">{itemDescription}</p>}
            {constraints && <p className="text-xs text-muted-foreground italic">Hinweis: {constraints.join(' ')}</p>}
          </div>
        );
    }
};

// --- KORREKTUR: renderSemanticFields nimmt jetzt die Props als Argumente ---
const renderSemanticFields = (
    data,
    isOptionalSection = false,
    currentPath = '',
    // Props als Argumente
    placeholderValues,
    handleInputChange,
    loading,
    isRefining,
    getNestedValue
) => {
   if (!data || typeof data !== 'object') {
       console.warn(`renderSemanticFields called with invalid data type: ${typeof data}`);
       return [];
   }

   const renderedElements = [];

   // Hauptinhalt zuerst
   const hauptinhaltKey = 'hauptinhalt';
   const hauptinhaltItem = data[hauptinhaltKey];
   if (hauptinhaltItem && typeof hauptinhaltItem === 'object') {
        const hauptinhaltStateKey = currentPath ? `${currentPath}.${hauptinhaltKey}` : hauptinhaltKey;
         const hauptinhaltIsOptional = hauptinhaltItem.optional === true;
         const hauptinhaltIsRequiredMarker = hauptinhaltItem.required === true && !isOptionalSection;

         if ((isOptionalSection && hauptinhaltIsOptional) || (!isOptionalSection && !hauptinhaltIsOptional)) {
             const renderedHauptinhalt = renderSingleField(
                 hauptinhaltKey,
                 hauptinhaltItem,
                 hauptinhaltStateKey,
                 hauptinhaltIsRequiredMarker,
                 // Props weitergeben
                 placeholderValues,
                 handleInputChange,
                 loading,
                 isRefining,
                 getNestedValue
             );
             if (renderedHauptinhalt) {
                 renderedElements.push(renderedHauptinhalt);
             }
         }
   }

   // Restliche Felder
   Object.entries(data)
    .filter(([key]) => key !== hauptinhaltKey)
    .forEach(([key, item]) => {
        if (!item || typeof item !== 'object') {
            console.warn("Ungültiges Item in renderSemanticFields gefunden:", key, item);
            return;
        }
        const stateKey = currentPath ? `${currentPath}.${key}` : key;
        const { optional, fields, required } = item;
        const isRequiredMarker = required === true && !isOptionalSection;

        if ((isOptionalSection && optional !== true) || (!isOptionalSection && optional === true)) {
          return;
        }

        // Prüfung auf verschachtelte Felder ZUERST
        if (fields && typeof fields === 'object' && Object.keys(fields).length > 0) {
            // --- KORREKTUR: Props beim rekursiven Aufruf weitergeben ---
            const renderedNestedFields = renderSemanticFields(
                fields,
                isOptionalSection,
                stateKey,
                // Props weitergeben
                placeholderValues,
                handleInputChange,
                loading,
                isRefining,
                getNestedValue
            );
            // --- ENDE KORREKTUR ---
            if (renderedNestedFields.some(field => field !== null)) {
                const nestedGroup = (
                    <div key={stateKey} className="space-y-4 border p-4 rounded-md mb-4 bg-muted/30">
                      <h4 className="font-medium text-sm text-muted-foreground">{item.description || formatPlaceholderName(key)} {isRequiredMarker ? '*' : ''}</h4>
                      {renderedNestedFields}
                    </div>
                );
                renderedElements.push(nestedGroup);
            }
            return;
        }

        // Fallback: Einzelnes Feld rendern
        const renderedField = renderSingleField(
            key,
            item,
            stateKey,
            isRequiredMarker,
            // Props weitergeben
            placeholderValues,
            handleInputChange,
            loading,
            isRefining,
            getNestedValue
        );
        if (renderedField) {
            renderedElements.push(renderedField);
        }
    });

    return renderedElements;
};
// --- ENDE KORREKTUR ---


// Die Komponente (unverändert, ruft renderSemanticFields korrekt auf)
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

  const safeSemanticDataInfo = semanticDataInfo || {};
  const hasOptionalFields = Object.values(safeSemanticDataInfo).some(item => item?.optional === true);

  // Ruft renderSemanticFields mit allen Props auf
  const requiredFieldsRendered = renderSemanticFields(
      safeSemanticDataInfo, false, '',
      placeholderValues, handleInputChange, loading, isRefining, getNestedValue
  );
  const optionalFieldsRendered = renderSemanticFields(
      safeSemanticDataInfo, true, '',
      placeholderValues, handleInputChange, loading, isRefining, getNestedValue
  );

  return (
    <div className="space-y-6">
      {Object.keys(safeSemanticDataInfo).length > 0 ? (
        <div>
          <h3 className="text-base font-semibold mb-3">So wird dein Text besonders …</h3>
          <div className="grid grid-cols-1 gap-4 mt-6">
            {requiredFieldsRendered}
          </div>
          {requiredFieldsRendered.length === 0 && !hasOptionalFields && (
            <p className="text-sm text-muted-foreground mt-4">
              <em>Für diese Variante sind keine spezifischen Angaben erforderlich.</em>
            </p>
          )}
        </div>
      ) : (
        !loading && <p className="text-sm text-muted-foreground">Keine Eingabefelder für diese Variante definiert.</p>
      )}

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
              Noch persönlicher machen? (aufklappen)
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              {optionalFieldsRendered}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </div>
  );
}
