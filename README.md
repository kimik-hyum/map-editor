# Maps Editor

부모 서비스가 보낸 도형을 편집하고 결과를 돌려주는 클라이언트 전용 지도 편집기입니다. Vite·React·TypeScript·OpenLayers로 구성합니다.

- **일반 편집:** 로그인 없이 사용
- **외부 경계 조회:** 경계 선택 시 Google 로그인, Supabase Edge Function 경유
- **데이터 저장:** 에디터가 아니라 부모 서비스의 책임

## 빠른 실행

Node.js **22 이상**과 npm을 사용합니다.

```bash
npm ci
npm run dev -- --port 4174
```

[로컬 데모](http://localhost:4174/demo/)에서 **편집기 새 창으로 열기**를 누르세요. 편집기 URL만 직접 열면 부모 데이터를 기다립니다. 문서·일반 편집은 환경 변수 없이도 실행할 수 있습니다.

Demo의 부모 지도는 현재 scene을 표시합니다. 새 창에서 저장하면 지도와 데이터가 갱신되고 다음 편집도 수정본에서 시작합니다. 취소·창 닫기는 부모 데이터를 바꾸지 않습니다. 서버 저장은 없으며 부모 페이지를 새로고침하면 최초 샘플로 돌아갑니다.

경계 API를 사용할 때만 `.env.example`을 참고해 로컬 `.env`에 공개 Supabase URL·publishable key를 설정합니다. 환경 변수를 바꾸면 개발 서버를 재시작합니다. **secret/service-role key와 Google Client Secret을 VITE 변수나 소스에 넣지 마세요.**

## 어디부터 읽을까요?

| 목적                      | 문서                                                                                        | 웹 페이지         |
| ------------------------- | ------------------------------------------------------------------------------------------- | ----------------- |
| 부모 서비스에 연결        | [연동 계약과 예제](docs/integration.md)                                                     | `/integration`    |
| 경계 API·인증·배포 설정   | [경계 데이터 API](docs/supabase-region-api.md)                                              | `/authentication` |
| 도구 동작을 수정하거나 QA | [도구·상태 모델](docs/editor-tool-model.md)                                                 | `/editing`        |
| 앱 내부 기능 개발         | [에디터 아키텍처](src/pages/editor/ARCHITECTURE.md)                                         | —                 |
| 현재 범위·후속 작업       | [지원 범위](docs/editor-mvp-roadmap.md) · [운영 점검](docs/editor-open-questions-review.md) | —                 |

문서 웹은 `/`에서 시작합니다. 이전 `/screen` 주소는 `/editing#screen`으로 연결합니다.

## 부모 연동의 최소 계약

`READY → INIT(sessionId, scene) → SUBMIT(sessionId, scene) 또는 CANCEL(sessionId)`

- scene은 `{ version: 2, features: [...] }` 형식입니다. 각 도형의 필수 필드는 `geometry`입니다.
- 부모는 자신이 연 팝업의 `source`, 미리 정한 에디터 `origin`, 완료 메시지의 `sessionId`를 검증합니다.
- 결과는 공개 v2 scene 전체입니다. 내부 레이어·히스토리·인증 토큰을 반환하지 않으며, 중간 CHANGE 메시지도 보내지 않습니다.
- 부모가 결과를 자신의 상태에 반영하고 필요한 저장 API를 호출합니다. 예제는 서버 저장을 하지 않습니다.
- iframe·`noopener` 연동이 아니라 `window.opener`가 유지되는 새 창 방식입니다.

실행 가능한 네 파일은 [연동 예제 폴더](src/pages/docs/content/examples)에 있습니다. 웹 문서는 이 파일을 직접 불러오므로 복사용 코드와 테스트 대상이 같습니다.

## 검증과 빌드

```bash
npm run verify
npm run test:e2e
npm run build
npm run test:build
npm run preview
```

- `verify`: 타입·린트·포맷·단위 테스트
- `test:e2e`: 로컬 모의 API로 문서·부모 연동·Google 팝업 인증·편집 회귀 검사
- `test:build`: 빌드한 문서 경로와 callback의 HTML·JS·CSS 참조 검사

`dist/`를 HTTP 정적 호스팅에 배포합니다. 문서 4개 경로는 사전 렌더링하고, `demo`·`editor`·`screen`·`auth/callback`은 SPA shell로 생성합니다. `auth/callback/index.html`을 누락하면 로그인 복귀가 실패합니다. `file://`로 실행하지 마세요.

부모 origin 제한, Google/Supabase callback, 함수 origin 허용 목록은 [배포 설정](docs/supabase-region-api.md#배포-설정)에서 구분해 확인합니다. 이 저장소에는 Supabase 서버 함수·마이그레이션의 배포 코드가 포함되어 있지 않습니다.

### 공개 배포의 부모 연동 확인

`E2E_BASE_URL=https://maps-editor.pages.dev npm run test:e2e -- e2e/editor-postmessage.spec.ts`는 로컬 서버 없이 공개 배포를 검사합니다. 이 모드는 localhost origin 이동 검사만 제외하며, 로컬 전체 테스트에서는 해당 보안 검사를 계속 수행합니다.

`deploy:cloudflare`는 상용 설정 검증을 포함한 `deploy:production`의 호환 명령입니다. `public/_headers`는 iframe 차단 등 보안 헤더와 해시 자산의 장기 캐시를 적용합니다. 부모 연동은 새 창 방식으로 유지합니다.
