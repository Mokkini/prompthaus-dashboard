// app/admin/prompts/actions.js - Angepasst für neue DB-Struktur (prompt_packages & prompt_variants)
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
    console.error("JSON Validierungsfehler:", e.message);
    return { success: false, message: `Fehler im Varianten JSON: ${e.message}` };
  }
}


// --- addPromptPackage (ANGEPASST für zwei Tabellen) ---
export async function addPromptPackage(formData) {
  const supabaseUserClient = createServerComponentClient();

  // 1. Prüfen, ob der ausführende User Admin ist (bleibt gleich)
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    console.error("Nicht-Admin versuchte, Prompt hinzuzufügen.");
    return { success: false, message: 'Nicht autorisiert.' };
  }

  // 2. Formulardaten extrahieren (bleibt gleich)
  const rawFormData = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description'),
    category: formData.get('category'),
    variantsJson: formData.get('variantsJson'),
  };

  // 3. Grundlegende Validierung (bleibt gleich)
  if (!rawFormData.name || !rawFormData.slug || !rawFormData.variantsJson || !rawFormData.category) {
    return { success: false, message: 'Bitte alle Pflichtfelder ausfüllen (Name, Slug, Kategorie, Varianten JSON).' };
  }

  // 4. JSON Validierung (nutzt angepasste Funktion)
  const validationResult = validateVariantsJson(rawFormData.variantsJson);
  if (!validationResult.success) {
    return { success: false, message: validationResult.message };
  }
  const variantsArray = validationResult.data; // Das validierte Array der Varianten

  // 5. Admin Client initialisieren (bleibt gleich)
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // --- NEU: Transaktionsähnliche Logik (zuerst Paket, dann Varianten) ---
  let newPackageId = null; // Variable für die ID des neuen Pakets

  try {
    // 6. Paket in prompt_packages einfügen (OHNE prompt_variants Spalte)
    console.log(`Füge Paket '${rawFormData.name}' hinzu...`);
    const { data: newPackage, error: insertPackageError } = await supabaseAdmin
      .from('prompt_packages')
      .insert({
        name: rawFormData.name,
        slug: rawFormData.slug.toLowerCase().replace(/\s+/g, '-'), // Slug normalisieren
        description: rawFormData.description,
        category: rawFormData.category,
        // prompt_variants: variantsData, // <-- ENTFERNT
      })
      .select('id') // Gib die ID des neuen Pakets zurück
      .single(); // Erwarte genau ein Ergebnis

    if (insertPackageError) {
      console.error("DB Insert Fehler (Paket):", insertPackageError);
      if (insertPackageError.code === '23505' && insertPackageError.message.includes('slug')) {
           return { success: false, message: `Fehler: Der Slug '${rawFormData.slug}' existiert bereits.` };
      }
      throw new Error(`Datenbankfehler (Paket): ${insertPackageError.message}`); // Fehler werfen für try-catch
    }

    newPackageId = newPackage.id; // ID speichern
    console.log(`Paket ${newPackageId} erstellt. Füge ${variantsArray.length} Varianten hinzu...`);

    // 7. Varianten in prompt_variants einfügen
    const variantsToInsert = variantsArray.map(variant => ({
      package_id: newPackageId, // <-- Verknüpfung zum Paket
      variant_id: variant.id,    // <-- String-ID der Variante
      title: variant.title,
      description: variant.description,
      context: variant.context,
      semantic_data: variant.semantic_data,
      writing_instructions: variant.writing_instructions,
      // created_at, updated_at werden von DB gesetzt (falls konfiguriert)
    }));

    const { error: insertVariantsError } = await supabaseAdmin
      .from('prompt_variants')
      .insert(variantsToInsert);

    if (insertVariantsError) {
      console.error("DB Insert Fehler (Varianten):", insertVariantsError);
      // Fehler beim Einfügen der Varianten -> Paket wieder löschen (Rollback-Versuch)
      throw new Error(`Datenbankfehler beim Einfügen der Varianten: ${insertVariantsError.message}`);
    }

    console.log(`${variantsToInsert.length} Varianten für Paket ${newPackageId} erfolgreich hinzugefügt.`);

    // 8. Cache für die Admin-Seite neu validieren (bleibt gleich)
    revalidatePath('/admin/prompts');

    // 9. Erfolgsmeldung zurückgeben (bleibt gleich)
    return { success: true, message: 'Prompt-Paket und Varianten erfolgreich erstellt!' };

  } catch (error) {
    // Fehlerbehandlung für den gesamten Prozess
    console.error("Fehler beim Hinzufügen des Pakets/Varianten:", error.message);
    // Wenn ein Paket schon erstellt wurde, versuche es zu löschen
    if (newPackageId) {
      console.warn(`Versuche, das teilweise erstellte Paket ${newPackageId} zu löschen...`);
      await supabaseAdmin.from('prompt_packages').delete().eq('id', newPackageId);
    }
    return { success: false, message: `Fehler: ${error.message}. Paket wurde nicht erstellt.` };
  }
}


