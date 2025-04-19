// app/admin/prompts/actions.js
"use server"; // Wichtig: Definiert dies als Server Action Modul

import { createClient as createServerComponentClient } from '@/lib/supabase/server'; // Pfad anpassen - Client für User Check (Anon Key)
import { createClient as createAdminClient } from '@supabase/supabase-js'; // Pfad anpassen - Client für DB Insert (Service Key)
import { revalidatePath } from 'next/cache'; // Zum Aktualisieren der Liste nach dem Hinzufügen
import { redirect } from 'next/navigation'; // Falls wir umleiten wollen

// Diese Funktion wird vom Formular aufgerufen
export async function addPromptPackage(formData) {
  const supabaseUserClient = createServerComponentClient();

  // 1. Prüfen, ob der ausführende User Admin ist
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    console.error("Nicht-Admin versuchte, Prompt hinzuzufügen.");
    return { success: false, message: 'Nicht autorisiert.' };
  }

  // 2. Formulardaten extrahieren
  const rawFormData = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description'),
    category: formData.get('category'),
    variantsJson: formData.get('variantsJson'), // JSON kommt als String aus dem Textarea
  };

  // 3. Grundlegende Validierung
  if (!rawFormData.name || !rawFormData.slug || !rawFormData.variantsJson || !rawFormData.category) {
    return { success: false, message: 'Bitte alle Pflichtfelder ausfüllen (Name, Slug, Kategorie, Varianten JSON).' };
  }

  // 4. JSON Validierung und Strukturprüfung
  let variantsData;
  try {
    variantsData = JSON.parse(rawFormData.variantsJson);
    // Prüfe, ob es ein Array ist
    if (!Array.isArray(variantsData)) throw new Error('JSON ist kein Array.');
    // Prüfe, ob es genau 5 Elemente hat
    if (variantsData.length !== 5) throw new Error(`JSON muss genau 5 Varianten enthalten, enthält aber ${variantsData.length}.`);
    // Prüfe jedes Element auf benötigte Felder
    variantsData.forEach((variant, index) => {
      if (!variant.title || !variant.description || !variant.template) {
        throw new Error(`Variante ${index + 1} fehlen benötigte Felder (title, description, template).`);
      }
    });
  } catch (e) {
    console.error("JSON Validierungsfehler:", e.message);
    return { success: false, message: `Fehler im Varianten JSON: ${e.message}` };
  }

  // 5. In Datenbank einfügen (mit Admin Client)
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
    // Ggf. ! entfernen
  );

  const { error: insertError } = await supabaseAdmin
    .from('prompt_packages')
    .insert({
      name: rawFormData.name,
      slug: rawFormData.slug.toLowerCase().replace(/\s+/g, '-'), // Slug normalisieren
      description: rawFormData.description,
      category: rawFormData.category,
      prompt_variants: variantsData, // Hier das geparste JSON-Objekt übergeben
    });

  if (insertError) {
    console.error("DB Insert Fehler:", insertError);
    // Prüfe auf Unique Constraint Fehler für Slug
    if (insertError.code === '23505' && insertError.message.includes('slug')) {
         return { success: false, message: `Fehler: Der Slug '${rawFormData.slug}' existiert bereits.` };
    }
    return { success: false, message: `Datenbankfehler: ${insertError.message}` };
  }

  // 6. Cache für die Admin-Seite neu validieren, damit die Liste aktualisiert wird
  revalidatePath('/admin/prompts');

  // 7. Erfolgsmeldung zurückgeben
  return { success: true, message: 'Prompt-Paket erfolgreich erstellt!' };
}
// app/admin/prompts/actions.js
// ... (vorhandene Imports und Funktionen wie addPromptPackage, deletePromptPackage, updatePromptPackage) ...

// NEUE Funktion zum Laden der Daten für die Admin-Prompt-Seite
export async function getAdminPageData() {
  'use server'; // Sicherstellen, dass dies auf dem Server läuft

  const supabaseUserClient = createServerComponentClient(); // Für Auth Check

  // 1. User holen und Admin-Status prüfen
  const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();

  if (userError) {
    console.error("Fehler beim Holen des Users:", userError);
    return { success: false, error: 'Authentifizierungsfehler.', user: null, prompts: [] };
  }

  if (!user) {
    // Nicht eingeloggt, sollte eigentlich durch Middleware abgefangen werden, aber sicher ist sicher
    return { success: false, error: 'Nicht eingeloggt.', user: null, prompts: [] };
  }

  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  if (!isAdmin) {
    // Kein Admin
    return { success: false, error: 'Nicht autorisiert.', user: user, prompts: [] };
  }

  console.log(`Admin ${user.email} lädt Daten für /admin/prompts.`);

  // 2. Prompts laden (mit Admin Client)
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: prompts, error: promptsError } = await supabaseAdmin
    .from('prompt_packages')
    .select('id, slug, name, category') // Nur benötigte Felder
    .order('category', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (promptsError) {
    console.error("Fehler beim Laden der Prompt-Pakete für Admin:", promptsError);
    return { success: false, error: `Fehler beim Laden der Prompts: ${promptsError.message}`, user: user, prompts: [] };
  }

  // 3. Erfolgreich: User und Prompts zurückgeben
  return { success: true, user: user, prompts: prompts || [], error: null };
}

// Innerhalb von app/admin/prompts/actions.js

