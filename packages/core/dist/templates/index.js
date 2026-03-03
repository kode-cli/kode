"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderTemplate = renderTemplate;
exports.getAvailableTemplates = getAvailableTemplates;
const ejs_1 = __importDefault(require("ejs"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
// Directories that should never be copied from a template source
const EXCLUDED_DIRS = new Set(['node_modules', '.git', '.turbo', 'dist', 'coverage']);
/**
 * Renders a template directory into an output directory.
 * All files are processed through EJS with the provided variables.
 * Filenames themselves can also contain EJS-style variable substitution
 * using double underscores: __projectName__ → value.
 */
async function renderTemplate(templateDir, outputDir, variables) {
    if (!(await fs_extra_1.default.pathExists(templateDir))) {
        throw new Error(`Template directory not found: ${templateDir}`);
    }
    await fs_extra_1.default.ensureDir(outputDir);
    const filesWritten = [];
    await processDirectory(templateDir, outputDir, variables, filesWritten);
    return { filesWritten, outputDir };
}
async function processDirectory(srcDir, destDir, variables, filesWritten) {
    const entries = await fs_extra_1.default.readdir(srcDir, { withFileTypes: true });
    for (const entry of entries) {
        // Skip directories that should never be rendered (node_modules, .git, etc.)
        if (entry.isDirectory() && EXCLUDED_DIRS.has(entry.name))
            continue;
        const srcPath = path_1.default.join(srcDir, entry.name);
        // Allow filenames like __projectName__.ts → myapp.ts
        const destName = interpolateFilename(entry.name, variables);
        const destPath = path_1.default.join(destDir, destName);
        if (entry.isDirectory()) {
            await fs_extra_1.default.ensureDir(destPath);
            await processDirectory(srcPath, destPath, variables, filesWritten);
        }
        else {
            await renderFile(srcPath, destPath, variables);
            filesWritten.push(destPath);
        }
    }
}
async function renderFile(srcPath, destPath, variables) {
    const content = await fs_extra_1.default.readFile(srcPath, 'utf-8');
    // Only run.js EJS on text files — skip binaries
    if (!isTextFile(srcPath)) {
        await fs_extra_1.default.copy(srcPath, destPath);
        return;
    }
    try {
        const rendered = ejs_1.default.render(content, variables, {
            rmWhitespace: false,
        });
        await fs_extra_1.default.ensureDir(path_1.default.dirname(destPath));
        await fs_extra_1.default.writeFile(destPath, rendered, 'utf-8');
    }
    catch (err) {
        throw new Error(`Failed to render template file ${srcPath}: ${err.message}`);
    }
}
function interpolateFilename(filename, variables) {
    return filename.replace(/__([a-zA-Z]+)__/g, (_, key) => variables[key] ?? `__${key}__`);
}
function isTextFile(filePath) {
    const binaryExtensions = [
        '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico',
        '.pdf', '.zip', '.tar', '.gz',
        '.ttf', '.woff', '.woff2', '.eot',
        '.mp3', '.mp4', '.mov',
    ];
    const ext = path_1.default.extname(filePath).toLowerCase();
    return !binaryExtensions.includes(ext);
}
/**
 * Returns the list of available built-in templates.
 */
function getAvailableTemplates(templatesRoot) {
    try {
        return fs_extra_1.default.readdirSync(templatesRoot).filter((name) => {
            const fullPath = path_1.default.join(templatesRoot, name);
            return fs_extra_1.default.statSync(fullPath).isDirectory();
        });
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=index.js.map