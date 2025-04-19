// app/api/generate/route.js - Angepasst für Testuser-Zugriff

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient as createServiceRoleClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

const FREE_PROMPT_SLUG = 'test';

// --- NEU: Definiere die E-Mail deines Testusers ---
const TEST_USER_EMAIL = 'danadi@gmx.de'; // <-- TRAGE HIER DEINE TEST-E-MAIL EIN!
// --- Ende NEU ---

const supabaseService = createServiceRoleClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ... (Rest der Konstanten: openai, OPENAI_MODEL, DEFAULT_SYSTEM_PROMPT etc. bleiben gleich) ...
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 1500;

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
    // 1. Anfragedaten lesen (bleibt gleich)
    const body = await request.json();
    const {
        action = 'generate',
        promptPackageSlug,
        variantIndex,
        placeholders,
        tone,
        originalText,
        additionalInfo
    } = body;

    console.log("Empfangene Aktion:", action);
    console.log("Empfangene Daten:", { promptPackageSlug, variantIndex, action });

    // Validierungen (bleiben gleich)
    if (['generate', 'rephrase'].includes(action)) {
        if (!promptPackageSlug || typeof variantIndex !== 'number' || variantIndex < 0 || !placeholders || typeof placeholders !== 'object') {
           return NextResponse.json({ error: 'Ungültige Eingabedaten für Generierung/Neuformulierung.' }, { status: 400 });
        }
    }
    if (action === 'refine') {
        if (!originalText || !additionalInfo) {
            return NextResponse.json({ error: 'Fehlende Daten für Verfeinerung (originalText, additionalInfo).' }, { status: 400 });
        }
    }

    // 2. Authentifizierung/Autorisierung (ANGEPASST)
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

      // --- NEUE LOGIK: Testuser-Prüfung ---
      if (user.email === TEST_USER_EMAIL) {
        hasAccess = true;
        console.log(`Zugriff gewährt: Spezieller Testuser (${user.email}).`);
      } else {
        // --- Bestehende/Zukünftige Logik für normale User ---
        // Zugriffsprüfung (TODO bleibt bestehen)
        if (action !== 'refine' && promptPackageSlug) {
            console.warn("WARNUNG: Zugriffsprüfung für gekaufte Pakete ist noch nicht implementiert!");
            // TODO: Implementiere hier die echte Prüfung, ob der User das Paket gekauft hat.
            // Beispiel (pseudocode):
            // const { data: purchaseData, error: purchaseError } = await supabaseService
            //   .from('user_purchases') // Annahme: Tabelle mit Käufen
            //   .select('package_slug')
            //   .eq('user_id', user.id)
            //   .eq('package_slug', promptPackageSlug)
            //   .maybeSingle();
            //
            // if (purchaseError) { /* Fehlerbehandlung */ }
            // hasAccess = !!purchaseData; // Zugriff, wenn Kauf vorhanden

            hasAccess = true; // Temporär, bis echte Prüfung implementiert ist

            if (!hasAccess) {
               console.log(`Zugriff verweigert für User ${user.email} auf Paket ${promptPackageSlug}.`);
               return NextResponse.json({ error: 'Kein Zugriff auf dieses Prompt-Paket.' }, { status: 403 });
            }
            console.log(`Zugriff gewährt für User ${user.email} auf Paket ${promptPackageSlug}.`);
        } else if (action === 'refine') {
            // Refine ist generell erlaubt für eingeloggte User (oder nur für Testuser/Käufer?)
            // Aktuell: Erlaubt für alle eingeloggten User (inkl. Testuser durch obige Prüfung)
            hasAccess = true;
            console.log(`Zugriff für Refine-Aktion gewährt für User ${user.email}.`);
        } else {
            // Sollte nicht passieren, wenn Validierung oben greift
            return NextResponse.json({ error: 'Ungültige Anfrage nach Authentifizierung.' }, { status: 400 });
        }
        // --- Ende Bestehende/Zukünftige Logik ---
      }
      // --- Ende NEUE LOGIK ---
    }

    // 3. OpenAI Prompt vorbereiten (bleibt gleich)
    if (hasAccess) {
      let systemPrompt = "";
      let userPrompt = "";

      if (action === 'generate' || action === 'rephrase') {
        // ... (Code zum Holen der Variante und Bestimmen des System-Prompts bleibt gleich) ...
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

        systemPrompt = selectedVariant.system_prompt || DEFAULT_SYSTEM_PROMPT;
        console.log(`Verwendeter Systemprompt für ${promptPackageSlug} (Variante ${variantIndex}): ${selectedVariant.system_prompt ? 'Individuell' : 'Standard'}`);

        if (action === 'rephrase') {
            systemPrompt += "\nFormuliere den folgenden Text neu, behalte aber den Kerninhalt und den gewünschten Ton bei. Sei dabei kreativ.";
            console.log("Systemprompt für Rephrase angepasst.");
        }

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
        // ... (Code für Refine bleibt gleich) ...
        systemPrompt = REFINE_SYSTEM_PROMPT;
        userPrompt = `Ursprünglicher Text:\n"""\n${originalText}\n"""\n\nZusätzliche Anweisungen/Informationen:\n"""\n${additionalInfo}\n"""\n\nBitte gib nur den überarbeiteten Text zurück.`;
        console.log("Systemprompt für Refine gesetzt.");

      } else {
        return NextResponse.json({ error: 'Unbekannte Aktion.' }, { status: 400 });
      }

      // 4. OpenAI API aufrufen (bleibt gleich)
      console.log(`Rufe OpenAI API für Aktion '${action}' auf...`);
      const completion = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: DEFAULT_TEMPERATURE,
        max_tokens: DEFAULT_MAX_TOKENS,
      });

      // 5. Ergebnis extrahieren und zurückgeben (bleibt gleich)
      const aiResponseContent = completion.choices?.[0]?.message?.content;
      if (!aiResponseContent) {
          console.error('Keine gültige Antwort von OpenAI erhalten:', completion);
          return NextResponse.json({ error: 'Keine gültige Antwort von OpenAI.' }, { status: 500 });
      }
      console.log("Antwort von OpenAI erfolgreich erhalten.");
      return NextResponse.json({ generatedText: aiResponseContent.trim() });

    } // Ende von if(hasAccess)

    // Fallback (sollte nicht erreicht werden)
    return NextResponse.json({ error: 'Zugriff nicht erlaubt.' }, { status: 403 });

  } catch (error) {
     // Allgemeine Fehlerbehandlung (bleibt gleich)
     console.error("Schwerwiegender Fehler in /api/generate:", error);
     // ... (Rest der Fehlerbehandlung) ...
     if (error.response) {
         console.error("OpenAI API Fehler Details:", error.response.data);
         return NextResponse.json({ error: `API Fehler: ${error.response.statusText || 'Unbekannt'}` }, { status: error.response.status || 500 });
     }
     if (error instanceof SyntaxError) {
         return NextResponse.json({ error: 'Ungültiges JSON im Request Body.' }, { status: 400 });
     }
     console.error("Fehlermeldung:", error.message);
     console.error("Stack Trace:", error.stack);
     return NextResponse.json({ error: `Interner Serverfehler: ${error.message}` }, { status: 500 });
  }
}
