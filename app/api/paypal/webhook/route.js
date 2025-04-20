// app/api/paypal/webhook/route.js
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
// import { sendWelcomeEmail } from '@/lib/emails/sendWelcomeEmail'; // Optional

// --- Helper Funktion: verifyPayPalWebhookSignature (unverändert) ---
async function verifyPayPalWebhookSignature(requestHeaders, rawBody) {
    // console.log("[Webhook Verify] Starte Signaturprüfung...");

    const transmissionId = requestHeaders.get('paypal-transmission-id');
    const transmissionTime = requestHeaders.get('paypal-transmission-time');
    const certUrl = requestHeaders.get('paypal-cert-url');
    const authAlgo = requestHeaders.get('paypal-auth-algo');
    const transmissionSig = requestHeaders.get('paypal-transmission-sig');
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig || !webhookId) {
        console.error("[Webhook Verify] Fehlende Header oder Webhook ID für Verifizierung.");
        return false;
    }

    let accessToken;
    try {
        accessToken = await getPayPalAccessToken();
    } catch (tokenError) {
         console.error("[Webhook Verify] Fehler beim Holen des Access Tokens:", tokenError);
         return false;
    }

    let webhookEventObject;
    try {
        webhookEventObject = JSON.parse(rawBody);
    } catch (parseError) {
        console.error("[Webhook Verify] Fehler beim Parsen des rawBody zu JSON:", parseError);
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
             console.error(`[Webhook Verify] PayPal Verifizierungs-API meldet Fehler (Status ${responseStatus}):`, errorData);
             return false;
        }

        const responseData = await verificationResponse.json();
        const verificationStatus = responseData.verification_status;
        return verificationStatus === 'SUCCESS';

    } catch (error) {
        console.error("[Webhook Verify] Fehler beim Senden/Empfangen der Verifizierungsanfrage:", error);
        return false;
    }
}

// --- Helper Funktion: getPayPalAccessToken (unverändert) ---
async function getPayPalAccessToken() {
    // WICHTIG: Wenn NEXT_PUBLIC_PAYPAL_CLIENT_ID nur hier serverseitig verwendet wird,
    // benenne die Variable in Vercel und .env.local besser in PAYPAL_CLIENT_ID um (ohne NEXT_PUBLIC_).
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const appSecret = process.env.PAYPAL_APP_SECRET;

    if (!clientId || !appSecret) {
        console.error("PayPal Client ID oder Secret nicht konfiguriert!");
        throw new Error("PayPal Client ID oder Secret nicht konfiguriert!");
    }

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
             console.error("PayPal Token Fehler Response:", errorText);
             throw new Error(`PayPal Token Fehler: ${response.statusText}`);
        }
        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("Fehler in getPayPalAccessToken (Webhook):", error);
        throw error;
    }
}

// --- Helper Funktion: capturePayPalOrder (NEU) ---
async function capturePayPalOrder(orderId) {
    console.log(`[Webhook Capture] Versuche Capture für Order ${orderId}...`);
    try {
        const accessToken = await getPayPalAccessToken();
        const captureUrl = `${process.env.PAYPAL_API_BASE_URL}/v2/checkout/orders/${orderId}/capture`;

        // Eindeutige ID für Idempotenz, falls der Webhook mehrmals ausgelöst wird
        const requestId = `capture-${orderId}-${Date.now()}`;

        const captureResponse = await fetch(captureUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'PayPal-Request-Id': requestId
            },
            cache: 'no-store'
        });

        const responseStatus = captureResponse.status;
        const captureData = await captureResponse.json();

        if (responseStatus === 200 || responseStatus === 201) {
            // Prüfe den Status im Capture-Ergebnis
            if (captureData.status === 'COMPLETED') {
                console.log(`[Webhook Capture] Capture für Order ${orderId} erfolgreich abgeschlossen.`);
                // Optional: Die finale Capture-ID zurückgeben, falls sie gespeichert werden soll
                // const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;
                return { success: true, status: captureData.status /*, captureId: captureId */ };
            } else if (captureData.status === 'PENDING' || captureData.status === 'PROCESSING') {
                 console.warn(`[Webhook Capture] Capture für Order ${orderId} ist noch ausstehend (Status: ${captureData.status}). Du erhältst ggf. ein PAYMENT.CAPTURE.COMPLETED Event später.`);
                 // Behandle dies als "erfolgreich initiiert", aber noch nicht abgeschlossen
                 return { success: true, status: captureData.status };
            } else {
                 // Unerwarteter Status nach erfolgreichem API-Call
                 console.error(`[Webhook Capture] Capture für Order ${orderId} hatte unerwarteten Status ${captureData.status} nach erfolgreichem API-Call (${responseStatus}). Details:`, captureData);
                 return { success: false, status: captureData.status, errorData: captureData };
            }
        } else {
            // API-Fehler beim Capture-Versuch
            console.error(`[Webhook Capture] PayPal Capture API für Order ${orderId} fehlgeschlagen (Status ${responseStatus}). Details:`, captureData);
            // Spezifische Fehlerbehandlung für "ORDER_ALREADY_CAPTURED"
            if (captureData?.name === 'UNPROCESSABLE_ENTITY' && captureData?.details?.[0]?.issue === 'ORDER_ALREADY_CAPTURED') {
                 console.warn(`[Webhook Capture] Order ${orderId} wurde bereits gecaptured (laut API-Fehler). Betrachte als erfolgreich.`);
                 return { success: true, status: 'ALREADY_CAPTURED' };
            }
            return { success: false, status: `API_ERROR_${responseStatus}`, errorData: captureData };
        }

    } catch (captureError) {
        console.error(`[Webhook Capture] Kritischer Fehler beim Versuch, PayPal Order ${orderId} zu capturen:`, captureError);
        return { success: false, status: 'EXCEPTION', error: captureError };
    }
}