// --- updatePromptPackage (ANGEPASST für zwei Tabellen) ---
export async function updatePromptPackage(formData) {
  const supabaseUserClient = createServerComponentClient();

  // 1. Admin-Prüfung (bleibt gleich)
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { success: false, message: 'Nicht autorisiert.' };
  }

  // 2. Formulardaten extrahieren (bleibt gleich)
  const rawFormData = {
    packageId: formData.get('packageId'), // ID des zu ändernden Pakets
    name: formData.get('name'),
    description: formData.get('description'),
    category: formData.get('category'),
    variantsJson: formData.get('variantsJson'),
    // Slug wird NICHT geändert
  };

  // 3. Grundlegende Validierung (bleibt gleich)
  if (!rawFormData.packageId || !rawFormData.name || !rawFormData.variantsJson || !rawFormData.category) {
    return { success: false, message: 'Fehlende Daten (Paket-ID, Name, Kategorie, Varianten JSON sind erforderlich).' };
  }

  // 4. JSON Validierung (nutzt angepasste Funktion)
  const validationResult = validateVariantsJson(rawFormData.variantsJson);
  if (!validationResult.success) {
    return { success: false, message: validationResult.message };
  }
  const newVariantsArray = validationResult.data; // Das neue Array der Varianten

  // 5. Admin Client initialisieren (bleibt gleich)
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log(`Aktualisiere Paket mit ID: ${rawFormData.packageId}`);

  // --- NEU: Update-Logik (Paket ändern, alte Varianten löschen, neue einfügen) ---
  try {
    // 6. Paket-Metadaten in prompt_packages aktualisieren
    const { error: updatePackageError } = await supabaseAdmin
      .from('prompt_packages')
      .update({
        name: rawFormData.name,
        description: rawFormData.description,
        category: rawFormData.category,
        // prompt_variants wird nicht mehr hier aktualisiert
      })
      .eq('id', rawFormData.packageId);

    if (updatePackageError) {
      console.error("DB Update Fehler (Paket):", updatePackageError);
      throw new Error(`Datenbankfehler beim Aktualisieren des Pakets: ${updatePackageError.message}`);
    }
    console.log(`Paket-Metadaten für ${rawFormData.packageId} aktualisiert.`);

    // 7. Alte Varianten für dieses Paket löschen
    console.log(`Lösche alte Varianten für Paket ${rawFormData.packageId}...`);
    const { error: deleteVariantsError } = await supabaseAdmin
      .from('prompt_variants')
      .delete()
      .eq('package_id', rawFormData.packageId);

    if (deleteVariantsError) {
      console.error("DB Delete Fehler (Alte Varianten):", deleteVariantsError);
      // Kritischer Fehler, da Paket-Metadaten schon geändert wurden!
      throw new Error(`Fehler beim Löschen alter Varianten: ${deleteVariantsError.message}. Paket ist inkonsistent!`);
    }
    console.log(`Alte Varianten für Paket ${rawFormData.packageId} gelöscht.`);

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
        console.log(`Füge ${variantsToInsert.length} neue Varianten für Paket ${rawFormData.packageId} hinzu...`);
        const { error: insertVariantsError } = await supabaseAdmin
          .from('prompt_variants')
          .insert(variantsToInsert);

        if (insertVariantsError) {
          console.error("DB Insert Fehler (Neue Varianten):", insertVariantsError);
          // Wieder kritisch, da alte Varianten weg sind!
          throw new Error(`Fehler beim Einfügen der neuen Varianten: ${insertVariantsError.message}. Paket ist inkonsistent!`);
        }
        console.log(`Neue Varianten für Paket ${rawFormData.packageId} hinzugefügt.`);
    } else {
        console.log(`Keine neuen Varianten zum Einfügen für Paket ${rawFormData.packageId}.`);
    }


    // 9. Cache für relevante Seiten neu validieren (bleibt gleich)
    revalidatePath('/admin/prompts'); // Liste aktualisieren
    revalidatePath(`/admin/prompts/edit/${rawFormData.packageId}`); // Diese Editier-Seite auch
    // Optional: Slug holen und Nutzer-Seite revalidieren
    const { data: pkg } = await supabaseAdmin.from('prompt_packages').select('slug').eq('id', rawFormData.packageId).single();
    if (pkg?.slug) {
        revalidatePath(`/prompt/${pkg.slug}`);
        console.log(`Cache für /prompt/${pkg.slug} revalidiert.`);
    }

    // 10. Erfolgsmeldung zurückgeben (bleibt gleich)
    console.log(`Paket ${rawFormData.packageId} erfolgreich aktualisiert.`);
    return { success: true, message: 'Prompt-Paket erfolgreich aktualisiert!' };

  } catch (error) {
     // Fehlerbehandlung für den gesamten Update-Prozess
     console.error("Fehler beim Aktualisieren des Pakets/Varianten:", error.message);
     return { success: false, message: `Fehler: ${error.message}. Das Paket ist möglicherweise in einem inkonsistenten Zustand!` };
  }
}


