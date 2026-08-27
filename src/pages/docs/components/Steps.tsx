import type { ReactNode } from "react";
import { DocsHeading } from "./DocsHeading";
import { DocsText } from "./DocsText";

type StepItem = {
  description?: ReactNode;
  title: string;
};

type StepsProps = {
  items: StepItem[];
};

// 번호가 매겨진 진행 단계. 배지를 잇는 세로선으로 순서를 시각화합니다.
export function Steps({ items }: StepsProps) {
  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {items.map((step, index) => {
        const isLast = index === items.length - 1;

        return (
          <li
            className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4"
            key={step.title}
          >
            <div className="flex flex-col items-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-sm font-black text-brand ring-1 ring-brand-line">
                {index + 1}
              </span>
              {isLast ? null : (
                <span aria-hidden="true" className="w-px flex-1 bg-line" />
              )}
            </div>
            <div className={isLast ? "pb-1" : "pb-7"}>
              <DocsHeading className="pt-1.5" level={3}>
                {step.title}
              </DocsHeading>
              {step.description ? (
                <DocsText className="mt-1.5">{step.description}</DocsText>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
