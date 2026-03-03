/**
 * Converts an SSH remote URL to an HTTPS URL.
 * e.g. git@github.com:user/repo.git → https://github.com/user/repo
 */
export function toHttpsUrl(url: string): string {
    return url
        .trim()
        .replace(/^git@([^:]+):/, 'https://$1/')
        .replace(/\.git$/, '');
}

