// app/admin/prompts/actions.js - Mit Stripe-Integration für Erstellen/Löschen und Bulk-Erstellung

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
// --- Stripe importieren ---
import Stripe from 'stripe';

// --- Stripe initialisieren ---
// Stelle sicher, dass STRIPE_SECRET_KEY in deinen Umgebungsvariablen gesetzt ist
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10', // Oder deine gewünschte API-Version
  typescript: false,
});
// --- ENDE Stripe ---


// --- FUNKTION: getAdminPageData (unverändert) ---
export async function getAdminPageData() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Fehler beim Holen des Benutzers oder nicht eingeloggt:", userError?.message);
    return { success: false, error: 'Nicht eingeloggt.', user: null, prompts: [] };
  }
  // --- Admin Check (Optional, aber empfohlen) ---
  // if (user.email !== process.env.ADMIN_EMAIL) {
  //   console.warn(`Nicht-Admin (${user.email}) versucht auf Admin-Daten zuzugreifen.`);
  //   return { success: false, error: 'Nicht autorisiert.', user: user, prompts: [] };
  // }
  // --- Ende Admin Check ---
  const { data: prompts, error: promptsError } = await supabase
    .from('prompt_packages')
    .select('*') // Alle Spalten auswählen
    .order('name', { ascending: true });
  if (promptsError) {
    console.error("Fehler beim Laden der Prompt-Pakete:", promptsError.message);
    return { success: false, error: `Fehler beim Laden der Pakete: ${promptsError.message}`, user: user, prompts: [] };
  }
  return { success: true, user: user, prompts: prompts || [] };
}

// --- FUNKTION: getEditPageData (unverändert) ---
export async function getEditPageData(packageId) {
  if (!packageId) {
    console.error("getEditPageData: Keine Paket-ID übergeben.");
    return { success: false, error: 'Ungültige Anfrage: Paket-ID fehlt.', user: null, promptPackage: null };
  }
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Fehler beim Holen des Benutzers oder nicht eingeloggt:", userError?.message);
    return { success: false, error: 'Nicht eingeloggt.', user: null, promptPackage: null };
  }
  // --- Admin Check (Optional, aber empfohlen) ---
  // if (user.email !== process.env.ADMIN_EMAIL) {
  //   console.warn(`Nicht-Admin (${user.email}) versucht auf Edit-Daten zuzugreifen.`);
  //   return { success: false, error: 'Nicht autorisiert.', user: user, promptPackage: null };
  // }
  // --- Ende Admin Check ---
  console.log(`Versuche Paket mit ID ${packageId} für Bearbeitung zu laden...`);
  const { data: promptPackage, error: packageError } = await supabase
    .from('prompt_packages')
    .select('*') // Alle Spalten auswählen
    .eq('id', packageId)
    .single();
  if (packageError) {
    console.error(`Fehler beim Laden des Pakets ${packageId}:`, packageError.message);
    if (packageError.code === 'PGRST116') { // PostgREST Fehlercode für "Keine oder mehrere Zeilen gefunden"
         return { success: false, error: `Paket mit ID ${packageId} nicht gefunden.`, user: user, promptPackage: null };
    }
    return { success: false, error: `Fehler beim Laden des Pakets: ${packageError.message}`, user: user, promptPackage: null };
  }
  if (!promptPackage) {
      // Sollte durch .single() und PGRST116 abgedeckt sein, aber zur Sicherheit
      console.warn(`Kein Paket mit ID ${packageId} gefunden (aber kein DB-Fehler).`);
      return { success: false, error: `Paket mit ID ${packageId} nicht gefunden.`, user: user, promptPackage: null };
  }
  console.log(`Paket ${packageId} erfolgreich geladen.`);
  return { success: true, user: user, promptPackage: promptPackage };
}

// --- Schemas (unverändert) ---
const PromptDataSchema = z.object({
  context: z.object({}).passthrough(),
  semantic_data: z.object({}).passthrough(),
  writing_instructions: z.object({}).passthrough(),
}).strict();

