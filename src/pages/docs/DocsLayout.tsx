import { PanelsTopLeft, Rocket } from "lucide-react";
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
    ],
    to: "/screen",
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
