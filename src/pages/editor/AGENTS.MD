# Editor Rules

- 에디터 도메인 타입의 공개 진입점은 `types/editorTypes.ts`를 기준으로 한다.
- 실제 타입 선언은 역할별로 `types/enums.ts`, `types/geometry.ts`, `types/validation.ts`, `types/document.ts`, `types/messages.ts`에 나누어 둔다.
- 레이어와 도형 상태를 새로 추가할 때는 문자열 리터럴을 흩뿌리지 말고 먼저 `types/enums.ts`의 enum 확장을 검토한다.
- 에디터의 의미 기반 색상 토큰과 기본 테마 값은 `theme/editorTheme.ts`를 기준으로 한다.
- `EditorDocument -> EditorLayer[] -> EditorFeature[]` 구조를 기본 모델로 유지한다.
- 기능 구현은 OpenLayers 객체에 직접 종속된 상태와 에디터 도메인 상태를 분리해서 작성한다.
