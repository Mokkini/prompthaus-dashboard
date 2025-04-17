// app/api/generate/route.js - Mit System Prompt & Parametern

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js'; // Nur diesen Client hier

// Supabase Client (Service Role)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// OpenAI Client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenAI Modell und Parameter
const OPENAI_MODEL = 'gpt-4o-mini'; // Oder ein anderes Modell deiner Wahl
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 1500; // Passe dies nach Bedarf an

export async function POST(request) {
  console.log("API route /api/generate wurde aufgerufen.");

  try {
    // 1. Anfragedaten lesen (unverändert)
    const body = await request.json();
    const { promptPackageSlug, variantIndex, placeholders } = body;
    if (!promptPackageSlug || typeof variantIndex !== 'number' || variantIndex < 0 || !placeholders || typeof placeholders !== 'object') {
       return NextResponse.json({ error: 'Ungültige Eingabedaten.' }, { status: 400 });
    }
    console.log("Empfangene Daten:", { promptPackageSlug, variantIndex }); // Logge Platzhalter nicht unbedingt komplett

    // 2. Prompt-Template von Supabase holen (unverändert)
    console.log(`Suche Prompt-Paket mit Slug: ${promptPackageSlug}`);
    const { data: packageData, error: packageError } = await supabase
      .from('prompt_packages').select('prompt_variants').eq('slug', promptPackageSlug).single();

    if (packageError || !packageData || !packageData.prompt_variants) {
        // ... Fehlerbehandlung für Paket/Varianten wie vorher ...
        const status = packageError?.code === 'PGRST116' ? 404 : 500;
        const message = packageError?.code === 'PGRST116' ? `Paket '${promptPackageSlug}' nicht gefunden.` : 'DB Fehler beim Holen des Pakets/Varianten.';
        console.error("Supabase Fehler:", packageError || "Keine Varianten gefunden");
        return NextResponse.json({ error: message }, { status });
    }

    const variants = packageData.prompt_variants;
    if (!Array.isArray(variants) || variantIndex >= variants.length) { // Prüfe ob Array
        console.error("Ungültiger variantIndex oder Varianten kein Array:", variantIndex, variants);
        return NextResponse.json({ error: 'Ungültiger variantIndex oder Variantenformat.' }, { status: 400 });
    }

    const selectedVariant = variants[variantIndex];
    const templateString = selectedVariant.template;
    if (!templateString) {
         console.error("Leeres Template in Variante:", selectedVariant);
         return NextResponse.json({ error: 'Ausgewählte Variante hat kein Template.' }, { status: 500 });
    }
    console.log(`Template für Variante ${variantIndex} ausgewählt.`);

    // 3. Platzhalter ersetzen (unverändert)
    let filledTemplate = templateString;
    for (const key in placeholders) {
        const placeholderToReplace = `{{${key}}}`;
        const value = String(placeholders[key]); // Sicherstellen, dass es ein String ist
        filledTemplate = filledTemplate.split(placeholderToReplace).join(value);
    }
    console.log("Fertig befülltes Template (User Prompt) erstellt.");


    // 4. OpenAI API aufrufen - *** JETZT MIT SYSTEM PROMPT & PARAMETERN ***
    console.log(`Rufe OpenAI API mit Modell ${OPENAI_MODEL} auf...`);

    // *** NEU: Definiere hier deinen System Prompt! ***
    // NEUER System Prompt - Erlaubt mehr Anpassung
const systemPrompt = "Du bist ein hilfreicher Assistent. Nutze die folgende Vorlage und die vom Benutzer eingegebenen Platzhalter als Basis, um einen passenden und ansprechenden Text zu generieren. Passe Stil und Formulierung gerne kreativ und sinnvoll an den jeweiligen Kontext an, um das bestmögliche Ergebnis zu erzielen.";
    // Optional: Hole System Prompt aus packageData oder selectedVariant, falls du das später einbaust.

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt }, // <-- System Nachricht hinzugefügt!
        { role: 'user', content: filledTemplate }   // <-- Der eigentliche Prompt
      ],
      temperature: DEFAULT_TEMPERATURE,     // <-- Temperatur hinzugefügt
      max_tokens: DEFAULT_MAX_TOKENS,       // <-- Max Tokens hinzugefügt
      // weitere Parameter wie top_p, presence_penalty etc. hier möglich
    });

    // 5. Ergebnis extrahieren und zurückgeben (unverändert)
    const aiResponseContent = completion.choices?.[0]?.message?.content;
    if (!aiResponseContent) {
         console.error("Keine gültige Antwort von OpenAI extrahiert:", completion);
         return NextResponse.json({ error: 'Konnte keine gültige Antwort von OpenAI erhalten.' }, { status: 500 });
    }
    console.log("Antwort von OpenAI erfolgreich erhalten.");
    return NextResponse.json({ generatedText: aiResponseContent.trim() });

  } catch (error) {
     // Fehlerbehandlung (unverändert)
     console.error("Schwerwiegender Fehler in /api/generate:", error);
     // ... (restliche Fehlerbehandlung wie vorher) ...
      if (error.response) { /* OpenAI API Fehler */ return NextResponse.json({ error: `OpenAI API Fehler: ${error.response.statusText || 'Unbekannt'}` }, { status: error.response.status || 500 });}
      if (error instanceof SyntaxError) { /* JSON Fehler */ return NextResponse.json({ error: 'Ungültiges JSON im Request Body.' }, { status: 400 }); }
      return NextResponse.json({ error: `Interner Serverfehler: ${error.message}` }, { status: 500 }); // Gib mehr Details zurück
  }
}