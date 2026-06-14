# Jumpster

A browser-based social platform for building, sharing, and playing 2D platformer levels — no installation required.

🔗 **Live demo:** [jumpster.onrender.com](https://jumpster.onrender.com)

---

## Overview

Jumpster lets users design their own platformer levels using a graphical editor, publish them to a community feed, and play levels created by others. It's a full-stack web application — covering both the client-side game experience and all backend infrastructure.

---

## Features

- **Level Editor** — place, move, resize, and delete game entities on a grid; full undo/redo support
- **Platformer Gameplay** — physics-based 2D platformer with enemies, coins, checkpoints, and spikes
- **Community Feed** — browse, search, and filter published levels; like and track play history
- **User Accounts** — register, log in, manage and publish your own levels
- **Level Sharing** — levels are serialized as JSON and stored in a relational database

---

## Game Entities

| Entity | Description |
|---|---|
| Platform | Surface players and enemies can stand on; resizable |
| Coin | Collectible; restored on respawn based on last checkpoint |
| Spikes | Hazard that damages the player on contact |
| Checkpoint | Saves player state (position, health, coins) mid-level |
| Start Flag | Initial spawn point; one per level |
| End Flag | Goal — reaching it completes the level |
| Enemy (Goomba) | Patrols a fixed range; can be stomped by the player |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | Next.js (SPA) |
| UI | React + TypeScript |
| Game engine | Phaser (HTML5 canvas, Arcade Physics) |
| Backend | Next.js API routes |
| Auth | Supabase Auth (JWT) |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Docker](https://www.docker.com/) — required for the local Supabase instance
- [Supabase CLI](https://supabase.com/docs/guides/cli)

### Installation

```bash
# Clone the repository
git clone https://github.com/arielfeinstein/jumpster.git
cd jumpster

# Install dependencies
npm install
```

### Environment variables

Create a `.env` file in the project root with the following variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string for Prisma |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key — safe for browser code |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key — server/API routes only |

For local development, start Supabase first and use the values it prints:

```bash
npx supabase start   # prints all local keys and URLs
```

The local defaults are:

```
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase start output>
SUPABASE_SERVICE_ROLE_KEY=<service role key from supabase start output>
```

### Running locally

```bash
npm run dev:local   # starts Supabase (Docker) then Next.js on port 8080
```

If Supabase is already running:

```bash
npm run dev
```

The app will be available at `http://localhost:8080`. Supabase Studio (database browser) runs at `http://127.0.0.1:54323`.

---

## Project Structure

```
/
├── app/              # Next.js app router (pages + API routes)
├── components/       # React UI components
├── game/             # Phaser scenes, entities, and game logic
│   ├── editor/       # Level editor (controllers, managers, commands, views)
│   ├── play/         # Play scene (physics, collision, managers)
│   └── shared/       # Shared entities, EventBus, asset pipeline
├── services/         # Backend business logic
├── prisma/           # Database schema and migrations
└── public/           # Static assets (sprites, spritesheets)
```

---

## Architecture Notes

The frontend combines **React** (UI overlays, menus, HUD) with **Phaser** (canvas rendering and physics). The two layers communicate through a typed `EventBus` singleton, keeping the game engine and UI fully decoupled.

The level editor uses the **Command pattern** for all state-changing actions, enabling unlimited undo/redo. Levels are stored as **JSONB** in PostgreSQL and deserialized into live Phaser entities at runtime.

The backend follows a layered structure: **API routes → Services → Prisma → PostgreSQL**, with JWT authentication validated on every request via Supabase Auth.

---

## License

[MIT](LICENSE)
