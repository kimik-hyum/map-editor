import { Cable, KeyRound, PencilRuler, Rocket } from "lucide-react";
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { AppPageContent } from "@/shared/layout/AppPageContent";
import { AppFooter } from "@/shared/layout/AppFooter";
import { AppNavigation } from "@/shared/navigation/AppNavigation";
import { AppSideMenu, type AppSideMenuGroup } from "@/shared/navigation/AppSideMenu";

const docsMenuGroups: AppSideMenuGroup[] = [
  {
    icon: Rocket,
    label: "빠른 시작",
    to: "/",
    sections: [
      { href: "#contract", label: "연동 전 확인" },
      { href: "#run", label: "로컬 실행" },
      { href: "#next", label: "문서 안내" },
    ],
  },
  {
    icon: Cable,
    label: "부모 창 연동",
    to: "/integration",
    sections: [
      { href: "#messages", label: "메시지 흐름" },
      { href: "#scene", label: "입력·출력 형식" },
      { href: "#example", label: "연동 예제" },
      { href: "#errors", label: "오류 처리" },
    ],
  },
  {
    icon: KeyRound,
    label: "경계 데이터·인증",
    to: "/authentication",
    sections: [
      { href: "#flow", label: "로그인 시점" },
      { href: "#configuration", label: "환경 변수·callback" },
      { href: "#security", label: "접근 제한" },
      { href: "#troubleshooting", label: "문제 해결" },
    ],
  },
  {
    icon: PencilRuler,
    label: "편집 동작",
    to: "/editing",
    sections: [
      { href: "#screen", label: "화면 구성" },
      { href: "#tools", label: "도구별 동작" },
      { href: "#finish", label: "저장·취소 조건" },
      { href: "#shortcuts", label: "단축키" },
    ],
  },
];

export function DocsLayout() {
  const { pathname } = useLocation();
  const title =
    docsMenuGroups.find((group) => group.to === (pathname.replace(/\/$/, "") || "/"))
      ?.label ?? "개발자 문서";
  useEffect(() => {
    document.title = `${title} | Termia`;
  }, [title]);
  return (
    <div className="min-h-screen bg-surface">
      <AppNavigation />
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:p-3"
        href="#docs-content"
      >
        본문으로 건너뛰기
      </a>
      <div className="mx-auto grid min-h-[calc(100vh-65px)] w-full max-w-[1440px] grid-cols-[224px_minmax(0,1fr)] max-[900px]:grid-cols-1">
        <AppSideMenu
          ariaLabel="개발자 문서"
          groups={docsMenuGroups}
          title="개발자 문서"
        />
        <AppPageContent className="min-w-0">
          <div id="docs-content" tabIndex={-1}>
            <Outlet />
          </div>
        </AppPageContent>
      </div>
      <AppFooter />
    </div>
  );
}
