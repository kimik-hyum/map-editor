# 경계 데이터 어댑터

저장소를 가져와 **자신의 경계 데이터와 접근 정책**을 연결하는 분을 위한 안내입니다. 웹 문서는 `/self-hosting/boundaries`입니다. 배포된 에디터에 폴리곤을 보내고 결과만 받는 사용자는 [연동 인터페이스](integration.md)를 사용하며 이 구성을 다룰 필요가 없습니다.

## 두 종류의 데이터를 구분하기

- 서비스의 `MAP_EDITOR_INIT.scene.features`: 이번에 편집할 도형입니다. 저장하면 수정된 전체 scene으로 돌아갑니다.
- 경계 공급자의 행정동·법정동·자체 권역: 지도에 표시하는 참고 데이터입니다. 사용자가 추가·합치기·빼기로 반영한 geometry만 편집 scene에 들어갑니다.

데이터 공급자는 파일이나 서버 응답을 에디터의 공통 데이터 형식으로 바꿉니다. Query는 조회 결과를 캐시하고, OpenLayers 어댑터는 별도의 참고 레이어로 표시합니다. 서버 호출을 지도 어댑터나 Zustand store에 넣지 않습니다.

**현재 상태:** 조회 진입점은 `src/pages/editor/features/regions/api/regionsApi.ts`이며 기본 구현이 Google 세션으로 Supabase 함수를 호출합니다. 환경 변수만으로 어댑터를 등록하는 기능은 아직 없습니다. 아래는 내재화한 소스에서 조회 함수 구현과 접근 hook을 교체하는 예제이며 기본 에디터에 자동 적용되지 않습니다.

## 조회 계약

| 함수                      | 입력                                     | 반환·역할                                                            |
| ------------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| `fetchRegionKinds`        | country, AbortSignal?                    | `RegionKind[]`: kind, label, level, min_zoom, sort_order, selectable |
| `fetchRegionsByView`      | bbox·zoom·kind·country?, AbortSignal?    | 화면 표시용 `RegionFeatureCollection`                                |
| `fetchRegionById`         | boundaryId, AbortSignal?                 | 같은 ID의 원본 Polygon/MultiPolygon Feature 또는 null                |
| `fetchRegionByCode`       | kind, code, country?, AbortSignal?       | 현재 코드의 원본 Feature 또는 null                                   |
| `fetchRegionTileManifest` | AbortSignal?                             | 타일 정책 또는 null. 미지원이면 null로 byView 사용                   |
| `fetchRegionsByTile`      | tile, manifest, zoom, kind, AbortSignal? | 타일 표시용 collection. manifest가 null인 예제에서는 호출하지 않음   |

타입의 현재 기준은 [regionsApi.ts](../src/pages/editor/features/regions/api/regionsApi.ts)입니다. 카탈로그는 선택 가능한 종류만 메뉴에 보여주고 `sort_order`로 정렬합니다. 카탈로그를 못 읽었을 때의 기본 종류는 `features/regions/model/regionKindModel.ts`에서 바꿉니다.

`RegionFeatureCollection`에는 GeoJSON의 type·features 외에 `country`, `kind`, `level`, `truncated`가 필요합니다. 여러 bbox 응답을 합칠 수 있도록 메타데이터를 일관되게 반환하세요. `properties.name`은 지도 라벨입니다. 좌표는 WGS84 `[경도, 위도]`이며 geometry는 유효한 Polygon 또는 MultiPolygon입니다.

표시용 geometry를 단순화하더라도 ID 조회는 원본 전체를 반환해야 합니다. 같은 ID를 다른 버전의 도형에 재사용하지 마세요. 버전이 바뀌면 ID·캐시 범위도 구분하고, 없어진 원본은 다른 도형으로 대체하지 말고 null을 반환합니다. 화면 bbox에 맞춰 잘라진 도형을 원본으로 채택하면 권역 일부가 사라질 수 있습니다.

## 공개 JSON 연결 예제

[예제 JSON](../src/pages/docs/content/examples/boundaries.example.json)은 실제 행정경계가 아닌 사각형입니다. 자신의 데이터로 바꾸고 `public/boundaries/regions.json`에 저장하면 `/boundaries/regions.json`으로 제공합니다. `kinds`는 메뉴·줌 정책이고 `features`의 `properties.kind`는 그 종류를 가리킵니다. 법정동·자체 권역을 추가할 때는 두 곳을 함께 채우세요.

[JSON 어댑터 전체 코드](../src/pages/docs/content/examples/json-boundary-adapter.example.ts)를 `src/pages/editor/features/regions/api/jsonBoundaryAdapter.ts`로 복사합니다. 필요한 Turf bbox와 Zod는 이미 설치되어 있습니다. 기존 `regionsApi.ts`의 같은 이름 조회 함수 여섯 개를 아래 구현으로 **교체**합니다. 기존 타입·스키마와 `RegionApiError` export는 유지하고 사용하지 않게 된 Supabase 요청 helper·import는 제거합니다.

