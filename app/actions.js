// app/actions.js - Angepasst für template-freie Generierung

'use server';

// ======= Imports =======
import { createClient } from '@/lib/supabase/server'; // Server-Client für Auth/RLS-basierte Abfragen
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation'; // Wird für Logout benötigt
import Stripe from 'stripe';
// --- NEU: Import für Admin Client ---
// Importiere den Standard Supabase Client, um den Admin Client zu erstellen
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
// Alternativ, falls du eine eigene Funktion in lib hast:
// import { createAdminClient as createSupabaseAdminClient } from '@/lib/supabase/admin';

// ======= HILFSFUNKTION: Korrekte Admin Client Initialisierung =======
function getSupabaseAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error("Supabase URL oder Service Key fehlt für Admin Operation!");
        // Wir werfen hier einen Fehler, der in den aufrufenden Funktionen gefangen wird
        throw new Error('Server-Konfigurationsfehler für Admin-Operationen.');
    }
    // Erstelle und gib den Admin-Client zurück
    // Stelle sicher, dass die Umgebungsvariablen korrekt gesetzt sind!
    return createSupabaseAdminClient(supabaseUrl, serviceKey);
}
// ======= ENDE HILFSFUNKTION =======


// ======= Funktion: updatePassword =======
export async function updatePassword(newPassword) {
  // ... (Code bleibt unverändert) ...
  const supabase = createClient(); // Standard Server Client (mit User-Session)

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Update Password Error: User not authenticated');
    return { success: false, error: 'Authentifizierung fehlgeschlagen. Bitte neu einloggen.' };
  }

  // Mindestlänge serverseitig prüfen (Beispiel: 6 Zeichen)
  if (!newPassword || newPassword.length < 6) {
      console.error('Update Password Error: Password too short for user:', user.email);
      return { success: false, error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' };
  }

  // updateUser nutzt die Session des eingeloggten Users, kein Admin-Client nötig
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Supabase Update Password Error:', error.message);
    return { success: false, error: 'Passwort konnte nicht geändert werden. Bitte versuche es erneut.' };
  }

  console.log("Passwort erfolgreich geändert für User:", user.email);
  // Flag zurücksetzen (nutzt auch die User-Session)
  if (user.user_metadata?.needs_password_setup) {
      console.log("Entferne needs_password_setup Flag für User:", user.email);
      // Kein await nötig, da wir nicht auf das Ergebnis warten müssen für die Hauptlogik
      supabase.auth.updateUser({ data: { needs_password_setup: false } })
        .then(({ error: flagError }) => {
            if (flagError) console.error("Fehler beim Entfernen des needs_password_setup Flags:", flagError.message);
        });
  }

  return { success: true, error: null };
}

// ======= Funktion: login =======
export async function login(formData) {
  // ... (Code bleibt unverändert) ...
  const email = formData.get('email');
  const password = formData.get('password');
  const supabase = createClient(); // Standard Server Client

  // Validierung
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return { success: false, message: 'Ungültige E-Mail oder Passwort.' };
  }

  // signInWithPassword nutzt den Standard-Client
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error('Login Action Error:', signInError);
    if (signInError.message.includes('Invalid login credentials')) {
        return { success: false, message: 'Ungültige E-Mail oder Passwort.' };
    }
    return { success: false, message: 'Login fehlgeschlagen. Bitte versuche es erneut.' };
  }

    // Nutzerdaten holen (nutzt Standard-Client)
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();

     if (getUserError || !user) {
       console.error('Error getting user after login:', getUserError);
       return { success: true, redirectTo: '/' }; // Fallback
     }

     // Prüfung auf Passwort-Setup (korrekt)
     if (user.user_metadata?.needs_password_setup === true) {
         console.log('User needs password setup, redirecting to /passwort-festlegen');
         return { success: true, redirectTo: '/passwort-festlegen' };
     }

     // Prüfung auf Admin (korrekt)
     if (process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL) {
       console.log('Admin login detected, redirecting to /admin/prompts');
       return { success: true, redirectTo: '/admin/prompts' };
     } else {
       console.log('Regular user login detected, redirecting to /meine-prompts');
       return { success: true, redirectTo: '/meine-prompts' };
     }
}

