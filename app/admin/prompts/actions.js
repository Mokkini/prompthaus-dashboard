// app/admin/prompts/actions.js - Mit Stripe-Integration und korrekter Client-Initialisierung

'use server';

import { createClient } from '@/lib/supabase/server'; // Für User-Client (Auth-Check, Lesezugriff mit RLS)
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'; // Für Admin-Client (RLS-Bypass)
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import Stripe from 'stripe';

// --- Stripe initialisieren ---
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10', // Oder deine gewünschte API-Version
  typescript: false,
});

// --- HILFSFUNKTION für Admin Client ---
function getSupabaseAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error("[AdminClient] Supabase URL oder Service Key fehlt in Umgebungsvariablen!");
        throw new Error('Server-Konfigurationsfehler für Admin-Operationen.');
    }
    // Wichtig: Neuen Client mit Service Key erstellen, um RLS zu umgehen
    return createSupabaseAdminClient(supabaseUrl, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
// --- ENDE HILFSFUNKTION ---


// --- FUNKTION: getAdminPageData (Verwendet User-Client für Lesezugriff mit RLS) ---
export async function getAdminPageData() {
  const supabase = createClient(); // User-Client OK für Lesezugriff
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Fehler beim Holen des Benutzers oder nicht eingeloggt:", userError?.message);
    return { success: false, error: 'Nicht eingeloggt.', user: null, prompts: [] };
  }
  // Optionaler Admin Check (kann hier oder in der Seitenkomponente erfolgen)
  // if (user.email !== process.env.ADMIN_EMAIL) { ... }

  const { data: prompts, error: promptsError } = await supabase
    .from('prompt_packages')
    .select('*')
    .order('name', { ascending: true });
  if (promptsError) {
    console.error("Fehler beim Laden der Prompt-Pakete:", promptsError.message);
    return { success: false, error: `Fehler beim Laden der Pakete: ${promptsError.message}`, user: user, prompts: [] };
  }
  return { success: true, user: user, prompts: prompts || [] };
}

