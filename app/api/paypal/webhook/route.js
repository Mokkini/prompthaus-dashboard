// app/api/paypal/webhook/route.js
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
// import { sendWelcomeEmail } from '@/lib/emails/sendWelcomeEmail'; // Optional

// --- Helper Funktion: verifyPayPalWebhookSignature ---
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
        // Vorsicht: JSON.parse kann fehlschlagen, wenn rawBody kein valides JSON ist
        webhookEventObject = JSON.parse(rawBody);
    } catch (parseError) {
        console.error("[Webhook Verify] Fehler beim Parsen des rawBody zu JSON:", parseError);
        // Wenn der Body kein JSON ist, kann die Verifizierung nicht funktionieren
        return false;
    }

    const verificationPayload = {
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: webhookEventObject // Das geparste Objekt verwenden
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
            cache: 'no-store' // Wichtig, um Caching-Probleme zu vermeiden
        });

        const responseStatus = verificationResponse.status;
        if (!verificationResponse.ok) {
             // Versuche, Fehlerdetails zu lesen, aber fange Fehler dabei ab
             const errorData = await verificationResponse.json().catch(() => ({ message: 'Konnte Fehlerdetails nicht parsen' }));
             console.error(`[Webhook Verify] PayPal Verifizierungs-API meldet Fehler (Status ${responseStatus}):`, errorData);
             return false;
        }

        const responseData = await verificationResponse.json();
        const verificationStatus = responseData.verification_status;
        // console.log(`[Webhook Verify] Verifizierungsstatus: ${verificationStatus}`);
        return verificationStatus === 'SUCCESS';

    } catch (error) {
        console.error("[Webhook Verify] Netzwerkfehler oder anderer Fehler beim Senden/Empfangen der Verifizierungsanfrage:", error);
        return false;
    }
}

