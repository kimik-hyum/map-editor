import jsonAdapter from "./examples/json-boundary-adapter.example.ts?raw";
import boundaryJson from "./examples/boundaries.example.json?raw";

export const boundaryJsonExample = boundaryJson;
export const jsonAdapterExample = jsonAdapter;

export const adapterWiringExample = `// 내재화한 regionsApi.ts에서 기존 같은 이름의 함수 구현을 교체합니다.
// 기존 타입과 RegionApiError export는 유지합니다.
import { createJsonBoundaryAdapter } from "./jsonBoundaryAdapter";

const adapter = createJsonBoundaryAdapter("/boundaries/regions.json");
export const fetchRegionKinds = adapter.fetchRegionKinds;
export const fetchRegionsByView = adapter.fetchRegionsByView;
export const fetchRegionById = adapter.fetchRegionById;
export const fetchRegionByCode = adapter.fetchRegionByCode;
export const fetchRegionTileManifest = adapter.fetchRegionTileManifest;
export const fetchRegionsByTile = adapter.fetchRegionsByTile;`;

export const publicAccessExample = `// src/features/auth/hooks/useBoundaryAccess.ts
// 자체 공개 JSON 데이터만 사용하는 배포의 예시입니다.
export function useBoundaryAccess() {
  return { allowed: true, subject: "public-json:2026-09" };
}

// src/pages/editor/features/regions/hooks/useBoundaryLogin.ts
// useAuth/Google 팝업 호출 없이 동일한 hook 반환 계약을 유지합니다.
export function useBoundaryLogin() {
  return {
    requestBoundaryAccess: async () => true,
    isSigningIn: false,
    error: null,
    cancel: () => {},
  };
}`;

export const customServerExample = `// 별도 서버 어댑터의 요청부 예시입니다.
// endpoint·GET/POST·응답 변환은 서버에 맞추고 아래 조회 함수 계약을 유지합니다.
async function request(operation, payload, signal) {
  const response = await fetch("/api/boundaries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // 사내 세션 쿠키를 쓰는 같은 origin 서버의 예시입니다.
    credentials: "same-origin",
    signal,
    body: JSON.stringify({ operation, ...payload }),
  });
  if (!response.ok) throw new RegionApiError(operation, response.status);
  return response.json(); // 각 함수에서 실제 응답을 Zod로 검증·변환합니다.
}`;
