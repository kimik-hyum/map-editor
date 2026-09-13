import capture from "./editorTourCapture.json";

export const editorTourSteps = [
  {
    id: "select",
    label: "선택·이동",
    image: "editor-palace.jpg",
    bounds: capture.bounds.select,
    title: "도형을 고르면 꼭짓점이 나타납니다",
    description:
      "왼쪽 ‘선택’을 누른 다음 지도나 레이어 목록에서 경복궁 예제 권역을 선택합니다. 도형 전체를 옮길 때는 Cmd/Ctrl을 누른 채 몸통을 드래그하세요.",
    action: "예제: 레이어 목록의 ‘경복궁 예제 권역’을 클릭하세요.",
  },
  {
    id: "vertex",
    label: "정점 편집",
    image: "editor-palace.jpg",
    bounds: { x: 49.1, y: 46, width: 17.2, height: 37.5 },
    title: "흰색 꼭짓점을 드래그해 사각형을 바꿉니다",
    description:
      "편집 가능한 도형을 하나만 선택하면 정점이 보입니다. 꼭짓점을 드래그하면 좌표가 바뀌고, 선을 클릭하면 정점을 추가합니다. 정점 우클릭은 삭제입니다.",
    action: "예제: 오른쪽 위 꼭짓점을 조금 바깥으로 옮겨보세요.",
  },
  {
    id: "draw",
    label: "그리기",
    image: "editor-draw-tools.jpg",
    bounds: { x: 0.35, y: 7, width: 20.5, height: 24 },
    title: "폴리곤·패스·마커 중 만들 도형을 고릅니다",
    description:
      "그리기 버튼을 누르면 이 팝업이 열립니다. 폴리곤은 서로 다른 세 점 이상을 찍고 Enter로 완료합니다. 패스는 두 점 이상, 마커는 한 번 클릭합니다.",
    action: "예제: 기존 경복궁 권역 옆에 새 폴리곤을 그려보세요.",
  },
  {
    id: "boundary",
    label: "경계 선택",
    image: "editor-palace.jpg",
    bounds: capture.bounds.boundary,
    title: "행정동·법정동 등의 경계를 골라 씁니다",
    description:
      "경계 도구에서 종류를 선택합니다. 공개 에디터의 로그인 안내를 따른 뒤, 경계 이름 옆 +로 추가·합치기 또는 −로 빼기를 실행합니다. 보이지 않으면 지도를 확대하세요.",
    action: "단순히 조회한 참고 경계는 저장 결과에 포함되지 않습니다.",
  },
  {
    id: "radius",
    label: "반경",
    image: "editor-palace.jpg",
    bounds: capture.bounds.radius,
    title: "마커를 기준으로 원형 권역을 만듭니다",
    description:
      "지도나 레이어 목록에서 마커 한 개를 먼저 선택하면 반경 버튼이 활성화됩니다. 버튼을 누른 뒤 거리를 입력하세요. 선택을 해제하거나 선·폴리곤·여러 도형을 선택하면 비활성화됩니다.",
    action: "예제: ‘경복궁 예제 마커’를 선택하고 그 주위의 반경을 만들어보세요.",
  },
  {
    id: "layers",
    label: "레이어",
    image: "editor-palace.jpg",
    bounds: { x: 8.5, y: 11.8, width: 23.5, height: 7.5 },
    title: "도형 하나가 목록의 한 행입니다",
    description:
      "눈 아이콘은 표시, 자물쇠는 잠금, 이름은 선택, 연필은 이름 변경입니다. 손잡이를 끌어 도형 순서를 바꿉니다. 잠긴 도형은 먼저 잠금을 풀어야 편집할 수 있습니다.",
    action: "숨긴 도형도 visible: false로 결과에 남습니다.",
  },
  {
    id: "finish",
    label: "저장·완료",
    image: "editor-palace.jpg",
    bounds: capture.bounds.finish,
    title: "완료하면 원래 페이지로 결과를 돌려줍니다",
    description:
      "그리기나 이름 변경을 마친 뒤 ‘저장하고 완료’를 누릅니다. 입력·추가·수정한 도형 전체가 원래 페이지로 돌아갑니다. 취소하면 기존 데이터를 유지합니다.",
    action: "예제: 문서로 돌아오면 지도와 ‘방금 돌려받은 scene JSON’을 확인하세요.",
  },
] as const;
