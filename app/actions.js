// app/actions.js
'use server';

// ======= Imports =======
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation'; // Wird für Logout benötigt
import { headers, cookies } from 'next/headers';
import Stripe from 'stripe';

// ======= Funktion: updatePassword =======
export async function updatePassword(newPassword) {
  const supabase = createClient();

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

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Supabase Update Password Error:', error.message);
    // Gib eine allgemeinere Fehlermeldung zurück, um keine Details preiszugeben
    return { success: false, error: 'Passwort konnte nicht geändert werden. Bitte versuche es erneut.' };
  }

  console.log("Passwort erfolgreich geändert für User:", user.email);
  // Optional: Flag zurücksetzen, falls es nach dem Update noch gesetzt ist
  if (user.user_metadata?.needs_password_setup) {
      console.log("Entferne needs_password_setup Flag für User:", user.email);
      await supabase.auth.updateUser({ data: { needs_password_setup: false } });
  }

  return { success: true, error: null };
}

// ======= Funktion: login =======
export async function login(formData) {
  const email = formData.get('email');
  const password = formData.get('password');
  const supabase = createClient();

  // Validierung der Eingaben
  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return { success: false, message: 'Ungültige E-Mail oder Passwort.' };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error('Login Action Error:', signInError);
    // Unterscheide zwischen ungültigen Anmeldedaten und anderen Fehlern
    if (signInError.message.includes('Invalid login credentials')) {
        return { success: false, message: 'Ungültige E-Mail oder Passwort.' };
    }
    return { success: false, message: 'Login fehlgeschlagen. Bitte versuche es erneut.' };
  }

    // Nutzerdaten nach erfolgreichem Login holen
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();

     if (getUserError || !user) {
       console.error('Error getting user after login:', getUserError);
       // Fallback zur Startseite, falls Nutzerdaten nicht geladen werden können
       return { success: true, redirectTo: '/' };
     }

     // Prüfen, ob Passwort festgelegt werden muss (nach Invite)
     if (user.user_metadata?.needs_password_setup === true) {
         console.log('User needs password setup, redirecting to /passwort-festlegen');
         return { success: true, redirectTo: '/passwort-festlegen' };
     }

     // Prüfen, ob Admin
     if (process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL) {
       console.log('Admin login detected, redirecting to /admin/prompts');
       return { success: true, redirectTo: '/admin/prompts' };
     } else {
       console.log('Regular user login detected, redirecting to /meine-prompts');
       // Standard-Weiterleitung für normale Nutzer
       return { success: true, redirectTo: '/meine-prompts' };
     }
}

// ======= Funktion: createCheckoutSession =======
export async function createCheckoutSession(priceId, promptPackageId) {
    // Prüfen, ob IDs übergeben wurden
    if (!priceId) {
      console.error("Server Action 'createCheckoutSession': Keine Price ID übergeben.");
      return JSON.stringify({ error: "Produktinformation fehlt (Preis)." });
    }
    if (!promptPackageId) {
      console.error("Server Action 'createCheckoutSession': Keine promptPackageId übergeben.");
      return JSON.stringify({ error: "Produkt-Identifikation fehlt." });
    }
    console.log(`Server Action 'createCheckoutSession': Erstelle Checkout für Price ID: ${priceId}, Paket ID: ${promptPackageId}`);

    // Supabase Server Client initialisieren
    const supabase = createClient();

    // Nutzerstatus holen
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        console.log("Server Action 'createCheckoutSession': Nutzer ist eingeloggt:", user.email);
    } else {
        console.log("Server Action 'createCheckoutSession': Nutzer ist NICHT eingeloggt (Gast-Checkout).");
    }

    // Stripe initialisieren
    if (!process.env.STRIPE_SECRET_KEY) {
        console.error("Server Action 'createCheckoutSession': STRIPE_SECRET_KEY fehlt in .env.local");
        return JSON.stringify({ error: "Server-Konfigurationsfehler." });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Success/Cancel URLs definieren
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const successUrl = `${siteUrl}/kauf-erfolgreich?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}/`; // Zurück zur Startseite bei Abbruch

    try {
      console.log("Server Action 'createCheckoutSession': Versuche Stripe Session zu erstellen...");

      // Stripe Checkout Session erstellen
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        // Kunden-E-Mail hinzufügen (wenn bekannt)
        ...(user ? { customer_email: user.email } : {}),
        // Angepasste Metadaten
        metadata: {
          // Füge die userId NUR hinzu, wenn der Nutzer eingeloggt ist.
          ...(user ? { userId: user.id } : {}),
          // Die promptPackageId wird IMMER hinzugefügt.
          promptPackageId: promptPackageId
        }
      });

      console.log("Server Action 'createCheckoutSession': Stripe Session erstellt, ID:", session.id);

      // Session ID zurückgeben
      return JSON.stringify({ sessionId: session.id });

    } catch (error) {
      // Fehler beim Erstellen der Stripe Session abfangen
      console.error("Server Action 'createCheckoutSession': Fehler beim Erstellen der Stripe Session:", error);
      return JSON.stringify({ error: `Fehler beim Starten des Bezahlvorgangs: ${error.message}` });
    }
}

