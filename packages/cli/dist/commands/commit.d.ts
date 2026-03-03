import { Command } from '@oclif/core';
export default class Commit extends Command {
    static description: string;
    static examples: string[];
    static flags: {
        push: import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'no-add': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
        'no-check': import("@oclif/core/lib/interfaces/parser.js").BooleanFlag<boolean>;
    };
    run(): Promise<void>;
    private pushToRemote;
}
//# sourceMappingURL=commit.d.ts.map