const USER_AGENT =
  process.env.UPSTREAM_USER_AGENT ??
  "N21-Neighbourhood-Explorer/1.0 (+https://github.com/chopan21/N21)";

export class UpstreamError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly source: string,
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

export interface FetchJsonOptions {
  source: string;
  method?: "GET" | "POST";
  body?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export async function fetchJson<T>(url: string, opts: FetchJsonOptions): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: opts.method ?? "GET",
      body: opts.body,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        ...opts.headers,
      },
      signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
    });
  } catch (err) {
    const reason = err instanceof Error && err.name === "TimeoutError" ? "timed out" : "unreachable";
    throw new UpstreamError(`${opts.source} is ${reason}`, 504, opts.source);
  }

  if (!res.ok) {
    throw new UpstreamError(`${opts.source} responded with ${res.status}`, res.status, opts.source);
  }
  return (await res.json()) as T;
}
