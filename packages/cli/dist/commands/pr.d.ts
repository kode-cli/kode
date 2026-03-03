import { Command } from '@oclif/core';
export default class PR extends Command {
    static description: string;
    static examples: string[];
    static flags: {
        commits: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<number, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
    };
    run(): Promise<void>;
    private runWithSpinner;
}
//# sourceMappingURL=pr.d.ts.map