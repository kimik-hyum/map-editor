# Project Decisions

- App base: Vite + React + TypeScript.
- Routing: React Router (`react-router`) in declarative SPA mode.
- Async state: TanStack Query (`@tanstack/react-query`) with root provider in `src/app/AppProviders.tsx`.
- Client state: Zustand (`zustand`) for editor UI/domain state when local state grows.
- Runtime validation: Zod (`zod`) for `postMessage` payloads and imported geometry data.
- Styling: Tailwind CSS via `tailwindcss` and `@tailwindcss/vite`.
- Formatting: Prettier (`prettier`).
- Linting: Biome (`@biomejs/biome`) with formatter disabled.
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
- Formatting: `prettier`.
- Linting: `@biomejs/biome`.
- Map/editor: `ol`.
- Geometry utilities: `@turf/area`, `@turf/length`, `@turf/bbox`, `@turf/helpers`.
- Drag and drop: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers` (패널 스택 재정렬용).
- Git hooks: `husky`.

## Component Rules

- 컴포넌트 파일(`.tsx`) 하나에는 컴포넌트 하나만 두고, 파일명은 컴포넌트명과 같게 한다.
- 목록의 행처럼 보조 컴포넌트가 필요하면 같은 파일의 내부 함수로 두지 말고 별도 파일로 분리한다.
- 훅 규칙 때문에 반복 항목을 컴포넌트로 추출해야 할 때도 같은 원칙을 따른다(추출한 행 컴포넌트는 자기 파일을 가진다).
- 예외: 한 묶음으로 제공하는 compound 컴포넌트(`SegmentedTabs`, `MovingHighlight`)는 한 파일에서 함께 정의·export할 수 있다.

## Git Rules

- 커밋 메시지는 Conventional Commit 타입을 사용한다. 예: `feat: 편집기 추가`, `chore: 설정 변경`.
- 허용 타입: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- 타입과 선택적 scope를 제외한 메시지 본문은 한글을 최소 1자 이상 포함해야 한다.
- 타입 뒤 메시지에는 영문 알파벳을 혼용할 수 있지만, 한글 없이 영문만 작성하면 Husky `commit-msg` 훅에서 거부된다.
- 브랜치는 작업 성격을 앞에 두고 `/` 뒤에 짧은 설명 키워드를 kebab-case로 작성한다.
- 브랜치 예시: `feat/layer-panel`, `fix/post-message-validation`, `docs/editor-roadmap`, `packages/turf-validation`, `refactor/openlayers-adapter`, `test/editor-store`.
- 브랜치 이름에는 작업자나 도구 이름을 붙이지 않는다.

## 머지 규칙

- 에이전트는 사용자의 명시적 승인 없이 PR을 머지하지 않는다. 기본 동작은 "브랜치 생성 → 커밋/푸시 → PR 생성 → CI 확인"까지이며, 거기서 멈추고 사용자의 검토를 기다린다.
- "이 PR 머지해줘", "머지해"처럼 특정 PR에 대한 명시적 지시가 있을 때만 그 PR을 머지한다.
- 한 번 받은 머지 허락을 이후의 다른 PR로 확대 적용하지 않는다. PR마다 새로 확인받는다. (예: "바로 메인에 넣어줘"는 그 PR에 한정한다.)
- 브랜치 삭제 등 머지 이후의 정리도 해당 머지가 승인된 뒤에만 한다.
- PR을 올린 뒤에는 링크와 변경 요약을 전달하고, 머지 여부는 사용자가 결정하도록 둔다.
