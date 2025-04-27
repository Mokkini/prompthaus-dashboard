// lib/semantic-data-parser.js

/**
 * Verarbeitet das rohe semantische Datenobjekt und fügt stateKey-Pfade hinzu.
 * Diese Pfade werden verwendet, um den Zustand der Formularfelder zu verwalten.
 *
 * @param {object} data - Das rohe semantic_data Objekt aus der Datenbank.
 * @param {string} [parentKey=''] - Der übergeordnete Schlüsselpfad (für rekursive Aufrufe).
 * @returns {object} Das verarbeitete Objekt mit hinzugefügten stateKey-Eigenschaften.
 */
export function getSemanticData(data, parentKey = '') {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const result = {};

  for (const key in data) {
    if (Object.hasOwnProperty.call(data, key)) {
      const item = data[key];
      // Erzeuge den Pfad für den State (z.B. 'user_details.name' oder 'product_description')
      const currentKey = parentKey ? `${parentKey}.${key}` : key;

      if (item && typeof item === 'object' && item.type === 'object' && item.fields) {
        // Wenn es ein verschachteltes Objekt mit 'fields' ist, verarbeite es rekursiv
        result[key] = {
          ...item,
          stateKey: currentKey, // Füge den stateKey für das Objekt selbst hinzu
          fields: getSemanticData(item.fields, currentKey) // Verarbeite die inneren Felder
        };
      } else if (item && typeof item === 'object') {
        // Für normale Felder (string, number, boolean, text, date etc.)
        result[key] = {
          ...item,
          stateKey: currentKey // Füge den stateKey hinzu
        };
      } else {
        // Falls das Format unerwartet ist, logge eine Warnung und übernehme den Schlüssel
        console.warn(`Unerwartetes Format für Schlüssel "${key}" in semantic_data gefunden.`);
        // Optional: Hier könnte man entscheiden, das Element zu überspringen oder anders zu behandeln
        result[key] = { stateKey: currentKey, type: 'unknown', originalValue: item };
      }
    }
  }

  return result;
}

// Beispiel für die Verwendung (nur zur Veranschaulichung):
/*
const rawData = {
  headline: { type: 'string', label: 'Überschrift' },
  details: {
    type: 'object',
    label: 'Details',
    fields: {
      description: { type: 'text', label: 'Beschreibung' },
      is_active: { type: 'boolean', label: 'Aktiv' }
    }
  }
};

const processedData = getSemanticData(rawData);
console.log(JSON.stringify(processedData, null, 2));
// Erwartete Ausgabe (vereinfacht):
// {
//   "headline": { "type": "string", "label": "Überschrift", "stateKey": "headline" },
//   "details": {
//     "type": "object",
//     "label": "Details",
//     "stateKey": "details",
//     "fields": {
//       "description": { "type": "text", "label": "Beschreibung", "stateKey": "details.description" },
//       "is_active": { "type": "boolean", "label": "Aktiv", "stateKey": "details.is_active" }
//     }
//   }
// }
*/
