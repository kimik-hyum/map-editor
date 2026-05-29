export type ClassValue = string | false | null | undefined;

// 조건부 className을 공백으로 합치는 공용 유틸입니다. falsy 값은 제거합니다.
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
