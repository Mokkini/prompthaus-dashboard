// app/admin/prompts/actions.js - Bereinigt (ohne Debug-Logs)
"use server"; // Wichtig: Definiert dies als Server Action Modul

import { createClient as createServerComponentClient } from '@/lib/supabase/server'; // Client für User Check (Anon Key)
import { createClient as createAdminClient } from '@supabase/supabase-js'; // Client für DB Operationen (Service Key)
import { revalidatePath } from 'next/cache'; // Zum Aktualisieren der Liste nach dem Hinzufügen/Ändern/Löschen
import { redirect } from 'next/navigation'; // Falls wir umleiten wollen

// --- Hilfsfunktion zur JSON-Validierung (ANGEPASST für neue Struktur und String-ID) ---
function validateVariantsJson(variantsJsonString) {
  let variantsData;
  try {
    const parsedJson = JSON.parse(variantsJsonString);
    // Erwarte Objekt mit 'generation_variants' Array
    if (typeof parsedJson !== 'object' || parsedJson === null || !Array.isArray(parsedJson.generation_variants)) {
        throw new Error("JSON muss ein Objekt mit einem 'generation_variants' Array sein.");
    }
    variantsData = parsedJson.generation_variants; // Das Array extrahieren

    // Prüfe jede Variante auf notwendige Felder (insb. die String 'id')
    const variantIds = new Set(); // Zur Prüfung auf Eindeutigkeit der IDs
    variantsData.forEach((variant, index) => {
       if (!variant || typeof variant !== 'object') {
           throw new Error(`Variante ${index + 1} ist kein gültiges Objekt.`);
       }
       // --- WICHTIG: Prüfe auf String 'id' ---
       if (!variant.id || typeof variant.id !== 'string' || variant.id.trim() === '') {
           throw new Error(`Variante ${index + 1}: Fehlende oder ungültige String 'id'. Muss ein nicht-leerer Text sein.`);
       }
       if (variantIds.has(variant.id)) {
           // ID ist nicht eindeutig innerhalb dieses Pakets
           throw new Error(`Variante ${index + 1}: Die ID '${variant.id}' ist nicht eindeutig innerhalb dieses Pakets.`);
       }
       variantIds.add(variant.id);
       // --- Ende ID-Prüfung ---

       // Prüfe weitere Kernfelder
       if (!variant.title || typeof variant.title !== 'string') throw new Error(`Variante ${index + 1}: Fehlende oder ungültige 'title'.`);
       if (!variant.description || typeof variant.description !== 'string') throw new Error(`Variante ${index + 1}: Fehlende oder ungültige 'description'.`);
       if (!variant.context || typeof variant.context !== 'object') throw new Error(`Variante ${index + 1}: Fehlendes oder ungültiges 'context' Objekt.`);
       if (!variant.semantic_data || typeof variant.semantic_data !== 'object') throw new Error(`Variante ${index + 1}: Fehlendes oder ungültiges 'semantic_data' Objekt.`);
       if (!variant.writing_instructions || typeof variant.writing_instructions !== 'object') throw new Error(`Variante ${index + 1}: Fehlendes oder ungültiges 'writing_instructions' Objekt.`);
    });

    // Wenn alles ok ist, gib das Array der Varianten zurück
    return { success: true, data: variantsData };
  } catch (e) {
    console.error("[validateVariantsJson] JSON Validierungsfehler:", e.message);
    return { success: false, message: `Fehler im Varianten JSON: ${e.message}` };
  }
}


