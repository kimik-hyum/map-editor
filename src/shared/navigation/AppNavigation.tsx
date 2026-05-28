import { NavLink } from "react-router";

const links = [
  { label: "Docs", to: "/" },
  { label: "Demo", to: "/demo" },
  { label: "Editor", to: "/editor" },
];

type AppNavigationProps = {
  className?: string;
};

const navigationBaseClassName =
  "sticky inset-x-0 top-0 z-10 flex min-h-16 items-center justify-between gap-5 border-b border-[#d6e0e7] bg-[#f7faf9]/[0.92] px-6 max-[560px]:flex-col max-[560px]:items-start max-[560px]:gap-2.5 max-[560px]:px-4 max-[560px]:py-3.5";

const navLinkBaseClassName =
  "rounded-lg px-3 py-2 font-extrabold text-[#506174] hover:bg-[#e5f3ef] hover:text-[#0f766e]";

const navLinkActiveClassName = "bg-[#e5f3ef] text-[#0f766e]";

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function AppNavigation({ className }: AppNavigationProps) {
  return (
    <nav
      className={joinClassNames(navigationBaseClassName, className)}
      aria-label="Primary navigation"
    >
      <span className="font-black text-[#172033]">Maps Editor</span>
      <div className="flex gap-2">
        {links.map((link) => (
          <NavLink
            className={({ isActive }) =>
              joinClassNames(
                navLinkBaseClassName,
                isActive ? navLinkActiveClassName : undefined,
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
    </nav>
  );
}
