// app/(public)/agb/page.js
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';

export const metadata = {
  title: "Allgemeine Geschäftsbedingungen (AGB) - PromptHaus",
  description: "AGB für die Nutzung der Dienste und den Kauf von Produkten auf PromptHaus.",
};

export default function AgbPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Allgemeine Geschäftsbedingungen (AGB)</CardTitle>
          <CardDescription>Stand: April 2025</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm sm:text-base leading-relaxed">

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">§ 1 Geltungsbereich</h2>
            <p>
              Diese Allgemeinen Geschäftsbedingungen (nachfolgend "AGB") gelten für sämtliche Verträge, die zwischen Ihnen als Kundin oder Kunde und uns, PromptHaus – A. Danadi, Mittelstraße 53, 40721 Hilden – über unsere Plattform prompthaus.de abgeschlossen werden. Abweichende Bedingungen erkennen wir nicht an, es sei denn, wir stimmen ihrer Geltung ausdrücklich schriftlich zu.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">§ 2 Vertragsschluss</h2>
            <p>
              Die Darstellung unserer Produkte auf der Plattform stellt kein rechtlich bindendes Angebot dar, sondern eine unverbindliche Aufforderung zur Abgabe einer Bestellung. Mit dem Klick auf den Kauf-Button geben Sie ein verbindliches Angebot zum Erwerb des gewählten Prompt-Pakets ab. Der Vertrag kommt durch unsere automatisierte Bestellbestätigung per E-Mail zustande.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">§ 3 Preise und Zahlungsbedingungen</h2>
            <p>
              Alle Preise verstehen sich in Euro (€) inklusive der gesetzlichen Umsatzsteuer. Die Bezahlung erfolgt über die im Checkout angegebenen Zahlungsmittel, insbesondere Stripe oder PayPal. Der Zahlungsbetrag wird sofort nach Abschluss der Bestellung fällig.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">§ 4 Lieferung und Zugang zu digitalen Inhalten</h2>
            <p>
              Nach erfolgreichem Zahlungseingang erhalten Sie Zugriff auf die gekauften Prompt-Pakete über Ihr Kunden-Dashboard auf unserer Plattform. Der Zugang erfolgt in der Regel unmittelbar. Es liegt in Ihrer Verantwortung, für die technischen Voraussetzungen zur Nutzung der digitalen Inhalte zu sorgen.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">§ 5 Widerrufsrecht für Verbraucher</h2>
            <p>
              Als Verbraucher haben Sie grundsätzlich ein gesetzliches Widerrufsrecht. Für digitale Inhalte gilt dabei folgende Einschränkung:
            </p>
            <p>
              <strong>Widerrufsbelehrung</strong><br />
              Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses. Um Ihr Widerrufsrecht auszuüben, müssen Sie uns mittels einer eindeutigen Erklärung per E-Mail an info@prompthaus.de über Ihren Entschluss informieren.
            </p>
            <p>
              <strong>Besonderer Hinweis:</strong><br />
              Ihr Widerrufsrecht erlischt, wenn Sie ausdrücklich zustimmen, dass wir mit der Ausführung des Vertrags vor Ablauf der Widerrufsfrist beginnen, und Sie Ihre Kenntnis davon bestätigen, dass Sie dadurch Ihr Widerrufsrecht verlieren. Diese Zustimmung wird im Checkout vor Abschluss des Kaufs eingeholt.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">§ 6 Nutzungsrechte</h2>
            <p>
              Mit dem Kauf eines Prompt-Pakets erhalten Sie ein einfaches, nicht übertragbares Nutzungsrecht an den enthaltenen Prompts und den daraus generierten Texten. Die Inhalte dürfen für persönliche oder geschäftliche Zwecke genutzt werden. Eine Weitergabe, Veröffentlichung oder der Verkauf der Vorlagen oder generierten Texte an Dritte ist nicht gestattet.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">§ 7 Gewährleistung und Haftung</h2>
            <p>
              Es gelten die gesetzlichen Gewährleistungsrechte. Wir haften unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie nach dem Produkthaftungsgesetz. Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten beschränkt sich unsere Haftung auf den typischerweise vorhersehbaren Schaden. Wir übernehmen keine Haftung für die Eignung der generierten Texte für einen bestimmten Zweck.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">§ 8 Datenschutz</h2>
            <p>
              Informationen zur Verarbeitung Ihrer personenbezogenen Daten finden Sie in unserer Datenschutzerklärung:{" "}
              <Link href="/datenschutz" className="underline hover:text-primary">/datenschutz</Link>
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-xl font-semibold">§ 9 Schlussbestimmungen</h2>
            <p>
              Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Gerichtsstand ist Hilden, sofern zulässig.
            </p>
          </section>

          <section className="space-y-2">
            <p>
              Zum Impressum: <Link href="/impressum" className="underline hover:text-primary">/impressum</Link>
            </p>
          </section>

        </CardContent>
      </Card>
    </div>
  );
}
