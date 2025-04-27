// app/auth/actions.js
'use server';

import { createClient } from '@/lib/supabase/server'; // Für die Interaktion mit Supabase
import { redirect } from 'next/navigation'; // Für Weiterleitungen (z.B. nach Logout oder Login)

// ======= Funktion: updatePassword =======
export async function updatePassword(newPassword) {
  const supabase = createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Update Password Error: User not authenticated');
    return { success: false, error: 'Authentifizierung fehlgeschlagen. Bitte neu einloggen.' };
  }

  if (!newPassword || newPassword.length < 6) {
      console.error('Update Password Error: Password too short for user:', user.email);
      return { success: false, error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' };
  }

  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    console.error('Supabase Update Password Error:', error.message);
    return { success: false, error: 'Passwort konnte nicht geändert werden. Bitte versuche es erneut.' };
  }

  console.log("Passwort erfolgreich geändert für User:", user.email);
  // Flag entfernen, falls vorhanden
  if (user.user_metadata?.needs_password_setup) {
      console.log("Entferne needs_password_setup Flag für User:", user.email);
      supabase.auth.updateUser({ data: { needs_password_setup: false } })
        .then(({ error: flagError }) => {
            if (flagError) console.error("Fehler beim Entfernen des needs_password_setup Flags:", flagError.message);
        });
  }

  return { success: true, error: null };
}

// ======= Funktion: login =======
export async function login(formData) {
  const email = formData.get('email');
  const password = formData.get('password');
  const supabase = createClient();

  if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return { success: false, message: 'Ungültige E-Mail oder Passwort.' };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error('Login Action Error:', signInError);
    if (signInError.message.includes('Invalid login credentials')) {
        return { success: false, message: 'Ungültige E-Mail oder Passwort.' };
    }
    return { success: false, message: 'Login fehlgeschlagen. Bitte versuche es erneut.' };
  }

    // Nach erfolgreichem Login den User holen, um Weiterleitung zu bestimmen
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();

     if (getUserError || !user) {
       console.error('Error getting user after login:', getUserError);
       // Fallback: Wenn User nicht geholt werden kann, zur Startseite
       return { success: true, redirectTo: '/' };
     }

     // Prüfen, ob Passwort gesetzt werden muss
     if (user.user_metadata?.needs_password_setup === true) {
         console.log('User needs password setup, redirecting to /passwort-festlegen');
         return { success: true, redirectTo: '/passwort-festlegen' };
     }

     // Prüfen, ob Admin
     if (process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL) {
       console.log('Admin login detected, redirecting to /admin/prompts');
       return { success: true, redirectTo: '/admin/prompts' };
     } else {
       // Regulärer User
       console.log('Regular user login detected, redirecting to /meine-prompts');
       return { success: true, redirectTo: '/meine-prompts' };
     }
}

// ======= Funktion: logout =======
export async function logout() {
  const supabase = createClient();
  console.log('Logout Action wird ausgeführt...');
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Logout Action Error:', error);
  } else {
    console.log('Logout erfolgreich.');
  }
  // Immer zur Login-Seite weiterleiten nach dem Logout
  return redirect('/login');
}
