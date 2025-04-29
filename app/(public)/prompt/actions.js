// app/(public)/prompt/actions.js - ANGEPASST mit neuer Funktion refineSelection

'use server';

// ======= Imports =======
import { createClient } from '@/lib/supabase/server'; // Für User-Client (Auth-Check)
import OpenAI from 'openai'; // Für AI API Aufrufe
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'; // Für Admin-Client (DB-Zugriffe)
import { fetchWithUltraBackoff } from '@/lib/fetchWithBackoff'; // Importierte Backoff-Funktion

// --- Konstanten für spezielle Zugriffe ---
const FREE_PROMPT_SLUG = process.env.FREE_PROMPT_SLUG || 'testprompt';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL; // Admin-E-Mail aus Umgebungsvariablen

// ======= HILFSFUNKTION: Korrekte Admin Client Initialisierung =======
function getSupabaseAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error("[AdminClient] Supabase URL oder Service Key fehlt!");
        throw new Error('Server-Konfigurationsfehler für Admin-Operationen.');
    }
    // Wichtig: Auth-Optionen hinzufügen, um Warnungen zu vermeiden
    return createSupabaseAdminClient(supabaseUrl, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
// ======= ENDE HILFSFUNKTION =======


// ======= HILFSFUNKTION: Zugriffsprüfung (unverändert) =======
async function checkAccess(slug) {
    // ... (Code bleibt unverändert) ...
    const supabase = createClient(); // Server Client für User Auth
    const supabaseAdmin = getSupabaseAdminClient(); // Admin Client für DB-Zugriffe
    let promptPackage = null;
    let user = null;

    // 1. Lade Paketdaten (immer benötigt, außer bei Fehler)
    try {
        const { data: pkg, error: pkgError } = await supabaseAdmin
            .from('prompt_packages')
            .select('id, slug, price, context, semantic_data, writing_instructions') // Alle relevanten Daten laden
            .eq('slug', slug)
            .single();

        if (pkgError || !pkg) {
            console.error(`[checkAccess] Paket für Slug '${slug}' nicht gefunden. Fehler: ${pkgError?.message}`);
            // Spezielle Behandlung für fehlenden Free Prompt
            if (slug === FREE_PROMPT_SLUG) {
                return { hasAccess: false, packageData: null, user: null, error: 'Konfiguration für kostenlosen Prompt fehlerhaft.' };
            }
            return { hasAccess: false, packageData: null, user: null, error: 'Prompt-Paket nicht gefunden.' };
        }
        promptPackage = pkg;
        console.log(`[checkAccess] Paketdaten für Slug '${slug}' geladen (ID: ${promptPackage.id}).`);

    } catch (dbError) {
        console.error("[checkAccess] Datenbankfehler beim Laden des Pakets:", dbError);
        return { hasAccess: false, packageData: null, user: null, error: "Datenbankfehler beim Laden des Pakets." };
    }

    // 2. Prüfe auf kostenlosen Prompt
    if (slug === FREE_PROMPT_SLUG) {
        console.log(`[checkAccess] Zugriff als kostenloser Prompt '${FREE_PROMPT_SLUG}'.`);
        return { hasAccess: true, packageData: promptPackage, user: null, error: null };
    }

    // 3. Authentifiziere User (für nicht-kostenlose Prompts)
    try {
        const { data: authData, error: userError } = await supabase.auth.getUser();
        if (userError || !authData.user) {
            console.error("[checkAccess] Authentifizierungsfehler oder kein User:", userError?.message);
            return { hasAccess: false, packageData: promptPackage, user: null, error: 'Authentifizierung fehlgeschlagen. Bitte einloggen.' };
        }
        user = authData.user;
        console.log(`[checkAccess] Authentifiziert als: ${user.email}`);
    } catch (authError) {
         console.error("[checkAccess] Unerwarteter Fehler bei getUser:", authError);
         return { hasAccess: false, packageData: promptPackage, user: null, error: 'Authentifizierungsfehler.' };
    }


    // 4. Prüfe auf Admin oder Testuser
    if (user.email === ADMIN_EMAIL || user.email === TEST_USER_EMAIL) {
        console.log(`[checkAccess] Zugriff gewährt: Spezieller User (${user.email}).`);
        return { hasAccess: true, packageData: promptPackage, user: user, error: null };
    }

    // 5. Prüfe Kauf für reguläre User
    try {
        console.log(`[checkAccess] Prüfe Kauf für User ${user.id} auf Paket ${promptPackage.id}...`);
        const { count, error: purchaseError } = await supabaseAdmin
            .from('user_purchases')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('prompt_package_id', promptPackage.id);

        if (purchaseError) {
            console.error("[checkAccess] Fehler bei der Zugriffsprüfung in DB (user_purchases):", purchaseError.message);
            return { hasAccess: false, packageData: promptPackage, user: user, error: 'Fehler bei der Überprüfung der Zugriffsberechtigung.' };
        }

        if (count !== null && count > 0) {
            console.log(`[checkAccess] Zugriff gewährt (Kauf) für User ${user.email} (ID: ${user.id}) auf Paket ${promptPackage.id}.`);
            return { hasAccess: true, packageData: promptPackage, user: user, error: null };
        } else {
            console.log(`[checkAccess] Zugriff verweigert (kein Kauf) für User ${user.email} (ID: ${user.id}) auf Paket ${promptPackage.id}.`);
            return { hasAccess: false, packageData: promptPackage, user: user, error: "Du hast keinen Zugriff auf dieses Prompt-Paket." };
        }
    } catch (purchaseDbError) {
        console.error("[checkAccess] Unerwarteter DB-Fehler bei Kaufprüfung:", purchaseDbError);
        return { hasAccess: false, packageData: promptPackage, user: user, error: 'Fehler bei der Überprüfung der Zugriffsberechtigung.' };
    }
}
// ======= ENDE HILFSFUNKTION Zugriffsprüfung =======


// --- Funktion: generateText (unverändert) ---
export async function generateText(payload) {
  // ... (Code bleibt unverändert) ...
  console.log("[generateText] Server Action aufgerufen mit Payload:", payload);
  // --- NEU: styleTags aus Payload holen ---
  const { placeholders, tone, slug, styleTags } = payload;
  const supabaseAdmin = getSupabaseAdminClient(); // Admin Client für DB-Zugriffe

  // --- Berechtigungsprüfung mit Hilfsfunktion ---
  const accessResult = await checkAccess(slug);

  if (accessResult.error || !accessResult.hasAccess) {
      console.error(`[generateText] Zugriff verweigert oder Fehler: ${accessResult.error}`);
      return { error: accessResult.error || "Zugriff verweigert." };
  }

  const promptPackage = accessResult.packageData;
  // --- ENDE Berechtigungsprüfung ---

  // Prüfen, ob die Prompt-Daten im Paket vorhanden sind
  if (!promptPackage || !promptPackage.context || !promptPackage.writing_instructions) {
      console.error(`[generateText] Fehlende Prompt-Daten im Paket ${promptPackage?.id} für Slug ${slug}.`);
      return { error: "Fehlerhafte Prompt-Konfiguration im Paket." };
  }

  // --- LLM-Einstellungen aus der Datenbank laden ---
  let llmSettings;
  const defaultSystemPrompt = 'Du bist ein hilfreicher Assistent.'; // Fallback
  try {
      console.log("[generateText] Lade LLM-Einstellungen aus der Datenbank...");
      const { data: settingsData, error: settingsError } = await supabaseAdmin
          .from('llm_settings')
          .select('*')
          .limit(1) // Annahme: Es gibt nur eine Zeile für die globalen Einstellungen
          .maybeSingle(); // Gibt null zurück, wenn keine Zeile gefunden wird, statt Fehler

      if (settingsError) {
          console.error("[generateText] Fehler beim Laden der LLM-Einstellungen:", settingsError.message);
          llmSettings = null; // Signalisiert, dass Defaults verwendet werden sollen
      } else if (!settingsData) {
          console.warn("[generateText] Keine LLM-Einstellungen in der Datenbank gefunden. Verwende Fallback-Werte.");
          llmSettings = null;
      } else {
          llmSettings = settingsData;
          console.log("[generateText] LLM-Einstellungen erfolgreich geladen.");
      }
  } catch (e) {
      console.error("[generateText] Unerwarteter Fehler beim Laden der LLM-Einstellungen:", e);
      llmSettings = null;
  }
  // --- ENDE LLM-Einstellungen laden ---

  // --- System-Prompt aus Einstellungen oder Fallback verwenden ---
  const systemPrompt = llmSettings?.system_prompt || defaultSystemPrompt;
  // --- ENDE System-Prompt ---

  // User Message zusammenbauen
  let userMessage = "Hier sind die spezifischen Informationen für diesen Text:\n";
  userMessage += `Kontext aus JSON: ${JSON.stringify(promptPackage.context)}\n`;
  userMessage += `Schreibanweisungen aus JSON: ${JSON.stringify(promptPackage.writing_instructions)}\n`;

  // --- NEU: Style-Anweisung für generateText hinzufügen ---
  let styleInstruction = "";
  if (styleTags && styleTags.length > 0) {
      styleInstruction += `Gewünschte Stil-Attribute (Tags): [${styleTags.join(', ')}]. `;
  }
  if (tone) {
      styleInstruction += `Zusätzliche Stil-Beschreibung: "${tone}". `;
  }
  if (styleInstruction) {
      userMessage += `\n${styleInstruction.trim()}\n`;
  }
  // --- ENDE NEU ---

  userMessage += "Vom Benutzer bereitgestellte Werte:\n";
  for (const key in placeholders) {
    if (placeholders[key] !== null && placeholders[key] !== undefined && placeholders[key] !== '') {
        const formattedKey = key.replace(/_/g, ' ');
        userMessage += `- ${formattedKey}: ${placeholders[key]}\n`;
    }
  }
  userMessage += "\nGeneriere jetzt den Text basierend auf deiner Rolle und diesen Informationen.";

  console.log("[generateText] --- System Prompt (aus DB oder Fallback) ---");
  // console.log(systemPrompt); // Kann für Debugging aktiviert werden
  console.log("[generateText] --- User Message (Kontext, Stil & Eingaben) ---");
  // console.log(userMessage); // Kann für Debugging aktiviert werden

  // AI API aufrufen mit fetchWithUltraBackoff
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // --- Stop-Sequenzen korrekt verarbeiten ---
    let stopSequences = ["User:", "System:"]; // Fallback
    if (llmSettings?.stop_sequences) {
        if (Array.isArray(llmSettings.stop_sequences)) {
            stopSequences = llmSettings.stop_sequences.filter(s => typeof s === 'string' && s.trim() !== '');
        } else if (typeof llmSettings.stop_sequences === 'string') {
            stopSequences = llmSettings.stop_sequences.split(',').map(s => s.trim()).filter(s => s);
        }
    }
    // --- ENDE Stop-Sequenzen ---

    // --- API-Parameter aus llmSettings oder Defaults ---
    const apiParams = {
        model: llmSettings?.model || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: llmSettings?.temperature ?? 0.7,
        top_p: llmSettings?.top_p ?? 0.95,
        presence_penalty: llmSettings?.presence_penalty ?? 0.3,
        frequency_penalty: llmSettings?.frequency_penalty ?? 0.2,
        max_tokens: llmSettings?.max_tokens ?? 1500,
        stop: stopSequences,
        ...(llmSettings?.seed !== null && llmSettings?.seed !== undefined && { seed: llmSettings.seed }),
    };
    console.log("[generateText] Verwendete OpenAI API Parameter:", apiParams);
    // --- ENDE API-Parameter ---

    console.log("[generateText] Rufe OpenAI API mit fetchWithUltraBackoff auf...");
    const response = await fetchWithUltraBackoff(() =>
      openai.chat.completions.create(apiParams),
      { maxRetries: 5, baseDelay: 500, softFail: true }
    );

    // Fehler- und Erfolgsbehandlung
    if (response.error) {
      console.error("[generateText] Sanfter Fehler bei AI API (fetchWithUltraBackoff):", response.message);
      return { error: `Fehler bei der Textgenerierung: ${response.message}. Bitte versuche es erneut.` };
    }

    const generatedContent = response.choices?.[0]?.message?.content;

    if (!generatedContent) {
      console.error("[generateText] Kein Inhalt in der AI-Antwort gefunden.");
      return { error: "Keine gültige Antwort von der AI erhalten." };
    }

    console.log("[generateText] AI-Antwort erfolgreich erhalten.");
    return { text: generatedContent.trim() };

  } catch (aiError) {
    // Harter Fehler
    console.error("[generateText] Harter Abbruchfehler bei AI API:", aiError);
    let errorMessage = "Ein schwerwiegender Fehler ist bei der Textgenerierung aufgetreten.";
    if (aiError instanceof Error) {
        errorMessage += ` Details: ${aiError.message}`;
    }
    return { error: errorMessage };
  }
}


