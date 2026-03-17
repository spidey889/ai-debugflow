export type DebugLogType = "info" | "success" | "warning" | "error" | "api";

export interface DebugLogEntry {
  id: string;
  message: string;
  type: DebugLogType;
  timestamp: string;
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
  addDebugLog(message: string, type?: DebugLogType): DebugLogEntry;
  clearDebugLogs(): void;
  addApiRequest(input: AddApiRequestInput): DebugApiRequestEntry;
  addApiResponse(input: AddApiResponseInput): DebugApiResponseEntry;
  clearApiActivity(): void;
  reset(): void;
}
