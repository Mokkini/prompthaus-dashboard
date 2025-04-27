// app/(public)/checkout/actions.js
'use server';

// ======= Imports =======
import { createClient } from '@/lib/supabase/server'; // Für User-Client (Auth-Check)
import Stripe from 'stripe'; // Für Stripe-Operationen

// ======= Funktion: createCheckoutSession =======
export async function createCheckoutSession(priceId, promptPackageId) {
    if (!priceId) {
      console.error("Server Action 'createCheckoutSession': Keine Price ID übergeben.");
      return JSON.stringify({ error: "Produktinformation fehlt (Preis)." });
    }
    if (!promptPackageId) {
      console.error("Server Action 'createCheckoutSession': Keine promptPackageId übergeben.");
      return JSON.stringify({ error: "Produkt-Identifikation fehlt." });
    }
    console.log(`Server Action 'createCheckoutSession': Erstelle Checkout für Price ID: ${priceId}, Paket ID: ${promptPackageId}`);

    const supabase = createClient(); // User-Client für Auth-Check
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
    const cancelUrl = `${siteUrl}/`; // Zurück zur Startseite bei Abbruch

    try {
      console.log("Server Action 'createCheckoutSession': Versuche Stripe Session zu erstellen...");
      const session = await stripe.checkout.sessions.create({
        line_items: [ { price: priceId, quantity: 1 } ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        // --- NEU: Zahlungsmethoden explizit definieren ---
        payment_method_types: ['card', 'klarna', 'giropay', 'sofort', 'paypal'], // <-- Passe diese Liste nach Bedarf an!
        // -------------------------------------------------
        // Füge E-Mail hinzu, wenn User eingeloggt ist
        ...(user ? { customer_email: user.email } : {}),
        // Füge Metadaten hinzu (User ID nur wenn eingeloggt)
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
