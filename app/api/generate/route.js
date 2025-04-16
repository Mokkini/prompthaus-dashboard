// app/api/generate/route.js

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
// NUR den einfachen Client importieren
import { createClient } from '@supabase/supabase-js';

// Supabase Client einfach initialisieren (Top-Level)
// Verwende die korrekten Env-Variablen (URL ist jetzt NEXT_PUBLIC_...)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
  // Kein Cookie-Handling hier nötig für Service Role Key in dieser Route
);

// OpenAI Client initialisieren
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Definiere das zu verwendende OpenAI-Modell
const OPENAI_MODEL = 'gpt-4o-mini';

export async function POST(request) {
  console.log("API route /api/generate wurde aufgerufen.");

  // KEINE Client-Initialisierung mehr hier drin!

  try {
    // 1. Anfragedaten (Body) lesen
    const body = await request.json();
    const { promptPackageSlug, variantIndex, placeholders } = body;

    if (!promptPackageSlug || typeof variantIndex !== 'number' || variantIndex < 0 || !placeholders || typeof placeholders !== 'object') {
      console.error("Ungültige oder fehlende Eingabedaten:", body);
      return NextResponse.json({ error: 'Ungültige oder fehlende Eingabedaten: promptPackageSlug (string), variantIndex (number >= 0) und placeholders (object) sind erforderlich.' }, { status: 400 });
    }

    console.log("Empfangene Daten:", { promptPackageSlug, variantIndex, placeholders });

    // 2. Prompt-Template von Supabase holen (verwendet den oben initialisierten 'supabase' Client)
    console.log(`Suche Prompt-Paket mit Slug: ${promptPackageSlug}`);
    const { data: packageData, error: packageError } = await supabase
      .from('prompt_packages')
      .select('prompt_variants')
      .eq('slug', promptPackageSlug)
      .single();

    if (packageError) {
      console.error("Supabase Fehler beim Holen des Pakets:", packageError);
      if (packageError.code === 'PGRST116') {
         return NextResponse.json({ error: `Prompt-Paket mit Slug '${promptPackageSlug}' nicht gefunden.` }, { status: 404 });
      }
      return NextResponse.json({ error: 'Datenbankfehler beim Holen des Prompt-Pakets.' }, { status: 500 });
    }

    if (!packageData || !packageData.prompt_variants) {
         console.error("Keine prompt_variants im Paket gefunden:", packageData);
         return NextResponse.json({ error: 'Prompt-Paket gefunden, aber keine Varianten enthalten.' }, { status: 500 });
    }

    const variants = packageData.prompt_variants;
    console.log(`Paket gefunden, ${variants.length} Varianten enthalten.`);

    if (variantIndex >= variants.length) {
        console.error(`Ungültiger variantIndex ${variantIndex} für ${variants.length} Varianten.`);
        return NextResponse.json({ error: `Ungültiger variantIndex. Es gibt nur ${variants.length} Varianten (Index 0 bis ${variants.length - 1}).` }, { status: 400 });
    }

    const selectedVariant = variants[variantIndex];
    const templateString = selectedVariant.template;

    if (!templateString) {
         console.error("Ausgewählte Variante hat kein Template-Feld:", selectedVariant);
         return NextResponse.json({ error: 'Ausgewählte Prompt-Variante hat kein Template.' }, { status: 500 });
    }

    console.log(`Template für Variante ${variantIndex} ausgewählt.`);

    // 3. Platzhalter im Template ersetzen
    let filledTemplate = templateString;
    for (const key in placeholders) {
      if (Object.hasOwnProperty.call(placeholders, key)) {
        const placeholderToReplace = `{{${key}}}`;
        const value = String(placeholders[key]);
        filledTemplate = filledTemplate.split(placeholderToReplace).join(value);
      }
    }
    console.log("Fertig befülltes Template wird an OpenAI gesendet.");

    // 4. OpenAI API aufrufen
    console.log(`Rufe OpenAI API mit Modell ${OPENAI_MODEL} auf...`);
    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: filledTemplate }],
    });

    // 5. Ergebnis von OpenAI extrahieren und zurückgeben
    const aiResponseContent = completion.choices?.[0]?.message?.content;

    if (!aiResponseContent) {
      console.error("Konnte keine gültige Antwort von OpenAI extrahieren:", completion);
      return NextResponse.json({ error: 'Konnte keine gültige Antwort von OpenAI erhalten.' }, { status: 500 });
    }

    console.log("Antwort von OpenAI erfolgreich erhalten.");
    return NextResponse.json({ generatedText: aiResponseContent.trim() });

  } catch (error) {
    console.error("Schwerwiegender Fehler in /api/generate:", error);
    if (error.response) {
      console.error("OpenAI API Fehler Status:", error.response.status);
      console.error("OpenAI API Fehler Daten:", error.response.data);
      return NextResponse.json({ error: `OpenAI API Fehler: ${error.response.statusText || 'Unbekannt'}` }, { status: error.response.status || 500 });
    } else if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Ungültiges JSON im Request Body.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Interner Serverfehler beim Verarbeiten der Anfrage.' }, { status: 500 });
  }
}