import { Menu } from "@base-ui/react/menu";
import { Check, Globe } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { cn } from "@/shared/utils/cn";
import { getLocale, localizePath, type Locale } from "./locale";
import { useT } from "./useT";

const languages: { locale: Locale; label: string; code: string }[] = [
  { locale: "ko", label: "한국어", code: "KR" },
  { locale: "en", label: "English", code: "US" },
];

export function LanguageSwitcher({ className }: { className?: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const t = useT();
  const locale = getLocale(location.pathname);
  const current =
    languages.find((language) => language.locale === locale) ?? languages[0];
  const label = t("언어 선택: {{v0}}", { v0: current.label });
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={label}
        title={label}
        className={cn(
          "flex h-9 w-10 flex-col items-center justify-center gap-0.5 rounded-lg text-ink-soft transition-colors hover:bg-brand-soft hover:text-brand data-[popup-open]:bg-brand-soft data-[popup-open]:text-brand",
          className,
        )}
      >
        <Globe aria-hidden className="h-4 w-4" strokeWidth={2.2} />
        <span className="text-[9px] font-black leading-none tracking-wide">
          {current.code}
        </span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end" className="z-[60]">
          <Menu.Popup className="min-w-40 rounded-xl border border-line bg-white p-1.5 shadow-xl outline-none">
            <Menu.RadioGroup
              value={locale}
              onValueChange={(value: Locale) =>
                navigate({
                  pathname: localizePath(location.pathname, value),
                  search: location.search,
                  hash: location.hash,
                })
              }
            >
              {languages.map((language) => (
                <Menu.RadioItem
                  key={language.locale}
                  value={language.locale}
                  lang={language.locale}
                  closeOnClick
                  className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-800 outline-none data-[highlighted]:bg-teal-50 data-[highlighted]:text-teal-900"
                >
                  <span className="flex-1 font-bold">{language.label}</span>
                  <span
                    aria-hidden
                    className="text-[11px] font-semibold text-slate-400"
                  >
                    {language.code}
                  </span>
                  <span className="flex h-4 w-4 items-center justify-center">
                    <Menu.RadioItemIndicator>
                      <Check aria-hidden className="h-4 w-4 text-teal-700" />
                    </Menu.RadioItemIndicator>
                  </span>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
