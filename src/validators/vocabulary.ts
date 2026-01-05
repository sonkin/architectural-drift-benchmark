/**
 * I1: Controlled Vocabulary Validator
 * Rule: Each term from the vocabulary list must appear exactly once.
 */

const VOCABULARY = [
    "Zero Trust", "MFA", "Bastion Host", "RBAC",
    "Data At Rest", "Data In Transit", "Least Privilege", "Air Gap",
    "SLA", "Biometric", "Cryptographic Salt", "PKI",
    "Endpoint Telemetry", "SIEM", "SOC2", "GDPR",
    "OIDC", "SAML", "Kill Chain", "Honeypot"
];

export interface VocabularyResult {
    violations: number;
    details: { term: string; count: number; expected: number }[];
}

export function validateVocabulary(text: string): VocabularyResult {
    const details: VocabularyResult['details'] = [];
    let violations = 0;

    for (const term of VOCABULARY) {
        const regex = new RegExp(term, 'gi');
        const matches = text.match(regex);
        const count = matches?.length ?? 0;

        if (count !== 1) {
            violations += Math.abs(count - 1);
            details.push({ term, count, expected: 1 });
        }
    }

    return { violations, details };
}