```ts
import { createJsonBoundaryAdapter } from "./jsonBoundaryAdapter";

const adapter = createJsonBoundaryAdapter("/boundaries/regions.json");
export const fetchRegionKinds = adapter.fetchRegionKinds;
export const fetchRegionsByView = adapter.fetchRegionsByView;
export const fetchRegionById = adapter.fetchRegionById;
export const fetchRegionByCode = adapter.fetchRegionByCode;
export const fetchRegionTileManifest = adapter.fetchRegionTileManifest;
export const fetchRegionsByTile = adapter.fetchRegionsByTile;
```

이 예제는 전체 파일을 읽는 작은 공개 데이터셋용입니다. 국가·종류·최소 줌·bbox로 도형을 고르고, 표시와 ID 조회에 같은 전체 좌표를 사용합니다. 신호를 fetch로 전달하고 JSON 구조·좌표 범위·닫힌 링·ID 중복을 검사합니다. 교차 링 등 도메인에 필요한 추가 geometry 검사는 데이터 적재 단계에서 수행하세요.

타일 manifest는 null입니다. 기존 hook은 낮은 줌에서도 byView를 사용하며, 예제 데이터는 줌 12 이상에서 보입니다. 자체 타일 공급자를 구현하려면 현재 `RegionTileManifest`가 한국 시군구 정책에 특화되어 있다는 점을 확인하고 관련 타입과 query 모델을 함께 확장해야 합니다.

## 자체 서버 연결

전국 단위 데이터는 전체 JSON을 매번 다운로드하는 대신 서버에서 bbox·종류·줌을 처리하세요. endpoint·GET/POST·응답 구조는 자유롭게 정하고 위 함수 계약으로 변환합니다. 원본 ID 조회는 표시용 단순화와 분리합니다. Google 토큰은 필수가 아니며 사내 쿠키·자체 토큰 등 접근 정책을 요청 어댑터에 연결합니다.

네트워크의 성공 응답도 unknown으로 취급하고 Zod 등으로 검증합니다. 자체 응답 형식에 맞는 검증·매핑을 거친 뒤 공통 Feature/Collection을 반환하세요. HTTP 오류는 기존 `RegionApiError`로 표현하면 상태 코드 기반 오류·재시도 처리와 연결할 수 있습니다. 취소 신호를 무시하거나 모든 오류를 빈 목록으로 바꾸지 않습니다.

## 접근 정책과 인증 교체

데이터 요청부만 바꾸면 기본 Google 접근 게이트가 남습니다. 공개 JSON은 아래 두 hook도 교체하세요.

```ts
// src/features/auth/hooks/useBoundaryAccess.ts
export function useBoundaryAccess() {
  return { allowed: true, subject: "public-json:2026-09" };
}

// src/pages/editor/features/regions/hooks/useBoundaryLogin.ts
export function useBoundaryLogin() {
  return {
    requestBoundaryAccess: async () => true,
    isSigningIn: false,
    error: null,
    cancel: () => {},
  };
}
```

`subject`는 자격 증명이 아니라 캐시 범위입니다. **비어 있으면 조회·원본 채택이 실행되지 않습니다.** 공개 데이터는 데이터셋·버전, 사내 데이터는 사용자·테넌트·버전으로 범위를 구분하세요. 비공개 서버는 실제 인증·권한도 서버에서 검사하며 `allowed`만으로 권한을 부여하지 않습니다.

Google UI까지 제거하려면 다음 순서로 정리합니다.

1. 두 hook과 남은 `useAuth` 소비처를 자체 정책으로 교체합니다.
2. `EditorLayout`의 `AuthSessionButton`과 `App.tsx`의 `/auth/callback`을 제거·교체합니다.
3. 모든 소비처를 바꾼 뒤 `AppProviders.tsx`의 기존 `AuthProvider`를 정리합니다. Provider만 먼저 제거하면 hook이 실패합니다.
4. 환경 변수 검사·인증 E2E·smoke test·배포 대상도 [자신의 운영 환경](self-hosting.md)에 맞춥니다.

`VITE_E2E_AUTH_BYPASS`는 테스트 전용이며 운영 구성 선택에 쓰지 않습니다. 기본 공급자를 유지할 때만 [Google·Supabase 구성](supabase-region-api.md)을 적용합니다. 자신의 공개 데이터 선택은 원래 운영 서버의 인증 해제를 의미하지 않습니다.

## 교체 후 확인

- 카탈로그·정렬·최소 줌·bbox·국가·종류 조건과 빈 응답을 확인합니다.
- 취소한 요청과 잘못된 JSON이 오류로 처리되는지 확인합니다.
- 참고 경계의 추가·합치기·빼기가 같은 ID의 원본 전체를 쓰고 undo가 동작하는지 확인합니다.
- 데이터 버전·접근 범위 변경 후 이전 캐시가 섞이지 않는지 확인합니다.
- 저장 결과에는 편집 scene만 포함되고 참고 경계 목록과 인증 정보는 포함되지 않는지 확인합니다.

예제의 타입·조회·오류 처리는 단위 테스트로 검사합니다. 자신의 공급자를 연결한 뒤에는 `npm run verify`, `npm run build`와 실제 데이터 편집 흐름을 확인하세요.
