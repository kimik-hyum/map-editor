import { Link } from "react-router";
import type { DocsAudience } from "../content/docsNavigation";
import { cn } from "@/shared/utils/cn";

const audiences = [
  {
    id: "integration",
    to: "/",
    label: "사용·연동 안내",
    description: "내 지도에 연결하고 결과 받기",
  },
  {
    id: "self-hosting",
    to: "/self-hosting",
    label: "직접 운영·커스텀",
    description: "소스·경계 데이터·인증 바꾸기",
  },
] as const;

export function DocsAudienceSwitch({ audience }: { audience: DocsAudience }) {
  return (
    <nav
      aria-label="문서 대상 선택"
      className="border-b border-line bg-white px-6 max-[560px]:px-4"
    >
      <div className="mx-auto grid w-full max-w-[1392px] grid-cols-2 gap-3 py-4">
        {audiences.map((item) => (
          <Link
            aria-current={audience === item.id ? "true" : undefined}
            className={cn(
              "rounded-lg border p-3 no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              audience === item.id
                ? "border-brand-line bg-brand-soft text-brand-strong"
                : "border-line text-ink-soft hover:border-brand-line hover:bg-surface",
            )}
            key={item.id}
            to={item.to}
          >
            <strong className="block text-sm font-extrabold">{item.label}</strong>
            <span className="mt-1 block text-sm leading-5">{item.description}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
