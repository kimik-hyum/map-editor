export const supportedLocales = ["ko", "en"] as const;
export type Locale = (typeof supportedLocales)[number];
export const defaultLocale: Locale = "ko";

export function getLocale(pathname = "/"): Locale {
  return pathname.split("/")[1] === "en" ? "en" : defaultLocale;
}

export function stripLocale(pathname: string): string {
  return pathname.replace(/^\/(ko|en)(?=\/|$)/, "") || "/";
}

export function localizePath(path: string, locale: Locale): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const unprefixed = stripLocale(path);
  return `/${locale}${unprefixed === "/" ? "/" : unprefixed}`;
}
