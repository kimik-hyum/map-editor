// postMessage로 주고받는 에디터 메시지의 종류입니다.
export enum EditorMessageType {
  // 에디터가 로딩되어 초기 데이터를 받을 준비가 된 상태입니다.
  Ready = "MAP_EDITOR_READY",
  // 부모 창이 에디터에 초기 씬, 레이어, 도형 데이터를 전달합니다.
  Init = "MAP_EDITOR_INIT",
  // 편집 중 도형이나 레이어 상태가 변경되었음을 알립니다.
  Change = "MAP_EDITOR_CHANGE",
  // 사용자가 편집 결과를 확정해 부모 창으로 반환합니다.
  Submit = "MAP_EDITOR_SUBMIT",
  // 사용자가 편집을 취소했음을 알립니다.
  Cancel = "MAP_EDITOR_CANCEL",
  // 메시지 검증 실패나 편집 불가 상태 같은 오류를 전달합니다.
  Error = "MAP_EDITOR_ERROR",
}

// 에디터가 다루는 도형의 논리적 종류입니다.
export enum GeometryKind {
  // 단일 좌표 지점입니다.
  Point = "point",
  // 여러 개의 좌표 지점입니다.
  MultiPoint = "multiPoint",
  // 닫힌 면 도형입니다.
  Polygon = "polygon",
  // 여러 개의 면 도형 묶음입니다.
  MultiPolygon = "multiPolygon",
  // 길, 선, 이동 경로처럼 열린 선 도형입니다.
  Path = "path",
  // 여러 개의 열린 선 도형 묶음입니다.
  MultiPath = "multiPath",
}

// 도형 종류 enum을 화면에 표시할 때 사용하는 공통 한글 라벨입니다.
export const geometryKindLabels = {
  [GeometryKind.Point]: "점",
  [GeometryKind.MultiPoint]: "여러 점",
  [GeometryKind.Polygon]: "폴리곤",
  [GeometryKind.MultiPolygon]: "멀티 폴리곤",
  [GeometryKind.Path]: "패스",
  [GeometryKind.MultiPath]: "멀티 패스",
} satisfies Record<GeometryKind, string>;

// 레이어가 에디터 안에서 맡는 "용도"입니다. 하나의 레이어가 여러 역할을 가질 수 있습니다.
// 편집 가능 여부(역량)는 역할이 아니라 EditabilityState로 표현합니다(중복 방지).
export enum LayerRole {
  // 사용자가 실제로 수정하는 대상 레이어입니다.
  Editable = "editable",
  // 편집 판단에 참고되는 보조 레이어입니다.
  Reference = "reference",
  // 배경처럼 표시만 하고 상호작용하지 않는 레이어입니다.
  Background = "background",
  // 편집 가능 영역이나 금지 영역을 판정하는 기준 레이어입니다.
  Mask = "mask",
  // 꼭짓점이나 선을 붙일 수 있는 스냅 기준 레이어입니다.
  SnapTarget = "snapTarget",
}

// 레이어 역할 enum을 화면에 표시할 때 사용하는 공통 한글 라벨입니다.
export const layerRoleLabels = {
  [LayerRole.Editable]: "편집",
  [LayerRole.Reference]: "참고",
  [LayerRole.Background]: "배경",
  [LayerRole.Mask]: "마스크",
  [LayerRole.SnapTarget]: "스냅",
} satisfies Record<LayerRole, string>;

// 레이어나 도형이 화면에 표시되는 방식입니다.
export enum VisibilityState {
  // 정상적으로 표시합니다.
  Visible = "visible",
  // 화면에서 숨깁니다.
  Hidden = "hidden",
  // 흐리게 표시해 참고용 상태임을 표현합니다.
  Dimmed = "dimmed",
}

// 레이어 또는 도형의 잠금 상태입니다.
export enum LockState {
  // 조작 가능한 잠금 해제 상태입니다.
  Unlocked = "unlocked",
  // 선택, 이동, 편집 같은 조작을 막는 잠금 상태입니다.
  Locked = "locked",
}

// 편집 가능성의 수준입니다.
export enum EditabilityState {
  // 꼭짓점 수정, 이동 등 편집 조작이 가능한 상태입니다.
  Editable = "editable",
  // 조회나 선택은 가능하지만 편집은 불가능한 상태입니다.
  Readonly = "readonly",
  // 선택과 편집 흐름에서 제외되는 비활성 상태입니다.
  Disabled = "disabled",
}

