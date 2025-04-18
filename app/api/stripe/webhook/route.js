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
  apiVersion: '2022-11-15',
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
    console.log(`[Webhook] Event received: ${event.type}`);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
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
        `[Webhook] Ungültige Session-Daten für ${stripeSessionId}:`,
        { email, promptPackageId }
      );
      return NextResponse.json(
        { error: 'Invalid session payload' },
        { status: 400 }
      );
    }

    try {
      const supabaseAdmin = createAdminClient();

      // 5a) Prüfen, ob es den User schon gibt
      const { data: listData, error: listError } =
        await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      let user = listData.users.find((u) => u.email === email);
      let userId = user?.id;

      // 5b) Falls neu: Einladen + Metadaten-Flag setzen
      if (!userId) {
        console.log(`[Webhook] Invite new user ${email}...`);
        const { data: inviteData, error: inviteError } =
          await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo: 'http://localhost:3000/passwort-festlegen',
          });
        if (inviteError && !inviteError.message.includes('already registered')) {
          throw inviteError;
        }
        // Bei "already registered" einfach nochmal suchen
        if (inviteError?.message.includes('already registered')) {
          const { data: retryList } =
            await supabaseAdmin.auth.admin.listUsers();
          user = retryList.users.find((u) => u.email === email);
          userId = user?.id;
        } else {
          userId = inviteData.user.id;
          console.log(`[Webhook] Invited user ${email} (ID: ${userId})`);
          // Flag setzen
          const { error: metaError } =
            await supabaseAdmin.auth.admin.updateUserById(userId, {
              user_metadata: { needs_password_setup: true },
            });
          if (metaError) {
            console.error(
              `[Webhook] Flag setzen fehlgeschlagen für ${userId}:`,
              metaError
            );
          } else {
            console.log(`[Webhook] Flag needs_password_setup gesetzt für ${userId}`);
          }
        }
      } else {
        console.log(`[Webhook] Existing user ${email} (ID: ${userId})`);
      }

      // 5c) Kauf in DB eintragen
      if (userId) {
        const { error: insertError } = await supabaseAdmin
          .from('user_purchases')
          .insert({
            user_id: userId,
            prompt_package_id: promptPackageId,
            stripe_checkout_session_id: stripeSessionId,
            purchased_at: purchasedAt,
          });
        if (insertError) {
          if (insertError.code === '23505') {
            console.warn(
              `[Webhook] Purchase für Session ${stripeSessionId} bereits eingetragen.`
            );
          } else {
            console.error(
              `[Webhook] DB-Error für Session ${stripeSessionId}, User ${userId}:`,
              insertError
            );
          }
        } else {
          console.log(
            `[Webhook] Purchase eingetragen für User ${userId}, Paket ${promptPackageId}`
          );
        }
      }
    } catch (err) {
      console.error('[Webhook] Fehler bei checkout.session.completed:', err);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  } else {
    console.log(`[Webhook] Ignoriere Event-Typ: ${event.type}`);
  }

  // 6) Always return a 200 to Stripe
  return NextResponse.json({ received: true });
}
