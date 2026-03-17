import { debugStore } from "./debugStore";
import type { DebugStore } from "./types";

export type FetchLike = typeof fetch;
export type FetchTarget = { fetch?: typeof fetch };

const TRACKED_FETCH_FLAG = Symbol.for("ai-debugflow.tracked-fetch");
const installedTargets = new WeakMap<object, { original: typeof fetch; tracked: typeof fetch }>();

type TrackableFetch = typeof fetch & { [TRACKED_FETCH_FLAG]?: boolean };

function createTimestamp() {
  return new Date().toISOString();
}

function getRequestUrl(input: RequestInfo | URL) {
  if (typeof input === "string") {
    return input;
  }

  if (typeof URL !== "undefined" && input instanceof URL) {
    return input.toString();
  }

  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.url;
  }

  return String(input);
}

function getRequestMethod(input: RequestInfo | URL, init?: RequestInit) {
  if (init?.method) {
    return init.method.toUpperCase();
  }

  if (typeof Request !== "undefined" && input instanceof Request && input.method) {
    return input.method.toUpperCase();
  }

  return "GET";
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown request failure";
}

export function isTrackedFetch(fetchImpl: unknown): fetchImpl is FetchLike {
  return Boolean((fetchImpl as TrackableFetch | undefined)?.[TRACKED_FETCH_FLAG]);
}

export function createTrackedFetch(
  originalFetch: FetchLike,
  store: DebugStore = debugStore,
): FetchLike {
  if (isTrackedFetch(originalFetch)) {
    return originalFetch;
  }

  const trackedFetch: TrackableFetch = async (input, init) => {
    const startedAt = Date.now();
    const url = getRequestUrl(input);
    const method = getRequestMethod(input, init);

    const request = store.addApiRequest({
      url,
      method,
      timestamp: createTimestamp(),
    });

    store.addDebugLog(`${method} ${url}`, "api");

    try {
      const response = await originalFetch(input, init);
      const durationMs = Date.now() - startedAt;

      store.addApiResponse({
        requestId: request.id,
        url,
        method,
        status: response.status,
        ok: response.ok,
        durationMs,
        timestamp: createTimestamp(),
      });

      store.addDebugLog(
        `${method} ${url} -> ${response.status}`,
        response.ok ? "api" : "warning",
      );

      return response;
    } catch (error) {
      const message = getErrorMessage(error);

      store.addApiResponse({
        requestId: request.id,
        url,
        method,
        status: null,
        ok: false,
        durationMs: Date.now() - startedAt,
        message,
        timestamp: createTimestamp(),
      });

      store.addDebugLog(`${method} ${url} failed: ${message}`, "error");

      throw error;
    }
  };

  trackedFetch[TRACKED_FETCH_FLAG] = true;
  return trackedFetch;
}

export function installFetchTracker(
  target: FetchTarget = globalThis as FetchTarget,
  store: DebugStore = debugStore,
) {
  if (!target || typeof target.fetch !== "function") {
    return () => {};
  }

  const mutableTarget = target as FetchTarget & object & { fetch: typeof fetch };

  if (installedTargets.has(mutableTarget)) {
    const installed = installedTargets.get(mutableTarget);

    if (installed) {
      mutableTarget.fetch = installed.original;
      installedTargets.delete(mutableTarget);
    }
  }

  const originalFetch = mutableTarget.fetch;
  const trackedFetch = createTrackedFetch(originalFetch.bind(mutableTarget), store);

  mutableTarget.fetch = trackedFetch;
  installedTargets.set(mutableTarget, {
    original: originalFetch,
    tracked: trackedFetch,
  });

  return () => {
    const installed = installedTargets.get(mutableTarget);

    if (!installed) {
      return;
    }

    mutableTarget.fetch = installed.original;
    installedTargets.delete(mutableTarget);
  };
}

export async function simulateTrackedApiCall(fetchImpl: FetchLike) {
  const payload = encodeURIComponent(
    JSON.stringify({
      source: "ai-debugflow",
      status: "ok",
      timestamp: createTimestamp(),
    }),
  );

  return fetchImpl(`data:application/json,${payload}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
}
