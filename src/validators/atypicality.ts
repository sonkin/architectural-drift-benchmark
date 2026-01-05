/**
 * Detects violations of Specific Atypicality Constraints.
 * 
 * Levels:
 * - low:  No constraints (always 0 violations)
 * - mid:  Title Case (Every Word Must Start With Capital)
 * - high: 3rd Letter Uppercase (The third letter of every word must be capitalized)
 */

import { AtypicalityLevel } from '../engine.js';

export interface AtypicalityResult {
    violations: number;
    details: string[];
}

export function validateAtypicality(text: string, level: AtypicalityLevel = 'low'): AtypicalityResult {
    if (level === 'low') {
        return { violations: 0, details: [] };
    }

    const lines = text.split('\n');
    let violations = 0;
    const details: string[] = [];

    // Simple tokenizer: split by whitespace, strip punctuation
    const words = text.match(/\b\w+\b/g) || [];

    if (level === 'mid') {
        // Title Case: First letter must be upper, rest lower? 
        // Let's be lenient: First letter MUST be upper. Rest doesn't matter for now 
        // to avoid flagging acronyms as violations (e.g. USA is valid Title Case contextually).
        // But strictly Title Case usually means "Word". Let's enforce: First char Upper.

        for (const word of words) {
            // Ignore fully numeric or short words? No, "In", "At" should be capped.
            // Ignore single letter words? "A" must be capped.
            const firstChar = word.charAt(0);
            if (firstChar !== firstChar.toUpperCase() && /[a-z]/i.test(firstChar)) {
                violations++;
                if (details.length < 5) details.push(`TitleCase violation: ${word}`);
            }
        }
    }

    if (level === 'high') {
        // 3rd Letter Uppercase:
        // Words with >= 3 chars MUST have 3rd char Uppercase.
        // Words with < 3 chars are ignored.

        for (const word of words) {
            if (word.length >= 3) {
                const thirdChar = word.charAt(2);
                if (/[a-z]/.test(thirdChar)) { // if it is a lowercase letter
                    violations++;
                    if (details.length < 5) details.push(`3rdLetter violation: ${word}`);
                }
            }
        }
    }

    return { violations, details };
}
