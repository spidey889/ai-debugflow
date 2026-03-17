export type DebugLogType = "info" | "success" | "warning" | "error" | "api";
export type DebugCategory = "api" | "auth" | "chat" | "state" | "custom";
export type DebugEventPayload = unknown;

export const DEBUG_LOG_CATEGORIES: DebugCategory[] = [
  "api",
  "auth",
  "chat",
  "state",
  "custom",
];

export interface DebugLogEntry {
  id: string;
  message: string;
  type: DebugLogType;
  category: DebugCategory;
  timestamp: string;
  payload?: DebugEventPayload;
}

export interface DebugApiRequestEntry {
  id: string;
  url: string;
  method: string;
  timestamp: string;
}

export interface DebugApiResponseEntry {
  id: string;
  requestId: string;
  url: string;
  method: string;
  status: number | null;
  ok: boolean;
  state: "success" | "error";
  timestamp: string;
  durationMs?: number;
  message?: string;
}

export interface DebugState {
  enabled: boolean;
  logs: DebugLogEntry[];
  apiRequests: DebugApiRequestEntry[];
  apiResponses: DebugApiResponseEntry[];
  maxLogs: number;
  maxApiEntries: number;
}

export interface AddApiRequestInput {
  url: string;
  method?: string;
  timestamp?: string;
}

export interface AddApiResponseInput {
  requestId: string;
  url: string;
  method?: string;
  status?: number | null;
  ok?: boolean;
  timestamp?: string;
  durationMs?: number;
  message?: string;
}

export interface DebugStore {
  getState(): DebugState;
  subscribe(listener: () => void): () => void;
  setEnabled(enabled: boolean): void;
  toggleEnabled(): void;
  addDebugLog(
    message: string,
    type?: DebugLogType,
    category?: DebugCategory,
    payload?: DebugEventPayload,
  ): DebugLogEntry;
  trackEvent(category: DebugCategory, payload?: DebugEventPayload): DebugLogEntry;
  clearDebugLogs(): void;
  addApiRequest(input: AddApiRequestInput): DebugApiRequestEntry;
  addApiResponse(input: AddApiResponseInput): DebugApiResponseEntry;
  clearApiActivity(): void;
  reset(): void;
}
