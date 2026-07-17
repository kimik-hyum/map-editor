# Editor Open Questions Review

최초 검토일: 2026-05-30 · 현황 갱신: 2026-07-17

이 문서는 에디터 구현 중 고민했던 지점을 코드 기준으로 다시 점검하고, 이미 해결된 부분과 아직 남은 부분을 코멘트로 남긴 기록이다.

## 요약

| 고민                                                | 현재 상태                  | 코멘트                                                                                                                   |
| --------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 하나의 뷰에 복잡한 로직이 들어갈 때의 아키텍처      | 대부분 해결                | `EditorPage`는 조립 책임만 갖고, 도메인 모델, store, messaging, OpenLayers adapter, feature module로 책임이 나뉘어 있다. |
| 폴리곤/path/marker의 편집 가능 여부와 상태 관리     | 대부분 해결                | 세 도형의 입력·렌더링·직접 그리기가 연결됐다. 도형별 세부 validation과 권한 정책 고도화는 남아 있다.                     |
| 여러 폴리곤이 한 번에 렌더링될 때 최적화            | 렌더링 가능, 최적화 미해결 | 여러 레이어/폴리곤 렌더링은 가능하지만 scene 변경 때 editor layer를 전부 재생성한다.                                     |
| 행정동/법정동 폴리곤 데이터 수집과 주소 개편 자동화 | 부분 해결                  | Supabase RPC·서울 적재·클라이언트 표시/복사 병합까지 연결됐다. 시도별 증분 적재 운영은 남았다.                           |
| 편집 히스토리(undo/redo) 설계                       | 구현 완료                  | 편집 액션만 스냅샷으로 남기고, 가시성/잠금/선택은 silent로 둔다.                                                         |

## 2026-07-10 갱신 메모

- 외부 지역 경계는 store scene 밖의 OpenLayers 참고 레이어로만 유지하고, 사용자가 `+`/`-`를 실행할 때 row id로 다시 받은 원본 geometry를 scene에 반영한다.
- 지역 RPC 응답은 Zod로 Polygon/MultiPolygon 형식만 검증한다. 외부 응답 오류와 원본 조회 실패는 경계 패널에 표시한다.
- `geometryKind`와 `layer.geometryKinds`는 모든 geometry 교체 action에서 geometry로부터 다시 파생한다. 외부 경계 union도 이 공통 경로를 쓴다.

## 1. 복잡한 뷰 로직을 다루는 아키텍처

상태: 대부분 해결

> 코멘트: 현재 코드에서는 `EditorPage`를 두껍게 만들지 않고, 페이지는 지도 DOM 준비와 store scene을 OpenLayers에 동기화하는 조립 계층으로 유지하고 있다. 이 방향은 복잡한 지도 편집 화면에 유효하다.

해결된 방식:

- `EditorPage`는 `createOpenLayersMap`, `syncOpenLayersMapScene`, `useEditorMessaging`, `LayerPanel`을 연결한다. 지도 객체 생성과 scene 동기화 외의 세부 로직은 다른 모듈로 빠져 있다.  
  참고: [`src/pages/editor/EditorPage.tsx`](../src/pages/editor/EditorPage.tsx)
- 에디터의 중심 모델은 `EditorScene -> EditorLayer[] -> EditorFeature[]` 구조다. 레이어, 도형, 상태, 동작 가능 여부, 검증 규칙이 도메인 타입으로 분리되어 있다.  
  참고: [`src/pages/editor/types/scene.ts`](../src/pages/editor/types/scene.ts)
- 전역 에디터 상태는 Zustand store가 담당한다. `sessionId`, `scene`, `activeLayerId`, `selectedFeatureIds`, `hoveredFeatureId`, `activeMode`, `dirty`가 한곳에서 관리된다.  
  참고: [`src/pages/editor/state/editorStore.ts`](../src/pages/editor/state/editorStore.ts)
- OpenLayers 생성/변환은 `adapters/openlayers`에 격리되어 있다. 이 구조 덕분에 React 상태와 OpenLayers 객체 상태가 섞이지 않는다.  
  참고: [`src/pages/editor/adapters/openlayers`](../src/pages/editor/adapters/openlayers)
- 레이어 패널은 `model`, `hooks`, `components`로 나뉘어 있다. UI가 직접 scene을 계산하지 않고 `createLayerPanelViewModel`을 통해 표시용 모델을 만든다.  
  참고: [`src/pages/editor/features/layers/model/layerPanelModel.ts`](../src/pages/editor/features/layers/model/layerPanelModel.ts)
- 외부 입력은 `postMessage` hook과 Zod schema로 분리되어 있다. 메시지 수신, origin 체크, payload 검증, store 주입이 명확히 나뉜다.  
  참고: [`src/pages/editor/messaging/useEditorMessaging.ts`](../src/pages/editor/messaging/useEditorMessaging.ts), [`src/pages/editor/messaging/editorSceneSchema.ts`](../src/pages/editor/messaging/editorSceneSchema.ts)

