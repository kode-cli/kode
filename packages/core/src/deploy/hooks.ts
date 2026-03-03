
export interface HookContext {
    imageTag: string;
    version: string;
    gitSha: string;
    environment: 'staging' | 'production';
    serverLabel?: string;
    cwd: string;
}

export async function runHooks(
    commands: string | string[] | undefined,
    context: HookContext,
    label: string,
    log: (msg: string) => void
): Promise<void> {
    if (!commands) return;
    const cmds = Array.isArray(commands) ? commands : [commands];
    if (cmds.length === 0) return;

    log(`\n   Running ${label} hooks…`);

    for (const cmd of cmds) {
        const resolved = injectVariables(cmd, context);
        log(`   $ ${resolved}`);

        try {
            const { execa } = await import('execa');  // ← dynamic import here
            const { stdout } = await execa(resolved, {
                cwd: context.cwd,
                shell: true,
                env: {
                    ...process.env,
                    IMAGE_TAG: context.imageTag,
                    VERSION: context.version,
                    GIT_SHA: context.gitSha,
                    ENVIRONMENT: context.environment,
                    SERVER_LABEL: context.serverLabel ?? '',
                },
            });
            if (stdout.trim()) {
                stdout.trim().split('\n').forEach((l) => log(`   ${l}`));
            }
        } catch (err: unknown) {
            const error = err as { stderr?: string; message?: string };
            throw new Error(`Hook "${resolved}" failed:\n${error.stderr ?? error.message ?? String(err)}`);
        }
    }
}


function injectVariables(cmd: string, ctx: HookContext): string {
    return cmd
        .replace(/\$\{IMAGE_TAG\}/g, ctx.imageTag)
        .replace(/\$\{VERSION\}/g, ctx.version)
        .replace(/\$\{GIT_SHA\}/g, ctx.gitSha)
        .replace(/\$\{ENVIRONMENT\}/g, ctx.environment)
        .replace(/\$\{SERVER_LABEL\}/g, ctx.serverLabel ?? '');
}