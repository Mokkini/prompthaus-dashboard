// app/api/paypal/webhook/route.js
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
// import { sendWelcomeEmail } from '@/lib/emails/sendWelcomeEmail'; // Optional, falls benötigt

// Helper Funktion zum Verifizieren des Webhook Events
async function verifyPayPalWebhookSignature(requestHeaders, rawBody) {
    // console.log("[Webhook Verify] Starte Signaturprüfung..."); // Entfernt

    const transmissionId = requestHeaders.get('paypal-transmission-id');
    const transmissionTime = requestHeaders.get('paypal-transmission-time');
    const certUrl = requestHeaders.get('paypal-cert-url');
    const authAlgo = requestHeaders.get('paypal-auth-algo');
    const transmissionSig = requestHeaders.get('paypal-transmission-sig');
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    // Detaillierte Header-Logs entfernt

    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig || !webhookId) {
        console.error("[Webhook Verify] Fehlende Header oder Webhook ID für Verifizierung.");
        // console.log("[Webhook Verify] Vorhandene Header:", Object.fromEntries(requestHeaders.entries())); // Entfernt
        return false;
    }

    let accessToken;
    try {
        accessToken = await getPayPalAccessToken();
        // console.log(`[Webhook Verify] Access Token erhalten: ...`); // Entfernt
    } catch (tokenError) {
         console.error("[Webhook Verify] Fehler beim Holen des Access Tokens:", tokenError); // Behalten
         return false;
    }

    let webhookEventObject;
    try {
        webhookEventObject = JSON.parse(rawBody);
    } catch (parseError) {
        console.error("[Webhook Verify] Fehler beim Parsen des rawBody zu JSON:", parseError); // Behalten
        return false;
    }

    const verificationPayload = {
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: webhookEventObject
    };

    // Detailliertes Payload-Log entfernt
    // console.log("[Webhook Verify] Sende Verifizierungs-Payload ...");

    const url = `${process.env.PAYPAL_API_BASE_URL}/v1/notifications/verify-webhook-signature`;

    try {
        const verificationResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(verificationPayload),
            cache: 'no-store'
        });

        const responseStatus = verificationResponse.status;
        if (!verificationResponse.ok) {
             const errorData = await verificationResponse.json().catch(() => ({ message: 'Konnte Fehlerdetails nicht parsen' }));
             console.error(`[Webhook Verify] PayPal Verifizierungs-API meldet Fehler (Status ${responseStatus}):`, errorData); // Behalten
             return false;
        }

        const responseData = await verificationResponse.json();
        // console.log(`[Webhook Verify] Antwort von PayPal Verifizierungs-API (Status ${responseStatus}):`, responseData); // Entfernt

        const verificationStatus = responseData.verification_status;
        // console.log("[Webhook Verify] PayPal Webhook Verifizierungsstatus:", verificationStatus); // Entfernt
        return verificationStatus === 'SUCCESS';

    } catch (error) {
        console.error("[Webhook Verify] Fehler beim Senden/Empfangen der Verifizierungsanfrage:", error); // Behalten
        return false;
    }
}

// Helper Funktion für Access Token (Fehlerlogs bleiben erhalten)
async function getPayPalAccessToken() {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const appSecret = process.env.PAYPAL_APP_SECRET;
    const basicAuth = Buffer.from(`${clientId}:${appSecret}`).toString('base64');
    const url = `${process.env.PAYPAL_API_BASE_URL}/v1/oauth2/token`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Accept-Language': 'en_US', 'Authorization': `Basic ${basicAuth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'grant_type=client_credentials',
            cache: 'no-store'
        });
        if (!response.ok) {
             const errorText = await response.text();
             console.error("PayPal Token Fehler Response:", errorText); // Behalten
             throw new Error(`PayPal Token Fehler: ${response.statusText}`);
        }
        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("Fehler in getPayPalAccessToken (Webhook):", error); // Behalten
        throw error;
    }
}


