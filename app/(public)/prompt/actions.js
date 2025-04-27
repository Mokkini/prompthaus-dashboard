// app/(public)/prompt/actions.js
'use server';

// ======= Imports =======
import { createClient } from '@/lib/supabase/server'; // Für User-Client (Auth-Check)
import OpenAI from 'openai'; // Für AI API Aufrufe
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'; // Für Admin-Client (DB-Zugriffe)
// --- NEU: Importiere deine fetchWithUltraBackoff Funktion ---
import { fetchWithUltraBackoff } from '@/lib/fetchWithBackoff'; // <-- Import ist jetzt aktiv
// --- Die lokale Implementierung wurde entfernt ---


// --- Konstanten für spezielle Zugriffe ---
const FREE_PROMPT_SLUG = process.env.FREE_PROMPT_SLUG || 'testprompt';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com';

// ======= HILFSFUNKTION: Korrekte Admin Client Initialisierung =======
function getSupabaseAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error("Supabase URL oder Service Key fehlt für Admin Operation!");
        throw new Error('Server-Konfigurationsfehler für Admin-Operationen.');
    }
    return createSupabaseAdminClient(supabaseUrl, serviceKey);
}
// ======= ENDE HILFSFUNKTION =======


// --- Funktion: generateText (ANGEPASST für einzelne Prompt-Daten und fetchWithUltraBackoff) ---
export async function generateText(payload) {
  console.log("Server Action 'generateText' aufgerufen mit Payload:", payload);
  const { placeholders, tone, slug } = payload;

  // --- Berechtigungsprüfung ---
  let hasAccess = false;
  let user = null;
  let promptPackage = null;
  const supabase = createClient();
  const supabaseAdmin = getSupabaseAdminClient();

  // 1. Lade Paketdaten
  try {
      const { data: pkg, error: pkgError } = await supabaseAdmin
          .from('prompt_packages')
          .select(`
              id, slug, price,
              context, semantic_data, writing_instructions
          `)
          .eq('slug', slug)
          .single();

      if (pkgError || !pkg) {
          console.error(`Konnte Paket für Slug ${slug} nicht finden.`);
          if (slug === FREE_PROMPT_SLUG) {
              return { error: 'Konfiguration für kostenlosen Prompt fehlerhaft.' };
          }
          return { error: 'Prompt-Paket nicht gefunden.' };
      }
      promptPackage = pkg;
      console.log(`Paket-Daten für Slug ${slug} geladen (ID: ${promptPackage.id}).`);

  } catch (dbError) {
      console.error("Datenbankfehler beim Laden des Pakets:", dbError);
      return { error: "Datenbankfehler beim Laden des Pakets." };
  }

  // 2. Prüfe auf kostenlosen Prompt
  if (slug === FREE_PROMPT_SLUG) {
      console.log(`Zugriff als kostenloser Prompt '${FREE_PROMPT_SLUG}'.`);
      hasAccess = true;
  } else {
      // 3. Authentifiziere User
      const { data: authData, error: userError } = await supabase.auth.getUser();
      if (userError || !authData.user) {
          console.error("Authentifizierungsfehler oder kein User:", userError?.message);
          return { error: 'Authentifizierung fehlgeschlagen. Bitte einloggen.' };
      }
      user = authData.user;
      console.log(`Authentifiziert als: ${user.email}`);

      // 4. Prüfe auf Admin oder Testuser
      if (user.email === process.env.ADMIN_EMAIL || user.email === TEST_USER_EMAIL) {
          console.log(`Zugriff gewährt: Spezieller User (${user.email}).`);
          hasAccess = true;
      } else {
          // 5. Prüfe Kauf
          console.log(`Prüfe Kauf für User ${user.id} auf Paket ${promptPackage.id}...`);
          const { data: purchaseData, error: purchaseError } = await supabaseAdmin
              .from('user_purchases')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('prompt_package_id', promptPackage.id);

          if (purchaseError) {
              console.error("Fehler bei der Zugriffsprüfung in DB (user_purchases):", purchaseError.message);
              return { error: 'Fehler bei der Überprüfung der Zugriffsberechtigung.' };
          }
          if (purchaseData?.count > 0) {
              console.log(`Zugriff gewährt für User ${user.email} (ID: ${user.id}) auf Paket ${promptPackage.id}.`);
              hasAccess = true;
          } else {
              console.log(`Zugriff verweigert für User ${user.email} (ID: ${user.id}) auf Paket ${promptPackage.id}.`);
          }
      }
  }

  // 6. Wenn kein Zugriff, Fehler zurückgeben
  if (!hasAccess) {
      return { error: "Du hast keinen Zugriff auf dieses Prompt-Paket." };
  }
  // --- ENDE Berechtigungsprüfung ---

  // 8. Prüfen, ob die Prompt-Daten im Paket vorhanden sind
  if (!promptPackage.context || !promptPackage.writing_instructions) {
      console.error(`Fehlende Prompt-Daten (context oder writing_instructions) im Paket ${promptPackage.id} für Slug ${slug}.`);
      return { error: "Fehlerhafte Prompt-Konfiguration im Paket." };
  }

  // 9. Prompt für die AI zusammenbauen
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
        userMessage += `- ${key}: ${placeholders[key]}\n`;
    }
  }
  userMessage += "\nGeneriere jetzt den Text basierend auf deiner Rolle und diesen Informationen.";

  console.log("--- System Prompt (Rolle) ---");
  console.log(systemPrompt);
  console.log("--- User Message (Kontext & Eingaben) ---");
  console.log(userMessage);

  // 10. AI API aufrufen (ANGEPASST mit fetchWithUltraBackoff)
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // --- NEU: API-Aufruf mit fetchWithUltraBackoff ---
    // Die Funktion wird jetzt aus der importierten Datei verwendet
    const response = await fetchWithUltraBackoff(() =>
      openai.chat.completions.create({
        model: "gpt-4o-mini", // Oder anderes Modell
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,      // Angepasst vom neuen Snippet
        top_p: 0.95,           // Neu hinzugefügt
        presence_penalty: 0.3, // Neu hinzugefügt
        frequency_penalty: 0.2, // Neu hinzugefügt
        max_tokens: 1500,      // Korrekter Parametername
        stop: ["User:", "System:"], // Neu hinzugefügt
        seed: 12345             // Neu hinzugefügt
      }),
      { maxRetries: 5, baseDelay: 500, softFail: true } // Optionen explizit setzen
    );
    // --- ENDE NEU ---

    // --- NEU: Angepasste Fehler- und Erfolgsbehandlung ---
    if (response.error) {
      // Sanfter Fehler: Loggen und benutzerfreundliche Meldung zurückgeben
      console.error("Sanfter Fehler bei AI API (fetchWithUltraBackoff):", response.message);
      return { error: `Fehler bei der Textgenerierung: ${response.message}. Bitte versuche es erneut.` };
    }

    // Erfolg: Extrahiere den generierten Inhalt aus der Antwort
    const generatedContent = response.choices?.[0]?.message?.content;

    if (!generatedContent) {
      console.error("Kein Inhalt in der AI-Antwort gefunden, obwohl kein Fehler gemeldet wurde.");
      return { error: "Keine gültige Antwort von der AI erhalten." };
    }

    console.log("AI-Antwort erfolgreich erhalten.");
    return { text: generatedContent.trim() };
    // --- ENDE NEU ---

  } catch (aiError) {
    // Harter Fehler (z.B. Konfigurationsfehler, unerwarteter Abbruch)
    console.error("Harter Abbruchfehler bei AI API:", aiError);
    let errorMessage = "Ein schwerwiegender Fehler ist bei der Textgenerierung aufgetreten.";
    if (aiError instanceof Error) {
        errorMessage += ` Details: ${aiError.message}`;
    }
    return { error: errorMessage };
  }
}

