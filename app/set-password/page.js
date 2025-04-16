// app/set-password/page.js
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client'; // Pfad anpassen
import { useRouter } from 'next/navigation'; // Für Weiterleitung

export default function SetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSetPassword = async (event) => {
    event.preventDefault();
    setMessage('');

    if (password !== confirmPassword) {
      setMessage('Die Passwörter stimmen nicht überein.');
      return;
    }
    if (password.length < 6) {
       setMessage('Das Passwort muss mindestens 6 Zeichen lang sein.');
       return;
    }

    setIsLoading(true);

    // WICHTIG: Hier updateUser verwenden, da der Nutzer durch den Link/Token bereits authentifiziert ist
    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      console.error('Fehler beim Passwort setzen:', error);
      setMessage(`Fehler: ${error.message}`);
    } else {
      setMessage('Passwort erfolgreich gesetzt! Sie werden zum Login weitergeleitet...');
      // Weiterleitung zum Login nach kurzer Verzögerung
      setTimeout(() => {
        router.push('/login'); // Oder direkt zur 'Meine Prompts' Seite? '/meine-prompts'
      }, 2000);
    }
    setIsLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Passwort festlegen</h2>
      <p>Bitte legen Sie Ihr Passwort fest, um Ihr Konto zu aktivieren.</p>
      <form onSubmit={handleSetPassword}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Neues Passwort:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
         <div style={{ marginBottom: '15px' }}>
          <label htmlFor="confirmPassword" style={{ display: 'block', marginBottom: '5px' }}>Passwort bestätigen:</label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        {message && <p style={{ color: message.includes('Fehler') ? 'red' : 'green' }}>{message}</p>}
        <button
          type="submit"
          disabled={isLoading}
          style={{ padding: '10px 15px', cursor: 'pointer', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {isLoading ? 'Speichere...' : 'Passwort festlegen'}
        </button>
      </form>
    </div>
  );
}