// --- FUNKTION: getEditPageData (Verwendet User-Client für Lesezugriff mit RLS) ---
export async function getEditPageData(packageId) {
  if (!packageId) {
    console.error("getEditPageData: Keine Paket-ID übergeben.");
    return { success: false, error: 'Ungültige Anfrage: Paket-ID fehlt.', user: null, promptPackage: null };
  }
  const supabase = createClient(); // User-Client OK für Lesezugriff
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Fehler beim Holen des Benutzers oder nicht eingeloggt:", userError?.message);
    return { success: false, error: 'Nicht eingeloggt.', user: null, promptPackage: null };
  }
  // Optionaler Admin Check

  console.log(`Versuche Paket mit ID ${packageId} für Bearbeitung zu laden...`);
  const { data: promptPackage, error: packageError } = await supabase
    .from('prompt_packages')
    .select('*')
    .eq('id', packageId)
    .single();
  if (packageError) {
    console.error(`Fehler beim Laden des Pakets ${packageId}:`, packageError.message);
    if (packageError.code === 'PGRST116') {
         return { success: false, error: `Paket mit ID ${packageId} nicht gefunden.`, user: user, promptPackage: null };
    }
    return { success: false, error: `Fehler beim Laden des Pakets: ${packageError.message}`, user: user, promptPackage: null };
  }
  if (!promptPackage) {
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

// --- FUNKTION: addPromptPackage (Verwendet Admin Client für Schreibzugriffe) ---
export async function addPromptPackage(formData) {
  // --- KORREKTUR: Admin Client verwenden! ---
  const supabaseAdmin = getSupabaseAdminClient();

  // 1. Daten validieren
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

  // 2. JSON parsen und validieren
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
    const firstErrorPath = validatedPromptData.error.errors[0]?.path.join('.');
    const firstErrorMessage = validatedPromptData.error.errors[0]?.message;
    let userMessage = "Fehler in der Struktur der Prompt-Daten.";
    if (firstErrorPath && firstErrorMessage) {
        userMessage = `Fehler im Prompt-Daten JSON (${firstErrorPath}): ${firstErrorMessage}`;
    } else if (firstErrorMessage) {
         userMessage = `Fehler im Prompt-Daten JSON: ${firstErrorMessage}`;
    }
    return { success: false, message: userMessage };
  }

  // 3. Tags verarbeiten
  const tagsArray = tagsString
    ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
    : [];

  // 4. Paket in Supabase speichern (mit Admin Client)
  let supabasePackageData;
  try {
    const { data, error } = await supabaseAdmin // <-- Admin Client
      .from('prompt_packages')
      .insert([{
          ...packageData,
          price: price,
          ...validatedPromptData.data,
          tags: tagsArray,
       }])
      .select()
      .single();

    if (error) {
      console.error("Supabase Insert Fehler (mit Admin Client):", error);
      if (error.code === '23505' && error.message.includes('prompt_packages_slug_key')) {
          return { success: false, message: `Fehler: Der Slug "${packageData.slug}" existiert bereits.` };
      }
      return { success: false, message: `Datenbankfehler: ${error.message}` };
    }
    supabasePackageData = data;
    console.log("Prompt-Paket erfolgreich in Supabase hinzugefügt (mit Admin Client):", supabasePackageData);

  } catch (e) {
    console.error("Unerwarteter Fehler beim Supabase Insert (mit Admin Client):", e);
    return { success: false, message: `Unerwarteter Serverfehler beim DB-Insert: ${e.message}` };
  }

  // 5. Stripe Produkt und Preis erstellen
  let stripePriceId = null;
  if (supabasePackageData && supabasePackageData.id) {
    try {
      console.log(`[Stripe] Erstelle Produkt für Paket: ${packageData.name}`);
      const product = await stripe.products.create({
        name: packageData.name,
        description: packageData.description || undefined,
        metadata: {
          supabase_package_id: supabasePackageData.id,
          slug: packageData.slug,
        }
      });
      console.log(`[Stripe] Produkt erstellt: ${product.id}`);

      const priceInCents = Math.round(price * 100);
      console.log(`[Stripe] Erstelle Preis (${priceInCents} Cent) für Produkt: ${product.id}`);
      const stripePrice = await stripe.prices.create({
        product: product.id,
        unit_amount: priceInCents,
        currency: 'eur',
        metadata: {
           supabase_package_id: supabasePackageData.id,
        }
      });
      stripePriceId = stripePrice.id;
      console.log(`[Stripe] Preis erstellt: ${stripePriceId}`);

      // Supabase Paket mit Stripe Preis-ID aktualisieren (mit Admin Client)
      console.log(`[Supabase] Aktualisiere Paket ${supabasePackageData.id} mit Stripe Price ID: ${stripePriceId}`);
      const { error: updateError } = await supabaseAdmin // <-- Admin Client
        .from('prompt_packages')
        .update({ stripe_price_id: stripePriceId })
        .eq('id', supabasePackageData.id);

      if (updateError) {
        console.error(`[Supabase] Fehler beim Aktualisieren des Pakets ${supabasePackageData.id} mit Stripe Price ID (mit Admin Client):`, updateError);
        return {
            success: false,
            message: `Paket in DB erstellt, Stripe Produkt/Preis erstellt (${stripePriceId}), ABER Fehler beim Speichern der Stripe Preis-ID in DB: ${updateError.message}. Bitte manuell nachtragen!`
        };
      }
      console.log(`[Supabase] Paket ${supabasePackageData.id} erfolgreich mit Stripe Price ID aktualisiert (mit Admin Client).`);

    } catch (stripeError) {
      console.error("[Stripe] Fehler beim Erstellen von Produkt/Preis oder DB-Update:", stripeError);
      console.warn(`[Rollback] Versuche Supabase-Paket ${supabasePackageData.id} wegen Stripe-Fehler zu löschen (mit Admin Client)...`);
      try {
          await supabaseAdmin.from('prompt_packages').delete().eq('id', supabasePackageData.id); // <-- Admin Client
          console.log(`[Rollback] Supabase-Paket ${supabasePackageData.id} erfolgreich gelöscht.`);
      } catch (rollbackError) {
          console.error(`[Rollback] Kritisch: Fehler beim Löschen des Supabase-Pakets ${supabasePackageData.id} nach Stripe-Fehler (mit Admin Client):`, rollbackError);
          return {
              success: false,
              message: `Paket in DB erstellt, aber Fehler bei Stripe: ${stripeError.message}. Automatisches Rollback des DB-Eintrags ist fehlgeschlagen! Bitte manuell prüfen.`
          };
      }
      return {
        success: false,
        message: `Fehler bei Stripe: ${stripeError.message}. Das Paket wurde nicht erstellt (DB-Eintrag zurückgerollt).`
      };
    }
  } else {
      console.error("Fehler: Supabase-Daten nach Insert nicht verfügbar, kann Stripe nicht erstellen.");
      return { success: false, message: "Interner Fehler: Supabase-Daten nach Insert nicht verfügbar." };
  }

  // 6. Cache Revalidierung
  console.log("Revalidiere Caches...");
  revalidatePath('/admin/prompts');
  revalidatePath('/pakete');
  revalidatePath(`/pakete/${packageData.slug}`);
  revalidatePath(`/checkout/${packageData.slug}`);

  // 7. Erfolgsmeldung
  return {
      success: true,
      message: 'Prompt-Paket erfolgreich hinzugefügt und in Stripe angelegt.',
      data: { ...supabasePackageData, stripe_price_id: stripePriceId }
  };
}


