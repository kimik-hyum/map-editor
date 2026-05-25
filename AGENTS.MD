# Project Decisions

- App base: Vite + React + TypeScript.
- Routing: React Router (`react-router`) in declarative SPA mode.
- Async state: TanStack Query (`@tanstack/react-query`) with root provider in `src/app/AppProviders.tsx`.
- Client state: Zustand (`zustand`) for editor UI/domain state when local state grows.
- Runtime validation: Zod (`zod`) for `postMessage` payloads and imported geometry data.
- Styling: Tailwind CSS via `tailwindcss` and `@tailwindcss/vite`.
- Map/editor engine: OpenLayers (`ol`).
- Basemap: OSM tile layer.
- Geometry standard: GeoJSON.
- Geometry utilities: Turf, imported as small packages only.
- Initial Turf packages: `@turf/area`, `@turf/length`, `@turf/bbox`, `@turf/helpers`.
- Add validation packages later if needed: `@turf/kinks`, `@turf/clean-coords`, `@turf/rewind`.

## Installed Packages

- Runtime: `react`, `react-dom`.
- Routing: `react-router`.
- Async state: `@tanstack/react-query`.
- Client state: `zustand`.
- Runtime validation: `zod`.
- Build: `vite`, `@vitejs/plugin-react`, `typescript`.
- Styling: `tailwindcss`, `@tailwindcss/vite`.
- Map/editor: `ol`.
- Geometry utilities: `@turf/area`, `@turf/length`, `@turf/bbox`, `@turf/helpers`.
- Git hooks: `husky`.

## Git Rules

- 커밋 메시지는 한글로만 작성한다.
- 영문 알파벳이 포함된 커밋 메시지는 Husky `commit-msg` 훅에서 거부된다.
