import { Command } from '@oclif/core';
export default class PR extends Command {
    static description: string;
    static examples: string[];
    static flags: {
        commits: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<number, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        ai: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
    };
    run(): Promise<void>;
    /**
     * Builds a structured PR description template from raw commit messages
     * without requiring AI.
     */
    private buildManualTemplate;
    private dim;
}
//# sourceMappingURL=pr.d.ts.map