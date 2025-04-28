// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LOGIN_PATH = '/site-login'; // Die Seite, auf der das Passwort eingegeben wird
const SESSION_COOKIE_NAME = 'site-access-granted'; // Name des Cookies

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isDevelopment = process.env.NODE_ENV === 'development';

  // 1. Im Entwicklungsmodus: Immer Zugriff erlauben
  if (isDevelopment) {
    console.log('Middleware: Development mode, access granted.'); // Optional: Logging für Debugging
    return NextResponse.next();
  }

  // 2. Im Produktionsmodus: Prüfen, ob Zugriff benötigt wird
  // Zugriff wird für alles benötigt, AUSSER für die Login-Seite selbst
  // und für interne Next.js-Ressourcen (die im matcher behandelt werden)
  if (pathname === LOGIN_PATH) {
    console.log('Middleware: Accessing login page, allowed.'); // Optional
    return NextResponse.next(); // Zugriff auf Login-Seite immer erlauben
  }

  // 3. Prüfen, ob der Nutzer bereits das Cookie hat (im Produktionsmodus)
  const hasAccessCookie = request.cookies.has(SESSION_COOKIE_NAME);

  if (!hasAccessCookie) {
    // 4. Kein Cookie: Zum Login umleiten
    console.log(`Middleware: No access cookie for ${pathname}, redirecting to login.`); // Optional
    const loginUrl = new URL(LOGIN_PATH, request.url);
    // Optional: Die ursprüngliche URL als Parameter mitgeben, um nach dem Login dorthin zurückzukehren
    loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // 5. Cookie vorhanden: Zugriff erlauben
  console.log(`Middleware: Access cookie found for ${pathname}, access granted.`); // Optional
  return NextResponse.next();
}

// Konfiguration: Stelle sicher, dass die Middleware nur für relevante Pfade läuft
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) - Wichtig, damit deine API-Endpunkte funktionieren
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /login (die Login-Seite selbst, wird oben im Code behandelt, aber sicherheitshalber auch hier ausschließen)
     * Füge hier ggf. weitere öffentliche Pfade hinzu (z.B. /public/*, /images/*)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login).*)',
  ],
};
