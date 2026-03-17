import type {
  AddApiRequestInput,
  AddApiResponseInput,
  DebugApiRequestEntry,
  DebugApiResponseEntry,
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

    addDebugLog(message, type: DebugLogType = "info") {
      const entry: DebugLogEntry = {
        id: createId("log"),
        message,
        type,
        timestamp: createTimestamp(),
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

export const addDebugLog = (message: string, type?: DebugLogType) =>
  debugStore.addDebugLog(message, type);

export const clearDebugLogs = () => debugStore.clearDebugLogs();
