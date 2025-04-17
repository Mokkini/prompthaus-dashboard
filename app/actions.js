// app/actions.js
'use server'; // Definiert, dass alle Funktionen in dieser Datei Server Actions sind

import { createClient } from '@/lib/supabase/server'; // Dein Supabase Pfad
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation'; // Wird in login nicht mehr für Erfolg genutzt, aber evtl. in anderen Actions
import { headers } from 'next/headers'; // Wird für formData in login gebraucht

// Funktion zum Ändern des Passworts (deine bestehende Funktion)
export async function updatePassword(newPassword) {
  const supabase = createClient();

  // Prüfen, ob der User überhaupt eingeloggt ist
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Update Password Error: User not authenticated');
    return { success: false, error: 'Authentifizierung fehlgeschlagen. Bitte neu einloggen.' };
  }

  // Versuche, das Passwort zu aktualisieren
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Supabase Update Password Error:', error.message);
    return { success: false, error: 'Passwort konnte nicht geändert werden. Grund: ' + error.message };
  }

  // Erfolgreich!
  return { success: true, error: null };
}


// *** NEUE Funktion für den Login ***
export async function login(formData) {
  const email = formData.get('email');
  const password = formData.get('password');
  const supabase = createClient();

  // Versuche den Login
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Bei Login-Fehler: Fehlermeldung zurückgeben
  if (signInError) {
    console.error('Login Action Error:', signInError);
    return { success: false, message: 'Login fehlgeschlagen: ' + signInError.message };
  }

  // Login war erfolgreich! Jetzt User holen.
  const { data: { user }, error: getUserError } = await supabase.auth.getUser();

  // Falls User holen fehlschlägt (sollte nicht passieren)
  if (getUserError || !user) {
      console.error('Error getting user after login:', getUserError);
      // Fallback: Zur normalen Startseite (oder Fehler zurückgeben)
      return { success: true, redirectTo: '/' };
  }

  // Prüfen, ob Admin (Umgebungsvariable!)
  if (user.email === process.env.ADMIN_EMAIL) {
    // Admin -> Ziel Admin-Seite zurückgeben
    console.log('Admin login detected, redirecting to /admin/prompts');
    return { success: true, redirectTo: '/admin/prompts' };
  } else {
    // Normaler User -> Ziel Startseite zurückgeben
    console.log('Regular user login detected, redirecting to /');
    return { success: true, redirectTo: '/' };
  }
}

// Hier könnten später weitere Server Actions hinzukommen...