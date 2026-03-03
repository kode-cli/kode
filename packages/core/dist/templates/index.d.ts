export interface TemplateVariables {
    projectName: string;
    [key: string]: string;
}
export interface RenderResult {
    filesWritten: string[];
    outputDir: string;
}
/**
 * Renders a template directory into an output directory.
 * All files are processed through EJS with the provided variables.
 * Filenames themselves can also contain EJS-style variable substitution
 * using double underscores: __projectName__ → value.
 */
export declare function renderTemplate(templateDir: string, outputDir: string, variables: TemplateVariables): Promise<RenderResult>;
/**
 * Returns the list of available built-in templates.
 */
export declare function getAvailableTemplates(templatesRoot: string): string[];
//# sourceMappingURL=index.d.ts.map