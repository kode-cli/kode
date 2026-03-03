export declare class GitClient {
    private git;
    constructor(cwd?: string);
    getStagedDiff(): Promise<string>;
    getCurrentBranch(): Promise<string>;
    getCommitHistory(count?: number): Promise<string[]>;
    commit(message: string): Promise<void>;
    isRepo(): Promise<boolean>;
}
export declare function validateBranchName(name: string, pattern: RegExp): boolean;
//# sourceMappingURL=index.d.ts.map