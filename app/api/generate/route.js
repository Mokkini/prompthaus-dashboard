// app/api/generate/route.js - ANGEPASST mit Nachbearbeitung für Sterne

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient as createServiceRoleClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

// --- Konstanten ---
const FREE_PROMPT_SLUG = 'testprompt';
const TEST_USER_EMAIL = 'danadi@gmx.de';
const OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = 0.5;
const DEFAULT_MAX_TOKENS = 1500;
// --- ENDE Konstanten ---

// --- Supabase & OpenAI Clients ---
const supabaseService = createServiceRoleClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
// --- ENDE Clients ---

// --- System Prompts (gekürzt) ---
const DEFAULT_SYSTEM_PROMPT = `Du bist ein professioneller Textassistent für moderne Kommunikation. Deine Aufgabe ist es, aus strukturierten JSON-Daten hochwertige, klar formulierte und kontextgerechte Texte zu erstellen.

Deine Rolle:
- Du verwandelst jeden Eintrag aus einer "generation_variant" in einen überzeugenden Fließtext.
- Du beachtest alle Anweisungen aus dem Kontextobjekt, insbesondere Ton, Stil, Format und Zielgruppe.
- Du verwendest keine Feldnamen aus dem JSON wörtlich, sondern integrierst deren Inhalte natürlich und elegant in den Textfluss.

Ton & Stil:
- Passe Tonalität, Ausdruck und sprachliche Feinheiten exakt an den angegebenen Gesamtton (overall_tone) und die emotionale Haltung (persona.emotion) an.
- Berücksichtige das Feld formality_level für die Wahl der Anredeform ("du" oder "Sie"). Bei "Formell" ist die Du-Form ausgeschlossen.
- Richte dich nach den Vorgaben aus stylistic_rules, z. B. zur Verwendung von Emojis, Aufzählungen oder formeller Sprache.

Struktur & Formatierung:
- Gliedere den Text in sinnvolle Abschnitte. Jeder Gedanke erhält einen eigenen Absatz.
- Verwende bei Bedarf Absätze, Spiegelstriche oder stilistische Elemente – jedoch nur, wenn sie dem gewählten Kanal und Ton entsprechen.
- Lange Absätze mit mehreren Aussagen sind aufzuteilen, um Lesefluss und Klarheit zu verbessern.

Zielsetzung:
- Erzeuge eigenständige, stimmige Texte, die realistisch und nutzbar sind – nicht wie Formulierungshilfen.
- Der Text soll auch ohne zusätzliche Erklärung sofort überzeugen und in sich abgeschlossen sein.

Ausgabe:
- Gib ausschließlich den fertigen Text zurück – ohne Erklärungen, Kommentare oder Wiederholung der Eingangsdaten.
- Kein Markdown, keine Hervorhebungen, keine technischen Hinweise.

Dein Ziel:
Ein sprachlich stilvoller, inhaltlich glaubwürdiger und sauber gegliederter Text, der exakt zur jeweiligen Variante passt.`;

// --- ANGEPASSTER REFINE System Prompt (Option 1, kann parallel verwendet werden) ---
const REFINE_SYSTEM_PROMPT = `Du bist ein hilfreicher Assistent. Deine Aufgabe ist es, einen vorhandenen Text basierend auf zusätzlichen Anweisungen oder Informationen zu überarbeiten und zu verbessern. Behalte den ursprünglichen Zweck und Ton bei, sofern nicht anders angewiesen.
**WICHTIG: Gib NUR den reinen, überarbeiteten Text zurück. Verwende KEINE Markdown-Formatierung wie Sterne (*), Fett- oder Kursivschrift.**`;
// --- ENDE System Prompts ---

