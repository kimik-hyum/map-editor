# Editor Architecture Guide

이 문서는 에디터 도메인에서 새 기능을 추가할 때 파일 위치와 책임을 흔들리지 않게 정하기 위한 구조 가이드입니다.
Codex와 Claude는 이 문서를 기준으로 `EditorPage` 비대화, OpenLayers 의존 누수, store 오염을 피합니다.

## Responsibility Map

- `EditorPage.tsx`: 화면 배치와 진입 hook 호출만 담당한다. 지도, 선택, 정점, 편집 절차를 직접 구현하지 않는다.
- `features/*`: 사용자 기능 단위의 진입점이다. 기능별 `components`, `hooks`, `model`을 이 아래에 둔다.
- `features/*/components`: 해당 기능의 React UI만 둔다. OpenLayers 객체를 직접 다루지 않는다.
- `features/*/hooks`: React lifecycle, ref, store 구독, adapter 호출을 조율한다.
- `features/*/model`: React와 OpenLayers를 모르는 순수 함수만 둔다. 단위 테스트 우선 대상이다.
- `adapters/openlayers`: OpenLayers 객체 생성, 이벤트 attach, geometry/style 변환, layer sync만 둔다.
- `state/editorStore.ts`: 에디터 도메인 상태와 scene 편집 action만 둔다. OpenLayers 객체를 저장하지 않는다.
- `types`: postMessage, scene, layer, feature, enum, validation 공통 타입만 둔다.
- `theme`: 의미 기반 색상/스타일 토큰과 style resolver만 둔다.
- `messaging`: postMessage 수신/송신, origin 검증, payload validation 경계만 둔다.

## Placement Rules

- 새 UI 패널이나 버튼은 먼저 `features/[feature-name]/components`를 검토한다.
- 새 기능의 React 조율 로직은 `features/[feature-name]/hooks`에 둔다.
- 계산만 하는 로직은 `features/[feature-name]/model`에 둔다.
- OpenLayers `Map`, `Layer`, `Feature`, `Interaction`, `Geometry`를 직접 만지는 로직은 `adapters/openlayers`에 둔다.
- 여러 기능에서 공유되는 도메인 타입/enum은 `types`에 둔다.
- 여러 기능·어댑터가 공유하는 순수 도메인 판정(`scene`만 보는 정책: 레이어 선택/편집 가능 여부 등)도 `types`에 둔다. 어댑터는 `features/*`를 import하지 않으므로, 더 하위인 `types`에 둬 의존 방향을 지킨다.
- OpenLayers 의존 공용 유틸(콘텐츠 레이어 순회, geometry 거리 계산 등)은 `adapters/openlayers`의 별도 모듈로 모아 어댑터끼리 재사용한다.
- 여러 기능에서 공유되는 시각 토큰은 `theme`에 둔다.

## Hard Rules

- `EditorPage.tsx`에 지도 초기화, 이벤트 attach, 정점 편집, 선택 동기화 로직을 추가하지 않는다.
- Zustand store에 OpenLayers 객체, DOM node, React ref를 넣지 않는다.
- `features/*/model`에서 React, Zustand, OpenLayers를 import하지 않는다.
- `adapters/openlayers`에서 React hook을 import하지 않는다.
- store의 `scene`은 `EditorScene -> EditorLayer[] -> EditorFeature[]` 구조를 유지한다.
- geometry 변경만 history에 쌓는다. 선택, 호버, 패널 표시, 레이어 visibility 같은 view/UI 변경은 별도 정책이 없는 한 silent로 둔다.
- scene 스냅샷은 읽기 전용 소비를 기본으로 보고, mutation은 store action 내부 경계에서만 수행한다.
- 다른 상태에서 파생되는 값(예: 모드별 interaction 활성 플래그)은 store에 저장하지 않고 순수 함수로 계산한다(파생 상태 중복 금지).
- 어댑터는 OpenLayers Interaction 클래스를 외부로 직접 노출하지 않고 공통 핸들(`{ setActive, detach }`)로 감싼다.

## Adapter Conventions

`adapters/openlayers`의 이벤트/인터랙션 어댑터는 다음 규약을 따른다.

- **핸들 인터페이스 통일**: 모든 `attach*` 어댑터는 `{ setActive(active), detach() }` 핸들을 반환한다(컬렉션 재바인딩이 필요하면 `sync`도 함께). OpenLayers Interaction 클래스(`Modify`, 향후 `Draw` 등)는 어댑터 내부에 감추고 외부로 직접 노출하지 않는다.
- **구현 형태**: 이벤트를 관찰만 하는(소비·우선순위 제어가 아닌) 어댑터는 클로저 팩토리(`attachX(map, options) -> handle`)로 만든다. `extends ol/interaction/*`(클래스)는 이벤트를 실제로 소비/제어할 때만 쓰고, 그 경우에도 위 핸들로 감싼다.
- **살아있는 상태는 게터로 읽는다**: 부착은 1회지만 핸들러는 이후 여러 번 실행되므로, 변하는 상태는 게터 주입(`getScene`/`getSelectedIds`/`getVertices` = `useEditorStore.getState()`)으로 이벤트 시점에 최신을 읽는다. 고정 설정만 값으로 넘긴다. 어댑터는 store/React를 import하지 않고 주입으로 분리한다.
- **고빈도 이벤트는 어댑터 안에서 흡수한다**: `pointermove` 같은 핫패스는 `requestAnimationFrame`으로 스로틀하고, 값이 바뀔 때만 결과를 React state로 올린다(이벤트마다 `setState` 금지). 일시적 메커니즘 상태(rAF 핸들·픽셀 버퍼·dedupe·활성 비트)는 어댑터 로컬에 둔다.
- **pull/push 경계**: 값은 게터로 "이벤트 시점에 당겨" 읽고, 비활성 전환 같은 부수효과(오버레이 clear·힌트 내림)는 `setActive`/이펙트로 "그 순간 밀어서" 처리한다.
- **모드별 활성화**: "어느 모드에서 무엇을 켜는가"는 순수 모델(`mode -> 활성 플래그`)로 한곳에서 정하고, hook의 `[activeMode]` 이펙트가 그 결과를 어댑터 `setActive`로 적용한다. 어댑터의 `active` 비트는 그 결정을 수행하는 로컬 스위치일 뿐, 정책의 출처가 아니다.

## Current Editor Flow

1. `EditorPage.tsx`가 `useOpenLayersEditorMap`, `useEditorMessaging`, `useEditorHistoryShortcuts`를 호출한다.
2. `messaging`이 postMessage payload를 검증하고 `editorStore`에 scene을 주입한다.
3. `features/map/hooks/useOpenLayersEditorMap.ts`가 store 상태를 구독하고 OpenLayers adapter를 호출한다.
4. `adapters/openlayers`가 scene을 OpenLayers layer/feature/interaction으로 변환하거나 동기화한다.
5. `features/layers` 같은 UI 기능은 store action을 호출하고, map hook이 변경된 상태를 지도에 반영한다.

## Testing Rules

- `features/*/model`의 순수 함수는 unit test를 추가한다.
- OpenLayers 변환/정규화 함수도 가능하면 unit test로 잠근다.
- 지도 인스턴스 유지, postMessage 수신, 실제 canvas 렌더링은 e2e에서 검증한다.
- 리팩터링 PR은 최소 `typecheck`, `lint`, unit test, 필요 시 e2e를 통과해야 한다.
