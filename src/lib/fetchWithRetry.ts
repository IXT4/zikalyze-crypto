// ═══════════════════════════════════════════════════════════════════════════════
// 🔄 fetchWithRetry — Robust fetch with exponential backoff and timeout
// ═══════════════════════════════════════════════════════════════════════════════
// Handles transient network errors ("Load failed", timeouts) with automatic retries
// ═══════════════════════════════════════════════════════════════════════════════

export interface FetchRetryOptions {
  maxRetries?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_OPTIONS: Required<FetchRetryOptions> = {
  maxRetries: 4,
  timeoutMs: 12000,
  baseDelayMs: 800,
  maxDelayMs: 6000,
};

/**
 * Fetch with automatic retry on network failures and timeouts
 * Uses exponential backoff to prevent hammering servers
 */
export async function fetchWithRetry(
  url: string,
  options: FetchRetryOptions = {}
): Promise<Response> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
        },
      });
      clearTimeout(timeout);
      return response;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err as Error;

      const errorMessage = (err as Error).message || '';
      const isNetworkError = 
        errorMessage.includes('Load failed') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('Network request failed') ||
        (err as Error).name === 'AbortError' ||
        (err as Error).name === 'TypeError';

      // Only retry on network/timeout errors
      if (!isNetworkError) {
        throw err;
      }

      // Log retry attempt (not the last one)
      if (attempt < config.maxRetries - 1) {
        const delay = Math.min(
          config.baseDelayMs * Math.pow(1.5, attempt) + Math.random() * 500,
          config.maxDelayMs
        );
        console.log(`[FetchRetry] Attempt ${attempt + 1}/${config.maxRetries} failed for ${url.split('?')[0]}, retrying in ${Math.round(delay)}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error(`Fetch failed after ${config.maxRetries} retries`);
}

/**
 * Safe fetch that returns null on failure instead of throwing
 * Useful for optional data fetches where failure is acceptable
 */
export async function safeFetch(
  url: string,
  options: FetchRetryOptions = {}
): Promise<Response | null> {
  try {
    return await fetchWithRetry(url, options);
  } catch {
    return null;
  }
}

export default fetchWithRetry;
