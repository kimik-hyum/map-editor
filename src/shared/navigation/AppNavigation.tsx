import { Link, NavLink, useLocation } from "react-router";
import { TermiaLogo } from "@/shared/branding/TermiaLogo";
import { cn } from "../utils/cn";

const links = [
  { label: "Docs", to: "/" },
  { label: "Demo", to: "/demo" },
  { label: "Editor", to: "/editor" },
];

type AppNavigationProps = {
  className?: string;
};

// 바(배경·경계선)는 화면 전체 폭, 내용물은 콘텐츠 셸과 같은 폭으로 가운데 정렬합니다.
const navigationBaseClassName =
  "sticky inset-x-0 top-0 z-10 border-b border-line bg-surface/[0.92] px-6 max-[560px]:px-4";

const navigationInnerClassName =
  "mx-auto flex min-h-16 w-full max-w-[1440px] items-center justify-between gap-5 max-[560px]:flex-col max-[560px]:items-start max-[560px]:gap-2.5 max-[560px]:py-3.5";

const navLinkBaseClassName =
  "rounded-lg px-3 py-2 font-extrabold text-ink-soft hover:bg-brand-soft hover:text-brand";

const navLinkActiveClassName = "bg-brand-soft text-brand";

export function AppNavigation({ className }: AppNavigationProps) {
  const { pathname } = useLocation();
  const normalizedPath = pathname.replace(/\/$/, "") || "/";
  const isDocsPath =
    ["/", "/screen", "/editing", "/integration", "/authentication"].includes(
      normalizedPath,
    ) ||
    normalizedPath === "/self-hosting" ||
    normalizedPath.startsWith("/self-hosting/");

  return (
    <nav
      className={cn(navigationBaseClassName, className)}
      aria-label="Primary navigation"
    >
      <div className={navigationInnerClassName}>
        <Link
          aria-label="Termia 홈"
          className="rounded-md no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
          to="/"
        >
          <TermiaLogo />
        </Link>
        <div className="flex gap-2">
          {links.map((link) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  navLinkBaseClassName,
                  (link.to === "/" ? isDocsPath : isActive)
                    ? navLinkActiveClassName
                    : undefined,
                )
              }
              end={link.to === "/"}
              key={link.to}
              to={link.to}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
