// app/api/generate/route.js - ANGEPASST für neue DB-Struktur und kostenlosen Prompt

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient as createServiceRoleClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

// --- ANGEPASST: Slug für den kostenlosen Prompt ---
const FREE_PROMPT_SLUG = 'testprompt'; // <-- Geändert
// --- ENDE ANPASSUNG ---

const TEST_USER_EMAIL = 'danadi@gmx.de'; // Deine Test-E-Mail

const supabaseService = createServiceRoleClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 1500;

// --- System Prompts (gekürzt) ---
const DEFAULT_SYSTEM_PROMPT = `Du bist ein professioneller Textassistent für moderne Kommunikation.
Deine Aufgabe ist es, aus den strukturierten Daten im User-Prompt einen vollständigen, kohärenten Text zu formulieren.
Berücksichtige dabei unbedingt alle Anweisungen zu Ton, Stil und Inhalt, die zusätzlich gegeben werden.
Wichtig: Wiederhole die Datenfelder (Schlüssel/Werte) nie wörtlich, sondern integriere die Informationen natürlich in den Text.
Formuliere so, wie Menschen heute auf Social Media, im Beruf oder im Alltag kommunizieren: klar, nahbar, prägnant.
Ziel ist ein kurzer, runder Text, der beim Lesen überzeugt – nicht einfach eine Ausfüllhilfe.
Gib NUR den finalen Text zurück, ohne Erklärungen oder die ursprünglichen Daten zu wiederholen.`;

const REFINE_SYSTEM_PROMPT = `Du bist ein hilfreicher Assistent. Deine Aufgabe ist es, einen vorhandenen Text basierend auf zusätzlichen Anweisungen oder Informationen zu überarbeiten und zu verbessern. Behalte den ursprünglichen Zweck und Ton bei, sofern nicht anders angewiesen.`;
// --- ENDE System Prompts ---

