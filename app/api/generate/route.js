// app/api/generate/route.js - Angepasst für Testuser-Zugriff, Freitext-Tonalität und ECHTE Zugriffsprüfung via prompt_package_id

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient as createServiceRoleClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

const FREE_PROMPT_SLUG = 'test';

// --- Definiere die E-Mail deines Testusers ---
const TEST_USER_EMAIL = 'danadi@gmx.de'; // <-- Deine Test-E-Mail
// --- Ende ---

const supabaseService = createServiceRoleClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 1500; // Wichtig für Kostenkontrolle der Ausgabe

const DEFAULT_SYSTEM_PROMPT = `Du bist ein professioneller Textassistent für moderne Kommunikation.
Formuliere auf Basis einer stilistischen Vorlage und Platzhalterdaten einen eigenständigen, stimmigen Text.
Die Vorlage dient nur als stilistischer Rahmen – du darfst Sätze neu bauen, kürzen oder umstellen.
Wichtig: Wiederhole die Platzhalter nie wörtlich, sondern wähle passende Formulierungen mit Tiefe und Wirkung.
Berücksichtige unbedingt den gewählten Tonfall (z. B. emotional, sachlich, kreativ) und schreibe so, wie Menschen heute auf Social Media, im Beruf oder im Alltag kommunizieren: klar, nahbar, prägnant.
Ziel ist ein kurzer, runder Text, der beim Lesen überzeugt – nicht einfach eine Ausfüllhilfe.`;

const REFINE_SYSTEM_PROMPT = "Du bist ein hilfreicher Assistent. Deine Aufgabe ist es, einen vorhandenen Text basierend auf zusätzlichen Anweisungen oder Informationen zu überarbeiten und zu verbessern. Behalte den ursprünglichen Zweck und Ton bei, sofern nicht anders angewiesen.";


