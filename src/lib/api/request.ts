import { getResolvedLocale } from "@/i18n";
import { DEMO_MODE } from "@/lib/demo";

/**
 * Drop-in replacement for `fetch` that works without Eazo SDK.
 * In demo mode, no session header is injected.
 */
export async function request(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      "x-app-locale": getResolvedLocale(),
    },
  });
}
