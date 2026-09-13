import type { EditorSceneInput } from "./editor-contract.example";

// 경복궁 주변의 권역·경로·위치를 표현하는 연동 연습용 데이터입니다.
// 실제 지적·행정 경계나 공식 관람 동선이 아닙니다.
export const inputScene = {
  version: 2, // 필수: 입출력 데이터 형식의 버전
  name: "경복궁 권역 편집", // 선택: 편집 데이터 전체의 이름. 저장 결과에도 포함
  features: [
    // 필수: 표시할 도형 목록. []이면 빈 지도, 배열 뒤쪽 도형이 위에 표시
    {
      id: "gyeongbokgung-area", // 선택: 반환된 도형을 찾는 고유 ID. 생략 시 자동 생성
      name: "경복궁 예제 권역", // 선택: 도형 목록과 지도 라벨에 표시할 이름
      locked: false, // 선택, 기본 false: 편집 가능. true는 잠금 시작, UI에서 해제 가능
      visible: true, // 선택, 기본 true: 지도 표시 여부. 숨겨도 저장 결과에 포함
      // 필수: 실제 위치와 모양을 담는 GeoJSON geometry
      geometry: {
        type: "Polygon", // 면적을 가진 다각형
        // WGS84 [경도, 위도]. 첫 링은 바깥 경계, 추가 링은 내부에서 비울 구멍
        coordinates: [
          [
            [126.972, 37.5745], // 남서
            [126.982, 37.5745], // 남동
            [126.982, 37.5855], // 북동
            [126.972, 37.5855], // 북서
            [126.972, 37.5745], // 첫 점으로 돌아와 링 닫기
          ],
        ],
      },
      // 선택: 좌표를 편집해 저장해도 함께 돌려받는 업무 정보
      properties: { serviceAreaId: "palace-001" }, // 서비스가 정한 필드명과 권역 ID
    },
    {
      id: "gyeongbokgung-route",
      name: "경복궁 예제 경로",
      locked: false,
      visible: true,
      geometry: {
        type: "LineString", // 선: 두 개 이상의 좌표를 순서대로 연결
        coordinates: [
          [126.976, 37.577], // 시작점: 아래 마커와 같은 위치
          [126.976, 37.5795], // 경유점
          [126.979, 37.5815], // 도착점. 폴리곤처럼 첫 점으로 닫지 않습니다.
        ],
      },
      properties: { routeId: "palace-route-001" }, // 서비스에서 경로를 식별할 업무 ID
    },
    {
      id: "gyeongbokgung-marker",
      name: "경복궁 예제 마커",
      locked: false,
      visible: true,
      geometry: {
        type: "Point", // 마커: 좌표 목록이 아닌 [경도, 위도] 한 쌍
        coordinates: [126.976, 37.577], // 예제 경로의 시작 위치
      },
      properties: { placeId: "palace-marker-001" }, // 서비스에서 장소를 식별할 업무 ID
    },
  ],
} satisfies EditorSceneInput;
