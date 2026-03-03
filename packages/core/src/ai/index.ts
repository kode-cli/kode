import Anthropic from '@anthropic-ai/sdk';
import { aiCache, getCacheKey } from './cache.js';
import { withRetry } from './retry.js';

const MODEL = 'claude-sonnet-4-6';

function createClient(): Anthropic | null {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;
    return new Anthropic({ apiKey });
}

// ── Commit Message ────────────────────────────────────────────────────────────

export async function generateCommitMessage(diff: string): Promise<string> {
    const client = createClient();
    if (!client) {
        throw new Error(
            'ANTHROPIC_API_KEY is not set.\n' +
            'Run: export ANTHROPIC_API_KEY=your-key-here'
        );
    }

    const cacheKey = getCacheKey(diff, MODEL);
    const cached = aiCache.get(cacheKey);
    if (cached) return cached;

    const result = await withRetry(
        async () => {
            const response = await client.messages.create({
                model: MODEL,
                max_tokens: 256,
                system: `You generate Git commit messages following the Conventional Commits spec.
Format: <type>(<scope>): <short description>
Types: feat, fix, docs, style, refactor, test, chore
Rules:
- Keep the subject line under 72 characters
- Use imperative mood ("add feature" not "added feature")
- Scope is optional but recommended when it adds clarity
- Respond ONLY with the commit message, no explanation, no markdown, no quotes`,
                messages: [
                    {
                        role: 'user',
                        content: `Generate a commit message for this diff:\n\n${diff}`,
                    },
                ],
            });

            const content = response.content[0];
            if (content.type !== 'text') throw new Error('Unexpected response type');
            return content.text.trim();
        },
        {
            retries: 3,
            minTimeout: 500,
            factor: 2,
            onFailedAttempt: (err, attempt) => {
                console.warn(`Commit message generation attempt ${attempt} failed: ${err.message}. Retrying…`);
            },
        }
    );

    aiCache.set(cacheKey, result);
    return result;
}

// ── PR Description ────────────────────────────────────────────────────────────

export async function generatePRDescription(commits: string[]): Promise<string> {
    const client = createClient();
    if (!client) {
        throw new Error(
            'ANTHROPIC_API_KEY is not set.\n' +
            'Run: export ANTHROPIC_API_KEY=your-key-here'
        );
    }

    const commitList = commits.join('\n');
    const cacheKey = getCacheKey(commitList, MODEL);
    const cached = aiCache.get(cacheKey);
    if (cached) return cached;

    const result = await withRetry(
        async () => {
            const response = await client.messages.create({
                model: MODEL,
                max_tokens: 1024,
                system: `You generate clear, structured pull request descriptions based on commit history.
Output a PR description with exactly these three sections using markdown:

## Summary
One or two sentences describing the overall purpose of this PR.

## Changes
A bullet list of the key changes made.

## Testing
Brief notes on how this can be tested or verified.

Be concise and factual. Do not add any preamble or closing remarks.`,
                messages: [
                    {
                        role: 'user',
                        content: `Generate a PR description based on these commits:\n\n${commitList}`,
                    },
                ],
            });

            const content = response.content[0];
            if (content.type !== 'text') throw new Error('Unexpected response type');
            return content.text.trim();
        },
        {
            retries: 3,
            minTimeout: 500,
            factor: 2,
            onFailedAttempt: (err, attempt) => {
                console.warn(`PR description generation attempt ${attempt} failed: ${err.message}. Retrying…`);
            },
        }
    );

    aiCache.set(cacheKey, result);
    return result;
}

// ── Offline check ─────────────────────────────────────────────────────────────

export function isAIAvailable(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
}