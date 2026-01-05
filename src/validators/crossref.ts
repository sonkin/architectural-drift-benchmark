/**
 * I4: Cross-Reference Validator
 * Rule: All "See Section X" references must point to existing sections.
 */

export interface CrossRefResult {
    violations: number;
    details: { reference: string; targetSection: string; exists: boolean }[];
}

export function validateCrossRefs(text: string): CrossRefResult {
    const details: CrossRefResult['details'] = [];
    let violations = 0;

    // Find all section numbers in the document
    const sectionRegex = /^#{1,2}\s+(\d+(?:\.\d+)?)\.\s+/gm;
    const existingSections = new Set<string>();

    let match;
    while ((match = sectionRegex.exec(text)) !== null) {
        existingSections.add(match[1]);
    }

    // Find all cross-references
    const refRegex = /[Ss]ee\s+[Ss]ection\s+(\d+(?:\.\d+)?)/g;

    while ((match = refRegex.exec(text)) !== null) {
        const targetSection = match[1];
        const exists = existingSections.has(targetSection);

        if (!exists) {
            violations++;
            details.push({
                reference: match[0],
                targetSection,
                exists
            });
        }
    }

    return { violations, details };
}
