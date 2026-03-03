import { z } from 'zod';
declare const QualitySchema: z.ZodObject<{
    lint: z.ZodDefault<z.ZodBoolean>;
    test: z.ZodDefault<z.ZodBoolean>;
    security: z.ZodDefault<z.ZodBoolean>;
    coverage: z.ZodDefault<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        threshold: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        threshold: number;
    }, {
        enabled?: boolean | undefined;
        threshold?: number | undefined;
    }>>;
    customChecks: z.ZodDefault<z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        command: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        command: string;
    }, {
        name: string;
        command: string;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    lint: boolean;
    test: boolean;
    security: boolean;
    coverage: {
        enabled: boolean;
        threshold: number;
    };
    customChecks: {
        name: string;
        command: string;
    }[];
}, {
    lint?: boolean | undefined;
    test?: boolean | undefined;
    security?: boolean | undefined;
    coverage?: {
        enabled?: boolean | undefined;
        threshold?: number | undefined;
    } | undefined;
    customChecks?: {
        name: string;
        command: string;
    }[] | undefined;
}>;
declare const GitSchema: z.ZodObject<{
    branchPattern: z.ZodDefault<z.ZodType<RegExp, z.ZodTypeDef, RegExp>>;
    commitStyle: z.ZodDefault<z.ZodEnum<["conventional-commits", "free-form"]>>;
    autoGenerateMessages: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    branchPattern: RegExp;
    commitStyle: "conventional-commits" | "free-form";
    autoGenerateMessages: boolean;
}, {
    branchPattern?: RegExp | undefined;
    commitStyle?: "conventional-commits" | "free-form" | undefined;
    autoGenerateMessages?: boolean | undefined;
}>;
export declare const KodeConfigSchema: z.ZodObject<{
    project: z.ZodObject<{
        name: z.ZodString;
        template: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        template: string;
    }, {
        name: string;
        template: string;
    }>;
    git: z.ZodDefault<z.ZodObject<{
        branchPattern: z.ZodDefault<z.ZodType<RegExp, z.ZodTypeDef, RegExp>>;
        commitStyle: z.ZodDefault<z.ZodEnum<["conventional-commits", "free-form"]>>;
        autoGenerateMessages: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        branchPattern: RegExp;
        commitStyle: "conventional-commits" | "free-form";
        autoGenerateMessages: boolean;
    }, {
        branchPattern?: RegExp | undefined;
        commitStyle?: "conventional-commits" | "free-form" | undefined;
        autoGenerateMessages?: boolean | undefined;
    }>>;
    quality: z.ZodDefault<z.ZodObject<{
        lint: z.ZodDefault<z.ZodBoolean>;
        test: z.ZodDefault<z.ZodBoolean>;
        security: z.ZodDefault<z.ZodBoolean>;
        coverage: z.ZodDefault<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            threshold: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            threshold: number;
        }, {
            enabled?: boolean | undefined;
            threshold?: number | undefined;
        }>>;
        customChecks: z.ZodDefault<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            command: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            name: string;
            command: string;
        }, {
            name: string;
            command: string;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        lint: boolean;
        test: boolean;
        security: boolean;
        coverage: {
            enabled: boolean;
            threshold: number;
        };
        customChecks: {
            name: string;
            command: string;
        }[];
    }, {
        lint?: boolean | undefined;
        test?: boolean | undefined;
        security?: boolean | undefined;
        coverage?: {
            enabled?: boolean | undefined;
            threshold?: number | undefined;
        } | undefined;
        customChecks?: {
            name: string;
            command: string;
        }[] | undefined;
    }>>;
    ide: z.ZodDefault<z.ZodObject<{
        reviewOnSave: z.ZodDefault<z.ZodBoolean>;
        reviewSeverityThreshold: z.ZodDefault<z.ZodEnum<["error", "warning", "info"]>>;
        aiModel: z.ZodDefault<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        reviewOnSave: boolean;
        reviewSeverityThreshold: "error" | "warning" | "info";
        aiModel: string;
    }, {
        reviewOnSave?: boolean | undefined;
        reviewSeverityThreshold?: "error" | "warning" | "info" | undefined;
        aiModel?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    project: {
        name: string;
        template: string;
    };
    git: {
        branchPattern: RegExp;
        commitStyle: "conventional-commits" | "free-form";
        autoGenerateMessages: boolean;
    };
    quality: {
        lint: boolean;
        test: boolean;
        security: boolean;
        coverage: {
            enabled: boolean;
            threshold: number;
        };
        customChecks: {
            name: string;
            command: string;
        }[];
    };
    ide: {
        reviewOnSave: boolean;
        reviewSeverityThreshold: "error" | "warning" | "info";
        aiModel: string;
    };
}, {
    project: {
        name: string;
        template: string;
    };
    git?: {
        branchPattern?: RegExp | undefined;
        commitStyle?: "conventional-commits" | "free-form" | undefined;
        autoGenerateMessages?: boolean | undefined;
    } | undefined;
    quality?: {
        lint?: boolean | undefined;
        test?: boolean | undefined;
        security?: boolean | undefined;
        coverage?: {
            enabled?: boolean | undefined;
            threshold?: number | undefined;
        } | undefined;
        customChecks?: {
            name: string;
            command: string;
        }[] | undefined;
    } | undefined;
    ide?: {
        reviewOnSave?: boolean | undefined;
        reviewSeverityThreshold?: "error" | "warning" | "info" | undefined;
        aiModel?: string | undefined;
    } | undefined;
}>;
export type KodeConfig = z.infer<typeof KodeConfigSchema>;
export type QualityConfig = z.infer<typeof QualitySchema>;
export type GitConfig = z.infer<typeof GitSchema>;
/**
 * Type-safe helper for kode.config.ts files.
 * Usage: export default defineConfig({ project: { name: 'my-app', template: 'node-express' } })
 */
export declare function defineConfig(config: Partial<KodeConfig> & {
    project: KodeConfig['project'];
}): KodeConfig;
export declare function loadConfig(cwd?: string): Promise<KodeConfig>;
export {};
//# sourceMappingURL=index.d.ts.map