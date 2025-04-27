// app/(public)/prompt/actions.js
'use server';

// ======= Imports =======
import { createClient } from '@/lib/supabase/server'; // Für User-Client (Auth-Check)
import OpenAI from 'openai'; // Für AI API Aufrufe
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'; // Für Admin-Client (DB-Zugriffe)

// --- Konstanten für spezielle Zugriffe (hierher verschoben) ---
const FREE_PROMPT_SLUG = process.env.FREE_PROMPT_SLUG || 'testprompt'; // Hole aus .env oder Fallback
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@example.com'; // Hole aus .env oder Fallback

// ======= HILFSFUNKTION: Korrekte Admin Client Initialisierung =======
// Wird für die Berechtigungsprüfung und das Laden von Varianten benötigt
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


// --- Funktion: generateText ---
export async function generateText(payload) {
  console.log("Server Action 'generateText' aufgerufen mit Payload:", payload);
  const { variantId, placeholders, tone, slug } = payload;

  // --- NEUE STRUKTUR: Berechtigungsprüfung ---
  let hasAccess = false;
  let user = null;
  let packageId = null; // Wird benötigt, um die Variante zu laden
  const supabase = createClient(); // User-Client für Auth
  const supabaseAdmin = getSupabaseAdminClient(); // Admin-Client für DB-Zugriffe

  // 1. Prüfe auf kostenlosen Prompt
  if (slug === FREE_PROMPT_SLUG) {
      console.log(`Zugriff als kostenloser Prompt '${FREE_PROMPT_SLUG}'.`);
      const { data: freePkg, error: freePkgError } = await supabaseAdmin
          .from('prompt_packages')
          .select('id')
          .eq('slug', FREE_PROMPT_SLUG)
          .single();
      if (freePkgError || !freePkg) {
          console.error(`Konnte Paket-ID für kostenlosen Slug ${FREE_PROMPT_SLUG} nicht finden.`);
          return { error: 'Konfiguration für kostenlosen Prompt fehlerhaft.' };
      }
      packageId = freePkg.id;
      hasAccess = true;
  } else {
      // 2. Wenn nicht kostenlos, authentifiziere User
      const { data: authData, error: userError } = await supabase.auth.getUser();
      if (userError || !authData.user) {
          console.error("Authentifizierungsfehler oder kein User:", userError?.message);
          return { error: 'Authentifizierung fehlgeschlagen. Bitte einloggen.' };
      }
      user = authData.user;
      console.log(`Authentifiziert als: ${user.email}`);

      // 3. Hole Paket-ID basierend auf Slug (wird für alle weiteren Checks benötigt)
      const { data: pkg, error: pkgError } = await supabaseAdmin
          .from('prompt_packages')
          .select('id')
          .eq('slug', slug)
          .single();
      if (pkgError || !pkg) {
          console.error(`Konnte Paket-ID für Slug ${slug} nicht finden.`);
          return { error: 'Prompt-Paket nicht gefunden.' };
      }
      packageId = pkg.id;
      console.log(`Paket-ID für Slug ${slug} ist ${packageId}.`);

      // 4. Prüfe auf Admin oder Testuser
      // --- DEBUGGING: Logge die zu vergleichenden Werte ---
      console.log(`[DEBUG] Eingeloggter User: ${user?.email}`);
      console.log(`[DEBUG] ADMIN_EMAIL aus .env: ${process.env.ADMIN_EMAIL}`);
      console.log(`[DEBUG] TEST_USER_EMAIL aus .env: ${TEST_USER_EMAIL}`); // Verwende die Konstante
      // --- ENDE DEBUGGING ---
      if (user.email === process.env.ADMIN_EMAIL || user.email === TEST_USER_EMAIL) {
          console.log(`Zugriff gewährt: Spezieller User (${user.email}).`);
          hasAccess = true;
      } else {
          // 5. Wenn kein Admin/Testuser, prüfe Kauf
          console.log(`Prüfe Kauf für User ${user.id} auf Paket ${packageId}...`);
          const { data: purchaseData, error: purchaseError } = await supabaseAdmin
              .from('user_purchases')
              .select('id', { count: 'exact', head: true }) // Effizienter: Nur prüfen, ob Eintrag existiert
              .eq('user_id', user.id)
              .eq('prompt_package_id', packageId);

          if (purchaseError) {
              console.error("Fehler bei der Zugriffsprüfung in DB (user_purchases):", purchaseError.message);
              return { error: 'Fehler bei der Überprüfung der Zugriffsberechtigung.' };
          }
          if (purchaseData?.count > 0) {
              console.log(`Zugriff gewährt für User ${user.email} (ID: ${user.id}) auf Paket ${packageId}.`);
              hasAccess = true;
          } else {
              console.log(`Zugriff verweigert für User ${user.email} (ID: ${user.id}) auf Paket ${packageId}.`);
              // Fehler wird unten behandelt
          }
      }
  }

  // 6. Wenn kein Zugriff, Fehler zurückgeben
  if (!hasAccess) {
      return { error: "Du hast keinen Zugriff auf dieses Prompt-Paket." };
  }
  // --- ENDE NEUE STRUKTUR: Berechtigungsprüfung ---


  // 7. Variante aus der Datenbank laden (packageId ist jetzt bekannt)
  let variantData;
  try {
      // Admin-Client wird bereits oben initialisiert
      const { data, error } = await supabaseAdmin
          .from('prompt_variants')
          .select('context, semantic_data, writing_instructions') // Nur benötigte Felder
          .eq('package_id', packageId) // Verwende die ermittelte packageId
          .eq('variant_id', variantId) // Suche nach der spezifischen variant_id
          .limit(1)
          .single();

      if (error || !data) {
          console.error(`Fehler beim Laden der Variante ${variantId} für Paket ${packageId}:`, error);
          return { error: "Prompt-Variante konnte nicht geladen werden." };
      }
      variantData = data;
  } catch (dbError) {
      console.error("Datenbankfehler beim Laden der Variante:", dbError);
      return { error: "Datenbankfehler beim Laden der Variante." };
  }

  // --- START ÄNDERUNG: Neuer System Prompt ---
  // 8. Prompt für die AI zusammenbauen
  const systemPrompt = `DEINE ROLLE:
Du bist der „Prompthaus Textarchitekt“. Deine Mission ist es, auf Basis eines strukturierten JSON-Objekts und spezifischer Benutzereingaben (semantic_data) einen stilistisch herausragenden, kohärenten und kontextuell passenden deutschen Text zu generieren.

**EINGABEN:**
1.  Ein **JSON-Objekt**, das Kontextinformationen, mögliche Varianten und detaillierte Schreibvorgaben (writing_instructions) enthält.
2.  Vom Benutzer bereitgestellte **Werte für Eingabefelder** (semantic_data).

**AUFGABE:**
* Nutze das JSON-Objekt als primäre Blaupause für Zielsetzung (goal), Markt (market), Kanal (channel), Persona, Situation und Zielgruppe (target_audience).
* Interpretiere die Vorgaben intelligent und gestalte den Text kreativ aus, bleibe dabei aber stets den Kernanforderungen und dem Sinn treu.
* **Integriere die Benutzereingaben (semantic_data) nahtlos und natürlich** an den passenden Stellen im Text. Orientiere dich dabei an möglichen Platzhaltern im JSON oder leite die korrekte Position aus dem semantischen Kontext ab.
* **Setze die writing_instructions präzise um:** Achte genau auf Tonalität (overall_tone), spezifische Constraints, Sprachstil (stylistic_rules), Formellitätsgrad (formality_level), Sprachniveau (language_level) und die Integration der Schlüsselbotschaften (key_messages_to_include).
* **Behandle Varianten im JSON:** Sollte das JSON für bestimmte Aspekte mehrere Optionen vorschlagen, wähle diejenige aus, die am besten zum Gesamtziel und Kontext passt, oder kombiniere sie sinnvoll, falls dies kohärent möglich ist und den Anweisungen nicht widerspricht.
* Passe Struktur, Satzbau und Wortwahl dynamisch an, um ein authentisches, flüssiges und ansprechendes Leseerlebnis zu schaffen.

**REGELN:**
* **Anrede:** Setze die Anredeform ("du" oder "Sie") strikt gemäß dem im JSON definierten formality_level um und bleibe dabei konsistent.
* **Keine Einleitungsfloskeln (STRIKT BEACHTEN!):** Beginne den Text *unmittelbar* nach der Anrede mit dem Kernthema oder der ersten wichtigen Information. Der erste Satz darf unter *keinen Umständen* eine allgemeine Höflichkeitsfloskel, eine Bemerkung zum Wohlbefinden des Empfängers, eine standardisierte Einleitung (wie 'Ich schreibe Ihnen, um...') oder eine ähnliche Phrase sein, die nicht direkt den Inhalt betrifft. VERBOTENE BEISPIELE für den ersten Satz: 'Ich hoffe, es geht Ihnen gut.', 'Ich hoffe, diese Nachricht findet Sie wohlauf.', 'Ich melde mich bei Ihnen bezüglich...'. Der erste Satz *muss* bereits inhaltliche Relevanz haben.
* **Sprachqualität:** Verfasse den Text in natürlicher, grammatikalisch korrekter und idiomatischer deutscher Sprache. Vermeide steife oder roboterhafte Formulierungen.
* **Stilmittel:** Setze Emojis, Aufzählungen oder andere kreative Stilmittel nur dann ein, wenn dies durch die stylistic_rules oder den Kontext explizit erlaubt oder nahegelegt wird.
* **Kohärenz bei Unsicherheiten:** Bei unklaren, widersprüchlichen oder fehlenden Angaben im JSON oder in semantic_data, versuche dennoch, einen möglichst kohärenten und sinnvollen Text zu erstellen. Priorisiere dabei im Zweifel die expliziten writing_instructions, das definierte goal und die Kernbotschaften. Gib keine Fehlermeldungen oder Kommentare dazu im Output aus.
* **Inspiration, nicht Skript:** Nutze das JSON als detaillierte Inspirationsquelle und Leitfaden, nicht als starres Skript, das Wort für Wort übernommen werden muss (außer bei explizit vorgegebenen Phrasen oder Kernbotschaften).

**AUSGABE:**
* **Gib ausschließlich den finalen, formatierten Fließtext zurück.**
* Keine einleitenden Sätze, keine Kommentare, keine Metainformationen, keine JSON-Daten. Nur der reine Text.

**ZIEL:**
Erstelle eigenständig einen **herausragenden deutschen Text**, der die Vorgaben des bereitgestellten Musters (JSON) und die Benutzereingaben optimal vereint und **höchsten Qualitätsansprüchen** in Bezug auf Stil, Kohärenz und Kontexttreue genügt.`;

  // Dynamische Teile für den User-Kontext hinzufügen
  let userMessage = "Hier sind die spezifischen Informationen für diesen Text:\n";
  userMessage += `Kontext aus JSON: ${JSON.stringify(variantData.context)}\n`;
  userMessage += `Schreibanweisungen aus JSON: ${JSON.stringify(variantData.writing_instructions)}\n`;
  if (tone) {
    userMessage += `Vom Benutzer gewünschte zusätzliche Tonalität: ${tone}\n`;
  }
  userMessage += "Vom Benutzer bereitgestellte Werte:\n";
  for (const key in placeholders) {
    // Stelle sicher, dass der Wert nicht leer ist, bevor du ihn hinzufügst
    if (placeholders[key] !== null && placeholders[key] !== undefined && placeholders[key] !== '') {
        userMessage += `- ${key}: ${placeholders[key]}\n`;
    }
  }
  userMessage += "\nGeneriere jetzt den Text basierend auf deiner Rolle und diesen Informationen.";
  // --- ENDE ÄNDERUNG: Neuer System Prompt ---


  console.log("--- System Prompt (Rolle) ---");
  console.log(systemPrompt);
  console.log("--- User Message (Kontext & Eingaben) ---");
  console.log(userMessage);

  // 9. AI API aufrufen (mit allen Parametern)
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Oder "gpt-4o-mini", "gpt-3.5-turbo" etc.
      messages: [
        { role: "system", content: systemPrompt }, // Die Rolle des Assistenten
        { role: "user", content: userMessage },   // Die spezifischen Daten für diesen Aufruf
      ],
      // --- HIER SIND ALLE STEUERUNGSPARAMETER ---
      temperature: 0.7,       // Wert zwischen 0 und 2. Höher = kreativer, niedriger = fokussierter.
      // top_p: 0.9,          // Alternative zu temperature. Wert zwischen 0 und 1. Nur die wahrscheinlichsten Tokens mit kumulativer Wahrscheinlichkeit von top_p werden berücksichtigt. Normalerweise NICHT mit temperature zusammen verwenden.
      max_tokens: 1500,       // Maximale Anzahl an Tokens (Wörter/Zeichenteile) in der Antwort. Hilft Kosten zu kontrollieren und Länge zu begrenzen.
      frequency_penalty: 0.2, // Wert zwischen -2.0 und 2.0. Positive Werte bestrafen häufige Tokens, reduziert Wortwiederholungen.
      presence_penalty: 0.1,  // Wert zwischen -2.0 und 2.0. Positive Werte bestrafen Tokens, die bereits vorkamen, fördert neue Themen.
      // --- ENDE STEUERUNGSPARAMETER ---
    });
    const generatedContent = completion.choices[0]?.message?.content;

    if (!generatedContent) {
      return { error: "Keine Antwort von der AI erhalten." };
    }

    return { text: generatedContent.trim() };

  } catch (aiError) {
    console.error("Fehler beim Aufruf der AI API:", aiError);
    let errorMessage = "Fehler bei der Kommunikation mit der Text-KI.";
    if (aiError instanceof Error) {
        errorMessage += ` Details: ${aiError.message}`;
    }
    return { error: errorMessage };
  }
}

