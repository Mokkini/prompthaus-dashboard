// components/AuthButton.js
"use client";

// Pfad anpassen, falls dein 'lib' Ordner woanders ist oder du Aliase nutzt
import { createClient } from '../lib/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthButton() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const supabase = createClient(); // Client-Instanz holen

  useEffect(() => {
    // Funktion, um initialen Benutzer zu holen
    async function getUserData() {
      // Gibt { data: { user }, error } zurück
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Fehler beim Holen des Benutzers:', error);
      } else {
        setUser(data?.user); // Setze Benutzer oder null
      }
    }

    getUserData(); // Beim ersten Laden aufrufen

    // Listener für Auth-Änderungen (Login, Logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth Event:', event); // Zum Debuggen
        setUser(session?.user ?? null); // Aktualisiere User-State bei Änderung

        // Optional: Weiterleiten bei bestimmten Events
        if (event === 'SIGNED_IN') {
          router.refresh(); // Wichtig, um Server Components neu zu laden
        }
        if (event === 'SIGNED_OUT') {
           router.push('/login'); // Zur Login-Seite nach Logout
           router.refresh();
        }
      }
    );

    // Cleanup-Funktion: Listener entfernen, wenn Komponente unmounted wird
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase, router]); // Abhängigkeiten für useEffect

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Fehler beim Logout:', error);
    }
    // Die Weiterleitung passiert jetzt im onAuthStateChange Listener
  };

  // Bedingte Anzeige basierend auf dem User-Status
  return user ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ fontStyle: 'italic' }}>Hallo, {user.email}</span>
      <button
        onClick={handleLogout}
        style={{ padding: '5px 10px', cursor: 'pointer' }}
        >
        Logout
      </button>
    </div>
  ) : (
    <a href="/login" style={{ padding: '5px 10px', textDecoration: 'underline', color: 'blue' }}>
      Login
    </a>
  );
}