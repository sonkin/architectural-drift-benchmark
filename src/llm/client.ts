import 'dotenv/config';
import OpenAI from 'openai';

const client = new OpenAI();

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 1000;

// Token tracking
let totalInputTokens = 0;
let totalOutputTokens = 0;
let totalCalls = 0;
let totalTimeMs = 0;

export function getUsageStats() {
    const inputCost = (totalInputTokens / 1_000_000) * 0.15;  // gpt-4o-mini input
    const outputCost = (totalOutputTokens / 1_000_000) * 0.60; // gpt-4o-mini output
    return {
        totalCalls,
        totalInputTokens,
        totalOutputTokens,
        totalTimeMs,
        estimatedCostUSD: inputCost + outputCost
    };
}

export function resetUsageStats() {
    totalInputTokens = 0;
    totalOutputTokens = 0;
    totalCalls = 0;
    totalTimeMs = 0;
}

export interface GenerateOptions {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    model?: 'mini' | 'thinking';
}

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const MODELS = {
    mini: 'gpt-4o-mini',
    thinking: 'gpt-5.2'
} as const;

export async function generate(options: GenerateOptions): Promise<string> {
    let lastError: Error | null = null;
    const startTime = Date.now();
    const model = MODELS[options.model ?? 'mini'];

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await client.chat.completions.create({
                model,
                temperature: options.temperature ?? 0,
                messages: [
                    { role: 'system', content: options.systemPrompt },
                    { role: 'user', content: options.userPrompt }
                ]
            });

            // Track usage
            totalCalls++;
            totalInputTokens += response.usage?.prompt_tokens ?? 0;
            totalOutputTokens += response.usage?.completion_tokens ?? 0;
            totalTimeMs += Date.now() - startTime;

            return response.choices[0]?.message?.content ?? '';
        } catch (error) {
            lastError = error as Error;
            const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
            console.log(`    ⚠️ API error (attempt ${attempt}/${MAX_RETRIES}), retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }

    throw lastError;
}