const PromptPackageSchema = z.object({
  name: z.string().min(3, "Name ist erforderlich (mind. 3 Zeichen)."),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.").min(3, "Slug ist erforderlich (mind. 3 Zeichen)."),
  category: z.string().optional(),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Preis muss eine positive Zahl sein."),
  tags: z.string().optional(),
  promptDataJson: z.string().min(1, "Prompt-Daten JSON ist erforderlich."),
});

// --- FUNKTION: addPromptPackage (ANGEPASST für Stripe) ---
export async function addPromptPackage(formData) {
  const supabaseAdmin = createClient(); // Admin Client für DB-Operationen

  // 1. Daten validieren (wie bisher)
  const rawFormData = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    category: formData.get('category'),
    description: formData.get('description'),
    price: formData.get('price'),
    tags: formData.get('tags'),
    promptDataJson: formData.get('promptDataJson'),
  };
  const validatedFields = PromptPackageSchema.safeParse(rawFormData);
  if (!validatedFields.success) {
    console.error("Validierungsfehler (Paket):", validatedFields.error.flatten().fieldErrors);
    return {
      success: false,
      message: "Validierungsfehler: " + Object.values(validatedFields.error.flatten().fieldErrors).flat().join(' '),
    };
  }

  // 2. JSON parsen und validieren (wie bisher)
  const { promptDataJson, tags: tagsString, price, ...packageData } = validatedFields.data;
  let parsedPromptData;
  try {
    parsedPromptData = JSON.parse(promptDataJson);
  } catch (e) {
    console.error("JSON Parse Fehler:", e.message);
    return { success: false, message: "Fehler im Prompt-Daten JSON: Ungültiges Format." };
  }
  const validatedPromptData = PromptDataSchema.safeParse(parsedPromptData);
  if (!validatedPromptData.success) {
    console.error("Validierungsfehler (Prompt-Daten):", validatedPromptData.error.flatten().fieldErrors);
    // Detailliertere Fehlermeldung für den Benutzer (wie bisher)
    const firstErrorPath = validatedPromptData.error.errors[0]?.path.join('.');
    const firstErrorMessage = validatedPromptData.error.errors[0]?.message;
    let userMessage = "Fehler in der Struktur der Prompt-Daten.";
    if (firstErrorPath && firstErrorMessage) {
        userMessage = `Fehler im Prompt-Daten JSON (${firstErrorPath}): ${firstErrorMessage}`;
    } else if (firstErrorMessage) {
         userMessage = `Fehler im Prompt-Daten JSON: ${firstErrorMessage}`;
    } // ... (restliche spezifische Fehlermeldungen wie bisher)
    return { success: false, message: userMessage };
  }

  // 3. Tags verarbeiten (wie bisher)
  const tagsArray = tagsString
    ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
    : [];

  // 4. Paket in Supabase speichern (WICHTIG: stripe_price_id wird später hinzugefügt)
  let supabasePackageData; // Variable für die Supabase-Daten
  try {
    const { data, error } = await supabaseAdmin
      .from('prompt_packages')
      .insert([{
          ...packageData, // name, slug, category, description
          price: price, // Preis hier auch speichern
          ...validatedPromptData.data, // context, semantic_data, writing_instructions
          tags: tagsArray,
          // stripe_price_id wird später hinzugefügt/aktualisiert
       }])
      .select() // Wichtig: Daten zurückholen, um die ID zu bekommen
      .single(); // Wir erwarten nur einen Datensatz

    if (error) {
      console.error("Supabase Insert Fehler:", error);
      if (error.code === '23505' && error.message.includes('prompt_packages_slug_key')) {
          return { success: false, message: `Fehler: Der Slug "${packageData.slug}" existiert bereits. Bitte wähle einen anderen.` };
      }
      return { success: false, message: `Datenbankfehler: ${error.message}` };
    }
    supabasePackageData = data; // Speichere die zurückgegebenen Daten (inkl. ID)
    console.log("Prompt-Paket erfolgreich in Supabase hinzugefügt:", supabasePackageData);

  } catch (e) {
    console.error("Unerwarteter Fehler beim Supabase Insert:", e);
    return { success: false, message: `Unerwarteter Serverfehler beim DB-Insert: ${e.message}` };
  }

  // --- NEU: Schritt 5: Stripe Produkt und Preis erstellen ---
  let stripePriceId = null;
  if (supabasePackageData && supabasePackageData.id) { // Nur wenn Supabase erfolgreich war und wir eine ID haben
    try {
      console.log(`[Stripe] Erstelle Produkt für Paket: ${packageData.name}`);
      // 5a: Stripe Produkt erstellen
      const product = await stripe.products.create({
        name: packageData.name,
        description: packageData.description || undefined, // Optional Beschreibung hinzufügen
        metadata: {
          supabase_package_id: supabasePackageData.id, // Verknüpfung zur Supabase ID
          slug: packageData.slug,
        }
      });
      console.log(`[Stripe] Produkt erstellt: ${product.id}`);

      // 5b: Stripe Preis erstellen (Preis muss in Cent sein!)
      const priceInCents = Math.round(price * 100);
      console.log(`[Stripe] Erstelle Preis (${priceInCents} Cent) für Produkt: ${product.id}`);
      const stripePrice = await stripe.prices.create({
        product: product.id,
        unit_amount: priceInCents,
        currency: 'eur', // Währung anpassen, falls nötig (z.B. 'usd')
        metadata: {
           supabase_package_id: supabasePackageData.id,
        }
        // Optional: recurring für Abos hinzufügen:
        // recurring: { interval: 'month' }, // z.B. für monatliche Abos
      });
      stripePriceId = stripePrice.id; // Die ID des Preis-Objekts speichern
      console.log(`[Stripe] Preis erstellt: ${stripePriceId}`);

      // 5c: Supabase Paket mit Stripe Preis-ID aktualisieren
      console.log(`[Supabase] Aktualisiere Paket ${supabasePackageData.id} mit Stripe Price ID: ${stripePriceId}`);
      const { error: updateError } = await supabaseAdmin
        .from('prompt_packages')
        .update({ stripe_price_id: stripePriceId })
        .eq('id', supabasePackageData.id);

      if (updateError) {
        console.error(`[Supabase] Fehler beim Aktualisieren des Pakets ${supabasePackageData.id} mit Stripe Price ID:`, updateError);
        // WICHTIG: Fehlerbehandlung, wenn das Update fehlschlägt
        // Das Paket existiert in Supabase, aber ohne Stripe-Verknüpfung.
        // Stripe Produkt/Preis existieren aber!
        return {
            success: false, // Signalisiert einen Fehler im Gesamtprozess
            message: `Paket in DB erstellt, Stripe Produkt/Preis erstellt (${stripePriceId}), ABER Fehler beim Speichern der Stripe Preis-ID in DB: ${updateError.message}. Bitte manuell in DB nachtragen!`
            // Hier könnte man versuchen, das Stripe Produkt/Preis wieder zu löschen, um Konsistenz herzustellen (komplexer)
        };
      }
      console.log(`[Supabase] Paket ${supabasePackageData.id} erfolgreich mit Stripe Price ID aktualisiert.`);

    } catch (stripeError) {
      console.error("[Stripe] Fehler beim Erstellen von Produkt/Preis oder DB-Update:", stripeError);
      // WICHTIG: Fehlerbehandlung, wenn Stripe fehlschlägt
      // Das Paket existiert in Supabase, aber ohne Stripe-Verknüpfung.
      // Versuche, das gerade erstellte Supabase-Paket wieder zu löschen, um Konsistenz zu wahren.
      console.warn(`[Rollback] Versuche Supabase-Paket ${supabasePackageData.id} wegen Stripe-Fehler zu löschen...`);
      try {
          await supabaseAdmin.from('prompt_packages').delete().eq('id', supabasePackageData.id);
          console.log(`[Rollback] Supabase-Paket ${supabasePackageData.id} erfolgreich gelöscht.`);
      } catch (rollbackError) {
          console.error(`[Rollback] Kritisch: Fehler beim Löschen des Supabase-Pakets ${supabasePackageData.id} nach Stripe-Fehler:`, rollbackError);
          // In diesem Fall existiert das Paket in Supabase ohne Stripe-Verknüpfung. Manueller Eingriff nötig.
          return {
              success: false,
              message: `Paket in DB erstellt, aber Fehler bei Stripe: ${stripeError.message}. Automatisches Rollback des DB-Eintrags ist fehlgeschlagen! Bitte manuell prüfen.`
          };
      }
      // Wenn Rollback erfolgreich war:
      return {
        success: false, // Signalisiert einen Fehler im Gesamtprozess
        message: `Fehler bei Stripe: ${stripeError.message}. Das Paket wurde nicht erstellt (DB-Eintrag zurückgerollt).`
      };
    }
  } else {
      // Sollte nicht passieren, wenn der erste Try-Block erfolgreich war
      console.error("Fehler: Supabase-Daten nach Insert nicht verfügbar, kann Stripe nicht erstellen.");
      return { success: false, message: "Interner Fehler: Supabase-Daten nach Insert nicht verfügbar." };
  }
  // --- ENDE NEU (für Stripe) ---

  // 6. Cache Revalidierung (wie bisher, aber Checkout-Seite hinzugefügt)
  console.log("Revalidiere Caches...");
  revalidatePath('/admin/prompts'); // Admin-Übersicht
  revalidatePath('/pakete'); // Öffentliche Paketliste
  revalidatePath(`/pakete/${packageData.slug}`); // Detailseite des Pakets
  revalidatePath(`/checkout/${packageData.slug}`); // Checkout-Seite (wichtig wegen stripe_price_id)

  // 7. Erfolgsmeldung zurückgeben (angepasst)
  return {
      success: true,
      message: 'Prompt-Paket erfolgreich hinzugefügt und in Stripe angelegt.',
      // Optional: Die erstellten Daten zurückgeben, falls das Frontend sie braucht
      data: { ...supabasePackageData, stripe_price_id: stripePriceId }
  };
}


