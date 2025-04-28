// app/(public)/prompt/actions.js
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
    return createSupabaseAdminClient(supabaseUrl, serviceKey);
}
// ======= ENDE HILFSFUNKTION =======


// ======= HILFSFUNKTION: Zugriffsprüfung =======
/**
 * Prüft, ob der aktuelle Benutzer Zugriff auf das Prompt-Paket mit dem gegebenen Slug hat.
 * @param {string} slug - Der Slug des Prompt-Pakets.
 * @returns {Promise<{hasAccess: boolean, packageData: object | null, user: object | null, error: string | null}>}
 */
async function checkAccess(slug) {
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


// --- Funktion: generateText ---
export async function generateText(payload) {
  console.log("[generateText] Server Action aufgerufen mit Payload:", payload);
  const { placeholders, tone, slug } = payload;

  // --- Berechtigungsprüfung mit Hilfsfunktion ---
  const accessResult = await checkAccess(slug);

  if (accessResult.error || !accessResult.hasAccess) {
      console.error(`[generateText] Zugriff verweigert oder Fehler: ${accessResult.error}`);
      return { error: accessResult.error || "Zugriff verweigert." };
  }

  const promptPackage = accessResult.packageData;
  // --- ENDE Berechtigungsprüfung ---

  // Prüfen, ob die Prompt-Daten im Paket vorhanden sind (sollte durch checkAccess abgedeckt sein, aber sicher ist sicher)
  if (!promptPackage || !promptPackage.context || !promptPackage.writing_instructions) {
      console.error(`[generateText] Fehlende Prompt-Daten im Paket ${promptPackage?.id} für Slug ${slug}.`);
      return { error: "Fehlerhafte Prompt-Konfiguration im Paket." };
  }

  // Prompt für die AI zusammenbauen
  const systemPrompt = `DEINE ROLLE:
Du bist der „Prompthaus Textarchitekt“. Deine Aufgabe: Erstelle auf Basis eines strukturierten JSON (Kontext, writing_instructions) und Benutzereingaben (semantic_data) einen hochwertigen, stilistisch perfekten deutschen Text.

NUTZE:
- Kontext, writing_instructions und semantic_data als Grundlage.
- Integriere Benutzerangaben natürlich und sinnvoll an passenden Stellen.

ACHTE AUF:
- Anrede exakt gemäß formality_level (du oder Sie).
- Kein Smalltalk oder Einleitungsfloskeln im ersten Satz (z.B. 'Ich hoffe, es geht Ihnen gut.' verboten).
- Abschluss mit „Mit freundlichen Grüßen“, danach kein Name oder Platzhalter – Text endet direkt.
- Sprache: natürlich, grammatikalisch korrekt, klar, idiomatisch.
- Stilmittel (z.B. Emojis, Aufzählungen) nur nutzen, wenn stylistic_rules es erlauben.

WEITERE REGELN:
- JSON als Leitfaden nutzen, nicht als starres Skript.
- Bei Unsicherheiten Priorität auf goal, writing_instructions und key_messages.
- Gib ausschließlich den fertigen Fließtext zurück, ohne Kommentare oder Metainfos.`;

  let userMessage = "Hier sind die spezifischen Informationen für diesen Text:\n";
  userMessage += `Kontext aus JSON: ${JSON.stringify(promptPackage.context)}\n`;
  userMessage += `Schreibanweisungen aus JSON: ${JSON.stringify(promptPackage.writing_instructions)}\n`;
  if (tone) {
    userMessage += `Vom Benutzer gewünschte zusätzliche Tonalität: ${tone}\n`;
  }
  userMessage += "Vom Benutzer bereitgestellte Werte:\n";
  for (const key in placeholders) {
    if (placeholders[key] !== null && placeholders[key] !== undefined && placeholders[key] !== '') {
        // Formatierung des Schlüssels für bessere Lesbarkeit in der AI-Nachricht (optional)
        const formattedKey = key.replace(/_/g, ' ');
        userMessage += `- ${formattedKey}: ${placeholders[key]}\n`;
    }
  }
  userMessage += "\nGeneriere jetzt den Text basierend auf deiner Rolle und diesen Informationen.";

  console.log("[generateText] --- System Prompt (Rolle) ---");
  // console.log(systemPrompt); // Kann für Debugging aktiviert werden
  console.log("[generateText] --- User Message (Kontext & Eingaben) ---");
  // console.log(userMessage); // Kann für Debugging aktiviert werden

  // AI API aufrufen mit fetchWithUltraBackoff
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log("[generateText] Rufe OpenAI API mit fetchWithUltraBackoff auf...");
    const response = await fetchWithUltraBackoff(() =>
      openai.chat.completions.create({
        model: "gpt-4o-mini", // Oder anderes Modell
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
        top_p: 0.95,
        presence_penalty: 0.3,
        frequency_penalty: 0.2,
        max_tokens: 1500,
        stop: ["User:", "System:"],
        seed: 12345
      }),
      { maxRetries: 5, baseDelay: 500, softFail: true } // Optionen explizit setzen
    );

    // Angepasste Fehler- und Erfolgsbehandlung
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


// --- Funktion: refineText ---
export async function refineText(payload) {
  console.log("[refineText] Server Action aufgerufen mit Payload:", payload);
  const { originalText, tone, refineInstruction, slug } = payload; // placeholders entfernt, da sie im refine prompt nicht direkt verwendet werden

  // --- Berechtigungsprüfung mit Hilfsfunktion ---
  const accessResult = await checkAccess(slug);

  if (accessResult.error || !accessResult.hasAccess) {
      console.error(`[refineText] Zugriff verweigert oder Fehler: ${accessResult.error}`);
      return { error: accessResult.error || "Zugriff verweigert." };
  }
  // --- ENDE Berechtigungsprüfung ---

  // Prompt für die AI zusammenbauen
  let systemPrompt = "Du bist ein Assistent zur Textüberarbeitung.\n";
  systemPrompt += `Der Benutzer hat folgenden Text generiert:\n"${originalText}"\n`;
  if (tone) {
    systemPrompt += `Gewünschte Tonalität für die Überarbeitung: ${tone}\n`;
  }
  systemPrompt += `Die Anweisung zur Überarbeitung lautet: "${refineInstruction || 'Formuliere den Text neu.'}"\n`;
  systemPrompt += "Behalte den ursprünglichen Sinn bei, aber wende die Anweisung an.\n";
  systemPrompt += "Gib nur den überarbeiteten Text zurück.";

  console.log("[refineText] --- System Prompt ---");
  // console.log(systemPrompt); // Kann für Debugging aktiviert werden

  // AI API aufrufen mit fetchWithUltraBackoff
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    console.log("[refineText] Rufe OpenAI API mit fetchWithUltraBackoff auf...");
    const response = await fetchWithUltraBackoff(() =>
        openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Oder anderes Modell für Refine
            messages: [{ role: "system", content: systemPrompt }],
            temperature: 0.7,
            max_tokens: 1500, // Max Tokens ggf. anpassen
            frequency_penalty: 0.1,
            presence_penalty: 0.0,
        }),
        { maxRetries: 3, baseDelay: 400, softFail: true } // Etwas weniger Retries für Refine?
    );

    // Angepasste Fehler- und Erfolgsbehandlung
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
