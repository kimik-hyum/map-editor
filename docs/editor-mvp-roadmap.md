# Editor MVP Roadmap

최초 작성: 2026-05-30 · 현황 갱신: 2026-08-27

## 목표

외부 서비스가 팝업으로 지도 편집기를 열고 공개 `EditorSceneInput v2`를 전달하면, 사용자가 도형을 선택·수정·생성·조합한 뒤 같은 공개 형식으로 결과를 부모창에 반환하는 완전한 클라이언트 편집기를 제공한다.

내부 모델은 `EditorScene -> EditorLayer[] -> EditorFeature[]`를 유지하지만, 공개 입력과 출력은 내부 레이어를 노출하지 않는 평탄한 `features` 배열이다. 운용도 `1레이어 = 1도형` 스택을 전제로 한다.

## MVP 구현 현황

| 단계 | 영역             | 현재 구현                                                                                 | 상태      |
| ---- | ---------------- | ----------------------------------------------------------------------------------------- | --------- |
| 1    | Scene·지도 기반  | GeoJSON 6종을 내부 scene으로 정규화하고 OSM/OpenLayers 지도에 렌더링                      | 완료      |
| 2    | 평탄 레이어 스택 | 선택·표시·잠금·1–100자 이름 변경·zIndex 재정렬·로컬 생성 도형 삭제                        | 완료      |
| 3    | 부모창 메시징    | READY → INIT, Zod 검증, opener/origin/session 고정, ERROR 응답                            | 완료      |
| 4    | 선택·정점·이동   | 단일/다중 선택, 정점 이동·삽입·삭제, `Cmd/Ctrl+드래그` 단일·다중 이동                     | 완료      |
| 5    | 새 도형 그리기   | 마커·패스·폴리곤, 마우스·키보드 입력, 정점 로컬 undo/redo, 취소 확인                      | 완료      |
| 6    | 폴리곤 연산      | 편집 peer 간 union/difference/intersection과 원자적 history                               | 완료      |
| 7    | 외부 경계        | `region_kind`, viewport RPC, fallback 카탈로그, 원본 geometry 복사·union·difference       | 핵심 완료 |
| 8    | 반경 도구        | 마커 기준 `0.01–1,000km` 원형 Polygon preview·생성, 날짜변경선/극점 방어                  | 완료      |
| 9    | 완료·취소·반환   | 하단 완료 바, 진행 작업/invalid 차단, SUBMIT 공개 v2 scene, CANCEL, 미저장 이탈 확인      | 완료      |
| 10   | 사용자·연동 문서 | 화면 구성, 편집 방법, 부모창 역할·런타임 schema·전체 TypeScript 예제, 정적 경로 prerender | 완료      |

## 현재 사용자 흐름

1. 부모창이 `message` 수신기를 먼저 등록하고 사용자 클릭에서 편집기 팝업을 연다.
2. 에디터가 데이터 없는 `MAP_EDITOR_READY`를 보내면 부모창이 정확한 editor origin으로 `MAP_EDITOR_INIT`을 전달한다.
3. 에디터는 `event.source`, 허용 부모 origin, payload와 `sessionId`를 검증한 뒤 공개 v2 scene을 내부 평탄 레이어 스택으로 정규화한다.
4. 사용자는 선택·정점 편집·그리기·반경·경계·불리언 연산으로 도형을 수정한다. 도메인 편집은 undo/redo history에 기록한다.
5. `저장하고 완료`는 현재 스택을 공개 v2 `features` 순서로 직렬화해 `MAP_EDITOR_SUBMIT`을 한 번 보낸다. 취소는 scene 없이 `MAP_EDITOR_CANCEL`만 보낸다.
6. 부모창은 source·origin·session을 다시 검증하고, SUBMIT scene을 자신의 상태나 서버 저장 흐름에 반영한 뒤 팝업을 닫는다.

편집기는 중간 변경을 `MAP_EDITOR_CHANGE`로 스트리밍하지 않는다. 부모 데이터는 사용자가 완료 액션을 선택했을 때만 교체한다.

## MVP 완료 기준

- [x] 부모 서비스 없이 `/demo`에서 실제 팝업 왕복 흐름을 확인할 수 있다.
- [x] 부모창이 공개 v2 Point·MultiPoint·LineString·MultiLineString·Polygon·MultiPolygon을 전달할 수 있다.
- [x] 메시지와 geometry를 런타임 Zod schema로 검증한다.
- [x] 모든 HTTPS 부모 origin을 기본 지원하되 `null`·다른 HTTP origin을 거부하고, 배포 환경 변수로 정확한 allowlist를 설정할 수 있다.
- [x] 레이어 스택의 visibility·lock·name·순서가 지도와 반환 scene에 반영된다.
- [x] 편집 가능한 도형만 이동·정점 편집·불리언 target이 된다.
- [x] 새 도형은 항상 현재 최상단에 추가되고, 에디터에서 만든 도형만 확인 후 삭제할 수 있다.
- [x] 한 사용자 동작이 history 한 단계가 되며 최대 50단계 undo/redo를 제공한다.
- [x] 진행 중 작업과 invalid 도형을 완료 전에 차단하고, 완료 결과를 부모창에 공개 v2 scene으로 반환한다.
- [x] 핵심 사용자 흐름과 부모창 연동 예제를 웹 문서와 E2E 테스트로 검증한다.

## MVP 이후 고도화

다음 항목은 현재 사용자 흐름의 동작 여부를 막는 MVP 결함이 아니라 데이터 규모·정책·운영 수준을 높이는 후속 작업이다.

- geometry kind별 자기교차·면적·길이·위치 validation 정책과 UI
- 일반 readonly 도형을 불리언 operand로 허용할지 결정하는 세분화된 capability 모델
- 대량 scene에서 전체 레이어 재생성 대신 layer/feature diff sync와 style cache 적용
- 반복 월드와 날짜변경선 횡단 Path/Polygon의 제품 정책
- 지역 경계 데이터의 시도별 증분 적재, 버전·checksum·변경 리포트 자동화
- 실제 사용량을 기반으로 한 성능 예산과 대규모 fixture 회귀 테스트

## 유지할 아키텍처 결정

- 원격 경계 상태는 TanStack Query가, 편집 scene은 단일 Zustand store가 소유한다. 원격 결과를 store에 복제하지 않는다.
- OpenLayers 객체·DOM·React ref는 store에 넣지 않고 adapter 내부에 둔다.
- geometry 계산과 정책은 순수 model에, React lifecycle 조율은 feature hook에, OpenLayers 이벤트와 변환은 adapter에 둔다.
- 부모 메시지 경계에서는 source·origin·session·Zod 검증을 모두 통과한 값만 사용한다.
- 외부 경계는 표시용 참고 레이어로만 유지하고, 사용자가 채택한 원본 geometry만 편집 scene에 복사한다.
- 제품 코드의 현재 구조와 세부 책임은 `src/pages/editor/ARCHITECTURE.md`, 도구 동작은 `docs/editor-tool-model.md`, 사용자 연동은 앱의 `/integration` 문서를 단일 기준으로 삼는다.