// --- FUNKTION: deletePromptPackage (ANGEPASST für Stripe Produkt-Deaktivierung) ---
export async function deletePromptPackage(id) {
  const supabaseAdmin = createClient();

  // --- NEU (Stripe): Optional: Stripe Produkt deaktivieren ---
  // Bevor wir aus der DB löschen, holen wir die Stripe Produkt/Preis IDs
  // ACHTUNG: Das Löschen aus der DB passiert trotzdem, auch wenn Stripe fehlschlägt!
  // Eine robustere Lösung würde Transaktionen oder komplexere Fehlerbehandlung erfordern.
  let stripeProductId = null;
  try {
      const { data: packageData, error: fetchError } = await supabaseAdmin
          .from('prompt_packages')
          .select('stripe_price_id') // Nur die Price ID holen
          .eq('id', id)
          .single();

      if (fetchError) {
          console.warn(`[Stripe Delete] Konnte Paket ${id} nicht finden, um Stripe ID zu holen: ${fetchError.message}`);
      } else if (packageData?.stripe_price_id) {
          // Preis holen, um Produkt-ID zu bekommen
          try {
              const price = await stripe.prices.retrieve(packageData.stripe_price_id);
              stripeProductId = typeof price.product === 'string' ? price.product : null; // Sicherstellen, dass es ein String ist

              if (stripeProductId) {
                  console.log(`[Stripe Delete] Deaktiviere Produkt ${stripeProductId} für Paket ${id}`);
                  await stripe.products.update(stripeProductId, { active: false });
                  console.log(`[Stripe Delete] Produkt ${stripeProductId} erfolgreich deaktiviert.`);
              } else {
                  console.warn(`[Stripe Delete] Konnte keine Produkt-ID aus Preis ${packageData.stripe_price_id} extrahieren.`);
              }
          } catch (stripeError) {
              // Fehler loggen, aber DB-Löschung fortsetzen
              console.error(`[Stripe Delete] Fehler beim Abrufen/Deaktivieren von Produkt für Price ID ${packageData.stripe_price_id}:`, stripeError);
              // Hier könnte man überlegen, ob man den Fehler an den Client zurückgibt
              // return { success: false, error: `DB-Löschung gestartet, aber Fehler bei Stripe: ${stripeError.message}` };
          }
      } else {
          console.log(`[Stripe Delete] Paket ${id} hat keine Stripe Price ID, überspringe Deaktivierung.`);
      }
  } catch (e) {
      console.error(`[Stripe Delete] Unerwarteter Fehler beim Holen/Deaktivieren des Stripe Produkts für Paket ${id}:`, e);
      // Fehler loggen, aber DB-Löschung fortsetzen
  }
  // --- ENDE NEU (Stripe) ---


  console.log(`Versuche Paket mit ID ${id} aus Supabase zu löschen...`);
  try {
    // Löschen aus Supabase DB
    const { error } = await supabaseAdmin.from('prompt_packages').delete().match({ id: id });

    if (error) {
      console.error("Supabase Delete Fehler:", error);
      // Gib spezifische Fehlermeldung zurück
      return { success: false, error: `Datenbankfehler beim Löschen: ${error.message}` };
    }

    console.log(`Paket mit ID ${id} erfolgreich aus Supabase gelöscht.`);

    // Cache Revalidierung (wichtig!)
    revalidatePath('/admin/prompts');
    revalidatePath('/pakete');
    // Man könnte auch versuchen, die spezifischen Paket- und Checkout-Seiten zu revalidieren,
    // aber da der Slug nach dem Löschen nicht mehr bekannt ist, ist das schwierig.
    // Die Revalidierung von /pakete sollte ausreichen.

    return { success: true }; // Erfolg melden

  } catch (e) {
    console.error("Unerwarteter Fehler in deletePromptPackage:", e);
    // Gib allgemeine Fehlermeldung zurück
    return { success: false, error: `Unerwarteter Serverfehler: ${e.message}` };
  }
}


