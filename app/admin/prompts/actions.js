// app/admin/prompts/actions.js - Mit Tag-Verarbeitung, getAdminPageData, getEditPageData und Debug-Logs

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// --- FUNKTION: getAdminPageData ---
export async function getAdminPageData() {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error("Fehler beim Holen des Benutzers oder nicht eingeloggt:", userError?.message);
    return { success: false, error: 'Nicht eingeloggt.', user: null, prompts: [] };
  }
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

// --- FUNKTION: getEditPageData ---
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

// --- Schemas (bleiben gleich) ---
const PromptDataSchema = z.object({
  context: z.object({}).passthrough(),
  semantic_data: z.object({}).passthrough(),
  writing_instructions: z.object({}).passthrough(),
}).strict();

const PromptPackageSchema = z.object({
  name: z.string().min(3, "Name ist erforderlich."),
  slug: z.string().regex(/^[a-z0-9-]+$/, "Slug darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.").min(3, "Slug ist erforderlich."),
  category: z.string().optional(),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Preis muss positiv sein."),
  tags: z.string().optional(),
  promptDataJson: z.string().min(1, "Prompt-Daten JSON ist erforderlich."),
});

// --- FUNKTION: addPromptPackage (bleibt gleich) ---
export async function addPromptPackage(formData) {
  const supabaseAdmin = createClient();
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
  const { promptDataJson, tags: tagsString, ...packageData } = validatedFields.data;
  let parsedPromptData;
  try {
    parsedPromptData = JSON.parse(promptDataJson);
  } catch (e) {
    console.error("JSON Parse Fehler:", e.message);
    return { success: false, message: "Fehler im Prompt-Daten JSON: Ungültiges Format." };
  }
  const validatedPromptData = PromptDataSchema.safeParse(parsedPromptData);
  if (!validatedPromptData.success) {
    // ... (Fehlerbehandlung für Prompt-Daten bleibt gleich) ...
    console.error("Validierungsfehler (Prompt-Daten):", validatedPromptData.error.flatten().fieldErrors);
    const firstErrorPath = validatedPromptData.error.errors[0]?.path.join('.');
    const firstErrorMessage = validatedPromptData.error.errors[0]?.message;
    let userMessage = "Fehler in der Struktur der Prompt-Daten.";
    if (firstErrorPath && firstErrorMessage) {
        userMessage = `Fehler im Prompt-Daten JSON (${firstErrorPath}): ${firstErrorMessage}`;
    } else if (firstErrorMessage) {
         userMessage = `Fehler im Prompt-Daten JSON: ${firstErrorMessage}`;
    } else if (validatedPromptData.error.message.includes("'context'")) {
         userMessage = "Fehler im Prompt-Daten JSON: Das JSON muss ein 'context' Objekt enthalten.";
    } else if (validatedPromptData.error.message.includes("'semantic_data'")) {
         userMessage = "Fehler im Prompt-Daten JSON: Das JSON muss ein 'semantic_data' Objekt enthalten.";
    } else if (validatedPromptData.error.message.includes("'writing_instructions'")) {
         userMessage = "Fehler im Prompt-Daten JSON: Das JSON muss ein 'writing_instructions' Objekt enthalten.";
    }
    return { success: false, message: userMessage };
  }
  const tagsArray = tagsString
    ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
    : [];
  try {
    const { data, error } = await supabaseAdmin
      .from('prompt_packages')
      .insert([{ ...packageData, ...validatedPromptData.data, tags: tagsArray }])
      .select().single();
    if (error) {
      console.error("Supabase Insert Fehler:", error);
      if (error.code === '23505' && error.message.includes('prompt_packages_slug_key')) {
          return { success: false, message: `Fehler: Der Slug "${packageData.slug}" existiert bereits. Bitte wähle einen anderen.` };
      }
      return { success: false, message: `Datenbankfehler: ${error.message}` };
    }
    console.log("Prompt-Paket erfolgreich hinzugefügt:", data);
    revalidatePath('/admin/prompts');
    revalidatePath('/pakete');
    revalidatePath(`/pakete/${packageData.slug}`);
    revalidatePath(`/checkout/${packageData.slug}`);
    return { success: true, message: 'Prompt-Paket erfolgreich hinzugefügt.', data };
  } catch (e) {
    console.error("Unerwarteter Fehler in addPromptPackage:", e);
    return { success: false, message: `Unerwarteter Serverfehler: ${e.message}` };
  }
}

// --- FUNKTION: deletePromptPackage (bleibt gleich) ---
export async function deletePromptPackage(id) {
  const supabaseAdmin = createClient();
  console.log(`Versuche Paket mit ID zu löschen: ${id}`);
  try {
    const { error } = await supabaseAdmin.from('prompt_packages').delete().match({ id: id });
    if (error) {
      console.error("Supabase Delete Fehler:", error);
      return { error: `Datenbankfehler: ${error.message}` };
    }
    console.log(`Paket mit ID ${id} erfolgreich gelöscht.`);
    revalidatePath('/admin/prompts');
    revalidatePath('/pakete');
    return { success: true };
  } catch (e) {
    console.error("Unerwarteter Fehler in deletePromptPackage:", e);
    return { error: `Unerwarteter Serverfehler: ${e.message}` };
  }
}

