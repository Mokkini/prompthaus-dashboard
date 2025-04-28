// app/site-login/actions.js
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const SESSION_COOKIE_NAME = 'site-access-granted';

// Typ-Annotationen (: FormData, : string) entfernt
export async function handleSiteLogin(formData, redirectUrl) {
  // Type Assertion (as string) entfernt
  const password = formData.get('password');
  const correctPassword = process.env.SITE_WIDE_PASSWORD;

  // Überprüfen, ob das Passwort gesetzt ist (wichtig!)
  if (!correctPassword) {
    console.error('SITE_WIDE_PASSWORD ist nicht in den Umgebungsvariablen gesetzt!');
    // Es ist gut, hier einen generischen Fehler zurückzugeben
    return { error: 'Server-Konfigurationsfehler. Bitte Administrator kontaktieren.' };
  }

  // Einfacher Passwortvergleich (funktioniert in JS auch ohne explizite Typumwandlung)
  if (password === correctPassword) {
    // Passwort korrekt: Cookie setzen
    cookies().set(SESSION_COOKIE_NAME, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // Gültigkeit: 7 Tage
      sameSite: 'lax', // Schutz gegen CSRF
    });
    // Zum ursprünglichen Ziel oder zur Startseite umleiten
    console.log(`Login successful, redirecting to: ${redirectUrl}`);
    // redirect() wirft einen Fehler, um den Request-Flow zu ändern, kein 'return' nötig
    redirect(redirectUrl);
  } else {
    // Passwort falsch
    console.log('Login failed: Incorrect password');
    return { error: 'Falsches Passwort.' };
  }
}
