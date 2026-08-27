# Maps Editor

## 실행

```bash
npm install
npm run dev
```

Vite + React + TypeScript 기반의 클라이언트 전용 지도 편집기입니다. `/demo`에서 부모창과 팝업 편집기의 실제 `postMessage` 왕복 흐름을 실행할 수 있습니다.

## 사용 패키지

- `react`, `react-dom`: UI
- `react-router`: Docs, Demo, Editor 라우팅
- `@tanstack/react-query`: 비동기 상태/캐싱
- `zustand`: 편집기 클라이언트 상태
- `zod`: `postMessage`와 geometry 입력 검증
- `tailwindcss`, `@tailwindcss/vite`: 스타일링
- `ol`: OpenLayers 지도/편집 엔진
- `@turf/*`: 면적·길이·bbox·원 생성과 union/difference/intersection
- `@dnd-kit/*`, `react-rnd`: 레이어 스택 재정렬과 플로팅 패널
- `@base-ui/react`, `lucide-react`: UI primitive와 아이콘
- `prism-react-renderer`: 연동 문서 코드 하이라이트

## 정적 빌드 확인

```bash
npm run build
npm run preview
```

빌드 결과는 `dist/`에 생성됩니다. `vite.config.ts`의 `base: "./"` 설정으로 asset 경로는 상대 경로로 출력됩니다.

현재 빌드는 `/`, `/screen`, `/editing`, `/integration` 문서를 각 경로의 `index.html`로 prerender하고, `/demo`, `/editor`는 SPA shell로 생성합니다. 다만 빌드 파일을 더블클릭해 `file://`로 열면 브라우저가 module script를 CORS 정책으로 막을 수 있습니다. 정적 빌드 결과는 HTTP 서버로 확인하세요.

```bash
npm run preview
```

## 부모 도메인 연결 정책

에디터는 기본적으로 모든 HTTPS 부모 도메인이 새 창을 열어 `postMessage`로 scene을 전달할 수 있게 허용합니다. 로컬 개발에서는 에디터와 동일한 HTTP origin도 허용합니다. `file://`, sandbox iframe처럼 origin이 `null`인 메시지와 다른 HTTP origin은 거부합니다.

최초 `MAP_EDITOR_READY`는 geometry나 session ID가 없는 연결 신호만 전달합니다. 첫 번째로 유효한 `MAP_EDITOR_INIT`을 보낸 `window.opener`와 origin을 해당 팝업의 통신 상대로 고정하며, 이후 다른 origin에서 온 메시지는 같은 창에서 보내더라도 처리하지 않습니다. 오류와 향후 편집 결과는 고정된 정확한 origin으로만 반환해야 합니다.

부모 서비스는 반대로 자신이 연 편집기의 고정된 origin만 메시지 대상으로 사용해야 합니다. 팝업에서 수신한 `event.origin`을 그대로 신뢰하거나 geometry 전송에 `"*"`를 사용하지 않습니다.

## 편집 결과 반환

사용자가 하단 완료 바의 **저장하고 완료**를 누르면 편집기는 연결된 부모의 정확한 origin으로 `MAP_EDITOR_SUBMIT`을 전송합니다. 반환하는 `scene`은 부모가 보낸 것과 같은 공개 `EditorSceneInput v2` 형식이며, 내부 `layers`, selection, validation, lifecycle 상태는 포함하지 않습니다. `features` 배열은 현재 지도 쌓임 순서이고 새 도형에는 에디터가 만든 ID가 포함됩니다. 편집 중간의 `MAP_EDITOR_CHANGE`는 보내지 않습니다.

```ts
{
  type: "MAP_EDITOR_SUBMIT",
  sessionId: "부모가 INIT에서 보낸 값",
  scene: {
    version: 2,
    features: [
      { id: "feature-0", geometry: { type: "Point", coordinates: [127, 37.5] } }
    ]
  }
}
```

**취소**는 `{ type: "MAP_EDITOR_CANCEL", sessionId }`만 전송합니다. 미저장 변경이 있으면 먼저 확인하며, 유효하지 않은 도형이나 진행 중인 그리기·반경 입력·경계 연산·이름 변경이 있으면 완료를 막습니다. 부모는 `event.source`, 에디터의 정확한 `event.origin`, 자신이 발급한 `sessionId`를 모두 확인한 뒤 결과를 반영하고 자신이 연 팝업을 닫아야 합니다.

특정 부모만 허용해야 하는 배포에서는 빌드 환경 변수에 콤마로 구분한 정확한 origin을 지정합니다.

```bash
VITE_EDITOR_PARENT_ORIGINS=https://service.example.com,https://admin.example.com
```

전체 부모창 예제와 Zod schema는 앱의 `/integration`, 사용자 편집 방법은 `/editing` 문서에서 확인합니다.

## 검증

```bash
npm run verify
npm run test:e2e
```

`verify`는 TypeScript, Biome, Prettier, Vitest를 실행하고 `test:e2e`는 Playwright로 문서·팝업 연동·편집 흐름을 검증합니다.