// --- Der eigentliche Webhook Handler (angepasst) ---
export async function POST(request) {
    const supabaseAdmin = createAdminClient();

    let rawBody;
    try {
         rawBody = await request.text();
    } catch (err) {
        console.error("PayPal Webhook - Fehler beim Lesen des Body:", err);
        return NextResponse.json({ error: 'Webhook error reading body' }, { status: 400 });
    }

    // 1. Signatur verifizieren
    const isValid = await verifyPayPalWebhookSignature(request.headers, rawBody);

    if (!isValid) {
        console.warn("PayPal Webhook - Ungültige Signatur empfangen.");
        // Wichtig: Trotz ungültiger Signatur 200 OK senden, um zu verhindern,
        // dass PayPal den Webhook deaktiviert. Logge den Vorfall aber deutlich.
        return NextResponse.json({ received: true, verification_status: 'failure' });
    }

    // 2. Event-Daten parsen
    let event;
    try {
        event = JSON.parse(rawBody);
    } catch (err) {
        console.error("PayPal Webhook - Fehler beim Parsen des JSON für die Event-Verarbeitung:", err);
        return NextResponse.json({ error: 'Webhook error parsing JSON for event processing' }, { status: 400 });
    }

    // 3. Auf relevante Events reagieren
    if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
        const order = event.resource;
        const purchaseUnits = order?.purchase_units;

        if (!purchaseUnits || purchaseUnits.length === 0) {
            console.error("PayPal Webhook - Keine purchase_units im Event gefunden.");
            return NextResponse.json({ error: 'Missing purchase units' }, { status: 400 });
        }

        const purchaseUnit = purchaseUnits[0];
        const customIdString = purchaseUnit.custom_id;
        const payerEmail = order.payer?.email_address;
        // const payerName = order.payer?.name?.given_name; // Für E-Mail etc.
        const paypalOrderId = order.id;

        if (!customIdString || !payerEmail || !paypalOrderId) {
             console.error("PayPal Webhook - Fehlende custom_id, payer email oder order id im Event.");
             return NextResponse.json({ error: 'Missing custom_id, payer email or order id' }, { status: 400 });
        }

        let customData;
        try {
            customData = JSON.parse(customIdString);
        } catch (err) {
             console.error("PayPal Webhook - Fehler beim Parsen der custom_id:", err);
             return NextResponse.json({ error: 'Invalid custom_id format' }, { status: 400 });
        }

        const { packageId /*, packageSlug, userId */ } = customData; // userId aus customData wird hier nicht verwendet, da wir den Nutzer über die E-Mail suchen

        if (!packageId) {
             console.error("PayPal Webhook - Fehlende packageId in custom_id.");
             return NextResponse.json({ error: 'Missing packageId in custom_id' }, { status: 400 });
        }

        console.log(`[Webhook] Verarbeite CHECKOUT.ORDER.APPROVED: OrderID=${paypalOrderId}, Email=${payerEmail}, PackageID=${packageId}`);

        try {
            // --- Schritt A: Zahlung capturen ---
            const captureResult = await capturePayPalOrder(paypalOrderId);

            // Wenn Capture fehlschlägt UND die Order nicht bereits gecaptured war, hier abbrechen oder speziell loggen.
            // Wir fahren hier erstmal fort, um den Kauf zu speichern, aber loggen den Fehler.
            if (!captureResult.success && captureResult.status !== 'ALREADY_CAPTURED') {
                console.error(`[Webhook] Capture für Order ${paypalOrderId} war nicht erfolgreich (Status: ${captureResult.status}). Verarbeitung wird fortgesetzt, aber Zahlung ist möglicherweise nicht abgeschlossen!`);
                // Hier könntest du entscheiden, den Vorgang abzubrechen:
                // throw new Error(`Capture failed with status ${captureResult.status}`);
            }

            // --- Schritt B: Nutzer finden oder erstellen/einladen ---
            let userId;
            let userJustInvited = false;

            // Effizientere Methode: Nutzer direkt über E-Mail suchen (falls Supabase Admin API das unterstützt)
            // Alternative: listUsers wie bisher
            // console.log(`[Webhook] Suche Nutzer ${payerEmail} via Admin API...`);
            const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }); // Ggf. Paginierung beachten bei >1000 Nutzern

            if (listError) {
                 console.error(`PayPal Webhook - Fehler beim Auflisten der Nutzer:`, listError);
                 throw new Error(`Fehler beim Auflisten der Nutzer: ${listError.message}`);
            }

            const existingUser = listData?.users.find((u) => u.email === payerEmail);

            if (existingUser) {
                userId = existingUser.id;
                console.log(`[Webhook] Nutzer ${payerEmail} gefunden mit ID: ${userId}`);
            } else {
                console.log(`[Webhook] Nutzer ${payerEmail} nicht gefunden. Lade ein...`);
                try {
                    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(payerEmail, {});

                    if (inviteError) {
                        if (inviteError.message.includes('User already registered')) {
                             console.warn(`[Webhook] Invite fehlgeschlagen für ${payerEmail}, Nutzer existiert bereits (laut Fehler). Versuche erneut zu finden...`);
                             // Erneutes Suchen nach dem Fehler
                             const { data: listDataRetry, error: listRetryError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
                             if (listRetryError) throw new Error('Fehler beim erneuten Auflisten der Nutzer nach Invite-Fehler.');
                             const userRetry = listDataRetry?.users.find((u) => u.email === payerEmail);
                             if (!userRetry) {
                                 console.error(`[Webhook] Kritisch: Nutzer ${payerEmail} existiert laut Fehler, konnte aber auch nach erneutem Suchen nicht gefunden werden.`);
                                 throw new Error('Nutzer existiert laut Fehler, konnte aber auch nach erneutem Suchen nicht gefunden werden.');
                             }
                             userId = userRetry.id;
                             console.log(`[Webhook] Nutzer ${payerEmail} nach erneutem Suchen gefunden mit ID: ${userId}`);
                        } else {
                            throw inviteError; // Anderer Invite-Fehler
                        }
                    } else if (!inviteData?.user?.id) {
                        // Sollte nicht passieren, aber sicherheitshalber prüfen
                        console.error(`[Webhook] Einladung für ${payerEmail} scheinbar erfolgreich, aber keine User-ID in der Antwort von Supabase.`);
                        throw new Error('Einladung erfolgreich, aber keine User-ID in der Antwort.');
                    } else {
                        userId = inviteData.user.id;
                        userJustInvited = true;
                        console.log(`[Webhook] Nutzer ${payerEmail} eingeladen mit ID: ${userId}`);
                    }
                } catch (inviteError) {
                    console.error(`PayPal Webhook - Fehler beim Einladen von ${payerEmail}:`, inviteError);
                    throw new Error(`Fehler beim Einladen des Nutzers: ${inviteError.message}`);
                }
            }

            // --- Schritt C: Kauf in user_purchases speichern ---
            // Verwende die Capture-Informationen, falls gewünscht
            const { error: purchaseError } = await supabaseAdmin
                .from('user_purchases')
                .insert({
                    user_id: userId,
                    prompt_package_id: packageId,
                    purchased_at: new Date().toISOString(),
                    payment_provider: 'paypal',
                    transaction_id: paypalOrderId, // Behalte Order ID oder nutze captureResult.captureId
                    stripe_checkout_session_id: null, // Sicherstellen, dass dies null ist
                    // Optional: Capture-Status speichern
                    paypal_capture_status: captureResult.status
                });

            if (purchaseError) {
                 if (purchaseError.code === '23505') { // Unique constraint violation
                     console.warn(`[Webhook] Kauf für PayPal Order ${paypalOrderId} wurde bereits verarbeitet (DB-Eintrag existiert). Idempotenz griff.`);
                     // Hier könntest du prüfen, ob der Capture-Status aktualisiert werden muss, falls er vorher fehlgeschlagen war
                     // const { error: updateError } = await supabaseAdmin.from('user_purchases').update({ paypal_capture_status: captureResult.status }).match({ transaction_id: paypalOrderId });
                     // if (updateError) console.error(`[Webhook] Fehler beim Aktualisieren des Capture-Status für bereits existierenden Kauf ${paypalOrderId}:`, updateError);
                 } else {
                     console.error(`PayPal Webhook - Fehler beim Speichern des Kaufs für User ${userId}, Paket ${packageId}:`, purchaseError);
                     // Selbst wenn das Speichern fehlschlägt, wurde der Capture ggf. schon ausgelöst.
                     // Überlege, ob hier ein Fehler geworfen werden soll.
                     throw new Error(`Fehler beim Speichern des Kaufs: ${purchaseError.message}`);
                 }
            } else {
                 console.log(`[Webhook] PayPal Kauf erfolgreich gespeichert für User ${userId}, Paket ${packageId}, Order ${paypalOrderId}. Capture-Status: ${captureResult.status}`);
            }

            // Optional: Willkommens-E-Mail senden (bleibt auskommentiert)
            // if (userJustInvited) { ... }

        } catch (processingError) {
            // Allgemeiner Fehler bei Capture, Nutzerfindung oder Speicherung
            console.error(`PayPal Webhook - Fehler bei der Verarbeitung des CHECKOUT.ORDER.APPROVED für Order ${paypalOrderId}:`, processingError);
            // Sende 500, damit PayPal es ggf. erneut versucht (wenn konfiguriert)
            // Aber sei vorsichtig mit Endlosschleifen, wenn der Fehler persistent ist.
            return NextResponse.json({ error: `Webhook processing error: ${processingError.message}` }, { status: 500 });
        }

    } else if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        // Optional: Handle das Event, um den finalen Status zu bestätigen/speichern
        const capture = event.resource;
        const orderIdFromCapture = capture.supplementary_data?.related_ids?.order_id;
        console.log(`[Webhook] Empfangen: PAYMENT.CAPTURE.COMPLETED für Capture ID ${capture.id}` + (orderIdFromCapture ? `, zugehörige Order ID ${orderIdFromCapture}` : ''));
        // Hier könntest du den Status in deiner `user_purchases` Tabelle aktualisieren,
        // falls der initiale Capture PENDING war oder zur Sicherheit.
        // const { error: updateError } = await supabaseAdmin.from('user_purchases').update({ paypal_capture_status: 'COMPLETED' }).match({ transaction_id: orderIdFromCapture });
        // if (updateError) console.error(`[Webhook] Fehler beim Aktualisieren des Status für PAYMENT.CAPTURE.COMPLETED ${orderIdFromCapture}:`, updateError);

    } else if (event.event_type === 'PAYMENT.CAPTURE.DENIED') {
        // Wichtig: Handle abgelehnte Captures!
        const capture = event.resource;
        const orderIdFromCapture = capture.supplementary_data?.related_ids?.order_id;
        console.error(`[Webhook] ALARM: PAYMENT.CAPTURE.DENIED empfangen für Capture ID ${capture.id}` + (orderIdFromCapture ? `, zugehörige Order ID ${orderIdFromCapture}` : '') + `. Grund: ${capture.status_details?.reason}`);
        // Markiere den Kauf als fehlgeschlagen oder storniert in deiner Datenbank.
        // const { error: updateError } = await supabaseAdmin.from('user_purchases').update({ paypal_capture_status: 'DENIED', /* ggf. weitere Felder */ }).match({ transaction_id: orderIdFromCapture });
        // if (updateError) console.error(`[Webhook] Fehler beim Aktualisieren des Status für PAYMENT.CAPTURE.DENIED ${orderIdFromCapture}:`, updateError);

    } else {
        // Ignoriere andere Events
        // console.log(`PayPal Webhook - Ignoriere Event: ${event.event_type}`);
    }

    // Wichtig: Immer 200 OK an PayPal senden, um den Empfang zu bestätigen
    // (außer bei kritischen Fehlern *vor* der Signaturprüfung oder beim Parsen, wo 4xx/5xx sinnvoll sein kann)
    return NextResponse.json({ received: true });
}
