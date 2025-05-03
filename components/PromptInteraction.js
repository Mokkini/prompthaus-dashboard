// components/PromptInteraction.js - REFAKTORED: Neues Layout, dynamische Gruppen, Sticky Output

"use client";

import React, { useMemo, useRef } from 'react'; // useMemo hinzugefügt
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Behalten für Refine Input
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
// Textarea wird nicht mehr direkt für die Ausgabe verwendet, aber vielleicht noch für Eingaben? Behalten wir es mal.
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2, AlertCircle, Copy, Check, Share2, MessageSquare, Linkedin, Facebook, RefreshCw, Info,
  Mail, MailCheck, MailX,
  Download,
  Wand2,
  TextCursorInput,
  // --- NEUE IMPORTE ---
  ChevronDown, // Für Accordion
  // --- ENDE NEUE IMPORTE ---
  Scissors,
  Sparkles,
  Smile, Briefcase, FileText, // Icons für neue Buttons
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"; // Accordion importieren
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"; // Select importieren
import { usePromptInteraction } from '@/components/hooks/usePromptInteraction'; // Pfad prüfen!
// DynamicFormRenderer wird nicht mehr benötigt
// import { DynamicFormRenderer } from '@/components/DynamicFormRenderer';

const placeholderRegex = /(\[.*?\])/g; // Sucht nach [beliebiger Text]

function parseTextWithPlaceholders(text) {
  if (!text) return []; // Leeres Array zurückgeben, wenn kein Text vorhanden ist
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = placeholderRegex.exec(text)) !== null) {
    // Text vor dem Platzhalter hinzufügen
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    // Platzhalter hinzufügen (match[0] ist der ganze Platzhalter, z.B. "{*Ihr Name*}")
    parts.push({ type: 'placeholder', content: match[0] });
    lastIndex = match.index + match[0].length;
  }

  // Restlichen Text nach dem letzten Platzhalter hinzufügen
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }

  return parts;
}
// --- ENDE NEU ---

// --- Definition der Text-Aktionen (unverändert) ---
const textActionButtons = [
  { id: 'rephrase', label: 'Umformulieren', icon: TextCursorInput },
  { id: 'shorten', label: 'Kürzen', icon: Scissors },
];

