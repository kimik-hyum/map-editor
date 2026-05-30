# Editor MVP Roadmap

## Goal

지도 편집기의 MVP는 외부 서비스가 `postMessage`로 전달한 `EditorScene`을 검증하고, 여러 레이어와 도형을 지도 위에 표시하며, 사용자가 레이어 상태와 폴리곤을 직관적으로 편집할 수 있게 하는 것이다.

## Recommended Order

| Step | Phase                         | Main Work                                                                      | Done When                                                                    |
| ---- | ----------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1    | EditorScene Fixture Rendering | 샘플 폴리곤을 `EditorScene -> EditorLayer[] -> EditorFeature[]` fixture로 전환 | OpenLayers가 fixture의 layers/features를 읽어 지도에 렌더링한다              |
| 2    | Layer System UI               | 사이드바에 레이어 목록, 역할, visible, lock, active, feature count를 표시      | visible/lock/zIndex 변경이 UI와 지도에 반영된다                              |
| 3    | postMessage + Zod Validation  | demo에서 editor를 열고 `MAP_EDITOR_INIT`으로 scene을 전달하며 Zod로 검증       | 검증 성공 시 전달된 scene이 렌더링되고 실패 시 `MAP_EDITOR_ERROR`를 반환한다 |
| 4    | Editing Modes                 | 선택, 폴리곤 수정, path 수정, draw 모드를 도입                                 | editable/lock 상태에 따라 수정 가능 여부가 제어되고 변경 이벤트가 발생한다   |
| 5    | Administrative Boundary Merge | 샘플 행정구역 fixture로 merge 흐름을 검증한 뒤 실제 데이터 연동을 확장         | 선택한 경계와 기존 도형을 병합하고 검증 상태를 갱신한다                      |

### 1. EditorScene Fixture Rendering

- 현재 `EditorPage`에 직접 들어간 샘플 폴리곤을 `fixtures/sampleEditorScene.ts`로 이동한다.
- 샘플 데이터는 `EditorScene -> EditorLayer[] -> EditorFeature[]` 구조를 따른다.
- OpenLayers 렌더링은 하드코딩된 샘플 배열이 아니라 `EditorScene.layers`를 읽어 도형을 그린다.
- 이 단계의 목적은 postMessage 없이도 내부 데이터 모델과 지도 렌더링을 먼저 안정화하는 것이다.

### 2. Layer System UI

- 사이드바를 레이어 패널로 확장한다.
- 레이어 이름, 역할 badge, feature 개수, visible 상태, lock 상태, active 상태를 표시한다.
- 눈 아이콘으로 레이어 표시/숨김을 토글한다.
- 자물쇠 아이콘으로 편집 잠금 상태를 표현한다.
- 레이어 순서는 `zIndex` 기준으로 지도 렌더링에 반영한다.
- 이후 drag reorder로 레이어 우선순위를 조절할 수 있게 한다.

### 3. postMessage + Zod Validation

- demo 페이지에서 `window.open`으로 editor를 연다.
- editor는 `MAP_EDITOR_READY`를 부모 창에 보낸다.
- demo는 `MAP_EDITOR_INIT` 메시지로 `EditorScene`을 전달한다.
- editor는 Zod schema로 메시지와 scene 구조를 검증한다.
- 검증 성공 시 fixture 대신 전달받은 scene을 렌더링한다.
- 검증 실패 시 `MAP_EDITOR_ERROR`를 부모 창에 반환한다.

### 4. Editing Modes

- 초기 모드는 선택 모드, 폴리곤 수정 모드, path 수정 모드, draw 모드 정도로 나눈다.
- `editable` 역할과 `lock` 상태를 기준으로 실제 수정 가능 여부를 판단한다.
- 수정 결과는 `FeatureLifecycle`과 `ValidationState`에 반영한다.
- 변경 이벤트는 `MAP_EDITOR_CHANGE`, 완료 이벤트는 `MAP_EDITOR_SUBMIT`으로 반환한다.

### 5. Administrative Boundary Merge

- 행정동/법정동 기반 기능은 별도 고도화 단계로 둔다.
- 초기에는 실제 공공 데이터 연동보다 샘플 행정구역 fixture로 merge 흐름을 검증한다.
- 이후 데이터 소스, 좌표계, 폴리곤 품질, 병합 검증, 겹침 방지 로직을 단계적으로 붙인다.

## MVP Completion Criteria

- demo에서 editor 새 창을 열 수 있다.
- demo가 `EditorScene`을 editor로 전달할 수 있다.
- editor가 Zod로 payload를 검증한다.
- 여러 레이어와 여러 폴리곤/path를 지도 위에 렌더링한다.
- visible, lock, zIndex가 지도와 UI에 반영된다.
- 수정 가능한 레이어만 편집할 수 있다.
- 편집 완료 시 결과 scene을 부모 창으로 반환한다.

## Notes

- postMessage는 데이터 주입 경로일 뿐이며, 내부 모델은 항상 `EditorScene`을 기준으로 유지한다.
- OpenLayers 객체 상태와 에디터 도메인 상태는 분리한다.
- 코어 편집 로직이 충분히 커지면 public repo에서 분리해 private package 또는 submodule로 관리할 수 있다.