// ======= Funktion: createCheckoutSession =======
export async function createCheckoutSession(priceId, promptPackageId) {
    // ... (Code bleibt unverändert) ...
    if (!priceId) {
      console.error("Server Action 'createCheckoutSession': Keine Price ID übergeben.");
      return JSON.stringify({ error: "Produktinformation fehlt (Preis)." });
    }
    if (!promptPackageId) {
      console.error("Server Action 'createCheckoutSession': Keine promptPackageId übergeben.");
      return JSON.stringify({ error: "Produkt-Identifikation fehlt." });
    }
    console.log(`Server Action 'createCheckoutSession': Erstelle Checkout für Price ID: ${priceId}, Paket ID: ${promptPackageId}`);

    const supabase = createClient(); // Standard Server Client
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        console.log("Server Action 'createCheckoutSession': Nutzer ist eingeloggt:", user.email);
    } else {
        console.log("Server Action 'createCheckoutSession': Nutzer ist NICHT eingeloggt (Gast-Checkout).");
    }

    if (!process.env.STRIPE_SECRET_KEY) {
        console.error("Server Action 'createCheckoutSession': STRIPE_SECRET_KEY fehlt in .env.local");
        return JSON.stringify({ error: "Server-Konfigurationsfehler." });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const successUrl = `${siteUrl}/kauf-erfolgreich?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}/`;

    try {
      console.log("Server Action 'createCheckoutSession': Versuche Stripe Session zu erstellen...");
      const session = await stripe.checkout.sessions.create({
        line_items: [ { price: priceId, quantity: 1 } ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        ...(user ? { customer_email: user.email } : {}),
        metadata: {
          ...(user ? { userId: user.id } : {}),
          promptPackageId: promptPackageId
        }
      });
      console.log("Server Action 'createCheckoutSession': Stripe Session erstellt, ID:", session.id);
      return JSON.stringify({ sessionId: session.id });
    } catch (error) {
      console.error("Server Action 'createCheckoutSession': Fehler beim Erstellen der Stripe Session:", error);
      return JSON.stringify({ error: `Fehler beim Starten des Bezahlvorgangs: ${error.message}` });
    }
}

// ======= Funktion: logout =======
export async function logout() {
  // ... (Code bleibt unverändert) ...
  const supabase = createClient(); // Standard Server Client
  console.log('Logout Action wird ausgeführt...');
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Logout Action Error:', error);
  } else {
    console.log('Logout erfolgreich.');
  }
  // revalidatePath('/') // Optional
  return redirect('/login');
}

// ======= Admin Actions =======

// Funktion zum Laden der Daten für die Admin-Prompt-Seite
export async function getAdminPageData() {
  // ... (Code bleibt unverändert) ...
  const supabaseUserClient = createClient(); // Für Auth Check

  // 1. User holen und Admin-Status prüfen (korrekt)
  const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
  if (userError) {
    console.error("Fehler beim Holen des Users:", userError);
    return { success: false, error: 'Authentifizierungsfehler.', user: null, prompts: [] };
  }
  if (!user) {
    return { success: false, error: 'Nicht eingeloggt.', user: null, prompts: [] };
  }
  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  if (!isAdmin) {
    return { success: false, error: 'Nicht autorisiert.', user: user, prompts: [] };
  }

  console.log(`Admin ${user.email} lädt Daten für /admin/prompts.`);

  // 2. Prompts laden (mit Admin Client)
  try {
    // --- KORREKTE VERWENDUNG des Admin Clients ---
    const supabaseAdmin = getSupabaseAdminClient(); // Hole den Admin Client

    const { data: prompts, error: promptsError } = await supabaseAdmin
      .from('prompt_packages')
      .select('id, slug, name, category')
      .order('category', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true });

    if (promptsError) {
      console.error("Fehler beim Laden der Prompt-Pakete für Admin:", promptsError);
      return { success: false, error: `Fehler beim Laden der Prompts: ${promptsError.message}`, user: user, prompts: [] };
    }

    // 3. Erfolgreich: User und Prompts zurückgeben
    return { success: true, user: user, prompts: prompts || [], error: null };

  } catch (configError) { // Fange Fehler von getSupabaseAdminClient ab
      console.error("Admin Config Error in getAdminPageData:", configError.message);
      return { success: false, error: configError.message, user: user, prompts: [] };
  }
}


