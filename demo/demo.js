const DEBUG_CATEGORIES = ["api", "auth", "chat", "state", "custom"];
const TRACKED_FETCH_FLAG = "__ai_debugflow_tracked_fetch__";

const state = {
  enabled: false,
  logs: [],
  apiRequests: [],
  apiResponses: [],
  maxLogs: 80,
  maxApiEntries: 60,
};

const demoState = {
  roomId: 101,
  status: "Waiting",
  lastEvent: "Demo booted",
};

let nextEntryId = 0;
let logFilter = "all";
let isSimulating = false;
const listeners = new Set();
const overlayRoot = document.getElementById("debug-overlay-root");

function createId(prefix) {
  return `${prefix}-${Date.now()}-${nextEntryId++}`;
}

function createTimestamp() {
  return new Date().toISOString();
}

function trimEntries(entries, nextEntry, limit) {
  return [...entries, nextEntry].slice(-limit);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function truncateText(value, maxLength = 64) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}...`;
}

function formatPayloadValue(value) {
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
    return truncateText(JSON.stringify(value), 48);
  }

  if (typeof value === "object") {
    return "{...}";
  }

  return String(value);
}

function summarizePayload(payload) {
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
    const entries = Object.entries(payload).slice(0, 4);
    return entries.length === 0
      ? "event"
      : entries.map(([key, value]) => `${key}=${formatPayloadValue(value)}`).join(" ");
  }

  return "event";
}

function formatPayloadPreview(payload) {
  if (payload === null || payload === undefined) {
    return "";
  }

  if (typeof payload === "string" || typeof payload === "number" || typeof payload === "boolean") {
    return String(payload);
  }

  if (Array.isArray(payload)) {
    return truncateText(JSON.stringify(payload), 84);
  }

  if (typeof payload === "object") {
    return truncateText(
      Object.entries(payload)
        .slice(0, 4)
        .map(([key, value]) => `${key}: ${formatPayloadValue(value)}`)
        .join(" | "),
      84,
    );
  }

  return "";
}

function inferTrackEventType(category, payload) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    if (payload.error) {
      return "error";
    }

    if (payload.success === true) {
      return "success";
    }

    if (payload.success === false) {
      return "warning";
    }
  }

  return category === "api" ? "api" : "info";
}

function getDefaultCategory(type, category) {
  if (category) {
    return category;
  }

  return type === "api" ? "api" : "custom";
}

function createTrackEventMessage(category, payload) {
  const summary = summarizePayload(payload);
  return summary ? `${category}: ${summary}` : `${category} event`;
}

function emit() {
  listeners.forEach((listener) => listener(state));
  renderOverlay();
  renderDemoMetrics();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setEnabled(enabled) {
  if (state.enabled === enabled) {
    return;
  }

  state.enabled = enabled;
  emit();
}

function toggleEnabled() {
  state.enabled = !state.enabled;
  emit();
}

function addDebugLog(message, type = "info", category, payload) {
  const entry = {
    id: createId("log"),
    message,
    type,
    category: getDefaultCategory(type, category),
    timestamp: createTimestamp(),
    payload,
  };

  state.logs = trimEntries(state.logs, entry, state.maxLogs);
  emit();
  return entry;
}

function trackEvent(category, payload) {
  const entry = {
    id: createId("log"),
    message: createTrackEventMessage(category, payload),
    type: inferTrackEventType(category, payload),
    category,
    timestamp: createTimestamp(),
    payload,
  };

  state.logs = trimEntries(state.logs, entry, state.maxLogs);
  emit();
  return entry;
}

function clearDebugLogs() {
  if (state.logs.length === 0) {
    return;
  }

  state.logs = [];
  emit();
}

function addApiRequest({ url, method = "GET", timestamp = createTimestamp() }) {
  const entry = {
    id: createId("request"),
    url,
    method: method.toUpperCase(),
    timestamp,
  };

  state.apiRequests = trimEntries(state.apiRequests, entry, state.maxApiEntries);
  emit();
  return entry;
}

function addApiResponse({
  requestId,
  url,
  method = "GET",
  status = null,
  ok,
  timestamp = createTimestamp(),
  durationMs,
  message,
}) {
  const resolvedOk =
    typeof ok === "boolean" ? ok : typeof status === "number" ? status >= 200 && status < 300 : false;

  const entry = {
    id: createId("response"),
    requestId,
    url,
    method: method.toUpperCase(),
    status,
    ok: resolvedOk,
    state: resolvedOk ? "success" : "error",
    timestamp,
    durationMs,
    message,
  };

  state.apiResponses = trimEntries(state.apiResponses, entry, state.maxApiEntries);
  emit();
  return entry;
}

function clearApiActivity() {
  if (state.apiRequests.length === 0 && state.apiResponses.length === 0) {
    return;
  }

  state.apiRequests = [];
  state.apiResponses = [];
  emit();
}

function reset() {
  state.logs = [];
  state.apiRequests = [];
  state.apiResponses = [];
  emit();
}

function getState() {
  return state;
}

const debug = {
  getState,
  subscribe,
  setEnabled,
  toggleEnabled,
  addDebugLog,
  trackEvent,
  clearDebugLogs,
  addApiRequest,
  addApiResponse,
  clearApiActivity,
  reset,
};

window.debug = debug;

function getRequestUrl(input) {
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

function getRequestMethod(input, init) {
  if (init && init.method) {
    return init.method.toUpperCase();
  }

  if (typeof Request !== "undefined" && input instanceof Request && input.method) {
    return input.method.toUpperCase();
  }

  return "GET";
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : "Unknown request failure";
}

function isTrackedFetch(fetchImpl) {
  return Boolean(fetchImpl && fetchImpl[TRACKED_FETCH_FLAG]);
}

function createTrackedFetch(originalFetch) {
  if (isTrackedFetch(originalFetch)) {
    return originalFetch;
  }

  const trackedFetch = async (input, init) => {
    const startedAt = Date.now();
    const url = getRequestUrl(input);
    const method = getRequestMethod(input, init);

    const request = addApiRequest({
      url,
      method,
      timestamp: createTimestamp(),
    });

    trackEvent("api", {
      phase: "request",
      method,
      url,
    });

    try {
      const response = await originalFetch(input, init);
      const durationMs = Date.now() - startedAt;

      addApiResponse({
        requestId: request.id,
        url,
        method,
        status: response.status,
        ok: response.ok,
        durationMs,
        timestamp: createTimestamp(),
      });

      trackEvent("api", {
        phase: "response",
        method,
        url,
        status: response.status,
        success: response.ok,
        durationMs,
      });

      return response;
    } catch (error) {
      const message = getErrorMessage(error);

      addApiResponse({
        requestId: request.id,
        url,
        method,
        status: null,
        ok: false,
        durationMs: Date.now() - startedAt,
        message,
        timestamp: createTimestamp(),
      });

      trackEvent("api", {
        phase: "response",
        method,
        url,
        success: false,
        durationMs: Date.now() - startedAt,
        error: message,
      });

      throw error;
    }
  };

  trackedFetch[TRACKED_FETCH_FLAG] = true;
  return trackedFetch;
}

function installFetchTracker(target = window) {
  if (!target || typeof target.fetch !== "function" || isTrackedFetch(target.fetch)) {
    return;
  }

  const originalFetch = target.fetch.bind(target);
  target.fetch = createTrackedFetch(originalFetch);
}

async function simulateTrackedApiCall() {
  if (typeof window.fetch !== "function") {
    addDebugLog("Fetch is not available in this browser.", "warning");
    return;
  }

  const payload = encodeURIComponent(
    JSON.stringify({
      source: "ai-debugflow-demo",
      status: "ok",
      timestamp: createTimestamp(),
    }),
  );

  return window.fetch(`data:application/json,${payload}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function renderLogItem(entry) {
  const payloadPreview = formatPayloadPreview(entry.payload);

  return `
    <li class="debug-tray__item" data-log-type="${escapeHtml(entry.type)}" data-log-category="${escapeHtml(entry.category)}">
      <div class="debug-tray__item-row">
        <div class="debug-tray__response-meta">
          <span class="debug-tray__badge debug-tray__badge--category">${escapeHtml(entry.category)}</span>
          <span class="debug-tray__badge">${escapeHtml(entry.type)}</span>
        </div>
        <time class="debug-tray__time" datetime="${escapeHtml(entry.timestamp)}">${escapeHtml(formatTime(entry.timestamp))}</time>
      </div>
      <p class="debug-tray__text">${escapeHtml(entry.message)}</p>
      ${payloadPreview ? `<p class="debug-tray__meta">${escapeHtml(payloadPreview)}</p>` : ""}
    </li>
  `;
}

