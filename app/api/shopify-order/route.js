// app/api/shopify-order/route.js
import { NextResponse } from 'next/server';
import crypto from 'crypto'; // Node.js Modul für Kryptographie

// Supabase Client für Datenbankoperationen
import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const shopifySecret = process.env.SHOPIFY_WEBHOOK_SECRET;

  if (!shopifySecret) {
    console.error('Shopify Webhook Secret nicht konfiguriert.');
    return NextResponse.json({ error: 'Internal Server Configuration Error' }, { status: 500 });
  }

  // Nur EIN try...catch Block für die gesamte Logik
  try {
    // 1. Verifizierung der Shopify Signatur
    const hmacHeader = request.headers.get('X-Shopify-Hmac-Sha256');
    const rawBody = await request.text(); // Raw Body für HMAC und späteres Parsen

    if (!hmacHeader) {
      console.warn('Webhook ohne HMAC Header empfangen.');
      return NextResponse.json({ error: 'Unauthorized - Missing HMAC Header' }, { status: 401 });
    }

    // Erzeuge den Hash
    const calculatedHmac = crypto
      .createHmac('sha256', shopifySecret)
      .update(rawBody, 'utf8')
      .digest('base64');

    // Vergleiche sicher
    const trusted = Buffer.from(calculatedHmac, 'base64');
    const untrusted = Buffer.from(hmacHeader, 'base64');
    if (trusted.length !== untrusted.length || !crypto.timingSafeEqual(trusted, untrusted)) {
        console.warn('Ungültige HMAC Signatur.');
        return NextResponse.json({ error: 'Unauthorized - Invalid Signature' }, { status: 401 });
    }

    // Wenn wir hier sind, ist die Anfrage verifiziert!
    console.log('Shopify Webhook erfolgreich verifiziert.');

    // 2. Verarbeite die Daten
    const orderData = JSON.parse(rawBody);
    console.log('Empfangene Bestelldaten (Auszug):', {
        order_id: orderData.id,
        email: orderData.customer?.email,
        customer_id: orderData.customer?.id,
        line_items_count: orderData.line_items?.length
    });

    // 3. Finde/Erstelle Customer in 'customers' Tabelle
    const customerInfo = orderData.customer;
    let customerId = null;
    let existingAuthUserId = null;

    if (customerInfo && customerInfo.email) {
      const customerEmailLower = customerInfo.email.toLowerCase();
      const shopifyCustomerIdStr = String(customerInfo.id);
      const customerName = `${customerInfo.first_name || ''} ${customerInfo.last_name || ''}`.trim() || null;

      console.log(`Verarbeite Kunden: ${customerEmailLower}, Shopify ID: ${shopifyCustomerIdStr}`);

      const { data: customerData, error: customerError } = await supabaseAdmin
        .from('customers')
        .upsert(
          {
            email: customerEmailLower,
            shopify_customer_id: shopifyCustomerIdStr,
            name: customerName
          },
          {
            onConflict: 'email', // Konflikt basierend auf E-Mail lösen
            ignoreDuplicates: false,
          }
        )
        .select('id, auth_user_id')
        .single();

      if (customerError) {
        console.error('Fehler beim Upsert des Kunden:', customerError);
        return NextResponse.json({ error: 'Fehler bei Kundenverarbeitung' }, { status: 500 });
      }

      if (customerData) {
        customerId = customerData.id;
        existingAuthUserId = customerData.auth_user_id;
        console.log(`Kunde verarbeitet. Customer ID: ${customerId}, Bereits mit AuthUser verknüpft: ${!!existingAuthUserId}`);
      } else {
          console.error('Kunde konnte nicht upgeserted werden, keine Daten zurückgegeben.');
          return NextResponse.json({ error: 'Fehler bei Kundenverarbeitung nach Upsert' }, { status: 500 });
      }

      // === START: ANGEPASSTE Logik für User-Verknüpfung / Einladung (mit manuellem Filter) ===
      // 4. Versuche 'auth_user_id' zu finden ODER User einzuladen (nur wenn noch nicht verknüpft)
      if (customerId && !existingAuthUserId) {
        console.log(`Prüfe/Invitiere Auth User für ${customerEmailLower}...`);
        try {
          // --- GEÄNDERTER TEIL START ---
          // Prüfen, ob User mit dieser E-Mail bereits existiert - JETZT MIT MANUELLEM FILTER
          console.log(`[Webhook Debug] Rufe listUsers OHNE E-Mail-Filter auf für E-Mail: ${customerEmailLower}`);
          // HINWEIS: Bei SEHR vielen Usern (>1000) müsste hier Paginierung eingebaut werden.
          const { data: { users: allUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers(); // Standardaufruf ohne Filter

          console.log(`[Webhook Debug] Ergebnis von listUsers OHNE FILTER (Anzahl User geprüft: ${allUsers?.length ?? 0}):`, listError ? `Fehler: ${listError.message}` : 'Kein Fehler');

          // Fehlerbehandlung für den listUsers Aufruf
          if (listError) {
              console.error('Fehler beim Abrufen der Benutzerliste via listUsers:', listError);
              // Hier sollten wir wahrscheinlich abbrechen, da wir den Status nicht sicher prüfen können.
              return NextResponse.json({ error: 'Fehler bei der Benutzerprüfung' }, { status: 500 });
          }

          // ----> HIER DER MANUELLE FILTER <----
          const users = allUsers?.filter(u => u.email?.toLowerCase() === customerEmailLower.toLowerCase());
          console.log(`[Webhook Debug] Ergebnis nach manuellem Filter für ${customerEmailLower}:`, JSON.stringify({ users }, null, 2)); // Logge das gefilterte Ergebnis
          // --- GEÄNDERTER TEIL ENDE ---


          if (users && users.length > 0) {
            // USER EXISTIERT BEREITS -> Nur verknüpfen (Logik bleibt gleich)
            const authUserId = users[0].id;
            console.log(`Auth User existiert bereits: ${authUserId}. Verknüpfe mit Customer ID ${customerId}...`);
            const { error: updateError } = await supabaseAdmin
              .from('customers')
              .update({ auth_user_id: authUserId })
              .eq('id', customerId);
            // HINWEIS: Der 'duplicate key' Fehler wird hier immer noch auftreten, wenn dieser Auth User *bereits* mit einem *anderen* Customer verknüpft ist!
            // Das ist aber korrektes Verhalten, um Datenkonsistenz zu wahren.
            if (updateError) { console.error('Fehler beim Verknüpfen des existierenden Auth Users:', updateError); }
             else { console.log('Existierender Auth User erfolgreich verknüpft.'); }
          } else {
            // USER EXISTIERT NICHT -> Einladen! (Logik bleibt gleich)
            console.log(`Kein Auth User gefunden (nach manuellem Filter). Lade ${customerEmailLower} ein...`);
            // Doku checken für inviteUserByEmail Optionen: https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail
            const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
                customerEmailLower,
                {
                  // Optional: Leite den User nach Passwort-Setzen zu einer bestimmten Seite weiter
                  // redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/meine-prompts`
                }
            );

            if (inviteError) {
                console.error('Fehler beim Einladen des Users via inviteUserByEmail:', inviteError);
            } else if (inviteData && inviteData.user) {
                // Wenn inviteUserByEmail den User direkt erstellt, verknüpfe ihn
                const authUserId = inviteData.user.id;
                console.log(`User ${authUserId} durch Einladung erstellt. Verknüpfe sofort...`);
                const { error: updateError } = await supabaseAdmin
                  .from('customers')
                  .update({ auth_user_id: authUserId })
                  .eq('id', customerId);
                if (updateError) { console.error('Fehler beim Verknüpfen des neu eingeladenen Users:', updateError); }
                else {
                    console.log('Neu eingeladener User erfolgreich verknüpft.');
                    // Hier optional die Verifizierung mit getUserById einfügen, falls gewünscht
                }
            } else {
                // Standardfall: Einladung gesendet (oder inviteData enthält keinen User)
                console.log("User-Einladung erfolgreich versendet (E-Mail sollte jetzt rausgehen) ODER inviteData enthielt keinen User.");
            }
          }
        } catch(adminApiError) {
            console.error('Genereller Fehler bei Verwendung der Supabase Admin Auth API:', adminApiError);
        }
      } else if (customerId && existingAuthUserId) {
          console.log("Kunde existiert und ist bereits mit Auth User verknüpft.");
      }
      // === ENDE: Logik ===

    } else {
      console.warn('Keine Kundeninformationen oder E-Mail in Bestelldaten gefunden. Gastbestellung?.');
        return NextResponse.json({ received: true, message: 'Gastbestellung ohne Kunde/Email nicht verarbeitet für Prompts.' }, { status: 200 });
    }

    // --- Gekaufte Prompts verarbeiten (Logik bleibt gleich) ---
    if (customerId && orderData.line_items && orderData.line_items.length > 0) {
      const purchasedSlugs = orderData.line_items
        .map(item => item.sku)
        .filter(sku => sku);

      console.log('Extrahierte SKUs (angenommene Slugs):', purchasedSlugs);

      if (purchasedSlugs.length > 0) {
        console.log('Suche Paket-IDs für Slugs:', purchasedSlugs);
        const { data: packagesData, error: packagesError } = await supabaseAdmin
          .from('prompt_packages')
          .select('id, slug')
          .in('slug', purchasedSlugs);

        if (packagesError) {
          console.error('Fehler beim Suchen der Paket-IDs:', packagesError);
        } else if (packagesData && packagesData.length > 0) {
          console.log('Gefundene Pakete:', packagesData);
          const promptsToGrant = packagesData.map(pkg => ({
            customer_id: customerId,
            prompt_package_id: pkg.id,
          }));

          console.log('Füge Zugriffsrechte hinzu:', promptsToGrant);
          const { error: grantError } = await supabaseAdmin
            .from('customer_prompts')
            .upsert(promptsToGrant, { onConflict: 'customer_id, prompt_package_id' });

          if (grantError && grantError.code !== '23505') {
            console.error('Fehler beim Eintragen der Zugriffsrechte:', grantError);
          } else if (grantError && grantError.code === '23505') {
              console.log('Zugriffsrechte existierten bereits (ignoriert via Upsert).');
          } else {
            console.log('Zugriffsrechte erfolgreich eingetragen/aktualisiert via Upsert.');
          }
        } else {
          console.log('Keine passenden Prompt-Pakete für die gekauften SKUs gefunden.');
        }
      } else {
        console.log('Keine gültigen SKUs in den Line Items gefunden.');
      }
    } else if (!customerId) {
        console.log('Keine Customer ID vorhanden, überspringe Rechtevergabe.');
    } else {
        console.log('Keine Line Items in der Bestellung gefunden.');
    }
    // --- Ende der Verarbeitungslogik ---

    // Erfolgreiche Antwort an Shopify senden
    return NextResponse.json({ received: true }, { status: 200 });

  // Gesamter Catch-Block für die Funktion
  } catch (error) {
    console.error('Schwerwiegender Fehler im Shopify Webhook Handler:', error);
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
        return NextResponse.json({ error: 'Ungültiger JSON Body von Shopify?' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Interner Serverfehler im Webhook' }, { status: 500 });
  }
} // Ende der POST-Funktion