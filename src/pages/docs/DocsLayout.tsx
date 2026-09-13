import { useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { AppPageContent } from "@/shared/layout/AppPageContent";
import { AppFooter } from "@/shared/layout/AppFooter";
import { AppNavigation } from "@/shared/navigation/AppNavigation";
import { AppSideMenu } from "@/shared/navigation/AppSideMenu";
import { DocsAudienceSwitch } from "./components/DocsAudienceSwitch";
import {
  getDocsAudience,
  integrationMenuGroups,
  selfHostingMenuGroups,
} from "./content/docsNavigation";

export function DocsLayout() {
  const { pathname } = useLocation();
  const audience = getDocsAudience(pathname);
  const docsMenuGroups =
    audience === "integration" ? integrationMenuGroups : selfHostingMenuGroups;
  const navigationTitle = audience === "integration" ? "사용·연동 안내" : "내재화 안내";
  const activeGroup = docsMenuGroups.find(
    (group) => group.to === (pathname.replace(/\/$/, "") || "/"),
  );
  const title = activeGroup?.pageTitle ?? activeGroup?.label ?? navigationTitle;
  useEffect(() => {
    document.title = `${title} | Termia`;
  }, [title]);
  return (
    <div className="min-h-screen bg-surface">
      <AppNavigation />
      <DocsAudienceSwitch audience={audience} />
      <a
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:p-3"
        href="#docs-content"
      >
        본문으로 건너뛰기
      </a>
      <div className="mx-auto grid min-h-[calc(100vh-65px)] w-full max-w-[1440px] grid-cols-[224px_minmax(0,1fr)] max-[900px]:grid-cols-1">
        <AppSideMenu
          ariaLabel={navigationTitle}
          groups={docsMenuGroups}
          title={navigationTitle}
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
