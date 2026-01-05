/**
 * I2: Section Template Validator
 * Rule: Every numbered section must have subsections in order:
 *   1. Purpose  2. Scope  3. Directives  4. Exceptions  5. Enforcement
 */

const REQUIRED_SUBSECTIONS = ['Purpose', 'Scope', 'Directives', 'Exceptions', 'Enforcement'];

export interface TemplateResult {
    violations: number;
    details: { section: string; missing: string[]; wrongOrder: boolean }[];
}

export function validateTemplate(text: string): TemplateResult {
    const details: TemplateResult['details'] = [];
    let violations = 0;

    // Find all numbered sections (e.g., "## 1. Section Name" or "# 1. Section Name")
    const sectionRegex = /^#{1,2}\s+\d+\.\s+(.+)$/gm;
    const sections: { name: string; startIndex: number; endIndex: number }[] = [];

    let match;
    while ((match = sectionRegex.exec(text)) !== null) {
        sections.push({
            name: match[1],
            startIndex: match.index,
            endIndex: text.length // Will be updated
        });
    }

    // Set end indices
    for (let i = 0; i < sections.length - 1; i++) {
        sections[i].endIndex = sections[i + 1].startIndex;
    }

    // Check each section for required subsections
    for (const section of sections) {
        const sectionText = text.slice(section.startIndex, section.endIndex);
        const missing: string[] = [];
        const foundIndices: number[] = [];

        for (const sub of REQUIRED_SUBSECTIONS) {
            const subRegex = new RegExp(`###\\s+${sub}`, 'i');
            const subMatch = subRegex.exec(sectionText);

            if (!subMatch) {
                missing.push(sub);
            } else {
                foundIndices.push(subMatch.index);
            }
        }

        // Check order
        const wrongOrder = foundIndices.length > 1 &&
            !foundIndices.every((val, i, arr) => i === 0 || val > arr[i - 1]);

        if (missing.length > 0 || wrongOrder) {
            violations += missing.length + (wrongOrder ? 1 : 0);
            details.push({ section: section.name, missing, wrongOrder });
        }
    }

    return { violations, details };
}
