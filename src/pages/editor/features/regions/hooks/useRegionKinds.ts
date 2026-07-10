import { useQuery } from "@tanstack/react-query";
import { fetchRegionKinds } from "../api/regionsApi";

// 사이드 메뉴에 띄울 "선택 가능한 경계 종류"(행정동/법정동/우편번호 등)를 가져옵니다.
// region_kind 카탈로그가 단일 출처라, 국가별 종류가 데이터로 정의됩니다.
export function useRegionKinds(country = "KR") {
  return useQuery({
    queryKey: ["region-kinds", country],
    queryFn: ({ signal }) => fetchRegionKinds(country, signal),
    staleTime: 5 * 60_000,
  });
}