// --- FUNKTION: updatePromptPackage (ANGEPASST mit Hinweis auf manuelle Stripe-Preisänderung) ---
export async function updatePromptPackage(formData) {
  const supabaseAdmin = createClient();

  // 1. Daten extrahieren (inkl. ID, JSON-String UND Tags-String)
  const packageId = formData.get('packageId');
  console.log('[updatePromptPackage] Empfangene packageId:', packageId);
  const name = formData.get('name');
  const description = formData.get('description');
  const category = formData.get('category');
  const priceString = formData.get('price'); // Preis als String
  const promptDataJson = formData.get('promptDataJson');
  const tagsString = formData.get('tags');

  // 2. ID-Prüfung
  if (!packageId) {
    console.error('[updatePromptPackage] Fehler: packageId fehlt im FormData.');
    return { success: false, message: "Fehler: Paket-ID fehlt." };
  }

  // 3. JSON parsen und validieren (wie bisher)
  let parsedPromptData;
  try {
    parsedPromptData = JSON.parse(promptDataJson);
    // Einfache Strukturprüfung (wie bisher)
    if (typeof parsedPromptData !== 'object' || parsedPromptData === null ||
        typeof parsedPromptData.context !== 'object' || parsedPromptData.context === null ||
        typeof parsedPromptData.semantic_data !== 'object' || parsedPromptData.semantic_data === null ||
        typeof parsedPromptData.writing_instructions !== 'object' || parsedPromptData.writing_instructions === null) {
      throw new Error("JSON hat nicht die erwartete Grundstruktur (context, semantic_data, writing_instructions).");
    }
    // Zusätzliche Validierung mit Zod (wie bisher)
    const validatedPromptData = PromptDataSchema.safeParse(parsedPromptData);
    if (!validatedPromptData.success) {
        const firstErrorPath = validatedPromptData.error.errors[0]?.path.join('.');
        const firstErrorMessage = validatedPromptData.error.errors[0]?.message;
        throw new Error(`Strukturfehler im JSON (${firstErrorPath || 'unbekannt'}): ${firstErrorMessage || 'Unbekannter Validierungsfehler'}`);
    }
    // parsedPromptData = validatedPromptData.data; // Verwende die validierten Daten

  } catch (e) {
    console.error("JSON Parse/Struktur Fehler beim Update:", e.message);
    return { success: false, message: `Fehler im Prompt-Daten JSON: ${e.message}` };
  }

  // 4. Preis validieren (aus String)
  const priceFloat = parseFloat(priceString);
  if (isNaN(priceFloat) || priceFloat < 0) {
    return { success: false, message: "Fehler: Ungültiger Preis angegeben." };
  }

  // 5. Tags-String verarbeiten (wie bisher)
  const tagsArray = tagsString
    ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
    : [];

   // 6. Daten in der Datenbank aktualisieren (inkl. Tags)
    try {
      console.log(`[updatePromptPackage] Versuche Update für ID: ${packageId}`);

      // --- WICHTIG: Stripe Preis wird hier NICHT automatisch aktualisiert! ---
      // Wir aktualisieren nur die Daten in unserer Datenbank.
      // Wenn sich der Preis ändert, muss der Admin den Preis manuell in Stripe anpassen
      // oder wir müssten hier zusätzliche Logik einbauen (komplexer, z.B. neuen Preis erstellen).

      const { data, error } = await supabaseAdmin
        .from('prompt_packages')
        .update({
          name: name,
          description: description,
          category: category,
          price: priceFloat, // Den validierten Float-Preis speichern
          context: parsedPromptData.context,
          semantic_data: parsedPromptData.semantic_data,
          writing_instructions: parsedPromptData.writing_instructions,
          tags: tagsArray,
          // stripe_price_id wird NICHT geändert, es sei denn, wir implementieren Preis-Update-Logik
        })
        .match({ id: packageId }) // Wichtig: Nur den Datensatz mit der passenden ID ändern
        .select() // Daten nach dem Update zurückholen
        .single(); // Erwarte genau einen Datensatz


    if (error) {
      console.error("Supabase Update Fehler:", error);
      if (error.code === 'PGRST116') {
          return { success: false, message: `Datenbankfehler beim Update: Paket mit ID ${packageId} nicht gefunden oder Bedingung nicht eindeutig.` };
      }
      return { success: false, message: `Datenbankfehler beim Update: ${error.message}` };
    }

    console.log("Prompt-Paket erfolgreich aktualisiert:", data);

    // 7. Cache Revalidierung (wie bisher)
    revalidatePath('/admin/prompts');
    revalidatePath('/pakete');
    if (data?.slug) { // Slug aus der Antwort nehmen, falls vorhanden
      revalidatePath(`/pakete/${data.slug}`);
      revalidatePath(`/checkout/${data.slug}`);
      revalidatePath(`/admin/prompts/edit/${packageId}`); // Auch die Edit-Seite neu laden
    }

    // --- NEU: Hinweis auf manuelle Stripe-Preisänderung hinzufügen ---
    let successMessage = 'Änderungen erfolgreich gespeichert.';
    // Optional: Prüfen, ob sich der Preis tatsächlich geändert hat (komplexer, da alter Preis geholt werden müsste)
    // Hier einfacher Hinweis, wenn der Preis > 0 ist (oder sich geändert hat)
    // Man könnte den alten Preis aus `initialData` im Frontend mitgeben, aber das ist unsicher.
    // Sicherer wäre, den alten Preis vor dem Update aus der DB zu holen.
    // Fürs Erste: Immer den Hinweis anzeigen, wenn ein Preis gesetzt ist.
    if (priceFloat > 0) {
        successMessage += ' WICHTIG: Der Preis in Stripe wurde nicht automatisch angepasst. Bitte bei Bedarf manuell im Stripe Dashboard ändern!';
    }
    // --- ENDE NEU ---


    return { success: true, message: successMessage, data };

  } catch (e) {
    console.error("[updatePromptPackage] Unerwarteter Fehler im try-catch:", e);
    return { success: false, message: `Unerwarteter Serverfehler: ${e.message}` };
  }
}

