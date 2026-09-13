import { NavLink } from "react-router";
import { TermiaLogo } from "@/shared/branding/TermiaLogo";

export function AppFooter() {
  return (
    <footer className="border-t border-line bg-white px-6 max-[560px]:px-4">
      <div className="mx-auto flex w-full max-w-[1392px] flex-wrap items-center justify-between gap-x-8 gap-y-5 py-7">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <TermiaLogo />
          <p className="m-0 text-sm text-ink-muted">Define your territory.</p>
        </div>
        <nav aria-label="푸터" className="flex items-center">
          <NavLink
            className="rounded-md px-3 py-2 text-sm font-bold text-ink-soft underline-offset-4 hover:text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
            to="/about"
          >
            소개
          </NavLink>
        </nav>
      </div>
    </footer>
  );
}
