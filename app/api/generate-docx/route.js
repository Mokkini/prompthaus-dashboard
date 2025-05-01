// app/api/generate-docx/route.js - ANGEPASST: Platzhalter-Formatierung

import { NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, ShadingType } from 'docx'; // ShadingType ist nicht nötig, aber TextRun ist wichtig
import { Readable } from 'stream';

// --- NEU: Regulärer Ausdruck für Platzhalter (derselbe wie im Frontend) ---
const placeholderRegex = /\{\s*\*(.*?)\*\s*\}/g;
// --- ENDE NEU ---

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

    // --- NEU: Text parsen und formatierte TextRuns erstellen ---
    const paragraphs = textToConvert.split('\n').map((line) => {
      const runsForLine = [];
      let lastIndex = 0;
      let match;

      // Reset regex lastIndex before each line processing
      placeholderRegex.lastIndex = 0;

      while ((match = placeholderRegex.exec(line)) !== null) {
        // Text vor dem Platzhalter hinzufügen (normal)
        if (match.index > lastIndex) {
          runsForLine.push(new TextRun(line.substring(lastIndex, match.index)));
        }
        // Platzhalter hinzufügen (kursiv und grau)
        // match[0] ist der gesamte Platzhalter, z.B. "{*Ihr Name*}"
        runsForLine.push(
          new TextRun({
            text: match[0],
            italics: true,
            color: "808080", // Standard-Grau (Hex-Code ohne #)
            // Optional: Schriftart explizit setzen, falls nötig
            // font: { name: "Calibri" } // Beispiel
          })
        );
        lastIndex = match.index + match[0].length;
      }

      // Restlichen Text nach dem letzten Platzhalter hinzufügen (normal)
      if (lastIndex < line.length) {
        runsForLine.push(new TextRun(line.substring(lastIndex)));
      }

      // Wenn eine Zeile leer war, trotzdem einen leeren Paragraph erstellen
      if (runsForLine.length === 0 && line.length === 0) {
          return new Paragraph({ children: [new TextRun("")] }); // Leerer TextRun für leere Zeile
      }

      // Paragraph mit den gesammelten TextRuns erstellen
      return new Paragraph({
        children: runsForLine,
        spacing: { after: 120 }, // Optional: Abstand nach dem Absatz
      });
    });
    // --- ENDE NEU ---

    // 2. DOCX-Dokument erstellen (unverändert, verwendet die neuen paragraphs)
    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs,
      }],
      // Optional: Standard-Schriftart für das gesamte Dokument definieren
      // styles: {
      //   default: {
      //     document: {
      //       run: {
      //         font: "Calibri", // Beispiel
      //         size: 22, // Entspricht 11pt (Größe wird in Halbpunkten angegeben)
      //       },
      //     },
      //   },
      // },
    });

    // 3. Dokument als Buffer generieren (unverändert)
    const buffer = await Packer.toBuffer(doc);

    // 4. Response mit korrekten Headern erstellen (unverändert)
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    headers.set('Content-Length', buffer.length.toString());

    // 5. Buffer als Stream zurückgeben (unverändert)
    return new NextResponse(buffer, { status: 200, headers });

  } catch (error) {
    console.error("Fehler bei DOCX-Generierung:", error);
    return NextResponse.json({ error: 'Fehler beim Erstellen der DOCX-Datei.' }, { status: 500 });
  }
}