// --- deletePromptPackage (ANGEPASST für zwei Tabellen und direktes ID-Argument) ---
// Nimmt jetzt direkt packageId entgegen (wie im DeletePromptButton verwendet)
export async function deletePromptPackage(packageId) {
  const supabaseUserClient = createServerComponentClient();

  // 1. Admin-Prüfung (bleibt gleich)
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    console.error("Nicht-Admin versuchte, Prompt zu löschen.");
    return { success: false, message: 'Aktion fehlgeschlagen.' }; // Generische Meldung
  }

  // 2. ID-Prüfung
  if (!packageId) {
    return { success: false, message: 'Fehlende Paket-ID zum Löschen.' };
  }

  console.log(`Admin ${user.email} versucht Paket mit ID ${packageId} zu löschen.`);

  // 3. Admin Client initialisieren (bleibt gleich)
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // --- NEU: Löschen aus beiden Tabellen ---
  // WICHTIG: Die Reihenfolge kann relevant sein, wenn keine Cascade Deletes eingerichtet sind.
  // Sicherer ist es, zuerst die abhängigen Daten (Varianten) zu löschen.
  try {
    // 4. Varianten aus prompt_variants löschen
    console.log(`Lösche Varianten für Paket ${packageId}...`);
    const { error: deleteVariantsError } = await supabaseAdmin
      .from('prompt_variants')
      .delete()
      .eq('package_id', packageId);

    if (deleteVariantsError) {
      console.error("DB Delete Fehler (Varianten):", deleteVariantsError);
      // Fehler werfen, um den Prozess abzubrechen
      throw new Error(`Datenbankfehler beim Löschen der Varianten: ${deleteVariantsError.message}`);
    }
    console.log(`Varianten für Paket ${packageId} gelöscht.`);

    // 5. Paket aus prompt_packages löschen
    console.log(`Lösche Paket ${packageId}...`);
    const { error: deletePackageError } = await supabaseAdmin
      .from('prompt_packages')
      .delete()
      .eq('id', packageId);

    if (deletePackageError) {
      console.error("DB Delete Fehler (Paket):", deletePackageError);
      // Fehler werfen
      throw new Error(`Datenbankfehler beim Löschen des Pakets: ${deletePackageError.message}`);
    }

    // 6. Cache für die Admin-Seite neu validieren (bleibt gleich)
    revalidatePath('/admin/prompts');

    // 7. Erfolgsmeldung zurückgeben (bleibt gleich)
    console.log(`Paket ${packageId} erfolgreich gelöscht.`);
    return { success: true, message: 'Prompt-Paket erfolgreich gelöscht!' };

  } catch (error) {
      // Fehlerbehandlung für den gesamten Löschprozess
      console.error("Fehler beim Löschen des Pakets/Varianten:", error.message);
      return { success: false, message: `Fehler: ${error.message}` };
  }
}


