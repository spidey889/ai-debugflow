import { useState } from "react";

import { debugStore } from "../debugStore";
import { createTrackedFetch, isTrackedFetch, simulateTrackedApiCall } from "../fetchTracker";
import type {
  DebugCategory,
  DebugApiRequestEntry,
  DebugApiResponseEntry,
  DebugLogEntry,
  DebugStore,
} from "../types";
import { DEBUG_LOG_CATEGORIES } from "../types";
import { useDebugStore } from "../useDebugStore";

export interface DebugTrayProps {
  store?: DebugStore;
  trayId?: string;
  title?: string;
  className?: string;
  onSimulateApiCall?: () => Promise<unknown> | unknown;
}

type LogFilter = "all" | DebugCategory;

function formatTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function truncateText(value: string, maxLength = 64) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}

function formatPayloadEntryValue(value: unknown) {
  if (value === null) {
    return "null";
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return truncateText(JSON.stringify(value));
  }

  if (typeof value === "object") {
    return "{...}";
  }

  return String(value);
}

function formatPayloadPreview(payload: DebugLogEntry["payload"]) {
  if (payload === null || payload === undefined) {
    return "";
  }

  if (typeof payload === "string" || typeof payload === "number" || typeof payload === "boolean") {
    return String(payload);
  }

  if (Array.isArray(payload)) {
    return truncateText(JSON.stringify(payload));
  }

  if (typeof payload === "object") {
    return truncateText(
      Object.entries(payload as Record<string, unknown>)
        .slice(0, 4)
        .map(([key, value]) => `${key}: ${formatPayloadEntryValue(value)}`)
        .join(" | "),
      84,
    );
  }

  return "";
}

function LogItem({ entry }: { entry: DebugLogEntry }) {
  const payloadPreview = formatPayloadPreview(entry.payload);

  return (
    <li
      className="debug-tray__item"
      data-log-type={entry.type}
      data-log-category={entry.category}
    >
      <div className="debug-tray__item-row">
        <div className="debug-tray__response-meta">
          <span className="debug-tray__badge debug-tray__badge--category">{entry.category}</span>
          <span className="debug-tray__badge">{entry.type}</span>
        </div>
        <time className="debug-tray__time" dateTime={entry.timestamp}>
          {formatTime(entry.timestamp)}
        </time>
      </div>
      <p className="debug-tray__text">{entry.message}</p>
      {payloadPreview ? <p className="debug-tray__meta">{payloadPreview}</p> : null}
    </li>
  );
}

function ApiRequestItem({ entry }: { entry: DebugApiRequestEntry }) {
  return (
    <li className="debug-tray__item debug-tray__item--api">
      <div className="debug-tray__item-row">
        <span className="debug-tray__method">{entry.method}</span>
        <time className="debug-tray__time" dateTime={entry.timestamp}>
          {formatTime(entry.timestamp)}
        </time>
      </div>
      <p className="debug-tray__text" title={entry.url}>
        {truncateText(entry.url)}
      </p>
    </li>
  );
}

