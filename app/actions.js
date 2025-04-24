// app/actions.js - Angepasst für separate Variantentabelle

'use server';

// ======= Imports =======
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import Stripe from 'stripe';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';

// ======= HILFSFUNKTION: Korrekte Admin Client Initialisierung =======
function getSupabaseAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
        console.error("Supabase URL oder Service Key fehlt für Admin Operation!");
        throw new Error('Server-Konfigurationsfehler für Admin-Operationen.');
    }
    return createSupabaseAdminClient(supabaseUrl, serviceKey);
}
// ======= ENDE HILFSFUNKTION =======


// ======= Funktion: updatePassword =======
export async function updatePassword(newPassword) {
  // ... (Code bleibt unverändert) ...
  const supabase = createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Update Password Error: User not authenticated');
    return { success: false, error: 'Authentifizierung fehlgeschlagen. Bitte neu einloggen.' };
  }

  if (!newPassword || newPassword.length < 6) {
      console.error('Update Password Error: Password too short for user:', user.email);
      return { success: false, error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' };
  }

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Supabase Update Password Error:', error.message);
    return { success: false, error: 'Passwort konnte nicht geändert werden. Bitte versuche es erneut.' };
  }

  console.log("Passwort erfolgreich geändert für User:", user.email);
  if (user.user_metadata?.needs_password_setup) {
      console.log("Entferne needs_password_setup Flag für User:", user.email);
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
  const supabase = createClient();

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return { success: false, message: 'Ungültige E-Mail oder Passwort.' };
  }

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

    const { data: { user }, error: getUserError } = await supabase.auth.getUser();

     if (getUserError || !user) {
       console.error('Error getting user after login:', getUserError);
       return { success: true, redirectTo: '/' }; // Fallback
     }

     if (user.user_metadata?.needs_password_setup === true) {
         console.log('User needs password setup, redirecting to /passwort-festlegen');
         return { success: true, redirectTo: '/passwort-festlegen' };
     }

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

    const supabase = createClient();
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
  const supabase = createClient();
  console.log('Logout Action wird ausgeführt...');
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Logout Action Error:', error);
  } else {
    console.log('Logout erfolgreich.');
  }
  return redirect('/login');
}

// ======= Admin Actions =======

// Funktion zum Laden der Daten für die Admin-Prompt-Seite
export async function getAdminPageData() {
  // ... (Code bleibt unverändert) ...
  const supabaseUserClient = createClient();

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

  try {
    const supabaseAdmin = getSupabaseAdminClient();

    const { data: prompts, error: promptsError } = await supabaseAdmin
      .from('prompt_packages')
      .select('id, slug, name, category')
      .order('category', { ascending: true, nullsFirst: false })
      .order('name', { ascending: true });

    if (promptsError) {
      console.error("Fehler beim Laden der Prompt-Pakete für Admin:", promptsError);
      return { success: false, error: `Fehler beim Laden der Prompts: ${promptsError.message}`, user: user, prompts: [] };
    }

    return { success: true, user: user, prompts: prompts || [], error: null };

  } catch (configError) {
      console.error("Admin Config Error in getAdminPageData:", configError.message);
      return { success: false, error: configError.message, user: user, prompts: [] };
  }
}


// Funktion zum Hinzufügen eines neuen Prompt-Pakets (WIRD NICHT MEHR VERWENDET)
export async function addPromptPackage(formData) {
  console.warn("DEPRECATED: addPromptPackage wurde aufgerufen, bitte createProductWithStripe verwenden.");
  return { success: false, message: "Diese Funktion ist veraltet." };
}

