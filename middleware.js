// middleware.js
import { NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

// --- Basic Auth Konfiguration ---
const BASIC_AUTH_USERNAME = process.env.BASIC_AUTH_USERNAME;
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD;
const REALM = "Secure Area";

export async function middleware(request) {
  const { pathname, hostname } = request.nextUrl; // Hostname hinzugefügt

  // --- Pfade, die IMMER öffentlich sein sollen ---
  const publicPaths = [
    '/api/auth/',
    '/api/webhooks/',
    '/_next/static/',
    '/_next/image/',
    '/favicon.ico',
    '/public/',
    '/sitemap.xml',
    '/robots.txt',
  ];

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (isPublicPath) {
    // console.log(`Middleware: Skipping public path ${pathname}`);
    return NextResponse.next();
  }

  // --- Basic Authentication (nur wenn konfiguriert UND NICHT localhost) ---
  const basicAuthEnabled = BASIC_AUTH_USERNAME && BASIC_AUTH_PASSWORD;
  const isDevelopment = hostname === 'localhost'; // Prüfen, ob auf localhost zugegriffen wird

  // Basic Auth nur anwenden, wenn aktiviert UND NICHT im lokalen Development
  if (basicAuthEnabled && !isDevelopment) {
    const basicAuthHeader = request.headers.get('authorization');

    if (basicAuthHeader) {
      try {
        const authValue = basicAuthHeader.split(' ')[1];
        const [user, pwd] = atob(authValue).split(':');

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
    // console.log(`Middleware: Basic Auth failed or required for ${pathname} (not on localhost)`);
    return new Response('Authentication required', {
      status: 401,
      headers: {
        'WWW-Authenticate': `Basic realm="${REALM}"`,
      },
    });
  }

  // --- Wenn Basic Auth nicht aktiviert ist ODER wir auf localhost sind ODER Basic Auth bereits erfolgreich war ---
  // Führe die Supabase Session Aktualisierung durch
  // console.log(`Middleware: Basic Auth disabled or running on localhost or passed, running updateSession for ${pathname}`);
  return await updateSession(request);
}

// --- Konfiguration des Matchers ---
// (Bleibt unverändert)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public|sitemap.xml|robots.txt|api/auth|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
