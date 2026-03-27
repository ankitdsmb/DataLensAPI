import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { stealthGet } from './httpClient';

export async function fetchHtmlDocument(url: string, options: { timeoutMs?: number } = {}) {
  const response = await stealthGet(url, { timeoutMs: options.timeoutMs });
  return {
    html: response.body,
    $: cheerio.load(response.body)
  };
}

export function getElementText($: CheerioAPI, selector: string): string | null {
  const value = $(selector).first().text().trim();
  return value.length > 0 ? value : null;
}

export function getAttribute($: CheerioAPI, selector: string, attribute: string): string | null {
  const value = $(selector).first().attr(attribute)?.trim();
  return value && value.length > 0 ? value : null;
}

export function getMetaContent($: CheerioAPI, selector: string): string | null {
  return getAttribute($, selector, 'content');
}

export function toAbsoluteUrl(value: string | null, baseUrl: string): string | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}
