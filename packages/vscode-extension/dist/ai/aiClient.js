"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCodeStreaming = generateCodeStreaming;
exports.reviewCode = reviewCode;
exports.fixCode = fixCode;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const client = new sdk_1.default();
const PROMPTS = {
    codeGeneration: `You are an expert software engineer. Generate clean, production-ready code based on the user's request.
- Return ONLY the code, no explanations or markdown fences
- Match the language and style of the surrounding context
- Include necessary imports if needed
- Add brief inline comments for complex logic`,
    codeReview: `You are a senior code reviewer. Analyze the provided code and return a JSON array of issues.
Each issue must have: line (number), severity ("error"|"warning"|"info"), message (string), category ("logic"|"security"|"performance"|"style").
Return ONLY valid JSON, no explanation. Example:
[{"line":5,"severity":"warning","message":"Variable 'x' is never used","category":"style"}]
If no issues found, return an empty array: []`,
    fixCode: `You are an expert software engineer. Fix the issue in the provided code.
Return ONLY the fixed code, no explanations or markdown fences.`,
};
async function generateCodeStreaming(prompt, language, onChunk) {
    const stream = client.messages.stream({
        model: getModel(),
        max_tokens: 2048,
        system: PROMPTS.codeGeneration + (language ? `\nTarget language: ${language}` : ''),
        messages: [{ role: 'user', content: prompt }],
    });
    for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta') {
            onChunk(chunk.delta.text);
        }
    }
}
async function reviewCode(code) {
    const response = await client.messages.create({
        model: getModel(),
        max_tokens: 1024,
        system: PROMPTS.codeReview,
        messages: [{ role: 'user', content: `Review this code:\n\n${code}` }],
    });
    const content = response.content[0];
    if (content.type !== 'text')
        return [];
    try {
        const text = content.text.trim();
        // Strip markdown fences if present
        const json = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        return JSON.parse(json);
    }
    catch {
        return [];
    }
}
async function fixCode(code) {
    const response = await client.messages.create({
        model: getModel(),
        max_tokens: 2048,
        system: PROMPTS.fixCode,
        messages: [{ role: 'user', content: `Fix this code:\n\n${code}` }],
    });
    const content = response.content[0];
    if (content.type !== 'text')
        return code;
    return content.text.trim();
}
function getModel() {
    return 'claude-sonnet-4-6';
}
//# sourceMappingURL=aiClient.js.map