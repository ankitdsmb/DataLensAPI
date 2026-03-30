import { stealthGet } from '../httpClient';
import { RequestValidationError, safeJsonParse } from '../validation';

export const DNS_TYPES = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'PTR'] as const;

type DnsType = (typeof DNS_TYPES)[number];

export type DnsAnswerSummary = {
  name: string | null;
  type: number | null;
  ttl: number | null;
  data: string | null;
};

export function normalizeDomain(body: Record<string, unknown>) {
  const domain = typeof body.domain === 'string' ? body.domain.trim() : '';
  if (!domain) {
    throw new RequestValidationError('domain is required', { field: 'domain' });
  }

  return domain;
}

export function normalizeDomainTarget(body: Record<string, unknown>) {
  const domain = typeof body.domain === 'string' ? body.domain.trim() : '';
  const ip = typeof body.ip === 'string' ? body.ip.trim() : '';

  if (!domain && !ip) {
    throw new RequestValidationError('domain or ip is required', {
      field: 'domain',
      alternateField: 'ip'
    });
  }

  return { domain, ip };
}

export async function lookupDnsRecord(name: string, type: DnsType | string, timeoutMs: number) {
  const url = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${encodeURIComponent(type)}`;
  const response = await stealthGet(url, { timeoutMs, throwHttpErrors: false });
  return safeJsonParse<Record<string, unknown>>(response.body, {}) ?? {};
}

export async function lookupDomainARecord(domain: string, timeoutMs: number) {
  return lookupDnsRecord(domain, 'A', timeoutMs);
}

export async function fetchDomainHttpSnapshot(domain: string, timeoutMs: number) {
  const url = `https://${domain}`;
  const response = await stealthGet(url, { timeoutMs, throwHttpErrors: false });

  return {
    status: response.statusCode ?? null,
    redirected: Boolean(response.redirectUrls?.length),
    finalUrl: response.redirectUrls?.length ? response.redirectUrls[response.redirectUrls.length - 1] : url
  };
}

export function toAvailability(dnsPayload: Record<string, unknown>) {
  return {
    available: dnsPayload.Status === 3,
    dnsStatus: dnsPayload.Status ?? null
  };
}

export function summarizeDnsAnswers(dnsPayload: Record<string, unknown>): DnsAnswerSummary[] {
  const answers = Array.isArray(dnsPayload.Answer) ? dnsPayload.Answer : [];

  return answers.map((answer) => {
    const record = typeof answer === 'object' && answer !== null ? (answer as Record<string, unknown>) : {};

    return {
      name: typeof record.name === 'string' ? record.name : null,
      type: typeof record.type === 'number' ? record.type : null,
      ttl: typeof record.TTL === 'number' ? record.TTL : null,
      data: typeof record.data === 'string' ? record.data : null
    };
  });
}

export function extractDnsAnswerData(dnsPayload: Record<string, unknown>) {
  return summarizeDnsAnswers(dnsPayload)
    .map((answer) => answer.data)
    .filter((answer): answer is string => Boolean(answer));
}

export async function runDnsMatrixLookup(domain: string, ip: string, timeoutMs: number) {
  const results: Array<{ type: DnsType; name: string; data?: Record<string, unknown>; error?: string }> = [];

  for (const type of DNS_TYPES) {
    if (type === 'PTR' && !ip) {
      continue;
    }

    const name = type === 'PTR' ? `${ip.split('.').reverse().join('.')}.in-addr.arpa` : domain;

    try {
      const data = await lookupDnsRecord(name, type, timeoutMs);
      results.push({ type, name, data });
    } catch (error: any) {
      results.push({
        type,
        name,
        error: error?.message ?? 'lookup_failed'
      });
    }
  }

  return results;
}
