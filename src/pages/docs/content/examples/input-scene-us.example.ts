import type { EditorSceneInput } from "./editor-contract.example";

// 센트럴파크 주변의 권역·경로·위치를 표현하는 연동 연습용 데이터입니다.
// 실제 지적·행정 경계나 공식 관람 동선이 아닙니다.
export const inputScene = {
  version: 2, // 필수: 입출력 데이터 형식의 버전
  name: "Central Park area editing", // 선택: 편집 데이터 전체의 이름. 편집 결과에도 포함
  viewport: { center: [-73.973, 40.7725], zoom: 15 },
  features: [
    // 필수: 표시할 도형 목록. []이면 빈 지도, 배열 뒤쪽 도형이 위에 표시
    {
      id: "central-park-area", // 선택: 반환된 도형을 찾는 고유 ID. 생략 시 자동 생성
      name: "Central Park example area", // 선택: 도형 목록과 지도 라벨에 표시할 이름
      locked: false, // 선택, 기본 false: 편집 가능. true는 잠금 시작, UI에서 해제 가능
      visible: true, // 선택, 기본 true: 지도 표시 여부. 숨겨도 편집 결과에 포함
      // 필수: 실제 위치와 모양을 담는 GeoJSON geometry
      geometry: {
        type: "Polygon", // 면적을 가진 다각형
        // WGS84 [경도, 위도]. 첫 링은 바깥 경계, 추가 링은 내부에서 비울 구멍
        coordinates: [
          [
            [-73.978, 40.767], // 남서
            [-73.968, 40.767], // 남동
            [-73.968, 40.778], // 북동
            [-73.978, 40.778], // 북서
            [-73.978, 40.767], // 첫 점으로 돌아와 링 닫기
          ],
        ],
      },
      // 선택: 좌표를 편집해 저장해도 함께 돌려받는 업무 정보
      properties: { serviceAreaId: "park-001" }, // 서비스가 정한 필드명과 권역 ID
    },
    {
      id: "central-park-route",
      name: "Central Park example path",
      locked: false,
      visible: true,
      geometry: {
        type: "LineString", // 선: 두 개 이상의 좌표를 순서대로 연결
        coordinates: [
          [-73.974, 40.7695], // 시작점: 아래 마커와 같은 위치
          [-73.974, 40.772], // 경유점
          [-73.971, 40.774], // 도착점. 폴리곤처럼 첫 점으로 닫지 않습니다.
        ],
      },
      properties: { routeId: "park-route-001" }, // 서비스에서 경로를 식별할 업무 ID
    },
    {
      id: "central-park-marker",
      name: "Central Park example marker",
      locked: false,
      visible: true,
      geometry: {
        type: "Point", // 마커: 좌표 목록이 아닌 [경도, 위도] 한 쌍
        coordinates: [-73.974, 40.7695], // 예제 경로의 시작 위치
      },
      properties: { placeId: "park-marker-001" }, // 서비스에서 장소를 식별할 업무 ID
    },
  ],
} satisfies EditorSceneInput;