// ======= Funktion: logout =======
export async function logout() {
  const supabase = createClient();
  console.log('Logout Action wird ausgeführt...');
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Logout Action Error:', error);
    // Trotz Fehler versuchen umzuleiten
  } else {
    console.log('Logout erfolgreich.');
  }

  // Nach dem Logout immer zur Login-Seite umleiten
  // revalidatePath('/') // Optional: Cache der Startseite neu validieren
  return redirect('/login');
}

// ======= Admin Actions (aus app/admin/prompts/actions.js integriert) =======

// Funktion zum Laden der Daten für die Admin-Prompt-Seite
export async function getAdminPageData() {
  const supabaseUserClient = createClient(); // Für Auth Check

  // 1. User holen und Admin-Status prüfen
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

  // 2. Prompts laden (mit Admin Client - Service Key nötig!)
  // Stelle sicher, dass der Admin Client korrekt initialisiert wird
  const supabaseAdmin = new Stripe(process.env.SUPABASE_SERVICE_ROLE_KEY) // Annahme: Admin Client wird hier benötigt, ggf. anpassen
    ? createClient() // Fallback oder spezifische Admin-Client-Initialisierung
    : createClient(); // Standard-Client, falls kein Service Key verfügbar/nötig

  const { data: prompts, error: promptsError } = await supabaseAdmin // Verwende den korrekten Client
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


// Funktion zum Hinzufügen eines neuen Prompt-Pakets
export async function addPromptPackage(formData) {
  const supabaseUserClient = createClient();

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
    variantsJson: formData.get('variantsJson'),
  };

  // 3. Grundlegende Validierung
  if (!rawFormData.name || !rawFormData.slug || !rawFormData.variantsJson || !rawFormData.category) {
    return { success: false, message: 'Bitte alle Pflichtfelder ausfüllen (Name, Slug, Kategorie, Varianten JSON).' };
  }

  // 4. JSON Validierung und Strukturprüfung
  let variantsData;
  try {
    variantsData = JSON.parse(rawFormData.variantsJson);
    if (!Array.isArray(variantsData)) throw new Error('JSON ist kein Array.');
    if (variantsData.length !== 5) throw new Error(`JSON muss genau 5 Varianten enthalten, enthält aber ${variantsData.length}.`);
    variantsData.forEach((variant, index) => {
      if (!variant || typeof variant !== 'object') {
        throw new Error(`Variante ${index + 1} ist kein gültiges Objekt.`);
      }
      if (!variant.title || !variant.description || !variant.template) {
        throw new Error(`Variante ${index + 1} fehlen benötigte Felder (title, description, template).`);
      }
    });
  } catch (e) {
    console.error("JSON Validierungsfehler:", e.message);
    return { success: false, message: `Fehler im Varianten JSON: ${e.message}` };
  }

  // 5. In Datenbank einfügen (mit Admin Client - Service Key nötig!)
  // Stelle sicher, dass der Admin Client korrekt initialisiert wird
  const supabaseAdmin = new Stripe(process.env.SUPABASE_SERVICE_ROLE_KEY) // Annahme: Admin Client wird hier benötigt, ggf. anpassen
    ? createClient() // Fallback oder spezifische Admin-Client-Initialisierung
    : createClient(); // Standard-Client, falls kein Service Key verfügbar/nötig

  const { error: insertError } = await supabaseAdmin // Verwende den korrekten Client
    .from('prompt_packages')
    .insert({
      name: rawFormData.name,
      slug: rawFormData.slug.toLowerCase().replace(/\s+/g, '-'),
      description: rawFormData.description,
      category: rawFormData.category,
      prompt_variants: variantsData,
    });

  if (insertError) {
    console.error("DB Insert Fehler:", insertError);
    if (insertError.code === '23505' && insertError.message.includes('slug')) {
         return { success: false, message: `Fehler: Der Slug '${rawFormData.slug}' existiert bereits.` };
    }
    return { success: false, message: `Datenbankfehler: ${insertError.message}` };
  }

  // 6. Cache neu validieren
  revalidatePath('/admin/prompts');
  revalidatePath('/pakete'); // Auch die öffentliche Paketseite
  revalidatePath('/kategorien'); // Und die Kategorieseite

  // 7. Erfolgsmeldung
  return { success: true, message: 'Prompt-Paket erfolgreich erstellt!' };
}

