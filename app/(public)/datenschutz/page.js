// app/datenschutz/page.js
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';

export const metadata = {
  title: "Datenschutzerklärung - PromptHaus",
  description: "Datenschutzerklärung für die Nutzung von PromptHaus.",
};

export default function DatenschutzPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Datenschutzerklärung</CardTitle>
          <CardDescription>Stand: April 2025</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm sm:text-base leading-relaxed">

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">1. Verantwortlicher</h2>
            <p>
              A. Danadi<br />
              Mittelstraße 53<br />
              40721 Hilden<br />
              E-Mail: service@prompthaus.de<br />
              Link zum Impressum: <Link href="/impressum" className="underline hover:text-primary">/impressum</Link>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">2. Allgemeines zur Datenverarbeitung</h2>
            <p>
              PromptHaus verarbeitet personenbezogene Daten nur dann, wenn dies zur Bereitstellung der Website, zur Abwicklung eines Kaufs oder zur Nutzung unserer Dienste erforderlich ist. Die Nutzung der Prompt-Funktionen erfolgt anonym und ohne Erhebung identifizierbarer Informationen.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">3. Bereitstellung der Website und Erstellung von Logfiles</h2>
            <p>
              Beim Besuch unserer Website werden automatisch technische Informationen wie IP-Adresse, Browsertyp, Betriebssystem und Zeitpunkt des Zugriffs verarbeitet. Diese Daten werden ausschließlich für die Sicherstellung der Funktionsfähigkeit, zur Fehleranalyse sowie zur Absicherung unserer Systeme verwendet. Eine personenbezogene Auswertung findet nicht statt.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">4. Verwendung von Cookies</h2>
            <p>
              Wir verwenden ausschließlich technisch notwendige Cookies, um grundlegende Funktionen wie die Speicherung deiner Cookie-Einstellungen zu ermöglichen. Es werden keine Cookies zu Analyse-, Tracking- oder Marketingzwecken eingesetzt. Du wirst beim ersten Besuch der Website über den Einsatz informiert und kannst deine Einstellungen über den Cookie-Banner anpassen.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">5. Zahlungsabwicklung</h2>
            <p>
              Zur Abwicklung von Zahlungen nutzen wir etablierte Zahlungsdienstleister. Während dieses Prozesses werden deine Zahlungsdaten direkt durch diese Anbieter verarbeitet. Wir selbst erhalten lediglich die E-Mail-Adresse, die zur Freischaltung deines Zugangs im Dashboard verwendet wird. Die Datenverarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung).
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Stripe</a></li>
              <li><a href="https://www.paypal.com/de/webapps/mpp/ua/privacy-full" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">PayPal</a></li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">6. Automatisierte Textgenerierung</h2>
            <p>
              Die Generierung von Prompts erfolgt automatisiert über eine integrierte KI-Schnittstelle. Hierbei werden keine personenbezogenen Daten verarbeitet oder gespeichert. Die Eingaben durch Nutzer:innen erfolgen ausschließlich anonym. Die eingesetzten Dienstleister verarbeiten die Daten auf Grundlage vertraglicher Vereinbarungen zur Auftragsverarbeitung im Rahmen der DSGVO.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">7. Technische Infrastruktur</h2>
            <p>
              Unsere Plattform wird über spezialisierte Cloud-Dienste gehostet. Die Speicherung und Verwaltung von Nutzerdaten (z. B. zur Zahlungszuordnung) erfolgt ebenfalls durch datenschutzkonforme IT-Dienstleister. Alle eingesetzten Dienstleister sind im Rahmen von Auftragsverarbeitungsverträgen nach Art. 28 DSGVO an die gesetzlichen Vorgaben gebunden. Eine Datenverarbeitung außerhalb der EU findet nur unter Einhaltung geeigneter Garantien statt.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">8. Weitergabe von Daten</h2>
            <p>
              Eine Weitergabe personenbezogener Daten erfolgt ausschließlich im Rahmen der oben genannten Zwecke – insbesondere zur Zahlungsabwicklung sowie zur Bereitstellung unserer technischen Infrastruktur. Darüber hinaus geben wir keine personenbezogenen Daten an Dritte weiter.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">9. Rechte der betroffenen Person</h2>
            <p>
              Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerruf deiner Einwilligung sowie das Recht auf Beschwerde bei einer Aufsichtsbehörde. Für die Ausübung deiner Rechte genügt eine formlose Nachricht an: service@prompthaus.de
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">10. Änderungen dieser Datenschutzerklärung</h2>
            <p>
              Diese Datenschutzerklärung ist aktuell gültig und hat den Stand April 2025. Durch technische oder rechtliche Entwicklungen kann eine Anpassung erforderlich werden. Die jeweils aktuelle Version findest du jederzeit unter <Link href="/datenschutz" className="underline hover:text-primary">/datenschutz</Link>.
            </p>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}
