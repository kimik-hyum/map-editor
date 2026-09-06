# Editor Open Questions Review

최초 검토: 2026-05-30 · 현황 갱신: 2026-08-27

초기 설계 때 열려 있던 질문을 현재 코드와 테스트로 다시 판정한 기록이다. 완료된 결정을 재논의하기보다, 실제로 남은 위험과 다음 판단 시점을 구분하는 데 목적이 있다.

## 요약

| 질문                                          | 현재 판정        | 남은 판단                                                                                  |
| --------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| 한 화면의 복잡한 지도 로직을 어떻게 나눌까    | 구조 정착        | `useOpenLayersEditorMap`의 controller 분리는 관련 변경이 다시 커질 때 점진 적용            |
| 도형별 편집 가능 여부를 어떻게 계산할까       | 핵심 정책 구현   | 일반 readonly operand와 제품 validation을 위한 capability 세분화                           |
| 여러 도형 렌더링 성능은 충분한가              | 소규모 검증 완료 | 실제 대량 fixture와 성능 예산을 정한 뒤 diff sync·style cache 여부 결정                    |
| 지역 경계 데이터와 개편을 어떻게 운영할까     | 조회·편집 연결   | 서울 외 시도 증분 적재, staging 검증, 버전 스왑 자동화                                     |
| undo/redo의 한 단계를 무엇으로 볼까           | 구현 완료        | 현재 50단계 snapshot 정책 유지; 새로운 장기 실행 도구가 생길 때 로컬 history 경계 검토     |
| 완전 SPA의 부모 도메인과 반환 계약은 안전한가 | 현재 요구 충족   | 기본 all-HTTPS 정책을 유지할지, 특정 서비스 배포에서 allowlist를 강제할지 운영 단위로 결정 |

## 1. 아키텍처 경계

상태: 구조 정착, 점진 분리 원칙 유지

현재 구조는 `EditorPage`를 화면 조립 계층으로 두고, 도메인 상태·원격 경계·React controller·OpenLayers adapter를 분리한다.

- [`EditorPage.tsx`](../src/pages/editor/EditorPage.tsx)는 지도·도구·패널·완료 바를 배치하고 공개 hook/controller를 연결한다.
- [`editorStore.ts`](../src/pages/editor/state/editorStore.ts)는 serializable한 scene과 UI 상태, history action만 소유한다. OpenLayers 객체·DOM·React ref는 넣지 않는다.
- [`features`](../src/pages/editor/features)는 사용자 기능 단위의 component·hook·순수 model을 소유한다.
- [`adapters/openlayers`](../src/pages/editor/adapters/openlayers)는 지도 객체 생성, geometry 변환, interaction과 overlay 수명을 감싼다. 모든 attach 핸들은 `detach`를 제공한다.
- [`messaging`](../src/pages/editor/messaging)은 source·origin·session 검사, Zod 입력 검증, 공개 v2 직렬화를 맡는다.
- 원격 region 데이터는 TanStack Query가 소유하며 Zustand scene에 복제하지 않는다. 사용자가 채택한 원본 geometry만 store action으로 들어간다.

남은 집중 지점은 [`useOpenLayersEditorMap.ts`](../src/pages/editor/features/map/hooks/useOpenLayersEditorMap.ts)다. 현재 지도 수명, 선택, 정점, 이동, 폴리곤 연산 controller를 조율한다. 공개 hook을 다시 쓰는 대형 리팩터링보다, 관련 기능을 바꿀 때 selection·vertex·geometry-ops controller를 내부에서 하나씩 추출하는 편이 안전하다. 이 기준은 [`ARCHITECTURE.md`](../src/pages/editor/ARCHITECTURE.md)에 고정돼 있다.

## 2. geometry와 capability 정책

상태: 편집 핵심 구현, 제품 정책 고도화 필요

해결된 부분:

