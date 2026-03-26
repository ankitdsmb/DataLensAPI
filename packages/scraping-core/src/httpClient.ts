import { gotScraping } from 'got-scraping';

// DRY Principle: Don't Repeat Yourself
// Instead of writing `headerGeneratorOptions: { browsers: ['chrome'] }` in 50 files,
// we centralize the HTTP client configuration.

/**
 * Creates an HTTP GET request with centralized stealth headers and timeout protection.
 * If the Render service URL is passed and proxy proxying is required, it can be extended here.
 */
export async function stealthGet(url: string, options: any = {}) {
    const defaultOptions: any = {
        headerGeneratorOptions: { browsers: ['chrome'], os: ['windows', 'macos'] },
        timeout: { request: 15000 }, // Centralized timeout handling
        retry: { limit: 1 } // Simple retry mechanism across the board
    };

    return gotScraping.get(url, { ...defaultOptions, ...options });
}

export async function stealthMobileGet(url: string, options: any = {}) {
    const defaultOptions: any = {
        headerGeneratorOptions: { browsers: ['safari'], os: ['ios'], devices: ['mobile'] },
        timeout: { request: 15000 },
        retry: { limit: 1 }
    };

    return gotScraping.get(url, { ...defaultOptions, ...options });
}
