/**
 * Robust JSON extraction and parsing for LLM responses.
 * Handles markdown code fences, leading/trailing commentary, trailing commas, etc.
 */
export function extractAndParseJson(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty or invalid response received from AI model.');
  }

  let cleaned = text.trim();

  // 1. Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (initialErr) {
    // Continue with cleanup strategies
  }

  // 2. Remove markdown code fences if wrapped in ```json ... ``` or ``` ... ```
  cleaned = cleaned.replace(/^```(?:json)?\s*/gi, '').replace(/\s*```$/gi, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch (fenceErr) {
    // Continue with substring extraction
  }

  // 3. Find outermost JSON object { ... } or array [ ... ]
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = cleaned.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = cleaned.lastIndexOf(']');
  }

  if (startIdx !== -1 && endIdx > startIdx) {
    const candidate = cleaned.substring(startIdx, endIdx + 1);
    try {
      return JSON.parse(candidate);
    } catch (subErr) {
      // 4. Try removing trailing commas before closing braces/brackets
      try {
        const sanitized = candidate.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(sanitized);
      } catch (sanitizedErr) {
        throw new Error(`Failed to parse AI JSON output: ${subErr.message}`);
      }
    }
  }

  throw new Error(`Failed to locate JSON structure in AI output.`);
}