남은 코멘트:

- Draw처럼 이후 추가되는 편집 기능도 feature controller와 OpenLayers adapter를 분리하고, Snap binding은 interaction 전용 adapter에 둔다.
- store에는 계속 OpenLayers 객체를 넣지 않는 원칙을 유지한다. OpenLayers 객체는 adapter 내부 ref/cache로 관리하고, store에는 serializable한 `EditorScene`과 UI 상태만 둔다.

## 2. 폴리곤/path/marker 편집 가능 여부와 상태 관리

상태: 대부분 해결

> 코멘트: 편집 가능 여부 타입과 store 액션에 더해 Point/Path 렌더링과 도형별 Draw가 연결됐다. 진행 중 sketch는 OpenLayers adapter가, 완성된 geometry와 history는 store가 소유한다.

해결된 방식:

- 레이어 단위 동작 가능 여부는 `EditorLayerBehavior`로 표현한다. `lock`, `editability`, `selectable`, `deletable`, `draggable`이 있다.  
  참고: [`src/pages/editor/types/scene.ts`](../src/pages/editor/types/scene.ts)
- 도형 단위 동작 가능 여부는 `EditorFeatureBehavior`로 표현한다. `editability`, `selectable`, `deletable`, `draggable`, `vertexEditable`이 있다.  
  참고: [`src/pages/editor/types/scene.ts`](../src/pages/editor/types/scene.ts)
- 도형 상태는 `selection`, `lifecycle`, `validation`, `issues`로 나뉘어 있다. 선택, 변경 여부, 검증 상태를 하나의 문자열 플래그로 뭉치지 않은 점이 좋다.  
  참고: [`src/pages/editor/types/scene.ts`](../src/pages/editor/types/scene.ts)
- store에는 선택/호버/모드/dirty 상태와 `updateLayerView`, `updateFeatureView`, `updateFeatureGeometry` 액션이 있다. 특히 geometry 수정 시 기존 도형은 `Updated`, 새 도형은 `Created` 상태를 유지하도록 처리한다.  
  참고: [`src/pages/editor/state/editorStore.ts`](../src/pages/editor/state/editorStore.ts)
- 레이어 패널은 `editability`가 `Editable`이 아닐 때 배지를 노출한다. 즉 편집 가능 여부를 UI에 보여줄 기반은 이미 있다.  
  참고: [`src/pages/editor/features/layers/model/layerPanelModel.ts`](../src/pages/editor/features/layers/model/layerPanelModel.ts)

추가로 해결된 부분:

- `createOpenLayersGeometry`가 `Point`, `MultiPoint`, `LineString`, `MultiLineString`, `Polygon`, `MultiPolygon`을 모두 변환한다.
  참고: [`src/pages/editor/adapters/openlayers/createOpenLayersGeometry.ts`](../src/pages/editor/adapters/openlayers/createOpenLayersGeometry.ts)
- `features/draw` controller와 `attachFeatureDraw` adapter가 마커 즉시 완료, 패스 버튼 완료, 폴리곤 시작점 닫기를 담당한다.
- 그리는 중 정점 undo/redo와 ESC 취소는 scene을 변경하지 않고, 완성 시 `addFeatures`가 새 레이어와 전역 history 한 단계를 만든다.

남은 작업:

- `resolveFeatureCapability(layer, feature, activeMode)` 같은 순수 함수를 추가해 최종 편집 가능 여부를 한곳에서 계산한다.
- 계산 규칙은 `layer.behavior.lock`, `layer.behavior.editability`, `feature.behavior`, `activeMode`, `feature.state.validation` 순서로 명시한다.
- OpenLayers interaction은 이 계산 결과를 기준으로 `Select`, `Modify`, `Draw`, `Snap`의 대상 feature를 제한한다.
- path/marker의 길이·위치 등 geometry kind별 validation 규칙을 구체화한다.

## 3. 여러 폴리곤 렌더링 최적화

상태: 렌더링 가능, 최적화 미해결

> 코멘트: 여러 폴리곤을 화면에 올리는 기본 렌더링은 이미 된다. 다만 scene이 바뀔 때마다 editor layer를 모두 제거하고 다시 만드는 방식이라, 대량 폴리곤에서는 병목이 될 가능성이 크다.

해결된 방식:

- `EditorScene.layers`를 순회해 OpenLayers `VectorLayer`를 만들고, 각 레이어 안의 `features`를 `VectorSource`에 넣는다.  
  참고: [`src/pages/editor/adapters/openlayers/createOpenLayersLayer.ts`](../src/pages/editor/adapters/openlayers/createOpenLayersLayer.ts)
