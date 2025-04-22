// app/api/send-email/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server'; // Für die Benutzerauthentifizierung
import * as SibApiV3Sdk from '@getbrevo/brevo';

export async function POST(request) {
  console.log("API route /api/send-email wurde aufgerufen.");

  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // 1. Authentifizierung prüfen
  if (userError || !user) {
    console.error("Send Email API: Nicht authentifiziert.");
    return NextResponse.json({ error: 'Authentifizierung fehlgeschlagen.' }, { status: 401 });
  }
  console.log(`Send Email API: Authentifiziert als ${user.email}`);

  let recipientEmail;
  let subject;
  let emailText;

  // 2. Anfragedaten lesen und validieren
  try {
    const body = await request.json();
    recipientEmail = body.recipientEmail;
    subject = body.subject || 'Dein generierter Text von PromptHaus'; // Standardbetreff
    emailText = body.emailText;

    if (!recipientEmail || typeof recipientEmail !== 'string' || !recipientEmail.includes('@')) {
      return NextResponse.json({ error: 'Ungültige Empfänger-E-Mail-Adresse.' }, { status: 400 });
    }
    if (!emailText || typeof emailText !== 'string') {
      return NextResponse.json({ error: 'Kein Text zum Senden vorhanden.' }, { status: 400 });
    }
  } catch (error) {
    console.error("Send Email API: Fehler beim Parsen des Request Body:", error);
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
  }

  // 3. Brevo API konfigurieren
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'PromptHaus';

  if (!apiKey || !senderEmail) {
    console.error("Send Email API: Brevo API Key oder Absender-E-Mail fehlt in der Konfiguration.");
    return NextResponse.json({ error: 'Server-Konfigurationsfehler.' }, { status: 500 });
  }

  let apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
  apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, apiKey);

  // 4. E-Mail-Objekt erstellen
  let sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = `<p>${emailText.replace(/\n/g, '<br>')}</p>`; // Einfache HTML-Formatierung
  sendSmtpEmail.sender = { name: senderName, email: senderEmail };
  sendSmtpEmail.to = [{ email: recipientEmail }];
  // Optional: CC, BCC, ReplyTo etc. hinzufügen
  // sendSmtpEmail.cc = [{ email: "example2@example2.com", name: "Janice Doe" }];
  // sendSmtpEmail.bcc = [{ email: "example@example.com", name: "John Doe" }];
  // sendSmtpEmail.replyTo = { email: "replyto@domain.com", name: "John Doe" };

  // 5. E-Mail senden
  try {
    console.log(`Send Email API: Sende E-Mail an ${recipientEmail}...`);
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Send Email API: Brevo API-Antwort:', data);
    return NextResponse.json({ success: true, message: 'E-Mail erfolgreich versendet.' });
  } catch (error) {
    console.error("Send Email API: Fehler beim Senden über Brevo:", error.response?.body || error.message || error);
    // Versuche, eine spezifischere Fehlermeldung von Brevo zu extrahieren
    const brevoError = error.response?.body?.message || error.message || 'Unbekannter Fehler beim E-Mail-Versand.';
    return NextResponse.json({ error: `Fehler beim Senden der E-Mail: ${brevoError}` }, { status: 500 });
  }
}