// --- Funktion: refineText ---
// (Auch hier alle Parameter hinzugefügt)
export async function refineText(payload) {
  console.log("Server Action 'refineText' aufgerufen mit Payload:", payload);
  const { originalText, variantId, placeholders, tone, refineInstruction, slug } = payload;

  // --- NEUE STRUKTUR: Berechtigungsprüfung (ähnlich wie generateText) ---
  let hasAccess = false;
  let user = null;
  let packageId = null; // Wird für Kontext benötigt, falls vorhanden
  const supabase = createClient();
  const supabaseAdmin = getSupabaseAdminClient();

  // 1. Prüfe auf kostenlosen Prompt (Slug wird für Refine mitgeschickt)
  if (slug === FREE_PROMPT_SLUG) {
      console.log(`Zugriff für Refine als kostenloser Prompt '${FREE_PROMPT_SLUG}'.`);
      const { data: freePkg, error: freePkgError } = await supabaseAdmin
          .from('prompt_packages')
          .select('id')
          .eq('slug', FREE_PROMPT_SLUG)
          .single();
      if (!freePkgError && freePkg) { packageId = freePkg.id; } // Optional ID holen
      hasAccess = true;
  } else {
      // 2. Authentifiziere User
      const { data: authData, error: userError } = await supabase.auth.getUser();
      if (userError || !authData.user) {
          return { error: 'Authentifizierung fehlgeschlagen.' };
      }
      user = authData.user;
      console.log(`Authentifiziert für Refine als: ${user.email}`);

      // 3. Hole optional Paket-ID (falls Slug vorhanden)
      if (slug) {
          const { data: pkg, error: pkgError } = await supabaseAdmin
              .from('prompt_packages')
              .select('id')
              .eq('slug', slug)
              .single();
          if (!pkgError && pkg) { packageId = pkg.id; }
      }

      // 4. Prüfe auf Admin oder Testuser
      if (user.email === process.env.ADMIN_EMAIL || user.email === TEST_USER_EMAIL) {
          console.log(`Zugriff für Refine gewährt: Spezieller User (${user.email}).`);
          hasAccess = true;
      } else {
          // 5. Prüfe Kauf (nur wenn Slug und packageId vorhanden)
          if (slug && packageId) {
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
                  // Fehler wird unten behandelt
              }
          } else {
              // Wenn kein Slug/packageId für Refine mitkam, aber User kein Admin/Testuser ist -> Zugriff verweigern?
              // Oder Zugriff erlauben, da Refine vielleicht keinen Paketkontext braucht?
              // AKTUELLE ENTSCHEIDUNG: Zugriff verweigern, wenn kein Kauf nachweisbar.
              console.log(`Zugriff für Refine verweigert für User ${user.email} (kein Admin/Test, kein Kauf nachweisbar).`);
              // Fehler wird unten behandelt
          }
      }
  }

  // 6. Wenn kein Zugriff, Fehler zurückgeben
  if (!hasAccess) {
      return { error: "Du hast keinen Zugriff auf diese Funktion oder dieses Paket." };
  }
  // --- ENDE NEUE STRUKTUR: Berechtigungsprüfung ---


  // 7. Prompt für die AI zusammenbauen (Logik bleibt gleich)
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

  // 8. AI API aufrufen (mit allen Parametern)
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // Oder "gpt-4o-mini", "gpt-3.5-turbo" etc.
      messages: [{ role: "system", content: systemPrompt }],
      // --- HIER SIND ALLE STEUERUNGSPARAMETER ---
      temperature: 0.7,       // Etwas niedriger für Refine, um fokussierter zu bleiben.
      // top_p: 0.9,          // Alternative zu temperature.
      max_tokens: 1500,       // Ggf. anpassen, falls Überarbeitungen länger sein können.
      frequency_penalty: 0.1, // Ggf. anpassen.
      presence_penalty: 0.0,  // Oft bei Refine nicht nötig, neue Themen sind selten gewünscht.
      // --- ENDE STEUERUNGSPARAMETER ---
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
