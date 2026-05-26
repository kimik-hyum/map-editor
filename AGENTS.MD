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

- 커밋 메시지는 Conventional Commit 타입을 사용한다. 예: `feat: 편집기 추가`, `chore: 설정 변경`.
- 허용 타입: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- 타입과 선택적 scope를 제외한 메시지 본문은 한글로 작성한다.
- 타입 뒤 메시지에 영문 알파벳이 포함되면 Husky `commit-msg` 훅에서 거부된다.