export async function POST(request) {
  console.log("API route /api/generate wurde aufgerufen.");

  let user = null;
  let hasAccess = false;

  try {
    // 1. Anfragedaten lesen
    const body = await request.json();
    const {
        action = 'generate',
        promptPackageSlug,
        variantIndex,
        placeholders,
        tone, // Der vom User eingegebene Ton
        originalText,
        additionalInfo
    } = body;

    console.log("Empfangene Aktion:", action);
    console.log("Empfangene Daten:", { promptPackageSlug, variantIndex, action, tone });

    // Validierungen
    if (['generate', 'rephrase'].includes(action)) {
        if (!promptPackageSlug || typeof variantIndex !== 'number' || variantIndex < 0 || !placeholders || typeof placeholders !== 'object') {
           return NextResponse.json({ error: 'Ungültige Eingabedaten für Generierung/Neuformulierung.' }, { status: 400 });
        }
    }
    if (action === 'refine') {
        if (!originalText || !additionalInfo) {
            return NextResponse.json({ error: 'Fehlende Daten für Verfeinerung (originalText, additionalInfo).' }, { status: 400 });
        }
        // promptPackageSlug, variantIndex, placeholders sind für Refine optional, aber nützlich für Kontext/Tone
    }

    // 2. Authentifizierung/Autorisierung
    const isFreePromptRequest = promptPackageSlug === FREE_PROMPT_SLUG && action !== 'refine';

    if (isFreePromptRequest) {
      hasAccess = true;
      console.log("Zugriff gewährt: Kostenloser Prompt (Generierung/Neuformulierung).");
    } else {
      console.log("Prüfe Authentifizierung...");
      const supabaseAuth = createServerClient();
      const { data: { user: loggedInUser }, error: userError } = await supabaseAuth.auth.getUser();

      if (userError || !loggedInUser) {
        console.error("Authentifizierungsfehler oder kein User:", userError?.message);
        return NextResponse.json({ error: 'Authentifizierung fehlgeschlagen. Bitte einloggen.' }, { status: 401 });
      }
      user = loggedInUser;
      console.log(`Authentifiziert als: ${user.email}`);

      // Testuser-Prüfung
      if (user.email === TEST_USER_EMAIL) {
        hasAccess = true;
        console.log(`Zugriff gewährt: Spezieller Testuser (${user.email}).`);
      } else {
        // Normale User-Logik
        if (action !== 'refine' && promptPackageSlug) {
            // --- ECHTE ZUGRIFFSPRÜFUNG via user_purchases mit prompt_package_id ---
            console.log(`Prüfe Zugriff für User ${user.id} auf Paket ${promptPackageSlug}...`);

            // Schritt 1: Hol die ID des Pakets anhand des Slugs
            const { data: packageInfo, error: packageInfoError } = await supabaseService
              .from('prompt_packages') // Deine Tabelle mit den Paket-Details
              .select('id')
              .eq('slug', promptPackageSlug)
              .single(); // Es sollte nur ein Paket mit diesem Slug geben

            if (packageInfoError || !packageInfo) {
              console.error(`Fehler beim Holen der Paket-ID für Slug ${promptPackageSlug}:`, packageInfoError?.message);
              return NextResponse.json({ error: 'Prompt-Paket nicht gefunden oder Fehler bei der Abfrage.' }, { status: 404 });
            }

            const packageId = packageInfo.id;
            console.log(`Paket-ID für Slug ${promptPackageSlug} ist ${packageId}. Prüfe user_purchases...`);

            // Schritt 2: Prüfe in user_purchases mit der Paket-ID
            const { data: purchaseData, error: purchaseError } = await supabaseService
              .from('user_purchases') // <-- Deine Tabelle für Käufe/Zugriffe
              .select('id')           // Wähle irgendeine Spalte, wir brauchen nur die Existenz
              .eq('user_id', user.id) // Prüfe auf die ID des eingeloggten Users
              .eq('prompt_package_id', packageId) // <-- Prüfe auf die Paket-ID
              // Optional: .or(`expires_at.is.null,expires_at.gt.now()`) // Falls du Ablaufdaten hast
              .limit(1) // Wir brauchen nur einen Treffer
              .maybeSingle(); // Gibt null zurück, wenn nichts gefunden wird, statt Fehler

            if (purchaseError) {
              console.error("Fehler bei der Zugriffsprüfung in DB (user_purchases):", purchaseError.message);
              // Gib einen generischen Fehler zurück
              return NextResponse.json({ error: 'Fehler bei der Überprüfung der Zugriffsberechtigung.' }, { status: 500 });
            }

            // hasAccess ist true, wenn purchaseData nicht null ist (also ein Eintrag gefunden wurde)
            hasAccess = !!purchaseData;
            // --- ENDE ECHTE ZUGRIFFSPRÜFUNG ---


            if (!hasAccess) {
               console.log(`Zugriff verweigert für User ${user.email} (ID: ${user.id}) auf Paket ${promptPackageSlug} (ID: ${packageId}). Kein Eintrag in user_purchases gefunden.`);
               return NextResponse.json({ error: 'Kein Zugriff auf dieses Prompt-Paket.' }, { status: 403 });
            }
            console.log(`Zugriff gewährt für User ${user.email} (ID: ${user.id}) auf Paket ${promptPackageSlug} (ID: ${packageId}).`);

        } else if (action === 'refine') {
            // Refine ist generell erlaubt für eingeloggte User (bleibt so)
            hasAccess = true;
            console.log(`Zugriff für Refine-Aktion gewährt für User ${user.email}.`);
        } else {
            return NextResponse.json({ error: 'Ungültige Anfrage nach Authentifizierung.' }, { status: 400 });
        }
      }
    }

    // 3. OpenAI Prompt vorbereiten
    if (hasAccess) {
      let systemPrompt = "";
      let userPrompt = "";

      if (action === 'generate' || action === 'rephrase') {
        // Paket und Variante laden
        const { data: packageData, error: packageError } = await supabaseService
          .from('prompt_packages')
          .select('prompt_variants')
          .eq('slug', promptPackageSlug)
          .single();

        if (packageError || !packageData || !packageData.prompt_variants) {
            console.error('Fehler beim Laden des Pakets/Varianten:', packageError?.message);
            return NextResponse.json({ error: 'Prompt-Paket oder Varianten nicht gefunden.' }, { status: 404 });
        }

        const variants = packageData.prompt_variants;
        if (!Array.isArray(variants) || variantIndex >= variants.length) {
            console.error('Ungültiger variantIndex:', variantIndex, 'für Varianten:', variants);
            return NextResponse.json({ error: 'Ungültiger Index für Prompt-Variante.' }, { status: 400 });
        }

        const selectedVariant = variants[variantIndex];
        if (!selectedVariant) {
             console.error('Ausgewählte Variante ist undefiniert bei Index:', variantIndex);
             return NextResponse.json({ error: 'Ausgewählte Prompt-Variante konnte nicht geladen werden.' }, { status: 500 });
        }

        const templateString = selectedVariant.template;
        if (!templateString) {
            console.error('Leeres Template in Variante:', selectedVariant);
            return NextResponse.json({ error: 'Das Template für diese Variante ist leer.' }, { status: 500 });
        }

        // Basis-Systemprompt holen
        systemPrompt = selectedVariant.system_prompt || DEFAULT_SYSTEM_PROMPT;
        console.log(`Verwendeter Basis-Systemprompt für ${promptPackageSlug} (Variante ${variantIndex}): ${selectedVariant.system_prompt ? 'Individuell' : 'Standard'}`);

        // Füge den User-Ton hinzu, falls vorhanden
        if (tone && typeof tone === 'string' && tone.trim()) {
          const userToneInstruction = `\n\nAchte besonders auf folgenden vom Benutzer gewünschten Tonfall: "${tone.trim()}"`;
          // Füge die Anweisung hinzu, falls sie nicht schon sehr ähnlich im Systemprompt steht
          if (!systemPrompt.toLowerCase().includes("gewählten tonfall") && !systemPrompt.toLowerCase().includes("gewünschten tonfall")) {
             systemPrompt += `\nBerücksichtige den gewählten Tonfall.`;
          }
          systemPrompt += userToneInstruction;
          console.log(`Systemprompt erweitert um User-Ton: "${tone.trim()}"`);
        }

        if (action === 'rephrase') {
            systemPrompt += "\nFormuliere den folgenden Text neu, behalte aber den Kerninhalt und den gewünschten Ton bei. Sei dabei kreativ.";
            console.log("Systemprompt für Rephrase angepasst.");
        }

        // Platzhalter ersetzen
        let filledTemplate = templateString;
        for (const key in placeholders) {
            const placeholderRegex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            if (placeholderRegex.test(filledTemplate)) {
                filledTemplate = filledTemplate.replace(placeholderRegex, String(placeholders[key]));
            } else {
                console.warn(`Platzhalter {{${key}}} nicht im Template gefunden.`);
            }
        }
        userPrompt = filledTemplate;

      } else if (action === 'refine') {
        systemPrompt = REFINE_SYSTEM_PROMPT;

         // Füge den User-Ton hinzu, falls vorhanden (auch bei Refine)
         if (tone && typeof tone === 'string' && tone.trim()) {
           systemPrompt += `\n\nAchte bei der Überarbeitung besonders auf folgenden vom Benutzer gewünschten Tonfall: "${tone.trim()}"`;
           console.log(`Refine-Systemprompt erweitert um User-Ton: "${tone.trim()}"`);
         }

        userPrompt = `Ursprünglicher Text:\n"""\n${originalText}\n"""\n\nZusätzliche Anweisungen/Informationen:\n"""\n${additionalInfo}\n"""\n\nBitte gib nur den überarbeiteten Text zurück.`;
        console.log("Systemprompt für Refine gesetzt/angepasst.");

      } else {
        return NextResponse.json({ error: 'Unbekannte Aktion.' }, { status: 400 });
      }

      // 4. OpenAI API aufrufen
      console.log(`Rufe OpenAI API für Aktion '${action}' auf...`);
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: DEFAULT_TEMPERATURE,
        max_tokens: DEFAULT_MAX_TOKENS, // Limit für die Ausgabe
      });

      // 5. Ergebnis extrahieren und zurückgeben
      const aiResponseContent = completion.choices?.[0]?.message?.content;
      if (!aiResponseContent) {
          console.error('Keine gültige Antwort von OpenAI erhalten:', completion);
          return NextResponse.json({ error: 'Keine gültige Antwort von OpenAI.' }, { status: 500 });
      }
      console.log("Antwort von OpenAI erfolgreich erhalten.");
      return NextResponse.json({ generatedText: aiResponseContent.trim() });

    } // Ende von if(hasAccess)

    // Fallback, sollte eigentlich nicht erreicht werden, wenn Logik oben stimmt
    return NextResponse.json({ error: 'Zugriff nicht erlaubt oder unerwarteter Zustand.' }, { status: 403 });

  } catch (error) {
     // Allgemeine Fehlerbehandlung
     console.error("Schwerwiegender Fehler in /api/generate:", error);
     if (error.response) { // Speziell für OpenAI API Fehler
         console.error("OpenAI API Fehler Status:", error.status);
         console.error("OpenAI API Fehler Details:", error.error); // OpenAI Fehlerobjekt
         return NextResponse.json({ error: `OpenAI API Fehler: ${error.error?.message || 'Unbekannt'}` }, { status: error.status || 500 });
     }
     if (error instanceof SyntaxError) { // Fehler beim Parsen des Request Body
         return NextResponse.json({ error: 'Ungültiges JSON im Request Body.' }, { status: 400 });
     }
     // Andere Fehler
     console.error("Fehlermeldung:", error.message);
     console.error("Stack Trace:", error.stack);
     return NextResponse.json({ error: `Interner Serverfehler: ${error.message}` }, { status: 500 });
  }
}
