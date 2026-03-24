# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Mobile**: Expo (React Native) with Expo Router

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── pawzee/             # Expo React Native mobile app
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated TS types from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — only `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server with Replit OIDC authentication.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, cookieParser, JSON/urlencoded parsing, authMiddleware, routes at `/api`
- Auth: `src/lib/auth.ts` — OIDC config, session CRUD; `src/middlewares/authMiddleware.ts` — session + token refresh middleware
- Routes: `src/routes/index.ts` mounts sub-routers
  - `src/routes/health.ts` — `GET /api/healthz`
  - `src/routes/auth.ts` — web login/callback/logout + mobile token exchange
  - `src/routes/hazards.ts` — hazard CRUD (list, create, confirm, summary)
- Depends on: `@workspace/db`, `@workspace/api-zod`, `openid-client`

### `artifacts/pawzee` (`@workspace/pawzee`)

Expo React Native mobile app — map-first dog walk safety app.

- `app/_layout.tsx` — Root layout with AuthProvider, QueryClientProvider, GestureHandlerRootView
- `app/index.tsx` — Main map screen with hazard markers, search, profile, emergency vet
- `app/report.tsx` — 3-step hazard reporting modal (category → photo → confirm)
- `lib/auth.tsx` — AuthProvider using expo-auth-session (PKCE) + expo-secure-store
- `lib/api.ts` — API client functions (fetchHazards, createHazard, confirmHazard, fetchHazardSummary)
- `lib/hazards.ts` — Hazard category configs, icons, formatters (time ago, distance, etc.)
- `constants/colors.ts` — Pawzee teal/coral color palette
- Components: HazardIcon, HazardMarker, HazardDetailSheet, SearchBar, ProfileMenu, EmergencyVetSheet, SafetySummary, MapViewWrapper
- Key deps: react-native-maps@1.18.0 (pinned for Expo Go), expo-location, expo-image-picker, expo-haptics, expo-notifications
- Web compatibility: `.web.tsx` files provide stubs for native-only modules (react-native-maps)
- Map provider: PROVIDER_GOOGLE in MapViewWrapper.tsx

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL.

- Schema tables: sessions, users, hazards, hazard_confirmations
- Hazards expire after 10 days; confirmations require 10m proximity
- `pnpm --filter @workspace/db run push` to sync schema

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec (`openapi.yaml`) and Orval config. Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated TypeScript types from the OpenAPI spec (AuthUser, HazardItem, etc.). Note: these are plain TS types, not Zod schemas (despite the package name).

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec.

### `scripts` (`@workspace/scripts`)

Utility scripts package. Run via `pnpm --filter @workspace/scripts run <script>`.

## Key Design Decisions

- **react-native-maps pinned to 1.18.0** — only Expo Go-compatible version; do NOT add to app.json plugins
- **No tab bar** — single full-screen map layout
- **Auth flow**: Mobile uses PKCE via expo-auth-session → POST /api/mobile-auth/token-exchange → Bearer token in expo-secure-store
- **Guest mode**: POST /api/guest/session creates anonymous user (id: `guest-{uuid}`, firstName: "Guest") and returns session token; frontend stores `auth_is_guest` flag in SecureStore; guest users can report + confirm hazards; guests see "Sign In with Replit" upgrade option in profile menu
- **HazardDetailSheet**: Uses single Modal with internal view state machine (`"sheet" | "photo" | "confirmPrompt"`) — never nest Modals in React Native
- **Navigation URLs**: Always use Google Maps (`https://www.google.com/maps/dir/...`) on all platforms, never Apple Maps
- **Color palette**: primary teal `#1A9E8F`, accent coral `#FF6B5B`, background `#FAFBFC`
- **Hazard categories**: broken_glass, poison_bait, aggressive_dog, construction, spray_activity, ticks_fleas, stray_animal, flooding, ant_nest, waste, other
- **Search bar**: Waze-style fullscreen overlay with geocode autocomplete; passes lat/lng directly (no re-geocoding)
- **Report flow**: 3 steps (category → photo → review/submit); GPS captured on submit
- **Hazard confirm**: Prompts for optional photo before confirming; photo stored in hazard_confirmations table
- **Vet sheet**: Singapore 24/7 ER vet fallback numbers always shown when in SG area
- **Hazard radius**: 3km (fetchHazards and fetchHazardSummary)
- **Icon fixes**: ticks_fleas uses yellow (#CA8A04), ant_nest uses "bug-outline" (valid MCIcon)
- **Branding**: splash + app icon both use logo.png, black (#000000) loading screen with white logo
- **Search pin**: teal (#1A9E8F) Marker shown on map when user searches a location; cleared on recenter
- **Proximity notifications**: expo-notifications fires local alert when a hazard is within alertRadiusMeters; tracks notified hazard IDs in a ref to avoid duplicate alerts; only fires when "notifications" setting is enabled