// --- NEUE FUNKTION: bulkCreateStripeProducts ---
export async function bulkCreateStripeProducts() {
  console.log('[Bulk Stripe] Starte Massenerstellung von Stripe Produkten/Preisen...');
  const supabaseAdmin = createClient();
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  try {
    // 1. Hole alle Pakete aus Supabase, bei denen die stripe_price_id fehlt
    console.log('[Bulk Stripe] Suche Pakete ohne Stripe Price ID...');
    const { data: packagesToProcess, error: fetchError } = await supabaseAdmin
      .from('prompt_packages')
      .select('id, name, description, price, slug') // Nur benötigte Felder holen
      .is('stripe_price_id', null); // Nur Pakete ohne Stripe ID

    if (fetchError) {
      console.error('[Bulk Stripe] Fehler beim Holen der Pakete:', fetchError);
      return { success: false, message: `Fehler beim Abrufen der Pakete aus der Datenbank: ${fetchError.message}` };
    }

    if (!packagesToProcess || packagesToProcess.length === 0) {
      console.log('[Bulk Stripe] Keine Pakete gefunden, die eine Stripe ID benötigen.');
      return { success: true, message: 'Keine Pakete gefunden, für die Stripe Produkte/Preise erstellt werden müssen.' };
    }

    console.log(`[Bulk Stripe] ${packagesToProcess.length} Paket(e) gefunden. Verarbeite...`);

    // 2. Iteriere über jedes gefundene Paket
    for (const pkg of packagesToProcess) {
      let createdStripePriceId = null;
      try {
        console.log(`[Bulk Stripe] Verarbeite Paket ID: ${pkg.id}, Name: ${pkg.name}`);

        // 2a. Stripe Produkt erstellen
        const product = await stripe.products.create({
          name: pkg.name,
          description: pkg.description || undefined,
          metadata: {
            supabase_package_id: pkg.id,
            slug: pkg.slug,
          }
        });
        console.log(`[Bulk Stripe] Stripe Produkt erstellt: ${product.id} für Paket ${pkg.id}`);

        // 2b. Stripe Preis erstellen
        const priceInCents = Math.round(pkg.price * 100);
        const stripePrice = await stripe.prices.create({
          product: product.id,
          unit_amount: priceInCents,
          currency: 'eur', // Währung prüfen/anpassen
          metadata: {
            supabase_package_id: pkg.id,
          }
        });
        createdStripePriceId = stripePrice.id;
        console.log(`[Bulk Stripe] Stripe Preis erstellt: ${createdStripePriceId} für Produkt ${product.id}`);

        // 2c. Supabase Paket mit der neuen Stripe Preis-ID aktualisieren
        const { error: updateError } = await supabaseAdmin
          .from('prompt_packages')
          .update({ stripe_price_id: createdStripePriceId })
          .eq('id', pkg.id);

        if (updateError) {
          // Fehler beim Update, aber Stripe Produkt/Preis existieren!
          console.error(`[Bulk Stripe] Fehler beim Aktualisieren von Supabase Paket ${pkg.id} mit Stripe ID ${createdStripePriceId}:`, updateError);
          // Wir zählen es als Fehler, aber versuchen, das Stripe Produkt/Preis NICHT zurückzurollen,
          // da es manuell korrigiert werden kann (ID in DB eintragen).
          throw new Error(`DB Update fehlgeschlagen: ${updateError.message}. Stripe Produkt/Preis (${createdStripePriceId}) existiert.`);
        }

        console.log(`[Bulk Stripe] Supabase Paket ${pkg.id} erfolgreich mit Stripe ID ${createdStripePriceId} aktualisiert.`);
        successCount++;

        // Optional: Cache für die Checkout-Seite dieses Pakets revalidieren
        revalidatePath(`/checkout/${pkg.slug}`);

      } catch (loopError) {
        console.error(`[Bulk Stripe] Fehler bei der Verarbeitung von Paket ID ${pkg.id}:`, loopError);
        errorCount++;
        errors.push(`Paket ID ${pkg.id} (${pkg.name}): ${loopError.message}`);
        // Hier NICHT abbrechen, sondern mit dem nächsten Paket weitermachen!
      }
    } // Ende der for-Schleife

    // 3. Ergebnis zusammenfassen
    let finalMessage = `Massenverarbeitung abgeschlossen. ${successCount} Paket(e) erfolgreich in Stripe erstellt und verknüpft.`;
    if (errorCount > 0) {
      finalMessage += ` ${errorCount} Paket(e) fehlgeschlagen. Details siehe Server-Log und unten:\n- ${errors.join('\n- ')}`;
      console.error('[Bulk Stripe] Fehlerdetails:', errors);
      return { success: false, message: finalMessage }; // Gesamtergebnis ist "false" wegen Fehlern
    } else {
      // Optional: Cache für Übersichtsseiten revalidieren, wenn alles erfolgreich war
      revalidatePath('/admin/prompts');
      revalidatePath('/pakete');
      return { success: true, message: finalMessage };
    }

  } catch (generalError) {
    console.error('[Bulk Stripe] Unerwarteter Gesamtfehler:', generalError);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${generalError.message}` };
  }
}
