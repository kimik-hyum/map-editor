import type { ReactNode } from "react";

type DocsTableProps = {
  label: string;
  headers: string[];
  rows: Array<{ key: string; cells: ReactNode[] }>;
};

export function DocsTable({ label, headers, rows }: DocsTableProps) {
  return (
    <section
      className="overflow-x-auto rounded-lg border border-line"
      aria-label={label}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: 좁은 화면에서 키보드로 표를 가로 스크롤해야 한다.
      tabIndex={0}
    >
      <table className="w-full min-w-[580px] border-collapse text-left text-sm leading-6">
        <caption className="sr-only">{label}</caption>
        <thead className="bg-slate-50 text-ink">
          <tr>
            {headers.map((header) => (
              <th
                className="border-b border-line px-4 py-3 font-bold"
                scope="col"
                key={header}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-b border-line last:border-0" key={row.key}>
              {row.cells.map((cell, index) => (
                <td className="px-4 py-3 align-top text-ink-soft" key={headers[index]}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