// --- getAdminPageData (bleibt unverändert) ---
// Lädt nur die Liste der Pakete, keine Variantendetails
export async function getAdminPageData() {
  'use server';
  const supabaseUserClient = createServerComponentClient();

  // 1. User holen und Admin-Status prüfen (bleibt gleich)
  const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
  if (userError) { /* ... Fehlerbehandlung ... */ return { success: false, error: 'Authentifizierungsfehler.', user: null, prompts: [] }; }
  if (!user) { /* ... Fehlerbehandlung ... */ return { success: false, error: 'Nicht eingeloggt.', user: null, prompts: [] }; }
  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  if (!isAdmin) { /* ... Fehlerbehandlung ... */ return { success: false, error: 'Nicht autorisiert.', user: user, prompts: [] }; }

  console.log(`Admin ${user.email} lädt Daten für /admin/prompts.`);

  // 2. Prompts laden (bleibt gleich, da nur Paket-Metadaten benötigt)
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { data: prompts, error: promptsError } = await supabaseAdmin
    .from('prompt_packages')
    .select('id, slug, name, category') // Keine Änderung hier nötig
    .order('category', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (promptsError) { /* ... Fehlerbehandlung ... */ return { success: false, error: `Fehler beim Laden der Prompts: ${promptsError.message}`, user: user, prompts: [] }; }

  // 3. Erfolgreich: User und Prompts zurückgeben (bleibt gleich)
  return { success: true, user: user, prompts: prompts || [], error: null };
}

// --- NEU: Funktion zum Laden der Daten für die Edit-Seite ---
// Diese Funktion wird von der Edit-Seite ([packageId]/page.js) aufgerufen
export async function getEditPageData(packageId) {
    'use server';
    const supabaseUserClient = createServerComponentClient();

    // 1. Admin-Prüfung (wie oben)
    const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
    if (userError || !user || user.email !== process.env.ADMIN_EMAIL) {
        return { success: false, error: 'Nicht autorisiert oder Fehler.', promptPackage: null, variants: [] };
    }

    console.log(`Admin ${user.email} lädt Daten für Edit-Seite (Paket-ID: ${packageId}).`);

    const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 2. Paket-Metadaten laden
    const { data: promptPackage, error: packageError } = await supabaseAdmin
        .from('prompt_packages')
        .select('id, name, slug, description, category') // Keine Varianten hier
        .eq('id', packageId)
        .single();

    if (packageError || !promptPackage) {
        console.error(`Fehler beim Laden des Pakets ${packageId} für Edit:`, packageError);
        return { success: false, error: 'Paket nicht gefunden oder Fehler.', promptPackage: null, variants: [] };
    }

    // 3. Zugehörige Varianten laden
    const { data: variants, error: variantsError } = await supabaseAdmin
        .from('prompt_variants')
        .select('variant_id, title, description, context, semantic_data, writing_instructions') // DB 'id' (UUID) nicht nötig für JSON
        .eq('package_id', packageId)
        .order('title', { ascending: true }); // Optional sortieren

    if (variantsError) {
        console.error(`Fehler beim Laden der Varianten für Paket ${packageId} (Edit):`, variantsError);
        // Paket trotzdem zurückgeben, aber mit Fehlerhinweis/leeren Varianten
        return { success: false, error: `Fehler beim Laden der Varianten: ${variantsError.message}`, promptPackage: promptPackage, variants: [] };
    }

    // 4. Varianten für das JSON-Feld vorbereiten (String 'variant_id' wird zu 'id')
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

// --- logout Funktion (kann hier bleiben oder in eine separate auth-actions.js) ---
export async function logout() {
    'use server';
    const supabase = createServerComponentClient();
    await supabase.auth.signOut();
    redirect('/login');
}
