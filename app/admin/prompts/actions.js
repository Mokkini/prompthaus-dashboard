// app/admin/prompts/actions.js - Mit Stripe-Update in updatePromptPackage

"use server";

import { createClient as createServerComponentClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import Stripe from 'stripe'; // Stripe importieren

// --- Hilfsfunktion validateVariantsJson (unverändert) ---
function validateVariantsJson(variantsJsonString) {
  // ... (Code bleibt gleich) ...
  let variantsData;
  try {
    const parsedJson = JSON.parse(variantsJsonString);
    if (typeof parsedJson !== 'object' || parsedJson === null || !Array.isArray(parsedJson.generation_variants)) {
        throw new Error("JSON muss ein Objekt mit einem 'generation_variants' Array sein.");
    }
    variantsData = parsedJson.generation_variants;
    const variantIds = new Set();
    variantsData.forEach((variant, index) => {
       if (!variant || typeof variant !== 'object') {
           throw new Error(`Variante ${index + 1} ist kein gültiges Objekt.`);
       }
       if (!variant.id || typeof variant.id !== 'string' || variant.id.trim() === '') {
           throw new Error(`Variante ${index + 1}: Fehlende oder ungültige String 'id'. Muss ein nicht-leerer Text sein.`);
       }
       if (variantIds.has(variant.id)) {
           throw new Error(`Variante ${index + 1}: Die ID '${variant.id}' ist nicht eindeutig innerhalb dieses Pakets.`);
       }
       variantIds.add(variant.id);
       if (!variant.title || typeof variant.title !== 'string') throw new Error(`Variante ${index + 1}: Fehlende oder ungültige 'title'.`);
       if (!variant.description || typeof variant.description !== 'string') throw new Error(`Variante ${index + 1}: Fehlende oder ungültige 'description'.`);
       if (!variant.context || typeof variant.context !== 'object') throw new Error(`Variante ${index + 1}: Fehlendes oder ungültiges 'context' Objekt.`);
       if (!variant.semantic_data || typeof variant.semantic_data !== 'object') throw new Error(`Variante ${index + 1}: Fehlendes oder ungültiges 'semantic_data' Objekt.`);
       if (!variant.writing_instructions || typeof variant.writing_instructions !== 'object') throw new Error(`Variante ${index + 1}: Fehlendes oder ungültiges 'writing_instructions' Objekt.`);
    });
    return { success: true, data: variantsData };
  } catch (e) {
    console.error("[validateVariantsJson] JSON Validierungsfehler:", e.message);
    return { success: false, message: `Fehler im Varianten JSON: ${e.message}` };
  }
}

// --- addPromptPackage (unverändert von vorheriger Anpassung) ---
export async function addPromptPackage(formData) {
  // ... (Code bleibt gleich) ...
  const supabaseUserClient = createServerComponentClient();
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { success: false, message: 'Nicht autorisiert.' };
  }
  const rawFormData = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description'),
    category: formData.get('category'),
    price: formData.get('price'),
    variantsJson: formData.get('variantsJson'),
  };
  if (!rawFormData.name || !rawFormData.slug || !rawFormData.variantsJson || !rawFormData.category || !rawFormData.price) {
    return { success: false, message: 'Bitte alle Pflichtfelder ausfüllen (Name, Slug, Kategorie, Preis, Varianten JSON).' };
  }
  const priceInEuro = parseFloat(rawFormData.price);
  if (isNaN(priceInEuro) || priceInEuro < 0) {
      return { success: false, message: 'Ungültiger Preis angegeben.' };
  }
  const priceInCents = Math.round(priceInEuro * 100);
  const validationResult = validateVariantsJson(rawFormData.variantsJson);
  if (!validationResult.success) {
    return { success: false, message: validationResult.message };
  }
  const variantsArray = validationResult.data;
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  if (!process.env.STRIPE_SECRET_KEY) {
      return { success: false, message: "Server-Konfigurationsfehler (Stripe)." };
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let newPackageId = null;
  let stripeProductId = null;
  let stripePriceId = null;
  try {
    const stripeProduct = await stripe.products.create({
      name: rawFormData.name,
      description: rawFormData.description || undefined,
      metadata: { supabase_slug: rawFormData.slug, category: rawFormData.category }
    });
    stripeProductId = stripeProduct.id;
    const stripePrice = await stripe.prices.create({
      product: stripeProductId, unit_amount: priceInCents, currency: 'eur',
    });
    stripePriceId = stripePrice.id;
    const { data: newPackage, error: insertPackageError } = await supabaseAdmin
      .from('prompt_packages')
      .insert({
        name: rawFormData.name,
        slug: rawFormData.slug.toLowerCase().replace(/\s+/g, '-'),
        description: rawFormData.description,
        category: rawFormData.category,
        price: priceInEuro,
        stripe_product_id: stripeProductId,
        stripe_price_id: stripePriceId,
      }).select('id').single();
    if (insertPackageError) throw insertPackageError; // Weiterwerfen für Catch-Block
    newPackageId = newPackage.id;
    const variantsToInsert = variantsArray.map(variant => ({
      package_id: newPackageId, variant_id: variant.id, title: variant.title,
      description: variant.description, context: variant.context,
      semantic_data: variant.semantic_data, writing_instructions: variant.writing_instructions,
    }));
    const { error: insertVariantsError } = await supabaseAdmin.from('prompt_variants').insert(variantsToInsert);
    if (insertVariantsError) throw insertVariantsError; // Weiterwerfen
    revalidatePath('/admin/prompts');
    return { success: true, message: 'Prompt-Paket, Varianten und Stripe-Produkt/Preis erfolgreich erstellt!' };
  } catch (error) {
    console.error("[addPromptPackage] CATCH BLOCK - Fehler aufgetreten:", error.message);
    if (newPackageId) { /* Rollback Supabase */
        try {
            await supabaseAdmin.from('prompt_variants').delete().eq('package_id', newPackageId);
            await supabaseAdmin.from('prompt_packages').delete().eq('id', newPackageId);
        } catch (rbErr) { console.error("Supabase Rollback Error:", rbErr); }
    }
    if (stripeProductId) { /* Rollback Stripe */
        try { await stripe.products.update(stripeProductId, { active: false }); }
        catch (rbErr) { console.error("Stripe Rollback Error:", rbErr); }
    }
    const userMessage = error.code === '23505' && error.message.includes('slug')
        ? `Fehler: Der Slug '${rawFormData.slug}' existiert bereits.`
        : `Fehler: ${error.message}. Änderungen wurden rückgängig gemacht oder versucht.`;
    return { success: false, message: userMessage };
  }
}


