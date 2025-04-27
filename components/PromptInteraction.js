// components/PromptInteraction.js
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
  Zap // <-- NEUES ICON importieren
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose,
} from "@/components/ui/dialog";
import { usePromptInteraction } from '@/components/hooks/usePromptInteraction';
import { DynamicFormRenderer } from '@/components/DynamicFormRenderer';

export default function PromptInteraction({ variants, slug }) {
  // Den Hook aufrufen und ALLE benötigten Werte/Funktionen extrahieren
  const {
    // States
    selectedVariantId,
    semanticDataInfo,
    placeholderValues,
    selectedTone,
    generatedText,
    loading,
    errorMsg,
    isCopied,
    canShare,
    showRefineInput,
    additionalInfo,
    isRefining,
    filteredTones,
    showToneSuggestions,
    toneInputRef,
    showEmailDialog,
    recipientEmail,
    isSendingEmail,
    sendEmailError,
    sendEmailSuccess,
    accordionValue,
    isDownloadingDocx,
    docxError,

    // Computed Values
    currentVariant,
    generationVariants,

    // Setters & Handlers
    setSelectedVariantId,
    handleInputChange,
    handleToneInputChange,
    handleToneSuggestionClick,
    handleCopy,
    handleWebShare,
    handleInitialGenerate,
    handleRephrase,
    handleToggleRefineInput,
    handleRefine,
    // --- NEU: Handler extrahieren ---
    handleGetToThePoint,
    // --- ENDE NEU ---
    setShowEmailDialog,
    setRecipientEmail,
    handleSendEmail,
    setAccordionValue,
    handleDownloadDocx,
    getNestedValue,
    toneSuggestions,
    setAdditionalInfo,
  } = usePromptInteraction(variants, slug);


  return (
    <div className="w-full space-y-8">
      {/* Variantenauswahl */}
      {generationVariants.length > 1 && (
        <div>
          <div className="flex flex-wrap gap-3 justify-center px-2">
            {generationVariants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => setSelectedVariantId(variant.id)}
                disabled={loading || isRefining || isDownloadingDocx} // Auch während Download deaktivieren
                className={cn(
                  "w-full sm:w-[calc(50%-0.375rem)] md:w-[calc(33.33%-0.5rem)] lg:w-[calc(25%-0.5625rem)] xl:w-[calc(20%-0.6rem)]",
                  "p-4 border rounded-lg text-left transition-all duration-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  variant.id === selectedVariantId
                    ? "bg-primary/10 border-primary ring-2 ring-primary ring-offset-2 dark:bg-primary/20"
                    : "bg-card border-muted-foreground hover:border-muted-foreground/50",
                  (loading || isRefining || isDownloadingDocx) && "opacity-50 cursor-not-allowed"
                )}
              >
                <p className="font-medium text-sm">{variant.title || `Variante ${variant.id}`}</p>
                {variant.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {variant.description}
                  </p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Haupt-Grid */}
      {currentVariant ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 px-2">
          {/* Linke Spalte: Eingabe */}
          <Card className="border-input">
             <CardHeader>
               {currentVariant?.description && (
                 <CardDescription className="text-center">{currentVariant.description}</CardDescription>
               )}
             </CardHeader>
             <CardContent className="space-y-6">
               <DynamicFormRenderer
                 semanticDataInfo={semanticDataInfo}
                 placeholderValues={placeholderValues}
                 handleInputChange={handleInputChange}
                 loading={loading}
                 isRefining={isRefining}
                 getNestedValue={getNestedValue}
                 accordionValue={accordionValue}
                 setAccordionValue={setAccordionValue}
               />
             </CardContent>
             <CardFooter>
               <Button
                 onClick={handleInitialGenerate}
                 disabled={loading || isRefining || !selectedVariantId || isDownloadingDocx} // Auch während Download deaktivieren
                 className="w-full"
               >
                 {(loading && !isRefining) && (
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                 )}
                 {(loading && !isRefining) ? 'Generiere...' : 'Text generieren'}
               </Button>
             </CardFooter>
          </Card>

          {/* Rechte Spalte: Ausgabe */}
          <Card className="flex flex-col border-input">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Generierter Text</CardTitle>
                {/* --- Download-Button und Kopieren-Button --- */}
                <div className="flex items-center gap-1">
                    {generatedText && !loading && !isRefining && (
                        <div className="flex items-center gap-1"> {/* Gruppe für Button und Text */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleDownloadDocx}
                                disabled={isDownloadingDocx}
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
                    {generatedText && !loading && !isRefining && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopy}
                        disabled={isDownloadingDocx} // Auch während Download deaktivieren
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
                {/* --- Ende Download/Kopieren Buttons --- */}
              </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
              {/* --- DOCX Download Fehleranzeige --- */}
              {docxError && (
                <Alert variant="destructive" className="mb-4">
                   <AlertCircle className="h-4 w-4" />
                   <AlertTitle>Download Fehler</AlertTitle>
                   <AlertDescription>{docxError}</AlertDescription>
                </Alert>
              )}

              {/* Fehleranzeige für Generierung/Refine */}
              {errorMsg && (
                <Alert variant="destructive" className="mb-4">
                   <AlertCircle className="h-4 w-4" />
                   <AlertTitle>Fehler</AlertTitle>
                   <AlertDescription>{errorMsg}</AlertDescription>
                </Alert>
              )}

              {/* Textarea oder Platzhalter */}
              {(generatedText || isRefining) && !loading ? (
                 <Textarea
                   readOnly
                   value={isRefining ? 'Wird überarbeitet...' : generatedText}
                   className={cn(
                       "flex-grow min-h-[250px] bg-muted/30 text-sm whitespace-pre-wrap",
                       isRefining && "opacity-70 italic"
                   )}
                   rows={Math.max(10, (generatedText || '').split('\n').length + 2)}
                 />
               ) : !errorMsg && !loading && !docxError ? ( // Auch docxError berücksichtigen
                 <div className="p-4 bg-muted/50 rounded-md border border-dashed text-sm text-muted-foreground min-h-[250px] flex items-center justify-center flex-grow">
                   <em>(Generierter Text erscheint hier...)</em>
                 </div>
               ) : null}

               {/* Ladeanzeige für Generierung */}
               {loading && !isRefining && (
                 <div className="p-4 bg-muted/50 rounded-md border border-dashed text-sm text-muted-foreground min-h-[250px] flex items-center justify-center flex-grow">
                   <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                   <span>Generiere Text...</span>
                 </div>
               )}

            </CardContent>

            {/* Footer für Aktionen */}
            {generatedText && !loading && (
              <CardFooter className="flex flex-col items-start gap-4 pt-4 border-t">
                {/* Tonalitäts-Input */}
                 <div className="w-full space-y-2 p-3 border rounded-md bg-muted/50">
                   <Label htmlFor={`tone-${selectedVariantId}-adjust`}>Tonalität anpassen (optional):</Label>
                   <div className="relative" ref={toneInputRef}>
                     <Input
                       id={`tone-${selectedVariantId}-adjust`}
                       value={selectedTone}
                       onChange={handleToneInputChange}
                       onFocus={() => {
                         if (selectedTone.trim().length > 0 && filteredTones.length > 0) {
                            setShowToneSuggestions(true);
                         }
                       }}
                       placeholder="z.B. lockerer, formeller, witziger, kreativer..."
                       autoComplete="off"
                       disabled={isRefining || isDownloadingDocx} // Auch während Download deaktivieren
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
                    <p className="text-xs text-muted-foreground">
                      Gib hier einen Ton an, wenn du den generierten Text mit den Buttons unten anpassen möchtest.
                    </p>
                 </div>

                 {/* Bereich für Rephrase/Refine Buttons */}
                 <div className="flex flex-wrap gap-2 w-full">
                    <Button variant="secondary" size="sm" onClick={handleRephrase} disabled={isRefining || loading || isDownloadingDocx} className="flex items-center">
                      {isRefining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      {isRefining ? 'Formuliere neu...' : 'Neu formulieren'}
                    </Button>

                    {/* --- NEUER BUTTON --- */}
                    <Button variant="secondary" size="sm" onClick={handleGetToThePoint} disabled={isRefining || loading || isDownloadingDocx} className="flex items-center">
                      {isRefining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />} {/* Optional: Icon */}
                      {isRefining ? 'Wird angepasst...' : 'Auf den Punkt kommen'}
                    </Button>
                    {/* --- ENDE NEUER BUTTON --- */}

                    <Button variant="secondary" size="sm" onClick={handleToggleRefineInput} disabled={isRefining || loading || isDownloadingDocx} className="flex items-center">
                      <Info className="mr-2 h-4 w-4" />
                      {showRefineInput ? 'ausblenden' : 'Zusatzinfos'}
                    </Button>
                 </div>

                 {/* Bedingter Bereich für Zusatzinfos-Eingabe */}
                 {showRefineInput && (
                   <div className="w-full space-y-2 p-3 border rounded-md bg-muted/50">
                     <Label htmlFor="additionalInfo" className="text-sm font-medium">Zusätzliche Anweisungen oder Informationen:</Label>
                     <Textarea
                       id="additionalInfo"
                       value={additionalInfo}
                       onChange={(e) => setAdditionalInfo(e.target.value)}
                       placeholder="z.B. mach’s kürzer, füge eine Bitte hinzu, formuliere weicher, erwähne XY etc."
                       rows={3}
                       className="bg-background"
                       disabled={isRefining || isDownloadingDocx}
                     />
                     <Button size="sm" onClick={handleRefine} disabled={isRefining || isDownloadingDocx || !additionalInfo.trim()} className="mt-2">
                       {isRefining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                       Verfeinern
                     </Button>
                   </div>
                 )}


                {/* Bereich für Teilen-Buttons */}
                <div className="w-full pt-4 border-t">
                    <span className="text-sm font-medium block mb-2">Teilen via:</span>
                    <div className="flex flex-wrap gap-2">
                       {/* WhatsApp, LinkedIn, Facebook Buttons */}
                       <Button variant="outline" size="sm" asChild disabled={isDownloadingDocx}>
                         <a href={`whatsapp://send?text=${encodeURIComponent(generatedText)}`} data-action="share/whatsapp/share" target="_blank" rel="noopener noreferrer" className="flex items-center">
                           <MessageSquare className="h-4 w-4 mr-1" /> WhatsApp
                         </a>
                       </Button>
                       <Button variant="outline" size="sm" asChild disabled={isDownloadingDocx}>
                         <a href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&title=${encodeURIComponent(currentVariant?.title || 'Generierter Text')}&summary=${encodeURIComponent(generatedText)}`} target="_blank" rel="noopener noreferrer" className="flex items-center">
                            <Linkedin className="h-4 w-4 mr-1" /> LinkedIn
                         </a>
                       </Button>
                       <Button variant="outline" size="sm" asChild disabled={isDownloadingDocx}>
                          <a
                            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&quote=${encodeURIComponent(generatedText)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center"
                          >
                             <Facebook className="h-4 w-4 mr-1" /> Facebook
                          </a>
                        </Button>

                       {/* E-Mail Senden Button (Dialog) */}
                       <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
                         <DialogTrigger asChild>
                           <Button variant="outline" size="sm" className="flex items-center" disabled={isDownloadingDocx}>
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
                         <Button variant="outline" size="sm" onClick={handleWebShare} className="flex items-center" disabled={isDownloadingDocx}>
                           <Share2 className="h-4 w-4 mr-1" /> Mehr...
                         </Button>
                       )}
                    </div>
                </div>
              </CardFooter>
            )}
          </Card>
        </div>
      ) : (
         <p className="text-muted-foreground p-4 text-center">
           {generationVariants.length === 0
             ? "Keine Prompt-Varianten für dieses Paket gefunden."
             : "Bitte wähle eine Variante aus."}
         </p>
      )}
    </div>
  );
}