// --- addPromptPackage (ANGEPASST für zwei Tabellen) ---
export async function addPromptPackage(formData) {
  const supabaseUserClient = createServerComponentClient();

  // 1. Prüfen, ob der ausführende User Admin ist
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    console.error("[addPromptPackage] Nicht-Admin versuchte, Prompt hinzuzufügen.");
    return { success: false, message: 'Nicht autorisiert.' };
  }

  // 2. Formulardaten extrahieren
  const rawFormData = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description'),
    category: formData.get('category'),
    variantsJson: formData.get('variantsJson'),
  };

  // 3. Grundlegende Validierung
  if (!rawFormData.name || !rawFormData.slug || !rawFormData.variantsJson || !rawFormData.category) {
    console.error("[addPromptPackage] Validation failed: Missing required fields.");
    return { success: false, message: 'Bitte alle Pflichtfelder ausfüllen (Name, Slug, Kategorie, Varianten JSON).' };
  }

  // 4. JSON Validierung
  const validationResult = validateVariantsJson(rawFormData.variantsJson);
  if (!validationResult.success) {
    console.error("[addPromptPackage] JSON validation failed:", validationResult.message);
    return { success: false, message: validationResult.message };
  }
  const variantsArray = validationResult.data; // Das validierte Array der Varianten

  // 5. Admin Client initialisieren
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // --- Transaktionsähnliche Logik (zuerst Paket, dann Varianten) ---
  let newPackageId = null; // Variable für die ID des neuen Pakets

  try {
    // 6. Paket in prompt_packages einfügen
    const { data: newPackage, error: insertPackageError } = await supabaseAdmin
      .from('prompt_packages')
      .insert({
        name: rawFormData.name,
        slug: rawFormData.slug.toLowerCase().replace(/\s+/g, '-'), // Slug normalisieren
        description: rawFormData.description,
        category: rawFormData.category,
      })
      .select('id') // Gib die ID des neuen Pakets zurück
      .single(); // Erwarte genau ein Ergebnis

    if (insertPackageError) {
      console.error("[addPromptPackage] DB Insert Fehler (Paket):", insertPackageError);
      if (insertPackageError.code === '23505' && insertPackageError.message.includes('slug')) {
           return { success: false, message: `Fehler: Der Slug '${rawFormData.slug}' existiert bereits.` };
      }
      throw new Error(`Datenbankfehler (Paket): ${insertPackageError.message}`); // Fehler werfen für try-catch
    }

    newPackageId = newPackage.id; // ID speichern

    // 7. Varianten in prompt_variants einfügen
    const variantsToInsert = variantsArray.map(variant => ({
      package_id: newPackageId, // <-- Verknüpfung zum Paket
      variant_id: variant.id,    // <-- String-ID der Variante
      title: variant.title,
      description: variant.description,
      context: variant.context,
      semantic_data: variant.semantic_data,
      writing_instructions: variant.writing_instructions,
    }));

    const { error: insertVariantsError } = await supabaseAdmin
      .from('prompt_variants')
      .insert(variantsToInsert);

    if (insertVariantsError) {
      console.error("[addPromptPackage] DB Insert Fehler (Varianten):", insertVariantsError);
      // Fehler beim Einfügen der Varianten -> Paket wieder löschen (Rollback-Versuch)
      throw new Error(`Datenbankfehler beim Einfügen der Varianten: ${insertVariantsError.message}`);
    }

    // 8. Cache für die Admin-Seite neu validieren
    revalidatePath('/admin/prompts');

    // 9. Erfolgsmeldung zurückgeben
    return { success: true, message: 'Prompt-Paket und Varianten erfolgreich erstellt!' };

  } catch (error) {
    // Fehlerbehandlung für den gesamten Prozess
    console.error("[addPromptPackage] Fehler beim Hinzufügen des Pakets/Varianten:", error.message);
    // Wenn ein Paket schon erstellt wurde, versuche es zu löschen
    if (newPackageId) {
      console.warn(`[addPromptPackage] Versuche, das teilweise erstellte Paket ${newPackageId} zu löschen...`);
      await supabaseAdmin.from('prompt_packages').delete().eq('id', newPackageId);
      console.log(`[addPromptPackage] Teilweise erstelltes Paket ${newPackageId} gelöscht.`);
    }
    return { success: false, message: `Fehler: ${error.message}. Paket wurde nicht erstellt.` };
  }
}