// --- updatePromptPackage (ANGEPASST mit Stripe-Update) ---
export async function updatePromptPackage(formData) {
  const supabaseUserClient = createServerComponentClient();

  // 1. Admin-Prüfung (bleibt gleich)
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    console.error("[updatePromptPackage] Nicht-Admin versuchte, Prompt zu aktualisieren.");
    return { success: false, message: 'Nicht autorisiert.' };
  }

  // 2. Formulardaten extrahieren (Preis hinzugefügt)
  const rawFormData = {
    packageId: formData.get('packageId'),
    name: formData.get('name'),
    description: formData.get('description'),
    category: formData.get('category'),
    price: formData.get('price'), // <-- NEU
    variantsJson: formData.get('variantsJson'),
  };

  // 3. Grundlegende Validierung (Preis hinzugefügt)
  if (!rawFormData.packageId || !rawFormData.name || !rawFormData.variantsJson || !rawFormData.category || !rawFormData.price) { // Preis hinzugefügt
    console.error("[updatePromptPackage] Validation failed: Missing required fields.");
    return { success: false, message: 'Fehlende Daten (Paket-ID, Name, Kategorie, Preis, Varianten JSON sind erforderlich).' };
  }

  // --- NEU: Preis validieren ---
  const priceInEuro = parseFloat(rawFormData.price);
  if (isNaN(priceInEuro) || priceInEuro < 0) {
      console.error("[updatePromptPackage] Validation failed: Invalid price.");
      return { success: false, message: 'Ungültiger Preis angegeben.' };
  }
  // --- ENDE NEU ---

  // 4. JSON Validierung (bleibt gleich)
  const validationResult = validateVariantsJson(rawFormData.variantsJson);
  if (!validationResult.success) {
    console.error("[updatePromptPackage] JSON validation failed:", validationResult.message);
    return { success: false, message: validationResult.message };
  }
  const newVariantsArray = validationResult.data;

  // 5. Admin Client initialisieren (bleibt gleich)
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // --- NEU: Stripe Client initialisieren ---
  if (!process.env.STRIPE_SECRET_KEY) {
      console.error("[updatePromptPackage] Server-Konfigurationsfehler: STRIPE_SECRET_KEY fehlt.");
      return { success: false, message: "Server-Konfigurationsfehler (Stripe)." };
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  // --- ENDE NEU ---

  // --- Update-Logik (ERWEITERT mit Stripe) ---
  try {
    // --- NEU: 6. Hole Stripe Produkt ID aus DB ---
    const { data: packageData, error: fetchError } = await supabaseAdmin
        .from('prompt_packages')
        .select('stripe_product_id, slug') // Slug auch holen für Revalidierung
        .eq('id', rawFormData.packageId)
        .single();

    if (fetchError || !packageData) {
        console.error("[updatePromptPackage] Fehler beim Holen der Stripe Produkt ID:", fetchError);
        throw new Error(`Konnte Paketdaten nicht laden: ${fetchError?.message || 'Paket nicht gefunden.'}`);
    }
    const stripeProductId = packageData.stripe_product_id;
    const currentSlug = packageData.slug; // Slug für Revalidierung speichern
    // --- ENDE NEU ---

    // --- NEU: 7. Aktualisiere Produkt in Stripe (Name, Beschreibung, Metadaten) ---
    if (stripeProductId) {
        console.log(`[updatePromptPackage] Aktualisiere Stripe Produkt ${stripeProductId}...`);
        try {
            await stripe.products.update(stripeProductId, {
                name: rawFormData.name,
                description: rawFormData.description || undefined,
                metadata: { // Metadaten auch aktualisieren
                    supabase_slug: currentSlug, // Slug bleibt gleich
                    category: rawFormData.category,
                }
            });
            console.log(`[updatePromptPackage] Stripe Produkt ${stripeProductId} aktualisiert.`);
        } catch (stripeError) {
            // Fehler beim Stripe-Update ist nicht unbedingt kritisch, loggen und weitermachen
            console.warn(`[updatePromptPackage] Warnung: Fehler beim Aktualisieren von Stripe Produkt ${stripeProductId}:`, stripeError.message);
            // Hier KEINEN Fehler werfen, damit Supabase trotzdem aktualisiert wird.
        }
    } else {
        console.warn(`[updatePromptPackage] Warnung: Keine Stripe Produkt ID für Paket ${rawFormData.packageId} gefunden. Stripe wird nicht aktualisiert.`);
    }
    // --- ENDE NEU ---

    // 8. Paket-Metadaten in prompt_packages aktualisieren (Preis hinzugefügt)
    console.log(`[updatePromptPackage] Aktualisiere Supabase Paket ${rawFormData.packageId}...`);
    const { error: updatePackageError } = await supabaseAdmin
      .from('prompt_packages')
      .update({
        name: rawFormData.name,
        description: rawFormData.description,
        category: rawFormData.category,
        price: priceInEuro, // <-- NEU: Preis aktualisieren
      })
      .eq('id', rawFormData.packageId);

    if (updatePackageError) {
      console.error("[updatePromptPackage] DB Update Fehler (Paket):", updatePackageError);
      throw new Error(`Datenbankfehler beim Aktualisieren des Pakets: ${updatePackageError.message}`);
    }
    console.log(`[updatePromptPackage] Supabase Paket ${rawFormData.packageId} aktualisiert.`);

    // 9. Alte Varianten löschen (bleibt gleich)
    console.log(`[updatePromptPackage] Lösche alte Varianten für Paket ${rawFormData.packageId}...`);
    const { error: deleteVariantsError } = await supabaseAdmin
      .from('prompt_variants')
      .delete()
      .eq('package_id', rawFormData.packageId);

    if (deleteVariantsError) {
      console.error("[updatePromptPackage] DB Delete Fehler (Alte Varianten):", deleteVariantsError);
      throw new Error(`Fehler beim Löschen alter Varianten: ${deleteVariantsError.message}. Paket ist inkonsistent!`);
    }
    console.log(`[updatePromptPackage] Alte Varianten gelöscht.`);

    // 10. Neue Varianten einfügen (bleibt gleich)
    const variantsToInsert = newVariantsArray.map(variant => ({
      package_id: rawFormData.packageId, variant_id: variant.id, title: variant.title,
      description: variant.description, context: variant.context,
      semantic_data: variant.semantic_data, writing_instructions: variant.writing_instructions,
    }));

    if (variantsToInsert.length > 0) {
        console.log(`[updatePromptPackage] Füge ${variantsToInsert.length} neue Varianten ein...`);
        const { error: insertVariantsError } = await supabaseAdmin
          .from('prompt_variants')
          .insert(variantsToInsert);

        if (insertVariantsError) {
          console.error("[updatePromptPackage] DB Insert Fehler (Neue Varianten):", insertVariantsError);
          throw new Error(`Fehler beim Einfügen der neuen Varianten: ${insertVariantsError.message}. Paket ist inkonsistent!`);
        }
        console.log(`[updatePromptPackage] Neue Varianten eingefügt.`);
    } else {
        console.log(`[updatePromptPackage] Keine neuen Varianten zum Einfügen.`);
    }

    // 11. Cache neu validieren (bleibt gleich, verwendet currentSlug)
    revalidatePath('/admin/prompts');
    revalidatePath(`/admin/prompts/edit/${rawFormData.packageId}`);
    if (currentSlug) {
        revalidatePath(`/prompt/${currentSlug}`);
    }
    console.log(`[updatePromptPackage] Cache revalidiert.`);

    // 12. Erfolgsmeldung zurückgeben
    return { success: true, message: 'Prompt-Paket erfolgreich aktualisiert!' };

  } catch (error) {
     // Fehlerbehandlung (bleibt gleich)
     console.error("[updatePromptPackage] CATCH BLOCK - Fehler beim Aktualisieren des Pakets/Varianten:", error.message);
     return { success: false, message: `Fehler: ${error.message}. Das Paket ist möglicherweise in einem inkonsistenten Zustand!` };
  }
}


