export const MAX_FEATURE_NAME_LENGTH = 100;

export function getFeatureNameValidationError(value: string): string | null {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return "이름을 입력하세요.";
  }
  if (normalized.length > MAX_FEATURE_NAME_LENGTH) {
    return `이름은 ${MAX_FEATURE_NAME_LENGTH}자 이하로 입력하세요.`;
  }

  return null;
}

// 도형 이름은 화면 표시와 부모 반환에 쓰이는 명시적 메타데이터입니다.
// 입력 앞뒤 공백은 제거하고, 비어 있거나 지나치게 긴 값은 변경 경계에서 거부합니다.
export function normalizeFeatureName(value: string): string | null {
  if (getFeatureNameValidationError(value)) {
    return null;
  }

  return value.trim();
}