- 공개 입력과 OpenLayers 변환은 Point, MultiPoint, LineString, MultiLineString, Polygon, MultiPolygon을 지원한다.
- `1레이어 = 1도형`으로 정규화해 레이어 잠금·표시·zIndex와 도형 lifecycle을 일관되게 적용한다.
- [`layerAccess.ts`](../src/pages/editor/types/layerAccess.ts)가 정점 편집, 이름 변경, 로컬 생성 도형 삭제 같은 공통 scene 판정을 소유한다.
- 단일 선택은 정점 편집, 다중 선택은 편집 가능한 항목의 전체 이동으로 분리된다. 숨김·잠김·읽기 전용 도형은 실제 편집 대상에서 제외된다.
- geometry 교체 action은 geometry kind를 다시 파생하고, 기존 도형은 `Updated`, 새 도형은 `Created` lifecycle을 유지한다.
- 이름은 앞뒤 공백을 제거한 1–100자로 검증한다. 삭제는 에디터에서 생성한 잠금 해제 도형에만 허용한다.

남은 질문:

- 일반 readonly 도형을 union/difference/intersection의 operand로 허용할 것인가. 현재 peer 연산은 target과 operand 모두 편집 가능해야 하고, 외부 경계만 복사 source로 예외 처리한다.
- `selectable`, `movable`, `vertexEditable`, `canBeOperand`, `consumedOnMerge`를 언제 독립 capability로 노출할 것인가. 실제 제품 요구가 두 개 이상 충돌하기 전까지는 현재 공통 판정을 유지한다.
- 자기교차, 최소·최대 면적/길이, 허용 위치처럼 geometry kind별 validation을 어느 도메인 규칙으로 정할 것인가. 정책 없이 Turf 검사만 추가하지 않는다.
- 반복 월드와 날짜변경선을 가로지르는 Path/Polygon을 거부·제한·정규화 중 어떤 방식으로 처리할 것인가.

## 3. 렌더링 성능

상태: 현재 fixture와 E2E는 통과, 대규모 기준 미정

현재 `syncOpenLayersMapScene`은 scene 변경 때 콘텐츠 레이어를 다시 동기화한다. 선택·hover처럼 scene 밖 상태는 필요한 feature style만 무효화하고, 지도 인스턴스 자체는 유지한다. 현재 데모 규모에서는 단순하고 안정적이며, canvas pixel과 지도 인스턴스 유지 E2E가 이를 검증한다.

추측만으로 cache 구조를 먼저 넣지 않는다. 다음 순서로 판단한다.

1. 실제 예상 상한에 가까운 도형 수와 정점 수의 fixture를 만든다.
2. INIT, 단일 정점 편집, visibility 변경, 다중 선택, 팬·줌의 시간과 메모리를 측정한다.
3. 제품 성능 예산을 넘는 경로만 최적화한다.
4. 필요하면 `layerId -> VectorLayer`, `featureId -> Feature` cache를 두고 add/update/remove diff를 적용한다.
5. geometry·view·style 변경을 분리하고, theme token·선택·검증·label 기준 style cache를 검토한다.

외부 경계는 이미 viewport bbox·zoom tier·`max_features`·`truncated` 정책으로 scene 콘텐츠와 분리돼 있다. 대규모 경계를 내부 레이어 스택에 넣어 이 문제를 키우지 않는다.

## 4. 지역 경계 데이터 운영

상태: API와 편집 흐름 연결, 적재 운영 자동화 남음

현재 구현:

- Supabase/PostGIS의 `region_kind`, `region_boundary`와 `regions_by_view`, `region_by_id`, `region_by_code` RPC가 준비돼 있다.
- 경계 도구 하나가 서버의 selectable kind 카탈로그를 사용한다. 행정동·법정동을 별도 `EditorMode` enum으로 고정하지 않는다.
- 클라이언트는 bbox를 격자에 맞춰 조회하고, 저줌 coarse tier와 `truncated` 확대 안내를 처리한다.
- 화면에는 단순화 geometry를 쓰고, 생성·병합·제거는 사용자가 고른 row id로 다시 받은 원본 geometry를 사용한다.
- 서울 시군구·행정동·법정동·우편번호 데이터가 적재돼 있고, 카탈로그 실패 fallback과 비동기 stale 결과 폐기를 E2E로 검증한다.

운영 후속:

- 서울 외 시도별 원천 다운로드와 staging 적재
- 좌표계·유효성·건수·코드 중복 검증을 통과한 데이터만 현재 버전으로 스왑
- `source`, `base_date`, checksum, 적재 결과와 실패 원인을 남기는 실행 리포트
- 경계 변경이 기존 사용자 geometry에 미치는 영향을 계산할 필요가 있는지 제품 요구 확인
- 트래픽 측정 후 Materialized View, HTTP cache, vector tile 중 필요한 단계만 도입

