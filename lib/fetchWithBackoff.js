// lib/utils/fetchWithBackoff.js
export async function fetchWithUltraBackoff(apiCall, options = {}) {
  const { maxRetries = 5, baseDelay = 500, softFail = false } = options;
  let retries = 0;
  while (retries <= maxRetries) {
    try {
      const result = await apiCall();
      return result; // Erfolg
    } catch (error) {
      retries++;
      if (retries > maxRetries) {
        console.error(`Maximale Wiederholungsversuche (${maxRetries}) erreicht. Fehler:`, error);
        if (softFail) {
          return { error: true, message: error.message || 'Maximale Wiederholungsversuche erreicht.' };
        }
        throw error; // Harter Fehler nach letztem Versuch
      }
      const delay = baseDelay * Math.pow(2, retries - 1) + Math.random() * baseDelay;
      console.warn(`Versuch ${retries} fehlgeschlagen. Warte ${delay.toFixed(0)}ms. Fehler:`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
