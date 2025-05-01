// components/hooks/usePromptInteraction.js - FINAL CLEANUP

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { generateText, refineText, refineSelection } from '@/app/(public)/prompt/actions';
import { saveAs } from 'file-saver';
import { sendEmailApi } from '@/app/actions'; // Import für E-Mail

// getNestedValue und setNestedValue werden nicht mehr benötigt.

// --- Hook usePromptInteraction ---
export function usePromptInteraction(promptData, slug) {
  // --- States ---
  const [placeholderValues, setPlaceholderValues] = useState({});
  const [generatedText, setGeneratedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  // States für Tonalität entfernt
  // const [showToneSuggestions, setShowToneSuggestions] = useState(false);
  // const toneInputRef = useRef(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendEmailError, setSendEmailError] = useState('');
  const [sendEmailSuccess, setSendEmailSuccess] = useState(false);
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [docxError, setDocxError] = useState('');
  const [selectedTextData, setSelectedTextData] = useState({ text: '', clientX: null, clientY: null });
  const [showTextActions, setShowTextActions] = useState(false);
  const textOutputRef = useRef(null);
  const [activeQuickTone, setActiveQuickTone] = useState(null); // <-- NEU: State für aktiven Quick-Tone-Button
  const [accordionValue, setAccordionValue] = useState(""); // <-- WIEDER HINZUGEFÜGT: State für Accordion
  const [isModifyingSelection, setIsModifyingSelection] = useState(false);

  // --- Initialisierung und Reset ---
  const resetInteraction = useCallback(() => {
    setPlaceholderValues({});
    setGeneratedText('');
    setLoading(false);
    setErrorMsg('');
    setIsCopied(false);
    setShowRefineInput(false);
    setAdditionalInfo('');
    setIsRefining(false);
    // setShowToneSuggestions(false); // Entfernt
    setRecipientEmail('');
    setIsSendingEmail(false);
    setSendEmailError('');
    setSendEmailSuccess(false);
    setIsDownloadingDocx(false);
    setDocxError('');
    setSelectedTextData({ text: '', clientX: null, clientY: null });
    setShowTextActions(false);
    setActiveQuickTone(null); // <-- NEU: Reset Quick Tone
    setAccordionValue(""); // <-- WIEDER HINZUGEFÜGT: Reset Accordion
    setIsModifyingSelection(false);
  }, []);

  // Effekt für Initialisierung und Reset
  useEffect(() => {
    resetInteraction();
    const semanticData = promptData?.semantic_data;
    if (semanticData && typeof semanticData === 'object' && Object.keys(semanticData).length > 0) {
      const initialPlaceholders = {};
      Object.entries(semanticData).forEach(([key, item]) => {
        if (item && typeof item === 'object') {
           initialPlaceholders[key] = item.default || '';
        }
      });
      setPlaceholderValues(initialPlaceholders);
    } else {
      setPlaceholderValues({});
    }
  }, [promptData, slug, resetInteraction]);

  // --- Handler für Input-Änderungen ---
  const handleInputChange = useCallback((key, value) => {
    setPlaceholderValues(prev => {
      const newState = { ...prev };
      if (typeof key === 'string') {
        newState[key] = value;
        return newState;
      }
      return prev; // Return previous state if key is not a string
    });
  }, []);

  // --- Tonalitätsvorschläge (bleibt für Sprachlevel) ---
  const toneSuggestions = useMemo(() => {
    const langLevelOptions = promptData?.semantic_data?.language_level?.options;
    if (Array.isArray(langLevelOptions)) {
      return langLevelOptions.map(opt => opt.label).filter(Boolean);
    }
    // Fallback entfernt, da nicht mehr direkt verwendet
    return [];
  }, [promptData]);

  // --- Klick außerhalb schließen (Tone Suggestions - nicht mehr benötigt) ---
  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     if (toneInputRef.current && !toneInputRef.current.contains(event.target)) {
  //       setShowToneSuggestions(false);
  //     }
  //   };
  //   document.addEventListener('mousedown', handleClickOutside);
  //   return () => document.removeEventListener('mousedown', handleClickOutside);
  // }, []);

  // --- Handler für Textauswahl ---
  const handleTextSelection = useCallback((event) => {
    if (!event || !event.target || !textOutputRef.current) {
      return;
    }
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    const isInTextarea = textOutputRef.current.contains(event.target);

    if (selectedText && isInTextarea) {
      setSelectedTextData({
          text: selectedText,
          clientX: event.clientX,
          clientY: event.clientY
      });
      setShowTextActions(true);
    }
  }, [textOutputRef]); // showTextActions entfernt, da es durch onOpenChange gesteuert wird

  // --- Handler für Popover Open/Close ---
  const handlePopoverOpenChange = useCallback((open) => {
      setShowTextActions(open);
      if (!open) {
          setSelectedTextData(prev => ({ ...prev, text: '', clientX: null, clientY: null }));
      }
  }, []);

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
    const isRefineCall = instruction !== null;
    if (isRefineCall) {
      setIsRefining(true);
    } else {
      setLoading(true);
    }
    setErrorMsg('');
    setDocxError('');

    // setActiveQuickTone(null); // <-- VERSCHOBEN: Reset erst nach erfolgreichem API Call oder bei neuem Generate
    const payload = {
      placeholders: placeholderValues,
      slug: slug,
      ...(isRefineCall && {
        originalText: generatedText,
        refineInstruction: instruction,
      }),
    };

    try {
      const result = isRefineCall
        ? await refineText(payload)
        : await generateText(payload);

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.text !== undefined) {
        let cleanedGeneratedText = result.text.trim();
        cleanedGeneratedText = cleanedGeneratedText.replace(/^(["“”])(.*)\1$/s, '$2');
        cleanedGeneratedText = cleanedGeneratedText.trim();
        setGeneratedText(cleanedGeneratedText);
        // Reset active tone only if it wasn't a quick tone button click that initiated this
        // We handle the active state *before* calling in handleQuickToneChange
        // If it's a normal generate/rephrase/refine, reset the quick tone button visually
        // setActiveQuickTone(null); // <-- Überlegen: Besser im Handler?
      } else {
        throw new Error("Kein Text von der API erhalten.");
      }
    } catch (err) {
      console.error("Fehler bei API-Aufruf:", err);
      setErrorMsg(err.message || "Ein Fehler ist aufgetreten.");
    } finally {
      if (isRefineCall) {
        setIsRefining(false);
      } else {
        setLoading(false);
      }
    }
  }, [slug, placeholderValues, generatedText]);

  // --- Handler für Generieren/Verfeinern ---
  const handleInitialGenerate = useCallback(() => {
      setActiveQuickTone(null); // Reset bei komplett neuer Generierung
      callGenerateAPI();
  }, [callGenerateAPI]);

  const handleRephrase = useCallback(() => {
      setActiveQuickTone(null); // Reset bei allgemeinem "Neu formulieren"
      callGenerateAPI('Formuliere den Text neu.');
  }, [callGenerateAPI]);

  const handleToggleRefineInput = useCallback(() => setShowRefineInput(prev => !prev), []);

  const handleRefine = useCallback(() => {
      if (additionalInfo.trim()) {
          setActiveQuickTone(null); // Reset bei benutzerdefinierter Anweisung
          callGenerateAPI(additionalInfo);
      }
  }, [callGenerateAPI, additionalInfo]);

  // --- NEU: Handler für Quick Tone Buttons ---
  const handleQuickToneChange = useCallback((toneKey, instruction) => {
    setActiveQuickTone(toneKey); // Setze den aktiven Button *vor* dem API-Aufruf
    callGenerateAPI(instruction);
  }, [callGenerateAPI]);

  // --- Handler für kontextbezogene Textaktionen ---
  const handleTextAction = useCallback(async (actionType) => {
    if (!selectedTextData.text || !generatedText || selectedTextData.clientX == null || selectedTextData.clientY == null) {
      return;
    }
    const originalSelection = selectedTextData.text;
    setIsModifyingSelection(true);
    setErrorMsg('');
    setActiveQuickTone(null); // Reset bei Text-Aktion

    const payload = {
      selectedText: originalSelection,
      fullText: generatedText,
      actionType: actionType,
      slug: slug,
    };

    try {
      const result = await refineSelection(payload);
      if (result.error) throw new Error(result.error);

      if (result.modifiedText !== undefined) {
        let cleanedModifiedText = result.modifiedText.trim();
        cleanedModifiedText = cleanedModifiedText.replace(/^(["“”])(.*)\1$/s, '$2');
        cleanedModifiedText = cleanedModifiedText.trim();
        setGeneratedText(prevText => prevText.replace(originalSelection, cleanedModifiedText));
      } else {
        throw new Error("Kein modifizierter Text von der API erhalten.");
      }
    } catch (err) {
      console.error("Fehler bei handleTextAction:", err);
      setErrorMsg(err.message || "Fehler bei der Textmodifikation.");
    } finally {
      setIsModifyingSelection(false);
      // Popover nach Aktion schließen (wird durch onOpenChange gehandhabt)
      // setShowTextActions(false);
      // setSelectedTextData({ text: '', clientX: null, clientY: null });
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
      const result = await sendEmailApi({ to: recipientEmail, subject, textBody, htmlBody });
      if (result.error) throw new Error(result.error);
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
      const baseFilename = slug || 'generierter-text';
      const dateSuffix = new Date().toISOString().split('T')[0];
      const filename = `${baseFilename}_${dateSuffix}.docx`;
      const response = await fetch('/api/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: generatedText, filename }),
      });
      if (!response.ok) {
        let errorData;
        try { errorData = await response.json(); }
        catch (e) { errorData = { error: `Serverfehler: ${response.statusText} (Status ${response.status})` }; }
        throw new Error(errorData.error || 'Unbekannter Serverfehler beim DOCX-Download.');
      }
      const blob = await response.blob();
      saveAs(blob, filename);
    } catch (err) {
      console.error("Fehler beim Anfordern/Herunterladen der DOCX-Datei:", err);
      setDocxError(err.message || "Fehler beim Erstellen/Herunterladen der DOCX-Datei.");
    } finally {
      setIsDownloadingDocx(false);
    }
  }, [generatedText, slug]);

  // --- Kombinierter Ladezustand ---
  const isBusy = loading || isRefining || isDownloadingDocx || isModifyingSelection;

  // --- NEU: Gruppiere semantic_data mit Sortierung nach 'order' ---
  const groupedSemanticData = useMemo(() => {
    if (!promptData?.semantic_data) return []; // Gib ein leeres Array zurück, wenn keine Daten vorhanden sind
    const groups = {};
    Object.entries(promptData.semantic_data).forEach(([key, field]) => {
      const groupName = field.group || 'Weitere Angaben';
      const fieldOrder = typeof field.order === 'number' ? field.order : Infinity;
      if (!groups[groupName]) {
        groups[groupName] = {
          fields: [],
          order: Infinity,
          isCollapsible: false,
          key: groupName, // Füge den Gruppennamen als Schlüssel hinzu
        };
      }
      groups[groupName].fields.push({ key, ...field, order: fieldOrder });
      if (groupName === 'Zusätzliche Angaben') {
         groups[groupName].isCollapsible = true;
      }
    });

    Object.values(groups).forEach(group => {
      group.fields.sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        const optionalA = a.optional === true;
        const optionalB = b.optional === true;
        if (optionalA !== optionalB) return optionalA ? 1 : -1;
        return a.key.localeCompare(b.key);
      });
      group.order = Math.min(group.order, ...group.fields.map(f => f.order));
    });

    const sortedGroupEntries = Object.entries(groups).sort(([, groupA], [, groupB]) => {
        if (groupA.order !== groupB.order) {
            return groupA.order - groupB.order;
        }
        return groupA.key.localeCompare(groupB.key); // Fallback: Alphabetisch nach Gruppenname
    });
    return sortedGroupEntries; // Gib das sortierte Array zurück
  }, [promptData]);
  // --- ENDE NEU: Gruppierung ---

  // --- Rückgabewerte des Hooks ---
  return {
    // States
    placeholderValues, generatedText, loading, errorMsg,
    isCopied, canShare, showRefineInput, additionalInfo, isRefining,
    showEmailDialog, recipientEmail, isSendingEmail,
    sendEmailError, sendEmailSuccess, isDownloadingDocx, docxError,
    selectedTextData, showTextActions, textOutputRef, activeQuickTone, accordionValue, // <-- accordionValue hinzugefügt
    isModifyingSelection,
    // Computed Values
    promptData,
    isBusy,
    groupedSemanticData, // <-- Gruppierte und sortierte Daten hinzufügen
    // Setters & Handlers
    handleInputChange,
    handleCopy, handleWebShare, handleInitialGenerate, handleRephrase, handleToggleRefineInput,
    handleRefine, setShowEmailDialog, setRecipientEmail, handleSendEmail,
    handleDownloadDocx, toneSuggestions, setAdditionalInfo, setAccordionValue, // <-- setAccordionValue hinzugefügt
    // setShowToneSuggestions, // Entfernt
    handleTextSelection, handleQuickToneChange, // <-- handleQuickToneChange hinzugefügt
    handleTextAction,
    handlePopoverOpenChange,
  };
}
