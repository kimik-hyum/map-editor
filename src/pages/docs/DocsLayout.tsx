import { Cable, PanelsTopLeft, PencilRuler, Rocket } from "lucide-react";
import { Outlet } from "react-router";
import { AppPageContent } from "@/shared/layout/AppPageContent";
import { AppNavigation } from "@/shared/navigation/AppNavigation";
import { AppSideMenu, type AppSideMenuGroup } from "@/shared/navigation/AppSideMenu";

// 대메뉴는 라우트로 페이지를 이동하고, 소메뉴는 해당 페이지 안 섹션(#)으로 이동합니다.
const docsMenuGroups: AppSideMenuGroup[] = [
  {
    icon: Rocket,
    label: "시작하기",
    sections: [
      { href: "#start-editor", label: "편집기 열기" },
      { href: "#steps", label: "세 단계 안내" },
      { href: "#explore", label: "다음 문서" },
    ],
    to: "/",
  },
  {
    icon: PanelsTopLeft,
    label: "화면 구성",
    sections: [
      { href: "#overview", label: "전체 구성" },
      { href: "#map-area", label: "지도 영역" },
      { href: "#layer-panel", label: "레이어 패널" },
      { href: "#tools", label: "도구 레일" },
      { href: "#completion-bar", label: "완료 바" },
    ],
    to: "/screen",
  },
  {
    icon: PencilRuler,
    label: "도형 편집",
    sections: [
      { href: "#editing-overview", label: "편집 흐름" },
      { href: "#select-move", label: "선택과 이동" },
      { href: "#vertices", label: "정점 편집" },
      { href: "#layer-actions", label: "레이어 정리" },
      { href: "#create-shapes", label: "새 도형 그리기" },
      { href: "#radius", label: "반경 폴리곤" },
      { href: "#combine", label: "폴리곤 연산" },
      { href: "#finish", label: "완료와 취소" },
    ],
    to: "/editing",
  },
  {
    icon: Cable,
    label: "부모창 연동",
    sections: [
      { href: "#integration-overview", label: "연동 개요" },
      { href: "#host-flow", label: "부모창 역할" },
      { href: "#scene-input", label: "입력 scene" },
      { href: "#runtime-schema", label: "런타임 검증" },
      { href: "#host-code", label: "전체 예제" },
      { href: "#use-result", label: "결과 사용" },
      { href: "#message-reference", label: "메시지 계약" },
    ],
    to: "/integration",
  },
];

export function DocsLayout() {
  return (
    <div className="min-h-screen bg-surface">
      <AppNavigation />
      <div className="mx-auto grid min-h-[calc(100vh-65px)] w-full max-w-[1440px] grid-cols-[200px_minmax(0,1fr)] max-[900px]:grid-cols-1">
        <AppSideMenu ariaLabel="Docs sections" groups={docsMenuGroups} title="Docs" />
        <AppPageContent>
          <Outlet />
        </AppPageContent>
      </div>
    </div>
  );
}
