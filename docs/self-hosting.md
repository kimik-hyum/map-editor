# 직접 운영·커스텀

저장소를 가져와 에디터를 직접 운영하는 분을 위한 문서입니다. 배포된 Termia를 자신의 지도에 연결하기만 한다면 [사용·연동 안내](integration.md)로 시작하세요. 웹 문서는 `/self-hosting`입니다.

## 공통 계약과 선택 구성

자신의 에디터를 배포해도 서비스 페이지는 같은 [v2 입출력 계약](integration.md)을 사용합니다. 서비스의 `editorUrl`만 자신의 주소로 바꾸면 됩니다. 입력 폴리곤, 편집 결과 전체, 취소 처리는 공통입니다.

경계 데이터 공급자와 접근 정책은 운영자가 선택합니다. **Google·Supabase는 현재 공개 서비스의 기본 구현이며 필수 아키텍처가 아닙니다.** 직접 수집한 JSON, 자신의 API, 사내 인증을 사용할 수 있습니다. 현재는 설정 한 줄로 공급자를 등록하는 API가 없으므로 [경계 데이터 어댑터](boundary-adapter.md)의 소스 교체 지점을 적용해야 합니다.

| 바꾸려는 것         | 연결 지점                                                                                                     | 유지할 계약                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| JSON·자체 API       | `src/pages/editor/features/regions/api/regionsApi.ts`                                                         | 종류·화면 경계·원본 조회 함수                  |
| 공개 접근·사내 인증 | `src/features/auth/hooks/useBoundaryAccess.ts`, `src/pages/editor/features/regions/hooks/useBoundaryLogin.ts` | 허용 상태와 비어 있지 않은 캐시 범위 `subject` |
| 지도·상호작용       | `src/pages/editor/adapters/openlayers/`                                                                       | 지도 객체와 도메인 상태 분리                   |
| 색상·표현           | `src/pages/editor/theme/editorTheme.ts`                                                                       | 의미 기반 테마 토큰                            |
| 패널·도구           | `src/pages/editor/features/`, `state/editorStore.ts`                                                          | 한 편집 동작의 undo/redo 일관성                |
| 서비스 통신         | `src/pages/editor/messaging/`                                                                                 | 공개 v2 scene, source·origin·sessionId 검증    |

구조 변경은 [아키텍처](../src/pages/editor/ARCHITECTURE.md)와 [도구·상태 모델](editor-tool-model.md)을 참고하세요. 경계 데이터 어댑터는 외부 데이터를 공통 형식으로 변환하고, OpenLayers 어댑터는 데이터를 지도 객체로 변환합니다.

## 로컬 실행

Node.js **22 이상**과 npm을 사용합니다. 복제한 저장소에서 실행하세요.

```bash
npm ci
npm run dev -- --port 4174
```