// --- NEUE FUNKTION: createProductWithStripe (ANGEPASST für separate Varianten) ---
export async function createProductWithStripe(formData) {
  'use server';

  console.log("Server Action 'createProductWithStripe' gestartet.");
  const supabaseUserClient = createClient();

  // 1. Admin-Prüfung
  const { data: { user }, error: userError } = await supabaseUserClient.auth.getUser();
  if (userError || !user || user.email !== process.env.ADMIN_EMAIL) {
    console.error("Nicht-Admin versuchte, Produkt mit Stripe zu erstellen.");
    return { success: false, message: 'Nicht autorisiert.' };
  }
  console.log(`Admin ${user.email} führt 'createProductWithStripe' aus.`);

  // 2. Stripe Client initialisieren
  if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Server Action 'createProductWithStripe': STRIPE_SECRET_KEY fehlt in .env.local");
      return { success: false, message: "Server-Konfigurationsfehler (Stripe)." };
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  // 3. Supabase Admin Client initialisieren
  let supabaseAdmin;
  try {
      supabaseAdmin = getSupabaseAdminClient();
  } catch (configError) {
      console.error("Admin Config Error in createProductWithStripe:", configError.message);
      return { success: false, message: configError.message };
  }

  // 4. Formulardaten extrahieren
  const rawFormData = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description'),
    category: formData.get('category'),
    priceString: formData.get('price'),
    variantsJson: formData.get('variantsJson'),
  };
  console.log("Empfangene Formulardaten:", rawFormData);

  // 5. Grundlegende Validierung
  if (!rawFormData.name || !rawFormData.slug || !rawFormData.category || !rawFormData.priceString || !rawFormData.variantsJson) {
    return { success: false, message: 'Bitte alle Pflichtfelder ausfüllen (Name, Slug, Kategorie, Preis, Varianten JSON).' };
  }

  // Preis validieren und in Cent umwandeln
  const priceFloat = parseFloat(rawFormData.priceString.replace(',', '.'));
  if (isNaN(priceFloat) || priceFloat <= 0) {
      return { success: false, message: 'Ungültiger Preis. Bitte gib eine positive Zahl ein (z.B. 9.99).' };
  }
  const priceInCent = Math.round(priceFloat * 100);

  // 6. JSON Validierung
  let generationVariantsData;
  try {
    const parsedJson = JSON.parse(rawFormData.variantsJson);
    if (typeof parsedJson !== 'object' || parsedJson === null || !Array.isArray(parsedJson.generation_variants)) {
        throw new Error("JSON muss ein Objekt mit einem 'generation_variants' Array sein.");
    }
    generationVariantsData = parsedJson.generation_variants;

    // Prüfe jede Variante
    generationVariantsData.forEach((variant, index) => {
      if (!variant || typeof variant !== 'object') throw new Error(`Variante ${index + 1} ist kein gültiges Objekt.`);
      if (!variant.id || typeof variant.id !== 'string') throw new Error(`Variante ${index + 1}: Fehlende oder ungültige 'id'.`);
      if (!variant.title || typeof variant.title !== 'string') throw new Error(`Variante ${index + 1}: Fehlende oder ungültige 'title'.`);
      if (!variant.description || typeof variant.description !== 'string') throw new Error(`Variante ${index + 1}: Fehlende oder ungültige 'description'.`);
      if (!variant.context || typeof variant.context !== 'object') throw new Error(`Variante ${index + 1}: Fehlendes oder ungültiges 'context' Objekt.`);
      if (!variant.semantic_data || typeof variant.semantic_data !== 'object') throw new Error(`Variante ${index + 1}: Fehlendes oder ungültiges 'semantic_data' Objekt.`);
      if (!variant.writing_instructions || typeof variant.writing_instructions !== 'object') throw new Error(`Variante ${index + 1}: Fehlendes oder ungültiges 'writing_instructions' Objekt.`);
    });
  } catch (e) {
    console.error("JSON Validierungsfehler:", e.message);
    return { success: false, message: `Fehler im Varianten JSON: ${e.message}` };
  }

  // 7. Hauptlogik im try...catch Block
  let stripeProduct;
  let stripePrice;
  let newPackageId; // Variable für die ID des neuen Pakets

  try {
    console.log("Beginne Stripe und Supabase Operationen...");

    // 7.1 Stripe Produkt erstellen
    console.log("Erstelle Stripe Produkt...");
    stripeProduct = await stripe.products.create({
      name: rawFormData.name,
      description: rawFormData.description,
      metadata: {
        supabase_slug: rawFormData.slug,
        category: rawFormData.category,
      }
    });
    console.log(`Stripe Produkt erstellt: ${stripeProduct.id}`);

    // 7.2 Stripe Preis erstellen
    console.log("Erstelle Stripe Preis...");
    stripePrice = await stripe.prices.create({
      product: stripeProduct.id,
      unit_amount: priceInCent,
      currency: 'eur',
    });
    console.log(`Stripe Preis erstellt: ${stripePrice.id}`);

    // --- 7.3 Supabase Paket erstellen (OHNE Varianten, aber mit .select()) ---
    console.log("Erstelle Supabase Paket-Eintrag...");
    const { data: newPackage, error: packageInsertError } = await supabaseAdmin
      .from('prompt_packages')
      .insert({
        name: rawFormData.name,
        slug: rawFormData.slug.toLowerCase().replace(/\s+/g, '-'),
        description: rawFormData.description,
        category: rawFormData.category,
        price: priceFloat,
        stripe_product_id: stripeProduct.id,
        stripe_price_id: stripePrice.id,
        // prompt_variants wird hier NICHT mehr eingefügt
      })
      .select('id') // Wähle die ID des neuen Eintrags aus
      .single(); // Erwarte nur einen Eintrag

    if (packageInsertError) {
      console.error("Supabase Paket Insert Fehler:", packageInsertError);
      if (packageInsertError.code === '23505' && packageInsertError.message.includes('slug')) {
         throw new Error(`Fehler: Der Slug '${rawFormData.slug}' existiert bereits.`);
      }
      throw new Error(`Datenbankfehler (Paket): ${packageInsertError.message}`);
    }
    if (!newPackage || !newPackage.id) {
        throw new Error("Konnte die ID des neu erstellten Pakets nicht abrufen.");
    }
    newPackageId = newPackage.id; // Speichere die neue Paket-ID
    console.log(`Supabase Paket erfolgreich erstellt mit ID: ${newPackageId}`);

    // --- 7.4 Supabase Varianten erstellen (separater Insert) ---
    console.log(`Erstelle ${generationVariantsData.length} Varianten-Einträge für Paket ${newPackageId}...`);
    const variantsToInsert = generationVariantsData.map(variant => ({
        package_id: newPackageId, // Füge die Paket-ID hinzu
        variant_id: variant.id, // Die ID aus dem JSON wird zu variant_id
        title: variant.title, // Titel hinzufügen (falls noch nicht vorhanden)
        description: variant.description,
        context: variant.context,
        semantic_data: variant.semantic_data,
        writing_instructions: variant.writing_instructions,
        // created_at und updated_at werden von Supabase automatisch gesetzt
    }));

    const { error: variantsInsertError } = await supabaseAdmin
        .from('prompt_variants') // Ziel-Tabelle ist jetzt 'prompt_variants'
        .insert(variantsToInsert);

    if (variantsInsertError) {
        console.error("Supabase Varianten Insert Fehler:", variantsInsertError);
        // Hier könnte man versuchen, das Paket und die Stripe-Objekte wieder zu löschen (Rollback)
        // Fürs Erste: Fehler werfen
        throw new Error(`Datenbankfehler (Varianten): ${variantsInsertError.message}`);
    }
    console.log(`Supabase Varianten erfolgreich erstellt für Paket ${newPackageId}.`);

    // 8. Cache Revalidierung
    console.log("Revalidiere Cache...");
    revalidatePath('/admin/prompts');
    revalidatePath('/pakete');
    revalidatePath('/kategorien');
    // Optional: revalidatePath(`/prompt/${rawFormData.slug}`);

    // 9. Erfolg zurückgeben
    return { success: true, message: 'Produkt und Varianten erfolgreich in Stripe und Supabase erstellt!' };

  } catch (error) {
    console.error("Fehler in 'createProductWithStripe':", error);
    // Rollback-Versuch (optional, komplex)
    // if (newPackageId) { /* Versuche Paket zu löschen */ }
    // if (stripeProduct) { /* Versuche Stripe Produkt zu archivieren */ }
    // if (stripePrice) { /* Versuche Stripe Preis zu archivieren */ }
    return { success: false, message: `Fehler: ${error.message}` };
  }
}
// --- ENDE NEUE FUNKTION ---


