// middleware.js
import { NextResponse } from 'next/server';
// import { NextRequest } from 'next/server'; // Typisierung ist optional, kann weggelassen werden
import { updateSession } from '@/utils/supabase/middleware'; // Pfad zu deiner Supabase Middleware-Funktion

// --- Basic Auth Konfiguration ---
// Definiere den Benutzernamen und das Passwort (aus Umgebungsvariablen!)
const BASIC_AUTH_USERNAME = process.env.BASIC_AUTH_USERNAME;
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD;
const REALM = "Secure Area"; // Name des geschützten Bereichs (im Browser-Popup sichtbar)

export async function middleware(request) { // Typisierung ': NextRequest' ist optional
  const { pathname } = request.nextUrl;

  // --- Pfade, die IMMER öffentlich sein sollen (kein Basic Auth, keine Session nötig?) ---
  // Passe diese Liste genau an deine Bedürfnisse an!
  const publicPaths = [
    '/api/auth/', // Supabase Auth Routen (Login, Callback etc.)
    '/api/webhooks/', // Eventuelle Webhooks
    '/_next/static/',
    '/_next/image/',
    '/favicon.ico',
    '/public/', // Alle Dateien im public Ordner
    '/sitemap.xml',
    '/robots.txt',
    // Füge hier weitere Pfade hinzu, die *niemals* geschützt werden sollen
  ];

  // Prüfen, ob der Pfad komplett öffentlich ist
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (isPublicPath) {
    // Für komplett öffentliche Pfade: Weder Basic Auth noch Session Update nötig?
    // Oder vielleicht doch Session Update für bestimmte API-Routen? -> Dann hier `updateSession` aufrufen
    // console.log(`Middleware: Skipping public path ${pathname}`);
    return NextResponse.next(); // Direkt weiterleiten
  }

  // --- Basic Authentication (nur wenn konfiguriert) ---
  const basicAuthEnabled = BASIC_AUTH_USERNAME && BASIC_AUTH_PASSWORD;

  if (basicAuthEnabled) {
    const basicAuthHeader = request.headers.get('authorization');

    if (basicAuthHeader) {
      try {
        const authValue = basicAuthHeader.split(' ')[1];
        const [user, pwd] = atob(authValue).split(':'); // atob() ist in Edge Runtime verfügbar

        if (user === BASIC_AUTH_USERNAME && pwd === BASIC_AUTH_PASSWORD) {
          // Basic Auth erfolgreich -> Session aktualisieren und weiter
          // console.log(`Middleware: Basic Auth successful for ${pathname}`);
          return await updateSession(request);
        }
      } catch (e) {
        console.error("Error decoding Basic Auth header:", e);
        // Fehler beim Dekodieren -> Auth fehlgeschlagen
      }
    }

    // Basic Auth fehlgeschlagen oder nicht vorhanden -> 401 senden
    // console.log(`Middleware: Basic Auth failed or required for ${pathname}`);
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': `Basic realm="${REALM}"`,
      },
    });
  }

  // --- Wenn Basic Auth nicht aktiviert ist oder bereits erfolgreich war ---
  // Führe die Supabase Session Aktualisierung durch
  // console.log(`Middleware: Basic Auth disabled or passed, running updateSession for ${pathname}`);
  return await updateSession(request);
}

// --- Konfiguration des Matchers ---
// Dieser Matcher sollte die meisten statischen Assets und API-Routen ausschließen,
// aber alle Seiten und potenziell geschützte API-Endpunkte einschließen.
// Passe ihn bei Bedarf weiter an.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /public/ (alle öffentlichen Assets)
     * - /sitemap.xml (Sitemap)
     * - /robots.txt (Robots)
     * - /api/auth/ (Supabase Auth Routen) - WICHTIG!
     * - /api/webhooks/ (Beispiel für Webhooks)
     * - .*\\.(?:svg|png|jpg|jpeg|gif|webp)$ (Bilddateien etc.) - Dieser Teil ist oft schon durch die anderen abgedeckt
     *
     * WICHTIG: Der Matcher läuft *vor* der Middleware-Logik.
     * Die `publicPaths`-Liste oben dient zur feineren Steuerung *innerhalb* der Middleware.
     */
    '/((?!_next/static|_next/image|favicon.ico|public|sitemap.xml|robots.txt|api/auth|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