// --- Helper Funktion: getPayPalAccessToken ---
async function getPayPalAccessToken() {
    // WICHTIG: Wenn NEXT_PUBLIC_PAYPAL_CLIENT_ID nur hier serverseitig verwendet wird,
    // benenne die Variable in Vercel und .env.local besser in PAYPAL_CLIENT_ID um (ohne NEXT_PUBLIC_).
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID; // Oder PAYPAL_CLIENT_ID
    const appSecret = process.env.PAYPAL_APP_SECRET;
    const apiBaseUrl = process.env.PAYPAL_API_BASE_URL;

    if (!clientId || !appSecret || !apiBaseUrl) {
        console.error("PayPal Client ID, Secret oder API Base URL nicht konfiguriert!");
        throw new Error("PayPal Client ID, Secret oder API Base URL nicht konfiguriert!");
    }

    const basicAuth = Buffer.from(`${clientId}:${appSecret}`).toString('base64');
    const url = `${apiBaseUrl}/v1/oauth2/token`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-Language': 'en_US',
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'grant_type=client_credentials',
            cache: 'no-store' // Verhindert Caching des Tokens durch Next.js/Fetch
        });

        if (!response.ok) {
             const errorText = await response.text(); // Versuche, den Fehlertext zu lesen
             console.error(`PayPal Token Fehler Response (Status ${response.status}):`, errorText);
             throw new Error(`PayPal Token Fehler: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (!data.access_token) {
             console.error("PayPal Token Response enthielt keinen access_token:", data);
             throw new Error("Kein Access Token von PayPal erhalten.");
        }
        return data.access_token;
    } catch (error) {
        // Logge den spezifischen Fehler, der aufgetreten ist
        console.error("Fehler in getPayPalAccessToken (Webhook):", error instanceof Error ? error.message : error);
        // Werfe den Fehler weiter, damit der aufrufende Code ihn behandeln kann
        throw error;
    }
}

// --- Helper Funktion: capturePayPalOrder ---
async function capturePayPalOrder(orderId) {
    console.log(`[Webhook Capture] Versuche Capture für Order ${orderId}...`);
    const apiBaseUrl = process.env.PAYPAL_API_BASE_URL;
     if (!apiBaseUrl) {
        console.error("PayPal API Base URL nicht konfiguriert für Capture!");
        return { success: false, status: 'CONFIG_ERROR', error: new Error("PayPal API Base URL nicht konfiguriert!") };
    }

    try {
        const accessToken = await getPayPalAccessToken();
        const captureUrl = `${apiBaseUrl}/v2/checkout/orders/${orderId}/capture`;

        // Eindeutige ID für Idempotenz
        const requestId = `capture-${orderId}-${Date.now()}`;

        const captureResponse = await fetch(captureUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'PayPal-Request-Id': requestId // Wichtig für Idempotenz
            },
            cache: 'no-store' // Verhindert Caching
        });

        const responseStatus = captureResponse.status;
        // Versuche immer, den Body zu lesen, auch bei Fehlern
        const captureData = await captureResponse.json().catch(err => {
            console.error(`[Webhook Capture] Fehler beim Parsen der JSON-Antwort für Order ${orderId} (Status ${responseStatus}):`, err);
            return { parseError: true, message: "Could not parse response JSON" }; // Gib ein Fehlerobjekt zurück
        });

        // Prüfe auf Parse-Fehler
        if (captureData.parseError) {
             return { success: false, status: `API_RESPONSE_PARSE_ERROR_${responseStatus}`, errorData: captureData };
        }

        // Erfolgreiche API-Antwort (200 OK oder 201 Created)
        if (responseStatus === 200 || responseStatus === 201) {
            // Prüfe den Status im Capture-Ergebnis
            if (captureData.status === 'COMPLETED') {
                console.log(`[Webhook Capture] Capture für Order ${orderId} erfolgreich abgeschlossen.`);
                const captureId = captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id;
                return { success: true, status: captureData.status, captureId: captureId };
            } else if (captureData.status === 'PENDING' || captureData.status === 'PROCESSING') {
                 console.warn(`[Webhook Capture] Capture für Order ${orderId} ist noch ausstehend (Status: ${captureData.status}). PAYMENT.CAPTURE.COMPLETED Event wird erwartet.`);
                 return { success: true, status: captureData.status }; // Betrachte als erfolgreich initiiert
            } else {
                 // Unerwarteter Status nach erfolgreichem API-Call
                 console.error(`[Webhook Capture] Capture für Order ${orderId} hatte unerwarteten Status ${captureData.status} nach API-Call (${responseStatus}). Details:`, captureData);
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
            // Gib den API-Fehlerstatus und die Daten zurück
            return { success: false, status: `API_ERROR_${responseStatus}`, errorData: captureData };
        }

    } catch (captureError) {
        // Fange Fehler vom fetch selbst oder von getPayPalAccessToken ab
        console.error(`[Webhook Capture] Kritischer Fehler beim Versuch, PayPal Order ${orderId} zu capturen:`, captureError instanceof Error ? captureError.message : captureError);
        return { success: false, status: 'EXCEPTION', error: captureError };
    }
}


// --- Der eigentliche Webhook Handler ---
export async function POST(request) {
    const supabaseAdmin = createAdminClient();

    let rawBody;
    try {
         // Lies den Body als Text für die Signaturprüfung
         rawBody = await request.text();
    } catch (err) {
        console.error("PayPal Webhook - Fehler beim Lesen des Body:", err);
        return NextResponse.json({ error: 'Webhook error reading body' }, { status: 400 });
    }

    // 1. Signatur verifizieren
    const isValid = await verifyPayPalWebhookSignature(request.headers, rawBody);

    if (!isValid) {
        console.warn("PayPal Webhook - Ungültige Signatur empfangen.");
        // Wichtig: Trotzdem 200 OK senden, um Retries von PayPal zu minimieren
        // und eine Deaktivierung des Webhooks zu verhindern.
        return NextResponse.json({ received: true, verification_status: 'failure' });
    }
     console.log("[Webhook] Signatur erfolgreich verifiziert.");

    // 2. Event-Daten parsen (erneut, da verify es intern auch tut, aber wir brauchen es hier)
    let event;
    try {
        event = JSON.parse(rawBody);
    } catch (err) {
        console.error("PayPal Webhook - Fehler beim Parsen des JSON für die Event-Verarbeitung:", err);
        // Sende 400, da der Body ungültig ist
        return NextResponse.json({ error: 'Webhook error parsing JSON for event processing' }, { status: 400 });
    }

    // 3. Auf relevante Events reagieren
    // ====================================
    //      CHECKOUT.ORDER.APPROVED
    // ====================================
    if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
        const order = event.resource;
        const purchaseUnits = order?.purchase_units;

        // Grundlegende Validierung des Events
        if (!purchaseUnits || purchaseUnits.length === 0) {
            console.error("[Webhook] CHECKOUT.ORDER.APPROVED - Keine purchase_units im Event gefunden.");
            return NextResponse.json({ error: 'Missing purchase units' }, { status: 400 });
        }

        const purchaseUnit = purchaseUnits[0];
        const customIdString = purchaseUnit.custom_id;
        const payerEmail = order.payer?.email_address;
        const paypalOrderId = order.id;

        if (!customIdString || !payerEmail || !paypalOrderId) {
             console.error("[Webhook] CHECKOUT.ORDER.APPROVED - Fehlende custom_id, payer email oder order id im Event.");
             return NextResponse.json({ error: 'Missing custom_id, payer email or order id' }, { status: 400 });
        }

        let customData;
        try {
            customData = JSON.parse(customIdString);
        } catch (err) {
             console.error(`[Webhook] CHECKOUT.ORDER.APPROVED - Fehler beim Parsen der custom_id für Order ${paypalOrderId}:`, err);
             return NextResponse.json({ error: 'Invalid custom_id format' }, { status: 400 });
        }

        const { packageId } = customData;

        if (!packageId) {
             console.error(`[Webhook] CHECKOUT.ORDER.APPROVED - Fehlende packageId in custom_id für Order ${paypalOrderId}.`);
             return NextResponse.json({ error: 'Missing packageId in custom_id' }, { status: 400 });
        }

        console.log(`[Webhook] Verarbeite CHECKOUT.ORDER.APPROVED: OrderID=${paypalOrderId}, Email=${payerEmail}, PackageID=${packageId}`);

        // --- Hauptverarbeitungslogik ---
        try {
            // --- Schritt A: Nutzer finden oder erstellen/einladen ---
            let userId;
            let userJustInvited = false;

            // console.log(`[Webhook] Suche Nutzer ${payerEmail} via Admin API...`);
            // TODO: Effizienz prüfen bei vielen Nutzern. Ggf. gezieltere Suche implementieren, falls Supabase es erlaubt.
            const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

            if (listError) {
                 console.error(`[Webhook] Fehler beim Auflisten der Nutzer für Order ${paypalOrderId}:`, listError);
                 throw new Error(`Fehler beim Auflisten der Nutzer: ${listError.message}`);
            }

            const existingUser = listData?.users.find((u) => u.email === payerEmail);

            if (existingUser) {
                userId = existingUser.id;
                console.log(`[Webhook] Nutzer ${payerEmail} gefunden mit ID: ${userId} für Order ${paypalOrderId}`);
            } else {
                console.log(`[Webhook] Nutzer ${payerEmail} nicht gefunden für Order ${paypalOrderId}. Lade ein...`);
                try {
                    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(payerEmail, {});

                    if (inviteError) {
                        // Spezifische Behandlung für bereits registrierte Nutzer
                        if (inviteError.message.includes('User already registered')) {
                             console.warn(`[Webhook] Invite fehlgeschlagen für ${payerEmail} (Order ${paypalOrderId}), Nutzer existiert bereits (laut Fehler). Versuche erneut zu finden...`);
                             // Erneutes Suchen nach dem Fehler
                             const { data: listDataRetry, error: listRetryError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
                             if (listRetryError) throw new Error(`Fehler beim erneuten Auflisten der Nutzer nach Invite-Fehler für Order ${paypalOrderId}.`);
                             const userRetry = listDataRetry?.users.find((u) => u.email === payerEmail);
                             if (!userRetry) {
                                 console.error(`[Webhook] Kritisch: Nutzer ${payerEmail} (Order ${paypalOrderId}) existiert laut Fehler, konnte aber auch nach erneutem Suchen nicht gefunden werden.`);
                                 throw new Error(`Nutzer ${payerEmail} existiert laut Fehler, konnte aber nicht gefunden werden.`);
                             }
                             userId = userRetry.id;
                             console.log(`[Webhook] Nutzer ${payerEmail} (Order ${paypalOrderId}) nach erneutem Suchen gefunden mit ID: ${userId}`);
                        } else {
                            // Anderer Invite-Fehler
                            throw inviteError;
                        }
                    } else if (!inviteData?.user?.id) {
                        // Sicherheitsprüfung: Sollte nicht passieren
                        console.error(`[Webhook] Einladung für ${payerEmail} (Order ${paypalOrderId}) scheinbar erfolgreich, aber keine User-ID in der Antwort von Supabase.`);
                        throw new Error(`Einladung für ${payerEmail} erfolgreich, aber keine User-ID erhalten.`);
                    } else {
                        // Nutzer erfolgreich eingeladen
                        userId = inviteData.user.id;
                        userJustInvited = true;
                        console.log(`[Webhook] Nutzer ${payerEmail} (Order ${paypalOrderId}) eingeladen mit ID: ${userId}`);
                    }
                } catch (inviteError) {
                    // Fange Fehler vom Invite oder dem erneuten Suchen ab
                    console.error(`[Webhook] Fehler beim Einladen/Finden von ${payerEmail} (Order ${paypalOrderId}):`, inviteError);
                    throw new Error(`Fehler beim Einladen/Finden des Nutzers ${payerEmail}: ${inviteError.message}`);
                }
            }

             // Sicherheitscheck: Stelle sicher, dass wir eine userId haben
             if (!userId) {
                 console.error(`[Webhook] Kritisch: Konnte keine User ID für ${payerEmail} (Order ${paypalOrderId}) ermitteln. Verarbeitung abgebrochen.`);
                 throw new Error(`Konnte keine User ID für ${payerEmail} ermitteln.`);
            }

            // --- Schritt B: Prüfen, ob der Nutzer das Paket bereits besitzt ---
            console.log(`[Webhook] Prüfe Besitz für User ${userId}, Paket ${packageId} (Order ${paypalOrderId})...`);
            const { data: existingPurchase, error: checkError } = await supabaseAdmin
                .from('user_purchases')
                .select('id') // Nur eine Spalte nötig
                .eq('user_id', userId)
                .eq('prompt_package_id', packageId)
                .maybeSingle(); // Effizienter als .select().limit(1)

            if (checkError) {
                console.error(`[Webhook] Fehler beim Prüfen des Paketbesitzes für User ${userId}, Paket ${packageId} (Order ${paypalOrderId}):`, checkError);
                // Bei DB-Fehler hier abbrechen, bevor Zahlung gecaptured wird
                throw new Error(`Fehler beim Prüfen des Paketbesitzes: ${checkError.message}`);
            }

            if (existingPurchase) {
                // Nutzer besitzt das Paket bereits!
                console.warn(`[Webhook] Nutzer ${userId} (${payerEmail}) besitzt Paket ${packageId} bereits. Breche Zahlungscapture für Order ${paypalOrderId} ab.`);
                // KEINEN Capture-Aufruf machen!
                // Sende 200 OK an PayPal, um den Empfang zu bestätigen.
                return NextResponse.json({ received: true, status: 'duplicate_purchase_prevented' });
            }

            // --- Schritt C: Zahlung capturen (Nur wenn Paket noch nicht besessen wird) ---
            console.log(`[Webhook] Nutzer ${userId} besitzt Paket ${packageId} noch nicht. Starte Capture für Order ${paypalOrderId}...`);
            const captureResult = await capturePayPalOrder(paypalOrderId);

            // Prüfe das Ergebnis des Capture-Versuchs
            if (!captureResult.success && captureResult.status !== 'ALREADY_CAPTURED') {
                // Capture fehlgeschlagen (und nicht, weil es schon gecaptured war)
                console.error(`[Webhook] Capture für Order ${paypalOrderId} war nicht erfolgreich (Status: ${captureResult.status}). Verarbeitung wird abgebrochen! Details:`, captureResult.errorData || captureResult.error);
                // Sende 500, damit PayPal es ggf. erneut versucht (bei temporären Fehlern)
                // oder um auf ein persistentes Problem hinzuweisen.
                return NextResponse.json({ error: `Capture failed with status ${captureResult.status}` }, { status: 500 });
            }
            // Wenn Capture erfolgreich war oder die Order bereits gecaptured war, fahre fort.
            console.log(`[Webhook] Capture für Order ${paypalOrderId} erfolgreich initiiert oder bereits erfolgt (Status: ${captureResult.status}).`);


            // --- Schritt D: Kauf in user_purchases speichern ---
            const purchaseData = {
                user_id: userId,
                prompt_package_id: packageId,
                purchased_at: new Date().toISOString(), // ISO-String verwenden
                payment_provider: 'paypal',
                transaction_id: paypalOrderId, // PayPal Order ID als Transaktions-ID
                stripe_checkout_session_id: null, // Explizit null setzen
                paypal_capture_status: captureResult.status // Den erhaltenen Capture-Status speichern
            };

            console.log(`[Webhook] Versuche Kauf in DB zu speichern für Order ${paypalOrderId}:`, purchaseData);
            const { error: purchaseError } = await supabaseAdmin
                .from('user_purchases')
                .insert(purchaseData);

            if (purchaseError) {
                 // Prüfe auf Unique Constraint Violation (kann durch DB-Regel oder Race Condition auftreten)
                 if (purchaseError.code === '23505') {
                     console.warn(`[Webhook] Kauf für PayPal Order ${paypalOrderId} konnte nicht gespeichert werden (DB-Eintrag existiert bereits - Idempotenz oder Race Condition?). Capture war ${captureResult.status}.`);
                     // Sende 200 OK, da die Zahlung (vermutlich) erfolgt ist und der Zustand konsistent ist.
                     return NextResponse.json({ received: true, status: 'db_duplicate_after_capture' });
                 } else {
                     // Anderer DB-Fehler nach erfolgreichem Capture
                     console.error(`[Webhook] Kritisch: Fehler beim Speichern des Kaufs für User ${userId}, Paket ${packageId} (Order ${paypalOrderId}) NACH Capture (${captureResult.status}):`, purchaseError);
                     // Sende 500, um auf das Problem aufmerksam zu machen. Manueller Eingriff könnte nötig sein.
                     return NextResponse.json({ error: `Fehler beim Speichern des Kaufs nach Capture: ${purchaseError.message}` }, { status: 500 });
                 }
            } else {
                 // Erfolgreich gespeichert
                 console.log(`[Webhook] PayPal Kauf erfolgreich gespeichert für User ${userId}, Paket ${packageId}, Order ${paypalOrderId}. Capture-Status: ${captureResult.status}`);
            }

            // Optional: Willkommens-E-Mail senden, wenn der Nutzer gerade erst eingeladen wurde
            // if (userJustInvited) {
            //     try {
            //         await sendWelcomeEmail(payerEmail, /* optional: Name */);
            //         console.log(`[Webhook] Willkommens-E-Mail gesendet an ${payerEmail} für Order ${paypalOrderId}.`);
            //     } catch (emailError) {
            //         console.error(`[Webhook] Fehler beim Senden der Willkommens-E-Mail an ${payerEmail} (Order ${paypalOrderId}):`, emailError);
            //         // Nicht kritisch für den Kaufprozess, nur loggen.
            //     }
            // }

        } catch (processingError) {
            // Fange alle übergreifenden Fehler aus Schritten A, B, C, D ab
            console.error(`[Webhook] Allgemeiner Fehler bei der Verarbeitung des CHECKOUT.ORDER.APPROVED für Order ${paypalOrderId}:`, processingError instanceof Error ? processingError.message : processingError);
            // Sende 500, um auf den Fehler hinzuweisen
            return NextResponse.json({ error: `Webhook processing error: ${processingError.message || 'Unknown processing error'}` }, { status: 500 });
        }

    // ====================================
    //      PAYMENT.CAPTURE.COMPLETED
    // ====================================
    } else if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        const capture = event.resource;
        const orderIdFromCapture = capture.supplementary_data?.related_ids?.order_id;
        console.log(`[Webhook] Empfangen: PAYMENT.CAPTURE.COMPLETED für Capture ID ${capture.id}` + (orderIdFromCapture ? `, zugehörige Order ID ${orderIdFromCapture}` : ''));

        // Optional: Aktualisiere den Status in der Datenbank, falls er vorher PENDING war oder zur Sicherheit.
        if (orderIdFromCapture) {
            try {
                const { error: updateError } = await supabaseAdmin
                    .from('user_purchases')
                    .update({ paypal_capture_status: 'COMPLETED' }) // Setze explizit auf COMPLETED
                    .match({ transaction_id: orderIdFromCapture, payment_provider: 'paypal' }); // Stelle sicher, dass es der PayPal-Eintrag ist

                if (updateError) {
                    // Logge Fehler, aber sende trotzdem 200 OK an PayPal
                    console.error(`[Webhook] Fehler beim Aktualisieren des Status für PAYMENT.CAPTURE.COMPLETED (Order ${orderIdFromCapture}):`, updateError);
                } else {
                    console.log(`[Webhook] Capture-Status für Order ${orderIdFromCapture} in DB auf COMPLETED aktualisiert.`);
                }
            } catch (dbError) {
                 console.error(`[Webhook] DB-Exception beim Aktualisieren des Status für PAYMENT.CAPTURE.COMPLETED (Order ${orderIdFromCapture}):`, dbError);
            }
        } else {
             console.warn(`[Webhook] PAYMENT.CAPTURE.COMPLETED Event ohne zugehörige Order ID in supplementary_data empfangen (Capture ID: ${capture.id}). Status kann nicht automatisch aktualisiert werden.`);
        }

    // ====================================
    //      PAYMENT.CAPTURE.DENIED
    // ====================================
    } else if (event.event_type === 'PAYMENT.CAPTURE.DENIED') {
        const capture = event.resource;
        const orderIdFromCapture = capture.supplementary_data?.related_ids?.order_id;
        const reason = capture.status_details?.reason || 'UNKNOWN';
        console.error(`[Webhook] ALARM: PAYMENT.CAPTURE.DENIED empfangen für Capture ID ${capture.id}` + (orderIdFromCapture ? `, zugehörige Order ID ${orderIdFromCapture}` : '') + `. Grund: ${reason}`);

        // Wichtig: Markiere den Kauf als fehlgeschlagen oder storniert.
        if (orderIdFromCapture) {
             try {
                const { error: updateError } = await supabaseAdmin
                    .from('user_purchases')
                    .update({ paypal_capture_status: `DENIED (${reason})` }) // Speichere den Grund
                    .match({ transaction_id: orderIdFromCapture, payment_provider: 'paypal' });

                if (updateError) {
                    console.error(`[Webhook] Fehler beim Aktualisieren des Status für PAYMENT.CAPTURE.DENIED (Order ${orderIdFromCapture}):`, updateError);
                } else {
                     console.log(`[Webhook] Capture-Status für Order ${orderIdFromCapture} in DB auf DENIED aktualisiert.`);
                }
             } catch (dbError) {
                 console.error(`[Webhook] DB-Exception beim Aktualisieren des Status für PAYMENT.CAPTURE.DENIED (Order ${orderIdFromCapture}):`, dbError);
             }
        } else {
             console.warn(`[Webhook] PAYMENT.CAPTURE.DENIED Event ohne zugehörige Order ID in supplementary_data empfangen (Capture ID: ${capture.id}). Status kann nicht automatisch aktualisiert werden.`);
        }

    } else {
        // Ignoriere andere, für uns nicht relevante Events
        console.log(`[Webhook] Ignoriere PayPal Event-Typ: ${event.event_type}`);
    }

    // 4. Immer 200 OK an PayPal senden, wenn kein unbehandelter Fehler aufgetreten ist
    // Dies bestätigt den Empfang des Webhooks.
    return NextResponse.json({ received: true });
}
