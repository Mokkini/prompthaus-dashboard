// components/hooks/usePromptInteraction.js - ANGEPASST für API Route

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { generateText, refineText } from '@/app/(public)/prompt/actions';
// import { sendEmail } from '@/app/api/send/actions'; // <-- ENTFERNT: Fehlerhafter Import
import { saveAs } from 'file-saver'; // Für DOCX Download
import { Packer, Document, Paragraph, TextRun } from 'docx'; // Für DOCX Erstellung

// Helper zum Extrahieren verschachtelter Werte
const getNestedValue = (obj, path) => {
  if (!path) return undefined;
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Helper zum Setzen verschachtelter Werte (unverändert)
const setNestedValue = (obj, path, value) => {
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
  return { ...obj }; // Gibt eine neue Kopie zurück
};

// --- Hook usePromptInteraction (ANGEPASST) ---
export function usePromptInteraction(promptData, slug) { // <-- Nimmt promptData statt variants
  // --- States für die Interaktion ---
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
  const [accordionValue, setAccordionValue] = useState(''); // State für Accordion

  // --- States für E-Mail Dialog ---
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [sendEmailError, setSendEmailError] = useState('');
  const [sendEmailSuccess, setSendEmailSuccess] = useState(false);

  // --- States für DOCX Download ---
  const [isDownloadingDocx, setIsDownloadingDocx] = useState(false);
  const [docxError, setDocxError] = useState('');

  // --- Entfernte States ---
  // const [selectedVariantId, setSelectedVariantId] = useState(null);
  // const [currentVariant, setCurrentVariant] = useState(null);
  // const [generationVariants, setGenerationVariants] = useState([]);

  // --- Semantic Data Info direkt aus promptData ---
  const semanticDataInfo = useMemo(() => {
    return promptData?.semantic_data || {};
  }, [promptData]);

  // --- Initialisierung und Reset ---
  const resetInteraction = useCallback(() => {
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
    setAccordionValue(''); // Accordion zurücksetzen
    setDocxError(''); // DOCX Fehler zurücksetzen
    // E-Mail Dialog States nicht hier zurücksetzen, erst bei Erfolg/Schließen
  }, []);

  // Effekt für Initialisierung und Reset (vereinfacht)
  useEffect(() => {
    resetInteraction();
    // Prüfe Web Share API Verfügbarkeit
    setCanShare(!!navigator.share);
    // Setze initiale Placeholder-Werte basierend auf semanticDataInfo
    const initialPlaceholders = {};
    const extractDefaults = (data, currentPath = '') => {
        if (!data) return;
        Object.entries(data).forEach(([key, item]) => {
            const stateKey = currentPath ? `${currentPath}.${key}` : key;
            if (item && typeof item === 'object') {
                if (item.fields) {
                    extractDefaults(item.fields, stateKey);
                } else if (item.hasOwnProperty('default')) {
                    initialPlaceholders[stateKey] = item.default;
                } else if (item.type === 'boolean') {
                    initialPlaceholders[stateKey] = false; // Default für Boolean ist false
                }
            }
        });
    };
    extractDefaults(semanticDataInfo);
    setPlaceholderValues(initialPlaceholders);

  }, [promptData, slug, resetInteraction, semanticDataInfo]); // Abhängigkeit von promptData statt variants

  // --- Handler für Input-Änderungen ---
  const handleInputChange = useCallback((key, value) => {
    setPlaceholderValues(prev => setNestedValue(prev, key, value));
  }, []);

  // --- Handler für Tonalität ---
  const handleToneInputChange = useCallback((e) => {
    const value = e.target.value;
    setSelectedTone(value);
    // Zeige Vorschläge nur, wenn etwas eingegeben wird und Vorschläge existieren
    // filteredTones wird jetzt unten berechnet, daher hier keine direkte Abhängigkeit mehr nötig
    setShowToneSuggestions(value.trim().length > 0);
  }, []); // filteredTones entfernt

  const handleToneSuggestionClick = useCallback((tone) => {
    setSelectedTone(tone);
    setShowToneSuggestions(false);
    toneInputRef.current?.focus(); // Fokus zurück ins Input-Feld
  }, []);

  // --- Tonalitätsvorschläge (vereinfacht) ---
  const toneSuggestions = useMemo(() => {
    // Extrahiere Töne aus writing_instructions (falls vorhanden)
    const baseTones = promptData?.writing_instructions?.overall_tone || [];
    const constraintsTones = promptData?.writing_instructions?.constraints || [];
    // Kombiniere und dedupliziere
    const allTones = [...new Set([...baseTones, ...constraintsTones])];
    // Filtere leere Strings oder Strings, die keine Töne sind (optional, je nach Datenqualität)
    return allTones.filter(t => typeof t === 'string' && t.trim().length > 0);
  }, [promptData]);

  const filteredTones = useMemo(() => {
    if (!selectedTone.trim()) return [];
    const lowerInput = selectedTone.toLowerCase();
    // Zeige Vorschläge nur, wenn sie den Input enthalten
    const suggestions = toneSuggestions.filter(tone =>
      tone.toLowerCase().includes(lowerInput)
    );
    // Aktualisiere Sichtbarkeit basierend auf gefilterten Vorschlägen
    setShowToneSuggestions(suggestions.length > 0 && selectedTone.trim().length > 0);
    return suggestions;
  }, [selectedTone, toneSuggestions]);

  // --- Klick außerhalb der Tone Suggestions schließen ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (toneInputRef.current && !toneInputRef.current.contains(event.target)) {
        setShowToneSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Handler für Aktionen ---
  const handleCopy = useCallback(async () => {
    if (!generatedText || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(generatedText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    } catch (err) {
      setErrorMsg("Fehler beim Kopieren: " + err.message);
    }
  }, [generatedText]);

  const handleWebShare = useCallback(async () => {
    if (!generatedText || !navigator.share) return;
    try {
      await navigator.share({
        title: promptData?.name || 'Generierter Text', // Titel aus promptData nehmen
        text: generatedText,
        // url: window.location.href, // Optional: URL der Seite teilen
      });
    } catch (err) {
      // Ignoriere AbortError (Benutzer hat Teilen abgebrochen)
      if (err.name !== 'AbortError') {
        setErrorMsg("Fehler beim Teilen: " + err.message);
      }
    }
  }, [generatedText, promptData]); // promptData als Abhängigkeit

  // --- API Calls (ANGEPASST: ohne variantId) ---
  const callGenerateAPI = useCallback(async (instruction = null) => {
    setLoading(true);
    setIsRefining(!!instruction); // Setze isRefining, wenn eine Anweisung übergeben wird
    setErrorMsg('');
    setDocxError(''); // DOCX Fehler zurücksetzen

    const payload = {
      slug: slug, // Slug bleibt wichtig
      // variantId: selectedVariantId, // <-- ENTFERNT
      placeholders: placeholderValues,
      tone: selectedTone || undefined, // Nur senden, wenn nicht leer
    };

    // Für Refine: Füge Originaltext und Anweisung hinzu
    if (instruction) {
      payload.originalText = generatedText;
      payload.refineInstruction = instruction;
    }

    console.log("Sende Payload an Server Action:", payload);

    try {
      // Wähle die richtige Server Action
      const result = instruction
        ? await refineText(payload)
        : await generateText(payload);

      if (result.error) {
        throw new Error(result.error);
      }
      setGeneratedText(result.text || '');
      // Optional: Tonalität nach erfolgreicher Generierung zurücksetzen?
      // setSelectedTone('');
      // Optional: Zusatzinfos nach Refine zurücksetzen
      if (instruction) {
        setAdditionalInfo('');
        setShowRefineInput(false); // Refine-Input schließen
      }
    } catch (err) {
      console.error("Fehler bei API Call:", err);
      setErrorMsg(err.message || "Ein unbekannter Fehler ist aufgetreten.");
      setGeneratedText(''); // Text bei Fehler leeren
    } finally {
      setLoading(false);
      setIsRefining(false);
    }
  }, [slug, placeholderValues, selectedTone, generatedText]); // selectedVariantId entfernt

  const handleInitialGenerate = useCallback(() => {
    callGenerateAPI();
  }, [callGenerateAPI]);

  const handleRephrase = useCallback(() => {
    callGenerateAPI('Formuliere den Text neu.'); // Feste Anweisung für Rephrase
  }, [callGenerateAPI]);

  const handleToggleRefineInput = useCallback(() => {
    setShowRefineInput(prev => !prev);
  }, []);

  const handleRefine = useCallback(() => {
    if (!additionalInfo.trim()) return;
    callGenerateAPI(additionalInfo); // Nutze Text aus additionalInfo als Anweisung
  }, [callGenerateAPI, additionalInfo]);

  // --- NEUER HANDLER: Auf den Punkt kommen ---
  const handleGetToThePoint = useCallback(() => {
    callGenerateAPI('Formuliere den Text deutlich kürzer und direkter, ohne an Höflichkeit zu verlieren. Konzentriere dich auf die Kernbotschaft.');
  }, [callGenerateAPI]);
  // --- ENDE NEUER HANDLER ---

  // --- Handler für E-Mail Senden (ANGEPASST für API Route) ---
  const handleSendEmail = useCallback(async () => {
    if (!recipientEmail || !generatedText) return;
    setIsSendingEmail(true);
    setSendEmailError('');
    setSendEmailSuccess(false);

    try {
      const subject = `Dein Text von PromptHaus: ${promptData?.name || 'Generierter Text'}`; // Titel aus promptData

      // --- NEU: Fetch-Aufruf an die API Route ---
      const response = await fetch('/api/send-email', { // Pfad zur API Route
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientEmail: recipientEmail,
          subject: subject,
          emailText: generatedText, // Stelle sicher, dass der Key 'emailText' mit der API Route übereinstimmt
        }),
      });

      const result = await response.json();
      // --- ENDE NEU ---

      if (!response.ok || result.error) {
        // Versuche, die Fehlermeldung aus der JSON-Antwort zu verwenden
        throw new Error(result.error || `Fehler beim Senden: ${response.statusText}`);
      }

      setSendEmailSuccess(true);
      // Optional: Dialog nach kurzer Zeit schließen oder Button ändern
      setTimeout(() => {
          setShowEmailDialog(false);
          setSendEmailSuccess(false); // Zustand zurücksetzen für nächsten Versuch
          setRecipientEmail(''); // Empfänger leeren
      }, 2000);
    } catch (err) {
      // Setze die Fehlermeldung aus dem Error-Objekt
      setSendEmailError(err.message || "E-Mail konnte nicht gesendet werden.");
    } finally {
      setIsSendingEmail(false);
    }
  // promptData und slug als Abhängigkeiten hinzugefügt, da sie im subject verwendet werden
  }, [recipientEmail, generatedText, promptData, slug]);

  // --- Handler für DOCX Download ---
  const handleDownloadDocx = useCallback(async () => {
      if (!generatedText) return;
      setIsDownloadingDocx(true);
      setDocxError('');
      try {
          const doc = new Document({
              sections: [{
                  properties: {},
                  children: generatedText.split('\n').map(line =>
                      new Paragraph({
                          children: [new TextRun(line)],
                      })
                  ),
              }],
          });

          const blob = await Packer.toBlob(doc);
          // Dateiname generieren (Slug + Datum)
          const filename = `${slug || 'generierter-text'}_${new Date().toISOString().split('T')[0]}.docx`;
          saveAs(blob, filename);

      } catch (err) {
          console.error("Fehler beim Erstellen/Herunterladen der DOCX-Datei:", err);
          setDocxError("Fehler beim Erstellen der DOCX-Datei: " + err.message);
      } finally {
          setIsDownloadingDocx(false);
      }
  }, [generatedText, slug]);


  // --- Rückgabewerte des Hooks ---
  return {
    // States
    // selectedVariantId, // Entfernt
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
    // currentVariant, // Entfernt
    // generationVariants, // Entfernt
    promptData, // Gib promptData direkt zurück, falls benötigt

    // Setters & Handlers
    // setSelectedVariantId, // Entfernt
    handleInputChange,
    handleToneInputChange,
    handleToneSuggestionClick,
    handleCopy,
    handleWebShare,
    handleInitialGenerate,
    handleRephrase,
    handleToggleRefineInput,
    handleRefine,
    handleGetToThePoint, // Neuer Handler
    setShowEmailDialog,
    setRecipientEmail,
    handleSendEmail, // Bleibt, ruft jetzt fetch auf
    setAccordionValue,
    handleDownloadDocx,
    getNestedValue, // Behalten
    toneSuggestions, // Behalten
    setAdditionalInfo, // Behalten
  };
}