function renderApiRequestItem(entry) {
  return `
    <li class="debug-tray__item debug-tray__item--api">
      <div class="debug-tray__item-row">
        <span class="debug-tray__method">${escapeHtml(entry.method)}</span>
        <time class="debug-tray__time" datetime="${escapeHtml(entry.timestamp)}">${escapeHtml(formatTime(entry.timestamp))}</time>
      </div>
      <p class="debug-tray__text" title="${escapeHtml(entry.url)}">${escapeHtml(truncateText(entry.url, 64))}</p>
    </li>
  `;
}

function renderApiResponseItem(entry) {
  const durationLabel = typeof entry.durationMs === "number" ? ` - ${entry.durationMs}ms` : "";
  const messageLabel = entry.message ? ` - ${entry.message}` : "";

  return `
    <li class="debug-tray__item debug-tray__item--api" data-response-state="${escapeHtml(entry.state)}">
      <div class="debug-tray__item-row">
        <div class="debug-tray__response-meta">
          <span class="debug-tray__badge ${entry.ok ? "is-success" : "is-error"}">${escapeHtml(entry.status ?? "ERR")}</span>
          <span class="debug-tray__method">${escapeHtml(entry.method)}</span>
        </div>
        <time class="debug-tray__time" datetime="${escapeHtml(entry.timestamp)}">${escapeHtml(formatTime(entry.timestamp))}</time>
      </div>
      <p class="debug-tray__text" title="${escapeHtml(entry.url)}">${escapeHtml(truncateText(entry.url, 64))}</p>
      <p class="debug-tray__meta">${escapeHtml(entry.ok ? "Success" : "Failure")}${escapeHtml(durationLabel)}${escapeHtml(messageLabel)}</p>
    </li>
  `;
}

