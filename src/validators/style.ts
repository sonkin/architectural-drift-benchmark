/**
 * I3: Sentence Length Validator (Telegraphic Style)
 * Rules:
 *   - Max sentence length: 25 words
 *   - At least 70% of sentences must be ≤12 words
 */

const MAX_WORDS = 25;
const SHORT_THRESHOLD = 12;
const SHORT_RATIO_TARGET = 0.7;

export interface StyleResult {
    violations: number;
    totalSentences: number;
    longSentences: number;
    shortRatio: number;
    details: { sentence: string; wordCount: number }[];
}

export function validateStyle(text: string): StyleResult {
    // Simple sentence splitting (by . ! ?)
    const sentences = text
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('#')); // Ignore headers

    const details: StyleResult['details'] = [];
    let longSentences = 0;
    let shortSentences = 0;

    for (const sentence of sentences) {
        const wordCount = sentence.split(/\s+/).length;

        if (wordCount > MAX_WORDS) {
            longSentences++;
            details.push({ sentence: sentence.slice(0, 50) + '...', wordCount });
        }

        if (wordCount <= SHORT_THRESHOLD) {
            shortSentences++;
        }
    }

    const shortRatio = sentences.length > 0 ? shortSentences / sentences.length : 1;

    // Calculate violations
    let violations = longSentences;
    if (shortRatio < SHORT_RATIO_TARGET) {
        violations += Math.ceil((SHORT_RATIO_TARGET - shortRatio) * 10); // Penalty
    }

    return {
        violations,
        totalSentences: sentences.length,
        longSentences,
        shortRatio,
        details
    };
}