export async function POST(request) {
  console.log("API route /api/generate wurde aufgerufen.");

  let user = null;
  let hasAccess = false;
  let packageId = null;

  try {
    // 1. Anfragedaten lesen und validieren (bleibt gleich)
    const body = await request.json();
    const {
        action = 'generate',
        promptPackageSlug,
        variantId,
        placeholders,
        tone,
        originalText,
        additionalInfo
    } = body;

    console.log("Empfangene Aktion:", action);
    console.log("Empfangene Daten:", { promptPackageSlug, variantId, action, tone });

    // Grundlegende Validierung (bleibt gleich)
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

    // --- ANGEPASST: 2. Authentifizierung und Autorisierung ---
    // Prüfe zuerst, ob es sich um den kostenlosen Prompt handelt (generate oder rephrase)
    const isFreePromptRequest = promptPackageSlug === FREE_PROMPT_SLUG && (action === 'generate' || action === 'rephrase');

    if (isFreePromptRequest) {
      hasAccess = true;
      console.log(`Zugriff gewährt: Kostenloser Prompt '${FREE_PROMPT_SLUG}'.`);
      // Lade die Paket-ID für den kostenlosen Prompt
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
      // Wenn es NICHT der kostenlose Prompt ist, führe die normale Auth/Authz durch
      console.log("Kein kostenloser Prompt. Prüfe Authentifizierung...");
      const supabaseAuth = createServerClient();
      const { data: { user: loggedInUser }, error: userError } = await supabaseAuth.auth.getUser();

      if (userError || !loggedInUser) {
        console.error("Authentifizierungsfehler oder kein User:", userError?.message);
        return NextResponse.json({ error: 'Authentifizierung fehlgeschlagen. Bitte einloggen.' }, { status: 401 });
      }
      user = loggedInUser;
      console.log(`Authentifiziert als: ${user.email}`);

      // Prüfe Admin/Testuser (bleibt gleich)
      if (user.email === TEST_USER_EMAIL || user.email === process.env.ADMIN_EMAIL) {
        hasAccess = true;
        console.log(`Zugriff gewährt: Spezieller User (${user.email}).`);
        // Paket-ID für Admin/Testuser laden (bleibt gleich)
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
        // Normale Kaufprüfung für reguläre User (bleibt gleich)
        if (action !== 'refine' && promptPackageSlug) {
            console.log(`Prüfe Zugriff für User ${user.id} auf Paket ${promptPackageSlug}...`);
            // Paket-ID laden (bleibt gleich)
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

            // Kaufprüfung (bleibt gleich)
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
            // Refine ist für eingeloggte User generell erlaubt (bleibt gleich)
            hasAccess = true;
            console.log(`Zugriff für Refine-Aktion gewährt für User ${user.email}.`);
            // Paket-ID für Refine-Kontext laden (bleibt gleich)
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
            // Ungültige Anfrage (bleibt gleich)
            console.error("Ungültige Anfrage nach Authentifizierung (kein Slug für generate/rephrase):", body);
            return NextResponse.json({ error: 'Ungültige Anfrage nach Authentifizierung.' }, { status: 400 });
        }
      }
    }
    // --- ENDE ANPASSUNG ---

    // 3. OpenAI Prompt vorbereiten (bleibt gleich)
    if (hasAccess) {
      let systemPrompt = "";
      let userPrompt = "";
      let selectedVariantData = null;

      // Vorbereitung für 'generate' und 'rephrase' (bleibt gleich)
      if (action === 'generate' || action === 'rephrase') {
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

        // System Prompt Konstruktion (bleibt gleich)
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

        // User-Ton nur bei 'rephrase' hinzufügen (bleibt gleich)
        if (action === 'rephrase' && tone && typeof tone === 'string' && tone.trim()) {
          const userToneInstruction = `\n\nAchte zusätzlich besonders auf folgenden vom Benutzer gewünschten Tonfall: "${tone.trim()}"`;
          systemPrompt += userToneInstruction;
          console.log(`Systemprompt (Rephrase) erweitert um User-Ton: "${tone.trim()}"`);
        }

        // Systemprompt für 'rephrase' anpassen (bleibt gleich)
        if (action === 'rephrase') {
            systemPrompt += "\n\nFormuliere den Text basierend auf den Daten neu, behalte aber den Kerninhalt und den gewünschten Ton bei. Sei dabei kreativ.";
            console.log("Systemprompt für Rephrase angepasst.");
        }

        // User Prompt Konstruktion (bleibt gleich)
        const dataForAI = JSON.stringify(placeholders, null, 2);
        userPrompt = `Generiere den Text basierend auf diesen Daten:\n\n${dataForAI}\n\nBeachte die Anweisungen im System-Prompt.`;
        console.log("User Prompt (Daten-basiert) erstellt.");

      // Vorbereitung für 'refine' (bleibt gleich)
      } else if (action === 'refine') {
        systemPrompt = REFINE_SYSTEM_PROMPT;
         // User-Ton hinzufügen (bleibt gleich)
         if (tone && typeof tone === 'string' && tone.trim()) {
           systemPrompt += `\n\nAchte bei der Überarbeitung besonders auf folgenden vom Benutzer gewünschten Tonfall: "${tone.trim()}"`;
           console.log(`Refine-Systemprompt erweitert um User-Ton: "${tone.trim()}"`);
         }
        // User-Prompt für Refine (bleibt gleich)
        userPrompt = `Ursprünglicher Text:\n"""\n${originalText}\n"""\n\nZusätzliche Anweisungen/Informationen:\n"""\n${additionalInfo}\n"""\n\nBitte gib nur den überarbeiteten Text zurück.`;
        console.log("Systemprompt für Refine gesetzt/angepasst.");

      } else {
        // Unbekannte Aktion (bleibt gleich)
        console.error("Unbekannte Aktion:", action);
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

    // Fallback, falls hasAccess aus irgendeinem Grund false ist
    console.error("Unerwarteter Zustand: Zugriff nicht erlaubt.");
    return NextResponse.json({ error: 'Zugriff nicht erlaubt oder unerwarteter Zustand.' }, { status: 403 });

  } catch (error) {
     // Allgemeine Fehlerbehandlung (bleibt gleich)
     console.error("Schwerwiegender Fehler in /api/generate:", error);
     if (error.response && error.error) {
         console.error("OpenAI API Fehler Status:", error.status);
         console.error("OpenAI API Fehler Details:", error.error);
         return NextResponse.json({ error: `OpenAI API Fehler: ${error.error?.message || 'Unbekannt'}` }, { status: error.status || 500 });
     }
     if (error instanceof SyntaxError) {
         console.error("Fehler beim Parsen des Request Body:", error.message);
         return NextResponse.json({ error: 'Ungültiges JSON im Request Body.' }, { status: 400 });
     }
     console.error("Fehlermeldung:", error.message);
     console.error("Stack Trace:", error.stack);
     return NextResponse.json({ error: `Interner Serverfehler: ${error.message}` }, { status: 500 });
  }
}