// --- FUNKTION: updatePromptPackage (ANGEPASST für Tags + DEBUG LOGS) ---
export async function updatePromptPackage(formData) {
  const supabaseAdmin = createClient();

  // 1. Daten extrahieren (inkl. ID, JSON-String UND Tags-String)
  const packageId = formData.get('packageId');
  // --- DEBUG LOG: Empfangene ID ---
  console.log('[updatePromptPackage] Empfangene packageId:', packageId);
  // --- ENDE DEBUG LOG ---
  const name = formData.get('name');
  const description = formData.get('description');
  const category = formData.get('category');
  const price = formData.get('price');
  const promptDataJson = formData.get('promptDataJson');
  const tagsString = formData.get('tags');

  // 2. ID-Prüfung
  if (!packageId) {
    // --- DEBUG LOG: Fehlende ID ---
    console.error('[updatePromptPackage] Fehler: packageId fehlt im FormData.');
    // --- ENDE DEBUG LOG ---
    return { success: false, message: "Fehler: Paket-ID fehlt." };
  }

  // 3. JSON parsen und validieren
  let parsedPromptData;
  try {
    parsedPromptData = JSON.parse(promptDataJson);
    if (typeof parsedPromptData !== 'object' || parsedPromptData === null ||
        typeof parsedPromptData.context !== 'object' || parsedPromptData.context === null ||
        typeof parsedPromptData.semantic_data !== 'object' || parsedPromptData.semantic_data === null ||
        typeof parsedPromptData.writing_instructions !== 'object' || parsedPromptData.writing_instructions === null) {
      throw new Error("JSON hat nicht die erwartete Grundstruktur (context, semantic_data, writing_instructions).");
    }
  } catch (e) {
    console.error("JSON Parse/Struktur Fehler beim Update:", e.message);
    return { success: false, message: `Fehler im Prompt-Daten JSON: ${e.message}` };
  }

  // 4. Preis validieren
  const priceFloat = parseFloat(price);
  if (isNaN(priceFloat) || priceFloat < 0) {
    return { success: false, message: "Fehler: Ungültiger Preis angegeben." };
  }

  // Tags-String verarbeiten
  const tagsArray = tagsString
    ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
    : [];

   // 5. Daten in der Datenbank aktualisieren (inkl. Tags)
    try {
      // --- DEBUG LOG: Vor DB-Aufruf ---
      console.log(`[updatePromptPackage] Versuche Update für ID: ${packageId}`);
      // --- ENDE DEBUG LOG ---

      /* // --- TEMPORÄR VEREINFACHTES UPDATE (AUSKOMMENTIERT) ---
      const { data, error } = await supabaseAdmin
        .from('prompt_packages')
        .update({
          // Nur den Namen aktualisieren, um andere Datenquellen auszuschließen
          name: name + ' (Test Update)'
        })
        .match({ id: packageId }) // Wichtig: Nur den Datensatz mit der passenden ID ändern
        .select()
        .single(); // Hier tritt der Fehler auf, wenn match fehlschlägt
      // --- ENDE TEMPORÄR VEREINFACHTES UPDATE --- */

      // Originales Update (wieder aktiviert):
      const { data, error } = await supabaseAdmin
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
      console.error("Supabase Update Fehler:", error);
      // Der Fehler "JSON object requested, multiple (or no) rows returned" hat oft den Code PGRST116
      if (error.code === 'PGRST116') {
          return { success: false, message: `Datenbankfehler beim Update: Paket mit ID ${packageId} nicht gefunden oder Bedingung nicht eindeutig.` };
      }
      return { success: false, message: `Datenbankfehler beim Update: ${error.message}` };
    }

    console.log("Prompt-Paket erfolgreich aktualisiert:", data);

    // 6. Cache Revalidierung
    revalidatePath('/admin/prompts');
    revalidatePath('/pakete');
    if (data?.slug) { // Slug aus der Antwort nehmen, falls vorhanden
      revalidatePath(`/pakete/${data.slug}`);
      revalidatePath(`/checkout/${data.slug}`);
    }

    return { success: true, message: 'Änderungen erfolgreich gespeichert.', data };

  } catch (e) {
    // --- DEBUG LOG: Unerwarteter Fehler ---
    console.error("[updatePromptPackage] Unerwarteter Fehler im try-catch:", e);
    // --- ENDE DEBUG LOG ---
    return { success: false, message: `Unerwarteter Serverfehler: ${e.message}` };
  }
}
