export const MAX_FEATURE_NAME_LENGTH = 100;

// 도형 이름은 화면 표시와 부모 반환에 쓰이는 명시적 메타데이터입니다.
// 입력 앞뒤 공백은 제거하고, 비어 있거나 지나치게 긴 값은 변경 경계에서 거부합니다.
export function normalizeFeatureName(value: string): string | null {
  const normalized = value.trim();

  if (normalized.length === 0 || normalized.length > MAX_FEATURE_NAME_LENGTH) {
    return null;
  }

  return normalized;
}