DB와 RPC 세부 계약은 [`supabase-region-api.md`](./supabase-region-api.md)를 기준으로 한다.

## 5. history와 진행 중 작업

상태: 구현 완료

- 전역 history는 불변 `scene` 참조의 snapshot 방식이며 `past`/`future`를 각각 최대 50단계로 제한한다.
- geometry·이름·도형 추가/삭제·불리언 연산은 `commitSceneEdit`를 통해 한 사용자 동작당 한 snapshot을 만든다.
- visibility·lock·zIndex·선택·hover·모드·패널 위치는 자체 undo 단계를 만들지 않는다. scene 안 값은 다른 편집을 가로질러 과거 snapshot으로 이동할 때 당시 값으로 복원될 수 있다.
- 선택은 scene 밖이므로 undo 뒤 존재하지 않는 id만 정리하고 가능한 선택은 유지한다.
- Draw는 완성 전 정점 로컬 undo/redo를 우선하고, sketch 중 clipboard scene 편집을 차단한다. 반경 preview도 적용 전까지 scene/history를 건드리지 않는다.
- 새 INIT은 전역 history와 진행 중 확인·도구 상태를 초기화하고, 비동기 경계 연산은 session·scene·선택 문맥이 달라지면 결과를 버린다.
- undo/redo는 부모창으로 중간 메시지를 보내지 않는다. 부모에는 완료 시점의 `MAP_EDITOR_SUBMIT`만 반환한다.

새 도구가 여러 단계의 미확정 입력을 갖게 되면 Draw와 같은 로컬 history가 필요한지 먼저 판단하고, 전역 scene에는 완료된 한 동작만 커밋한다.

## 6. SPA 보안과 부모 반환

상태: 현재 데이터 경계에서 구현 완료

편집기는 부모가 전달한 geometry와 공개 경계만 다루며 서버 쓰기 권한이나 사용자 비밀을 갖지 않는다. 이 전제에서 기본 부모 정책은 모든 정확한 HTTPS origin을 허용한다.

- 데이터 없는 `MAP_EDITOR_READY` bootstrap에만 `targetOrigin="*"`를 사용할 수 있다.
- 첫 유효 INIT을 보낸 `window.opener`와 정확한 origin을 session의 통신 상대로 고정한다.
- 이후 메시지는 같은 window source, 고정 origin, sessionId를 모두 만족해야 한다.
- `null` origin과 에디터와 다른 일반 HTTP origin은 기본 정책에서 거부한다. 로컬 개발은 동일 HTTP origin을 허용한다.
- 특정 부모만 허용하는 배포는 `VITE_EDITOR_PARENT_ORIGINS`에 정확한 origin allowlist를 넣는다.
- 부모도 자신이 연 팝업 source, 미리 계산한 editor origin, 자신이 발급한 sessionId를 모두 검사한다. INIT에 `targetOrigin="*"`를 쓰지 않는다.
- SUBMIT은 내부 layers·selection·validation·lifecycle을 제거한 공개 `EditorSceneInput v2`만 반환한다. CANCEL은 scene을 반환하지 않는다.

보안 결론은 “origin `*` 허용”이 아니라 “모든 HTTPS 부모를 후보로 허용하되, 각 팝업 session은 첫 유효 INIT의 정확한 source+origin으로 고정”이다. 향후 에디터가 인증 토큰이나 서버 쓰기 기능을 갖게 되면 이 전제를 폐기하고 배포 allowlist, CSP, 권한 분리와 감사 로그를 다시 설계해야 한다.

## 현재 남은 우선순위

1. 실제 데이터 규모를 정하고 성능 예산·대량 fixture를 만든다.
2. geometry validation 요구를 제품 규칙으로 확정한다.
3. 지역 경계의 시도별 증분 적재 운영을 자동화한다.
4. readonly operand 요구가 생기면 capability 모델을 세분화한다.
5. 반복 월드·날짜변경선 geometry가 실제 입력 범위에 포함되면 지도와 schema 정책을 함께 정한다.
