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
    console.warn('[Webhook] Stripe - Missing stripe-signature header');
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
    // Zeitstempel aus der Session nehmen (wann sie erstellt/abgeschlossen wurde)
    const purchasedAt = new Date(session.created * 1000); // 'created' ist oft der relevante Zeitstempel

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

      // --- Schritt 5a: Nutzer finden oder erstellen/einladen ---
      let userId;
      let userJustInvited = false;

      console.log(`[Webhook] Stripe - Suche Nutzer ${email} via Admin API...`);
      // TODO: Effizienz prüfen bei vielen Nutzern.
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

      if (listError) {
           console.error(`[Webhook] Stripe - Fehler beim Auflisten der Nutzer für Session ${stripeSessionId}:`, listError);
           throw new Error(`Fehler beim Auflisten der Nutzer: ${listError.message}`);
      }

      const existingUser = listData?.users.find((u) => u.email === email);

      if (existingUser) {
          userId = existingUser.id;
          console.log(`[Webhook] Stripe - Nutzer ${email} über listUsers gefunden mit ID: ${userId} (Session ${stripeSessionId})`);
      } else {
          console.log(`[Webhook] Stripe - Nutzer ${email} nicht gefunden für Session ${stripeSessionId}. Lade ein...`);
          try {
              const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {});

              if (inviteError) {
                  if (inviteError.message.includes('User already registered')) {
                       console.warn(`[Webhook] Stripe - Invite fehlgeschlagen für ${email} (Session ${stripeSessionId}), Nutzer existiert bereits (laut Fehler). Versuche erneut zu finden...`);
                       const { data: listDataRetry, error: listRetryError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
                       if (listRetryError) throw new Error(`Fehler beim erneuten Auflisten der Nutzer nach Invite-Fehler für Session ${stripeSessionId}.`);
                       const userRetry = listDataRetry.users.find((u) => u.email === email);
                       if (!userRetry) {
                            console.error(`[Webhook] Stripe - Kritisch: Nutzer ${email} (Session ${stripeSessionId}) existiert laut Fehler, konnte aber auch nach erneutem Suchen nicht gefunden werden.`);
                            throw new Error(`Nutzer ${email} existiert laut Fehler, konnte aber nicht gefunden werden.`);
                       }
                       userId = userRetry.id;
                       console.log(`[Webhook] Stripe - Nutzer ${email} (Session ${stripeSessionId}) nach erneutem Suchen gefunden mit ID: ${userId}`);
                  } else {
                      // Anderer Invite-Fehler
                      throw inviteError;
                  }
              } else if (!inviteData?.user?.id) {
                  // Sollte nicht passieren
                  console.error(`[Webhook] Stripe - Einladung für ${email} (Session ${stripeSessionId}) scheinbar erfolgreich, aber keine User-ID in der Antwort.`);
                  throw new Error(`Einladung für ${email} erfolgreich, aber keine User-ID erhalten.`);
              } else {
                  // Erfolgreich eingeladen
                  userId = inviteData.user.id;
                  userJustInvited = true;
                  console.log(`[Webhook] Stripe - Nutzer ${email} (Session ${stripeSessionId}) eingeladen mit ID: ${userId}`);
              }
          } catch (inviteError) {
              // Fange Fehler vom Invite oder erneuten Suchen ab
              console.error(`[Webhook] Stripe - Fehler beim Einladen/Finden von ${email} (Session ${stripeSessionId}):`, inviteError);
              throw new Error(`Fehler beim Einladen/Finden des Nutzers ${email}: ${inviteError.message}`);
          }
      }

      // Sicherheitscheck: Stelle sicher, dass wir eine userId haben
      if (!userId) {
           console.error(`[Webhook] Stripe - Kritisch: Konnte keine User ID für ${email} (Session ${stripeSessionId}) ermitteln. Verarbeitung abgebrochen.`);
           throw new Error(`Konnte keine User ID für ${email} ermitteln.`);
      }

      // --- Schritt 5b: Prüfen, ob der Nutzer das Paket bereits besitzt (NEU!) ---
      console.log(`[Webhook] Stripe - Prüfe Besitz für User ${userId}, Paket ${promptPackageId} (Session ${stripeSessionId})...`);
      const { data: existingPurchase, error: checkError } = await supabaseAdmin
          .from('user_purchases')
          .select('id') // Nur eine Spalte nötig
          .eq('user_id', userId)
          .eq('prompt_package_id', promptPackageId) // Stelle sicher, dass der Spaltenname stimmt!
          .maybeSingle(); // Gibt null zurück, wenn nichts gefunden wird

      if (checkError) {
          console.error(`[Webhook] Stripe - Fehler beim Prüfen des Paketbesitzes für User ${userId}, Paket ${promptPackageId} (Session ${stripeSessionId}):`, checkError);
          // Bei DB-Fehler hier abbrechen
          throw new Error(`Fehler beim Prüfen des Paketbesitzes: ${checkError.message}`);
      }

      if (existingPurchase) {
          // Nutzer besitzt das Paket bereits!
          console.warn(`[Webhook] Stripe - Nutzer ${userId} (${email}) besitzt Paket ${promptPackageId} bereits. Überspringe erneuten DB-Eintrag für Session ${stripeSessionId}. Zahlung war bereits erfolgt.`);
          // Sende 200 OK an Stripe, da die Zahlung erfolgt ist, aber wir nichts weiter tun (kein doppelter DB-Eintrag).
          return NextResponse.json({ received: true, status: 'duplicate_purchase_db_entry_prevented' });
      }

      // --- Schritt 5c: Kauf in DB eintragen (Nur wenn noch nicht besessen) ---
      console.log(`[Webhook] Stripe - Nutzer ${userId} besitzt Paket ${promptPackageId} noch nicht. Speichere Kauf für Session ${stripeSessionId}...`);
      const purchaseData = {
        user_id: userId,
        prompt_package_id: promptPackageId,
        stripe_checkout_session_id: stripeSessionId,
        purchased_at: purchasedAt.toISOString(), // ISO-String verwenden
        payment_provider: 'stripe',
        transaction_id: null // Explizit null für PayPal Order ID
      };

      console.log(`[Webhook] Stripe - Versuche Kauf in DB zu speichern für Session ${stripeSessionId}:`, purchaseData);
      const { error: insertError } = await supabaseAdmin
        .from('user_purchases')
        .insert(purchaseData);

      if (insertError) {
        // Prüfe auf Unique Constraint Violation (kann durch DB-Regel oder Race Condition auftreten)
        if (insertError.code === '23505') {
          console.warn(
            `[Webhook] Stripe - Kauf für Session ${stripeSessionId} konnte nicht gespeichert werden (DB-Eintrag existiert bereits - Idempotenz oder Race Condition?).`
          );
          // Sende 200 OK, da der Zustand konsistent ist (Zahlung erfolgt, Eintrag existiert).
          return NextResponse.json({ received: true, status: 'db_duplicate_detected' });
        } else {
          // Anderer DB-Fehler
          console.error(
            `[Webhook] Stripe - Kritisch: Fehler beim Speichern des Kaufs für User ${userId}, Session ${stripeSessionId} NACH Besitzprüfung:`,
            insertError
          );
          // Sende 500, um auf das Problem aufmerksam zu machen. Manueller Eingriff könnte nötig sein.
          return NextResponse.json({ error: `Fehler beim Speichern des Kaufs: ${insertError.message}` }, { status: 500 });
        }
      } else {
        // Erfolgreich gespeichert
        console.log(
          `[Webhook] Stripe - Kauf erfolgreich gespeichert für User ${userId}, Paket ${promptPackageId}, Session ${stripeSessionId}`
        );
        // Optional: Willkommens-E-Mail senden
        // if (userJustInvited) { ... }
      }

    } catch (err) {
      // Fange alle übergreifenden Fehler aus Schritten 5a, 5b, 5c ab
      console.error(`[Webhook] Stripe - Allgemeiner Fehler bei der Verarbeitung von checkout.session.completed für Session ${stripeSessionId}:`, err instanceof Error ? err.message : err);
      // Sende 500
      return NextResponse.json(
        { error: `Webhook processing error: ${err.message || 'Unknown processing error'}` },
        { status: 500 }
      );
    }
  } else {
    // Ignoriere andere Events
    console.log(`[Webhook] Stripe - Ignoriere Event-Typ: ${event.type}`);
  }

  // 6) Immer 200 OK an Stripe senden, wenn kein unbehandelter Fehler auftrat
  return NextResponse.json({ received: true });
}