// Funktion zum Hinzufügen eines neuen Prompt-Pakets
export async function addPromptPackage(formData) {
  const supabaseUserClient = createClient(); // Für Auth Check

  // 1. Admin-Prüfung (korrekt)
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    console.error("Nicht-Admin versuchte, Prompt hinzuzufügen.");
    return { success: false, message: 'Nicht autorisiert.' };
  }

  // 2. Formulardaten extrahieren (korrekt)
  const rawFormData = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description'),
    category: formData.get('category'),
    variantsJson: formData.get('variantsJson'),
  };

  // 3. Grundlegende Validierung (korrekt)
  if (!rawFormData.name || !rawFormData.slug || !rawFormData.variantsJson || !rawFormData.category) {
    return { success: false, message: 'Bitte alle Pflichtfelder ausfüllen (Name, Slug, Kategorie, Varianten JSON).' };
  }

  // --- 4. JSON Validierung (ANGEPASST) ---
  let generationVariantsData; // Umbenannt für Klarheit
  try {
    // Erwarte ein Objekt mit dem Schlüssel 'generation_variants'
    const parsedJson = JSON.parse(rawFormData.variantsJson);
    if (typeof parsedJson !== 'object' || parsedJson === null || !Array.isArray(parsedJson.generation_variants)) {
        throw new Error("JSON muss ein Objekt mit einem 'generation_variants' Array sein.");
    }
    generationVariantsData = parsedJson.generation_variants; // Das Array extrahieren

    // Optional: Anzahl prüfen (falls immer 5 sein sollen)
    // if (generationVariantsData.length !== 5) throw new Error(`'generation_variants' muss genau 5 Varianten enthalten, enthält aber ${generationVariantsData.length}.`);

    // Prüfe jede Variante auf notwendige Felder (KEIN template mehr)
    generationVariantsData.forEach((variant, index) => {
      if (!variant || typeof variant !== 'object') {
        throw new Error(`Variante ${index + 1} ist kein gültiges Objekt.`);
      }
      // --- Kernfelder prüfen (ohne template) ---
      if (!variant.id || typeof variant.id !== 'string') throw new Error(`Variante ${index + 1}: Fehlende oder ungültige 'id'.`);
      if (!variant.title || typeof variant.title !== 'string') throw new Error(`Variante ${index + 1}: Fehlende oder ungültige 'title'.`);
      if (!variant.description || typeof variant.description !== 'string') throw new Error(`Variante ${index + 1}: Fehlende oder ungültige 'description'.`);

      // --- Semantic Data prüfen (wird wichtiger) ---
      if (!variant.semantic_data || typeof variant.semantic_data !== 'object') throw new Error(`Variante ${index + 1}: Fehlendes oder ungültiges 'semantic_data' Objekt.`);
      // Detaillierte Prüfung von semantic_data (wie in unserer Diskussion)
      for (const key in variant.semantic_data) {
          const fieldGroup = variant.semantic_data[key];
          if (!fieldGroup || typeof fieldGroup !== 'object') throw new Error(`Variante ${index + 1}, semantic_data '${key}': Ungültiges Objekt.`);
          if (!fieldGroup.type || typeof fieldGroup.type !== 'string') throw new Error(`Variante ${index + 1}, semantic_data '${key}': Fehlender oder ungültiger 'type'.`);
          if (fieldGroup.type === 'object') {
              if (!fieldGroup.fields || typeof fieldGroup.fields !== 'object') throw new Error(`Variante ${index + 1}, semantic_data '${key}': Fehlendes oder ungültiges 'fields' Objekt.`);
              for (const fieldKey in fieldGroup.fields) {
                  const fieldDef = fieldGroup.fields[fieldKey];
                  if (!fieldDef || typeof fieldDef !== 'object') throw new Error(`Variante ${index + 1}, semantic_data '${key}', field '${fieldKey}': Ungültiges Objekt.`);
                  if (!fieldDef.type || typeof fieldDef.type !== 'string') throw new Error(`Variante ${index + 1}, semantic_data '${key}', field '${fieldKey}': Fehlender oder ungültiger 'type'.`);
                  if (!fieldDef.label || typeof fieldDef.label !== 'string') throw new Error(`Variante ${index + 1}, semantic_data '${key}', field '${fieldKey}': Fehlender oder ungültiger 'label'.`);
              }
          } else if (fieldGroup.type === 'text' || fieldGroup.type === 'string' || fieldGroup.type === 'number' || fieldGroup.type === 'date' || fieldGroup.type === 'boolean') {
               if (!fieldGroup.label || typeof fieldGroup.label !== 'string') throw new Error(`Variante ${index + 1}, semantic_data '${key}': Fehlender oder ungültiger 'label'.`);
          }
      }

      // --- Writing Instructions prüfen (wird wichtiger) ---
      if (!variant.writing_instructions || typeof variant.writing_instructions !== 'object') throw new Error(`Variante ${index + 1}: Fehlendes oder ungültiges 'writing_instructions' Objekt.`);
      // Detaillierte Prüfung von writing_instructions (optional, aber empfohlen)
      if (!Array.isArray(variant.writing_instructions.overall_tone)) throw new Error(`Variante ${index + 1}: 'overall_tone' muss ein Array sein.`);
      if (!variant.writing_instructions.formality_level || typeof variant.writing_instructions.formality_level !== 'string') throw new Error(`Variante ${index + 1}: 'formality_level' fehlt oder ist ungültig.`);
      // ... weitere Prüfungen für key_messages, rhetorical_approach, constraints ...

    });
  } catch (e) {
    console.error("JSON Validierungsfehler:", e.message);
    return { success: false, message: `Fehler im Varianten JSON: ${e.message}` };
  }
  // --- ENDE JSON Validierung ---

  // 5. In Datenbank einfügen (mit Admin Client)
  try {
    const supabaseAdmin = getSupabaseAdminClient();

    const { error: insertError } = await supabaseAdmin
      .from('prompt_packages')
      .insert({
        name: rawFormData.name,
        slug: rawFormData.slug.toLowerCase().replace(/\s+/g, '-'),
        description: rawFormData.description,
        category: rawFormData.category,
        // --- HIER das geparste Array einfügen ---
        prompt_variants: generationVariantsData,
      });

    if (insertError) {
      console.error("DB Insert Fehler:", insertError);
      if (insertError.code === '23505' && insertError.message.includes('slug')) {
         return { success: false, message: `Fehler: Der Slug '${rawFormData.slug}' existiert bereits.` };
      }
      return { success: false, message: `Datenbankfehler: ${insertError.message}` };
    }

    // 6. Cache neu validieren (korrekt)
    revalidatePath('/admin/prompts');
    revalidatePath('/pakete');
    revalidatePath('/kategorien');

    // 7. Erfolgsmeldung (korrekt)
    return { success: true, message: 'Prompt-Paket erfolgreich erstellt!' };

  } catch (configError) { // Fange Fehler von getSupabaseAdminClient ab
      console.error("Admin Config Error in addPromptPackage:", configError.message);
      return { success: false, message: configError.message };
  }
}

