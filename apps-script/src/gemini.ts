import { getGeminiApiKey } from "./config";

const GEMINI_MODEL = "gemini-3.6-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface GeminiResult {
  ok: boolean;
  text?: string;
  error?: string;
}

/**
 * Direct Gemini call from Apps Script via UrlFetchApp — the nightly at-risk
 * sweep runs with no browser/Node session involved, so it can't go through
 * the Node server the way the interactive tutor chat does.
 *
 * Never throws: a failed or rate-limited call returns `{ ok: false, error }`
 * so the caller can fall back to a deterministic summary rather than skip
 * sending the alert altogether.
 */
export function generateAlertSummary(prompt: string): GeminiResult {
  try {
    const response = UrlFetchApp.fetch(`${GEMINI_ENDPOINT}?key=${getGeminiApiKey()}`, {
      method: "post",
      contentType: "application/json",
      muteHttpExceptions: true,
      payload: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 300 },
      }),
    });

    const code = response.getResponseCode();
    if (code !== 200) {
      return { ok: false, error: `Gemini returned HTTP ${code}: ${response.getContentText().slice(0, 200)}` };
    }

    const body = JSON.parse(response.getContentText()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return { ok: false, error: "Gemini response had no text." };
    return { ok: true, text: text.trim() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
