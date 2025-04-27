// app/api/generate-docx/route.js
import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { Readable } from 'stream'; // Wird benötigt, um den Buffer in eine Response zu streamen

export async function POST(request) {
  try {
    // 1. Request Body auslesen und parsen
    const body = await request.json();
    const textToConvert = body.text;
    const requestedFilename = body.filename || 'generiertes-dokument.docx';

    // Validierung: Ist Text vorhanden?
    if (!textToConvert || typeof textToConvert !== 'string') {
      return NextResponse.json({ error: 'Kein Text zur Konvertierung übermittelt.' }, { status: 400 });
    }

    // Sicherstellen, dass der Dateiname gültig ist und die .docx Endung hat
    const safeFilename = requestedFilename.replace(/[^a-z0-9_\-\.]/gi, '_').replace(/\.\.+/g, '.');
    const filename = safeFilename.endsWith('.docx') ? safeFilename : `${safeFilename}.docx`;

    // 2. DOCX-Dokument erstellen
    // Den Text in Absätze aufteilen, um Zeilenumbrüche zu erhalten
    const paragraphs = textToConvert.split('\n').map(
      (line) =>
        new Paragraph({
          children: [new TextRun(line)],
          // Optional: Abstand nach dem Absatz für bessere Lesbarkeit
          spacing: { after: 120 }, // Entspricht ca. 6pt
        })
    );

    const doc = new Document({
      sections: [{
        properties: {}, // Standardeigenschaften
        children: paragraphs, // Füge die erstellten Absätze ein
      }],
    });

    // 3. Dokument als Buffer generieren
    const buffer = await Packer.toBuffer(doc);

    // 4. Response mit korrekten Headern erstellen
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    // Wichtig: filename*=UTF-8'' sorgt für korrekte Darstellung von Sonderzeichen im Dateinamen
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    headers.set('Content-Length', buffer.length.toString());

    // 5. Buffer als Stream zurückgeben
    // NextResponse kann direkt mit Buffern oder Streams umgehen
    return new NextResponse(buffer, { status: 200, headers });

  } catch (error) {
    console.error("Fehler bei DOCX-Generierung:", error);
    // Gib eine generische Fehlermeldung zurück
    return NextResponse.json({ error: 'Fehler beim Erstellen der DOCX-Datei.' }, { status: 500 });
  }
}
