import { gotScraping } from 'got-scraping';
import { DEFAULT_TOOL_POLICY } from './policy';

// DRY Principle: Don't Repeat Yourself
// Instead of writing `headerGeneratorOptions: { browsers: ['chrome'] }` in 50 files,
// we centralize the HTTP client configuration.

/**
 * Creates an HTTP GET request with centralized stealth headers and timeout protection.
 * If the Render service URL is passed and proxy proxying is required, it can be extended here.
 */
export async function stealthGet(url: string, options: any = {}) {
    const requestTimeout = options.timeout?.request ?? options.timeoutMs ?? DEFAULT_TOOL_POLICY.timeoutMs;
    const retryLimit = options.retry?.limit ?? options.retryLimit ?? 1;
    const defaultOptions: any = {
        headerGeneratorOptions: { browsers: ['chrome'], os: ['windows', 'macos'] },
        timeout: { request: requestTimeout }, // Centralized timeout handling
        retry: { limit: retryLimit } // Simple retry mechanism across the board
    };

    return gotScraping.get(url, { ...defaultOptions, ...options, timeout: { request: requestTimeout }, retry: { limit: retryLimit } });
}

export async function stealthMobileGet(url: string, options: any = {}) {
    const requestTimeout = options.timeout?.request ?? options.timeoutMs ?? DEFAULT_TOOL_POLICY.timeoutMs;
    const retryLimit = options.retry?.limit ?? options.retryLimit ?? 1;
    const defaultOptions: any = {
        headerGeneratorOptions: { browsers: ['safari'], os: ['ios'], devices: ['mobile'] },
        timeout: { request: requestTimeout },
        retry: { limit: retryLimit }
    };

    return gotScraping.get(url, { ...defaultOptions, ...options, timeout: { request: requestTimeout }, retry: { limit: retryLimit } });
}
