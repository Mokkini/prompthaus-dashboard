// components/Footer.js
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted text-muted-foreground py-6 mt-12 border-t">
      <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center text-sm">
        <div className="mb-4 sm:mb-0">
          © {currentYear} PromptHaus. Alle Rechte vorbehalten.
        </div>
        <nav className="flex flex-wrap justify-center sm:justify-end space-x-4"> {/* flex-wrap hinzugefügt für kleinere Bildschirme */}
          <Link href="/impressum" className="hover:text-primary hover:underline">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-primary hover:underline">
            Datenschutz
          </Link>
          {/* --- NEUER LINK --- */}
          <Link href="/agb" className="hover:text-primary hover:underline">
            AGB
          </Link>
          {/* --- ENDE NEUER LINK --- */}
          {/* Add other links here if needed */}
        </nav>
      </div>
    </footer>
  );
}