export async function POST(request) {
  console.log("API route /api/generate wurde aufgerufen.");

  let user = null;
  let hasAccess = false;
  let packageId = null;

  try {
    // 1. Anfragedaten lesen und validieren
    const body = await request.json();
    const {
        action = 'generate',
        promptPackageSlug,
        variantId,
        placeholders,
        tone,
        originalText,
        additionalInfo,
        // Optionale Parameter für OpenAI (falls du sie hier auch nutzen willst)
        temperature,
        max_tokens
    } = body;

    console.log("Empfangene Aktion:", action);
    console.log("Empfangene Daten:", { promptPackageSlug, variantId, action, tone, temperature, max_tokens });

    // Grundlegende Validierung
    if (['generate', 'rephrase'].includes(action)) {
        if (!promptPackageSlug || typeof variantId !== 'string' || !variantId.trim() || !placeholders || typeof placeholders !== 'object') {
           console.error("Ungültige Eingabedaten für generate/rephrase:", body);
           return NextResponse.json({ error: 'Ungültige Eingabedaten (promptPackageSlug, variantId, placeholders benötigt).' }, { status: 400 });
        }
    }
    if (action === 'refine') {
        if (!originalText || !additionalInfo) {
            console.error("Fehlende Daten für refine:", body);
            return NextResponse.json({ error: 'Fehlende Daten für Verfeinerung (originalText, additionalInfo).' }, { status: 400 });
        }
    }

    // Validierung für optionale OpenAI Parameter
    let finalTemperature = DEFAULT_TEMPERATURE;
    if (temperature !== undefined) {
        const tempNum = Number(temperature);
        if (!isNaN(tempNum) && tempNum >= 0 && tempNum <= 2) {
            finalTemperature = tempNum;
        } else {
            console.warn(`Ungültige Temperature '${temperature}' empfangen. Verwende Standard: ${DEFAULT_TEMPERATURE}`);
        }
    }

    let finalMaxTokens = DEFAULT_MAX_TOKENS;
    if (max_tokens !== undefined) {
        const maxTokensNum = Number(max_tokens);
        if (!isNaN(maxTokensNum) && Number.isInteger(maxTokensNum) && maxTokensNum > 0) {
            finalMaxTokens = maxTokensNum;
        } else {
            console.warn(`Ungültige max_tokens '${max_tokens}' empfangen. Verwende Standard: ${DEFAULT_MAX_TOKENS}`);
        }
    }

    // 2. Authentifizierung und Autorisierung (Logik von vorher)
    const isFreePromptRequest = promptPackageSlug === FREE_PROMPT_SLUG && (action === 'generate' || action === 'rephrase' || action === 'refine');

    if (isFreePromptRequest) {
      hasAccess = true;
      console.log(`Zugriff gewährt: Kostenloser Prompt '${FREE_PROMPT_SLUG}'.`);
      const { data: freePackageInfo, error: freePackageError } = await supabaseService
        .from('prompt_packages')
        .select('id')
        .eq('slug', FREE_PROMPT_SLUG)
        .single();
      if (freePackageError || !freePackageInfo) {
          console.error(`Konnte Paket-ID für kostenlosen Slug ${FREE_PROMPT_SLUG} nicht finden.`);
          return NextResponse.json({ error: 'Konfiguration für kostenlosen Prompt fehlerhaft.' }, { status: 500 });
      }
      packageId = freePackageInfo.id;
      console.log(`Paket-ID für kostenlosen Prompt: ${packageId}`);

    } else {
      console.log("Kein kostenloser Prompt. Prüfe Authentifizierung...");
      const supabaseAuth = createServerClient();
      const { data: { user: loggedInUser }, error: userError } = await supabaseAuth.auth.getUser();

      if (userError || !loggedInUser) {
        console.error("Authentifizierungsfehler oder kein User:", userError?.message);
        return NextResponse.json({ error: 'Authentifizierung fehlgeschlagen. Bitte einloggen.' }, { status: 401 });
      }
      user = loggedInUser;
      console.log(`Authentifiziert als: ${user.email}`);

      if (user.email === TEST_USER_EMAIL || user.email === process.env.ADMIN_EMAIL) {
        hasAccess = true;
        console.log(`Zugriff gewährt: Spezieller User (${user.email}).`);
        if (promptPackageSlug) {
            const { data: pkgInfo, error: pkgErr } = await supabaseService
              .from('prompt_packages')
              .select('id')
              .eq('slug', promptPackageSlug)
              .single();
            if (pkgErr || !pkgInfo) {
                console.error(`Konnte Paket-ID für Slug ${promptPackageSlug} nicht finden (Admin/Test).`);
                return NextResponse.json({ error: 'Prompt-Paket nicht gefunden.' }, { status: 404 });
            }
            packageId = pkgInfo.id;
            console.log(`Paket-ID für Admin/Testuser: ${packageId}`);
        } else if (action !== 'refine') {
            console.error("Fehlender promptPackageSlug für Admin/Testuser bei generate/rephrase.");
            return NextResponse.json({ error: 'Prompt-Paket Slug fehlt.' }, { status: 400 });
        }
      } else {
        if (action !== 'refine' && promptPackageSlug) {
            console.log(`Prüfe Zugriff für User ${user.id} auf Paket ${promptPackageSlug}...`);
            const { data: packageInfo, error: packageInfoError } = await supabaseService
              .from('prompt_packages')
              .select('id')
              .eq('slug', promptPackageSlug)
              .single();

            if (packageInfoError || !packageInfo) {
              console.error(`Fehler beim Holen der Paket-ID für Slug ${promptPackageSlug}:`, packageInfoError?.message);
              return NextResponse.json({ error: 'Prompt-Paket nicht gefunden oder Fehler bei der Abfrage.' }, { status: 404 });
            }
            packageId = packageInfo.id;
            console.log(`Paket-ID für Slug ${promptPackageSlug} ist ${packageId}. Prüfe user_purchases...`);

            const { data: purchaseData, error: purchaseError } = await supabaseService
              .from('user_purchases')
              .select('id')
              .eq('user_id', user.id)
              .eq('prompt_package_id', packageId)
              .limit(1)
              .maybeSingle();

            if (purchaseError) {
              console.error("Fehler bei der Zugriffsprüfung in DB (user_purchases):", purchaseError.message);
              return NextResponse.json({ error: 'Fehler bei der Überprüfung der Zugriffsberechtigung.' }, { status: 500 });
            }
            hasAccess = !!purchaseData;

            if (!hasAccess) {
               console.log(`Zugriff verweigert für User ${user.email} (ID: ${user.id}) auf Paket ${promptPackageSlug} (ID: ${packageId}).`);
               return NextResponse.json({ error: 'Kein Zugriff auf dieses Prompt-Paket.' }, { status: 403 });
            }
            console.log(`Zugriff gewährt für User ${user.email} (ID: ${user.id}) auf Paket ${promptPackageSlug} (ID: ${packageId}).`);
        } else if (action === 'refine') {
            hasAccess = true;
            console.log(`Zugriff für Refine-Aktion gewährt für User ${user.email}.`);
            if (promptPackageSlug) {
                 const { data: pkgInfo, error: pkgErr } = await supabaseService
                   .from('prompt_packages')
                   .select('id')
                   .eq('slug', promptPackageSlug)
                   .single();
                 if (!pkgErr && pkgInfo) {
                     packageId = pkgInfo.id;
                     console.log(`Paket-ID für Refine-Kontext: ${packageId}`);
                 }
            }
        } else {
            console.error("Ungültige Anfrage nach Authentifizierung (kein Slug für generate/rephrase):", body);
            return NextResponse.json({ error: 'Ungültige Anfrage nach Authentifizierung.' }, { status: 400 });
        }
      }
    }

    // 3. OpenAI Prompt vorbereiten
    if (hasAccess) {
      let systemPrompt = "";
      let userPrompt = "";
      let selectedVariantData = null;

      if (action === 'generate' || action === 'rephrase') {
        // ... (Logik für generate/rephrase bleibt gleich wie vorher) ...
        if (!packageId || !variantId) {
             console.error("Interner Fehler: Fehlende packageId oder variantId für Variantenabfrage.");
             return NextResponse.json({ error: 'Interner Serverfehler: Paket- oder Varianten-ID fehlt.' }, { status: 500 });
        }
        console.log(`Lade Variante mit ID '${variantId}' für Paket-ID ${packageId}...`);
        const { data: variantData, error: variantError } = await supabaseService
          .from('prompt_variants')
          .select('title, description, context, semantic_data, writing_instructions')
          .eq('package_id', packageId)
          .eq('variant_id', variantId)
          .single();
        if (variantError || !variantData) {
            console.error(`Fehler beim Laden der Variante '${variantId}' für Paket ${packageId}:`, variantError?.message);
            if (variantError?.code === 'PGRST116') {
                 return NextResponse.json({ error: 'Prompt-Variante nicht gefunden.' }, { status: 404 });
            }
            return NextResponse.json({ error: 'Fehler beim Laden der Prompt-Variante.' }, { status: 500 });
        }
        selectedVariantData = variantData;
        console.log(`Variante '${selectedVariantData.title || variantId}' erfolgreich geladen.`);
        systemPrompt = DEFAULT_SYSTEM_PROMPT;
        if (selectedVariantData.writing_instructions) {
            const wi = selectedVariantData.writing_instructions;
            if (wi.overall_tone?.length > 0) systemPrompt += `\n\nDer gewünschte Grundton ist: ${wi.overall_tone.join(', ')}.`;
            if (wi.formality_level) {
                const formality = wi.formality_level === 'formal_sie' ? "die formale 'Sie'-Anrede" : "die informelle 'Du'-Anrede";
                systemPrompt += `\nVerwende durchgehend ${formality}.`;
            }
            if (wi.key_messages_to_include?.length > 0) systemPrompt += `\n\nStelle sicher, dass folgende Kernbotschaften enthalten sind:\n- ${wi.key_messages_to_include.join('\n- ')}`;
            if (wi.rhetorical_approach?.length > 0) systemPrompt += `\n\nGehe rhetorisch wie folgt vor:\n- ${wi.rhetorical_approach.join('\n- ')}`;
            if (wi.constraints?.length > 0) systemPrompt += `\n\nBeachte folgende Einschränkungen:\n- ${wi.constraints.join('\n- ')}`;
        } else {
            console.warn(`Variante ${variantId} für Paket ${packageId} hat keine 'writing_instructions'.`);
        }
        if (selectedVariantData.context) {
            const ctx = selectedVariantData.context;
            if (ctx.situation) systemPrompt += `\n\nKontext der Situation: ${ctx.situation}`;
            if (ctx.goal) systemPrompt += `\nZiel des Textes: ${ctx.goal}`;
            if (ctx.target_audience?.description) systemPrompt += `\nZielgruppe: ${ctx.target_audience.description}`;
        } else {
             console.warn(`Variante ${variantId} für Paket ${packageId} hat kein 'context'-Objekt.`);
        }
        if (action === 'rephrase' && tone && typeof tone === 'string' && tone.trim()) {
          const userToneInstruction = `\n\nAchte zusätzlich besonders auf folgenden vom Benutzer gewünschten Tonfall: "${tone.trim()}"`;
          systemPrompt += userToneInstruction;
          console.log(`Systemprompt (Rephrase) erweitert um User-Ton: "${tone.trim()}"`);
        }
        if (action === 'rephrase') {
            systemPrompt += "\n\nFormuliere den Text basierend auf den Daten neu, behalte aber den Kerninhalt und den gewünschten Ton bei. Sei dabei kreativ.";
            console.log("Systemprompt für Rephrase angepasst.");
        }
        const dataForAI = JSON.stringify(placeholders, null, 2);
        userPrompt = `Generiere den Text basierend auf diesen Daten:\n\n${dataForAI}\n\nBeachte die Anweisungen im System-Prompt.`;
        console.log("User Prompt (Daten-basiert) erstellt.");

      } else if (action === 'refine') {
        // Verwende den angepassten REFINE_SYSTEM_PROMPT
        systemPrompt = REFINE_SYSTEM_PROMPT;
         if (tone && typeof tone === 'string' && tone.trim()) {
           systemPrompt += `\n\nAchte bei der Überarbeitung besonders auf folgenden vom Benutzer gewünschten Tonfall: "${tone.trim()}"`;
           console.log(`Refine-Systemprompt erweitert um User-Ton: "${tone.trim()}"`);
         }
        userPrompt = `Ursprünglicher Text:\n"""\n${originalText}\n"""\n\nZusätzliche Anweisungen/Informationen:\n"""\n${additionalInfo}\n"""\n\nBitte gib nur den überarbeiteten Text zurück.`;
        console.log("Systemprompt für Refine gesetzt/angepasst.");

      } else {
        console.error("Unbekannte Aktion:", action);
        return NextResponse.json({ error: 'Unbekannte Aktion.' }, { status: 400 });
      }

      // 4. OpenAI API aufrufen
      console.log(`Rufe OpenAI API für Aktion '${action}' mit Temp ${finalTemperature}, MaxTokens ${finalMaxTokens} auf...`);
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: finalTemperature, // Verwende validierte/Standard-Temperatur
        max_tokens: finalMaxTokens,   // Verwende validierte/Standard-MaxTokens
      });

      // 5. Ergebnis extrahieren und nachbearbeiten
      let aiResponseContent = completion.choices?.[0]?.message?.content;

      if (!aiResponseContent) {
          console.error('Keine gültige Antwort von OpenAI erhalten:', completion);
          return NextResponse.json({ error: 'Keine gültige Antwort von OpenAI.' }, { status: 500 });
      }

      console.log("Antwort von OpenAI erfolgreich erhalten.");

      // --- IMPLEMENTIERUNG OPTION 2: Entferne führende/abschließende Sterne ---
      // Diese Nachbearbeitung wird für alle Aktionen (generate, rephrase, refine) angewendet.
      console.log("Original Antwort:", aiResponseContent); // Logge die Originalantwort
      aiResponseContent = aiResponseContent.trim(); // Erst trimmen
      // Entferne alle Sterne am Anfang
      while (aiResponseContent.startsWith('*')) {
          aiResponseContent = aiResponseContent.substring(1).trimStart(); // Entferne Stern und folgende Leerzeichen
      }
      // Entferne alle Sterne am Ende
      while (aiResponseContent.endsWith('*')) {
          aiResponseContent = aiResponseContent.substring(0, aiResponseContent.length - 1).trimEnd(); // Entferne Stern und vorherige Leerzeichen
      }
      console.log("Bereinigte Antwort:", aiResponseContent); // Logge die bereinigte Antwort
      // --- ENDE IMPLEMENTIERUNG OPTION 2 ---

      // Sende den (potenziell bereinigten) Text zurück
      return NextResponse.json({ generatedText: aiResponseContent });

    } // Ende von if(hasAccess)

    // Fallback
    console.error("Unerwarteter Zustand: Zugriff nicht erlaubt.");
    return NextResponse.json({ error: 'Zugriff nicht erlaubt oder unerwarteter Zustand.' }, { status: 403 });

  } catch (error) {
     // Allgemeine Fehlerbehandlung (bleibt gleich)
     console.error("Schwerwiegender Fehler in /api/generate:", error);
     let errorMessage = 'Interner Serverfehler.';
     let statusCode = 500;

     if (error.response && error.error) {
         console.error("OpenAI API Fehler Status:", error.status);
         console.error("OpenAI API Fehler Details:", error.error);
         errorMessage = `OpenAI API Fehler: ${error.error?.message || 'Unbekannt'}`;
         statusCode = error.status || 500;
     } else if (error instanceof SyntaxError) {
         console.error("Fehler beim Parsen des Request Body:", error.message);
         errorMessage = 'Ungültiges JSON im Request Body.';
         statusCode = 400;
     } else {
         errorMessage = error.message || errorMessage;
     }

     console.error("Fehlermeldung:", errorMessage);
     console.error("Stack Trace:", error.stack);
     return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
