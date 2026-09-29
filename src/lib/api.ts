import { useEffect, useState } from "react";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

const responses = new Map<string, Promise<unknown>>();

export async function getJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: "application/json" } });
  } catch {
    throw new ApiError("Couldn't reach the server. Check your connection and try again.", 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(body?.error ?? `Request failed (${res.status})`, res.status);
  }
  return body as T;
}

/** Fetches once per URL for the lifetime of the page; failed requests are retried on next use. */
export function cachedJson<T>(url: string): Promise<T> {
  let p = responses.get(url) as Promise<T> | undefined;
  if (!p) {
    p = getJson<T>(url);
    responses.set(url, p);
    p.catch(() => responses.delete(url));
  }
  return p;
}

export type ApiState<T> =
  | { status: "loading"; data?: undefined; error?: undefined }
  | { status: "success"; data: T; error?: undefined }
  | { status: "error"; data?: undefined; error: ApiError };

export function useApi<T>(url: string | null): ApiState<T> & { retry: () => void } {
  const [state, setState] = useState<ApiState<T>>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!url) return;
    let active = true;
    setState({ status: "loading" });
    cachedJson<T>(url).then(
      (data) => active && setState({ status: "success", data }),
      (error: unknown) =>
        active &&
        setState({
          status: "error",
          error: error instanceof ApiError ? error : new ApiError(String(error), 0),
        }),
    );
    return () => {
      active = false;
    };
  }, [url, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

/** Like useApi, for a dynamic list of URLs. Returns a state per URL. */
export function useApiMany<T>(urls: string[]): Record<string, ApiState<T>> {
  const [states, setStates] = useState<Record<string, ApiState<T>>>({});
  const joined = urls.join("\n");

  useEffect(() => {
    let active = true;
    const list = joined ? joined.split("\n") : [];
    setStates((prev) => Object.fromEntries(list.map((u) => [u, prev[u] ?? { status: "loading" }])));
    for (const url of list) {
      cachedJson<T>(url).then(
        (data) => active && setStates((s) => ({ ...s, [url]: { status: "success", data } })),
        (error: unknown) =>
          active &&
          setStates((s) => ({
            ...s,
            [url]: { status: "error", error: error instanceof ApiError ? error : new ApiError(String(error), 0) },
          })),
      );
    }
    return () => {
      active = false;
    };
  }, [joined]);

  return states;
}

export const areaUrl = (postcode: string, section?: string) =>
  `/api/areas/${encodeURIComponent(postcode.replace(/\s+/g, ""))}${section ? `/${section}` : ""}`;