- 숨김 도형은 OpenLayers feature를 생성하지 않는다. 숨김 레이어는 `VectorLayer.visible`로 제어한다.  
  참고: [`src/pages/editor/adapters/openlayers/createOpenLayersFeature.ts`](../src/pages/editor/adapters/openlayers/createOpenLayersFeature.ts), [`src/pages/editor/adapters/openlayers/createOpenLayersLayer.ts`](../src/pages/editor/adapters/openlayers/createOpenLayersLayer.ts)
- e2e 테스트는 여러 색상의 폴리곤 stroke pixel을 검사해 실제 지도 canvas에 폴리곤이 렌더링되는지 확인한다. 레이어/도형 visibility 토글 후에도 지도 인스턴스가 유지되는지도 확인한다.  
  참고: [`e2e/editor-polygon-rendering.spec.ts`](../e2e/editor-polygon-rendering.spec.ts)

최적화 관점의 미해결 지점:

- `syncOpenLayersMapScene`은 기존 editor layer를 모두 제거한 뒤 새 layer를 push한다. 작은 scene에서는 단순하고 안전하지만, 대량 폴리곤이나 잦은 편집 이벤트에서는 비용이 커진다.  
  참고: [`src/pages/editor/adapters/openlayers/syncOpenLayersMapScene.ts`](../src/pages/editor/adapters/openlayers/syncOpenLayersMapScene.ts)
- style 객체도 feature마다 새로 만들어진다. 상태 변화가 적은 feature가 많아지면 style cache가 필요해질 수 있다.
- label 표시가 모든 feature에 적용되면 큰 데이터에서 렌더링 비용이 커질 수 있다.

추천 다음 작업:

- `layerId -> VectorLayer`, `featureId -> Feature` cache를 두고 scene 변경 시 add/update/remove diff만 적용한다.
- geometry 변경, view 변경, style 변경을 분리해서 geometry만 바뀐 경우 `feature.setGeometry`만 호출한다.
- `createOpenLayersStyle` 결과를 theme token, selection, validation, label visibility 기준으로 캐싱한다.
- 줌 레벨이나 feature 수 기준으로 label 표시를 제한한다.
- 행정동/법정동처럼 큰 경계 데이터는 import 단계에서 단순화, bbox 인덱싱, viewport 기반 로딩을 검토한다.

## 4. 행정동/법정동 폴리곤 데이터 수집과 주소 개편 자동화

상태: 미해결

> 코멘트: 제품 방향에는 반영되어 있지만, 현재 코드에는 실제 행정동/법정동 데이터 수집, 버전 관리, 주소 개편 반영 자동화가 없다. 구현 전에는 그 시점의 공식 원천, 라이선스, 배포 주기를 다시 확인해야 한다.

현재 반영된 부분:

- `EditorMode`에는 `AdministrativeDong`, `LegalDong` 모드가 있다. 즉 UI/상태 모델 관점에서는 행정동/법정동 흐름을 받을 자리가 있다.  
  참고: [`src/pages/editor/features/modes/model/editorModeModel.ts`](../src/pages/editor/features/modes/model/editorModeModel.ts)
- 로드맵에는 `Administrative Boundary Merge` 단계가 있다. 실제 데이터 연동 전에 샘플 행정구역 fixture로 merge 흐름을 검증하고, 이후 데이터 소스, 좌표계, 폴리곤 품질, 병합 검증, 겹침 방지 로직을 붙이는 방향으로 정리되어 있다.  
  참고: [`docs/editor-mvp-roadmap.md`](./editor-mvp-roadmap.md)

아직 없는 부분:

- 행정동/법정동 원천 데이터 다운로드 스크립트
- 원천 파일의 버전/배포일/스냅샷 관리
- 좌표계 변환과 GeoJSON 정규화 파이프라인
- 행정동 코드와 법정동 코드 매핑 테이블
- 주소 개편 또는 행정구역 변경 시 diff 생성 자동화
- 기존 사용자 polygon과 새 경계 데이터의 영향 범위 분석
- 변경된 경계 import 후 렌더링/검증 회귀 테스트

추천 다음 작업:

- `scripts/boundaries/` 아래에 데이터 수집, 정규화, diff 생성 스크립트를 분리한다.
- 원천 데이터는 `source`, `version`, `publishedAt`, `downloadedAt`, `license`, `crs`, `checksum` 메타데이터를 함께 저장한다.
- import 결과는 앱이 바로 쓰기 좋은 `EditorScene` 또는 `EditorLayer` fixture 형태로 변환한다.
- 주소 개편 자동화는 "원천 데이터 갱신 감지 -> 코드/명칭 변경 diff -> geometry diff -> 영향 feature 산출 -> 검수 리포트" 흐름으로 나누어 구현한다.
- 실제 구현 단계에서는 공식 원천과 라이선스 확인을 먼저 하고, 대량 데이터 렌더링 최적화 작업과 함께 진행한다.

