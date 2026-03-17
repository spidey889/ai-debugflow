# Integration Notes

This `src/` folder provides a small mobile-first debug overlay for developers. It is designed to feel like a hidden in-app dev tool, not a normal settings screen.

## What To Reuse

- `debugStore.ts` provides the shared debug state, helper functions, and the `debug` convenience object
- `fetchTracker.ts` provides generic fetch tracking
- `components/DebugToggle.tsx` provides the compact mobile toggle
- `components/DebugTray.tsx` provides the top slide-down tray
- `components/DebugOverlay.tsx` provides the easiest drop-in wrapper
- `debug-overlay.css` provides minimal styles

## Safe Integration Approach

1. Mount the overlay in your app shell or another top-level layout.
2. Import the CSS so the toggle and tray stay compact and readable on mobile.
3. Use `DebugOverlay` for the fastest setup, or wire `DebugToggle` and `DebugTray` separately.
4. Use `addDebugLog(message, type)` to surface runtime events that help explain the current flow.
5. Use `debug.trackEvent(category, payload)` when you want a consistent AI-friendly tracking pattern.
6. Use the fetch tracker to observe request and response activity without depending on a specific backend.
7. Keep logged data generic and avoid sensitive details.

## Tracker Categories

The built-in event categories are:

- `api`
- `auth`
- `chat`
- `state`
- `custom`

Example patterns:

```ts
debug.trackEvent("auth", { action: "login", success: true });
debug.trackEvent("chat", { message: "hello" });
debug.trackEvent("state", { key: "roomId", value: 123 });
debug.trackEvent("custom", { label: "drawer-opened" });
```

## Prompt-Friendly Examples

You can ask an AI coding tool to connect this system with prompts like:

- "Track auth flow using debug.trackEvent."
- "Log important state changes."
- "Add debug tracking to API calls."
- "Track API requests from this page."
- "Add a debug button here that logs state changes."
- "Use the debug tray to surface important runtime events."

## Integration Reminder

This version is intentionally small. It focuses on:

- toggle
- tray
- logs
- API tracking
- quick action buttons

If your app needs more than that, add one small capability at a time and verify each step before expanding the system.
