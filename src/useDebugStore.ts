import { useSyncExternalStore } from "react";

import { debugStore } from "./debugStore";
import type { DebugState, DebugStore } from "./types";

export function useDebugStore(store: DebugStore = debugStore): DebugState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export function useDebugActions(store: DebugStore = debugStore) {
  return {
    setEnabled: store.setEnabled,
    toggleEnabled: store.toggleEnabled,
    addDebugLog: store.addDebugLog,
    clearDebugLogs: store.clearDebugLogs,
    clearApiActivity: store.clearApiActivity,
    reset: store.reset,
  };
}
