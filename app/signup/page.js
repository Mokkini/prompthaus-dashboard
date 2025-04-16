// app/signup/page.js
"use client"; // Client Component für Interaktivität

import { useState } from 'react';
// Stellen Sie sicher, dass der Pfad zu Ihrer client.js korrekt ist
import { createClient } from '../../lib/supabase/client'; // Pfad ggf. anpassen
import Link from 'next/link'; // Import für Links

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Status der E-Mail-Prüfung: 'idle', 'checking', 'error', 'not_found', 'invited', 'confirmed'
  const [emailCheckStatus, setEmailCheckStatus] = useState('idle');
  // Allgemeine Nachrichten für den Benutzer (Fehler, Erfolg, Statusmeldungen)
  const [formMessage, setFormMessage] = useState('');
  // Ladezustand für API-Aufrufe (Prüfung und Registrierung)
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient(); // Client-Instanz erzeugen

  // --- NEUE FUNKTION: E-Mail-Status prüfen ---
  const checkEmailStatus = async (currentEmail) => {
    // Nur prüfen, wenn es eine valide E-Mail ist und der Status nicht bereits bekannt/checkend ist
    if (!currentEmail || !currentEmail.includes('@') || emailCheckStatus === 'checking') {
      // Ggf. Status zurücksetzen, wenn Mail ungültig wird, oder einfach nichts tun
      if (!currentEmail || !currentEmail.includes('@')) {
          setEmailCheckStatus('idle');
          setFormMessage('');
      }
      return;
    }

    setIsLoading(true);
    setEmailCheckStatus('checking');
    setFormMessage('Prüfe E-Mail-Verfügbarkeit...'); // Feedback für den Nutzer

    try {
      const response = await fetch('/api/check-user-status', { // Aufruf unseres neuen Endpoints
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler bei der Statusprüfung.');
      }

      setEmailCheckStatus(data.status); // 'not_found', 'invited', 'confirmed'

      // Nachrichten basierend auf Status setzen
      if (data.status === 'invited') {
        setFormMessage('Für diese E-Mail wurde bereits eine Einladung versendet (z.B. nach einem Kauf). Bitte prüfen Sie Ihr Postfach (auch Spam) für den Aktivierungslink.');
      } else if (data.status === 'confirmed') {
        setFormMessage('Es existiert bereits ein Konto mit dieser E-Mail. Bitte loggen Sie sich ein oder nutzen Sie "Passwort vergessen".');
      } else if (data.status === 'not_found') {
         setFormMessage(''); // Keine Nachricht nötig, Registrierung möglich
      }

    } catch (error) {
      console.error("Fehler beim Prüfen des E-Mail-Status:", error);
      setEmailCheckStatus('error');
      setFormMessage(`Fehler beim Prüfen der E-Mail: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- ANGEPASSTE FUNKTION: Registrierung durchführen ---
  const handleSignup = async (event) => {
    event.preventDefault();

    // **NEUE PRÜFUNG:** Nur fortfahren, wenn die E-Mail geprüft wurde und 'not_found' ist
    if (emailCheckStatus !== 'not_found') {
      // Sicherstellen, dass die Nachricht angezeigt wird, falls der User direkt auf Submit klickt
      if (emailCheckStatus === 'idle' || emailCheckStatus === 'checking' || emailCheckStatus === 'error') {
          setFormMessage('Bitte warten Sie, bis die E-Mail-Prüfung abgeschlossen ist, oder lösen Sie sie aus (z.B. durch Verlassen des E-Mail-Feldes).');
          // Optional: Prüfung hier erneut anstoßen, wenn 'idle' oder 'error'
          if (emailCheckStatus === 'idle' || emailCheckStatus === 'error') {
              checkEmailStatus(email);
          }
      } else if (emailCheckStatus === 'invited') {
           setFormMessage('Registrierung nicht möglich. Für diese E-Mail wurde bereits eine Einladung versendet. Bitte prüfen Sie Ihr Postfach.');
      } else if (emailCheckStatus === 'confirmed') {
           setFormMessage('Registrierung nicht möglich. Es existiert bereits ein Konto mit dieser E-Mail. Bitte loggen Sie sich ein.');
      }
      return; // Brechen Sie die Funktion hier ab!
    }

    // Ab hier nur, wenn emailCheckStatus === 'not_found'
    setIsLoading(true);
    setFormMessage(''); // Alte Nachrichten löschen

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      // Optional: Optionen für Weiterleitung nach Bestätigung etc.
      // options: {
      //    emailRedirectTo: `${location.origin}/auth/callback`,
      // }
    });

    if (error) {
      console.error("Signup Fehler:", error.message);
      // Setze die spezifische Fehlermeldung von Supabase
      setFormMessage(`Registrierung fehlgeschlagen: ${error.message}`);
      // Status zurücksetzen, damit Nutzer es korrigieren und neu versuchen kann?
      // setEmailCheckStatus('idle'); // Oder 'error'? Überlegen, was sinnvoll ist.
    } else {
      // Standardmäßig sendet Supabase eine Bestätigungs-E-Mail (wenn in Supabase aktiviert!).
      console.log("Signup erfolgreich, Bestätigungs-E-Mail sollte gesendet werden:", data);
      // Unterscheide ggf., ob E-Mail-Bestätigung nötig ist oder nicht (basierend auf data und Supabase Settings)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
           // Fall: E-Mail Bestätigung ist deaktiviert (User ist direkt aktiv) -> Erfolg!
           setFormMessage('Registrierung erfolgreich! Sie können sich jetzt einloggen.');
           // TODO: Ggf. direkt zum Login weiterleiten oder einloggen?
      } else {
           // Standardfall: E-Mail Bestätigung ist aktiv
           setFormMessage('Registrierung angefordert! Bitte prüfen Sie Ihre E-Mails und klicken Sie auf den Bestätigungslink, um den Vorgang abzuschließen.');
      }

      // Felder leeren oder nicht - Geschmackssache
      // setEmail('');
      // setPassword('');
    }
    setIsLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Registrieren</h2>
      <form onSubmit={handleSignup}>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input
            type="email"
            id="email"
            name="email" // Name Attribut hinzugefügt
            value={email}
            onChange={(e) => {
                setEmail(e.target.value);
                // WICHTIG: Status zurücksetzen, wenn E-Mail geändert wird!
                setEmailCheckStatus('idle');
                setFormMessage('');
            }}
            // NEU: Prüfung auslösen, wenn der Fokus das Feld verlässt
            onBlur={(e) => checkEmailStatus(e.target.value)}
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            disabled={isLoading} // Deaktivieren während Ladevorgängen
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Passwort:</label>
          <input
            type="password"
            id="password"
            name="password" // Name Attribut hinzugefügt
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6} // Passwort-Mindestlänge
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
            disabled={isLoading} // Deaktivieren während Ladevorgängen
          />
        </div>

        {/* Anzeige für Nachrichten (Fehler, Erfolg, Status) */}
        {formMessage && (
            <p style={{ color: emailCheckStatus === 'error' || formMessage.toLowerCase().includes('fehler') ? 'red' : (emailCheckStatus === 'not_found' || formMessage.toLowerCase().includes('erfolgreich') ? 'green' : 'blue'), marginTop: '10px', marginBottom: '10px' }}>
                {formMessage}
            </p>
        )}

        <button
          type="submit"
          // NEU: Button deaktivieren, wenn Prüfung läuft ODER wenn Status die Registrierung verhindert
          disabled={isLoading || emailCheckStatus === 'checking' || emailCheckStatus === 'invited' || emailCheckStatus === 'confirmed'}
          style={{ padding: '10px 15px', cursor: 'pointer', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', opacity: (isLoading || emailCheckStatus === 'checking' || emailCheckStatus === 'invited' || emailCheckStatus === 'confirmed') ? 0.6 : 1 }}
        >
          {isLoading ? 'Wird geprüft/gesendet...' : 'Registrieren'}
        </button>
      </form>

       {/* NEU: Links basierend auf Status anzeigen */}
      {emailCheckStatus === 'confirmed' && (
          <p style={{marginTop: '15px'}}>
               <Link href="/login" style={{color: '#0070f3'}}>Zum Login</Link> | <Link href="/forgot-password" style={{color: '#0070f3'}}>Passwort vergessen?</Link>
          </p>
      )}
       {/* Originaler Link bleibt für andere Fälle oder wenn Prüfung nicht aktiv */}
       {emailCheckStatus !== 'confirmed' && (
           <p style={{marginTop: '15px'}}>
             Bereits registriert? <Link href="/login" style={{color: '#0070f3'}}>Zum Login</Link>
           </p>
       )}
    </div>
  );
}