## 5. 편집 히스토리(undo/redo) 설계

상태: 설계 합의(2026-06-01), 구현 전

> 코멘트: 도형 추가/자르기/병합 작업에 들어가기 전에, 단축키로 이전/이후 상태를 오갈 수 있는 히스토리를 기반으로 먼저 설계했다. 핵심은 "무엇을 저장하느냐"보다 "어떤 변경을 한 스텝으로 보느냐"였다.

### 결정 사항

- **스냅샷 방식**: `scene` 전체를 스냅샷으로 쌓는다. store가 이미 불변 업데이트(구조 공유)라 이전 `scene` 참조 보관은 사실상 공짜이고, GeoJSON 기반이라 직렬화/복원이 안전하다. diff/command 방식은 지금 단계엔 과하다.
- **체크포인트 분리는 불필요**: 라이브 편집(정점 이동, 그리는 중)은 OpenLayers 안에서만 일어나고 도메인 `scene`은 "작업 완료" 시점에 1회만 바뀐다. 그래서 "라이브 vs commit"을 가르는 별도 체크포인트 개념이 필요 없다.
  - 드래그 합치기 → `modifyend` 1회 기록, 그리는 중 점 취소 → OL Draw의 `removeLastPoint`(전역 history 아님), 스냅 → 커밋 전 보조라 scene을 안 건드림.
- **시점 복원(time-travel) 모델 = 피그마식**: 편집(geometry/추가/삭제/병합/자르기)에서만 스냅샷을 찍는다. 가시성/잠금/선택 변경은 스냅샷을 찍지 않는다(silent).
  - 확인 예: `생성(100px) → 크기변경(200px) → 잠금 → Cmd+Z`이면 "크기변경 직전 스냅샷(100px·잠금없음)"으로 복원돼 **잠금도 풀리고 100px**가 된다(피그마 실제 동작과 동일).
  - `잠금→해제→잠금`만 하면 편집 스텝이 없어 undo가 무반응이다.
- **가시성/잠금**: `scene` 안에 있어 스냅샷에 함께 담긴다 → 단독 undo는 안 되지만, 편집을 가로질러 undo하면 그 시점 값으로 함께 복원된다. "완전 분리"(undo가 절대 안 건드림)는 존재한 적 없는 혼합 상태(예: 100px+잠금)를 만들어 오히려 버그처럼 느껴지므로 채택하지 않는다.
- **선택(`selectedFeatureIds`)**: store에서 `scene` 밖 별도 필드라 스냅샷에 안 들어간다 → undo로 선택이 바뀌지 않는다(피그마와 동일). undo/redo 후 사라진 피처를 가리키는 선택만 정리한다.
- **구별 로직의 위치**: 데이터 필드 필터링이 아니라 **"어떤 액션이 스냅샷을 찍느냐"** 하나로 끝난다. 편집 액션은 `commitSceneEdit`(직전 scene을 past에 push, future 비움)를 거치고, 가시성/잠금/선택/모드 액션은 일반 `set`(스냅샷 없음)을 쓴다. 투영(projection)·구조 분리는 불필요하다.
- **검증(validation)**: geometry에서 파생되므로 편집과 동기로 함께 계산해 같은 스냅샷에 담는다(MVP). 비동기가 필요해지면 그때만 silent 경로로 뺀다.
- **참조/경계 데이터 로드**: 사용자 편집이 아니므로 undo 대상이 아니다(silent, 또는 참조 레이어를 히스토리 범위 밖으로).

### 부가 규칙

- 단축키: `Cmd/Ctrl+Z` = undo, `Cmd/Ctrl+Shift+Z`(+`Ctrl+Y`) = redo. input 포커스에서는 무시한다. 그리는 중에는 Draw의 정점 로컬 history가 전역 scene history보다 우선한다.
- 편집 중 취소는 ESC(현재 편집 무름), 전역 undo/redo는 확정된 scene 이력만 다룬다.
- 히스토리 길이 상한(예: 50), 초과 시 오래된 항목부터 버린다.
- `dirty = scene !== (INIT 시점 baseline)`. undo로 baseline까지 가면 `dirty=false`. 새 INIT/`resetScene` 시 히스토리를 초기화한다.
- undo/redo도 상태가 바뀌므로 host에 `MAP_EDITOR_CHANGE`를 보낸다.
- 구현은 수동으로 한다(zundo 미사용). "특정 액션만 추적"은 수동이 더 명확하다.

### 후속

- 히스토리 store(`past`/`future` + `undo`/`redo` + `commitSceneEdit`)와 단축키 훅을 기반으로 먼저 구현하고, #12(그리기)·#40(반경)·#13(병합)이 그 위에 얹힌다.