// Funktion zum Löschen eines Prompt-Pakets
export async function deletePromptPackage(packageId) { // Akzeptiert ID direkt
  const supabaseUserClient = createClient();

  // 1. Admin-Prüfung
  const { data: { user } } = await supabaseUserClient.auth.getUser();
  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    console.error("Nicht-Admin versuchte, Prompt zu löschen.");
    return { success: false, error: 'Nicht autorisiert.' }; // Geändert zu 'error'
  }

  // 2. ID Validierung
  if (!packageId) {
    return { success: false, error: 'Fehlende Paket-ID zum Löschen.' }; // Geändert zu 'error'
  }

  console.log(`Admin ${user.email} versucht Paket mit ID ${packageId} zu löschen.`);

  // 3. Aus Datenbank löschen (mit Admin Client - Service Key nötig!)
  // Stelle sicher, dass der Admin Client korrekt initialisiert wird
  const supabaseAdmin = new Stripe(process.env.SUPABASE_SERVICE_ROLE_KEY) // Annahme: Admin Client wird hier benötigt, ggf. anpassen
    ? createClient() // Fallback oder spezifische Admin-Client-Initialisierung
    : createClient(); // Standard-Client, falls kein Service Key verfügbar/nötig

  const { error: deleteError } = await supabaseAdmin // Verwende den korrekten Client
    .from('prompt_packages')
    .delete()
    .eq('id', packageId);

  if (deleteError) {
    console.error("DB Delete Fehler:", deleteError);
    return { success: false, error: `Datenbankfehler beim Löschen: ${deleteError.message}` }; // Geändert zu 'error'
  }

  // 4. Cache neu validieren
  revalidatePath('/admin/prompts');
  revalidatePath('/pakete');
  revalidatePath('/kategorien');

  // 5. Erfolg zurückgeben
  console.log(`Paket ${packageId} erfolgreich gelöscht.`);
  return { success: true }; // Keine Nachricht nötig, Fehlerobjekt reicht
}


// Funktion zum Aktualisieren eines Prompt-Pakets
export async function updatePromptPackage(formData) {
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
  let variantsData;
  try {
    variantsData = JSON.parse(rawFormData.variantsJson);
    if (!Array.isArray(variantsData)) throw new Error('JSON ist kein Array.');
    if (variantsData.length !== 5) throw new Error(`JSON muss genau 5 Varianten enthalten, enthält aber ${variantsData.length}.`);
    variantsData.forEach((variant, index) => {
      if (!variant || typeof variant !== 'object') {
        throw new Error(`Variante ${index + 1} ist kein gültiges Objekt.`);
      }
      if (!variant.title || !variant.description || !variant.template) {
        throw new Error(`Variante ${index + 1} fehlen benötigte Felder (title, description, template).`);
      }
    });
  } catch (e) {
    console.error("JSON Validierungsfehler beim Update:", e.message);
    return { success: false, message: `Fehler im Varianten JSON: ${e.message}` };
  }

  // 5. In Datenbank aktualisieren (mit Admin Client - Service Key nötig!)
  // Stelle sicher, dass der Admin Client korrekt initialisiert wird
  const supabaseAdmin = new Stripe(process.env.SUPABASE_SERVICE_ROLE_KEY) // Annahme: Admin Client wird hier benötigt, ggf. anpassen
    ? createClient() // Fallback oder spezifische Admin-Client-Initialisierung
    : createClient(); // Standard-Client, falls kein Service Key verfügbar/nötig

  console.log(`Aktualisiere Paket mit ID: ${rawFormData.packageId}`);
  const { error: updateError } = await supabaseAdmin // Verwende den korrekten Client
    .from('prompt_packages')
    .update({
      name: rawFormData.name,
      description: rawFormData.description,
      category: rawFormData.category,
      prompt_variants: variantsData,
    })
    .eq('id', rawFormData.packageId);

  if (updateError) {
    console.error("DB Update Fehler:", updateError);
    return { success: false, message: `Datenbankfehler beim Aktualisieren: ${updateError.message}` };
  }

  // 6. Cache neu validieren
  revalidatePath('/admin/prompts');
  revalidatePath(`/admin/prompts/edit/${rawFormData.packageId}`);
  // Optional: revalidatePath(`/prompt/${slug}`); // Slug ist hier nicht verfügbar, müsste extra geladen werden

  // 7. Erfolgsmeldung
  console.log(`Paket ${rawFormData.packageId} erfolgreich aktualisiert.`);
  return { success: true, message: 'Prompt-Paket erfolgreich aktualisiert!' };
}
