# Termia · Maps Editor

**내 지도의 폴리곤을 새 창에서 편집하고 결과를 돌려받는 공간 편집 도구입니다.** 직접 그리기와 행정동·법정동 등의 경계 선택을 지원합니다. 기존 지도 구현은 유지하며 데이터 전달과 결과 수신을 연결합니다.

## 목적에 맞는 문서

| 대상                               | 필요한 안내                                           | 시작 문서                                | 웹 경로                          |
| ---------------------------------- | ----------------------------------------------------- | ---------------------------------------- | -------------------------------- |
| 내 지도에 편집기를 연결하는 사용자 | 무엇을 보내면 어떻게 표시되고, 저장하면 무엇을 받는지 | [사용·연동 안내](docs/integration.md)    | `/` → `/integration`, `/editing` |
| 저장소를 가져와 직접 운영하는 사람 | 공통 연동 계약 + 소스 수정·경계 공급자·접근 정책·배포 | [직접 운영·커스텀](docs/self-hosting.md) | `/self-hosting`                  |

일반 연동에는 이 저장소를 복제하거나 Termia 내부 코드를 수정할 필요가 없습니다. 경계 데이터 서버·인증 설정은 에디터 운영자가 담당합니다. 직접 운영하는 경우에는 자신의 JSON이나 별도 API를 [경계 데이터 어댑터](docs/boundary-adapter.md)로 연결합니다. [Google·Supabase](docs/supabase-region-api.md)는 선택 가능한 기본 구성입니다.

## 경복궁 예제로 먼저 실행하기

사이트의 `/integration#quickstart`에서 **경복궁 예제 새 창으로 편집**을 누르세요. 경복궁을 감싸는 사각형을 새 창에 보내고, 정점을 옮겨 저장하면 문서의 지도·JSON이 갱신됩니다. `/editing#screen`에서는 실제 화면 위에서 도구 위치를 확인할 수 있습니다.

[경복궁 입력](src/pages/docs/content/examples/input-scene.example.ts) · [연결 코드](src/pages/docs/content/examples/gyeongbokgung.example.ts)

## 내 지도에 연결하기

1. 서비스 페이지에서 메시지 수신기를 등록한 후, 사용자 클릭으로 `https://maps-editor.pages.dev/editor/`를 새 창으로 엽니다.
2. 내가 연 창의 `MAP_EDITOR_READY`를 받으면 `MAP_EDITOR_INIT`에 고유한 `sessionId`와 `{ version: 2, features: [...] }`를 보냅니다. 전달한 도형이 새 창의 지도와 목록에 표시됩니다. 빈 목록으로 시작해 새 권역을 그릴 수도 있습니다.
3. 사용자가 저장하면 `MAP_EDITOR_SUBMIT`으로 편집 결과 **전체 scene**을 받습니다. 창·origin·sessionId·데이터를 검증하고 자신의 지도와 상태를 갱신합니다. 취소는 `MAP_EDITOR_CANCEL`이며 기존 데이터를 유지합니다. 서비스 페이지가 편집 창을 닫습니다.

반환 데이터에는 좌표·ID·이름·속성·잠금·표시 상태가 포함됩니다. 삭제한 도형은 빠지고 숨긴 도형은 남습니다. 참고로 표시한 행정경계는 자동으로 저장되지 않으며 사용자가 추가·합치기·빼기로 반영한 결과만 포함됩니다. 영구 저장은 결과를 받은 서비스에서 처리합니다.

HTTPS 사이트는 에디터와 도메인이 달라도 연동할 수 있으며, 기본 설정에서는 별도 도메인 등록이 필요하지 않습니다. HTTP·로컬 개발 주소는 에디터와 프로토콜·호스트·포트가 같거나 운영자가 별도로 허용해야 합니다. 운영자가 연결 사이트를 제한한 배포는 해당 허용 목록을 따릅니다. `window.opener`를 유지하는 새 창과 `postMessage` 통신을 사용하며 URL만 열면 데이터가 자동 전달되지는 않습니다. iframe·`noopener`·`file://`는 지원하지 않습니다.

[연동 인터페이스와 복사 가능한 예제](docs/integration.md) · [편집 도구 안내](https://maps-editor.pages.dev/editing/) · [연동 Demo](https://maps-editor.pages.dev/demo/)

Demo는 입력 전송 → 새 창 편집 → 결과 수신·지도 갱신을 보여줍니다. 서버 저장은 하지 않으며 새로고침하면 최초 샘플로 돌아갑니다. 문서의 연동 예제 코드은 서비스 쪽에 연결할 코드이며 타입 검사·테스트 대상입니다.

## 직접 운영하는 분을 위한 문서

- [실행·커스텀 위치·검증·배포](docs/self-hosting.md)
- [JSON·자체 API를 연결하는 경계 데이터 어댑터](docs/boundary-adapter.md) — `/self-hosting/boundaries`
- [Google·Supabase 구성 (선택)](docs/supabase-region-api.md) — `/authentication`
- [새 창 연동과 단독 실행 검토 — 미구현 제안](docs/editor-entry-modes.md)
- [아키텍처](src/pages/editor/ARCHITECTURE.md) · [도구·상태 모델](docs/editor-tool-model.md)
- [지원 범위](docs/editor-mvp-roadmap.md) · [운영 점검](docs/editor-open-questions-review.md)

브랜드 소개는 사이트 하단 푸터의 `/about`에서 확인할 수 있습니다.