// --- deletePromptPackage (ANGEPASST mit Stripe Deaktivierung) ---
export async function deletePromptPackage(packageId) {
  const supabaseUserClient = createServerComponentClient();

  // 1. Admin-Prüfung (bleibt gleich)
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { success: false, message: 'Aktion fehlgeschlagen.' };
  }

  // 2. ID-Prüfung (bleibt gleich)
  if (!packageId) {
    return { success: false, message: 'Fehlende Paket-ID zum Löschen.' };
  }

  // 3. Admin Client initialisieren (bleibt gleich)
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // --- NEU: Stripe Client initialisieren ---
  if (!process.env.STRIPE_SECRET_KEY) {
      console.error("[deletePromptPackage] Server-Konfigurationsfehler: STRIPE_SECRET_KEY fehlt.");
      // Fehler zurückgeben, da wir Stripe deaktivieren wollen
      return { success: false, message: "Server-Konfigurationsfehler (Stripe)." };
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  // --- ENDE NEU ---

  // --- Löschen (ERWEITERT mit Stripe Deaktivierung) ---
  try {
    // --- NEU: 4. Hole Stripe Produkt ID aus DB ---
    const { data: packageData, error: fetchError } = await supabaseAdmin
        .from('prompt_packages')
        .select('stripe_product_id')
        .eq('id', packageId)
        .single();

    // Fehler beim Holen ist nicht kritisch für das Löschen in Supabase, aber loggen
    if (fetchError) {
        console.warn(`[deletePromptPackage] Warnung: Konnte Stripe Produkt ID für Paket ${packageId} nicht holen:`, fetchError.message);
    }
    const stripeProductId = packageData?.stripe_product_id;
    // --- ENDE NEU ---

    // 5. Varianten aus prompt_variants löschen (bleibt gleich)
    const { error: deleteVariantsError } = await supabaseAdmin
      .from('prompt_variants')
      .delete()
      .eq('package_id', packageId);
    if (deleteVariantsError) throw deleteVariantsError; // Weiterwerfen

    // 6. Paket aus prompt_packages löschen (bleibt gleich)
    const { error: deletePackageError } = await supabaseAdmin
      .from('prompt_packages')
      .delete()
      .eq('id', packageId);
    if (deletePackageError) throw deletePackageError; // Weiterwerfen

    // --- NEU: 7. Stripe Produkt deaktivieren (falls ID vorhanden) ---
    if (stripeProductId) {
        console.log(`[deletePromptPackage] Deaktiviere Stripe Produkt ${stripeProductId}...`);
        try {
            await stripe.products.update(stripeProductId, { active: false });
            console.log(`[deletePromptPackage] Stripe Produkt ${stripeProductId} deaktiviert.`);
        } catch (stripeError) {
            // Fehler beim Deaktivieren ist nicht kritisch für den Rest, aber loggen
            console.warn(`[deletePromptPackage] Warnung: Fehler beim Deaktivieren von Stripe Produkt ${stripeProductId}:`, stripeError.message);
        }
    } else {
        console.log(`[deletePromptPackage] Keine Stripe Produkt ID für Paket ${packageId} gefunden. Überspringe Stripe-Deaktivierung.`);
    }
    // --- ENDE NEU ---

    // 8. Cache neu validieren (bleibt gleich)
    revalidatePath('/admin/prompts');

    // 9. Erfolgsmeldung zurückgeben
    return { success: true, message: 'Prompt-Paket erfolgreich gelöscht (und Stripe Produkt deaktiviert, falls vorhanden)!' };

  } catch (error) {
      // Fehlerbehandlung (bleibt gleich)
      console.error("[deletePromptPackage] CATCH BLOCK - Fehler beim Löschen:", error.message);
      return { success: false, message: `Fehler: ${error.message}` };
  }
}


