// components/hooks/usePromptInteraction.js - ANGEPASST: Popover-Reset über onOpenChange & Mutually Exclusive Styles

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { generateText, refineText, refineSelection } from '@/app/(public)/prompt/actions';
import { saveAs } from 'file-saver';
import { Packer, Document, Paragraph, TextRun } from 'docx';
import { sendEmailApi } from '@/app/actions'; // Import für E-Mail

// Helper: Holt einen Wert aus einem verschachtelten Objekt anhand eines Pfades (z.B. 'user.address.street')
const getNestedValue = (obj, path) => {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Helper: Setzt einen Wert in einem verschachtelten Objekt anhand eines Pfades
const setNestedValue = (obj, path, value) => {
    if (!obj || !path) return obj;
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (current[key] === undefined || typeof current[key] !== 'object') {
            current[key] = {}; // Erstelle verschachtelte Objekte, falls sie nicht existieren
        }
        current = current[key];
    }
    current[keys[keys.length - 1]] = value;
    return obj;
};


// --- Hook usePromptInteraction ---
export function usePromptInteraction(promptData, slug) {
  // --- DEBUG LOG: Initial promptData ---
  // console.log('[usePromptInteraction] Hook gestartet. Empfangenes promptData:', promptData);
  // console.log('[usePromptInteraction] Hook gestartet. Empfangener slug:', slug);

  // --- Bestehende States ---
  const [placeholderValues, setPlaceholderValues] = useState({});
  const [selectedTone, setSelectedTone] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [showToneSuggestions, setShowToneSuggestions] = useState(false);
  const toneInputRef = useRef(null);
  const [accordionValue, setAccordionValue] = useState('');
  const [selectedStyleTags, setSelectedStyleTags] = useState([]);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendEmailError, setSendEmailError] = useState('');
  const [sendEmailSuccess, setSendEmailSuccess] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [docxError, setDocxError] = useState('');
  // --- State für Maus-Koordinaten ---
  const [selectedTextData, setSelectedTextData] = useState({ text: '', clientX: null, clientY: null });
  const [showTextActions, setShowTextActions] = useState(false);
  const textOutputRef = useRef(null); // Ref für die Textarea
  const [isModifyingSelection, setIsModifyingSelection] = useState(false);

  // --- DEBUG LOG: Initial States ---
  // console.log('[usePromptInteraction] Initiale Ladezustände:', { loading, isRefining, isDownloadingDocx, isModifyingSelection });

  // --- Semantic Data Info ---
  const semanticDataInfo = useMemo(() => {
    const data = promptData?.semantic_data || {};
    // --- DEBUG LOG: semanticDataInfo Berechnung ---
    // console.log('[usePromptInteraction] useMemo für semanticDataInfo berechnet:', data);
    return data;
  }, [promptData]);

  // --- Initialisierung und Reset ---
  const resetInteraction = useCallback(() => {
    // console.log('[usePromptInteraction] resetInteraction aufgerufen.');
    setPlaceholderValues({});
    setSelectedTone('');
    setGeneratedText('');
    setLoading(false);
    setErrorMsg('');
    setIsCopied(false);
    setShowRefineInput(false);
    setAdditionalInfo('');
    setIsRefining(false);
    setShowToneSuggestions(false);
    setAccordionValue('');
    setSelectedStyleTags([]);
    // Email Dialog States
    // setShowEmailDialog(false); // Dialog nicht automatisch schließen
    setRecipientEmail('');
    setIsSendingEmail(false);
    setSendEmailError('');
    setSendEmailSuccess(false);
    // Docx States
    setIsDownloadingDocx(false);
    setDocxError('');
    // Text Selection States
    setSelectedTextData({ text: '', clientX: null, clientY: null });
    setShowTextActions(false);
    setIsModifyingSelection(false);
  }, []);

  // Effekt für Initialisierung und Reset
  useEffect(() => {
    // --- DEBUG LOG: useEffect Start ---
    // console.log('[usePromptInteraction] useEffect für Initialisierung gestartet. promptData:', promptData);
    // console.log('[usePromptInteraction] useEffect: Rufe resetInteraction auf...');
    resetInteraction();

    if (promptData && semanticDataInfo && Object.keys(semanticDataInfo).length > 0) {
      // console.log('[usePromptInteraction] useEffect: Initialisiere placeholderValues basierend auf semanticDataInfo:', semanticDataInfo);
      const initialPlaceholders = {};
      Object.entries(semanticDataInfo).forEach(([key, item]) => {
        if (item && typeof item === 'object') {
           initialPlaceholders[key] = item.default || ''; // Nimm Default-Wert oder leer
        }
      });
      setPlaceholderValues(initialPlaceholders);
      // console.log('[usePromptInteraction] useEffect: Initialisierte placeholderValues:', initialPlaceholders);

      // Initialen Accordion-State setzen (nur öffnen, wenn optionale Felder existieren)
      const hasOptional = Object.values(semanticDataInfo).some(item => item?.optional === true);
      setAccordionValue(hasOptional ? '' : 'required-fields');
      // console.log('[usePromptInteraction] useEffect: Accordion initialisiert (hasOptional:', hasOptional, ')');

    } else {
      // console.log('[usePromptInteraction] useEffect: Keine promptData oder semanticDataInfo vorhanden, überspringe Initialisierung der Placeholder.');
      setPlaceholderValues({}); // Sicherstellen, dass es leer ist
    }

    // --- DEBUG LOG: useEffect Ende ---
    // console.log('[usePromptInteraction] useEffect für Initialisierung beendet.');

  }, [promptData, slug, resetInteraction, semanticDataInfo]); // semanticDataInfo hinzugefügt

  // --- Handler für Input-Änderungen ---
  const handleInputChange = useCallback((key, value) => {
    // console.log(`[usePromptInteraction] handleInputChange: key=${key}, value=${value}`);
    setPlaceholderValues(prev => {
      const newState = { ...prev };
      if (key.includes('.')) {
        return setNestedValue(newState, key, value);
      } else {
        newState[key] = value;
        return newState;
      }
    });
  }, []);

  // --- Handler für Tonalität (ANGEPASST) ---
  const handleToneInputChange = useCallback((e) => {
    const value = e.target.value;
    setSelectedTone(value);
    setShowToneSuggestions(value.trim().length > 0);
    // --- NEU: Wenn ins Textfeld getippt wird, Style-Tags zurücksetzen ---
    if (value.trim().length > 0 && selectedStyleTags.length > 0) {
      console.log("[handleToneInputChange] Text eingegeben, setze Style-Tags zurück.");
      setSelectedStyleTags([]);
    }
    // --- ENDE NEU ---
  }, [selectedStyleTags]); // selectedStyleTags als Abhängigkeit hinzugefügt

  const handleToneSuggestionClick = useCallback((tone) => {
    setSelectedTone(tone);
    setShowToneSuggestions(false);
    toneInputRef.current?.blur();
    // --- NEU: Auch bei Suggestion-Klick Style-Tags zurücksetzen ---
    if (selectedStyleTags.length > 0) {
        console.log("[handleToneSuggestionClick] Suggestion geklickt, setze Style-Tags zurück.");
        setSelectedStyleTags([]);
    }
    // --- ENDE NEU ---
  }, [selectedStyleTags]); // selectedStyleTags als Abhängigkeit hinzugefügt

  // --- Handler für Style-Tags (ANGEPASST) ---
  const handleStyleTagClick = useCallback((tag) => {
    setSelectedStyleTags(prev => {
        const isCurrentlySelected = prev.includes(tag);
        const newTags = isCurrentlySelected ? prev.filter(t => t !== tag) : [...prev, tag];

        // --- NEU: Wenn ein Tag (de-)selektiert wird, Textfeld leeren ---
        if (selectedTone.trim().length > 0) {
            console.log("[handleStyleTagClick] Tag geklickt, leere Textfeld.");
            setSelectedTone(''); // Textfeld leeren
            setShowToneSuggestions(false); // Auch Suggestions ausblenden
        }
        // --- ENDE NEU ---

        return newTags;
    });
  }, [selectedTone]); // selectedTone als Abhängigkeit hinzugefügt


  // --- Tonalitätsvorschläge ---
  const toneSuggestions = useMemo(() => {
    const langLevelOptions = semanticDataInfo?.language_level?.options;
    if (Array.isArray(langLevelOptions)) {
      return langLevelOptions.map(opt => opt.label).filter(Boolean);
    }
    return ["Locker", "Formell", "Herzlich", "Sachlich", "Empathisch"];
  }, [semanticDataInfo]);

  const filteredTones = useMemo(() => {
    if (!selectedTone || selectedTone.trim() === '') {
      return [];
    }
    const lowerCaseInput = selectedTone.toLowerCase();
    return toneSuggestions.filter(tone =>
      tone.toLowerCase().includes(lowerCaseInput) && tone.toLowerCase() !== lowerCaseInput
    );
  }, [selectedTone, toneSuggestions]);

  // --- Klick außerhalb schließen (Tone Suggestions) ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (toneInputRef.current && !toneInputRef.current.contains(event.target)) {
        setShowToneSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  // --- Handler für Textauswahl (Verwendet Maus-Koordinaten) ---
  const handleTextSelection = useCallback((event) => { // event als Parameter
    // console.log("[handleTextSelection] MouseUp-Event ausgelöst.");

    // --- Event-Ziel prüfen ---
    if (!event || !event.target) {
        console.error("[handleTextSelection] FEHLER: Kein Event-Objekt oder event.target verfügbar!");
        return;
    }
    // console.log("[handleTextSelection] Event Target:", event.target);
    // console.log("[handleTextSelection] Maus-Koordinaten (clientX, clientY):", event.clientX, event.clientY);
    // --- ENDE Event-Ziel prüfen ---

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    // console.log("[handleTextSelection] Rohauswahl:", selection?.toString());
    // console.log("[handleTextSelection] Getrimmter Text:", selectedText);

    // --- Prüfung, ob textOutputRef existiert ---
    if (!textOutputRef.current) {
        console.error("[handleTextSelection] FEHLER: textOutputRef.current ist nicht verfügbar!");
        return;
    }
    // --- ENDE Prüfung ---

    // --- Prüfung über event.target ---
    let isInTextarea = false;
    try {
        isInTextarea = textOutputRef.current.contains(event.target);
        // console.log("[handleTextSelection] Prüfe, ob event.target im Textarea-Ref:", isInTextarea);
    } catch (e) {
        console.error("[handleTextSelection] Fehler bei .contains Prüfung (event.target):", e);
        isInTextarea = false;
    }
    // --- ENDE Prüfung ---

    if (selectedText && isInTextarea) {
      // console.log("[handleTextSelection] Bedingungen erfüllt: Text vorhanden UND mouseup-Event im Textarea.");

      // --- Speichere Maus-Koordinaten ---
      setSelectedTextData({
          text: selectedText,
          clientX: event.clientX, // X-Koordinate des Mauszeigers relativ zum Viewport
          clientY: event.clientY  // Y-Koordinate des Mauszeigers relativ zum Viewport
      });
      setShowTextActions(true); // Popover anzeigen (wird durch onOpenChange gesteuert)
      // console.log("[handleTextSelection] States gesetzt: showTextActions=true, selectedTextData mit clientX/Y aktualisiert.");
      // --- ENDE ---

    } else if (!selectedText && showTextActions) {
      // Wenn keine Auswahl mehr da ist, Popover schließen (wird durch onOpenChange behandelt)
      // console.log("[handleTextSelection] Keine Auswahl mehr, schließe Popover (via onOpenChange).");
    } else {
        // Log, warum Popover nicht gezeigt wird
        // console.log("[handleTextSelection] Bedingungen NICHT erfüllt. Popover wird nicht angezeigt.", { hasSelectedText: !!selectedText, isSelectionInTextarea: isInTextarea });
    }
  }, [showTextActions, textOutputRef]); // Abhängigkeiten bleiben gleich


  // --- NEU: Handler für Popover Open/Close ---
  const handlePopoverOpenChange = useCallback((open) => {
      // console.log("[handlePopoverOpenChange] Zustand ändert sich auf:", open);
      setShowTextActions(open); // Zustand synchronisieren
      if (!open) {
          // Wenn das Popover geschlossen wird, Koordinaten zurücksetzen
          // console.log("[handlePopoverOpenChange] Popover geschlossen, resette Koordinaten.");
          setSelectedTextData(prev => ({ ...prev, text: '', clientX: null, clientY: null })); // Auch Text zurücksetzen
      }
  }, []); // Keine Abhängigkeiten nötig, da nur Setter verwendet werden
  // --- ENDE NEU ---


  // --- Handler für Aktionen (Copy, Share) ---
  const handleCopy = useCallback(async () => {
    if (!generatedText) return;
    try {
      await navigator.clipboard.writeText(generatedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
      setErrorMsg('Text konnte nicht kopiert werden.');
    }
  }, [generatedText]);

  useEffect(() => {
    setCanShare(!!navigator.share);
  }, []);

  const handleWebShare = useCallback(async () => {
    if (!generatedText || !navigator.share) return;
    try {
      await navigator.share({
        title: promptData?.name || 'Generierter Text',
        text: generatedText,
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Fehler beim Teilen:', err);
        setErrorMsg('Text konnte nicht geteilt werden.');
      }
    }
  }, [generatedText, promptData]);


  // --- API Calls (generateText, refineText) ---
  const callGenerateAPI = useCallback(async (instruction = null) => {
    // console.log('[usePromptInteraction] callGenerateAPI aufgerufen. Instruction:', instruction);
    // console.log('[usePromptInteraction] Aktuelle placeholderValues:', placeholderValues);
    // console.log('[usePromptInteraction] Aktueller selectedTone:', selectedTone);
    // console.log('[usePromptInteraction] Aktuelle selectedStyleTags:', selectedStyleTags);

    const isRefineCall = instruction !== null;
    if (isRefineCall) {
      setIsRefining(true);
    } else {
      setLoading(true);
    }
    setErrorMsg('');
    setDocxError('');

    const payload = {
      placeholders: placeholderValues,
      tone: selectedTone, // Wird jetzt korrekt geleert oder gesetzt
      slug: slug,
      styleTags: selectedStyleTags, // Wird jetzt korrekt geleert oder gesetzt
      ...(isRefineCall && {
        originalText: generatedText,
        refineInstruction: instruction,
      }),
    };

    // console.log('[usePromptInteraction] Sende Payload an API:', payload);

    try {
      const result = isRefineCall
        ? await refineText(payload)
        : await generateText(payload);

      // console.log('[usePromptInteraction] Antwort von API erhalten:', result);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.text !== undefined) {
        setGeneratedText(result.text);
      } else {
        throw new Error("Kein Text von der API erhalten.");
      }
    } catch (err) {
      console.error("Fehler bei API-Aufruf:", err);
      setErrorMsg(err.message || "Ein Fehler ist aufgetreten.");
    } finally {
      // console.log('[usePromptInteraction] callGenerateAPI finally Block. Setze Ladezustand zurück.');
      if (isRefineCall) {
        setIsRefining(false);
      } else {
        setLoading(false);
      }
    }
  }, [slug, placeholderValues, selectedTone, generatedText, selectedStyleTags]);


  // --- Handler für Generieren/Verfeinern ---
  const handleInitialGenerate = useCallback(() => callGenerateAPI(), [callGenerateAPI]);
  const handleRephrase = useCallback(() => callGenerateAPI('Formuliere den Text neu.'), [callGenerateAPI]);
  const handleToggleRefineInput = useCallback(() => setShowRefineInput(prev => !prev), []);
  const handleRefine = useCallback(() => { if (additionalInfo.trim()) callGenerateAPI(additionalInfo); }, [callGenerateAPI, additionalInfo]);
  const handleGetToThePoint = useCallback(() => callGenerateAPI('Formuliere den Text deutlich kürzer und direkter, ohne an Höflichkeit zu verlieren. Konzentriere dich auf die Kernbotschaft.'), [callGenerateAPI]);


  // --- Handler für kontextbezogene Textaktionen ---
  const handleTextAction = useCallback(async (actionType) => {
    // Prüfe auf clientX/Y statt rect
    if (!selectedTextData.text || !generatedText || selectedTextData.clientX == null || selectedTextData.clientY == null) {
      console.warn("handleTextAction aufgerufen ohne ausgewählten Text, generierten Text oder Koordinaten.");
      return;
    }

    const originalSelection = selectedTextData.text;
    // console.log("[handleTextAction] Aktion gestartet:", actionType, "Originalauswahl:", originalSelection);

    setIsModifyingSelection(true);
    setErrorMsg('');

    const payload = {
      selectedText: originalSelection,
      fullText: generatedText,
      actionType: actionType,
      slug: slug,
    };

    // console.log("[handleTextAction] Sende Payload an refineSelection:", payload);

    try {
      const result = await refineSelection(payload);
      // console.log("[handleTextAction] Antwort von refineSelection:", result);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.modifiedText !== undefined) {
        // console.log("[handleTextAction] Modifizierter Text erhalten:", result.modifiedText);
        setGeneratedText(prevText => {
            const newText = prevText.replace(originalSelection, result.modifiedText);
            // console.log("[handleTextAction] Text ersetzt. Vorher:", prevText.substring(0, 100) + "...", "Nachher:", newText.substring(0, 100) + "...");
            return newText;
        });
      } else {
        throw new Error("Kein modifizierter Text von der API erhalten.");
      }

    } catch (err) {
      console.error("Fehler bei handleTextAction:", err);
      setErrorMsg(err.message || "Fehler bei der Textmodifikation.");
    } finally {
      // console.log("[handleTextAction] Aktion beendet, setze isModifyingSelection auf false.");
      setIsModifyingSelection(false);
    }
  }, [selectedTextData, generatedText, slug]);


  // --- Handler für E-Mail Senden ---
  const handleSendEmail = useCallback(async () => {
    if (!recipientEmail || !generatedText) return;

    setIsSendingEmail(true);
    setSendEmailError('');
    setSendEmailSuccess(false);

    const subject = `Dein Text von PromptHaus: ${promptData?.name || 'Generierter Text'}`;
    const textBody = `Hallo,\n\nhier ist der Text, der mit PromptHaus generiert wurde:\n\n---\n${generatedText}\n---\n\nViele Grüße,\nDein PromptHaus Team`;
    const htmlBody = `<p>Hallo,</p><p>hier ist der Text, der mit PromptHaus generiert wurde:</p><hr><p style="white-space: pre-wrap;">${generatedText}</p><hr><p>Viele Grüße,<br>Dein PromptHaus Team</p>`;

    try {
      const result = await sendEmailApi({
        to: recipientEmail,
        subject: subject,
        textBody: textBody,
        htmlBody: htmlBody,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setSendEmailSuccess(true);
    } catch (err) {
      console.error("Fehler beim Senden der E-Mail:", err);
      setSendEmailError(err.message || "E-Mail konnte nicht gesendet werden.");
    } finally {
      setIsSendingEmail(false);
    }
  }, [recipientEmail, generatedText, promptData?.name]);


  // --- Handler für DOCX Download ---
  const handleDownloadDocx = useCallback(async () => {
    if (!generatedText) return;

    setIsDownloadingDocx(true);
    setDocxError('');

    try {
      const paragraphs = generatedText.split('\n').map(line =>
        new Paragraph({
          children: [new TextRun(line)],
        })
      );

      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs,
        }],
      });

      const blob = await Packer.toBlob(doc);
      const fileName = `${slug || 'generierter-text'}_${new Date().toISOString().split('T')[0]}.docx`;
      saveAs(blob, fileName);

    } catch (err) {
      console.error("Fehler beim Erstellen/Herunterladen der DOCX-Datei:", err);
      setDocxError("Fehler beim Erstellen der DOCX-Datei.");
    } finally {
      setIsDownloadingDocx(false);
    }
  }, [generatedText, slug]);


  // --- Kombinierter Ladezustand für UI-Deaktivierung ---
  const isBusy = loading || isRefining || isDownloadingDocx || isModifyingSelection;


  // --- Rückgabewerte des Hooks ---
  return {
    // States
    semanticDataInfo, placeholderValues, selectedTone, generatedText, loading, errorMsg,
    isCopied, canShare, showRefineInput, additionalInfo, isRefining, filteredTones,
    showToneSuggestions, toneInputRef, showEmailDialog, recipientEmail, isSendingEmail,
    sendEmailError, sendEmailSuccess, accordionValue, isDownloadingDocx, docxError,
    selectedStyleTags, selectedTextData, showTextActions, textOutputRef,
    isModifyingSelection,

    // Computed Values
    promptData,
    isBusy,

    // Setters & Handlers
    handleInputChange, handleToneInputChange, handleToneSuggestionClick, handleStyleTagClick,
    handleCopy, handleWebShare, handleInitialGenerate, handleRephrase, handleToggleRefineInput,
    handleRefine, handleGetToThePoint, setShowEmailDialog, setRecipientEmail, handleSendEmail,
    setAccordionValue, handleDownloadDocx, getNestedValue, toneSuggestions, setAdditionalInfo,
    setShowToneSuggestions, handleTextSelection,
    handleTextAction,
    handlePopoverOpenChange,
  };
}
