import { Command } from '@oclif/core';
export default class Init extends Command {
    static description: string;
    static examples: string[];
    static args: {
        projectName: import("@oclif/core/lib/interfaces/parser.js").Arg<string | undefined, Record<string, unknown>>;
    };
    static flags: {
        template: import("@oclif/core/lib/interfaces/parser.js").OptionFlag<string | undefined, import("@oclif/core/lib/interfaces/parser.js").CustomOptions>;
        'no-install': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'no-git': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'no-github': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
    };
    run(): Promise<void>;
    private createGitHubRepo;
    private runWithSpinner;
    private writeKodeConfig;
    private dim;
}
//# sourceMappingURL=init.d.ts.map