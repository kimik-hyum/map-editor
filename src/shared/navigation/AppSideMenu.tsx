import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import { cn } from "../utils/cn";

// 소메뉴: 페이지 안 섹션으로 #해시 이동합니다.
export type AppSideMenuSection = {
  href: string;
  label: string;
};

// 대메뉴: 라우트로 페이지를 이동하고, 활성 페이지의 소메뉴를 아래에 펼칩니다.
export type AppSideMenuGroup = {
  icon: LucideIcon;
  label: string;
  sections?: AppSideMenuSection[];
  to: string;
};

type AppSideMenuProps = {
  ariaLabel: string;
  className?: string;
  groups: AppSideMenuGroup[];
  title: string;
};

// 바깥 aside는 그리드 행 전체 높이로 늘어나 경계선이 페이지 하단까지 이어지고,
// 스크롤을 따라오는 sticky는 안쪽 래퍼에만 적용합니다.
const sideMenuClassName =
  "border-r border-line text-ink max-[900px]:border-r-0 max-[900px]:border-b";

const sideMenuInnerClassName =
  "flex flex-col gap-3 px-4 py-6 min-[901px]:sticky min-[901px]:top-16 min-[901px]:max-h-[calc(100vh-4rem)] min-[901px]:overflow-y-auto max-[900px]:py-4";

const sideMenuGroupLinkClassName =
  "flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-extrabold text-ink-soft no-underline transition-colors hover:bg-brand-soft hover:text-brand";

const sideMenuGroupActiveClassName = "bg-brand-soft text-brand";

// 소메뉴는 대메뉴 아이콘 중심에 맞춘 세로선 아래로 들여 씁니다.
const sideMenuSectionListClassName =
  "m-0 mt-1 ml-[1.125rem] list-none border-l border-line p-0";

const sideMenuSectionLinkClassName =
  "-ml-px flex min-h-7 items-center border-l-2 border-transparent py-0.5 pl-3 pr-2 text-[13px] font-bold text-ink-muted no-underline transition-colors hover:border-brand-line hover:text-brand";

const sideMenuSectionActiveClassName = "border-brand text-brand";

const EMPTY_SECTIONS: AppSideMenuSection[] = [];

// 경로 끝 슬래시를 정규화해 같은 페이지를 가리키는 경로를 동일하게 비교합니다.
function normalizePath(path: string) {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

// 스크롤 위치를 따라 화면 상단에 걸린 섹션의 소메뉴를 활성으로 표시합니다.
// 페이지 끝에 닿으면 마지막 섹션을 활성화해, 상단까지 끌어올릴 수 없는
// 짧은 마지막 섹션도 메뉴에서 선택될 수 있게 합니다.
function useActiveAnchor(sections: AppSideMenuSection[]) {
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const pinnedUntilRef = useRef(0);

  // 소메뉴 클릭 직후에는 클릭한 섹션을 활성으로 고정합니다. 페이지 끝에 막혀
  // 섹션이 읽기 위치까지 못 올라와도, 클릭 의도가 마지막 섹션에 뺏기지 않습니다.
  // 부드러운 스크롤이 끝날 즈음 고정이 풀리고 다시 위치 기반으로 동작합니다.
  const pinActiveHref = (href: string) => {
    pinnedUntilRef.current = Date.now() + 800;
    setActiveHref(href);
  };

  useEffect(() => {
    const elements = sections
      .map((section) => section.href)
      .filter((href) => href.startsWith("#"))
      .map((href) => document.getElementById(href.slice(1)))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) {
      setActiveHref(null);
      return;
    }

    const updateActive = () => {
      if (Date.now() < pinnedUntilRef.current) {
        return;
      }

      const passed = elements
        .map((element) => ({
          id: element.id,
          top: element.getBoundingClientRect().top,
        }))
        .sort((a, b) => a.top - b.top)
        .filter((entry) => entry.top < 120);
      const last = passed[passed.length - 1];

      // 페이지 끝에서는 마지막 섹션을 우선하되, 어떤 섹션이 정확히 읽기 위치
      // (상단 0~120px)에 걸려 있으면 그 섹션을 유지합니다. 앵커 이동으로 도착한
      // 섹션이 페이지 끝과 겹칠 때 마지막 섹션에 활성 표시를 뺏기지 않게 합니다.
      const reachedPageBottom =
        window.scrollY > 0 &&
        window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 2;
      const isAtReadingPosition = last !== undefined && last.top >= 0;
      if (reachedPageBottom && !isAtReadingPosition) {
        setActiveHref(`#${elements[elements.length - 1].id}`);
        return;
      }

      const current = last ? last.id : elements[0].id;
      setActiveHref(`#${current}`);
    };

    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    updateActive();

    return () => {
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, [sections]);

  return { activeHref, pinActiveHref };
}

export function AppSideMenu({ ariaLabel, className, groups, title }: AppSideMenuProps) {
  const { pathname } = useLocation();
  const activeGroup =
    groups.find((group) => normalizePath(pathname) === normalizePath(group.to)) ?? null;
  const activeSections = activeGroup?.sections ?? EMPTY_SECTIONS;
  const { activeHref, pinActiveHref } = useActiveAnchor(activeSections);

  return (
    <aside className={cn(sideMenuClassName, className)} aria-label={ariaLabel}>
      <div className={sideMenuInnerClassName}>
        <strong className="px-2.5 text-xs font-black uppercase tracking-normal text-brand">
          {title}
        </strong>

        <nav className="grid gap-1 max-[900px]:grid-cols-2" aria-label={ariaLabel}>
          {groups.map((group) => {
            const Icon = group.icon;
            const isGroupActive = group === activeGroup;
            const sections = group.sections ?? EMPTY_SECTIONS;

            return (
              <div key={group.to}>
                <NavLink
                  className={cn(
                    sideMenuGroupLinkClassName,
                    isGroupActive && sideMenuGroupActiveClassName,
                  )}
                  end
                  to={group.to}
                >
                  <Icon aria-hidden="true" size={16} strokeWidth={2.4} />
                  <span className="min-w-0 truncate">{group.label}</span>
                </NavLink>

                {isGroupActive && sections.length > 0 ? (
                  <ul
                    className={cn(sideMenuSectionListClassName, "max-[900px]:hidden")}
                  >
                    {sections.map((section) => {
                      const isSectionActive = section.href === activeHref;

                      return (
                        <li key={section.href}>
                          <a
                            aria-current={isSectionActive ? "true" : undefined}
                            className={cn(
                              sideMenuSectionLinkClassName,
                              isSectionActive && sideMenuSectionActiveClassName,
                            )}
                            href={section.href}
                            onClick={() => pinActiveHref(section.href)}
                          >
                            <span className="min-w-0 truncate">{section.label}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