function ApiResponseItem({ entry }: { entry: DebugApiResponseEntry }) {
  return (
    <li className="debug-tray__item debug-tray__item--api" data-response-state={entry.state}>
      <div className="debug-tray__item-row">
        <div className="debug-tray__response-meta">
          <span className={`debug-tray__badge ${entry.ok ? "is-success" : "is-error"}`}>
            {entry.status ?? "ERR"}
          </span>
          <span className="debug-tray__method">{entry.method}</span>
        </div>
        <time className="debug-tray__time" dateTime={entry.timestamp}>
          {formatTime(entry.timestamp)}
        </time>
      </div>
      <p className="debug-tray__text" title={entry.url}>
        {truncateText(entry.url)}
      </p>
      <p className="debug-tray__meta">
        {entry.ok ? "Success" : "Failure"}
        {typeof entry.durationMs === "number" ? ` - ${entry.durationMs}ms` : ""}
        {entry.message ? ` - ${entry.message}` : ""}
      </p>
    </li>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="debug-tray__empty">{message}</p>;
}

export function DebugTray({
  store = debugStore,
  trayId = "ai-debugflow-tray",
  title = "Debug Tray",
  className,
  onSimulateApiCall,
}: DebugTrayProps) {
  const { enabled, logs, apiRequests, apiResponses } = useDebugStore(store);
  const [isSimulating, setIsSimulating] = useState(false);
  const [logFilter, setLogFilter] = useState<LogFilter>("all");

  const classes = ["debug-tray", enabled ? "is-open" : "", className].filter(Boolean).join(" ");
  const reversedLogs = [...logs].reverse();
  const reversedRequests = [...apiRequests].reverse();
  const reversedResponses = [...apiResponses].reverse();
  const filteredLogs =
    logFilter === "all" ? reversedLogs : reversedLogs.filter((entry) => entry.category === logFilter);

  const handleSimulateApiCall = async () => {
    setIsSimulating(true);

    try {
      if (onSimulateApiCall) {
        await onSimulateApiCall();
        store.addDebugLog("Custom simulated API call finished.", "success");
        return;
      }

      if (typeof globalThis.fetch !== "function") {
        store.addDebugLog("Cannot simulate API call because fetch is unavailable.", "warning");
        return;
      }

      const globalFetch = globalThis.fetch;
      const fetchImpl = isTrackedFetch(globalFetch)
        ? globalFetch.bind(globalThis)
        : createTrackedFetch(globalFetch.bind(globalThis), store);

      await simulateTrackedApiCall(fetchImpl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown simulation failure";
      store.addDebugLog(`Simulated API call failed: ${message}`, "error");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <aside id={trayId} className={classes} aria-hidden={!enabled}>
      <div className="debug-tray__surface">
        <div className="debug-tray__handle" aria-hidden="true" />

        <div className="debug-tray__header">
          <div>
            <p className="debug-tray__eyebrow">Hidden developer tool</p>
            <h2 className="debug-tray__title">{title}</h2>
          </div>
          <span className={`debug-tray__live-pill ${enabled ? "is-live" : ""}`}>
            {enabled ? "Live" : "Hidden"}
          </span>
        </div>

        <div className="debug-tray__actions" role="group" aria-label="Debug actions">
          <button
            type="button"
            className="debug-tray__button"
            onClick={() =>
              store.trackEvent("custom", {
                action: "test-log",
                source: "debug-tray",
                message: "Manual test log from the debug tray.",
              })
            }
          >
            Add Test Log
          </button>
          <button
            type="button"
            className="debug-tray__button"
            onClick={() => store.clearDebugLogs()}
          >
            Clear Logs
          </button>
          <button
            type="button"
            className="debug-tray__button debug-tray__button--primary"
            onClick={handleSimulateApiCall}
            disabled={isSimulating}
          >
            {isSimulating ? "Running..." : "Simulate API Call"}
          </button>
        </div>

        <div className="debug-tray__sections">
          <section className="debug-tray__section" aria-label="Live event logs">
            <div className="debug-tray__section-head">
              <h3>Live Event Logs</h3>
              <span>{filteredLogs.length}</span>
            </div>
            <div className="debug-tray__filters" role="group" aria-label="Filter logs by category">
              <button
                type="button"
                className={`debug-tray__filter ${logFilter === "all" ? "is-active" : ""}`}
                onClick={() => setLogFilter("all")}
              >
                all
              </button>
              {DEBUG_LOG_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`debug-tray__filter ${logFilter === category ? "is-active" : ""}`}
                  onClick={() => setLogFilter(category)}
                >
                  {category}
                </button>
              ))}
            </div>
            {reversedLogs.length === 0 ? (
              <EmptyState message="No logs yet. Turn on debug mode and add one small event at a time." />
            ) : filteredLogs.length === 0 ? (
              <EmptyState message="No logs match the selected category filter." />
            ) : (
              <ul className="debug-tray__list">
                {filteredLogs.map((entry) => (
                  <LogItem key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </section>

          <section className="debug-tray__section" aria-label="API request tracker">
            <div className="debug-tray__section-head">
              <h3>API Request Tracker</h3>
              <span>{apiRequests.length}</span>
            </div>
            {reversedRequests.length === 0 ? (
              <EmptyState message="Tracked requests will appear here." />
            ) : (
              <ul className="debug-tray__list">
                {reversedRequests.map((entry) => (
                  <ApiRequestItem key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </section>

          <section className="debug-tray__section" aria-label="API response tracker">
            <div className="debug-tray__section-head">
              <h3>API Response Tracker</h3>
              <span>{apiResponses.length}</span>
            </div>
            {reversedResponses.length === 0 ? (
              <EmptyState message="Tracked responses will appear here." />
            ) : (
              <ul className="debug-tray__list">
                {reversedResponses.map((entry) => (
                  <ApiResponseItem key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </aside>
  );
}