// --- Funktion: refineText (bleibt unverändert) ---
export async function refineText(payload) {
  console.log("Server Action 'refineText' aufgerufen mit Payload:", payload);
  const { originalText, placeholders, tone, refineInstruction, slug } = payload;

  // --- Berechtigungsprüfung (bleibt weitgehend gleich) ---
  let hasAccess = false;
  let user = null;
  let packageId = null;
  const supabase = createClient();
  const supabaseAdmin = getSupabaseAdminClient();

  // 1. Prüfe auf kostenlosen Prompt
  if (slug === FREE_PROMPT_SLUG) {
      console.log(`Zugriff für Refine als kostenloser Prompt '${FREE_PROMPT_SLUG}'.`);
      hasAccess = true;
  } else {
      // 2. Authentifiziere User
      const { data: authData, error: userError } = await supabase.auth.getUser();
      if (userError || !authData.user) {
          return { error: 'Authentifizierung fehlgeschlagen.' };
      }
      user = authData.user;
      console.log(`Authentifiziert für Refine als: ${user.email}`);

      // 3. Hole optional Paket-ID
      if (slug) {
          const { data: pkg, error: pkgError } = await supabaseAdmin
              .from('prompt_packages')
              .select('id')
              .eq('slug', slug)
              .single();
          if (!pkgError && pkg) { packageId = pkg.id; }
          else { console.warn(`Konnte Paket-ID für Refine-Kaufprüfung (Slug: ${slug}) nicht finden.`); }
      }

      // 4. Prüfe auf Admin oder Testuser
      if (user.email === process.env.ADMIN_EMAIL || user.email === TEST_USER_EMAIL) {
          console.log(`Zugriff für Refine gewährt: Spezieller User (${user.email}).`);
          hasAccess = true;
      } else {
          // 5. Prüfe Kauf
          if (packageId) {
              console.log(`Prüfe Kauf für Refine für User ${user.id} auf Paket ${packageId}...`);
              const { data: purchaseData, error: purchaseError } = await supabaseAdmin
                  .from('user_purchases')
                  .select('id', { count: 'exact', head: true })
                  .eq('user_id', user.id)
                  .eq('prompt_package_id', packageId);

              if (purchaseError) {
                  return { error: 'Fehler bei der Überprüfung der Zugriffsberechtigung.' };
              }
              if (purchaseData?.count > 0) {
                  console.log(`Zugriff für Refine gewährt (Kauf) für User ${user.email} auf Paket ${packageId}.`);
                  hasAccess = true;
              } else {
                  console.log(`Zugriff für Refine verweigert (kein Kauf) für User ${user.email} auf Paket ${packageId}.`);
              }
          } else {
              console.log(`Zugriff für Refine verweigert für User ${user.email} (kein Admin/Test, kein Kauf nachweisbar).`);
          }
      }
  }

  // 6. Wenn kein Zugriff, Fehler zurückgeben
  if (!hasAccess) {
      return { error: "Du hast keinen Zugriff auf diese Funktion oder dieses Paket." };
  }
  // --- ENDE Berechtigungsprüfung ---

  // 7. Prompt für die AI zusammenbauen
  let systemPrompt = "Du bist ein Assistent zur Textüberarbeitung.\n";
  systemPrompt += `Der Benutzer hat folgenden Text generiert:\n"${originalText}"\n`;
  if (tone) {
    systemPrompt += `Gewünschte Tonalität für die Überarbeitung: ${tone}\n`;
  }
  systemPrompt += `Die Anweisung zur Überarbeitung lautet: "${refineInstruction || 'Formuliere den Text neu.'}"\n`;
  systemPrompt += "Behalte den ursprünglichen Sinn bei, aber wende die Anweisung an.\n";
  systemPrompt += "Gib nur den überarbeiteten Text zurück.";

  console.log("--- Refine System Prompt ---");
  console.log(systemPrompt);

  // 8. AI API aufrufen (Hier wird fetchWithUltraBackoff NICHT verwendet, könnte man aber auch einbauen)
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Oder anderes Modell für Refine
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.7,
      max_tokens: 1500,
      frequency_penalty: 0.1,
      presence_penalty: 0.0,
    });
    const refinedContent = completion.choices[0]?.message?.content;

    if (!refinedContent) {
      return { error: "Keine Überarbeitung von der AI erhalten." };
    }
    return { text: refinedContent.trim() };

  } catch (aiError) {
    console.error("Fehler beim Aufruf der AI API (Refine):", aiError);
    let errorMessage = "Fehler bei der Kommunikation mit der Text-KI (Refine).";
    if (aiError instanceof Error) {
        errorMessage += ` Details: ${aiError.message}`;
    }
    return { error: errorMessage };
  }
}
