// 객체 트리를 깊은 읽기 전용으로 만드는 유틸리티 타입입니다.
// 함수는 그대로 두고, 배열은 ReadonlyArray로, 객체는 모든 속성을 readonly로 재귀 변환합니다.
// 히스토리 스냅샷(scene)을 이 타입으로 노출해 소비처의 제자리 변경을 컴파일 단계에서 막습니다.
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer U)[]
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;