[로컬 Demo](http://localhost:4174/demo/)에서 편집 창을 열어 입력·편집·결과 수신을 확인합니다. 문서와 직접 그리기는 환경 변수 없이 실행됩니다. 경계를 사용하려면 다음 중 하나를 연결하세요.

- 자체 JSON·서버: [경계 데이터 어댑터](boundary-adapter.md)에 따라 조회 함수와 접근 정책을 교체합니다. 공개 JSON에는 Google 설정이 필요하지 않습니다.
- 기본 Google·Supabase 유지: [선택 구성 안내](supabase-region-api.md)를 적용합니다. 서버 함수·마이그레이션·실제 경계 데이터는 이 저장소에 포함되어 있지 않습니다.

문서는 `/`(사용·연동)과 `/self-hosting`(직접 운영)으로 나뉩니다. 이전 `/screen`은 `/editing#screen`으로, `/authentication`은 선택 구성 문서로 유지합니다.

## 자신의 배포 환경에 맞추기

`npm run build`로 생성한 `dist/`는 정적 호스팅에 배포할 수 있습니다. HTTP·로컬의 다른 origin을 허용하거나 연동 서비스를 제한하려면 `VITE_EDITOR_PARENT_ORIGINS`에 정확한 origin을 쉼표로 구분하세요. 이 설정은 경계 API 인증과 별개입니다.

아래 상용 배포 명령과 GitHub Actions는 **원래 운영 서비스의 Google·Supabase 설정 및 Cloudflare `maps-editor` 프로젝트**를 전제로 합니다. 내재화한 프로젝트에서는 배포 대상을 먼저 자신의 것으로 바꾸고 환경 검사·인증 테스트도 선택한 공급자에 맞게 변경하세요. 공개 구성에서 Google UI를 제거하는 순서는 [접근 정책 교체](boundary-adapter.md#접근-정책과-인증-교체)를 따릅니다.

## 검증과 빌드

```bash
npm run verify
npm run test:e2e
npm run build
npm run test:build
npm run preview
```

- `verify`: 타입·린트·포맷·단위 테스트
- `test:e2e`: 로컬 모의 API로 문서·서비스 페이지 연동·Google 팝업 인증·편집 회귀 검사
- `test:build`: 빌드한 문서 경로와 callback의 HTML·JS·CSS 참조 검사

`dist/`를 HTTP 정적 호스팅에 배포합니다. 사용·연동 문서 3개, 직접 운영 문서 3개, 소개 1개 경로는 사전 렌더링하고, `demo`·`editor`·`screen`·`auth/callback`은 SPA shell로 생성합니다. `auth/callback/index.html`을 누락하면 로그인 복귀가 실패합니다. `file://`로 실행하지 마세요.

### 기본 Google·Supabase 구성의 Cloudflare Pages 배포

`.env.production.local`(Git 제외)에 실제 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_PUBLISHABLE_KEY`를 설정하고 `npm run deploy:production`을 실행합니다. Cloudflare에 로그인된 Wrangler가 필요합니다. 이 명령은 환경 변수 검사 → 빌드 → 산출물의 실제 공개 설정 검사 → 기존 `maps-editor` 상용 배포 순서로 실행합니다. 공개 키 대신 서버/개발 키를 넣거나 설정 없이 빌드한 산출물을 사용하면 중단합니다.

`npm run build`는 설정 없이도 문서/일반 편집을 검증하는 CI용 빌드를 허용합니다. **기본 Google·Supabase 구성으로 운영할 때는 `build:production`/`deploy:production`을 사용하세요.** 자체 공급자는 설정 검사·배포 대상·인증 smoke test도 자신의 정책에 맞게 바꿉니다. 로컬에서 빌드한 `dist`를 업로드할 때 Cloudflare 대시보드 환경 변수는 이미 생성된 JS에 주입되지 않습니다. 반드시 로컬 빌드 시 설정해야 합니다. 배포 후 `npm run test:production-auth`로 로그인 안내창뿐 아니라 **Google로 로그인 버튼을 눌러 실제 Google 화면까지 이동하는지** 확인합니다(Playwright Chromium 필요, 계정 로그인은 수행하지 않음).

서비스 페이지 origin 제한, Google/Supabase callback, 함수 origin 허용 목록은 [배포 설정](supabase-region-api.md#배포-설정)에서 구분해 확인합니다. 이 저장소에는 Supabase 서버 함수·마이그레이션의 배포 코드가 포함되어 있지 않습니다.

### 공개 배포의 서비스 페이지 연동 확인

`E2E_BASE_URL=https://maps-editor.pages.dev npm run test:e2e -- e2e/editor-postmessage.spec.ts`는 로컬 서버 없이 공개 배포를 검사합니다. 이 모드는 localhost origin 이동 검사만 제외하며, 로컬 전체 테스트에서는 해당 보안 검사를 계속 수행합니다.

`deploy:cloudflare`는 상용 설정 검증을 포함한 `deploy:production`의 호환 명령입니다. `public/_headers`는 iframe 차단 등 보안 헤더와 해시 자산의 장기 캐시를 적용합니다. 서비스 페이지 연동은 새 창 방식으로 유지합니다.

### GitHub Actions 자동 배포

저장소 Actions 설정에 다음 값을 등록합니다. 공개 Supabase 키는 브라우저용이며 서버 키를 등록하면 안 됩니다.

| 구분     | 이름                            | 용도                                        |
| -------- | ------------------------------- | ------------------------------------------- |
| Secret   | `CLOUDFLARE_API_TOKEN`          | 대상 계정의 Cloudflare Pages Edit 권한 토큰 |
| Variable | `CLOUDFLARE_ACCOUNT_ID`         | 기존 `maps-editor` 프로젝트의 계정          |
| Variable | `VITE_SUPABASE_URL`             | 한국 상용 Supabase URL                      |
| Variable | `VITE_SUPABASE_PUBLISHABLE_KEY` | 해당 프로젝트의 공개 키                     |
| Variable | `CLOUDFLARE_DEPLOY_ENABLED`     | 토큰과 위 설정을 준비한 뒤 `true`로 활성화  |

활성화 전에는 자동 배포 작업을 건너뜁니다. 로컬 Wrangler의 임시 OAuth/refresh token을 GitHub Secret으로 복사하지 마세요. 활성화 후 `main` push 또는 `main`의 수동 실행에서만 타입·린트·포맷·단위·전체 E2E·상용 빌드 검사를 통과한 동일 커밋을 배포합니다. 업로드 직전 최신 `main`인지 다시 확인하고 배포를 직렬화하므로, 오래된 실행의 재시도로 운영을 되돌리지 않습니다.

배포 후 익명 편집·Google 로그인 진입·취소·서비스 페이지 저장을 검사합니다. 이 검사는 실제 계정 로그인 완료나 데이터 조회를 대신하지 않고, 실패해도 자동 롤백하지 않습니다. 토큰을 아직 등록하지 않았다면 `npm run deploy:production`으로 수동 배포할 수 있습니다.
