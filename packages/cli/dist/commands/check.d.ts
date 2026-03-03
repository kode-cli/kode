import { Command } from '@oclif/core';
export default class Check extends Command {
    static description: string;
    static examples: string[];
    static flags: {
        fix: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        only: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
    };
    run(): Promise<void>;
    private dim;
}
//# sourceMappingURL=check.d.ts.map