// --- getAdminPageData (unverändert) ---
export async function getAdminPageData() {
  // ... (Code bleibt gleich) ...
  'use server';
  const supabaseUserClient = createServerComponentClient();
  const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
  if (userError) { return { success: false, error: 'Authentifizierungsfehler.', user: null, prompts: [] }; }
  if (!user) { return { success: false, error: 'Nicht eingeloggt.', user: null, prompts: [] }; }
  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  if (!isAdmin) { return { success: false, error: 'Nicht autorisiert.', user: user, prompts: [] }; }
  const supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: prompts, error: promptsError } = await supabaseAdmin
    .from('prompt_packages').select('id, slug, name, category')
    .order('category', { ascending: true, nullsFirst: false }).order('name', { ascending: true });
  if (promptsError) { return { success: false, error: `Fehler beim Laden der Prompts: ${promptsError.message}`, user: user, prompts: [] }; }
  return { success: true, user: user, prompts: prompts || [], error: null };
}

// --- getEditPageData (ANGEPASST: Preis hinzugefügt) ---
export async function getEditPageData(packageId) {
    'use server';
    const supabaseUserClient = createServerComponentClient();
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
    if (userError) { return { success: false, error: 'Authentifizierungsfehler.', promptPackage: null, variants: [] }; }
    if (!user) { return { success: false, error: 'Nicht eingeloggt.', promptPackage: null, variants: [] }; }
    if (user.email !== process.env.ADMIN_EMAIL) { return { success: false, error: 'Nicht autorisiert.', promptPackage: null, variants: [] }; }
    if (!packageId) { return { success: false, error: 'Keine Paket-ID angegeben.', promptPackage: null, variants: [] }; }

    const supabaseAdmin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Paket-Metadaten laden (Preis hinzugefügt)
    const { data: promptPackage, error: packageError } = await supabaseAdmin
        .from('prompt_packages')
        .select('id, name, slug, description, category, price') // <-- Preis hinzugefügt
        .eq('id', packageId)
        .single();

    if (packageError || !promptPackage) {
        const errorMsg = packageError?.code === 'PGRST116' ? 'Paket nicht gefunden.' : `Fehler beim Laden des Pakets: ${packageError?.message || 'Unbekannt'}`;
        return { success: false, error: errorMsg, promptPackage: null, variants: [] };
    }

    // Zugehörige Varianten laden (unverändert)
    const { data: variants, error: variantsError } = await supabaseAdmin
        .from('prompt_variants')
        .select('variant_id, title, description, context, semantic_data, writing_instructions')
        .eq('package_id', packageId)
        .order('title', { ascending: true });

    if (variantsError) {
        return { success: false, error: `Fehler beim Laden der Varianten: ${variantsError.message}`, promptPackage: promptPackage, variants: [] };
    }

    // Varianten für JSON vorbereiten (unverändert)
    const variantsForJson = (variants || []).map(v => ({
        id: v.variant_id, title: v.title, description: v.description,
        context: v.context, semantic_data: v.semantic_data, writing_instructions: v.writing_instructions
    }));

    // Erfolgreich: Paketdaten (inkl. Preis) und Varianten zurückgeben
    return { success: true, promptPackage: promptPackage, variants: variantsForJson, error: null };
}
