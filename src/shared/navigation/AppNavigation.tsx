import { NavLink } from "react-router";
import { cn } from "../utils/cn";

const links = [
  { label: "Docs", to: "/" },
  { label: "Demo", to: "/demo" },
  { label: "Editor", to: "/editor" },
];

type AppNavigationProps = {
  className?: string;
};

const navigationBaseClassName =
  "sticky inset-x-0 top-0 z-10 flex min-h-16 items-center justify-between gap-5 border-b border-line bg-surface/[0.92] px-6 max-[560px]:flex-col max-[560px]:items-start max-[560px]:gap-2.5 max-[560px]:px-4 max-[560px]:py-3.5";

const navLinkBaseClassName =
  "rounded-lg px-3 py-2 font-extrabold text-ink-soft hover:bg-brand-soft hover:text-brand";

const navLinkActiveClassName = "bg-brand-soft text-brand";

export function AppNavigation({ className }: AppNavigationProps) {
  return (
    <nav
      className={cn(navigationBaseClassName, className)}
      aria-label="Primary navigation"
    >
      <span className="font-black text-ink">Maps Editor</span>
      <div className="flex gap-2">
        {links.map((link) => (
          <NavLink
            className={({ isActive }) =>
              cn(navLinkBaseClassName, isActive ? navLinkActiveClassName : undefined)
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
