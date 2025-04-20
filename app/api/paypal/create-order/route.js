// app/api/paypal/create-order/route.js
import { NextResponse } from 'next/server';

// Helper Funktion, um den PayPal Access Token zu holen
async function getPayPalAccessToken() {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const appSecret = process.env.PAYPAL_APP_SECRET;
    const basicAuth = Buffer.from(`${clientId}:${appSecret}`).toString('base64');
    const url = `${process.env.PAYPAL_API_BASE_URL}/v1/oauth2/token`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-Language': 'en_US',
                'Authorization': `Basic ${basicAuth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
            cache: 'no-store' // Wichtig, damit der Token nicht gecached wird und immer neu geholt wird, wenn nötig (oder implementiere Caching Logik)
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("PayPal Auth Error Response:", errorData);
            throw new Error(`Fehler beim Holen des PayPal Tokens: ${response.statusText}`);
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("Fehler in getPayPalAccessToken:", error);
        throw error; // Fehler weiterwerfen
    }
}

// Die eigentliche POST Handler Funktion
export async function POST(request) {
    try {
        // 1. Daten aus dem Request Body holen (vom Frontend gesendet)
        const { packageId, packageName, packagePrice, packageSlug } = await request.json();

        // Validierung (einfach)
        if (!packageId || !packageName || typeof packagePrice !== 'number' || packagePrice <= 0 || !packageSlug) {
            return NextResponse.json({ error: 'Ungültige Paketdaten übermittelt.' }, { status: 400 });
        }

        // 2. PayPal Access Token holen
        const accessToken = await getPayPalAccessToken();

        // 3. PayPal Order Payload erstellen
        const url = `${process.env.PAYPAL_API_BASE_URL}/v2/checkout/orders`;
        const orderPayload = {
            intent: 'CAPTURE', // Wichtig: 'CAPTURE' bedeutet, dass das Geld direkt eingezogen wird
            purchase_units: [{
                // reference_id: packageId, // Eigene Referenz-ID (optional, aber nützlich)
                description: `Kauf: ${packageName}`, // Beschreibung für den Kunden
                amount: {
                    currency_code: 'EUR', // Währung anpassen, falls nötig
                    value: packagePrice.toFixed(2), // Preis auf 2 Nachkommastellen formatieren
                    breakdown: { // Optional: Detaillierte Aufschlüsselung
                        item_total: {
                            currency_code: 'EUR',
                            value: packagePrice.toFixed(2),
                        }
                    }
                },
                items: [{ // Optional: Artikeldetails (gut für die Übersicht des Kunden)
                    name: packageName,
                    // sku: packageId, // Artikelnummer (optional)
                    unit_amount: {
                        currency_code: 'EUR',
                        value: packagePrice.toFixed(2),
                    },
                    quantity: '1',
                    // description: `Details zum Paket ${packageName}` // Längere Beschreibung (optional)
                }],
                // Wichtig für den Webhook später: Eigene Daten mitsenden
                custom_id: JSON.stringify({ packageId: packageId, packageSlug: packageSlug /*, userId: 'USER_ID_FALLS_BEKANNT' */ }), // Eigene Daten als JSON-String
            }],
            // Optional: URLs für Weiterleitung nach Erfolg/Abbruch direkt von PayPal (oft besser im Frontend gehandhabt)
            // application_context: {
            //     return_url: 'http://localhost:3000/payment/success?provider=paypal',
            //     cancel_url: `http://localhost:3000/checkout/${packageSlug}?provider=paypal&status=cancelled`,
            //     brand_name: 'PromptHaus', // Dein Shop-Name
            //     user_action: 'PAY_NOW', // Text auf dem finalen PayPal-Button
            // }
        };

        // 4. Bestellung bei PayPal erstellen
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                // 'PayPal-Request-Id': `unique-request-id-${Date.now()}` // Optional: Eindeutige ID für Debugging
            },
            body: JSON.stringify(orderPayload),
        });

        const responseData = await response.json();

        if (!response.ok) {
            console.error("PayPal Create Order Error Response:", responseData);
            const errorMessage = responseData.details?.[0]?.description || responseData.message || `PayPal API Fehler: ${response.statusText}`;
            throw new Error(errorMessage);
        }

        // 5. Order ID zurückgeben
        if (!responseData.id) {
             console.error("Keine Order ID von PayPal erhalten:", responseData);
             throw new Error("Konnte keine PayPal Order ID erstellen.");
        }

        console.log("PayPal Order erstellt:", responseData.id);
        return NextResponse.json({ orderID: responseData.id });

    } catch (error) {
        console.error("Fehler in POST /api/paypal/create-order:", error);
        return NextResponse.json({ error: error.message || 'Interner Serverfehler beim Erstellen der PayPal-Bestellung.' }, { status: 500 });
    }
}
