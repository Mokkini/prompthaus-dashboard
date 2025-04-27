// app/actions.js - Nur noch mit allgemeinen Server Actions

'use server';

// ======= Imports =======
// Nur noch der Client für die User-Authentifizierung in sendEmailApi
import { createClient } from '@/lib/supabase/server';

// --- Keine Prompt-spezifischen Imports, Konstanten oder Hilfsfunktionen mehr ---


// ======= E-Mail Action =======

// --- Funktion: sendEmailApi ---
// Diese Funktion bleibt hier, da sie allgemeiner ist
export async function sendEmailApi(payload) {
  console.log("Server Action 'sendEmailApi' aufgerufen mit Payload:", payload);
  const { to, subject, textBody, htmlBody } = payload; // htmlBody ist optional

  // 1. Authentifizierung (Prüfen, ob der User eingeloggt ist)
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht authentifiziert." };

  // 2. Validierung der Eingaben
  if (!to || !subject || !textBody) {
    return { error: "Empfänger, Betreff und Text sind erforderlich." };
  }

  // 3. E-Mail-Versand über Brevo (Sendinblue)
  if (!process.env.BREVO_API_KEY) {
      console.error("BREVO_API_KEY fehlt in .env.local");
      return { error: "Server-Konfigurationsfehler (E-Mail)." };
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@prompthaus.de'; // Fallback
  const senderName = process.env.BREVO_SENDER_NAME || 'PromptHaus'; // Fallback

  try {
    console.log(`Versende E-Mail an: ${to} via Brevo`);
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'accept': 'application/json',
            'api-key': process.env.BREVO_API_KEY,
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            sender: { name: senderName, email: senderEmail },
            to: [{ email: to }], // Brevo erwartet ein Array
            subject: subject,
            textContent: textBody,
            // Einfaches HTML als Fallback, falls kein htmlBody übergeben wird
            htmlContent: htmlBody || `<p>${textBody.replace(/\n/g, '<br>')}</p>`
        })
    });

    // Fehlerbehandlung für die Brevo API-Antwort
    if (!response.ok) {
        const errorData = await response.json();
        console.error("Brevo API Fehler:", errorData);
        throw new Error(`Brevo Fehler: ${errorData.message || response.statusText}`);
    }

    const responseData = await response.json();
    console.log("Brevo API Erfolg:", responseData);
    return { success: true }; // Erfolg zurückgeben

  } catch (emailError) {
    console.error("Fehler beim E-Mail-Versand via Brevo:", emailError);
    // Detailliertere Fehlermeldung zurückgeben
    return { error: `E-Mail konnte nicht gesendet werden: ${emailError.message}` };
  }
}

// Hier könnten später weitere allgemeine Server Actions hinzukommen
// (z.B. für User-Profil-Updates, etc.)