// Funktion zum Löschen eines Prompt-Pakets
export async function deletePromptPackage(packageId) {
  // --- WICHTIG: Muss jetzt auch die Varianten löschen! ---
  const supabaseUserClient = createClient();

  // 1. Admin-Prüfung
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    console.error("Nicht-Admin versuchte, Prompt zu löschen.");
    return { success: false, error: 'Aktion fehlgeschlagen: Kein Zugriff auf dieses Prompt-Paket.' };
  }

  // 2. ID Validierung
  if (!packageId) {
    return { success: false, error: 'Fehlende Paket-ID zum Löschen.' };
  }

  console.log(`Admin ${user.email} versucht Paket mit ID ${packageId} zu löschen.`);

  try {
    const supabaseAdmin = getSupabaseAdminClient();

    // --- Optional: Stripe Produkt/Preis archivieren (wie zuvor) ---
    const { data: packageData, error: fetchError } = await supabaseAdmin
        .from('prompt_packages')
        .select('stripe_product_id, stripe_price_id')
        .eq('id', packageId)
        .single();
    if (fetchError) {
        console.warn(`Konnte Stripe IDs für Paket ${packageId} vor dem Löschen nicht abrufen: ${fetchError.message}`);
    }

    // --- 3. ZUERST Varianten löschen (wegen Fremdschlüsselbeziehung) ---
    console.log(`Lösche Varianten für Paket ${packageId}...`);
    const { error: variantsDeleteError } = await supabaseAdmin
        .from('prompt_variants')
        .delete()
        .eq('package_id', packageId); // Lösche alle Varianten mit dieser package_id

    if (variantsDeleteError) {
        console.error("DB Varianten Delete Fehler:", variantsDeleteError);
        // Wenn Varianten nicht gelöscht werden können, das Paket auch nicht löschen!
        return { success: false, error: `Datenbankfehler beim Löschen der Varianten: ${variantsDeleteError.message}` };
    }
    console.log(`Varianten für Paket ${packageId} erfolgreich gelöscht.`);

    // --- 4. DANN das Paket selbst löschen ---
    console.log(`Lösche Paket ${packageId}...`);
    const { error: packageDeleteError } = await supabaseAdmin
      .from('prompt_packages')
      .delete()
      .eq('id', packageId);

    if (packageDeleteError) {
      console.error("DB Paket Delete Fehler:", packageDeleteError);
      // Hier könnten inkonsistente Daten entstehen (Varianten weg, Paket noch da)
      return { success: false, error: `Datenbankfehler beim Löschen des Pakets: ${packageDeleteError.message}` };
    }
    console.log(`Paket ${packageId} erfolgreich aus Supabase gelöscht.`);

    // --- 5. Stripe Objekte archivieren (wie zuvor) ---
    if (packageData?.stripe_product_id) {
        try {
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            console.log(`Archiviere Stripe Produkt ${packageData.stripe_product_id}...`);
            await stripe.products.update(packageData.stripe_product_id, { active: false });
            console.log(`Stripe Produkt ${packageData.stripe_product_id} archiviert.`);
        } catch (stripeError) {
            console.error(`Fehler beim Archivieren des Stripe Produkts ${packageData.stripe_product_id}:`, stripeError.message);
        }
    }

    // 6. Cache neu validieren
    revalidatePath('/admin/prompts');
    revalidatePath('/pakete');
    revalidatePath('/kategorien');

    // 7. Erfolg zurückgeben
    return { success: true };

  } catch (configError) {
      console.error("Admin Config Error in deletePromptPackage:", configError.message);
      return { success: false, error: configError.message };
  }
}


