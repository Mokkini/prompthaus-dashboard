// app/login/page.js
"use client"; // Wichtig: Diese Komponente interagiert mit dem Nutzer -> Client Component

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Korrekter Import für App Router
import { createClient } from '../../lib/supabase/client'; // <-- KORREKTER PFAD

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient(); // Erzeuge Client-Instanz

  const handleLogin = async (event) => {
    event.preventDefault(); // Verhindert Neuladen der Seite bei Formular-Absendung
    setErrorMsg(''); // Fehlermeldung zurücksetzen
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error("Login Fehler:", error.message);
      setErrorMsg(`Login fehlgeschlagen: ${error.message}`);
    } else {
      console.log("Login erfolgreich!");
      // Leite den Benutzer nach erfolgreichem Login weiter
      // Ziel anpassen, z.B. '/meine-prompts' oder '/'
      router.push('/');
      // Optional: router.refresh() um Server Components neu zu laden, falls nötig
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Passwort:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
          />
        </div>
        {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '10px 15px', cursor: 'pointer', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {loading ? 'Logge ein...' : 'Login'}
        </button>
      </form>
    </div>
  );
}