// ... (vorhandene Imports und addPromptPackage Funktion) ...

export async function deletePromptPackage(formData) {
  const supabaseUserClient = createServerComponentClient(); // Für Auth Check

  // 1. Prüfen, ob der ausführende User Admin ist
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    console.error("Nicht-Admin versuchte, Prompt zu löschen.");
    // Wir geben hier bewusst keine detaillierte Fehlermeldung zurück,
    // um keine Infos preiszugeben, aber loggen den Versuch.
    // Im Frontend wird einfach nichts passieren oder eine generische Meldung angezeigt.
    // Alternativ: return { success: false, message: 'Nicht autorisiert.' };
    return { success: false, message: 'Aktion fehlgeschlagen.' };
  }

  // 2. ID aus Formulardaten extrahieren
  const packageId = formData.get('packageId');

  if (!packageId) {
    return { success: false, message: 'Fehlende Paket-ID zum Löschen.' };
  }

  console.log(`Admin ${user.email} versucht Paket mit ID ${packageId} zu löschen.`);

  // 3. Aus Datenbank löschen (mit Admin Client)
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
    // Ggf. ! entfernen
  );

  const { error: deleteError } = await supabaseAdmin
    .from('prompt_packages')
    .delete() // Lösch-Operation
    .eq('id', packageId); // Filter nach der ID

  if (deleteError) {
    console.error("DB Delete Fehler:", deleteError);
    return { success: false, message: `Datenbankfehler beim Löschen: ${deleteError.message}` };
  }

  // 4. Cache für die Admin-Seite neu validieren
  revalidatePath('/admin/prompts');

  // 5. Erfolgsmeldung zurückgeben
  console.log(`Paket ${packageId} erfolgreich gelöscht.`);
  return { success: true, message: 'Prompt-Paket erfolgreich gelöscht!' };

}

// Innerhalb von app/admin/prompts/actions.js

// ... (vorhandene Imports und addPromptPackage, deletePromptPackage Funktionen) ...

export async function updatePromptPackage(formData) {
  const supabaseUserClient = createServerComponentClient(); // Für Auth Check

  // 1. Prüfen, ob der ausführende User Admin ist
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { success: false, message: 'Nicht autorisiert.' };
  }

  // 2. Formulardaten extrahieren (inkl. der ID des zu ändernden Pakets)
  const rawFormData = {
    packageId: formData.get('packageId'), // Wichtig: Die ID des Pakets
    name: formData.get('name'),
    // Slug wird hier NICHT geändert, um Komplikationen zu vermeiden
    // slug: formData.get('slug'),
    description: formData.get('description'),
    category: formData.get('category'),
    variantsJson: formData.get('variantsJson'),
  };

  // 3. Grundlegende Validierung (ID ist essentiell!)
  if (!rawFormData.packageId || !rawFormData.name || !rawFormData.variantsJson || !rawFormData.category) {
    return { success: false, message: 'Fehlende Daten (Paket-ID, Name, Kategorie, Varianten JSON sind erforderlich).' };
  }

  // 4. JSON Validierung und Strukturprüfung (wie bei addPromptPackage)
  let variantsData;
  try {
    variantsData = JSON.parse(rawFormData.variantsJson);
    if (!Array.isArray(variantsData)) throw new Error('JSON ist kein Array.');
    if (variantsData.length !== 5) throw new Error(`JSON muss genau 5 Varianten enthalten, enthält aber ${variantsData.length}.`);
    variantsData.forEach((variant, index) => {
      if (!variant.title || !variant.description || !variant.template) {
        throw new Error(`Variante ${index + 1} fehlen benötigte Felder (title, description, template).`);
      }
    });
  } catch (e) {
    console.error("JSON Validierungsfehler beim Update:", e.message);
    return { success: false, message: `Fehler im Varianten JSON: ${e.message}` };
  }

  // 5. In Datenbank aktualisieren (mit Admin Client)
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
    // Ggf. ! entfernen
  );

  console.log(`Aktualisiere Paket mit ID: ${rawFormData.packageId}`);
  const { error: updateError } = await supabaseAdmin
    .from('prompt_packages')
    .update({
      name: rawFormData.name,
      // slug: rawFormData.slug.toLowerCase().replace(/\s+/g, '-'), // Slug wird NICHT aktualisiert
      description: rawFormData.description,
      category: rawFormData.category,
      prompt_variants: variantsData, // Aktualisierte Varianten
      // updated_at wird automatisch aktualisiert (wenn Spalte vorhanden und konfiguriert)
    })
    .eq('id', rawFormData.packageId); // Wichtig: Nur den Datensatz mit dieser ID ändern!

  if (updateError) {
    console.error("DB Update Fehler:", updateError);
    return { success: false, message: `Datenbankfehler beim Aktualisieren: ${updateError.message}` };
  }

  // 6. Cache für relevante Seiten neu validieren
  revalidatePath('/admin/prompts'); // Liste aktualisieren
  revalidatePath(`/admin/prompts/edit/${rawFormData.packageId}`); // Diese Editier-Seite auch
  // Optional: revalidatePath(`/prompt/${slug}`); // Auch die Nutzer-Detailseite?

  // 7. Erfolgsmeldung zurückgeben
  console.log(`Paket ${rawFormData.packageId} erfolgreich aktualisiert.`);
  return { success: true, message: 'Prompt-Paket erfolgreich aktualisiert!' };
}