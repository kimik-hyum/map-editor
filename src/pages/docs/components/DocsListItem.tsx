import { CircleCheckBig } from "lucide-react";
import type { ReactNode } from "react";
import { DocsText } from "./DocsText";

type DocsListItemProps = {
  children: ReactNode;
};

export function DocsListItem({ children }: DocsListItemProps) {
  return (
    <li className="flex min-w-0 items-start gap-2.5">
      <CircleCheckBig
        aria-hidden="true"
        className="mt-[5px] shrink-0 text-brand"
        size={15}
        strokeWidth={2.6}
      />
      <DocsText className="min-w-0 [overflow-wrap:anywhere]" tone="soft">
        {children}
      </DocsText>
    </li>
  );
}