// 편집 역량(editability)을 화면에 표시할 때 쓰는 공통 한글 라벨입니다.
export const editabilityLabels = {
  [EditabilityState.Editable]: "편집",
  [EditabilityState.Readonly]: "읽기",
  [EditabilityState.Disabled]: "비활성",
} satisfies Record<EditabilityState, string>;

// 현재 포인터나 편집 도구 기준의 선택 상태입니다.
export enum SelectionState {
  // 선택되지 않은 기본 상태입니다.
  None = "none",
  // 마우스가 올라가 있거나 포인터가 가리키는 상태입니다.
  Hovered = "hovered",
  // 사용자가 선택한 상태입니다.
  Selected = "selected",
  // 현재 편집 도구의 주 대상이 되는 활성 상태입니다.
  Active = "active",
}

// 사용자가 현재 선택한 편집 모드입니다.
// 좌측 모드 패널과 editorStore가 공유하는 단일 모드 개념이며, 화면 표시용 카탈로그는
// features/modes/model/editorModeModel.ts의 editorModeOptions가 담당합니다.
export enum EditorMode {
  // 폴리곤·패스를 직접 수동으로 편집합니다.
  ManualEdit = "manual-edit",
  // 행정동 경계를 선택해 편집합니다.
  AdministrativeDong = "administrative-dong",
  // 법정동 경계를 선택해 편집합니다.
  LegalDong = "legal-dong",
  // 반경 거리로 도형을 잘라냅니다.
  RadiusCut = "radius-cut",
  // 선택한 도형을 병합하거나 제외합니다.
  MergeCut = "merge-cut",
  // 꼭짓점·선을 스냅하고 정렬을 보정합니다.
  SnapAlign = "snap-align",
  // 오류·면적 등 검증 상태를 확인합니다.
  Inspect = "inspect",
}

// 원본 대비 도형이 어떤 변경 상태인지 나타냅니다.
export enum FeatureLifecycle {
  // 초기 입력값과 동일한 변경 없음 상태입니다.
  Clean = "clean",
  // 에디터에서 새로 만들어진 도형입니다.
  Created = "created",
  // 기존 도형이 수정된 상태입니다.
  Updated = "updated",
  // 삭제되었거나 저장 시 삭제 처리될 도형입니다.
  Deleted = "deleted",
}

// 도형이나 레이어가 현재 규칙을 만족하는지 나타냅니다.
export enum ValidationState {
  // 아직 검증 전이거나 비동기 검증을 기다리는 상태입니다.
  Pending = "pending",
  // 저장 가능한 정상 상태입니다.
  Valid = "valid",
  // 저장은 가능하지만 사용자에게 알려야 할 주의 상태입니다.
  Warning = "warning",
  // 저장을 막아야 하는 오류 상태입니다.
  Invalid = "invalid",
}

// 검증 실패나 경고의 구체적인 원인 코드입니다.
export enum ValidationIssueCode {
  // 폴리곤 선분이 자기 자신과 교차합니다.
  SelfIntersection = "selfIntersection",
  // 다른 도형이나 금지 영역과 겹칩니다.
  Overlap = "overlap",
  // 지정된 경계 레이어 밖으로 벗어났습니다.
  OutsideBoundary = "outsideBoundary",
  // 허용된 최소 면적보다 작습니다.
  TooSmallArea = "tooSmallArea",
  // 허용된 최대 면적보다 큽니다.
  TooLargeArea = "tooLargeArea",
  // 허용된 최소 길이보다 짧습니다.
  TooShortLength = "tooShortLength",
  // 허용된 최대 길이보다 깁니다.
  TooLongLength = "tooLongLength",
  // GeoJSON 구조나 좌표값이 유효하지 않습니다.
  InvalidGeometry = "invalidGeometry",
  // 현재 에디터가 지원하지 않는 도형 타입입니다.
  UnsupportedGeometry = "unsupportedGeometry",
  // postMessage 페이로드가 스키마 구조 검증을 통과하지 못했습니다.
  InvalidPayload = "invalidPayload",
}