// --- Funktion: refineText (unverändert) ---
export async function refineText(payload) {
  // ... (Code bleibt unverändert) ...
  console.log("[refineText] Server Action aufgerufen mit Payload:", payload);
  // --- NEU: styleTags aus Payload holen ---
  const { originalText, tone, refineInstruction, slug, styleTags } = payload;
  const supabaseAdmin = getSupabaseAdminClient(); // Admin Client für DB-Zugriffe

  // --- Berechtigungsprüfung (bleibt gleich) ---
  const accessResult = await checkAccess(slug);
  if (accessResult.error || !accessResult.hasAccess) {
      console.error(`[refineText] Zugriff verweigert oder Fehler: ${accessResult.error}`);
      return { error: accessResult.error || "Zugriff verweigert." };
  }
  // --- ENDE Berechtigungsprüfung ---

  // --- LLM-Einstellungen laden (wie in generateText) ---
  let llmSettings;
  try {
      console.log("[refineText] Lade LLM-Einstellungen aus der Datenbank...");
      const { data: settingsData, error: settingsError } = await supabaseAdmin
          .from('llm_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

      if (settingsError) {
          console.error("[refineText] Fehler beim Laden der LLM-Einstellungen:", settingsError.message);
          llmSettings = null;
      } else if (!settingsData) {
          console.warn("[refineText] Keine LLM-Einstellungen in der Datenbank gefunden. Verwende Fallback-Werte.");
          llmSettings = null;
      } else {
          llmSettings = settingsData;
          console.log("[refineText] LLM-Einstellungen erfolgreich geladen.");
      }
  } catch (e) {
      console.error("[refineText] Unerwarteter Fehler beim Laden der LLM-Einstellungen:", e);
      llmSettings = null;
  }
  // --- ENDE LLM-Einstellungen laden ---

  // Prompt für die AI zusammenbauen
  let systemPrompt = "Du bist ein Assistent zur Textüberarbeitung.\n";
  systemPrompt += `Der Benutzer hat folgenden Text generiert:\n"${originalText}"\n`;

  // --- NEU: Style-Anweisung für refineText hinzufügen ---
  let styleInstruction = "";
  if (styleTags && styleTags.length > 0) {
      styleInstruction += `Gewünschte Stil-Attribute (Tags): [${styleTags.join(', ')}]. `;
  }
  if (tone) {
      styleInstruction += `Zusätzliche Stil-Beschreibung: "${tone}". `;
  }
  if (styleInstruction) {
      systemPrompt += `\nBerücksichtige bei der Überarbeitung die folgenden Stilvorgaben: ${styleInstruction.trim()}\n`;
  }
  // --- ENDE NEU ---

  systemPrompt += `Die Anweisung zur Überarbeitung lautet: "${refineInstruction || 'Formuliere den Text neu.'}"\n`;
  systemPrompt += "Behalte den ursprünglichen Sinn bei, aber wende die Anweisung und die Stilvorgaben an.\n"; // Stilvorgaben erwähnt
  systemPrompt += "Gib nur den überarbeiteten Text zurück.";

  console.log("[refineText] --- System Prompt ---");
  // console.log(systemPrompt);

  // AI API aufrufen mit fetchWithUltraBackoff (ANGEPASST: Parameter aus llmSettings)
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // --- API-Parameter aus llmSettings oder Defaults (ggf. anderes Modell für Refine?) ---
    const refineModel = llmSettings?.model || "gpt-3.5-turbo"; // Evtl. günstigeres Modell für Refine?
    const apiParams = {
        model: refineModel,
        messages: [{ role: "system", content: systemPrompt }],
        temperature: llmSettings?.temperature ?? 0.7,
        max_tokens: llmSettings?.max_tokens ?? 1500,
        frequency_penalty: llmSettings?.frequency_penalty ?? 0.1,
        presence_penalty: llmSettings?.presence_penalty ?? 0.0,
        // Stop-Sequenzen und Seed könnten hier weniger relevant sein
    };
    console.log("[refineText] Verwendete OpenAI API Parameter:", apiParams);
    // --- ENDE API-Parameter ---

    console.log("[refineText] Rufe OpenAI API mit fetchWithUltraBackoff auf...");
    const response = await fetchWithUltraBackoff(() =>
        openai.chat.completions.create(apiParams),
        { maxRetries: 3, baseDelay: 400, softFail: true }
    );

    // Fehler- und Erfolgsbehandlung
    if (response.error) {
      console.error("[refineText] Sanfter Fehler bei AI API (fetchWithUltraBackoff):", response.message);
      return { error: `Fehler bei der Textüberarbeitung: ${response.message}. Bitte versuche es erneut.` };
    }

    const refinedContent = response.choices?.[0]?.message?.content;

    if (!refinedContent) {
      console.error("[refineText] Kein Inhalt in der AI-Antwort gefunden.");
      return { error: "Keine gültige Überarbeitung von der AI erhalten." };
    }

    console.log("[refineText] AI-Antwort erfolgreich erhalten.");
    return { text: refinedContent.trim() };

  } catch (aiError) {
    // Harter Fehler
    console.error("[refineText] Harter Abbruchfehler bei AI API:", aiError);
    let errorMessage = "Ein schwerwiegender Fehler ist bei der Textüberarbeitung aufgetreten.";
    if (aiError instanceof Error) {
        errorMessage += ` Details: ${aiError.message}`;
    }
    return { error: errorMessage };
  }
}

