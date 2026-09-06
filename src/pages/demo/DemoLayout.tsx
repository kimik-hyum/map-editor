import { MonitorUp } from "lucide-react";
import { Outlet } from "react-router";
import { AppPageContent } from "@/shared/layout/AppPageContent";
import { AppNavigation } from "@/shared/navigation/AppNavigation";
import { AppSideMenu, type AppSideMenuGroup } from "@/shared/navigation/AppSideMenu";

const demoMenuGroups: AppSideMenuGroup[] = [
  {
    icon: MonitorUp,
    label: "호스트 데모",
    sections: [
      { href: "#host-overview", label: "호스트 개요" },
      { href: "#launch-editor", label: "실행 및 상태" },
    ],
    to: "/demo",
  },
];

export function DemoLayout() {
  return (
    <div className="min-h-screen bg-surface-warm">
      <AppNavigation className="bg-surface-warm/[0.94]" />
      <div className="mx-auto grid min-h-[calc(100vh-65px)] w-full max-w-[1440px] grid-cols-[200px_minmax(0,1fr)] max-[900px]:grid-cols-1">
        <AppSideMenu ariaLabel="Demo sections" groups={demoMenuGroups} title="Demo" />
        <AppPageContent>
          <Outlet />
        </AppPageContent>
      </div>
    </div>
  );
}