// --- updatePromptPackage (ANGEPASST für zwei Tabellen) ---
export async function updatePromptPackage(formData) {
  const supabaseUserClient = createServerComponentClient();

  // 1. Admin-Prüfung
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    console.error("[updatePromptPackage] Nicht-Admin versuchte, Prompt zu aktualisieren.");
    return { success: false, message: 'Nicht autorisiert.' };
  }

  // 2. Formulardaten extrahieren
  const rawFormData = {
    packageId: formData.get('packageId'), // ID des zu ändernden Pakets
    name: formData.get('name'),
    description: formData.get('description'),
    category: formData.get('category'),
    variantsJson: formData.get('variantsJson'),
    // Slug wird NICHT geändert
  };

  // 3. Grundlegende Validierung
  if (!rawFormData.packageId || !rawFormData.name || !rawFormData.variantsJson || !rawFormData.category) {
    console.error("[updatePromptPackage] Validation failed: Missing required fields.");
    return { success: false, message: 'Fehlende Daten (Paket-ID, Name, Kategorie, Varianten JSON sind erforderlich).' };
  }

  // 4. JSON Validierung
  const validationResult = validateVariantsJson(rawFormData.variantsJson);
  if (!validationResult.success) {
    console.error("[updatePromptPackage] JSON validation failed:", validationResult.message);
    return { success: false, message: validationResult.message };
  }
  const newVariantsArray = validationResult.data; // Das neue Array der Varianten

  // 5. Admin Client initialisieren
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // --- Update-Logik (Paket ändern, alte Varianten löschen, neue einfügen) ---
  try {
    // 6. Paket-Metadaten in prompt_packages aktualisieren
    const { error: updatePackageError } = await supabaseAdmin
      .from('prompt_packages')
      .update({
        name: rawFormData.name,
        description: rawFormData.description,
        category: rawFormData.category,
      })
      .eq('id', rawFormData.packageId);

    if (updatePackageError) {
      console.error("[updatePromptPackage] DB Update Fehler (Paket):", updatePackageError);
      throw new Error(`Datenbankfehler beim Aktualisieren des Pakets: ${updatePackageError.message}`);
    }

    // 7. Alte Varianten für dieses Paket löschen
    const { error: deleteVariantsError } = await supabaseAdmin
      .from('prompt_variants')
      .delete()
      .eq('package_id', rawFormData.packageId);

    if (deleteVariantsError) {
      console.error("[updatePromptPackage] DB Delete Fehler (Alte Varianten):", deleteVariantsError);
      // Kritischer Fehler, da Paket-Metadaten schon geändert wurden!
      throw new Error(`Fehler beim Löschen alter Varianten: ${deleteVariantsError.message}. Paket ist inkonsistent!`);
    }

    // 8. Neue Varianten einfügen
    const variantsToInsert = newVariantsArray.map(variant => ({
      package_id: rawFormData.packageId, // <-- Bestehende Paket-ID
      variant_id: variant.id,
      title: variant.title,
      description: variant.description,
      context: variant.context,
      semantic_data: variant.semantic_data,
      writing_instructions: variant.writing_instructions,
    }));

    // Nur einfügen, wenn es neue Varianten gibt
    if (variantsToInsert.length > 0) {
        const { error: insertVariantsError } = await supabaseAdmin
          .from('prompt_variants')
          .insert(variantsToInsert);

        if (insertVariantsError) {
          console.error("[updatePromptPackage] DB Insert Fehler (Neue Varianten):", insertVariantsError);
          // Wieder kritisch, da alte Varianten weg sind!
          throw new Error(`Fehler beim Einfügen der neuen Varianten: ${insertVariantsError.message}. Paket ist inkonsistent!`);
        }
    }

    // 9. Cache für relevante Seiten neu validieren
    revalidatePath('/admin/prompts'); // Liste aktualisieren
    revalidatePath(`/admin/prompts/edit/${rawFormData.packageId}`); // Diese Editier-Seite auch
    // Optional: Slug holen und Nutzer-Seite revalidieren
    const { data: pkg } = await supabaseAdmin.from('prompt_packages').select('slug').eq('id', rawFormData.packageId).single();
    if (pkg?.slug) {
        revalidatePath(`/prompt/${pkg.slug}`);
    }

    // 10. Erfolgsmeldung zurückgeben
    return { success: true, message: 'Prompt-Paket erfolgreich aktualisiert!' };

  } catch (error) {
     // Fehlerbehandlung für den gesamten Update-Prozess
     console.error("[updatePromptPackage] CATCH BLOCK - Fehler beim Aktualisieren des Pakets/Varianten:", error.message);
     return { success: false, message: `Fehler: ${error.message}. Das Paket ist möglicherweise in einem inkonsistenten Zustand!` };
  }
}


// --- deletePromptPackage (ANGEPASST für zwei Tabellen und direktes ID-Argument) ---
export async function deletePromptPackage(packageId) {
  const supabaseUserClient = createServerComponentClient();

  // 1. Admin-Prüfung
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    console.error("[deletePromptPackage] Nicht-Admin versuchte, Prompt zu löschen.");
    return { success: false, message: 'Aktion fehlgeschlagen.' }; // Generische Meldung
  }

  // 2. ID-Prüfung
  if (!packageId) {
    console.error("[deletePromptPackage] Validation failed: Missing packageId.");
    return { success: false, message: 'Fehlende Paket-ID zum Löschen.' };
  }

  // 3. Admin Client initialisieren
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // --- Löschen aus beiden Tabellen ---
  try {
    // 4. Varianten aus prompt_variants löschen
    const { error: deleteVariantsError } = await supabaseAdmin
      .from('prompt_variants')
      .delete()
      .eq('package_id', packageId);

    if (deleteVariantsError) {
      console.error("[deletePromptPackage] DB Delete Fehler (Varianten):", deleteVariantsError);
      throw new Error(`Datenbankfehler beim Löschen der Varianten: ${deleteVariantsError.message}`);
    }

    // 5. Paket aus prompt_packages löschen
    const { error: deletePackageError } = await supabaseAdmin
      .from('prompt_packages')
      .delete()
      .eq('id', packageId);

    if (deletePackageError) {
      console.error("[deletePromptPackage] DB Delete Fehler (Paket):", deletePackageError);
      throw new Error(`Datenbankfehler beim Löschen des Pakets: ${deletePackageError.message}`);
    }

    // 6. Cache für die Admin-Seite neu validieren
    revalidatePath('/admin/prompts');

    // 7. Erfolgsmeldung zurückgeben
    return { success: true, message: 'Prompt-Paket erfolgreich gelöscht!' };

  } catch (error) {
      // Fehlerbehandlung für den gesamten Löschprozess
      console.error("[deletePromptPackage] CATCH BLOCK - Fehler beim Löschen des Pakets/Varianten:", error.message);
      return { success: false, message: `Fehler: ${error.message}` };
  }
}


