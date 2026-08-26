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

## 부모 도메인 연결 정책

에디터는 기본적으로 모든 HTTPS 부모 도메인이 새 창을 열어 `postMessage`로 scene을 전달할 수 있게 허용합니다. 로컬 개발에서는 에디터와 동일한 HTTP origin도 허용합니다. `file://`, sandbox iframe처럼 origin이 `null`인 메시지와 다른 HTTP origin은 거부합니다.

최초 `MAP_EDITOR_READY`는 geometry나 session ID가 없는 연결 신호만 전달합니다. 첫 번째로 유효한 `MAP_EDITOR_INIT`을 보낸 `window.opener`와 origin을 해당 팝업의 통신 상대로 고정하며, 이후 다른 origin에서 온 메시지는 같은 창에서 보내더라도 처리하지 않습니다. 오류와 향후 편집 결과는 고정된 정확한 origin으로만 반환해야 합니다.

부모 서비스는 반대로 자신이 연 편집기의 고정된 origin만 메시지 대상으로 사용해야 합니다. 팝업에서 수신한 `event.origin`을 그대로 신뢰하거나 geometry 전송에 `"*"`를 사용하지 않습니다.

특정 부모만 허용해야 하는 배포에서는 빌드 환경 변수에 콤마로 구분한 정확한 origin을 지정합니다.

```bash
VITE_EDITOR_PARENT_ORIGINS=https://service.example.com,https://admin.example.com
```
