// app/api/stripe/webhook/route.js

import Stripe from 'stripe';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// 1) Deaktiviere das automatische Body‑Parsing, damit wir den Raw‑Body nutzen können
export const config = {
  api: {
    bodyParser: false,
  },
};

// 2) Stripe initialisieren
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15', // Oder deine verwendete Version
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req) {
  // 3) Raw Body & Signature lesen
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    console.warn('[Webhook] Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  // 4) Event validieren
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log(`[Webhook] Stripe Event received: ${event.type}`);
  } catch (err) {
    console.error('❌ Stripe Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  // 5) Nur auf checkout.session.completed reagieren
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details?.email;
    const promptPackageId = session.metadata?.promptPackageId;
    const stripeSessionId = session.id;
    const purchasedAt = new Date(session.created * 1000);

    if (!email || !promptPackageId) {
      console.error(
        `[Webhook] Stripe - Ungültige Session-Daten für ${stripeSessionId}:`,
        { email, promptPackageId }
      );
      return NextResponse.json(
        { error: 'Invalid session payload' },
        { status: 400 }
      );
    }

    console.log(`[Webhook] Stripe - Verarbeite Kauf: SessionID=${stripeSessionId}, Email=${email}, PackageID=${promptPackageId}`);

    try {
      const supabaseAdmin = createAdminClient();

      // 5a) Nutzer finden oder erstellen/einladen (Logik bleibt gleich)
      let userId;
      let userJustInvited = false; // Flag für spätere Aktionen (z.B. E-Mail)

      console.log(`[Webhook] Stripe - Suche Nutzer ${email} via Admin API...`);
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

      if (listError) {
           console.error(`[Webhook] Stripe - Fehler beim Auflisten der Nutzer:`, listError);
           throw new Error(`Fehler beim Auflisten der Nutzer: ${listError.message}`);
      }

      const existingUser = listData?.users.find((u) => u.email === email);

      if (existingUser) {
          userId = existingUser.id;
          console.log(`[Webhook] Stripe - Nutzer ${email} über listUsers gefunden mit ID: ${userId}`);
      } else {
          console.log(`[Webhook] Stripe - Nutzer ${email} nicht gefunden. Lade ein...`);
          try {
              // Wichtig: Keine Redirect URL hier, da der Nutzer den Link per Mail bekommt
              const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {});

              if (inviteError) {
                  if (inviteError.message.includes('User already registered')) {
                       console.warn(`[Webhook] Stripe - Invite fehlgeschlagen für ${email}, Nutzer existiert bereits (laut Fehler). Versuche erneut zu finden...`);
                       const { data: listDataRetry, error: listRetryError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
                       if (listRetryError) throw new Error('Fehler beim erneuten Auflisten der Nutzer nach Invite-Fehler.');
                       const userRetry = listDataRetry.users.find((u) => u.email === email);
                       if (!userRetry) throw new Error('Nutzer existiert laut Fehler, konnte aber auch nach erneutem Suchen nicht gefunden werden.');
                       userId = userRetry.id;
                       console.log(`[Webhook] Stripe - Nutzer ${email} nach erneutem Suchen gefunden mit ID: ${userId}`);
                  } else {
                      throw inviteError;
                  }
              } else if (!inviteData?.user?.id) {
                  throw new Error('Einladung erfolgreich, aber keine User-ID in der Antwort.');
              } else {
                  userId = inviteData.user.id;
                  userJustInvited = true;
                  console.log(`[Webhook] Stripe - Nutzer ${email} eingeladen mit ID: ${userId}`);
                  // Flag für Passwort-Setup wird von Supabase bei Invite automatisch gesetzt
              }
          } catch (inviteError) {
              console.error(`[Webhook] Stripe - Fehler beim Einladen von ${email}:`, inviteError);
              throw new Error(`Fehler beim Einladen des Nutzers: ${inviteError.message}`);
          }
      }


      // 5c) Kauf in DB eintragen (Angepasst)
      if (userId) {
        const { error: insertError } = await supabaseAdmin
          .from('user_purchases')
          .insert({
            user_id: userId,
            prompt_package_id: promptPackageId, // Spaltenname prüfen!
            stripe_checkout_session_id: stripeSessionId,
            purchased_at: purchasedAt.toISOString(), // Sicherstellen, dass es ISO String ist
            // --- HINZUGEFÜGT ---
            payment_provider: 'stripe',
            transaction_id: null // Setze PayPal Order ID auf null
            // --- ENDE HINZUGEFÜGT ---
          });

        if (insertError) {
          if (insertError.code === '23505') { // Eindeutigkeitsverletzung
            console.warn(
              `[Webhook] Stripe - Kauf für Session ${stripeSessionId} wurde bereits verarbeitet.`
            );
            // Trotzdem 200 OK senden
            return NextResponse.json({ received: true, status: 'already_processed' });
          } else {
            console.error(
              `[Webhook] Stripe - Fehler beim Speichern des Kaufs für User ${userId}, Session ${stripeSessionId}:`,
              insertError
            );
            throw new Error(`Fehler beim Speichern des Kaufs: ${insertError.message}`);
          }
        } else {
          console.log(
            `[Webhook] Stripe - Kauf erfolgreich gespeichert für User ${userId}, Paket ${promptPackageId}, Session ${stripeSessionId}`
          );
          // Hier könnte man ggf. noch die Willkommens-E-Mail triggern, falls userJustInvited true ist
        }
      } else {
         // Sollte eigentlich nicht passieren, wenn die Logik oben stimmt
         console.error(`[Webhook] Stripe - Keine User ID gefunden oder erstellt für ${email}. Kauf kann nicht gespeichert werden.`);
         throw new Error(`Konnte keine User ID für ${email} ermitteln.`);
      }

    } catch (err) {
      console.error('[Webhook] Stripe - Fehler bei der Verarbeitung von checkout.session.completed:', err);
      // Bei internen Fehlern 500 senden, damit Stripe es ggf. erneut versucht
      return NextResponse.json(
        { error: `Webhook processing error: ${err.message}` },
        { status: 500 }
      );
    }
  } else {
    console.log(`[Webhook] Stripe - Ignoriere Event-Typ: ${event.type}`);
  }

  // 6) Immer 200 OK an Stripe senden, wenn kein interner Fehler auftrat
  return NextResponse.json({ received: true });
}
