import { vi } from "vitest";

type Responder = (url: URL, init?: RequestInit) => unknown;

export interface MockRoute {
  match: RegExp;
  status?: number;
  body: unknown | Responder;
}

/** Replaces global fetch with a router over `routes`; unmatched URLs fail the test loudly. */
export function mockFetch(routes: MockRoute[]) {
  const calls: string[] = [];
  const fn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
    calls.push(url.href);
    const route = routes.find((r) => r.match.test(url.href));
    if (!route) throw new Error(`Unexpected fetch: ${url.href}`);
    const body = typeof route.body === "function" ? (route.body as Responder)(url, init) : route.body;
    return new Response(JSON.stringify(body), {
      status: route.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fn);
  return { fn, calls };
}
