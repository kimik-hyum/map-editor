import type { Locale } from "@/shared/i18n/locale";
import englishCapture from "./editorTourCapture.en.json";
import capture from "./editorTourCapture.json";

const editorTourSteps = [
  {
    id: "select",
    label: "선택·이동",
    title: "도형을 고르면 꼭짓점이 나타납니다",
    description:
      "왼쪽 ‘선택’을 누른 다음 지도나 레이어 목록에서 경복궁 예제 권역을 선택합니다. 도형 전체를 옮길 때는 Cmd/Ctrl을 누른 채 몸통을 드래그하세요.",
    action: "예제: 레이어 목록의 ‘경복궁 예제 권역’을 클릭하세요.",
  },
  {
    id: "vertex",
    label: "정점 편집",
    title: "흰색 꼭짓점을 드래그해 사각형을 바꿉니다",
    description:
      "편집 가능한 도형을 하나만 선택하면 정점이 보입니다. 꼭짓점을 드래그하면 좌표가 바뀌고, 선을 클릭하면 정점을 추가합니다. 정점 우클릭은 삭제입니다.",
    action: "예제: 오른쪽 위 꼭짓점을 조금 바깥으로 옮겨보세요.",
  },
  {
    id: "draw",
    label: "그리기",
    title: "폴리곤·패스·마커 중 만들 도형을 고릅니다",
    description:
      "왼쪽 ‘그리기’를 누르면 오른쪽 도구 옵션에 폴리곤·패스·마커가 나타납니다. 폴리곤은 서로 다른 세 점 이상, 패스는 두 점 이상을 찍고 Enter로 완료합니다. 마커는 한 번 클릭합니다.",
    action: "예제: 기존 경복궁 권역 옆에 새 폴리곤을 그려보세요.",
  },
  {
    id: "boundary",
    label: "경계 선택",
    title: "국가와 경계 종류를 골라 씁니다",
    description:
      "왼쪽 ‘경계 데이터’를 누르고 오른쪽 도구 옵션에서 국가와 경계 종류를 고릅니다. 한국 경계는 로그인 안내를 따르고, 미국 경계는 로그인 없이 사용할 수 있습니다. 지도 위 경계 이름 옆 +로 추가·합치기, −로 빼기를 실행합니다.",
    action: "단순히 조회한 참고 경계는 편집 결과에 포함되지 않습니다.",
  },
  {
    id: "radius",
    label: "반경",
    title: "마커를 기준으로 원형 권역을 만듭니다",
    description:
      "마커 한 개를 선택하고 왼쪽 ‘반경’을 누릅니다. 오른쪽 반경 입력에서 거리를 입력하면 지도에 원이 미리 표시됩니다. ‘원형 폴리곤 추가’를 눌러 확정하거나 취소합니다.",
    action: "예제: ‘경복궁 예제 마커’를 선택하고 그 주위의 반경을 만들어보세요.",
  },
  {
    id: "layers",
    label: "레이어",
    title: "도형 하나가 목록의 한 행입니다",
    description:
      "오른쪽 아래 레이어 목록에서 눈 아이콘은 표시, 자물쇠는 잠금, 이름은 선택, 연필은 이름 변경입니다. 손잡이로 순서를 바꾸고, 편집하려면 먼저 잠금을 풉니다.",
    action: "숨긴 도형도 visible: false로 결과에 남습니다.",
  },
  {
    id: "panel",
    label: "작업 패널",
    title: "패널을 접어 지도 공간을 확보합니다",
    description:
      "오른쪽 위 접기 버튼을 누르면 도구 옵션과 레이어가 숨겨집니다. 펼치기 버튼이나 왼쪽 도구를 누르면 다시 열립니다. 지도의 위치와 편집 중인 도형은 유지됩니다.",
    action: "예제: 패널을 접은 뒤 왼쪽 ‘그리기’를 눌러 다시 펼쳐보세요.",
  },
  {
    id: "finish",
    label: "편집 완료",
    title: "완료하면 서비스 페이지로 결과를 돌려줍니다",
    description:
      "그리기나 이름 변경을 마친 뒤 ‘저장하고 편집 완료’를 누릅니다. 삭제하지 않은 도형 전체가 서비스 페이지로 돌아갑니다. 취소하면 기존 데이터를 유지합니다.",
    action: "예제: 문서로 돌아오면 지도와 ‘돌려받은 편집 결과 JSON’을 확인하세요.",
  },
] as const;

export function getEditorTourSteps(locale: Locale) {
  const metadata = locale === "ko" ? capture : englishCapture;
  const images = {
    select: locale === "ko" ? "editor-palace.jpg" : "editor-central-park.jpg",
    draw: locale === "ko" ? "editor-draw-tools.jpg" : "editor-draw-tools-en.jpg",
    radius: locale === "ko" ? "editor-radius.jpg" : "editor-radius-en.jpg",
    panel:
      locale === "ko" ? "editor-panel-collapsed.jpg" : "editor-panel-collapsed-en.jpg",
  };
  const alt = {
    select: "오른쪽에 선택 옵션과 레이어 목록이 있는 경복궁 예제 편집 화면",
    draw: "오른쪽 도구 옵션에서 폴리곤·패스·마커를 고르는 경복궁 예제 편집 화면",
    radius:
      "경복궁 예제 마커의 반경을 오른쪽에서 입력하고 지도에서 원을 미리 보는 화면",
    panel: "오른쪽 작업 패널을 접고 펼치기 버튼을 표시한 경복궁 예제 편집 화면",
  };
  return editorTourSteps.map((step) => {
    const screen =
      step.id === "draw" || step.id === "radius" || step.id === "panel"
        ? step.id
        : "select";
    return {
      ...step,
      image: images[screen],
      alt: alt[screen],
      bounds: metadata.bounds[step.id],
    };
  });
}
