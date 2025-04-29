// components/PromptInteraction.js - ANGEPASST: CardDescription komplett entfernt

"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Loader2, AlertCircle, Copy, Check, Share2, MessageSquare, Linkedin, Facebook, RefreshCw, Info,
  Mail, MailCheck, MailX, CheckCircle2,
  Download,
  // Zap, // Entfernt
  Wand2, // Icon für Trigger
  TextCursorInput, // Umformulieren
  Scissors,        // Kürzen
  Sparkles,        // Allgemein verbessern (oder spezifischer)
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
import { usePromptInteraction } from '@/components/hooks/usePromptInteraction'; // Pfad prüfen!
import { DynamicFormRenderer } from '@/components/DynamicFormRenderer'; // Pfad prüfen!

// --- Definition der initialen Style-Tags (unverändert) ---
const initialStyleTags = ["Locker", "Formell", "Herzlich", "Sachlich", "Empathisch"];

// --- Definition der Text-Aktionen (unverändert) ---
const textActionButtons = [
  { id: 'rephrase', label: 'Umformulieren', icon: TextCursorInput },
  { id: 'shorten', label: 'Kürzen', icon: Scissors },
];

export default function PromptInteraction({ promptData, slug }) {

  // Hook-Aufruf (unverändert)
  const {
    // States
    semanticDataInfo, placeholderValues, selectedTone, generatedText, loading, errorMsg,
    isCopied, canShare, showRefineInput, additionalInfo, isRefining, filteredTones,
    showToneSuggestions, toneInputRef, showEmailDialog, recipientEmail, isSendingEmail,
    sendEmailError, sendEmailSuccess, accordionValue, isDownloadingDocx, docxError,
    selectedStyleTags, selectedTextData, showTextActions, textOutputRef,
    isModifyingSelection,

    // Setters & Handlers
    handleInputChange, handleToneInputChange, handleToneSuggestionClick, handleStyleTagClick,
    handleCopy, handleWebShare, handleInitialGenerate, handleRephrase, handleToggleRefineInput,
    handleRefine, /* handleGetToThePoint, */ setShowEmailDialog, setRecipientEmail, handleSendEmail,
    setAccordionValue, handleDownloadDocx, getNestedValue, toneSuggestions, setAdditionalInfo,
    setShowToneSuggestions, handleTextSelection,
    handleTextAction,
    handlePopoverOpenChange,
  } = usePromptInteraction(promptData, slug);

  // Kombinierter Ladezustand für Deaktivierung
  const isBusy = loading || isRefining || isDownloadingDocx || isModifyingSelection;

  return (
    // --- Äußerer Wrapper bleibt ---
    <div className="w-full space-y-8">
      {/* Haupt-Grid */}
      {promptData ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 px-2">
            {/* Linke Spalte: Eingabe (ANGEPASST: CardDescription entfernt) */}
            <Card className="border-input">
               <CardHeader>
                 {/* --- CardDescription HIER KOMPLETT ENTFERNT --- */}
               </CardHeader>
               <CardContent className="space-y-6">
                 <DynamicFormRenderer
                   semanticDataInfo={semanticDataInfo}
                   placeholderValues={placeholderValues}
                   handleInputChange={handleInputChange}
                   loading={isBusy}
                   isRefining={isBusy}
                   getNestedValue={getNestedValue}
                   accordionValue={accordionValue}
                   setAccordionValue={setAccordionValue}
                 />
               </CardContent>
               <CardFooter>
                 <Button
                   onClick={handleInitialGenerate}
                   disabled={isBusy}
                   className="w-full" // Bleibt volle Breite
                 >
                   {(loading && !isRefining && !isModifyingSelection) && (
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                   )}
                   {(loading && !isRefining && !isModifyingSelection) ? 'Generiere...' : 'Text generieren'}
                 </Button>
               </CardFooter>
            </Card>

            {/* Rechte Spalte: Ausgabe (unverändert) */}
            <Card className="flex flex-col border-input">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Dein Textbereich</CardTitle>
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
                className="flex-grow flex flex-col relative"
              >
                {docxError && (
                  <Alert variant="destructive" className="mb-4">
                     <AlertCircle className="h-4 w-4" />
                     <AlertTitle>Download Fehler</AlertTitle>
                     <AlertDescription>{docxError}</AlertDescription>
                  </Alert>
                )}
                {errorMsg && (
                  <Alert variant="destructive" className="mb-4">
                     <AlertCircle className="h-4 w-4" />
                     <AlertTitle>Fehler</AlertTitle>
                     <AlertDescription>{errorMsg}</AlertDescription>
                  </Alert>
                )}

                {/* Textarea (unverändert) */}
                {(generatedText || isRefining || isModifyingSelection) && !loading ? (
                   <Textarea
                     ref={textOutputRef}
                     onMouseUp={(event) => handleTextSelection(event)}
                     readOnly
                     value={isRefining ? 'Wird überarbeitet...' : (isModifyingSelection ? 'Abschnitt wird angepasst...' : generatedText)}
                     className={cn(
                         "flex-grow min-h-[250px] bg-muted/30 text-sm whitespace-pre-wrap cursor-text",
                         (isRefining || isModifyingSelection) && "opacity-70 italic"
                     )}
                     rows={Math.max(10, (generatedText || '').split('\n').length + 2)}
                   />
                 ) : !errorMsg && !loading && !docxError ? (
                   <div className="p-4 bg-muted/50 rounded-md border border-dashed text-sm text-muted-foreground min-h-[250px] flex items-center justify-center flex-grow">
                     <em>(Hier erscheint dein Text...)</em>
                   </div>
                 ) : null}
                 {loading && !isRefining && !isModifyingSelection && (
                   <div className="p-4 bg-muted/50 rounded-md border border-dashed text-sm text-muted-foreground min-h-[250px] flex items-center justify-center flex-grow">
                     <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                     <span>Generiere Text...</span>
                   </div>
                 )}

                {/* Popover für Textaktionen (unverändert) */}
                {selectedTextData.clientX != null && selectedTextData.clientY != null && (
                  <Popover open={showTextActions} onOpenChange={handlePopoverOpenChange}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="default"
                        size="sm"
                        className="h-auto p-1.5 shadow-lg absolute z-20" // Positionierung über Style-Prop
                        style={{
                          top: `${selectedTextData.clientY - (textOutputRef.current?.closest('.relative')?.getBoundingClientRect().top ?? 0) - 35}px`,
                          left: `${selectedTextData.clientX - (textOutputRef.current?.closest('.relative')?.getBoundingClientRect().left ?? 0)}px`,
                          transform: 'translateX(-50%)',
                          maxWidth: 'calc(100% - 20px)',
                        }}
                        disabled={isModifyingSelection}
                      >
                        {isModifyingSelection ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4" />
                        )}
                        <span className="sr-only">Text bearbeiten</span>
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

              {/* Footer für Aktionen (unverändert) */}
              {generatedText && !loading && (
                <CardFooter className="flex flex-col items-start gap-4 pt-4 border-t">
                  {/* --- Tonalitäts-Input (unverändert) --- */}
                   <div className="w-full space-y-2 p-3 border rounded-md bg-muted/50">
                     <Label htmlFor={`tone-adjust-${slug}`} className="text-sm font-medium">
                       Stil wählen oder beschreiben:
                     </Label>
                     <div className="relative" ref={toneInputRef}>
                       <Input
                         id={`tone-adjust-${slug}`}
                         value={selectedTone}
                         onChange={handleToneInputChange}
                         onFocus={() => {
                           if (selectedTone.trim().length > 0 && filteredTones.length > 0) {
                              setShowToneSuggestions(true);
                           }
                         }}
                         placeholder="z.B. lockerer, formeller, witziger..."
                         aria-label="Eigenen Stil beschreiben" // Für Barrierefreiheit
                         autoComplete="off"
                         disabled={isBusy}
                       />
                       {showToneSuggestions && filteredTones.length > 0 && (
                         <Card className="absolute z-10 w-full mt-1 max-h-48 overflow-y-auto shadow-lg">
                           <CardContent className="p-2">
                             {filteredTones.map((tone) => (
                               <button
                                 key={tone}
                                 type="button"
                                 onMouseDown={(e) => { e.preventDefault(); handleToneSuggestionClick(tone); }}
                                 className="block w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-accent"
                               >
                                 {tone}
                               </button>
                             ))}
                           </CardContent>
                         </Card>
                       )}
                     </div>
                     {/* --- Style-Tag Buttons (unverändert) --- */}
                     <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pt-2"> {/* Grid auf Mobile, Flex auf SM+ */}
                       {initialStyleTags.map((tag) => {
                         const isSelected = selectedStyleTags.includes(tag);
                         return (
                           <Button
                             key={tag}
                             variant={isSelected ? "secondary" : "outline"}
                             size="sm"
                             onClick={() => handleStyleTagClick(tag)}
                             className={cn(
                               "transition-colors w-full sm:w-auto", // Volle Breite auf Mobile, Auto auf SM+
                               isSelected && "bg-primary/10 border-primary/50"
                             )}
                             disabled={isBusy}
                           >
                             {tag}
                           </Button>
                         );
                       })}
                     </div>
                      <p className="text-xs text-muted-foreground pt-1">
                        Wähle einen Stil aus oder beschreibe ihn oben. Klicke dann auf "Neu formulieren".
                      </p>
                   </div>
                   {/* --- ENDE Tonalitäts-Input Anpassung --- */}

                   {/* --- Bereich für Rephrase/Refine Buttons (unverändert) --- */}
                   <div className="flex flex-wrap gap-2 w-full">
                      <Button
                        variant="secondary" // <-- Primäraktion
                        size="sm"
                        onClick={handleRephrase}
                        disabled={isBusy}
                        className="flex items-center w-full sm:w-auto" // Volle Breite auf Mobile, Auto auf SM+
                      >
                        {isRefining && !isModifyingSelection ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        {isRefining && !isModifyingSelection ? 'Formuliere neu...' : 'Neu formulieren'}
                      </Button>
                      <Button
                        variant="outline" // Bleibt outline
                        size="sm"
                        onClick={handleToggleRefineInput}
                        disabled={isBusy}
                        className="flex items-center w-full sm:w-auto" // Volle Breite auf Mobile, Auto auf SM+
                      >
                        <Info className="mr-2 h-4 w-4" />
                        {showRefineInput ? 'Anweisungen ausblenden' : 'Weitere Anweisungen'}
                      </Button>
                   </div>

                   {/* Bedingter Bereich für Zusatzinfos-Eingabe (unverändert) */}
                   {showRefineInput && (
                     <div className="w-full space-y-2 p-3 border rounded-md bg-muted/50">
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
                       <Button size="sm" onClick={handleRefine} disabled={isBusy || !additionalInfo.trim()} className="mt-2 w-full sm:w-auto"> {/* Volle Breite auf Mobile */}
                         {(isRefining && !isModifyingSelection) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                         Verfeinern
                       </Button>
                     </div>
                   )}

                  {/* --- Sharing-Bereich (unverändert) --- */}
                  <div className="w-full pt-4 border-t">
                      <span className="text-sm font-medium block mb-2">Teilen via:</span>
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2"> {/* Grid auf Mobile, Flex auf SM+ */}
                         <Button variant="outline" size="sm" asChild disabled={isBusy} className="w-full sm:w-auto">
                           <a href={`whatsapp://send?text=${encodeURIComponent(generatedText)}`} data-action="share/whatsapp/share" target="_blank" rel="noopener noreferrer">
                             <span className="flex items-center justify-center sm:justify-start"> {/* Zentriert auf Mobile */}
                               <MessageSquare className="h-4 w-4 mr-1" /> WhatsApp
                             </span>
                           </a>
                         </Button>
                         <Button variant="outline" size="sm" asChild disabled={isBusy} className="w-full sm:w-auto">
                           <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&title=${encodeURIComponent(promptData?.name || 'Generierter Text')}&summary=${encodeURIComponent(generatedText)}`} target="_blank" rel="noopener noreferrer">
                             <span className="flex items-center justify-center sm:justify-start"> {/* Zentriert auf Mobile */}
                               <Linkedin className="h-4 w-4 mr-1" /> LinkedIn
                             </span>
                           </a>
                         </Button>
                         <Button variant="outline" size="sm" asChild disabled={isBusy} className="w-full sm:w-auto">
                            <a
                              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&quote=${encodeURIComponent(generatedText)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <span className="flex items-center justify-center sm:justify-start"> {/* Zentriert auf Mobile */}
                                <Facebook className="h-4 w-4 mr-1" /> Facebook
                              </span>
                            </a>
                          </Button>

                         {/* E-Mail Senden Button (Dialog Trigger) */}
                         <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
                           <DialogTrigger asChild>
                             <Button variant="outline" size="sm" className="flex items-center w-full sm:w-auto justify-center sm:justify-start" disabled={isBusy}> {/* Volle Breite & Zentriert auf Mobile */}
                               <Mail className="h-4 w-4 mr-1" /> E-Mail
                             </Button>
                           </DialogTrigger>
                           <DialogContent className="sm:max-w-[425px]">
                             <DialogHeader>
                               <DialogTitle>Text per E-Mail senden</DialogTitle>
                               <DialogDescription>
                                 Gib die E-Mail-Adresse des Empfängers ein.
                               </DialogDescription>
                             </DialogHeader>
                             <div className="grid gap-4 py-4">
                               <div className="grid grid-cols-4 items-center gap-4">
                                 <Label htmlFor="recipient-email" className="text-right">
                                   An
                                 </Label>
                                 <Input
                                   id="recipient-email"
                                   type="email"
                                   value={recipientEmail}
                                   onChange={(e) => setRecipientEmail(e.target.value)}
                                   placeholder="empfaenger@beispiel.com"
                                   className="col-span-3"
                                   disabled={isSendingEmail}
                                 />
                               </div>
                               {sendEmailError && (
                                 <Alert variant="destructive" className="col-span-4">
                                   <AlertCircle className="h-4 w-4" />
                                   <AlertTitle>Fehler</AlertTitle>
                                   <AlertDescription>{sendEmailError}</AlertDescription>
                                 </Alert>
                               )}
                               {sendEmailSuccess && (
                                 <Alert variant="default" className="col-span-4 border-green-500 text-green-700 dark:text-green-300 dark:border-green-700 [&>svg]:text-green-700">
                                   <MailCheck className="h-4 w-4" />
                                   <AlertTitle>Erfolg</AlertTitle>
                                   <AlertDescription>E-Mail erfolgreich gesendet!</AlertDescription>
                                 </Alert>
                               )}
                             </div>
                             <DialogFooter>
                               <DialogClose asChild>
                                  <Button type="button" variant="secondary" disabled={isSendingEmail}>
                                    Abbrechen
                                  </Button>
                               </DialogClose>
                               <Button type="button" onClick={handleSendEmail} disabled={isSendingEmail || !recipientEmail}>
                                 {isSendingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                 {isSendingEmail ? 'Sende...' : 'Senden'}
                               </Button>
                             </DialogFooter>
                           </DialogContent>
                         </Dialog>

                         {/* Web Share API Button */}
                         {canShare && (
                           <Button variant="outline" size="sm" onClick={handleWebShare} className="flex items-center w-full sm:w-auto justify-center sm:justify-start" disabled={isBusy}> {/* Volle Breite & Zentriert auf Mobile */}
                             <Share2 className="h-4 w-4 mr-1" /> Mehr...
                           </Button>
                         )}
                      </div>
                  </div>
                  {/* --- ENDE Sharing-Bereich --- */}

                </CardFooter>
              )}
            </Card>
          </div>

      ) : (
         <p className="text-muted-foreground p-4 text-center">
           Fehler: Prompt-Daten konnten nicht geladen werden.
         </p>
      )}
    </div> // Ende des äußeren Wrappers
  );
}
