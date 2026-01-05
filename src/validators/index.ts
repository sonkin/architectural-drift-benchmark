/**
 * Combined Drift Score Calculator
 * S(v) = w1*D_vocab + w2*D_struct + w3*D_style + w4*D_ref
 */

import { validateVocabulary, VocabularyResult } from './vocabulary.js';
import { validateTemplate, TemplateResult } from './template.js';
import { validateStyle, StyleResult } from './style.js';
import { validateCrossRefs, CrossRefResult } from './crossref.js';

import { validateAtypicality, AtypicalityResult } from './atypicality.js';
import { AtypicalityLevel } from '../engine.js';

export interface DriftScore {
    total: number;
    vocabulary: VocabularyResult;
    template: TemplateResult;
    style: StyleResult;
    crossRefs: CrossRefResult;
    atypicality: AtypicalityResult;
}

export function calculateDrift(text: string, atypicalityLevel: AtypicalityLevel = 'low'): DriftScore {
    const vocabulary = validateVocabulary(text);
    const template = validateTemplate(text);
    const style = validateStyle(text);
    const crossRefs = validateCrossRefs(text);
    const atypicality = validateAtypicality(text, atypicalityLevel);

    // All weights = 1 for now
    const total =
        vocabulary.violations +
        template.violations +
        style.violations +
        crossRefs.violations +
        atypicality.violations;

    return { total, vocabulary, template, style, crossRefs, atypicality };
}

export { validateVocabulary, validateTemplate, validateStyle, validateCrossRefs, validateAtypicality };
