// app/actions.js
'use server';

// ======= Imports =======
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation'; // Wird hier nicht mehr direkt verwendet, aber kann bleiben
import { headers, cookies } from 'next/headers';
import Stripe from 'stripe';

// ======= Bestehende Funktion: updatePassword =======
export async function updatePassword(newPassword) {
  const supabase = createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Update Password Error: User not authenticated');
    return { success: false, error: 'Authentifizierung fehlgeschlagen. Bitte neu einloggen.' };
  }

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Supabase Update Password Error:', error.message);
    return { success: false, error: 'Passwort konnte nicht geändert werden. Grund: ' + error.message };
  }

  console.log("Passwort erfolgreich geändert für User:", user.email);
  return { success: true, error: null };
}

// ======= Bestehende Funktion: login =======
export async function login(formData) {
  const email = formData.get('email');
  const password = formData.get('password');
  const supabase = createClient();

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error('Login Action Error:', signInError);
    return { success: false, message: 'Login fehlgeschlagen: ' + signInError.message };
  }

    // Redirect logic after login remains the same for now
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();

     if (getUserError || !user) {
       console.error('Error getting user after login:', getUserError);
       return { success: true, redirectTo: '/' }; // Fallback to homepage
     }

     if (process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL) {
       console.log('Admin login detected, redirecting to /admin/prompts');
       return { success: true, redirectTo: '/admin/prompts' };
     } else {
       console.log('Regular user login detected, redirecting to /');
       // Consider redirecting logged-in users to /meine-prompts
       return { success: true, redirectTo: '/meine-prompts' }; // Geändert auf Dashboard als Standardziel
     }
}

// ======= ***ANGEPASSTE*** Funktion: createCheckoutSession =======
export async function createCheckoutSession(priceId, promptPackageId) {
    // Prüfen, ob IDs übergeben wurden (bleibt gleich)
    if (!priceId) {
      console.error("Server Action 'createCheckoutSession': Keine Price ID übergeben.");
      return JSON.stringify({ error: "Produktinformation fehlt (Preis)." });
    }
    if (!promptPackageId) {
      console.error("Server Action 'createCheckoutSession': Keine promptPackageId übergeben.");
      return JSON.stringify({ error: "Produkt-Identifikation fehlt." });
    }
    console.log(`Server Action 'createCheckoutSession': Erstelle Checkout für Price ID: ${priceId}, Paket ID: ${promptPackageId}`);

    // Supabase Server Client initialisieren (bleibt gleich)
    const supabase = createClient();

    // 1. Nutzerstatus holen (OPTIONAL, KEIN REDIRECT mehr!)
    const { data: { user } } = await supabase.auth.getUser(); // Fehler ignorieren, user kann null sein

    if (user) {
        console.log("Server Action 'createCheckoutSession': Nutzer ist eingeloggt:", user.email);
    } else {
        console.log("Server Action 'createCheckoutSession': Nutzer ist NICHT eingeloggt (Gast-Checkout).");
    }

    // 2. Stripe initialisieren (bleibt gleich)
    if (!process.env.STRIPE_SECRET_KEY) {
        console.error("Server Action 'createCheckoutSession': STRIPE_SECRET_KEY fehlt in .env.local");
        return JSON.stringify({ error: "Server-Konfigurationsfehler." });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // 3. Success/Cancel URLs definieren (bleibt gleich)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const successUrl = `${siteUrl}/kauf-erfolgreich?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${siteUrl}/`; // Ggf. auf eine spezifische Abbruch-Seite ändern?

    try {
      console.log("Server Action 'createCheckoutSession': Versuche Stripe Session zu erstellen...");

      // 4. Stripe Checkout Session erstellen (Logik angepasst)
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
        // === NEU: Kunden-E-Mail Hinzufügen (wenn bekannt) ===
        // Wenn der Nutzer eingeloggt ist, übergeben wir seine E-Mail an Stripe.
        // Stripe kann dies nutzen, um das Feld vorab auszufüllen oder einen bestehenden Stripe-Kunden zu finden.
        // Wenn der Nutzer NICHT eingeloggt ist (user ist null), übergeben wir nichts -
        // Stripe Checkout wird dann selbst nach der E-Mail fragen.
        ...(user ? { customer_email: user.email } : {}),

        // === NEU: Angepasste METADATEN ===
        metadata: {
          // Füge die userId NUR hinzu, wenn der Nutzer eingeloggt ist.
          // Der Webhook wird diese Information nutzen, falls vorhanden.
          ...(user ? { userId: user.id } : {}),
          // Die promptPackageId wird IMMER hinzugefügt, da der Webhook sie braucht.
          promptPackageId: promptPackageId
        }
        // === Ende angepasste Metadaten ===
      }); // Ende des stripe.checkout.sessions.create Aufrufs

      console.log("Server Action 'createCheckoutSession': Stripe Session erstellt, ID:", session.id);

      // 5. Session ID zurückgeben (bleibt gleich)
      return JSON.stringify({ sessionId: session.id });

    } catch (error) {
      // Fehler beim Erstellen der Stripe Session abfangen (bleibt gleich)
      console.error("Server Action 'createCheckoutSession': Fehler beim Erstellen der Stripe Session:", error);
      return JSON.stringify({ error: `Fehler beim Starten des Bezahlvorgangs: ${error.message}` });
    }
} // Ende der createCheckoutSession Funktion