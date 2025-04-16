// middleware.js
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server'; // <-- OHNE 'type' Schlüsselwort
import { updateSession } from '@/utils/supabase/middleware'; // <-- Pfad prüfen!

export async function middleware(request) { // <-- OHNE ': NextRequest' Typisierung
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};