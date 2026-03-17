# AI Debug Flow

This repository documents a simple method for building features with AI one small step at a time. It also includes a small, reusable mobile-first debug overlay that developers can plug into their own app.

The goal is practical:

- break work into small pieces
- test each piece early
- keep debugging visible
- verify progress before moving on
- clean up after the feature is stable

This is not a theory-heavy framework. It is a working habit for building with less confusion and less rework.

## What This Tool Is

The debug overlay in `src/` is a lightweight in-app developer tool. It stays hidden until debug mode is enabled, then slides down from the top like a compact notch-style tray.

Version 1 focuses on:

- a mobile-first debug toggle
- a compact top tray
- live event logs
- fetch request and response tracking
- AI-friendly event tracking with `debug.trackEvent(category, payload)`
- simple developer action buttons

Everything is generic and reusable. There is no product logic, no private code, and no backend dependency.

## Why Visible In-App Debugging Helps

Visible logs shorten the gap between "something feels wrong" and "here is the exact step that failed."

This is especially useful on mobile, where browser devtools are often less convenient and small runtime issues can be harder to trace. A compact in-app tray helps developers inspect behavior without turning the interface into a normal settings screen.

## Safe Integration

To keep this open-source friendly:

- keep the overlay behind a developer-facing toggle
- log runtime events, not secrets
- avoid storing tokens, private payloads, or internal-only details
- use the generic store and fetch tracker as a starting point
- prefer consistent category-based tracking with `debug.trackEvent(...)`
- wire the logger into your own flows only where it adds clarity

## Repo Layout

- [`method/step-by-step-building.md`](./method/step-by-step-building.md) explains the core workflow
- [`method/debug-mode-pattern.md`](./method/debug-mode-pattern.md) explains why a visible debug toggle helps
- [`method/notifications-method.md`](./method/notifications-method.md) shows how to build notifications incrementally
- [`src/index.ts`](./src/index.ts) exports the reusable debug overlay pieces
- [`src/integration-notes.md`](./src/integration-notes.md) shows how to integrate the overlay into another system

## Prompt-Friendly Notes

Developers can use these files with AI tools by giving direct integration prompts such as:

- "Track auth flow using debug.trackEvent."
- "Track API requests from this page."
- "Add a debug button here that logs state changes."
- "Use the debug tray to surface important runtime events."

The built-in tracker categories are:

- `api`
- `auth`
- `ui`
- `state`
- `custom`

Example usage stays generic:

```ts
debug.trackEvent("auth", { action: "login", success: true });
debug.trackEvent("ui", { action: "open-panel" });
debug.trackEvent("state", { key: "viewId", value: 123 });
```

## How To Use This Method

Start with the smallest version of the feature that proves the idea.

Do not try to build the full system in one pass. Ask AI to help with one step, test it, inspect the result, then move to the next step.

When something breaks, turn on visible debugging, inspect the flow, fix one issue at a time, and verify again.

When the feature works, remove temporary noise, simplify the result, and keep the final version easy to understand.