// --- FUNKTION: deletePromptPackage (Verwendet Admin Client für Schreib-/Lesezugriffe) ---
export async function deletePromptPackage(id) {
  // --- KORREKTUR: Admin Client verwenden! ---
  const supabaseAdmin = getSupabaseAdminClient();

  // Stripe Produkt deaktivieren (verwendet Admin Client zum Holen der ID)
  let stripeProductId = null;
  try {
      const { data: packageData, error: fetchError } = await supabaseAdmin // <-- Admin Client
          .from('prompt_packages')
          .select('stripe_price_id')
          .eq('id', id)
          .single();

      if (fetchError) {
          console.warn(`[Stripe Delete] Konnte Paket ${id} nicht finden, um Stripe ID zu holen (mit Admin Client): ${fetchError.message}`);
      } else if (packageData?.stripe_price_id) {
          try {
              const price = await stripe.prices.retrieve(packageData.stripe_price_id);
              stripeProductId = typeof price.product === 'string' ? price.product : null;

              if (stripeProductId) {
                  console.log(`[Stripe Delete] Deaktiviere Produkt ${stripeProductId} für Paket ${id}`);
                  await stripe.products.update(stripeProductId, { active: false });
                  console.log(`[Stripe Delete] Produkt ${stripeProductId} erfolgreich deaktiviert.`);
              } else {
                  console.warn(`[Stripe Delete] Konnte keine Produkt-ID aus Preis ${packageData.stripe_price_id} extrahieren.`);
              }
          } catch (stripeError) {
              console.error(`[Stripe Delete] Fehler beim Abrufen/Deaktivieren von Produkt für Price ID ${packageData.stripe_price_id}:`, stripeError);
          }
      } else {
          console.log(`[Stripe Delete] Paket ${id} hat keine Stripe Price ID, überspringe Deaktivierung.`);
      }
  } catch (e) {
      console.error(`[Stripe Delete] Unerwarteter Fehler beim Holen/Deaktivieren des Stripe Produkts für Paket ${id} (mit Admin Client):`, e);
  }

  // Löschen aus Supabase DB (mit Admin Client)
  console.log(`[deletePromptPackage] Versuche Paket mit ID ${id} aus Supabase zu löschen (mit Admin Client)...`);
  try {
    const { error } = await supabaseAdmin // <-- Admin Client
        .from('prompt_packages')
        .delete()
        .match({ id: id });

    if (error) {
      console.error("[deletePromptPackage] Supabase Delete Fehler (mit Admin Client):", error);
      return { success: false, error: `Datenbankfehler beim Löschen: ${error.message}` };
    }

    console.log(`[deletePromptPackage] Paket mit ID ${id} erfolgreich aus Supabase gelöscht.`);

    // Cache Revalidierung
    revalidatePath('/admin/prompts');
    revalidatePath('/pakete');

    return { success: true };

  } catch (e) {
    console.error("[deletePromptPackage] Unerwarteter Fehler im try-catch (mit Admin Client):", e);
    return { success: false, error: `Unerwarteter Serverfehler: ${e.message}` };
  }
}