export default function PromptInteraction({ promptData, slug }) {

  // Hook-Aufruf (unverändert)
  const {
    // States
    // semanticDataInfo, // Entfernt im Hook
    placeholderValues, /* selectedTone, */ generatedText, loading, errorMsg, // selectedTone entfernt
    isCopied, canShare, showRefineInput, additionalInfo, isRefining, /* filteredTones, */ // filteredTones entfernt
    /* showToneSuggestions, toneInputRef, */ showEmailDialog, recipientEmail, isSendingEmail, // showToneSuggestions, toneInputRef entfernt
    sendEmailError, sendEmailSuccess, /* accordionValue, */ isDownloadingDocx, docxError, // accordionValue entfernt
    /* selectedStyleTags, */ selectedTextData, showTextActions, textOutputRef, // selectedStyleTags entfernt, textOutputRef wird jetzt für das div verwendet
    isModifyingSelection, activeQuickTone, accordionValue, // activeQuickTone & accordionValue hinzugefügt

    // Setters & Handlers
    handleInputChange, /* handleToneInputChange, handleToneSuggestionClick, handleStyleTagClick, */ // Tone/Style Handlers entfernt
    handleCopy, handleWebShare, handleInitialGenerate, handleRephrase, handleToggleRefineInput,
    groupedSemanticData, // <-- HIER groupedSemanticData hinzufügen
    handleRefine, handleQuickToneChange, /* handleGetToThePoint, */ setShowEmailDialog, setRecipientEmail, handleSendEmail, // handleQuickToneChange hinzugefügt
    /* setAccordionValue, */ handleDownloadDocx, /* getNestedValue, */ toneSuggestions, setAdditionalInfo, // setAccordionValue, getNestedValue entfernt
    /* setShowToneSuggestions, */ handleTextSelection, // setShowToneSuggestions entfernt
    handleTextAction, setAccordionValue, // setAccordionValue hinzugefügt
    handlePopoverOpenChange, isBusy, // isBusy hinzugefügt
  } = usePromptInteraction(promptData, slug);

  // --- DEBUGGING ---
  console.log("PromptInteraction Render - activeQuickTone:", activeQuickTone, "isBusy:", isBusy, "handleQuickToneChange type:", typeof handleQuickToneChange);
  // --- END DEBUGGING ---

  // Kombinierter Ladezustand für Deaktivierung
  // const isBusy = loading || isRefining || isDownloadingDocx || isModifyingSelection; // Wird jetzt vom Hook geliefert

  // --- NEU: Parsen des generierten Textes ---
  const parsedGeneratedText = parseTextWithPlaceholders(generatedText);
  // --- ENDE NEU ---

  // --- ENTFERNT: Redundanter useMemo-Block für groupedSemanticData ---
  // Die Variable groupedSemanticData kommt jetzt direkt aus dem usePromptInteraction Hook

  // --- NEU: Render-Funktion für ein einzelnes Feld ---
    // --- KORREKTUR: renderField benötigt isBusy nicht mehr als direktes Argument ---
    const renderField = (fieldData, isBusy) => {
    const { key, type, label, placeholder, optional, options, default: defaultValue, description } = fieldData;
    const stateKey = key; // Flache Struktur in placeholderValues
    const currentValue = placeholderValues[stateKey] ?? defaultValue ?? '';
    const isRequired = optional === false;

    switch (type) {
      case 'textarea':
        return (
          <div key={stateKey} className="space-y-1.5">
            <Label htmlFor={stateKey}>{label} {isRequired && <span className="text-destructive">*</span>}</Label>
            <Textarea
              id={stateKey}
              name={stateKey}
              value={currentValue}
              onChange={(e) => handleInputChange(stateKey, e.target.value)}
              placeholder={placeholder}
              disabled={isBusy}
              required={isRequired}
              rows={4} // Standardmäßig 4 Zeilen
            />
            {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
          </div>
        );
      case 'select':
        const selectOptions = Array.isArray(options) ? options : [];
        return (
          <div key={stateKey} className="space-y-1.5">
            <Label htmlFor={stateKey}>{label} {isRequired && <span className="text-destructive">*</span>}</Label>
            <Select
              value={currentValue}
              onValueChange={(value) => handleInputChange(stateKey, value)}
              disabled={isBusy}
              required={isRequired}
              name={stateKey}
            >
              <SelectTrigger id={stateKey} className="w-full">
                <SelectValue placeholder={placeholder || 'Bitte wählen...'} />
              </SelectTrigger>
              <SelectContent>
                {/* --- ENTFERNT: SelectItem mit value="" ist nicht erlaubt --- */}
                {/* {!isRequired && !placeholder && <SelectItem value="">Keine Auswahl</SelectItem>} */}
                {/* {placeholder && <SelectItem value="" disabled>{placeholder}</SelectItem>} */} {/* <-- DIESE ZEILE ENTFERNT */}
                {selectOptions.map((option) => (
                  <SelectItem key={option.key || option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
          </div>
        );
      // Füge hier bei Bedarf weitere Typen hinzu (number, date, boolean etc.)
      case 'text':
      default:
        return (
          <div key={stateKey} className="space-y-1.5">
            <Label htmlFor={stateKey}>{label} {isRequired && <span className="text-destructive">*</span>}</Label>
            <Input
              id={stateKey}
              name={stateKey}
              type="text"
              value={currentValue}
              onChange={(e) => handleInputChange(stateKey, e.target.value)}
              placeholder={placeholder}
              disabled={isBusy}
              required={isRequired}
            />
            {description && <p className="text-xs text-muted-foreground pt-1">{description}</p>}
          </div>
        );
    }
  };
  // --- ENDE NEU: Render-Funktion ---

  return (
    // --- Äußerer Wrapper bleibt ---
    <div className="w-full space-y-8">
      {/* Haupt-Grid */}
      {promptData ? (
          // --- ANGEPASST: Grid-Layout mit spezifischen Breiten ---
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,_1fr)_minmax(0,_0.66fr)] gap-6 md:gap-8"> {/* 60% / 40% */}

            {/* --- Linke Spalte: Eingabeformular (dynamisch gerendert) --- */}
            {/* --- KORREKTUR: Iteriere über das sortierte Array groupedSemanticData --- */}
            <div className="flex flex-col space-y-4">
              {/* --- KORREKTUR: Direkt über das Array iterieren, nicht Object.entries verwenden --- */}
              {groupedSemanticData.map(([groupName, groupData]) => (
                groupData.isCollapsible ? (
                  // --- Einklappbare Gruppe (Accordion) ---
                  <Accordion
                    key={groupName}
                    type="single"
                    collapsible
                    value={accordionValue} // <-- WIEDER HINZUGEFÜGT
                    onValueChange={setAccordionValue} // <-- WIEDER HINZUGEFÜGT
                    className="w-full border rounded-lg shadow-sm bg-card">
                    <AccordionItem value={groupName} className="border-b-0">
                      <AccordionTrigger className="px-4 py-3 text-base font-semibold hover:no-underline bg-muted/60 hover:bg-muted/80 rounded-t-lg">
                        <span className="flex items-center">{groupData.icon && <groupData.icon className="mr-2 h-4 w-4" />} {groupName}</span>
                      </AccordionTrigger>
                      <AccordionContent className="p-4 pt-2 space-y-4 bg-card rounded-b-lg">
                        {/* --- KORREKTUR: Übergebe isBusy an renderField --- */}
                        {groupData.fields.map(field => renderField(field, isBusy))}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ) : (
                  // --- Normale Gruppe (Card) ---
                  <Card key={groupName} className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">{groupName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* --- KORREKTUR: Übergebe isBusy an renderField --- */}
                      {groupData.fields.map(field => renderField(field, isBusy))}
                    </CardContent>
                  </Card>
                )
              // --- ENDE KORREKTUR ---
              ))}

              {/* --- Datenschutzhinweis --- */}
              <p className="text-xs text-muted-foreground px-1 pt-2">
                 Hinweis: Deine Angaben werden im Text als Platzhalter dargestellt (z. B. [Ihr Name], [Datum], [Wohnanschrift]). Du ergänzt sie später manuell – 100 % datenschutzkonform.
              </p>

              {/* --- Primärer Aktionsbutton --- */}
              <div className="pt-4">
                 <Button
                   onClick={handleInitialGenerate}
                   disabled={isBusy}
                   className="w-full"
                   size="lg" // Größerer Button
                 >
                   {(loading && !isRefining && !isModifyingSelection) && (
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   )}
                   {(loading && !isRefining && !isModifyingSelection) ? 'Generiere...' : 'Text generieren'}
                 </Button>
              </div>
            </div>
            {/* --- Ende Linke Spalte --- */}

            {/* --- Rechte Spalte: Ausgabe (Sticky) --- */}
            {/* Sticky Container: Hält die Card */}
            <div className="relative lg:sticky lg:top-4 h-fit"> {/* Sticky ab lg, top-4 für Abstand */}
              <Card className="flex flex-col shadow-sm max-h-[calc(100vh-4rem)]"> {/* max-height für Scroll */}
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Dein Text</CardTitle> {/* Vereinfachter Titel */}
                  {/* Aktionen: Kopieren, Download */}
                  <div className="flex items-center gap-1">
                      {generatedText && !isBusy && (
                          <div className="flex items-center gap-1">
                              <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={handleDownloadDocx}
                                  disabled={isBusy}
                                  title="Als DOCX herunterladen"
                              >
                                  {isDownloadingDocx ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                      <Download className="h-4 w-4" />
                                  )}
                                  <span className="sr-only">Als DOCX herunterladen</span>
                              </Button>
                              <span className="text-xs text-muted-foreground cursor-default select-none">
                                  Download
                              </span>
                          </div>
                      )}
                      {generatedText && !isBusy && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleCopy}
                          disabled={isBusy}
                          title="Kopieren"
                        >
                          {isCopied ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          <span className="sr-only">In Zwischenablage kopieren</span>
                        </Button>
                      )}
                  </div>
                </div>
              </CardHeader>
              <CardContent
                className="flex-grow flex flex-col relative overflow-y-auto" // Scrollbar machen
                // style={{ maxHeight: 'calc(100vh - 18rem)' }} // Beispielhafte max-height, anpassen!
              >
                {docxError && (
                  <Alert variant="destructive" className="mb-4 flex-shrink-0"> {/* flex-shrink-0 */}
                     <AlertCircle className="h-4 w-4" />
                     <AlertTitle>Download Fehler</AlertTitle>
                     <AlertDescription>{docxError}</AlertDescription>
                  </Alert>
                )}
                {errorMsg && (
                  <Alert variant="destructive" className="mb-4">
                     <AlertCircle className="h-4 w-4 flex-shrink-0" /> {/* flex-shrink-0 */}
                     <AlertTitle>Fehler</AlertTitle>
                     <AlertDescription>{errorMsg}</AlertDescription>
                  </Alert>
                )}

                {/* --- NEU: Ausgabe-Bereich als div --- */}
                {(generatedText || isRefining || isModifyingSelection) && !loading ? (
                   <div
                     ref={textOutputRef} // Ref auf das div setzen
                     onMouseUp={(event) => handleTextSelection(event)} // Event-Handler auf das div
                     className={cn(
                         "flex-grow min-h-[200px] bg-muted/30 text-sm whitespace-pre-wrap break-words overflow-x-hidden cursor-text", // overflow-x-hidden hinzugefügt
                         "p-3 rounded-md border border-input", // Styling ähnlich wie Textarea
                         (isRefining || isModifyingSelection) && "opacity-70 italic"
                     )}
                     style={{ lineHeight: '1.6' }} // Bessere Lesbarkeit
                     // Höhe dynamisch anpassen (optional, kann komplex werden, min-height ist oft ausreichend)
                     // style={{ minHeight: '250px' }} // Alternative zu Tailwind-Klasse
                     aria-live="polite" // Für Screenreader, wenn sich der Inhalt ändert
                   >
                     {isRefining ? (
                       'Wird überarbeitet...'
                     ) : isModifyingSelection ? (
                       'Abschnitt wird angepasst...'
                     ) : (
                       // Rendere die geparsten Teile
                       parsedGeneratedText.map((part, index) =>
                         part.type === 'placeholder' ? (
                           <span key={index} className="placeholder"> {/* CSS-Klasse für Styling (grau/kursiv) */}
                             {part.content}
                           </span>
                         ) : (
                           // Verwende React.Fragment, um unnötige Spans zu vermeiden, wenn kein Platzhalter
                           <React.Fragment key={index}>{part.content}</React.Fragment>
                         )
                       )
                     )}
                   </div>
                 ) : !errorMsg && !loading && !docxError ? (
                   <div className="p-4 bg-muted/50 rounded-md border border-dashed text-sm text-muted-foreground min-h-[200px] flex items-center justify-center flex-grow">
                     <em>(Hier erscheint dein Text...)</em>
                   </div>
                 ) : null}
                 {loading && !isRefining && !isModifyingSelection && (
                   <div className="p-4 bg-muted/50 rounded-md border border-dashed text-sm text-muted-foreground min-h-[200px] flex items-center justify-center flex-grow">
                     <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                     <span>Generiere Text...</span>
                   </div>
                 )}
                 {/* --- ENDE NEU: Ausgabe-Bereich als div --- */}


                {/* Popover für Textaktionen (unverändert, sollte weiterhin funktionieren, da textOutputRef jetzt auf das div zeigt) */}
                {selectedTextData.clientX != null && selectedTextData.clientY != null && (
                  <Popover open={showTextActions} onOpenChange={handlePopoverOpenChange}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-auto p-1.5 shadow-lg absolute z-20" // Positionierung über Style-Prop
                        // Positionierung relativ zum scrollbaren Content-Bereich
                        style={{
                          top: `${selectedTextData.clientY - (textOutputRef.current?.getBoundingClientRect().top ?? 0) - 35}px`, // Offset anpassen
                          left: `${selectedTextData.clientX - (textOutputRef.current?.getBoundingClientRect().left ?? 0)}px`,
                          transform: 'translateX(-50%)',
                          maxWidth: 'calc(100% - 20px)',
                        }}
                        disabled={isModifyingSelection}
                      >
                        <span> {/* <-- NEUES Wrapper-Span */}
                        {isModifyingSelection ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4" />
                        )}
                        <span className="sr-only">Text bearbeiten</span>
                        </span> {/* <-- Ende Wrapper-Span (HIERHER verschoben) */}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      side="top" align="center" sideOffset={5}
                      className="w-auto p-1 bg-background border shadow-md rounded-md z-30"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                      onCloseAutoFocus={(e) => e.preventDefault()}
                    >
                      <div className="flex items-center gap-1">
                        {textActionButtons.map((action) => (
                          <Button
                            key={action.id}
                            variant="ghost"
                            size="sm"
                            className="h-auto px-2 py-1 text-xs"
                            onClick={() => handleTextAction(action.id)}
                            disabled={isModifyingSelection}
                            title={action.label}
                          >
                            {isModifyingSelection ? (
                               <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                               <action.icon className="h-3.5 w-3.5 mr-1" />
                            )}
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

              </CardContent>

              {/* Footer für sekundäre Aktionen */}
              {generatedText && !loading && (
                <CardFooter className="flex flex-col items-start gap-4 pt-4 border-t">
                   {/* --- Bereich für Rephrase/Refine Buttons --- */}
                   <div className="flex flex-col sm:flex-row gap-2 w-full"> {/* Stack auf Mobile, Row auf SM+ */}
                      <Button // <-- Variante wird hier geändert
                        variant="outline" // <-- JETZT auf outline geändert
                        size="sm"
                        onClick={handleRephrase}
                        disabled={isBusy}
                        className="flex-1 flex items-center justify-center" // Nimmt verfügbaren Platz
                      >
                        {isRefining && !isModifyingSelection ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        {isRefining && !isModifyingSelection ? 'Wird neu formuliert...' : 'Neu formulieren'}
                      </Button>
                      <Button
                        variant="outline" // Bleibt outline
                        size="sm"
                        onClick={handleToggleRefineInput}
                        disabled={isBusy}
                        className="flex-1 flex items-center justify-center" // Nimmt verfügbaren Platz
                      >
                        <Info className="mr-2 h-4 w-4" />
                        {showRefineInput ? 'Anweisungen ausblenden' : 'Weitere Anweisungen geben'}
                      </Button>
                   </div>

                   {/* --- NEU: Schnelle Tonalitäts-Buttons --- */}
                   <div className="w-full space-y-2 pt-3">
                     <Label className="text-xs font-medium text-muted-foreground">Passe deinen Stil schnell und unkompliziert an:</Label>
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                       {/* Button Locker */}
                       <Button
                         variant={activeQuickTone === 'locker' ? 'secondary' : 'outline'} // <-- Dynamisches Variant
                         size="sm"
                         onClick={() => {
                           console.log("Locker button clicked!"); // <-- DIREKTER LOG
                           handleQuickToneChange('locker', 'Formuliere den Text lockerer.');
                         }}
                         disabled={isBusy}
                       >
                         <Smile className="mr-1.5 h-3.5 w-3.5" /> Locker
                       </Button>
                       {/* Button Formell */}
                       <Button
                         variant={activeQuickTone === 'formell' ? 'secondary' : 'outline'} // <-- Dynamisches Variant
                         size="sm"
                         onClick={() => {
                            console.log("Formell button clicked!"); // <-- DIREKTER LOG
                            handleQuickToneChange('formell', 'Formuliere den Text formeller.');
                         }}
                         disabled={isBusy}
                       >
                         <Briefcase className="mr-1.5 h-3.5 w-3.5" /> Formell
                       </Button>
                       {/* Button Sachlich */}
                       <Button
                         variant={activeQuickTone === 'sachlich' ? 'secondary' : 'outline'} // <-- Dynamisches Variant
                         size="sm"
                         onClick={() => {
                            console.log("Sachlich button clicked!"); // <-- DIREKTER LOG
                            handleQuickToneChange('sachlich', 'Formuliere den Text sachlicher.');
                         }}
                         disabled={isBusy}
                       >
                         <FileText className="mr-1.5 h-3.5 w-3.5" /> Sachlich
                       </Button>
                       {/* Button Kurz */}
                       <Button
                         variant={activeQuickTone === 'kurz' ? 'secondary' : 'outline'} // <-- Dynamisches Variant
                         size="sm"
                         onClick={() => {
                            console.log("Kurz button clicked!"); // <-- DIREKTER LOG
                            handleQuickToneChange('kurz', 'Kürze den Text deutlich.');
                         }}
                         disabled={isBusy}
                       >
                         <Scissors className="mr-1.5 h-3.5 w-3.5" /> Kurz
                       </Button>
                     </div>
                   </div>
                   {/* --- ENDE NEU --- */}

                   {/* Bedingter Bereich für Zusatzinfos-Eingabe (unverändert) */}
                   {showRefineInput && (
                     <div className="w-full space-y-2 p-3 border rounded-md bg-muted/50 mt-2"> {/* mt-2 hinzugefügt */}
                       <Label htmlFor="additionalInfo" className="text-sm font-medium">Weitere Anweisungen:</Label>
                       <Textarea
                         id="additionalInfo"
                         value={additionalInfo}
                         onChange={(e) => setAdditionalInfo(e.target.value)}
                         placeholder="z.B. mach’s kürzer, füge eine Bitte hinzu, formuliere weicher, erwähne XY etc."
                         rows={3}
                         className="bg-background"
                         disabled={isBusy}
                       />
                       <Button size="sm" onClick={handleRefine} disabled={isBusy || !additionalInfo.trim()} className="mt-2 w-full"> {/* Volle Breite */}
                         {(isRefining && !isModifyingSelection) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                         Anwenden
                       </Button>
                     </div>
                   )}
                </CardFooter>
              )}
            </Card> {/* Ende Rechte Card */}
          </div> {/* Ende Sticky Container */}
          {/* --- Ende Rechte Spalte --- */}
        </div> // Ende Haupt-Grid
      ) : (
         <p className="text-muted-foreground p-4 text-center">
           Fehler: Prompt-Daten konnten nicht geladen werden.
         </p>
      )} {/* <-- KORREKTE Position der schließenden Klammer für den Ternary Operator */}
    </div> // Ende des äußeren Wrappers
  ); // <-- KORREKTE Position der schließenden Klammer für die return-Anweisung
}
