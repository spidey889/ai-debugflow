import { useEffect } from "react";

import { debugStore } from "../debugStore";
import { installFetchTracker } from "../fetchTracker";
import type { DebugStore } from "../types";
import { DebugToggle } from "./DebugToggle";
import { DebugTray } from "./DebugTray";

export interface DebugOverlayProps {
  store?: DebugStore;
  trayId?: string;
  trackFetch?: boolean;
  onSimulateApiCall?: () => Promise<unknown> | unknown;
}

export function DebugOverlay({
  store = debugStore,
  trayId = "ai-debugflow-tray",
  trackFetch = true,
  onSimulateApiCall,
}: DebugOverlayProps) {
  useEffect(() => {
    if (!trackFetch) {
      return;
    }

    return installFetchTracker(globalThis as { fetch?: typeof fetch }, store);
  }, [trackFetch, store]);

  return (
    <>
      <DebugToggle store={store} trayId={trayId} />
      <DebugTray store={store} trayId={trayId} onSimulateApiCall={onSimulateApiCall} />
    </>
  );
}
