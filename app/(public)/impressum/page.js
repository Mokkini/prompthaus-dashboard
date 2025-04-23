// app/impressum/page.js
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';

export const metadata = {
  title: "Impressum - PromptHaus",
  description: "Impressum und rechtliche Hinweise für PromptHaus.",
};

export default function ImpressumPage() {
  // --- BITTE ERSETZEN SIE DIESE PLATZHALTER MIT IHREN ECHTEN DATEN ---
  const responsiblePerson = "A. Danadi"; // Oder Firmenname
  const streetAddress = "Mittelstraße 53";
  const postalCodeCity = "40721 Hilden";
  const emailAddress = "service@prompthaus.de";
  const phoneNumber = "+49 162 9129893"; // Optional, aber empfohlen
  const vatId = "DE341967423"; // Falls vorhanden (Umsatzsteuer-Identifikationsnummer)
  const commercialRegister = "Amtsgericht [Ort], HRB [Nummer]"; // Falls im Handelsregister eingetragen
  const responsibleForContent = "A. Danadi, Adresse wie oben"; // Gemäß § 18 Abs. 2 MStV
  // --- ENDE PLATZHALTER ---

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Impressum</CardTitle>
          {/* Optional: <CardDescription>Rechtliche Hinweise</CardDescription> */}
        </CardHeader>
        <CardContent className="space-y-6 text-sm sm:text-base leading-relaxed">

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">Angaben gemäß § 5 TMG</h2>
            <p>
              {responsiblePerson}<br />
              {streetAddress}<br />
              {postalCodeCity}
            </p>
            {/* Nur anzeigen, wenn im Handelsregister eingetragen */}
            {commercialRegister && commercialRegister !== "Amtsgericht [Ort], HRB [Nummer]" && (
              <p>
                <strong>Registereintrag:</strong><br />
                Eintragung im Handelsregister.<br />
                Registergericht: {commercialRegister.split(',')[0].replace('Amtsgericht ', '')}<br />
                Registernummer: {commercialRegister.split(',')[1].replace(' HRB ', '')}
              </p>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">Kontakt</h2>
            <p>
              {phoneNumber && `Telefon: ${phoneNumber}`}<br />
              E-Mail: {emailAddress}
            </p>
          </section>

          {/* Nur anzeigen, wenn eine USt-IdNr. vorhanden ist */}
          {vatId && vatId !== "DEXXXXXXXXX" && (
            <section className="space-y-2">
              <h2 className="text-xl font-semibold">Umsatzsteuer-ID</h2>
              <p>
                Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:<br />
                {vatId}
              </p>
            </section>
          )}

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
            <p>
              {responsibleForContent}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">EU-Streitschlichtung</h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
              <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">
                https://ec.europa.eu/consumers/odr/
              </a>.<br />
              Unsere E-Mail-Adresse finden Sie oben im Impressum.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">Verbraucher­streit­beilegung / Universal­schlichtungs­stelle</h2>
            <p>
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
              {/* ODER: Falls Sie teilnehmen müssen/wollen: */}
              {/* Wir sind zur Teilnahme an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle verpflichtet/bereit. Die zuständige Verbraucherschlichtungsstelle ist: [Name und Adresse der Schlichtungsstelle]. */}
            </p>
          </section>

           <section className="space-y-2">
             <h2 className="text-xl font-semibold">Haftungsausschluss (Disclaimer)</h2>
             {/* Hier können Sie Standard-Disclaimer für Inhalte, Links etc. einfügen, falls gewünscht */}
             <p>
                <strong>Haftung für Inhalte</strong><br/>
                Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
             </p>
             <p>
                <strong>Haftung für Links</strong><br/>
                Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
             </p>
             <p>
                <strong>Urheberrecht</strong><br/>
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
             </p>
           </section>

           <section className="space-y-2">
             <p>
               Zur Datenschutzerklärung: <Link href="/datenschutz" className="underline hover:text-primary">/datenschutz</Link>
             </p>
           </section>

        </CardContent>
      </Card>
    </div>
  );
}
