import { debugStore } from "../debugStore";
import type { DebugStore } from "../types";
import { useDebugStore } from "../useDebugStore";

export interface DebugToggleProps {
  store?: DebugStore;
  trayId?: string;
  label?: string;
  className?: string;
}

export function DebugToggle({
  store = debugStore,
  trayId = "ai-debugflow-tray",
  label = "Debug",
  className,
}: DebugToggleProps) {
  const { enabled } = useDebugStore(store);
  const classes = ["debug-toggle", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <button
        type="button"
        className={`debug-toggle__button ${enabled ? "is-active" : ""}`}
        aria-controls={trayId}
        aria-expanded={enabled}
        aria-label={enabled ? "Turn debug mode off" : "Turn debug mode on"}
        onClick={() => store.toggleEnabled()}
      >
        <span className={`debug-toggle__dot ${enabled ? "is-active" : ""}`} aria-hidden="true" />
        <span className="debug-toggle__label">{enabled ? `${label} On` : `${label} Off`}</span>
      </button>
    </div>
  );
}
