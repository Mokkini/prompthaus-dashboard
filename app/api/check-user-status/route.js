// app/api/check-user-status/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// WICHTIG: Sicherstellen, dass diese Umgebungsvariablen gesetzt sind!
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request) {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase URL oder Service Key nicht konfiguriert.');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  let email;
  try {
    const body = await request.json();
    email = body.email;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email provided' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Initialisiere den Admin-Client NUR für diese Serverless Function
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log(`[Check User Status API] Searching for email: ${email}`); // Logging hinzugefügt
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ email: email });
     // Alternativ, wenn 'email' Filter nicht zuverlässig: listUsers() ohne Filter und dann im Array suchen.
     // const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
     // const foundUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (listError) {
      console.error('[Check User Status API] Error listing users:', listError);
      // Supabase gibt manchmal Fehler zurück, die wir ignorieren wollen (z.B. bei sehr vielen Usern und Paging)
      // Hier einfache Fehlerbehandlung: Im Zweifel Registrierung erlauben? Oder Fehler werfen?
      // Vorsichtiger Ansatz: Fehler zurückgeben
       return NextResponse.json({ error: 'Error checking user status' }, { status: 500 });
    }

    const foundUser = users && users.length > 0 ? users[0] : null; // Sicherstellen, dass wir nur den ersten Treffer nehmen

    if (!foundUser) {
       console.log(`[Check User Status API] Email ${email} not found.`);
      return NextResponse.json({ status: 'not_found' });
    } else {
      // Prüfe, ob der User bestätigt ist (ein Datum hat) oder nur eingeladen (kein Datum)
      if (foundUser.email_confirmed_at) {
         console.log(`[Check User Status API] Email ${email} found and confirmed.`);
        return NextResponse.json({ status: 'confirmed' });
      } else {
         console.log(`[Check User Status API] Email ${email} found but invited (not confirmed).`);
        return NextResponse.json({ status: 'invited' });
      }
    }

  } catch (error) {
    console.error('[Check User Status API] General error:', error);
    return NextResponse.json({ error: 'Internal server error while checking status' }, { status: 500 });
  }
}