function renderEmptyState(message) {
  return `<p class="debug-tray__empty">${escapeHtml(message)}</p>`;
}

function renderOverlay() {
  const reversedLogs = [...state.logs].reverse();
  const reversedRequests = [...state.apiRequests].reverse();
  const reversedResponses = [...state.apiResponses].reverse();
  const filteredLogs =
    logFilter === "all" ? reversedLogs : reversedLogs.filter((entry) => entry.category === logFilter);

  overlayRoot.innerHTML = `
    <div class="debug-toggle">
      <button
        type="button"
        class="debug-toggle__button ${state.enabled ? "is-active" : ""}"
        aria-expanded="${state.enabled ? "true" : "false"}"
        aria-label="${state.enabled ? "Turn debug mode off" : "Turn debug mode on"}"
        data-debug-action="toggle"
      >
        <span class="debug-toggle__dot ${state.enabled ? "is-active" : ""}" aria-hidden="true"></span>
        <span class="debug-toggle__label">${state.enabled ? "Debug On" : "Debug Off"}</span>
      </button>
    </div>

    <aside id="ai-debugflow-tray" class="debug-tray ${state.enabled ? "is-open" : ""}" aria-hidden="${state.enabled ? "false" : "true"}">
      <div class="debug-tray__surface">
        <div class="debug-tray__handle" aria-hidden="true"></div>
        <div class="debug-tray__header">
          <div>
            <p class="debug-tray__eyebrow">Hidden developer tool</p>
            <h2 class="debug-tray__title">Debug Tray</h2>
          </div>
          <span class="debug-tray__live-pill ${state.enabled ? "is-live" : ""}">${state.enabled ? "Live" : "Hidden"}</span>
        </div>

        <div class="debug-tray__actions" role="group" aria-label="Debug actions">
          <button type="button" class="debug-tray__button" data-debug-action="test-log">Add Test Log</button>
          <button type="button" class="debug-tray__button" data-debug-action="clear-logs">Clear Logs</button>
          <button type="button" class="debug-tray__button debug-tray__button--primary" data-debug-action="simulate-api" ${isSimulating ? "disabled" : ""}>
            ${isSimulating ? "Running..." : "Simulate API Call"}
          </button>
        </div>

        <div class="debug-tray__sections">
          <section class="debug-tray__section" aria-label="Live event logs">
            <div class="debug-tray__section-head">
              <h3>Live Event Logs</h3>
              <span>${filteredLogs.length}</span>
            </div>
            <div class="debug-tray__filters" role="group" aria-label="Filter logs by category">
              <button type="button" class="debug-tray__filter ${logFilter === "all" ? "is-active" : ""}" data-debug-filter="all">all</button>
              ${DEBUG_CATEGORIES.map(
                (category) => `
                  <button type="button" class="debug-tray__filter ${logFilter === category ? "is-active" : ""}" data-debug-filter="${category}">
                    ${category}
                  </button>
                `,
              ).join("")}
            </div>
            ${
              reversedLogs.length === 0
                ? renderEmptyState("No logs yet. Turn on debug mode and add one small event at a time.")
                : filteredLogs.length === 0
                  ? renderEmptyState("No logs match the selected category filter.")
                  : `<ul class="debug-tray__list">${filteredLogs.map(renderLogItem).join("")}</ul>`
            }
          </section>

          <section class="debug-tray__section" aria-label="API request tracker">
            <div class="debug-tray__section-head">
              <h3>API Request Tracker</h3>
              <span>${reversedRequests.length}</span>
            </div>
            ${
              reversedRequests.length === 0
                ? renderEmptyState("Tracked requests will appear here.")
                : `<ul class="debug-tray__list">${reversedRequests.map(renderApiRequestItem).join("")}</ul>`
            }
          </section>

          <section class="debug-tray__section" aria-label="API response tracker">
            <div class="debug-tray__section-head">
              <h3>API Response Tracker</h3>
              <span>${reversedResponses.length}</span>
            </div>
            ${
              reversedResponses.length === 0
                ? renderEmptyState("Tracked responses will appear here.")
                : `<ul class="debug-tray__list">${reversedResponses.map(renderApiResponseItem).join("")}</ul>`
            }
          </section>
        </div>
      </div>
    </aside>
  `;
}

