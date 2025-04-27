// components/hooks/usePromptInteraction.js
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { getSemanticData } from '@/lib/semantic-data-parser'; // Annahme: Pfad korrekt
import { generateText, refineText } from '@/app/(public)/prompt/actions'; // <-- NEUER Pfad mit Route Group
import { TONES } from '@/lib/constants'; // Annahme: Pfad korrekt
import { sendEmailApi } from '@/app/actions';

// Helper function (falls noch nicht global verfügbar)
const getNestedValue = (obj, path) => {
    if (!path) return undefined;
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

export function usePromptInteraction(variants = [], slug = '') {
  // --- States ---
  const [selectedVariantId, setSelectedVariantId] = useState(null);
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
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendEmailError, setSendEmailError] = useState('');
  const [sendEmailSuccess, setSendEmailSuccess] = useState(false);
  const [accordionValue, setAccordionValue] = useState(''); // Zustand für Accordion

  // --- NEU: Zustand für DOCX-Download ---
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [docxError, setDocxError] = useState(''); // Optional: Fehler beim DOCX-Download anzeigen
  // --- ENDE NEU ---

  const toneInputRef = useRef(null);

  // --- Computed Values ---
  const generationVariants = useMemo(() => variants || [], [variants]);

  const currentVariant = useMemo(() => {
    return generationVariants.find(v => v.id === selectedVariantId) || null;
  }, [selectedVariantId, generationVariants]);

  const semanticDataInfo = useMemo(() => {
    return currentVariant ? getSemanticData(currentVariant.semantic_data || {}) : {};
  }, [currentVariant]);

  // --- Effects ---
  useEffect(() => {
    // Reset state when variant changes
    setPlaceholderValues({});
    setGeneratedText('');
    setErrorMsg('');
    setSelectedTone('');
    setShowRefineInput(false);
    setAdditionalInfo('');
    setIsCopied(false);
    setAccordionValue(''); // Accordion zurücksetzen
    setDocxError(''); // DOCX-Fehler zurücksetzen
    // Setze die erste Variante als Standard, wenn vorhanden und keine ausgewählt ist
    if (generationVariants.length > 0 && !selectedVariantId) {
      setSelectedVariantId(generationVariants[0].id);
    } else if (generationVariants.length === 0) {
      setSelectedVariantId(null); // Keine Varianten, keine ID
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariantId, generationVariants]); // Abhängigkeit von generationVariants hinzugefügt

  useEffect(() => {
    setCanShare(!!navigator.share);
  }, []);

  // Click outside handler für Tonalität
  useEffect(() => {
    function handleClickOutside(event) {
      if (toneInputRef.current && !toneInputRef.current.contains(event.target)) {
        setShowToneSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [toneInputRef]);


  // --- Handlers (mit useCallback optimiert) ---
  const handleInputChange = useCallback((key, value) => {
    setPlaceholderValues(prev => {
      const keys = key.split('.');
      if (keys.length === 1) {
        return { ...prev, [key]: value };
      }
      // Handle nested state updates immutably
      const newState = JSON.parse(JSON.stringify(prev)); // Deep copy
      let currentLevel = newState;
      for (let i = 0; i < keys.length - 1; i++) {
        currentLevel[keys[i]] = currentLevel[keys[i]] || {};
        currentLevel = currentLevel[keys[i]];
      }
      currentLevel[keys[keys.length - 1]] = value;
      return newState;
    });
    setErrorMsg(''); // Clear error on input change
  }, []);

  const handleToneInputChange = (e) => {
    const value = e.target.value;
    setSelectedTone(value);
    if (value.trim().length > 0 && filteredTones.length > 0) {
      setShowToneSuggestions(true);
    } else {
      setShowToneSuggestions(false);
    }
  };

  const handleToneSuggestionClick = (tone) => {
    setSelectedTone(tone);
    setShowToneSuggestions(false);
    // Optional: Fokus zurück auf Input oder anderen Bereich setzen
    if (toneInputRef.current) {
      // toneInputRef.current.querySelector('input')?.focus(); // Oder blur()
    }
  };

  const handleCopy = useCallback(async () => {
    if (!generatedText) return;
    try {
      await navigator.clipboard.writeText(generatedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
      setErrorMsg('Konnte Text nicht kopieren.');
    }
  }, [generatedText]);

  const handleWebShare = useCallback(async () => {
    if (navigator.share && generatedText) {
      try {
        await navigator.share({
          title: currentVariant?.title || 'Generierter Text',
          text: generatedText,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Fehler beim Teilen:', error);
        // Fehler muss nicht unbedingt dem User angezeigt werden
      }
    }
  }, [generatedText, currentVariant]);

  const debouncedGenerate = useDebouncedCallback(async (variantId, values, tone = '') => {
    if (!variantId) {
      setErrorMsg("Bitte wähle zuerst eine Variante aus.");
      setLoading(false);
      return;
    }
    setErrorMsg('');
    setGeneratedText(''); // Clear previous text
    setLoading(true);
    setIsRefining(false); // Ensure refine state is off

    try {
      const result = await generateText({
        variantId: variantId,
        placeholders: values,
        tone: tone || undefined, // Send tone only if not empty
        slug: slug,
      });

      if (result.error) {
        setErrorMsg(result.error);
        setGeneratedText('');
      } else {
        setGeneratedText(result.text || '');
        setErrorMsg(''); // Clear any previous error
      }
    } catch (error) {
      console.error("Fehler bei Textgenerierung:", error);
      setErrorMsg("Ein unerwarteter Fehler ist aufgetreten.");
      setGeneratedText('');
    } finally {
      setLoading(false);
    }
  }, 300); // 300ms debounce

  const handleInitialGenerate = useCallback(() => {
     // Hier keine Tonalität übergeben, da es der initiale Aufruf ist
     debouncedGenerate(selectedVariantId, placeholderValues);
  }, [selectedVariantId, placeholderValues, debouncedGenerate]);


  const debouncedRefine = useDebouncedCallback(async (baseText, variantId, values, tone, instruction) => {
    if (!baseText || !variantId) return;

    setErrorMsg('');
    setIsRefining(true); // Start refining visual state

    try {
      const result = await refineText({
        originalText: baseText,
        variantId: variantId,
        placeholders: values, // Pass current values for context
        tone: tone || undefined,
        refineInstruction: instruction || undefined,
        slug: slug,
      });

      if (result.error) {
        setErrorMsg(result.error);
        // Keep the old generatedText visible during error? Or clear?
        // setGeneratedText(''); // Optional: clear on error
      } else {
        setGeneratedText(result.text || ''); // Update with refined text
        setErrorMsg('');
        // Optional: Clear refine input after successful refinement?
        // setAdditionalInfo('');
        // setShowRefineInput(false);
      }
    } catch (error) {
      console.error("Fehler bei Textverfeinerung:", error);
      setErrorMsg("Ein unerwarteter Fehler beim Verfeinern ist aufgetreten.");
    } finally {
      setIsRefining(false); // End refining visual state
    }
  }, 300); // 300ms debounce

  const handleRephrase = useCallback(() => {
    // Ruft refineText auf, aber ohne spezifische 'additionalInfo'
    // Verwendet den aktuell ausgewählten Ton
    debouncedRefine(generatedText, selectedVariantId, placeholderValues, selectedTone, "Formuliere den Text neu.");
  }, [generatedText, selectedVariantId, placeholderValues, selectedTone, debouncedRefine]);

  // --- NEUER HANDLER für "Auf den Punkt kommen" ---
  const handleGetToThePoint = useCallback(() => {
    const instruction = "Entferne alle Höflichkeitsfloskeln, Füllwörter und unnötigen Einleitungen. Komme sofort zum Kernthema des Textes. Sei direkt und sachlich, aber beginne den Text mit einer kurzen, passenden Anrede wie „Guten Tag“, „Hallo“ oder „Sehr geehrte Damen und Herren";
    // Ruft refineText mit der spezifischen Anweisung auf
    debouncedRefine(generatedText, selectedVariantId, placeholderValues, selectedTone, instruction);
  }, [generatedText, selectedVariantId, placeholderValues, selectedTone, debouncedRefine]);
  // --- ENDE NEUER HANDLER ---

  const handleToggleRefineInput = () => {
    setShowRefineInput(prev => !prev);
  };

  const handleRefine = useCallback(() => {
    // Ruft refineText mit der 'additionalInfo' auf
    debouncedRefine(generatedText, selectedVariantId, placeholderValues, selectedTone, additionalInfo);
  }, [generatedText, selectedVariantId, placeholderValues, selectedTone, additionalInfo, debouncedRefine]);

  const handleSendEmail = useCallback(async () => {
      if (!recipientEmail || !generatedText) return;
      setIsSendingEmail(true);
      setSendEmailError('');
      setSendEmailSuccess(false);
      try {
          const result = await sendEmailApi({
              to: recipientEmail,
              subject: `Generierter Text: ${currentVariant?.title || 'PromptHaus'}`,
              textBody: generatedText,
              // Optional: HTML Body, falls gewünscht
              // htmlBody: `<p>${generatedText.replace(/\n/g, '<br>')}</p>`,
          });
          if (result.success) {
              setSendEmailSuccess(true);
              setRecipientEmail(''); // Clear email input on success
              setTimeout(() => {
                  setShowEmailDialog(false); // Close dialog after a delay
                  setSendEmailSuccess(false); // Reset success state
              }, 2500);
          } else {
              setSendEmailError(result.error || 'E-Mail konnte nicht gesendet werden.');
          }
      } catch (error) {
          console.error("Fehler beim Senden der E-Mail:", error);
          setSendEmailError('Ein unerwarteter Fehler ist beim Senden aufgetreten.');
      } finally {
          setIsSendingEmail(false);
      }
  }, [recipientEmail, generatedText, currentVariant?.title]);


  // Tonalität-Filterung
  const filteredTones = useMemo(() => {
    if (!selectedTone) return []; // Keine Vorschläge, wenn Input leer ist
    const lowerCaseTone = selectedTone.toLowerCase();
    return TONES.filter(tone =>
      tone.toLowerCase().includes(lowerCaseTone)
    ).slice(0, 5); // Max 5 Vorschläge
  }, [selectedTone]);


  // --- NEU: Handler für DOCX-Download ---
  const handleDownloadDocx = useCallback(async () => {
    if (!generatedText) {
        setDocxError("Es gibt keinen Text zum Herunterladen.");
        return;
    }
    setIsDownloadingDocx(true);
    setDocxError(''); // Reset previous errors

    try {
      const response = await fetch('/api/generate-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: generatedText,
          // Erzeuge einen sinnvollen Dateinamen
          filename: `${slug}-${currentVariant?.id || 'variante'}.docx`
        }),
      });

      if (!response.ok) {
        // Versuche, eine Fehlermeldung aus der API-Antwort zu lesen
        let errorDetail = 'Serverfehler';
        try {
            const errorJson = await response.json();
            errorDetail = errorJson.error || `Status: ${response.status}`;
        } catch (e) {
            // Wenn die Antwort kein JSON ist, verwende den Status
            errorDetail = `Status: ${response.status}`;
        }
        throw new Error(`Fehler beim Erstellen der DOCX-Datei: ${errorDetail}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none'; // Verstecke das Link-Element
      a.href = url;

      // Versuche, den Dateinamen aus dem Content-Disposition Header zu extrahieren
      let filename = `${slug}-${currentVariant?.id || 'variante'}.docx`; // Fallback
      const contentDisposition = response.headers.get('content-disposition');
       if (contentDisposition) {
           // Regex, um sowohl filename="name.docx" als auch filename*=UTF-8''name.docx zu finden
           const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?([^;]+)/i);
           if (filenameMatch && filenameMatch[1]) {
               // Dekodiere den Dateinamen, falls er UTF-8 kodiert ist
               try {
                   filename = decodeURIComponent(filenameMatch[1].replace(/['"]/g, '')); // Entferne Anführungszeichen
               } catch (e) {
                   console.warn("Konnte Dateinamen nicht dekodieren, verwende Fallback:", e);
                   // Fallback bleibt bestehen
               }
           } else {
               // Fallback für ältere filename="name.docx" Syntax ohne UTF-8
               const plainFilenameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
               if (plainFilenameMatch && plainFilenameMatch[1]) {
                   filename = plainFilenameMatch[1];
               }
           }
       }

      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Aufräumen
      window.URL.revokeObjectURL(url);
      a.remove();

    } catch (error) {
      console.error("DOCX Download-Fehler:", error);
      setDocxError(error.message || "Download fehlgeschlagen.");
      // Optional: Zeige dem Benutzer eine spezifischere Fehlermeldung an
    } finally {
      setIsDownloadingDocx(false);
    }
  }, [generatedText, currentVariant, slug]); // Abhängigkeiten hinzufügen
  // --- ENDE NEU ---


  // --- Rückgabeobjekt ---
  return {
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
    toneInputRef, // Ref wird durchgereicht
    showEmailDialog,
    recipientEmail,
    isSendingEmail,
    sendEmailError,
    sendEmailSuccess,
    accordionValue,
    // --- NEU ---
    isDownloadingDocx,
    docxError,
    // --- ENDE NEU ---

    // Computed Values
    currentVariant,
    generationVariants, // Auch zurückgeben, falls in der Komponente noch gebraucht

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
    // --- NEU: Handler hinzufügen ---
    handleGetToThePoint,
    // --- ENDE NEU ---
    setShowEmailDialog,
    setRecipientEmail,
    handleSendEmail,
    setAccordionValue,
    // --- NEU ---
    handleDownloadDocx,
    // --- ENDE NEU ---
    getNestedValue, // Stelle sicher, dass diese Funktion hier definiert oder importiert ist
    toneSuggestions: TONES, // Oder wie auch immer die Vorschläge bereitgestellt werden
    setAdditionalInfo,
  };
}

// Stelle sicher, dass getNestedValue hier definiert ist, falls nicht global importiert
// const getNestedValue = (obj, path) => { ... };
