import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

type AppPageContentProps = {
  children: ReactNode;
  className?: string;
};

const pageContentClassName =
  "mx-auto w-full max-w-[1120px] px-10 pb-16 pt-12 max-[900px]:px-6 max-[560px]:px-4 max-[560px]:pb-12 max-[560px]:pt-7";

export function AppPageContent({ children, className }: AppPageContentProps) {
  return <main className={cn(pageContentClassName, className)}>{children}</main>;
}