// Funktion zum Löschen eines Prompt-Pakets
export async function deletePromptPackage(packageId) {
  // ... (Code bleibt unverändert) ...
  const supabaseUserClient = createClient(); // Für Auth Check

  // 1. Admin-Prüfung (korrekt)
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    console.error("Nicht-Admin versuchte, Prompt zu löschen.");
    // --- WICHTIG: Gib die ursprüngliche Fehlermeldung zurück! ---
    // Oder eine andere, die dein Frontend erwartet (hier 'error' Feld)
    return { success: false, error: 'Aktion fehlgeschlagen: Kein Zugriff auf dieses Prompt-Paket.' };
  }

  // 2. ID Validierung (korrekt)
  if (!packageId) {
    return { success: false, error: 'Fehlende Paket-ID zum Löschen.' };
  }

  console.log(`Admin ${user.email} versucht Paket mit ID ${packageId} zu löschen.`);

  // 3. Aus Datenbank löschen (mit Admin Client)
  try {
    // --- KORREKTE VERWENDUNG des Admin Clients ---
    const supabaseAdmin = getSupabaseAdminClient();

    const { error: deleteError } = await supabaseAdmin
      .from('prompt_packages')
      .delete()
      .eq('id', packageId);

    if (deleteError) {
      console.error("DB Delete Fehler:", deleteError);
      return { success: false, error: `Datenbankfehler beim Löschen: ${deleteError.message}` };
    }

    // 4. Cache neu validieren (korrekt)
    revalidatePath('/admin/prompts');
    revalidatePath('/pakete');
    revalidatePath('/kategorien');

    // 5. Erfolg zurückgeben (korrekt)
    console.log(`Paket ${packageId} erfolgreich gelöscht.`);
    return { success: true };

  } catch (configError) { // Fange Fehler von getSupabaseAdminClient ab
      console.error("Admin Config Error in deletePromptPackage:", configError.message);
      // Stelle sicher, dass du das 'error'-Feld zurückgibst, wie es dein Button erwartet
      return { success: false, error: configError.message };
  }
}


