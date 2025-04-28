// app/site-login/page.js
// 'use client'; // Wird hier nicht mehr unbedingt benötigt, da die Client-Logik ausgelagert ist

import { Suspense } from 'react';
import LoginForm from './LoginForm'; // Importiere die neue Komponente

// Eine einfache Lade-Komponente als Fallback
function LoadingFallback() {
    return <p>Lade Login-Formular...</p>;
}

export default function LoginPage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Bitte authentifizieren</h1>
      <p>Diese Seite erfordert ein Passwort für den Zugriff.</p>
      {/* Wickle die Komponente, die useSearchParams verwendet, in Suspense ein */}
      <Suspense fallback={<LoadingFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