// --- getAdminPageData (bleibt unverändert) ---
export async function getAdminPageData() {
  'use server';
  const supabaseUserClient = createServerComponentClient();

  // 1. User holen und Admin-Status prüfen
  const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
  if (userError) { console.error("[getAdminPageData] Auth error:", userError); return { success: false, error: 'Authentifizierungsfehler.', user: null, prompts: [] }; }
  if (!user) { return { success: false, error: 'Nicht eingeloggt.', user: null, prompts: [] }; }
  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  if (!isAdmin) { console.warn(`[getAdminPageData] Unauthorized access attempt by ${user.email}`); return { success: false, error: 'Nicht autorisiert.', user: user, prompts: [] }; }

  // 2. Prompts laden
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: prompts, error: promptsError } = await supabaseAdmin
    .from('prompt_packages')
    .select('id, slug, name, category')
    .order('category', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (promptsError) { console.error("[getAdminPageData] Error loading prompts:", promptsError); return { success: false, error: `Fehler beim Laden der Prompts: ${promptsError.message}`, user: user, prompts: [] }; }

  // 3. Erfolgreich: User und Prompts zurückgeben
  return { success: true, user: user, prompts: prompts || [], error: null };
}

// --- NEU: Funktion zum Laden der Daten für die Edit-Seite ---
export async function getEditPageData(packageId) {
    'use server';
    const supabaseUserClient = createServerComponentClient();

    // 1. Admin-Prüfung
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
    if (userError) { console.error(`[getEditPageData] Auth error for package ${packageId}:`, userError); return { success: false, error: 'Authentifizierungsfehler.', promptPackage: null, variants: [] }; }
    if (!user) { return { success: false, error: 'Nicht eingeloggt.', promptPackage: null, variants: [] }; }
    if (user.email !== process.env.ADMIN_EMAIL) { console.warn(`[getEditPageData] Unauthorized access attempt by ${user.email} for package ${packageId}`); return { success: false, error: 'Nicht autorisiert.', promptPackage: null, variants: [] }; }

    if (!packageId) {
        console.error("[getEditPageData] No packageId provided.");
        return { success: false, error: 'Keine Paket-ID angegeben.', promptPackage: null, variants: [] };
    }

    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 2. Paket-Metadaten laden
    const { data: promptPackage, error: packageError } = await supabaseAdmin
        .from('prompt_packages')
        .select('id, name, slug, description, category')
        .eq('id', packageId)
        .single();

    if (packageError || !promptPackage) {
        console.error(`[getEditPageData] Fehler beim Laden des Pakets ${packageId} für Edit:`, packageError);
        const errorMsg = packageError?.code === 'PGRST116' ? 'Paket nicht gefunden.' : `Fehler beim Laden des Pakets: ${packageError?.message || 'Unbekannt'}`;
        return { success: false, error: errorMsg, promptPackage: null, variants: [] };
    }

    // 3. Zugehörige Varianten laden
    const { data: variants, error: variantsError } = await supabaseAdmin
        .from('prompt_variants')
        .select('variant_id, title, description, context, semantic_data, writing_instructions')
        .eq('package_id', packageId)
        .order('title', { ascending: true }); // Optional sortieren

    if (variantsError) {
        console.error(`[getEditPageData] Fehler beim Laden der Varianten für Paket ${packageId} (Edit):`, variantsError);
        // Paket trotzdem zurückgeben, aber mit Fehlerhinweis/leeren Varianten
        return { success: false, error: `Fehler beim Laden der Varianten: ${variantsError.message}`, promptPackage: promptPackage, variants: [] };
    }

    // 4. Varianten für das JSON-Feld vorbereiten
    const variantsForJson = (variants || []).map(v => ({
        id: v.variant_id, // String ID mappen
        title: v.title,
        description: v.description,
        context: v.context,
        semantic_data: v.semantic_data,
        writing_instructions: v.writing_instructions
    }));

    // 5. Erfolgreich: Paketdaten und vorbereitete Varianten zurückgeben
    return { success: true, promptPackage: promptPackage, variants: variantsForJson, error: null };
}

// --- logout Funktion ---
export async function logout() {
    'use server';
    const supabase = createServerComponentClient();
    await supabase.auth.signOut();
    redirect('/login');
}
