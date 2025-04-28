// app/site-login/LoginForm.js
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { handleSiteLogin } from './actions';

export default function LoginForm() {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await handleSiteLogin(formData, redirectUrl);

    if (result?.error) {
      setError(result.error);
    }
    // setIsLoading(false) erst setzen, wenn die Action *nicht* redirected
    // Da handleSiteLogin bei Erfolg redirectet, wird dieser Code oft nicht erreicht.
    // Es ist sicherer, es nur im Fehlerfall oder nach dem await zu setzen,
    // aber da die Seite eh neu lädt/wechselt, ist es hier weniger kritisch.
    setIsLoading(false);
  };

  return (
    // Container für das Formular mit etwas Abstand und Zentrierung (optional)
    <div className="w-full max-w-xs mx-auto"> {/* Beispiel: Zentriert und max. Breite */}
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
            Passwort:
          </label>
          <input
            type="password"
            id="password"
            name="password"
            required
            // Bessere Input-Styling Klassen
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            // Optional: Roter Rand bei Fehler
            // className={`shadow appearance-none border ${error ? 'border-red-500' : ''} rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline`}
          />
        </div>

        {/* Fehleranzeige mit besserem Styling */}
        {error && (
          <p className="text-red-500 text-xs italic mb-4">{error}</p>
        )}

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={isLoading}
            // Bessere Button-Styling Klassen
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Prüfe...' : 'Anmelden'}
          </button>
        </div>
      </form>
    </div>
  );
}
