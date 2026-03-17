# AI Debug Flow

This repository documents a simple method for building features with AI one small step at a time.

The goal is practical:

- break work into small pieces
- test each piece early
- keep debugging visible
- verify progress before moving on
- clean up after the feature is stable

This is not a theory-heavy framework. It is a working habit for building with less confusion and less rework.

## What Is In This Repo

- [`method/step-by-step-building.md`](C:/Users/vinit/OneDrive/Desktop/ai-debugflow/method/step-by-step-building.md) explains the core workflow
- [`method/debug-mode-pattern.md`](C:/Users/vinit/OneDrive/Desktop/ai-debugflow/method/debug-mode-pattern.md) explains how to use a debug toggle and visible logs
- [`method/notifications-method.md`](C:/Users/vinit/OneDrive/Desktop/ai-debugflow/method/notifications-method.md) shows how to build a notification system incrementally

## How To Use This Method

Start with the smallest version of the feature that proves the idea.

Do not try to build the full system in one pass. Ask AI to help with one step, test it, inspect the result, then move to the next step.

When something breaks, turn on visible debugging, inspect the flow, fix one issue at a time, and verify again.

When the feature works, remove temporary noise, simplify the result, and keep the final version easy to understand.