// Funktion zum Aktualisieren eines Prompt-Pakets
export async function updatePromptPackage(formData) {
  // --- WICHTIG: Muss jetzt auch die Varianten aktualisieren! ---
  // Das ist komplex: Alte löschen, neue einfügen? Oder einzeln updaten/inserten/löschen?
  // Einfachste Methode: Alte Varianten löschen, neue einfügen.

  const supabaseUserClient = createClient();

  // 1. Admin-Prüfung
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return { success: false, message: 'Nicht autorisiert.' };
  }

  // 2. Formulardaten extrahieren
  const rawFormData = {
    packageId: formData.get('packageId'),
    name: formData.get('name'),
    description: formData.get('description'),
    category: formData.get('category'),
    variantsJson: formData.get('variantsJson'),
  };

  // 3. Grundlegende Validierung
  if (!rawFormData.packageId || !rawFormData.name || !rawFormData.variantsJson || !rawFormData.category) {
    return { success: false, message: 'Fehlende Daten (Paket-ID, Name, Kategorie, Varianten JSON sind erforderlich).' };
  }

  // 4. JSON Validierung
  let generationVariantsData;
  try {
    const parsedJson = JSON.parse(rawFormData.variantsJson);
    if (typeof parsedJson !== 'object' || parsedJson === null || !Array.isArray(parsedJson.generation_variants)) {
        throw new Error("JSON muss ein Objekt mit einem 'generation_variants' Array sein.");
    }
    generationVariantsData = parsedJson.generation_variants;
    // Prüfe jede Variante... (wie oben)
    generationVariantsData.forEach((variant, index) => {
        if (!variant || typeof variant !== 'object') throw new Error(`Variante ${index + 1} ist kein gültiges Objekt.`);
        if (!variant.id || typeof variant.id !== 'string') throw new Error(`Variante ${index + 1}: Fehlende oder ungültige 'id'.`);
        // ... weitere Prüfungen ...
    });
  } catch (e) {
    console.error("JSON Validierungsfehler beim Update:", e.message);
    return { success: false, message: `Fehler im Varianten JSON: ${e.message}` };
  }

  // 5. Datenbankoperationen (Paket aktualisieren, Varianten ersetzen)
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    const packageId = rawFormData.packageId;

    // --- 5.1 Paketdaten aktualisieren ---
    console.log(`Aktualisiere Paketdaten für ID: ${packageId}`);
    const { error: packageUpdateError } = await supabaseAdmin
      .from('prompt_packages')
      .update({
        name: rawFormData.name,
        description: rawFormData.description,
        category: rawFormData.category,
        // Preis wird hier NICHT aktualisiert
      })
      .eq('id', packageId);

    if (packageUpdateError) {
      console.error("DB Paket Update Fehler:", packageUpdateError);
      return { success: false, message: `Datenbankfehler beim Aktualisieren des Pakets: ${packageUpdateError.message}` };
    }
    console.log(`Paketdaten für ${packageId} erfolgreich aktualisiert.`);

    // --- 5.2 Alte Varianten löschen ---
    console.log(`Lösche alte Varianten für Paket ${packageId}...`);
    const { error: variantsDeleteError } = await supabaseAdmin
        .from('prompt_variants')
        .delete()
        .eq('package_id', packageId);

    if (variantsDeleteError) {
        console.error("DB Alte Varianten Delete Fehler:", variantsDeleteError);
        // Das Paket wurde schon geändert, aber die Varianten nicht. Inkonsistenz!
        return { success: false, message: `Datenbankfehler beim Löschen alter Varianten: ${variantsDeleteError.message}. Paketdaten wurden aber geändert!` };
    }
    console.log(`Alte Varianten für Paket ${packageId} gelöscht.`);

    // --- 5.3 Neue Varianten einfügen ---
    console.log(`Füge neue Varianten für Paket ${packageId} ein...`);
    const variantsToInsert = generationVariantsData.map(variant => ({
        package_id: packageId,
        variant_id: variant.id,
        title: variant.title,
        description: variant.description,
        context: variant.context,
        semantic_data: variant.semantic_data,
        writing_instructions: variant.writing_instructions,
    }));

    const { error: variantsInsertError } = await supabaseAdmin
        .from('prompt_variants')
        .insert(variantsToInsert);

    if (variantsInsertError) {
        console.error("DB Neue Varianten Insert Fehler:", variantsInsertError);
        // Paket geändert, alte Varianten weg, neue konnten nicht eingefügt werden! Schlecht.
        return { success: false, message: `Datenbankfehler beim Einfügen neuer Varianten: ${variantsInsertError.message}. Paket hat jetzt keine Varianten!` };
    }
    console.log(`Neue Varianten für Paket ${packageId} erfolgreich eingefügt.`);

    // --- Optional: Stripe Produkt aktualisieren (Name/Beschreibung) (wie zuvor) ---
    try {
        const { data: packageData, error: fetchError } = await supabaseAdmin
            .from('prompt_packages')
            .select('stripe_product_id')
            .eq('id', packageId)
            .single();
        if (fetchError) throw fetchError;
        if (packageData?.stripe_product_id) {
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
            await stripe.products.update(packageData.stripe_product_id, {
                name: rawFormData.name,
                description: rawFormData.description,
            });
            console.log(`Stripe Produkt ${packageData.stripe_product_id} aktualisiert.`);
        }
    } catch (stripeUpdateError) {
        console.error(`Fehler beim Aktualisieren des Stripe Produkts für Paket ${packageId}:`, stripeUpdateError.message);
    }

    // 6. Cache neu validieren
    revalidatePath('/admin/prompts');
    revalidatePath(`/admin/prompts/edit/${packageId}`);
    revalidatePath('/pakete');
    revalidatePath('/kategorien');
    // Optional: revalidatePath(`/prompt/${slug}`); // Slug ist hier nicht direkt verfügbar

    // 7. Erfolgsmeldung
    return { success: true, message: 'Prompt-Paket und Varianten erfolgreich aktualisiert!' };

  } catch (configError) {
      console.error("Admin Config Error in updatePromptPackage:", configError.message);
      return { success: false, message: configError.message };
  }
}
