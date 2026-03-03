import ejs from 'ejs';
import fs from 'fs-extra';
import path from 'path';

export interface TemplateVariables {
    projectName: string;
    [key: string]: string;
}

export interface RenderResult {
    filesWritten: string[];
    outputDir: string;
}

// Directories that should never be copied from a template source
const EXCLUDED_DIRS = new Set(['node_modules', '.git', '.turbo', 'dist', 'coverage']);

/**
 * Renders a template directory into an output directory.
 * All files are processed through EJS with the provided variables.
 * Filenames themselves can also contain EJS-style variable substitution
 * using double underscores: __projectName__ → value.
 */
export async function renderTemplate(
    templateDir: string,
    outputDir: string,
    variables: TemplateVariables
): Promise<RenderResult> {
    if (!(await fs.pathExists(templateDir))) {
        throw new Error(`Template directory not found: ${templateDir}`);
    }

    await fs.ensureDir(outputDir);

    const filesWritten: string[] = [];
    await processDirectory(templateDir, outputDir, variables, filesWritten);

    return { filesWritten, outputDir };
}

async function processDirectory(
    srcDir: string,
    destDir: string,
    variables: TemplateVariables,
    filesWritten: string[]
): Promise<void> {
    const entries = await fs.readdir(srcDir, { withFileTypes: true });

    for (const entry of entries) {
        // Skip directories that should never be rendered (node_modules, .git, etc.)
        if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name)) continue;

        const srcPath = path.join(srcDir, entry.name);
        // Allow filenames like __projectName__.ts → myapp.ts
        const destName = interpolateFilename(entry.name, variables);
        const destPath = path.join(destDir, destName);

        if (entry.isDirectory()) {
            await fs.ensureDir(destPath);
            await processDirectory(srcPath, destPath, variables, filesWritten);
        } else {
            await renderFile(srcPath, destPath, variables);
            filesWritten.push(destPath);
        }
    }
}

async function renderFile(
    srcPath: string,
    destPath: string,
    variables: TemplateVariables
): Promise<void> {
    const content = await fs.readFile(srcPath, 'utf-8');

    // Only run.js EJS on text files — skip binaries
    if (!isTextFile(srcPath)) {
        await fs.copy(srcPath, destPath);
        return;
    }

    try {
        const rendered = ejs.render(content, variables, {
            rmWhitespace: false,
        });
        await fs.ensureDir(path.dirname(destPath));
        await fs.writeFile(destPath, rendered, 'utf-8');
    } catch (err) {
        throw new Error(`Failed to render template file ${srcPath}: ${(err as Error).message}`);
    }
}

function interpolateFilename(filename: string, variables: TemplateVariables): string {
    return filename.replace(/__([a-zA-Z]+)__/g, (_, key) => variables[key] ?? `__${key}__`);
}

function isTextFile(filePath: string): boolean {
    const binaryExtensions = [
        '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico',
        '.pdf', '.zip', '.tar', '.gz',
        '.ttf', '.woff', '.woff2', '.eot',
        '.mp3', '.mp4', '.mov',
    ];
    const ext = path.extname(filePath).toLowerCase();
    return !binaryExtensions.includes(ext);
}

/**
 * Returns the list of available built-in templates.
 */
export function getAvailableTemplates(templatesRoot: string): string[] {
    try {
        return fs.readdirSync(templatesRoot).filter((name) => {
            const fullPath = path.join(templatesRoot, name);
            return fs.statSync(fullPath).isDirectory();
        });
    } catch {
        return [];
    }
}