// --- NEU: Funktion: refineSelection ---
// Hilfsfunktion zum Übersetzen des Action Types
function getActionInstruction(actionType) {
    switch (actionType) {
        case 'rephrase': return 'Formuliere den Textabschnitt neu, behalte aber den Sinn bei.';
        case 'shorten': return 'Kürze den Textabschnitt deutlich, ohne wichtige Informationen zu verlieren.';
        case 'formalize': return 'Formuliere den Textabschnitt formeller.';
        case 'warmup': return 'Formuliere den Textabschnitt herzlicher und persönlicher.';
        default: return 'Überarbeite den Textabschnitt.'; // Fallback
    }
}

export async function refineSelection(payload) {
  console.log("[refineSelection] Server Action aufgerufen mit Payload:", payload);
  const { selectedText, fullText, actionType, slug } = payload;
  const supabaseAdmin = getSupabaseAdminClient(); // Admin Client für DB-Zugriffe

  // --- Validierung ---
  if (!selectedText || !fullText || !actionType || !slug) {
      console.error("[refineSelection] Ungültiger Payload:", payload);
      return { error: "Ungültige Anfrage: Es fehlen erforderliche Daten." };
  }

  // --- Berechtigungsprüfung ---
  const accessResult = await checkAccess(slug);
  if (accessResult.error || !accessResult.hasAccess) {
      console.error(`[refineSelection] Zugriff verweigert oder Fehler: ${accessResult.error}`);
      return { error: accessResult.error || "Zugriff verweigert." };
  }
  // --- ENDE Berechtigungsprüfung ---

  // --- LLM-Einstellungen laden ---
  let llmSettings;
  try {
      console.log("[refineSelection] Lade LLM-Einstellungen...");
      const { data: settingsData, error: settingsError } = await supabaseAdmin
          .from('llm_settings')
          .select('*')
          .limit(1)
          .maybeSingle();
      if (settingsError) throw settingsError;
      llmSettings = settingsData; // Kann null sein, wenn nichts gefunden
      console.log("[refineSelection] LLM-Einstellungen geladen:", llmSettings ? 'Ja' : 'Nein, verwende Defaults');
  } catch (e) {
      console.error("[refineSelection] Fehler beim Laden der LLM-Einstellungen:", e);
      llmSettings = null; // Fallback
  }
  // --- ENDE LLM-Einstellungen laden ---

  // --- System-Prompt für gezielte Modifikation ---
  const actionInstruction = getActionInstruction(actionType);
  let systemPrompt = `Du bist ein Assistent zur gezielten Textmodifikation.
Der vollständige Text lautet:
--- VOLLSTÄNDIGER TEXT START ---
${fullText}
--- VOLLSTÄNDIGER TEXT ENDE ---

Der vom Benutzer markierte Abschnitt, der modifiziert werden soll, ist:
--- MARKIERTER ABSCHNITT START ---
${selectedText}
--- MARKIERTER ABSCHNITT ENDE ---

Die gewünschte Aktion ist: "${actionInstruction}"

Deine Aufgabe: Modifiziere NUR den markierten Abschnitt im Kontext des vollständigen Textes gemäß der Aktion.
WICHTIG: Gib NUR den modifizierten Textabschnitt zurück. Keine Einleitung, keine Erklärung, kein Zitat, nur der reine, überarbeitete Text des markierten Abschnitts.`;

  console.log("[refineSelection] --- System Prompt ---");
  // console.log(systemPrompt);

  // --- AI API aufrufen ---
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Modellwahl: Ggf. ein schnelleres/günstigeres Modell für diese Aufgabe?
    const model = llmSettings?.model || "gpt-4o-mini"; // Oder "gpt-3.5-turbo"
    const apiParams = {
        model: model,
        messages: [{ role: "system", content: systemPrompt }],
        temperature: llmSettings?.temperature ?? 0.5, // Evtl. etwas weniger kreativ?
        max_tokens: Math.max(50, Math.round(selectedText.length * 1.5)), // Max Tokens basierend auf Auswahl + Puffer
        frequency_penalty: llmSettings?.frequency_penalty ?? 0.1,
        presence_penalty: llmSettings?.presence_penalty ?? 0.0,
    };
    console.log("[refineSelection] Verwendete OpenAI API Parameter:", apiParams);

    console.log("[refineSelection] Rufe OpenAI API mit fetchWithUltraBackoff auf...");
    const response = await fetchWithUltraBackoff(() =>
        openai.chat.completions.create(apiParams),
        { maxRetries: 3, baseDelay: 300, softFail: true } // Kürzere Delays für schnelle Aktionen?
    );

    // Fehler- und Erfolgsbehandlung
    if (response.error) {
      console.error("[refineSelection] Sanfter Fehler bei AI API:", response.message);
      return { error: `Fehler bei der Textmodifikation: ${response.message}.` };
    }

    const refinedSelectionContent = response.choices?.[0]?.message?.content;

    if (!refinedSelectionContent) {
      console.error("[refineSelection] Kein Inhalt in der AI-Antwort.");
      return { error: "Keine gültige Modifikation von der AI erhalten." };
    }

    console.log("[refineSelection] AI-Antwort erfolgreich erhalten.");
    // Gib nur den modifizierten Text zurück
    return { modifiedText: refinedSelectionContent.trim() };

  } catch (aiError) {
    // Harter Fehler
    console.error("[refineSelection] Harter Abbruchfehler bei AI API:", aiError);
    let errorMessage = "Ein schwerwiegender Fehler ist bei der Textmodifikation aufgetreten.";
    if (aiError instanceof Error) {
        errorMessage += ` Details: ${aiError.message}`;
    }
    return { error: errorMessage };
  }
}
// --- ENDE NEUE FUNKTION ---
