# 도구·상태 모델

사용자 조작 안내는 웹 `/editing`, 구현 책임은 [ARCHITECTURE.md](../src/pages/editor/ARCHITECTURE.md)에 둡니다. 이 문서는 코드를 바꿀 때 지켜야 할 도구 간 계약만 다룹니다.

## 도구 전환

`activeMode → getToolActivation`이 지도 상호작용의 활성 여부를 결정합니다.

| 도구     | 동작                                   | 전환·완료                                                 |
| -------- | -------------------------------------- | --------------------------------------------------------- |
| select   | 선택·정점 편집·보조키 이동·폴리곤 연산 | 기본 도구                                                 |
| draw     | 폴리곤·패스·마커 생성                  | 진행 중 스케치를 버리는 전환은 확인 후 실행               |
| boundary | 인증된 경계 조회·원본 채택·연산        | 미로그인 시 안내부터 표시. 취소하면 기존 도구·스케치 유지 |
| radius   | 마커 선택·반경 preview·폴리곤 생성     | 적용·취소 후 선택 도구로 복귀                             |

선택은 모드 전환 후 유지할 수 있지만 허용되지 않는 interaction·오버레이는 해제합니다. 인증 성공 렌더와 Zustand 도구 갱신의 순서가 달라도 경계 도구가 임의로 되돌아가지 않도록 합니다.

## 소유권

| 상태                                       | 소유자                             |
| ------------------------------------------ | ---------------------------------- |
| sessionId, scene, 선택, 모드, 편집 이력    | Zustand editorStore                |
| Google 세션·로그인 진행                    | auth 기능                          |
| 경계 카탈로그·화면·원본 응답               | TanStack Query, 사용자별 cache key |
| OpenLayers 객체·그리기 스케치·반경 preview | 지도 adapter와 controller          |

원격 결과는 사용자가 채택할 때만 scene에 복사합니다. OpenLayers 객체·DOM·React ref를 store에 넣지 않습니다.

## 반드시 유지할 불변식

- 공개 scene은 `features` 배열이며 내부는 `1레이어 = 1도형`입니다. 배열 뒤쪽이 위, 패널 위쪽이 위입니다.
- 정확히 한 개의 편집 가능 도형을 선택하면 정점 편집이 활성화됩니다. 더블클릭 진입 상태는 현재 없습니다.
- 일반 드래그는 지도 이동, Cmd/Ctrl+드래그만 도형 이동입니다.
- geometry·이름·생성·삭제·연산은 한 사용자 동작당 한 undo 스냅샷을 만듭니다. 최대 50단계입니다.
- 선택·호버·모드·표시·잠금·순서 변경은 자체 undo 단계를 만들지 않으나, scene에 포함된 값은 과거 스냅샷 복원에 영향을 받습니다.
- Draw의 미확정 정점은 로컬 undo/redo가 먼저 처리합니다. 반경도 적용 전까지 scene을 수정하지 않습니다.
- 새로운 INIT은 기존 scene·이력·확인 상태를 초기화합니다. 원본 조회 중 세션·인증·scene·선택 맥락이 달라지면 결과를 버립니다.
- 경계의 표시용 단순화 geometry로 편집 연산을 하지 않습니다. 표시된 row ID의 원본을 다시 조회합니다.
- 일반 폴리곤 병합은 상대 도형을 소비하지만, 외부 경계 원본은 소비하거나 서버에서 수정하지 않습니다.
- locked는 UI 잠금이며 사용자 해제가 가능합니다. 부모 원본의 삭제 버튼 보호와 서버 저장 권한은 서로 다른 정책입니다.
- SUBMIT은 공개 v2 scene 전체, CANCEL은 sessionId만 반환합니다. 중간 CHANGE 메시지를 보내지 않습니다.

## 빈 공간 채우기

레이어 행의 페인트통은 `select`/`boundary`에서 표시·편집 가능한 Polygon/MultiPolygon에 닫힌 내부 ring이 있을 때만 활성화합니다. 잠금·읽기 전용·좌표 오류·다른 작업 중에는 기본 `title`로 이유를 설명합니다. 도형 선택 여부와 관계없이 클릭한 행 하나를 대상으로 삼고 단독 선택합니다.

`features/hole-fill` controller는 기준 면적(기본 1,000㎡), 원본 scene/session/선택 맥락과 미리보기를 소유합니다. 내부 ring의 Turf 지표 면적이 기준 이하일 때만 채우며 외부로 열린 틈은 처리하지 않습니다. MultiPolygon의 구멍 안에 섬이 있으면 합집합으로 중복 면을 제거하고 실제 추가 면만 preview에 표시합니다.

설정 팝업은 배경 조작과 scene 단축키·완료를 차단합니다. 취소·Escape·바깥 클릭 또는 scene/session/선택 변경은 원본을 유지하고 미리보기를 폐기합니다. 적용 직전에도 맥락을 재확인하며 `updateFeatureGeometry` 한 번만 호출합니다. 별도 서버 요청이나 로그인을 요구하지 않습니다.

## 완료를 막는 상태

진행 중 그리기·반경 입력·경계 연산·이름 변경·빈 공간 채우기와 invalid 도형은 완료를 막습니다. 부모 데이터와 연결이 준비되지 않아도 완료할 수 없습니다. 반환할 Polygon/MultiPolygon이 없는 상태는 안내만 표시하며 저장은 가능합니다. 서버 영구 저장은 이 흐름에 포함되지 않습니다.

기준 코드: [도구 활성화](../src/pages/editor/features/modes/model/toolActivationModel.ts), [세션 액션](../src/pages/editor/features/session/hooks/useEditorSessionActions.ts), [경계 로그인](../src/pages/editor/features/regions/hooks/useBoundaryLogin.ts).
