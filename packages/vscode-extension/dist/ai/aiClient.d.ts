export declare function generateCodeStreaming(prompt: string, language: string, onChunk: (text: string) => void): Promise<void>;
export interface ReviewIssue {
    line: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    category: 'logic' | 'security' | 'performance' | 'style';
}
export declare function reviewCode(code: string): Promise<ReviewIssue[]>;
export declare function fixCode(code: string): Promise<string>;
//# sourceMappingURL=aiClient.d.ts.map