// Funktion zum Aktualisieren eines Prompt-Pakets
export async function updatePromptPackage(formData) {
  const supabaseUserClient = createClient(); // Für Auth Check

  // 1. Admin-Prüfung (korrekt)
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { success: false, message: 'Nicht autorisiert.' };
  }

  // 2. Formulardaten extrahieren (korrekt)
  const rawFormData = {
    packageId: formData.get('packageId'),
    name: formData.get('name'),
    description: formData.get('description'),
    category: formData.get('category'),
    variantsJson: formData.get('variantsJson'),
  };

  // 3. Grundlegende Validierung (korrekt)
  if (!rawFormData.packageId || !rawFormData.name || !rawFormData.variantsJson || !rawFormData.category) {
    return { success: false, message: 'Fehlende Daten (Paket-ID, Name, Kategorie, Varianten JSON sind erforderlich).' };
  }

  // --- 4. JSON Validierung (ANGEPASST - wie bei addPromptPackage) ---
  let generationVariantsData;
  try {
    const parsedJson = JSON.parse(rawFormData.variantsJson);
    if (typeof parsedJson !== 'object' || parsedJson === null || !Array.isArray(parsedJson.generation_variants)) {
        throw new Error("JSON muss ein Objekt mit einem 'generation_variants' Array sein.");
    }
    generationVariantsData = parsedJson.generation_variants;

    // Optional: Anzahl prüfen
    // if (generationVariantsData.length !== 5) throw new Error(`'generation_variants' muss genau 5 Varianten enthalten, enthält aber ${generationVariantsData.length}.`);

    // Prüfe jede Variante (ohne template)
    generationVariantsData.forEach((variant, index) => {
      if (!variant || typeof variant !== 'object') throw new Error(`Variante ${index + 1} ist kein gültiges Objekt.`);
      if (!variant.id || typeof variant.id !== 'string') throw new Error(`Variante ${index + 1}: Fehlende oder ungültige 'id'.`);
      if (!variant.title || typeof variant.title !== 'string') throw new Error(`Variante ${index + 1}: Fehlende oder ungültige 'title'.`);
      if (!variant.description || typeof variant.description !== 'string') throw new Error(`Variante ${index + 1}: Fehlende oder ungültige 'description'.`);
      if (!variant.semantic_data || typeof variant.semantic_data !== 'object') throw new Error(`Variante ${index + 1}: Fehlendes oder ungültiges 'semantic_data' Objekt.`);
      // Detaillierte Prüfung von semantic_data... (siehe addPromptPackage)
      if (!variant.writing_instructions || typeof variant.writing_instructions !== 'object') throw new Error(`Variante ${index + 1}: Fehlendes oder ungültiges 'writing_instructions' Objekt.`);
      // Detaillierte Prüfung von writing_instructions... (siehe addPromptPackage)
    });
  } catch (e) {
    console.error("JSON Validierungsfehler beim Update:", e.message);
    return { success: false, message: `Fehler im Varianten JSON: ${e.message}` };
  }
  // --- ENDE JSON Validierung ---

  // 5. In Datenbank aktualisieren (mit Admin Client)
  try {
    const supabaseAdmin = getSupabaseAdminClient();

    console.log(`Aktualisiere Paket mit ID: ${rawFormData.packageId}`);
    const { error: updateError } = await supabaseAdmin
      .from('prompt_packages')
      .update({
        name: rawFormData.name,
        description: rawFormData.description,
        category: rawFormData.category,
        // --- HIER das geparste Array einfügen ---
        prompt_variants: generationVariantsData,
      })
      .eq('id', rawFormData.packageId);

    if (updateError) {
      console.error("DB Update Fehler:", updateError);
      return { success: false, message: `Datenbankfehler beim Aktualisieren: ${updateError.message}` };
    }

    // 6. Cache neu validieren (korrekt)
    revalidatePath('/admin/prompts');
    revalidatePath(`/admin/prompts/edit/${rawFormData.packageId}`);
    // Optional: revalidatePath(`/prompt/${slug}`); // Slug ist hier nicht direkt verfügbar

    // 7. Erfolgsmeldung (korrekt)
    console.log(`Paket ${rawFormData.packageId} erfolgreich aktualisiert.`);
    return { success: true, message: 'Prompt-Paket erfolgreich aktualisiert!' };

  } catch (configError) { // Fange Fehler von getSupabaseAdminClient ab
      console.error("Admin Config Error in updatePromptPackage:", configError.message);
      return { success: false, message: configError.message };
  }
}
