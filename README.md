# Maps Editor

## 실행

```bash
npm install
npm run dev
```

기본 Vite + React + TypeScript 상태에서 시작합니다.

## 사용 패키지

- `react`, `react-dom`: UI
- `react-router`: Docs, Demo, Editor 라우팅
- `@tanstack/react-query`: 비동기 상태/캐싱
- `zustand`: 편집기 클라이언트 상태
- `zod`: `postMessage`와 geometry 입력 검증
- `tailwindcss`, `@tailwindcss/vite`: 스타일링
- `ol`: OpenLayers 지도/편집 엔진
- `@turf/area`, `@turf/length`, `@turf/bbox`, `@turf/helpers`: GeoJSON 계산 유틸

## 정적 빌드 확인

```bash
npm run build
npm run preview
```

빌드 결과는 `dist/`에 생성됩니다. `vite.config.ts`의 `base: "./"` 설정으로 asset 경로는 상대 경로로 출력됩니다.

현재 빌드는 루트 docs 페이지를 `dist/index.html`에 prerender하고, `/demo`, `/editor`는 SPA shell로 생성합니다. 다만 `dist/index.html`을 더블클릭해서 `file://`로 열면 브라우저가 module script를 CORS 정책으로 막을 수 있습니다. 정적 빌드 결과는 아래처럼 HTTP로 확인하세요.

```bash
npm run preview
```