function renderDemoMetrics() {
  const logCount = document.getElementById("demo-log-count");
  const requestCount = document.getElementById("demo-request-count");
  const responseCount = document.getElementById("demo-response-count");
  const roomId = document.getElementById("demo-room-id");
  const status = document.getElementById("demo-status");
  const lastEvent = document.getElementById("demo-last-event");

  if (logCount) {
    logCount.textContent = String(state.logs.length);
  }

  if (requestCount) {
    requestCount.textContent = String(state.apiRequests.length);
  }

  if (responseCount) {
    responseCount.textContent = String(state.apiResponses.length);
  }

  if (roomId) {
    roomId.textContent = String(demoState.roomId);
  }

  if (status) {
    status.textContent = demoState.status;
  }

  if (lastEvent) {
    lastEvent.textContent = demoState.lastEvent;
  }
}

function setDemoEvent(text) {
  demoState.lastEvent = text;
  renderDemoMetrics();
}

async function runDemoAction(action) {
  if (action === "auth") {
    demoState.status = "Signed in";
    setDemoEvent("Auth success event sent");
    trackEvent("auth", { action: "login", success: true, method: "magic-link" });
    return;
  }

  if (action === "chat") {
    demoState.status = "Chat active";
    setDemoEvent("Chat event sent");
    trackEvent("chat", { message: "hello from localhost", room: "general" });
    return;
  }

  if (action === "state") {
    demoState.roomId += 1;
    demoState.status = "State updated";
    setDemoEvent(`State changed to room ${demoState.roomId}`);
    trackEvent("state", { key: "roomId", value: demoState.roomId });
    return;
  }

  if (action === "api") {
    demoState.status = "Calling API";
    setDemoEvent("Tracked API request started");
    await simulateTrackedApiCall();
    demoState.status = "API done";
    renderDemoMetrics();
    return;
  }

  if (action === "custom") {
    demoState.status = "Custom event";
    setDemoEvent("Custom runtime marker added");
    trackEvent("custom", { label: "glass-preview", source: "demo-page" });
    return;
  }

  if (action === "clear") {
    demoState.status = "Cleared";
    setDemoEvent("Logs and API activity cleared");
    clearDebugLogs();
    clearApiActivity();
  }
}

overlayRoot.addEventListener("click", async (event) => {
  const trigger = event.target.closest("[data-debug-action], [data-debug-filter]");

  if (!trigger) {
    return;
  }

  const { debugAction, debugFilter } = trigger.dataset;

  if (debugFilter) {
    logFilter = debugFilter;
    renderOverlay();
    return;
  }

  if (debugAction === "toggle") {
    toggleEnabled();
    return;
  }

  if (debugAction === "test-log") {
    trackEvent("custom", {
      action: "test-log",
      source: "debug-tray",
      message: "Manual test log from the debug tray.",
    });
    setDemoEvent("Manual test log added");
    return;
  }

  if (debugAction === "clear-logs") {
    clearDebugLogs();
    setDemoEvent("Debug logs cleared");
    return;
  }

  if (debugAction === "simulate-api") {
    isSimulating = true;
    renderOverlay();

    try {
      await simulateTrackedApiCall();
      demoState.status = "API done";
      setDemoEvent("Simulated API call finished");
    } catch (error) {
      const message = getErrorMessage(error);
      demoState.status = "API failed";
      addDebugLog(`Simulated API call failed: ${message}`, "error");
      setDemoEvent("Simulated API call failed");
    } finally {
      isSimulating = false;
      renderOverlay();
    }
  }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-demo-action]");

  if (!button) {
    return;
  }

  const { demoAction } = button.dataset;

  if (!demoAction) {
    return;
  }

  try {
    await runDemoAction(demoAction);
  } catch (error) {
    const message = getErrorMessage(error);
    demoState.status = "Action failed";
    addDebugLog(`Demo action failed: ${message}`, "error");
    setDemoEvent("Demo action failed");
  } finally {
    renderDemoMetrics();
  }
});

installFetchTracker(window);
renderOverlay();
renderDemoMetrics();

trackEvent("custom", { label: "demo-ready" });
trackEvent("state", { key: "roomId", value: demoState.roomId });