// Der eigentliche Webhook Handler
export async function POST(request) {
    const supabaseAdmin = createAdminClient();

    let rawBody;
    try {
         rawBody = await request.text();
         // console.log("[Webhook POST] Raw Body gelesen, Länge:", rawBody.length); // Entfernt
    } catch (err) {
        console.error("PayPal Webhook - Fehler beim Lesen des Body:", err); // Behalten
        return NextResponse.json({ error: 'Webhook error reading body' }, { status: 400 });
    }

    // 1. Signatur verifizieren
    // console.log("[Webhook POST] Rufe verifyPayPalWebhookSignature auf..."); // Entfernt
    const isValid = await verifyPayPalWebhookSignature(request.headers, rawBody);
    // console.log(`[Webhook POST] Ergebnis von verifyPayPalWebhookSignature: ${isValid}`); // Entfernt

    if (!isValid) {
        console.warn("PayPal Webhook - Ungültige Signatur empfangen."); // Behalten
        return NextResponse.json({ received: true, verification_status: 'failure' });
        // Alternativer 401 bleibt auskommentiert als Referenz
        // return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    // 2. Event-Daten parsen
    let event;
    try {
        event = JSON.parse(rawBody);
    } catch (err) {
        console.error("PayPal Webhook - Fehler beim Parsen des JSON für die Event-Verarbeitung:", err); // Behalten
        return NextResponse.json({ error: 'Webhook error parsing JSON for event processing' }, { status: 400 });
    }

     // console.log("PayPal Webhook Event empfangen:", event.event_type); // Entfernt

    // 3. Auf relevante Events reagieren
    if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
        const order = event.resource;
        const purchaseUnits = order?.purchase_units;

        if (!purchaseUnits || purchaseUnits.length === 0) {
            console.error("PayPal Webhook - Keine purchase_units im Event gefunden."); // Behalten
            return NextResponse.json({ error: 'Missing purchase units' }, { status: 400 });
        }

        const purchaseUnit = purchaseUnits[0];
        const customIdString = purchaseUnit.custom_id;
        const payerEmail = order.payer?.email_address;
        const payerName = order.payer?.name?.given_name; // Bleibt drin, falls für E-Mail benötigt
        const paypalOrderId = order.id;

        if (!customIdString || !payerEmail) {
             console.error("PayPal Webhook - Fehlende custom_id oder payer email im Event."); // Behalten
             return NextResponse.json({ error: 'Missing custom_id or payer email' }, { status: 400 });
        }

        let customData;
        try {
            customData = JSON.parse(customIdString);
        } catch (err) {
             console.error("PayPal Webhook - Fehler beim Parsen der custom_id:", err); // Behalten
             return NextResponse.json({ error: 'Invalid custom_id format' }, { status: 400 });
        }

        const { packageId, packageSlug /*, userId */ } = customData;

        if (!packageId) {
             console.error("PayPal Webhook - Fehlende packageId in custom_id."); // Behalten
             return NextResponse.json({ error: 'Missing packageId in custom_id' }, { status: 400 });
        }

        // console.log(`Verarbeite PayPal Kauf: OrderID=${paypalOrderId}, Email=${payerEmail}, PackageID=${packageId}`); // Entfernt

        try {
            // 4. Nutzer finden oder erstellen/einladen
            let userId;
            let userJustInvited = false;

            // console.log(`[Webhook] Suche Nutzer ${payerEmail} via Admin API...`); // Entfernt
            const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

            if (listError) {
                 console.error(`PayPal Webhook - Fehler beim Auflisten der Nutzer:`, listError); // Behalten
                 throw new Error(`Fehler beim Auflisten der Nutzer: ${listError.message}`);
            }

            const existingUser = listData?.users.find((u) => u.email === payerEmail);

            if (existingUser) {
                userId = existingUser.id;
                // console.log(`Nutzer ${payerEmail} über listUsers gefunden mit ID: ${userId}`); // Entfernt
            } else {
                // console.log(`Nutzer ${payerEmail} nicht gefunden. Lade ein...`); // Entfernt
                try {
                    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(payerEmail, {});

                    if (inviteError) {
                        if (inviteError.message.includes('User already registered')) {
                             console.warn(`[Webhook] Invite fehlgeschlagen für ${payerEmail}, Nutzer existiert bereits (laut Fehler). Versuche erneut zu finden...`); // Behalten
                             const { data: listDataRetry, error: listRetryError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
                             if (listRetryError) throw new Error('Fehler beim erneuten Auflisten der Nutzer nach Invite-Fehler.');
                             const userRetry = listDataRetry.users.find((u) => u.email === payerEmail);
                             if (!userRetry) throw new Error('Nutzer existiert laut Fehler, konnte aber auch nach erneutem Suchen nicht gefunden werden.');
                             userId = userRetry.id;
                             // console.log(`Nutzer ${payerEmail} nach erneutem Suchen gefunden mit ID: ${userId}`); // Entfernt
                        } else {
                            throw inviteError;
                        }
                    } else if (!inviteData?.user?.id) {
                        throw new Error('Einladung erfolgreich, aber keine User-ID in der Antwort.');
                    } else {
                        userId = inviteData.user.id;
                        userJustInvited = true;
                        // console.log(`Nutzer ${payerEmail} eingeladen mit ID: ${userId}`); // Entfernt
                    }
                } catch (inviteError) {
                    console.error(`PayPal Webhook - Fehler beim Einladen von ${payerEmail}:`, inviteError); // Behalten
                    throw new Error(`Fehler beim Einladen des Nutzers: ${inviteError.message}`);
                }
            }

            // 5. Kauf in user_purchases speichern
            const { error: purchaseError } = await supabaseAdmin
                .from('user_purchases')
                .insert({
                    user_id: userId,
                    prompt_package_id: packageId,
                    purchased_at: new Date().toISOString(),
                    payment_provider: 'paypal',
                    transaction_id: paypalOrderId,
                    stripe_checkout_session_id: null
                });

            if (purchaseError) {
                 if (purchaseError.code === '23505') {
                     console.warn(`[Webhook] Kauf für PayPal Order ${paypalOrderId} wurde bereits verarbeitet.`); // Behalten
                     return NextResponse.json({ received: true, status: 'already_processed' });
                 } else {
                     console.error(`PayPal Webhook - Fehler beim Speichern des Kaufs für User ${userId}, Paket ${packageId}:`, purchaseError); // Behalten
                     throw new Error(`Fehler beim Speichern des Kaufs: ${purchaseError.message}`);
                 }
            }

            // console.log(`PayPal Kauf erfolgreich gespeichert für User ${userId}, Paket ${packageId}, Order ${paypalOrderId}`); // Entfernt

            // Optional: Willkommens-E-Mail senden (bleibt auskommentiert)
            // if (userJustInvited) {
            //     try {
            //          // await sendWelcomeEmail(payerEmail, payerName || '');
            //          // console.log(`Willkommens-E-Mail an ${payerEmail} gesendet.`);
            //     } catch (emailError) {
            //          console.error(`PayPal Webhook - Fehler beim Senden der Willkommens-E-Mail an ${payerEmail}:`, emailError); // Behalten (falls E-Mail-Logik aktiv wird)
            //     }
            // }

        } catch (processingError) {
            console.error("PayPal Webhook - Fehler bei der Verarbeitung des Kaufs:", processingError); // Behalten
            return NextResponse.json({ error: `Webhook processing error: ${processingError.message}` }, { status: 500 });
        }
    } else {
        // console.log(`PayPal Webhook - Ignoriere Event: ${event.event_type}`); // Entfernt
    }

    // Wichtig: Immer 200 OK an PayPal senden
    return NextResponse.json({ received: true });
}