// --- FUNKTION: updatePromptPackage (Verwendet Admin Client für Schreibzugriffe) ---
export async function updatePromptPackage(formData) {
  // --- KORREKTUR: Admin Client verwenden! ---
  const supabaseAdmin = getSupabaseAdminClient();

  // 1. Daten extrahieren
  const packageId = formData.get('packageId');
  console.log('[updatePromptPackage] Empfangene packageId:', packageId);
  const name = formData.get('name');
  const description = formData.get('description');
  const category = formData.get('category');
  const priceString = formData.get('price');
  const promptDataJson = formData.get('promptDataJson');
  const tagsString = formData.get('tags');

  // 2. ID-Prüfung
  if (!packageId) {
    console.error('[updatePromptPackage] Fehler: packageId fehlt im FormData.');
    return { success: false, message: "Fehler: Paket-ID fehlt." };
  }

  // 3. JSON parsen und validieren
  let parsedPromptData;
  try {
    parsedPromptData = JSON.parse(promptDataJson);
    const validatedPromptData = PromptDataSchema.safeParse(parsedPromptData);
    if (!validatedPromptData.success) {
        const firstErrorPath = validatedPromptData.error.errors[0]?.path.join('.');
        const firstErrorMessage = validatedPromptData.error.errors[0]?.message;
        throw new Error(`Strukturfehler im JSON (${firstErrorPath || 'unbekannt'}): ${firstErrorMessage || 'Unbekannter Validierungsfehler'}`);
    }
    // parsedPromptData = validatedPromptData.data; // Verwende validierte Daten
  } catch (e) {
    console.error("JSON Parse/Struktur Fehler beim Update:", e.message);
    return { success: false, message: `Fehler im Prompt-Daten JSON: ${e.message}` };
  }

  // 4. Preis validieren
  const priceFloat = parseFloat(priceString);
  if (isNaN(priceFloat) || priceFloat < 0) {
    return { success: false, message: "Fehler: Ungültiger Preis angegeben." };
  }

  // 5. Tags verarbeiten
  const tagsArray = tagsString
    ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
    : [];

   // 6. Daten in der Datenbank aktualisieren (mit Admin Client)
    try {
      console.log(`[updatePromptPackage] Versuche Update für ID: ${packageId} (mit Admin Client)`);

      const { data, error } = await supabaseAdmin // <-- Admin Client
        .from('prompt_packages')
        .update({
          name: name,
          description: description,
          category: category,
          price: priceFloat,
          context: parsedPromptData.context,
          semantic_data: parsedPromptData.semantic_data,
          writing_instructions: parsedPromptData.writing_instructions,
          tags: tagsArray,
        })
        .match({ id: packageId })
        .select()
        .single();

      if (error) {
        console.error("Supabase Update Fehler (mit Admin Client):", error);
        if (error.code === 'PGRST116') {
            return { success: false, message: `Datenbankfehler beim Update: Paket mit ID ${packageId} nicht gefunden.` };
        }
        return { success: false, message: `Datenbankfehler beim Update: ${error.message}` };
      }

      console.log("Prompt-Paket erfolgreich aktualisiert (mit Admin Client):", data);

      // 7. Cache Revalidierung
      revalidatePath('/admin/prompts');
      revalidatePath('/pakete');
      if (data?.slug) {
        revalidatePath(`/pakete/${data.slug}`);
        revalidatePath(`/checkout/${data.slug}`);
        revalidatePath(`/admin/prompts/edit/${packageId}`);
      }

      // Hinweis auf manuelle Stripe-Preisänderung
      let successMessage = 'Änderungen erfolgreich gespeichert.';
      if (priceFloat > 0) { // Einfacher Check, ob Preis gesetzt ist
          successMessage += ' WICHTIG: Der Preis in Stripe wurde nicht automatisch angepasst. Bitte bei Bedarf manuell im Stripe Dashboard ändern!';
      }

      return { success: true, message: successMessage, data };

    } catch (e) {
      console.error("[updatePromptPackage] Unerwarteter Fehler im try-catch (mit Admin Client):", e);
      return { success: false, message: `Unerwarteter Serverfehler: ${e.message}` };
    }
}

