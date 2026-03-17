import type {
  AddApiRequestInput,
  AddApiResponseInput,
  DebugCategory,
  DebugApiRequestEntry,
  DebugApiResponseEntry,
  DebugEventPayload,
  DebugLogEntry,
  DebugLogType,
  DebugState,
  DebugStore,
} from "./types";

type Listener = () => void;

let nextEntryId = 0;

const createId = (prefix: string) => `${prefix}-${Date.now()}-${nextEntryId++}`;
const createTimestamp = () => new Date().toISOString();

function trimEntries<T>(entries: T[], nextEntry: T, limit: number): T[] {
  return [...entries, nextEntry].slice(-limit);
}

function getDefaultCategory(type: DebugLogType, category?: DebugCategory): DebugCategory {
  if (category) {
    return category;
  }

  return type === "api" ? "api" : "custom";
}

function formatPayloadValue(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string") {
    return value.length > 48 ? `${value.slice(0, 47)}...` : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }

    return `[${value.slice(0, 3).map(formatPayloadValue).join(", ")}${value.length > 3 ? ", ..." : ""}]`;
  }

  if (typeof value === "object") {
    return "{...}";
  }

  return String(value);
}

function summarizePayload(payload?: DebugEventPayload): string {
  if (payload === null || payload === undefined) {
    return "";
  }

  if (typeof payload === "string" || typeof payload === "number" || typeof payload === "boolean") {
    return String(payload);
  }

  if (Array.isArray(payload)) {
    return formatPayloadValue(payload);
  }

  if (typeof payload === "object") {
    const entries = Object.entries(payload as Record<string, unknown>).slice(0, 4);

    if (entries.length === 0) {
      return "event";
    }

    return entries.map(([key, value]) => `${key}=${formatPayloadValue(value)}`).join(" ");
  }

  return "event";
}

function inferTrackEventType(
  category: DebugCategory,
  payload?: DebugEventPayload,
): DebugLogType {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;

    if (record.error) {
      return "error";
    }

    if (record.success === true) {
      return "success";
    }

    if (record.success === false) {
      return "warning";
    }
  }

  return category === "api" ? "api" : "info";
}

function createTrackEventMessage(category: DebugCategory, payload?: DebugEventPayload): string {
  const summary = summarizePayload(payload);
  return summary ? `${category}: ${summary}` : `${category} event`;
}

export function createDebugStore(
  initialState: Partial<Pick<DebugState, "enabled" | "maxLogs" | "maxApiEntries">> = {},
): DebugStore {
  let state: DebugState = {
    enabled: initialState.enabled ?? false,
    logs: [],
    apiRequests: [],
    apiResponses: [],
    maxLogs: initialState.maxLogs ?? 80,
    maxApiEntries: initialState.maxApiEntries ?? 60,
  };

  const listeners = new Set<Listener>();

  const emit = () => {
    listeners.forEach((listener) => listener());
  };

  const setState = (updater: (currentState: DebugState) => DebugState) => {
    state = updater(state);
    emit();
  };

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    setEnabled(enabled) {
      setState((currentState) =>
        currentState.enabled === enabled ? currentState : { ...currentState, enabled },
      );
    },

    toggleEnabled() {
      setState((currentState) => ({ ...currentState, enabled: !currentState.enabled }));
    },

    addDebugLog(
      message,
      type: DebugLogType = "info",
      category?: DebugCategory,
      payload?: DebugEventPayload,
    ) {
      const entry: DebugLogEntry = {
        id: createId("log"),
        message,
        type,
        category: getDefaultCategory(type, category),
        timestamp: createTimestamp(),
        payload,
      };

      setState((currentState) => ({
        ...currentState,
        logs: trimEntries(currentState.logs, entry, currentState.maxLogs),
      }));

      return entry;
    },

    trackEvent(category, payload) {
      const entry: DebugLogEntry = {
        id: createId("log"),
        message: createTrackEventMessage(category, payload),
        type: inferTrackEventType(category, payload),
        category,
        timestamp: createTimestamp(),
        payload,
      };

      setState((currentState) => ({
        ...currentState,
        logs: trimEntries(currentState.logs, entry, currentState.maxLogs),
      }));

      return entry;
    },

    clearDebugLogs() {
      setState((currentState) =>
        currentState.logs.length === 0 ? currentState : { ...currentState, logs: [] },
      );
    },

    addApiRequest(input: AddApiRequestInput) {
      const entry: DebugApiRequestEntry = {
        id: createId("request"),
        url: input.url,
        method: (input.method ?? "GET").toUpperCase(),
        timestamp: input.timestamp ?? createTimestamp(),
      };

      setState((currentState) => ({
        ...currentState,
        apiRequests: trimEntries(currentState.apiRequests, entry, currentState.maxApiEntries),
      }));

      return entry;
    },

    addApiResponse(input: AddApiResponseInput) {
      const ok =
        input.ok ??
        (typeof input.status === "number" ? input.status >= 200 && input.status < 300 : false);

      const entry: DebugApiResponseEntry = {
        id: createId("response"),
        requestId: input.requestId,
        url: input.url,
        method: (input.method ?? "GET").toUpperCase(),
        status: input.status ?? null,
        ok,
        state: ok ? "success" : "error",
        timestamp: input.timestamp ?? createTimestamp(),
        durationMs: input.durationMs,
        message: input.message,
      };

      setState((currentState) => ({
        ...currentState,
        apiResponses: trimEntries(currentState.apiResponses, entry, currentState.maxApiEntries),
      }));

      return entry;
    },

    clearApiActivity() {
      setState((currentState) =>
        currentState.apiRequests.length === 0 && currentState.apiResponses.length === 0
          ? currentState
          : { ...currentState, apiRequests: [], apiResponses: [] },
      );
    },

    reset() {
      setState((currentState) => ({
        ...currentState,
        logs: [],
        apiRequests: [],
        apiResponses: [],
      }));
    },
  };
}

export const debugStore = createDebugStore();

export const addDebugLog = (
  message: string,
  type?: DebugLogType,
  category?: DebugCategory,
  payload?: DebugEventPayload,
) => debugStore.addDebugLog(message, type, category, payload);

export const trackEvent = (category: DebugCategory, payload?: DebugEventPayload) =>
  debugStore.trackEvent(category, payload);

export const clearDebugLogs = () => debugStore.clearDebugLogs();
export const clearApiActivity = () => debugStore.clearApiActivity();

export const debug = {
  getState: () => debugStore.getState(),
  addDebugLog: (
    message: string,
    type?: DebugLogType,
    category?: DebugCategory,
    payload?: DebugEventPayload,
  ) => debugStore.addDebugLog(message, type, category, payload),
  trackEvent: (category: DebugCategory, payload?: DebugEventPayload) =>
    debugStore.trackEvent(category, payload),
  clearDebugLogs: () => debugStore.clearDebugLogs(),
  clearApiActivity: () => debugStore.clearApiActivity(),
  reset: () => debugStore.reset(),
};
