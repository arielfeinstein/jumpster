# Jumpster

A web game where users can create, share, and play platformer levels.

## Stack

- **Phaser 3** — game engine (renders the canvas, handles physics/input)
- **React** — UI layer (editor palette, popovers, drag-and-drop from UI into canvas)
- **Next.js + TypeScript**

React and Phaser communicate through an `EventBus` (mitt-style emitter).

## Current state

A basic editor is already in place. We are now working on the `play` scene where users can play custom
levels created in the editor and loaded via JSON.

## Working conventions

- Document the code well so programmers can understand what's going on even after couple of months.