// --- FUNKTION: bulkCreateStripeProducts (Verwendet Admin Client für Schreib-/Lesezugriffe) ---
export async function bulkCreateStripeProducts() {
  console.log('[Bulk Stripe] Starte Massenerstellung von Stripe Produkten/Preisen...');
  // --- KORREKTUR: Admin Client verwenden! ---
  const supabaseAdmin = getSupabaseAdminClient();
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  try {
    // 1. Hole Pakete ohne Stripe ID (mit Admin Client)
    console.log('[Bulk Stripe] Suche Pakete ohne Stripe Price ID (mit Admin Client)...');
    const { data: packagesToProcess, error: fetchError } = await supabaseAdmin // <-- Admin Client
      .from('prompt_packages')
      .select('id, name, description, price, slug')
      .is('stripe_price_id', null);

    if (fetchError) {
      console.error('[Bulk Stripe] Fehler beim Holen der Pakete (mit Admin Client):', fetchError);
      return { success: false, message: `Fehler beim Abrufen der Pakete: ${fetchError.message}` };
    }

    if (!packagesToProcess || packagesToProcess.length === 0) {
      console.log('[Bulk Stripe] Keine Pakete gefunden, die eine Stripe ID benötigen.');
      return { success: true, message: 'Keine Pakete gefunden, für die Stripe Produkte/Preise erstellt werden müssen.' };
    }

    console.log(`[Bulk Stripe] ${packagesToProcess.length} Paket(e) gefunden. Verarbeite...`);

    // 2. Iteriere über jedes Paket
    for (const pkg of packagesToProcess) {
      let createdStripePriceId = null;
      try {
        console.log(`[Bulk Stripe] Verarbeite Paket ID: ${pkg.id}, Name: ${pkg.name}`);

        // 2a. Stripe Produkt erstellen
        const product = await stripe.products.create({
          name: pkg.name,
          description: pkg.description || undefined,
          metadata: { supabase_package_id: pkg.id, slug: pkg.slug }
        });
        console.log(`[Bulk Stripe] Stripe Produkt erstellt: ${product.id} für Paket ${pkg.id}`);

        // 2b. Stripe Preis erstellen
        const priceInCents = Math.round(pkg.price * 100);
        const stripePrice = await stripe.prices.create({
          product: product.id,
          unit_amount: priceInCents,
          currency: 'eur',
          metadata: { supabase_package_id: pkg.id }
        });
        createdStripePriceId = stripePrice.id;
        console.log(`[Bulk Stripe] Stripe Preis erstellt: ${createdStripePriceId} für Produkt ${product.id}`);

        // 2c. Supabase Paket aktualisieren (mit Admin Client)
        const { error: updateError } = await supabaseAdmin // <-- Admin Client
          .from('prompt_packages')
          .update({ stripe_price_id: createdStripePriceId })
          .eq('id', pkg.id);

        if (updateError) {
          console.error(`[Bulk Stripe] Fehler beim Aktualisieren von Supabase Paket ${pkg.id} mit Stripe ID ${createdStripePriceId} (mit Admin Client):`, updateError);
          throw new Error(`DB Update fehlgeschlagen: ${updateError.message}. Stripe Produkt/Preis (${createdStripePriceId}) existiert.`);
        }

        console.log(`[Bulk Stripe] Supabase Paket ${pkg.id} erfolgreich mit Stripe ID ${createdStripePriceId} aktualisiert (mit Admin Client).`);
        successCount++;
        revalidatePath(`/checkout/${pkg.slug}`);

      } catch (loopError) {
        console.error(`[Bulk Stripe] Fehler bei der Verarbeitung von Paket ID ${pkg.id}:`, loopError);
        errorCount++;
        errors.push(`Paket ID ${pkg.id} (${pkg.name}): ${loopError.message}`);
      }
    } // Ende for-Schleife

    // 3. Ergebnis zusammenfassen
    let finalMessage = `Massenverarbeitung abgeschlossen. ${successCount} Paket(e) erfolgreich in Stripe erstellt und verknüpft.`;
    if (errorCount > 0) {
      finalMessage += ` ${errorCount} Paket(e) fehlgeschlagen. Details siehe Server-Log und unten:\n- ${errors.join('\n- ')}`;
      console.error('[Bulk Stripe] Fehlerdetails:', errors);
      return { success: false, message: finalMessage };
    } else {
      revalidatePath('/admin/prompts');
      revalidatePath('/pakete');
      return { success: true, message: finalMessage };
    }

  } catch (generalError) {
    console.error('[Bulk Stripe] Unerwarteter Gesamtfehler:', generalError);
    return { success: false, message: `Ein unerwarteter Fehler ist aufgetreten: ${generalError.message}` };
  }
}
