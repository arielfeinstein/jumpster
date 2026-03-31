# Jumpster

A web game where users can create, share, and play platformer levels.

## Stack

- **Phaser 3** — game engine (renders the canvas, handles physics/input)
- **React** — UI layer (editor palette, popovers, drag-and-drop from UI into canvas)
- **Next.js + TypeScript**

React and Phaser communicate through an `EventBus` (mitt-style emitter).

## Current state

The core editor is built and working on branch `Editor`. It uses a Command Pattern architecture (undo/redo, PlaceCommand/DeleteCommand/MoveCommand/ResizeCommand) with an EntityManager for spatial queries and a PlatformRelationshipManager for tracking which objects sit on which platform. Game objects (Platform, Enemy, Coin, Checkpoint, Flag) live in `src/game/gameObjects/` and are shared between the editor and future gameplay scenes.
To place new game objects or change the settings of the level, the user interacts with a React UI that communicates with Phaser canvas via the `EventBus`.
To change existing game objects (like moving them), the user interacts directly with Phaser.

The gameplay scene doesn't exist yet — we're focused on the editor right now.

## Working conventions

- Commit changes with descriptive messages. Don't push to GitHub.
- Keep files focused with SPR in mind; logic lives in controllers/managers/commands, not in Editor.ts.
- Document the code well so programmers can understand what's going on even after couple of months.
